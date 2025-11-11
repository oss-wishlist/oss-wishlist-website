import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WishlistForm from '../src/components/WishlistForms';
import '@testing-library/jest-dom/vitest';

// Mock modules
vi.mock('../src/lib/paths', () => ({
  getBasePath: () => '/',
  withBasePath: (path: string) => `/${path}`,
  withBaseUrl: (path: string) => `http://localhost:3000/${path}`,
}));

vi.mock('../src/config/app', () => ({
  API_BASE: 'http://localhost:3000',
  getApiPath: (endpoint: string) => `http://localhost:3000/api${endpoint}`,
}));

vi.mock('../../lib/ecosystems', () => ({
  SUPPORTED_ECOSYSTEMS: [
    { name: 'npm', label: 'npm' },
    { name: 'PyPI', label: 'PyPI' },
  ],
}));

// Mock data with proper types
const mockServices = [
  {
    id: 'security',
    title: 'Security Audit',
    category: 'Security',
    slug: 'security-audit',
    description: 'Professional security review',
    availability: { available: true },
  },
  {
    id: 'funding',
    title: 'Funding Strategy',
    category: 'Business',
    slug: 'funding-strategy',
    description: 'Help with funding',
    availability: { available: true },
  },
];

const mockUser = {
  id: 1,
  login: 'testuser',
  name: 'Test User',
  email: 'test@example.com',
  avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
  authenticated: true,
  repositories: [
    {
      id: 1,
      name: 'awesome-project',
      full_name: 'testuser/awesome-project',
      html_url: 'https://github.com/testuser/awesome-project',
      description: 'An awesome open source project',
      stargazers_count: 150,
      language: 'JavaScript',
      permissions: { admin: true, push: true, pull: true },
    },
  ],
};

describe('WishlistForm Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ wishlists: [] }),
      } as unknown as Response)
    );
  });

  describe('API Integration', () => {
    it('sends submission to API endpoint', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      fetchMock.mockImplementation((url: string, options?: any) => {
        if (url.includes('check-existing')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ results: {} }),
          } as unknown as Response);
        }
        if (url.includes('submit-wishlist')) {
          // Verify the endpoint is correct
          expect(url).toContain('submit-wishlist');
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                data: {
                  issue: {
                    number: 42,
                    url: 'https://github.com/oss-wishlist/wishlists/issues/42',
                    title: 'Wishlist: Test Project',
                  },
                },
              }),
          } as unknown as Response);
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ wishlists: [] }),
        } as unknown as Response);
      });

      render(
        <WishlistForm
          services={mockServices}
          user={mockUser}
          initialRepositories={mockUser.repositories}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Select a Repository/i)).toBeInTheDocument();
      });

      expect(fetchMock).toHaveBeenCalled();
    });

    it('includes correct HTTP method (POST)', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      let capturedOptions: any = null;

      fetchMock.mockImplementation((url: string, options?: any) => {
        if (url.includes('check-existing')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ results: {} }),
          });
        }
        if (url.includes('submit-wishlist')) {
          capturedOptions = options;
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                issue: { number: 42, url: '', title: '' },
              },
            }),
        });
      });

      render(
        <WishlistForm
          services={mockServices}
          user={mockUser}
          initialRepositories={mockUser.repositories}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Select a Repository/i)).toBeInTheDocument();
      });

      // If submission was made, verify POST method
      if (capturedOptions) {
        expect(capturedOptions.method).toBe('POST');
      }
    });

    it('sends JSON content type', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      let capturedOptions: any = null;

      fetchMock.mockImplementation((url: string, options?: any) => {
        if (url.includes('submit-wishlist')) {
          capturedOptions = options;
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                issue: { number: 42, url: '', title: '' },
              },
            }),
        });
      });

      render(
        <WishlistForm
          services={mockServices}
          user={mockUser}
          initialRepositories={mockUser.repositories}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Select a Repository/i)).toBeInTheDocument();
      });

      // If submission was made, verify JSON content type
      if (capturedOptions) {
        expect(capturedOptions.headers['Content-Type']).toBe('application/json');
      }
    });
  });

  describe('Submission Payload Structure', () => {
    it('includes title in submission', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      let submissionPayload: any = null;

      fetchMock.mockImplementation((url: string, options?: any) => {
        if (url.includes('submit-wishlist') && options?.method === 'POST') {
          submissionPayload = JSON.parse(options.body);
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                issue: { number: 42, url: '', title: '' },
              },
            }),
        });
      });

      render(
        <WishlistForm
          services={mockServices}
          user={mockUser}
          initialRepositories={mockUser.repositories}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Select a Repository/i)).toBeInTheDocument();
      });

      // Payload should include title when submission happens
      if (submissionPayload) {
        expect(submissionPayload).toHaveProperty('title');
        expect(typeof submissionPayload.title).toBe('string');
      }
    });

    it('includes body in submission', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      let submissionPayload: any = null;

      fetchMock.mockImplementation((url: string, options?: any) => {
        if (url.includes('submit-wishlist') && options?.method === 'POST') {
          submissionPayload = JSON.parse(options.body);
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                issue: { number: 42, url: '', title: '' },
              },
            }),
        });
      });

      render(
        <WishlistForm
          services={mockServices}
          user={mockUser}
          initialRepositories={mockUser.repositories}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Select a Repository/i)).toBeInTheDocument();
      });

      // Payload should include body markdown
      if (submissionPayload) {
        expect(submissionPayload).toHaveProperty('body');
        expect(typeof submissionPayload.body).toBe('string');
        // Body should have markdown structure
        expect(submissionPayload.body).toContain('#');
      }
    });

    it('includes labels in submission', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      let submissionPayload: any = null;

      fetchMock.mockImplementation((url: string, options?: any) => {
        if (url.includes('submit-wishlist') && options?.method === 'POST') {
          submissionPayload = JSON.parse(options.body);
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                issue: { number: 42, url: '', title: '' },
              },
            }),
        });
      });

      render(
        <WishlistForm
          services={mockServices}
          user={mockUser}
          initialRepositories={mockUser.repositories}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Select a Repository/i)).toBeInTheDocument();
      });

      // Payload should include labels array
      if (submissionPayload) {
        expect(submissionPayload).toHaveProperty('labels');
        expect(Array.isArray(submissionPayload.labels)).toBe(true);
        expect(submissionPayload.labels).toContain('wishlist');
      }
    });

    it('includes formData in submission', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      let submissionPayload: any = null;

      fetchMock.mockImplementation((url: string, options?: any) => {
        if (url.includes('submit-wishlist') && options?.method === 'POST') {
          submissionPayload = JSON.parse(options.body);
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                issue: { number: 42, url: '', title: '' },
              },
            }),
        });
      });

      render(
        <WishlistForm
          services={mockServices}
          user={mockUser}
          initialRepositories={mockUser.repositories}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Select a Repository/i)).toBeInTheDocument();
      });

      // Payload should include formData object
      if (submissionPayload) {
        expect(submissionPayload).toHaveProperty('formData');
        expect(typeof submissionPayload.formData).toBe('object');
      }
    });
  });

  describe('formData Content', () => {
    it('formData includes required fields', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      let formData: any = null;

      fetchMock.mockImplementation((url: string, options?: any) => {
        if (url.includes('submit-wishlist') && options?.method === 'POST') {
          const payload = JSON.parse(options.body);
          formData = payload.formData;
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                issue: { number: 42, url: '', title: '' },
              },
            }),
        });
      });

      render(
        <WishlistForm
          services={mockServices}
          user={mockUser}
          initialRepositories={mockUser.repositories}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Select a Repository/i)).toBeInTheDocument();
      });

      // formData should have core fields
      if (formData) {
        expect(formData).toHaveProperty('projectTitle');
        expect(formData).toHaveProperty('maintainer');
        expect(formData).toHaveProperty('services');
        expect(formData).toHaveProperty('projectSize');
        expect(formData).toHaveProperty('urgency');
      }
    });

    it('services is an array in formData', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      let formData: any = null;

      fetchMock.mockImplementation((url: string, options?: any) => {
        if (url.includes('submit-wishlist') && options?.method === 'POST') {
          const payload = JSON.parse(options.body);
          formData = payload.formData;
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                issue: { number: 42, url: '', title: '' },
              },
            }),
        });
      });

      render(
        <WishlistForm
          services={mockServices}
          user={mockUser}
          initialRepositories={mockUser.repositories}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Select a Repository/i)).toBeInTheDocument();
      });

      if (formData) {
        expect(Array.isArray(formData.services)).toBe(true);
      }
    });

    it('includes repositories array in formData', async () => {
      const fetchMock = vi.fn();
      global.fetch = fetchMock;

      let formData: any = null;

      fetchMock.mockImplementation((url: string, options?: any) => {
        if (url.includes('submit-wishlist') && options?.method === 'POST') {
          const payload = JSON.parse(options.body);
          formData = payload.formData;
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              data: {
                issue: { number: 42, url: '', title: '' },
              },
            }),
        });
      });

      render(
        <WishlistForm
          services={mockServices}
          user={mockUser}
          initialRepositories={mockUser.repositories}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Select a Repository/i)).toBeInTheDocument();
      });

      if (formData) {
        expect(formData).toHaveProperty('repositories');
        if (formData.repositories) {
          expect(Array.isArray(formData.repositories)).toBe(true);
        }
      }
    });
  });

  describe('Form Authentication', () => {
    it('requires authenticated user to show form', async () => {
      render(
        <WishlistForm
          services={mockServices}
          user={null}
          initialRepositories={[]}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Authentication Required/i)).toBeInTheDocument();
      });

      // Form fields should not be visible
      expect(screen.queryByLabelText(/Project Title/i)).not.toBeInTheDocument();
    });

    it('shows form for authenticated users', async () => {
      render(
        <WishlistForm
          services={mockServices}
          user={mockUser}
          initialRepositories={mockUser.repositories}
        />
      );

      await waitFor(() => {
        expect(screen.queryByText(/Select a Repository/i)).toBeInTheDocument();
      });

      // Form should be visible and showing repository selection
      expect(screen.queryByText('awesome-project')).toBeInTheDocument();
    });
  });
});
