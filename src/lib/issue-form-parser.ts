// Utility to parse GitHub Issue Form responses
// Issue forms create a structured format that's easier to parse

interface ParsedIssueForm {
  project: string;
  maintainer: string;
  repository: string;
  urgency: string;
  projectSize?: 'small' | 'medium' | 'large';
  services: string[];
  resources: string[];
  technologies?: string[];
  additionalContext?: string;
  wantsFundingYml: boolean;
  openToSponsorship: boolean;
  // Optional form fields
  timeline?: string;
  organizationType?: 'single-maintainer' | 'community-team' | 'company-team' | 'foundation-team' | 'other';
  organizationName?: string;
  otherOrganizationType?: string;
  additionalNotes?: string;
  // Practitioner preferences and nomination
  preferredPractitioner?: string;
  nomineeName?: string;
  nomineeEmail?: string;
  nomineeGithub?: string;
}

export function parseIssueForm(body: string): ParsedIssueForm {
  const result: ParsedIssueForm = {
    project: '',
    maintainer: '',
    repository: '',
    urgency: 'medium',
    services: [],
    resources: [],
    wantsFundingYml: false,
    openToSponsorship: false
  };

    // Parse technologies/package ecosystems from anywhere in the body
    // Look for various formats:
    // 1. "### Package Ecosystems" section with ecosystem name(s)
    const packageEcosystemsSection = body.split('### Package Ecosystems')[1]?.split('###')[0]?.trim();
    console.log('Package Ecosystems Section:', packageEcosystemsSection);
    
    if (packageEcosystemsSection) {
      // The section content is the ecosystem name directly, possibly comma-separated
      // or on separate lines with dashes, or just the name
      const techs = packageEcosystemsSection
        .split('\n')
        .map(line => line.replace(/^-\s*/, '').trim()) // Remove leading dash if present
        .filter(line => line && line !== '_No response_') // Filter out empty lines and "No response"
        .map(line => line.split(',').map(t => t.trim())).flat() // Handle comma-separated
        .filter(Boolean);
      console.log('Found technologies from section:', techs);
      if (techs.length) {
        result.technologies = techs;
      }
    } else {
      // Try other formats
      const techMatch = body.match(/(?:[-*]\s*|^)\*\*(Package Ecosystems|Technologies):\*\*\s*(.+?)(?:\n|$)/m);
      if (techMatch) {
        const techs = techMatch[2].split(',').map(t => t.trim()).filter(t => t);
        console.log('Found technologies from inline format:', techs);
        result.technologies = techs;
      }
    }
    
    console.log('Final technologies:', result.technologies);
    // Issue forms create sections with ### headers
  const sections = body.split('###').map(s => s.trim()).filter(Boolean);

  for (const section of sections) {
    const lines = section.split('\n');
    const header = lines[0].trim();
    const content = lines.slice(1).join('\n').trim();

    switch (header) {
      case 'Project Name':
        result.project = content.replace('_No response_', '').trim();
        break;
      
      case 'Maintainer GitHub Username':
        result.maintainer = content.replace('_No response_', '').replace('@', '').trim();
        break;
      
      case 'Project Repository':
        result.repository = content.replace('_No response_', '').trim();
        break;
      
      case 'Urgency Level':
        const urgencyMap: Record<string, string> = {
          'Low - Planning for future': 'low',
          'Medium - Needed within months': 'medium',
          'High - Needed within weeks': 'high',
          'Critical - Needed immediately': 'critical'
        };
        result.urgency = urgencyMap[content] || 'medium';
        break;

      case 'Project Size':
        {
          const size = content.replace('_No response_', '').trim().toLowerCase();
          if (size === 'small' || size === 'medium' || size === 'large') {
            result.projectSize = size as 'small' | 'medium' | 'large';
          }
        }
        break;
      
      case 'Services Requested':
        // Parse checkboxes: - [x] Service Name
        const serviceLines = content.split('\n');
        for (const line of serviceLines) {
          if (line.includes('- [x] ') || line.includes('- [X] ')) {
            const service = line.replace(/- \[[xX]\] /, '').trim();
            if (service && service !== '_No response_') {
              result.services.push(service);
            }
          }
        }
        break;
      
      case 'Resources Requested':
        const resourceLines = content.split('\n');
        for (const line of resourceLines) {
          if (line.includes('- [x] ') || line.includes('- [X] ')) {
            const resource = line.replace(/- \[[xX]\] /, '').trim();
            if (resource && resource !== '_No response_') {
              result.resources.push(resource);
            }
          }
        }
        break;
      
      case 'Additional Context':
        if (content !== '_No response_') {
          result.additionalContext = content;
        }
        break;
      
      case 'FUNDING.yml Setup':
        result.wantsFundingYml = content.includes('- [x]') || content.includes('- [X]');
        break;
      
      case 'Open to Sponsorship':
      case 'Open to Honorarium':
        // Check if "Yes" appears in the content
        result.openToSponsorship = content.toLowerCase().includes('yes');
        break;
      
      case 'Timeline':
        if (content !== '_No response_') {
          result.timeline = content;
        }
        break;
      
      case 'Organization Type':
      case 'Who owns/runs this project?':
        const orgTypeMap: Record<string, 'single-maintainer' | 'community-team' | 'company-team' | 'foundation-team' | 'other'> = {
          'Single maintainer': 'single-maintainer',
          'Community team': 'community-team',
          'Company/employee team': 'company-team',
          'Foundation/employee team': 'foundation-team',
          'Other': 'other',
          // Legacy mappings for backwards compatibility
          'Individual maintainer': 'single-maintainer',
          'Company': 'company-team',
          'Nonprofit organization': 'foundation-team',
          'Foundation': 'foundation-team'
        };
        result.organizationType = orgTypeMap[content] || 'single-maintainer';
        break;
      
      case 'Organization Name':
        if (content !== '_No response_') {
          result.organizationName = content;
        }
        break;
      
      case 'Other Organization Type':
      case 'Please specify':
        if (content !== '_No response_') {
          result.otherOrganizationType = content;
        }
        break;
      
      case 'Additional Notes':
        if (content !== '_No response_') {
          result.additionalNotes = content;
        }
        break;
      
      case 'Preferred Practitioner':
        if (content !== '_No response_') {
          result.preferredPractitioner = content.trim();
        }
        break;
      
      case 'Nominee Name':
        if (content !== '_No response_') {
          result.nomineeName = content;
        }
        break;
      
      case 'Nominee Email':
        if (content !== '_No response_') {
          result.nomineeEmail = content;
        }
        break;
      
      case 'Nominee GitHub':
        if (content !== '_No response_') {
          result.nomineeGithub = content;
        }
        break;
    }
  }

  return result;
}

// Format data for creating an issue via API (matching issue form structure)
export function formatIssueFormBody(data: {
  project: string;
  maintainer: string;
  repository: string;
  urgency: string;
  projectSize?: 'small' | 'medium' | 'large';
  services: string[];
  resources: string[];
  additionalContext?: string;
  wantsFundingYml?: boolean;
  openToSponsorship?: boolean;
  timeline?: string;
  organizationType?: 'single-maintainer' | 'community-team' | 'company-team' | 'foundation-team' | 'other';
  organizationName?: string;
  otherOrganizationType?: string;
  additionalNotes?: string;
  technologies?: string[];
  preferredPractitioner?: string;
  nomineeName?: string;
  nomineeEmail?: string;
  nomineeGithub?: string;
}): string {
  const urgencyDisplay: Record<string, string> = {
    'low': 'Low - Planning for future',
    'medium': 'Medium - Needed within months',
    'high': 'High - Needed within weeks',
    'critical': 'Critical - Needed immediately'
  };

  let body = '';
  
  body += `### Project Name\n\n${data.project}\n\n`;
  body += `### Maintainer GitHub Username\n\n${data.maintainer}\n\n`;
  body += `### Project Repository\n\n${data.repository}\n\n`;
  
  // Add package ecosystems section if provided
  if (data.technologies && data.technologies.length > 0) {
    body += `### Package Ecosystems\n\n${data.technologies.join(', ')}\n\n`;
  }
  
  body += `### Urgency Level\n\n${urgencyDisplay[data.urgency] || 'Medium - Needed within months'}\n\n`;

  if (data.projectSize) {
    const sizeDisplay = data.projectSize.charAt(0).toUpperCase() + data.projectSize.slice(1);
    body += `### Project Size\n\n${sizeDisplay}\n\n`;
  }
  
  body += `### Services Requested\n\n`;
  // Enforce maximum of 3 services when formatting the issue body
  const servicesCapped = (data.services || []).slice(0, 3);
  if (servicesCapped.length > 0) {
    for (const service of servicesCapped) {
      body += `- [x] ${service}\n`;
    }
  } else {
    body += '_No response_';
  }
  body += '\n\n';
  
  body += `### Resources Requested\n\n`;
  if (data.resources.length > 0) {
    for (const resource of data.resources) {
      body += `- [x] ${resource}\n`;
    }
  } else {
    body += '_No response_';
  }
  body += '\n\n';
  
  if (data.additionalContext) {
    body += `### Additional Context\n\n${data.additionalContext}\n\n`;
  }
  
  if (data.timeline) {
    body += `### Timeline\n\n${data.timeline}\n\n`;
  }
  
  if (data.organizationType) {
    const orgTypeDisplay: Record<string, string> = {
      'single-maintainer': 'Single maintainer',
      'community-team': 'Community team',
      'company-team': 'Company/employee team',
      'foundation-team': 'Foundation/employee team',
      'other': 'Other'
    };
    body += `### Who owns/runs this project?\n\n${orgTypeDisplay[data.organizationType]}\n\n`;
  }
  
  if (data.otherOrganizationType) {
    body += `### Please specify\n\n${data.otherOrganizationType}\n\n`;
  }
  
  if (data.organizationName) {
    body += `### Organization Name\n\n${data.organizationName}\n\n`;
  }
  
  if (data.additionalNotes) {
    body += `### Additional Notes\n\n${data.additionalNotes}\n\n`;
  }
  
  if (data.openToSponsorship !== undefined) {
    body += `### Open to Honorarium\n\n${data.openToSponsorship ? 'Yes' : 'No'}\n\n`;
  }
  
  if (data.preferredPractitioner) {
    body += `### Preferred Practitioner\n\n${data.preferredPractitioner}\n\n`;
  }
  
  if (data.nomineeName) {
    body += `### Nominee Name\n\n${data.nomineeName}\n\n`;
  }
  
  if (data.nomineeEmail) {
    body += `### Nominee Email\n\n${data.nomineeEmail}\n\n`;
  }
  
  if (data.nomineeGithub) {
    body += `### Nominee GitHub\n\n${data.nomineeGithub}\n\n`;
  }
  
  if (data.wantsFundingYml) {
    body += `### FUNDING.yml Setup\n\n- [x] Yes, create a FUNDING.yml PR for my repository\n\n`;
  }
  
  return body;
}
