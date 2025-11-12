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
  const isApproved = labels.some((label) => label.name === "approved-wishlist");
  
  // Skip if not approved
  if (!isApproved) {
    return null;
  }
  
  // Debug: print the full issue body to see available sections
  console.log(`\n=== Issue #${issue.number} Body ===`);
  console.log(issue.body);
  console.log(`=== End Issue #${issue.number} ===\n`);
  
  // Get project name and repo from issue body (original form data)
  const projectName = extractSection(issue.body, "Project Name").trim();
  const repositoryUrl = extractSection(issue.body, "Repository").trim();
  
  console.log(`Issue #${issue.number} extracted:`);
  console.log(`  - Project Name: "${projectName}"`);
  console.log(`  - Repository URL: "${repositoryUrl}"`);
  
  // Debug: log what we extracted
  if (!repositoryUrl) {
    console.warn(`WARNING: Issue #${issue.number}: No repository URL found. Project: "${projectName}"`);
    console.warn(`   Using project name for ID generation`);
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
  };
}

/**
 * Generate the wishlist cache JSON file
 */
async function generateCache() {
  try {
    console.log("Fetching wishlists from GitHub...");

    // Fetch only OPEN issues (closed ones are excluded)
    const issues = await octokit.paginate("GET /repos/{owner}/{repo}/issues", {
      owner: "oss-wishlist",
      repo: "wishlists",
      state: "open",
      labels: "approved-wishlist", // Only fetch approved wishlists
      per_page: 100,
    });

    console.log(`Found ${issues.length} approved issues`);

    // Parse all wishlists concurrently
    const parsedWishlists = await Promise.all(
      issues
        .filter((issue) => !issue.pull_request)
        .map((issue) => parseWishlistIssue(issue, issue.labels))
    );
    
    // Filter out nulls (non-approved wishlists)
    const wishlists = parsedWishlists.filter((w) => w !== null);

    console.log(`Parsed ${wishlists.length} approved wishlists`);

    // Generate cache data
    const cacheData = {
      version: "2.0.0",
      generatedAt: new Date().toISOString(),
      totalWishlists: wishlists.length,
      wishlists,
    };

    fs.writeFileSync("all-wishlists.json", JSON.stringify(cacheData, null, 2));

    console.log("Cache generated successfully");
    console.log(`  - ${wishlists.length} approved wishlists`);
    console.log(`  - File: all-wishlists.json`);
  } catch (error) {
    console.error("ERROR generating cache:", error);
    process.exit(1);
  }
}

generateCache();
