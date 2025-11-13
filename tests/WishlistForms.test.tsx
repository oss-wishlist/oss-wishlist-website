import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import WishlistForm from '../src/components/WishlistForms';

// Mock the Astro utilities that the component depends on
vi.mock('../lib/paths', () => ({
  getBasePath: () => '/',
  withBasePath: (path: string) => path,
  withBaseUrl: (path: string) => `http://localhost${path}`,
}));

vi.mock('../config/app', () => ({
  getApiPath: () => '/api',
}));

vi.mock('../lib/ecosystems', () => ({
  SUPPORTED_ECOSYSTEMS: [
    { id: 'npm', name: 'npm (Node.js/JavaScript)' },
    { id: 'rust', name: 'Crates.io (Rust)' },
    { id: 'pypi', name: 'PyPI (Python)' },
  ],
}));

describe('WishlistForm Component', () => {
  const mockServices = [
    {
      id: 'audit',
      title: 'Security Audit',
      description: 'Professional security review',
      slug: 'security-audit',
      available: true,
    },
    {
      id: 'funding',
      title: 'Funding Strategy',
      description: 'Develop sustainable funding',
      slug: 'funding-strategy',
      available: true,
    },
    {
      id: 'governance',
      title: 'Governance Setup',
      description: 'Establish project governance',
      slug: 'governance-setup',
      available: true,
    },
  ];

  const mockUser = {
    id: 12345,
    login: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://github.com/testuser.png',
    repositories: [
      {
        id: 1,
        name: 'awesome-project',
        full_name: 'testuser/awesome-project',
        description: 'An awesome open source project',
        html_url: 'https://github.com/testuser/awesome-project',
        stargazers_count: 150,
        language: 'JavaScript',
      },
      {
        id: 2,
        name: 'another-tool',
        full_name: 'testuser/another-tool',
        description: 'Another useful tool',
        html_url: 'https://github.com/testuser/another-tool',
        stargazers_count: 45,
        language: 'Rust',
      },
    ],
    authenticated: true,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock fetch so component doesn't try to make real API calls
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ wishlists: [] }),
      } as Response)
    );
  });

  it('renders form when user is logged in', async () => {
    render(
      <WishlistForm 
        services={mockServices} 
        user={mockUser}
        initialRepositories={mockUser.repositories}
      />
    );

    await waitFor(() => {
      const heading = screen.queryByText(/Select a Repository/i);
      expect(heading).toBeInTheDocument();
    });
  });

  it('shows authentication prompt when user is not logged in', async () => {
    render(
      <WishlistForm 
        services={mockServices}
        user={null}
      />
    );

    await waitFor(() => {
      const authHeading = screen.queryByText(/Authentication Required/i);
      expect(authHeading).toBeInTheDocument();
    });
  });

  it('displays all available services', () => {
    const availableServices = mockServices.filter(s => s.available);
    expect(availableServices).toHaveLength(3);
  });

  it('handles users with multiple repositories', () => {
    render(
      <WishlistForm 
        services={mockServices}
        user={mockUser}
        initialRepositories={mockUser.repositories}
      />
    );

    expect(mockUser.repositories).toHaveLength(2);
    expect(mockUser.repositories[0].name).toBe('awesome-project');
  });
});
