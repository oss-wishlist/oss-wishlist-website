/**
 * Trigger GitHub Action to update wishlist JSON feed
 * 
 * This is called after approve/reject/delete operations on wishlists
 * to keep the public JSON feed in sync with database changes.
 */

export async function triggerJsonUpdate(action: string, wishlistId?: number) {
  // Only trigger in production or if explicitly enabled
  const shouldTrigger = import.meta.env.PROD || import.meta.env.TRIGGER_JSON_UPDATE === 'true';
  
  if (!shouldTrigger) {
    console.log(`[triggerJsonUpdate] Skipping (not in production). Action: ${action}, Wishlist: ${wishlistId}`);
    return;
  }

  const GITHUB_TOKEN = import.meta.env.GITHUB_TOKEN;
  const GITHUB_REPO = 'oss-wish-list/oss-wishlist-website'; // Update if different
  
  if (!GITHUB_TOKEN) {
    console.warn('[triggerJsonUpdate] GITHUB_TOKEN not configured, cannot trigger workflow');
    return;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/update-wishlist-json.yml/dispatches`,
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${GITHUB_TOKEN}`,
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ref: 'staging', // Update to main after testing
          inputs: {
            action: action,
            wishlist_id: wishlistId?.toString() || ''
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[triggerJsonUpdate] Failed to trigger workflow: ${response.status} ${errorText}`);
    } else {
      console.log(`[triggerJsonUpdate] ✓ Triggered workflow for action: ${action}, wishlist: ${wishlistId}`);
    }
  } catch (error) {
    console.error('[triggerJsonUpdate] Error triggering workflow:', error);
  }
}
