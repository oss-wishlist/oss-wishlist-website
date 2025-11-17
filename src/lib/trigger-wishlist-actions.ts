/**
 * Trigger wishlist actions workflow via GitHub repository_dispatch
 * Called when a wishlist is approved to handle FUNDING.yml creation, etc.
 */

interface Wishlist {
  id: number;
  funding_yml?: boolean;
  repository_url?: string;
  maintainer_username?: string;
  project_name?: string;
}

export async function triggerWishlistActions(wishlistId: number, wishlist: Wishlist): Promise<void> {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN || import.meta.env.GITHUB_TOKEN;
  // Use the website repo where the workflow is located
  const WEBSITE_REPO = 'oss-wish-list/oss-wishlist-website';

  if (!GITHUB_TOKEN) {
    console.error('[trigger-actions] GITHUB_TOKEN not configured');
    return;
  }

  try {
    const [owner, repo] = WEBSITE_REPO.split('/');
    const url = `https://api.github.com/repos/${owner}/${repo}/dispatches`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      body: JSON.stringify({
        event_type: 'wishlist-approved',
        client_payload: {
          wishlist_id: wishlistId,
          funding_yml: wishlist.funding_yml || false,
          repository_url: wishlist.repository_url || '',
          maintainer: wishlist.maintainer_username || '',
          project_name: wishlist.project_name || '',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[trigger-actions] Failed to trigger workflow:', response.status, errorText);
      throw new Error(`GitHub API error: ${response.status}`);
    }

    console.log(`[trigger-actions] Successfully triggered wishlist actions for wishlist #${wishlistId}`);
  } catch (error) {
    console.error('[trigger-actions] Error triggering wishlist actions:', error);
    throw error;
  }
}
