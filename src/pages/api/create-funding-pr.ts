import type { APIRoute } from 'astro';
import { getWishlistById, updateWishlist } from '../../lib/db.js';
import { Octokit } from '@octokit/rest';
import yaml from 'js-yaml';

export const prerender = false;

interface WishlistData {
  maintainer: string;
  repository: string;
  wishlistUrl: string;
}

/**
 * Parse owner and repo from GitHub URL
 */
function parseRepoUrl(repoUrl: string): { owner: string; repo: string } {
  const match = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error(`Invalid GitHub repository URL: ${repoUrl}`);
  }
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

/**
 * Check if FUNDING.yml exists in the target repository
 */
async function checkFundingFile(
  octokit: Octokit,
  owner: string,
  repo: string
): Promise<{ path: string; sha: string; content: string } | null> {
  // Check .github/FUNDING.yml first (most common)
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: '.github/FUNDING.yml',
    });
    if ('content' in data) {
      return { path: '.github/FUNDING.yml', sha: data.sha, content: data.content };
    }
  } catch (error: any) {
    if (error.status !== 404) throw error;
  }

  // Check root FUNDING.yml as fallback
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner,
      repo,
      path: 'FUNDING.yml',
    });
    if ('content' in data) {
      return { path: 'FUNDING.yml', sha: data.sha, content: data.content };
    }
  } catch (error: any) {
    if (error.status !== 404) throw error;
  }

  return null;
}

/**
 * Create or update FUNDING.yml content
 */
function createFundingContent(existingContent: string | null, wishlistUrl: string): string {
  if (!existingContent) {
    return `custom: ['${wishlistUrl}']\n`;
  }

  // Parse existing FUNDING.yml
  const decoded = Buffer.from(existingContent, 'base64').toString('utf-8');
  const fundingData: any = yaml.load(decoded) || {};

  // Add or append to custom array
  if (!fundingData.custom) {
    fundingData.custom = [];
  } else if (!Array.isArray(fundingData.custom)) {
    fundingData.custom = [fundingData.custom];
  }

  // Remove old OSS Wishlist URLs (GitHub issues or old fulfill URLs)
  const issueUrlRegex = /https:\/\/github\.com\/oss-wishlist\/wishlists\/issues\/\d+/;
  const oldFulfillRegex = /https:\/\/oss-wishlist\.com\/(oss-wishlist\/)?fullfill?\?issue=\d+/;

  fundingData.custom = fundingData.custom.filter((entry: any) => {
    if (typeof entry === 'string') {
      if (issueUrlRegex.test(entry)) return false;
      if (oldFulfillRegex.test(entry) && entry !== wishlistUrl) return false;
    }
    return true;
  });

  // Add wishlist URL if not already present
  if (!fundingData.custom.includes(wishlistUrl)) {
    fundingData.custom.push(wishlistUrl);
  }

  return yaml.dump(fundingData);
}

/**
 * Check if there's already an open or closed PR from the bot for this wishlist URL
 */
async function checkExistingPR(
  octokit: Octokit,
  owner: string,
  repo: string,
  botUsername: string,
  wishlistUrl: string
): Promise<{ html_url: string; state: string } | null> {
  try {
    const states = ['open', 'closed'];

    for (const state of states) {
      const { data: prs } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: state as 'open' | 'closed',
        per_page: 100,
      });

      const botPRs = prs.filter(
        (pr) => pr.user?.login === botUsername && pr.title.includes('FUNDING.yml')
      );

      for (const pr of botPRs) {
        if (pr.body && pr.body.includes(wishlistUrl)) {
          return { html_url: pr.html_url, state: pr.state };
        }
      }
    }

    return null;
  } catch (error) {
    console.warn(`Failed to check for existing PRs:`, error);
    return null;
  }
}

/**
 * Create a pull request to add/update FUNDING.yml
 */
async function createPullRequest(
  octokit: Octokit,
  owner: string,
  repo: string,
  data: WishlistData,
  fundingFile: { path: string; sha: string; content: string } | null,
  wishlistId: number
): Promise<string> {
  const branchName = `add-wishlist-funding-${wishlistId}`;
  const filePath = fundingFile ? fundingFile.path : '.github/FUNDING.yml';

  // Get authenticated user info
  const { data: authenticatedUser } = await octokit.rest.users.getAuthenticated();
  const forkOwner = authenticatedUser.login;

  console.log(`[funding-pr] Authenticated as: ${forkOwner}`);

  // Check for existing PRs
  const existingPR = await checkExistingPR(octokit, owner, repo, forkOwner, data.wishlistUrl);
  if (existingPR) {
    console.log(`[funding-pr] Existing PR found (${existingPR.state}): ${existingPR.html_url}`);
    return existingPR.html_url;
  }

  // Get default branch
  const { data: repoData } = await octokit.rest.repos.get({ owner, repo });
  const defaultBranch = repoData.default_branch;

  // Check if we already have a fork, if not create one
  let forkRepo: any;
  try {
    const { data: existingFork } = await octokit.rest.repos.get({
      owner: forkOwner,
      repo: repo,
    });
    forkRepo = existingFork;
    console.log(`[funding-pr] Found existing fork: ${forkOwner}/${repo}`);
  } catch (error: any) {
    if (error.status === 404) {
      console.log(`[funding-pr] Creating fork of ${owner}/${repo}...`);
      const { data: newFork } = await octokit.rest.repos.createFork({
        owner,
        repo,
      });
      forkRepo = newFork;

      // Wait for fork to be ready
      console.log('[funding-pr] Waiting for fork to be ready...');
      await new Promise((resolve) => setTimeout(resolve, 5000));
    } else {
      throw error;
    }
  }

  // Get the SHA of the default branch from the fork
  const { data: refData } = await octokit.rest.git.getRef({
    owner: forkOwner,
    repo: repo,
    ref: `heads/${defaultBranch}`,
  });
  const baseSha = refData.object.sha;

  // Create new branch in fork (or reuse if it exists)
  try {
    await octokit.rest.git.createRef({
      owner: forkOwner,
      repo: repo,
      ref: `refs/heads/${branchName}`,
      sha: baseSha,
    });
    console.log(`[funding-pr] Created branch ${branchName} in fork`);
  } catch (err: any) {
    if (err.status === 422) {
      console.log(`[funding-pr] Branch ${branchName} already exists in fork`);
    } else {
      throw err;
    }
  }

  // Re-fetch FUNDING.yml from the fork to get latest SHA
  let latestFundingFile = fundingFile;
  if (fundingFile) {
    try {
      const { data } = await octokit.rest.repos.getContent({
        owner: forkOwner,
        repo: repo,
        path: filePath,
        ref: branchName,
      });
      if ('content' in data) {
        latestFundingFile = { path: filePath, sha: data.sha, content: data.content };
      }
    } catch (err: any) {
      if (err.status === 404) {
        console.log(`[funding-pr] ${filePath} not found in fork branch; will create it`);
      } else {
        throw err;
      }
    }
  }

  // Create or update FUNDING.yml in fork
  const newContent = createFundingContent(
    latestFundingFile ? latestFundingFile.content : null,
    data.wishlistUrl
  );

  await octokit.rest.repos.createOrUpdateFileContents({
    owner: forkOwner,
    repo: repo,
    path: filePath,
    message: fundingFile
      ? 'Update FUNDING.yml with wishlist link'
      : 'Add FUNDING.yml with wishlist link',
    content: Buffer.from(newContent).toString('base64'),
    branch: branchName,
    sha: latestFundingFile ? latestFundingFile.sha : undefined,
  });

  console.log(`[funding-pr] Created/updated ${filePath} in fork`);

  // Create pull request from fork to upstream
  const prBody = `This PR was opened at the request of @${data.maintainer} to add a wishlist link to your repository's sponsor button.

Wishlist: ${data.wishlistUrl}

This will display the wishlist link in the "Sponsor this project" section of your repository to help wishlist sponsors find and fulfill wishes that help this project.

For more information:
- Open Source Wishlist: https://oss-wishlist.com
- FUNDING.yml settings: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/displaying-a-sponsor-button-in-your-repository`;

  try {
    const { data: pr } = await octokit.rest.pulls.create({
      owner,
      repo,
      title: 'Add wishlist link to FUNDING.yml',
      head: `${forkOwner}:${branchName}`,
      base: defaultBranch,
      body: prBody,
    });
    console.log(`[funding-pr] Created PR: ${pr.html_url}`);
    return pr.html_url;
  } catch (err: any) {
    if (err.status === 422) {
      console.log('[funding-pr] PR might already exist. Looking it up...');
      const { data: existingPRs } = await octokit.rest.pulls.list({
        owner,
        repo,
        state: 'open',
        head: `${forkOwner}:${branchName}`,
      });
      if (existingPRs && existingPRs.length > 0) {
        console.log(`[funding-pr] Found existing PR: ${existingPRs[0].html_url}`);
        return existingPRs[0].html_url;
      }
      const maybeExisting = await checkExistingPR(octokit, owner, repo, forkOwner, data.wishlistUrl);
      if (maybeExisting) return maybeExisting.html_url;
    }
    throw err;
  }
}

/**
 * Main API endpoint
 * POST /api/create-funding-pr
 * Body: { wishlistId: number }
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { wishlistId } = body;

    if (!wishlistId || typeof wishlistId !== 'number') {
      return new Response(
        JSON.stringify({ error: 'wishlistId (number) is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[funding-pr] Processing wishlist ID: ${wishlistId}`);

    // Fetch wishlist from database
    const wishlist = await getWishlistById(wishlistId);

    if (!wishlist) {
      return new Response(
        JSON.stringify({ error: 'Wishlist not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[funding-pr] Wishlist data: approved=${wishlist.approved}, funding_yml=${wishlist.funding_yml}, funding_yml_processed=${wishlist.funding_yml_processed}`);

    // Check conditions
    if (!wishlist.approved) {
      return new Response(
        JSON.stringify({ error: 'Wishlist is not approved', status: 'skipped' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!wishlist.funding_yml) {
      return new Response(
        JSON.stringify({ error: 'funding_yml is not requested', status: 'skipped' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (wishlist.funding_yml_processed) {
      return new Response(
        JSON.stringify({ error: 'funding_yml already processed', status: 'skipped' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[funding-pr] Wishlist ${wishlistId} is eligible for funding PR`);

    // Get GitHub token
    const token = import.meta.env.GITHUB_TOKEN;
    if (!token) {
      throw new Error('GITHUB_TOKEN not configured');
    }

    const octokit = new Octokit({ auth: token });

    // Construct wishlist URL
    const wishlistUrl = `https://oss-wishlist.com/fulfill?issue=${wishlist.id}`;

    const data: WishlistData = {
      maintainer: wishlist.maintainer_username,
      repository: wishlist.repository_url,
      wishlistUrl,
    };

    // Parse target repository
    const { owner, repo } = parseRepoUrl(data.repository);
    console.log(`[funding-pr] Target repository: ${owner}/${repo}`);

    // Check for existing FUNDING.yml
    const fundingFile = await checkFundingFile(octokit, owner, repo);

    // Check if wishlist URL is already in FUNDING.yml
    if (fundingFile) {
      const decoded = Buffer.from(fundingFile.content, 'base64').toString('utf-8');
      const fundingData: any = yaml.load(decoded) || {};

      if (fundingData.custom) {
        const customArray = Array.isArray(fundingData.custom)
          ? fundingData.custom
          : [fundingData.custom];
        if (customArray.includes(wishlistUrl)) {
          console.log('[funding-pr] Wishlist URL already exists in FUNDING.yml');
          return new Response(
            JSON.stringify({
              status: 'skipped',
              message: 'Wishlist URL already exists in FUNDING.yml',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    // Create pull request
    const prUrl = await createPullRequest(octokit, owner, repo, data, fundingFile, wishlistId);

    // Mark as processed in database
    await updateWishlist(wishlistId, { funding_yml_processed: true });
    console.log(`[funding-pr] Marked wishlist ${wishlistId} as processed in database`);

    return new Response(
      JSON.stringify({
        status: 'success',
        pr_url: prUrl,
        message: 'Pull request created successfully',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[funding-pr] Action failed:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to create funding PR',
        details: error.message,
        status: 'error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
