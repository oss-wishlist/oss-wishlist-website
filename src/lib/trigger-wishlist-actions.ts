/**
 * Trigger wishlist actions workflow via GitHub repository_dispatch
 * Called when a wishlist is approved to handle FUNDING.yml creation, etc.
 */

interface Wishlist {
  id: number;
  funding_yml: boolean;
  funding_yml_processed: boolean;
  repository_url?: string;
  maintainer_username?: string;
  project_name?: string;
  approved: boolean;
}

export async function triggerWishlistActions(wishlistId: number, wishlist: Wishlist): Promise<void> {
  // Only trigger if: approved=true AND funding_yml=true (user wants it) AND funding_yml_processed=false (not done yet)
  if (!wishlist.approved || !wishlist.funding_yml || wishlist.funding_yml_processed) {
    console.log(`[trigger-actions] Skipping wishlist #${wishlistId}: approved=${wishlist.approved}, funding_yml=${wishlist.funding_yml}, funding_yml_processed=${wishlist.funding_yml_processed}`);
    return;
  }

  try {
    // Call our internal funding PR API endpoint
    const siteUrl = process.env.PUBLIC_SITE_URL || import.meta.env.PUBLIC_SITE_URL || 'https://oss-wishlist.com';
    const basePath = process.env.PUBLIC_BASE_PATH || import.meta.env.PUBLIC_BASE_PATH || '';
    const apiUrl = `${siteUrl}${basePath}/api/create-funding-pr`;

    console.log(`[trigger-actions] Calling funding PR API: ${apiUrl}`);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wishlistId: wishlistId,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('[trigger-actions] Failed to create funding PR:', response.status, result);
      throw new Error(`Funding PR API error: ${response.status} - ${result.error || result.message}`);
    }

    console.log(`[trigger-actions] Successfully created funding PR for wishlist #${wishlistId}:`, result);
  } catch (error) {
    console.error('[trigger-actions] Error creating funding PR:', error);
    throw error;
  }
}
