// GitHub Repository Configuration
// This file contains public repository settings that can be shared

export const GITHUB_CONFIG = {
  // Organization and repository - now reading from environment variable
  ORG: 'oss-wishlist',
  REPO: 'wishlists-dev', // Changed from 'wishlists' to 'wishlists-dev' for staging/development
  
  // GitHub project board
  PROJECT_NUMBER: 1,
  
  // Issue template
  TEMPLATE_NAME: 'oss-wishlist-request.yml',
  
  // Computed URLs
  get REPO_URL() {
    return `https://github.com/${this.ORG}/${this.REPO}`;
  },
  
  get API_ISSUES_URL() {
    return `https://api.github.com/repos/${this.ORG}/${this.REPO}/issues`;
  },
  
  get NEW_ISSUE_URL() {
    return `${this.REPO_URL}/issues/new?template=${this.TEMPLATE_NAME}`;
  }
};