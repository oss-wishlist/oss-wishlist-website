#!/usr/bin/env node

import { Octokit } from "@octokit/rest";
import fs from "fs";

const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

/**
 * Extract a specific section from GitHub issue form body
 */
function extractSection(body, sectionHeader) {
  const regex = new RegExp(
    `### ${sectionHeader}\n([\\s\\S]*?)(?=###|$)`,
    "i"
  );
  const match = body.match(regex);
  if (!match) return "";
  return match[1].trim();
}

/**
 * Generate wishlist ID from repo name and issue number
 * Format: repo-name-<issue_number>
 * Example: new-repo-1-50 (for issue #50)
 */
function generateWishlistId(repositoryUrl, issueNumber) {
  try {
    // Extract repo name from URL
    // Handles: https://github.com/owner/repo, github.com/owner/repo, owner/repo
    const urlMatch = repositoryUrl.match(/github\.com\/[^\/]+\/([^\/\s]+)/i);
    const slashMatch = repositoryUrl.match(/^([^\/]+)\/([^\/\s]+)$/);
    
    let repoName = '';
    if (urlMatch) {
      repoName = urlMatch[1];
    } else if (slashMatch) {
      repoName = slashMatch[2];
    } else {
      // Fallback: use issue number only
      return `wishlist-${issueNumber}`;
    }
    
    // Clean repo name: lowercase, replace special chars with hyphens
    repoName = repoName
      .toLowerCase()
      .replace(/\.git$/, '') // Remove .git suffix
      .replace(/[^a-z0-9-]/g, '-') // Replace special chars
      .replace(/-+/g, '-') // Collapse multiple hyphens
      .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens
    
    return `${repoName}-${issueNumber}`;
  } catch (error) {
    console.warn(`Error generating ID for issue ${issueNumber}:`, error.message);
    return `wishlist-${issueNumber}`;
  }
}

/**
 * Extract fulfillment URL from issue body
 * Format: "Fulfill this wishlist: {URL}"
 */
function extractFulfillmentUrl(body, issueNumber) {
  // Look for the fulfillment URL in the body
  const urlMatch = body.match(/Fulfill this wishlist:\s*(https?:\/\/[^\s]+)/i);
  
  if (urlMatch) {
    return urlMatch[1].trim();
  }
  
  // Fallback: construct URL from issue number
  return `https://oss-wishlist.com/fulfill?issue=${issueNumber}`;
}

/**
 * Get the most recent update timestamp from bot comments
 */
async function getLatestUpdateTimestamp(issue) {
  try {
    // Fetch all comments for this issue
    const allComments = [];
    
    const iterator = octokit.paginate.iterator(
      "GET /repos/{owner}/{repo}/issues/{issue_number}/comments",
      {
        owner: "oss-wishlist",
        repo: "wishlists",
        issue_number: issue.number,
        per_page: 100,
      }
    );

    for await (const { data } of iterator) {
      allComments.push(...data);
    }

    // Filter for bot comments only
    const botComments = allComments.filter(
      (comment) => comment.user?.login === "oss-wishlist-bot"
    );

    // Get the most recent bot comment timestamp
    if (botComments.length > 0) {
      const latestComment = botComments[botComments.length - 1];
      return latestComment.updated_at || latestComment.created_at;
    }

    // Fallback: use issue updated timestamp
    return issue.updated_at;
  } catch (error) {
    console.warn(
      `Error fetching comments for issue ${issue.number}:`,
      error.message
    );
    return issue.updated_at;
  }
}

/**
 * Parse a wishlist issue into simplified format
 */
async function parseWishlistIssue(issue, labels) {
  // Check if approved (no longer filtering out non-approved)
  const isApproved = labels.some((label) => label.name === "approved-wishlist");
  
  // Get project name and repo from issue body (original form data)
  const projectName = extractSection(issue.body, "Project Name").trim();
  const repositoryUrl = extractSection(issue.body, "Repository").trim();
  
  // Log warning if no repository URL found
  if (!repositoryUrl) {
    console.warn(`WARNING: Issue #${issue.number}: No repository URL found. Project: "${projectName}"`);
  }
  
  // Generate unique ID based on repo name + issue number
  // If no repo URL, use project name as fallback
  const id = repositoryUrl 
    ? generateWishlistId(repositoryUrl, issue.number)
    : `${projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}-${issue.number}`;
  
  // Extract fulfillment URL from issue body
  const fulfillmentUrl = extractFulfillmentUrl(issue.body, issue.number);
  
  // Get the most recent update timestamp (from latest bot comment or issue)
  const updatedAt = await getLatestUpdateTimestamp(issue);

  return {
    id,
    projectName: projectName || `Wishlist #${issue.number}`,
    repositoryUrl: repositoryUrl || "", // Keep empty string if not provided
    fulfillmentUrl,
    issueNumber: issue.number,
    updatedAt,
    approved: isApproved, // True if has "approved-wishlist" label, false otherwise
    labels: labels.map(l => l.name), // Keep all labels for reference
  };
}

/**
 * Update markdown file to set approved status
 */
function updateMarkdownApprovalStatus(issueNumber, approved) {
  const markdownPath = path.join(process.cwd(), 'src', 'content', 'wishlists', `wishlist-${issueNumber}.md`);
  
  if (!fs.existsSync(markdownPath)) {
    console.warn(`Markdown file not found for issue ${issueNumber}: ${markdownPath}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(markdownPath, 'utf8');
    
    // Update the approved field in frontmatter
    const updatedContent = content.replace(
      /^approved:\s*(true|false)/m,
      `approved: ${approved}`
    );
    
    if (content !== updatedContent) {
      fs.writeFileSync(markdownPath, updatedContent, 'utf8');
      console.log(`Updated wishlist-${issueNumber}.md: approved = ${approved}`);
      return true;
    } else {
      console.log(`No change needed for wishlist-${issueNumber}.md (already approved = ${approved})`);
      return false;
    }
  } catch (error) {
    console.error(`Error updating markdown for issue ${issueNumber}:`, error.message);
    return false;
  }
}

/**
 * Generate the wishlist cache JSON file
 */
async function generateCache() {
  try {
    console.log("Fetching wishlists from GitHub...");

    // Fetch ALL open issues (both approved and pending)
    const issues = await octokit.paginate("GET /repos/{owner}/{repo}/issues", {
      owner: "oss-wishlist",
      repo: "wishlists",
      state: "open",
      // No label filter - we want both approved and pending wishlists
      per_page: 100,
    });

    console.log(`Found ${issues.length} open issues`);

    // Parse all wishlists concurrently
    const parsedWishlists = await Promise.all(
      issues
        .filter((issue) => !issue.pull_request)
        .map((issue) => parseWishlistIssue(issue, issue.labels))
    );
    
    // No filtering - keep all wishlists (both approved and pending)
    const wishlists = parsedWishlists;
    
    // Count approved vs pending
    const approvedCount = wishlists.filter(w => w.approved).length;
    const pendingCount = wishlists.length - approvedCount;

    console.log(`Parsed ${wishlists.length} total wishlists`);
    console.log(`  - ${approvedCount} approved`);
    console.log(`  - ${pendingCount} pending`);

    // Generate cache data
    const cacheData = {
      version: "2.0.0",
      generatedAt: new Date().toISOString(),
      totalWishlists: wishlists.length,
      approvedWishlists: approvedCount,
      pendingWishlists: pendingCount,
      wishlists,
    };

    fs.writeFileSync("all-wishlists.json", JSON.stringify(cacheData, null, 2));

    console.log("Cache generated successfully");
    console.log(`  - ${wishlists.length} total wishlists`);
    console.log(`  - ${approvedCount} approved, ${pendingCount} pending`);
    console.log(`  - File: all-wishlists.json`);
  } catch (error) {
    console.error("ERROR generating cache:", error);
    process.exit(1);
  }
}

generateCache();
