/**
 * Shared TypeScript type definitions for Wishlist data
 */

export interface WishlistFormData {
  projectTitle: string;
  projectUrl: string;
  maintainer: string;
  services: string[];
  projectSize: 'small' | 'medium' | 'large';
  technologies: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  additionalNotes: string;
  repositories: Repository[];
  createFundingPR: boolean;
  openToSponsorship: boolean;
  preferredPractitioner?: string;
  nomineeName?: string;
  nomineeEmail?: string;
  nomineeGithub?: string;
  organizationType?: string;
  organizationName?: string;
  otherOrganizationType?: string;
  maintainerEmail: string;
}

export interface Repository {
  name: string;
  url: string;
  username: string;
  description: string;
}

export interface Wishlist {
  id: number;
  project?: string;
  projectName?: string;
  maintainer?: string;
  maintainerUsername?: string;
  maintainerAvatarUrl?: string;
  repository?: string;
  repositoryUrl?: string;
  urgency?: string;
  projectSize?: string;
  services?: string[];
  wishes?: string[];
  technologies?: string[];
  additionalNotes?: string;
  approvalStatus?: 'approved' | 'pending';
  approved?: boolean;
  createdAt?: string;
  updatedAt?: string;
  wishlistUrl?: string;
}
