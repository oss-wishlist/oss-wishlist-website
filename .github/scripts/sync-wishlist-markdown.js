#!/usr/bin/env node
/**
 * GitHub Action script to sync wishlist markdown files
 * Parses issue body and creates/updates/deletes markdown in src/content/wishlists/
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get issue data from environment
const issueNumber = process.env.ISSUE_NUMBER;
const issueTitle = process.env.ISSUE_TITLE;
const issueBody = process.env.ISSUE_BODY || '';
const issueUrl = process.env.ISSUE_URL;
const issueState = process.env.ISSUE_STATE;
const issueLabels = JSON.parse(process.env.ISSUE_LABELS || '[]');

// Check if this is a wishlist issue
const isWishlist = issueLabels.some(label => 
  label.name === 'wishlist' || label.name === 'pending-approval'
);

if (!isWishlist) {
  console.log('Not a wishlist issue, skipping...');
  process.exit(0);
}

// Parse GitHub issue form response
function parseIssueForm(body) {
  const data = {
    projectTitle: '',
    projectUrl: '',
    projectDescription: '',
    maintainer: '',
    services: [],
    technologies: [],
    urgency: '',
    projectSize: '',
    additionalNotes: '',
    organizationType: '',
    organizationName: '',
    openToSponsorship: false,
    preferredPractitioner: '',
    nomineeName: '',
    nomineeEmail: '',
    nomineeGithub: '',
  };

  // Parse each section
  const sections = body.split('###').slice(1); // Skip text before first ###
  
  for (const section of sections) {
    const lines = section.trim().split('\n');
    const heading = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();
    
    if (content === '_No response_' || content === '') continue;
    
    // Map headings to data fields
    if (heading.includes('Project Title')) {
      data.projectTitle = content;
    } else if (heading.includes('Repository URL')) {
      data.projectUrl = content;
    } else if (heading.includes('Project Description')) {
      data.projectDescription = content;
    } else if (heading.includes('Maintainer GitHub Username')) {
      data.maintainer = content.replace('@', '');
    } else if (heading.includes('Services Needed')) {
      data.services = content.split(',').map(s => s.trim()).filter(Boolean);
    } else if (heading.includes('Technologies')) {
      data.technologies = content.split(',').map(t => t.trim()).filter(Boolean);
    } else if (heading.includes('Urgency')) {
      data.urgency = content.toLowerCase();
    } else if (heading.includes('Project Size')) {
      data.projectSize = content.toLowerCase();
    } else if (heading.includes('Additional Notes')) {
      data.additionalNotes = content;
    } else if (heading.includes('Organization Type')) {
      data.organizationType = content;
    } else if (heading.includes('Organization Name')) {
      data.organizationName = content;
    } else if (heading.includes('Open to Honorarium')) {
      data.openToSponsorship = content.toLowerCase().includes('yes');
    } else if (heading.includes('Preferred Helper')) {
      data.preferredPractitioner = content;
    } else if (heading.includes('Nominee Name')) {
      data.nomineeName = content;
    } else if (heading.includes('Nominee Email')) {
      data.nomineeEmail = content;
    } else if (heading.includes('Nominee GitHub')) {
      data.nomineeGithub = content.replace('@', '');
    }
  }
  
  return data;
}

// Generate slug from project URL
function generateSlug(projectUrl, issueNumber) {
  try {
    const url = new URL(projectUrl);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const repoName = pathParts[pathParts.length - 1] || 'unknown';
    return `${repoName}-${issueNumber}`;
  } catch {
    return `wishlist-${issueNumber}`;
  }
}

// Generate markdown content
function generateMarkdown(data, issueNumber, issueUrl) {
  const slug = generateSlug(data.projectUrl, issueNumber);
  const approved = issueLabels.some(label => label.name === 'approved');
  const now = new Date().toISOString();
  
  return `---
id: ${issueNumber}
projectName: "${data.projectTitle}"
repositoryUrl: "${data.projectUrl}"
maintainerUsername: "${data.maintainer}"
issueUrl: "${issueUrl}"
approved: ${approved}
wishes: ${JSON.stringify(data.services)}
technologies: ${JSON.stringify(data.technologies)}
resources: []
${data.urgency ? `urgency: "${data.urgency}"` : ''}
${data.projectSize ? `projectSize: "${data.projectSize}"` : ''}
${data.additionalNotes ? `additionalNotes: "${data.additionalNotes.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"` : ''}
${data.openToSponsorship !== undefined ? `openToSponsorship: ${data.openToSponsorship}` : ''}
${data.preferredPractitioner ? `preferredPractitioner: "${data.preferredPractitioner}"` : ''}
${data.organizationType ? `organizationType: "${data.organizationType}"` : ''}
${data.organizationName ? `organizationName: "${data.organizationName}"` : ''}
${data.nomineeName ? `nomineeName: "${data.nomineeName}"` : ''}
${data.nomineeEmail ? `nomineeEmail: "${data.nomineeEmail}"` : ''}
${data.nomineeGithub ? `nomineeGithub: "${data.nomineeGithub}"` : ''}
createdAt: "${now}"
updatedAt: "${now}"
---

# ${data.projectTitle}

${data.projectDescription || '_No description provided_'}

## Services Needed

${data.services.length > 0 ? data.services.map(s => `- ${s}`).join('\n') : '_No services specified_'}

${data.technologies.length > 0 ? `\n## Technologies\n\n${data.technologies.map(t => `- ${t}`).join('\n')}` : ''}

${data.additionalNotes ? `\n## Additional Notes\n\n${data.additionalNotes}` : ''}

---

[View on GitHub](${issueUrl})
`;
}

// Main execution
async function main() {
  const contentDir = path.join(__dirname, '../../src/content/wishlists');
  const data = parseIssueForm(issueBody);
  const slug = generateSlug(data.projectUrl, issueNumber);
  const filePath = path.join(contentDir, `${slug}.md`);
  
  // If issue is closed, delete the markdown file
  if (issueState === 'closed') {
    try {
      await fs.unlink(filePath);
      console.log(`✓ Deleted ${filePath}`);
    } catch (error) {
      if (error.code !== 'ENOENT') {
        console.error(`✗ Failed to delete ${filePath}:`, error);
        process.exit(1);
      }
      console.log(`✓ File ${filePath} does not exist (already deleted)`);
    }
    return;
  }
  
  // Otherwise, create/update the markdown file
  const markdown = generateMarkdown(data, issueNumber, issueUrl);
  
  try {
    await fs.mkdir(contentDir, { recursive: true });
    await fs.writeFile(filePath, markdown, 'utf-8');
    console.log(`✓ Wrote ${filePath}`);
  } catch (error) {
    console.error(`✗ Failed to write ${filePath}:`, error);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});
