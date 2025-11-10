import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import YourWishlistsGrid from '../components/YourWishlistsGrid';

// Mock the paths module
vi.mock('../lib/paths', () => ({
  getBasePath: () => '/',
}));

describe('YourWishlistsGrid - Edit/Create/Delete Modes', () => {
  const mockUser = {
    id: 12345,
    username: 'testuser',
    name: 'Test User',
    email: 'test@example.com',
    avatar_url: 'https://avatars.githubusercontent.com/u/12345',
    provider: 'github' as const,
  };

  const mockWishlists = [
    {
      id: 1,
      project: 'Test Project A',
      maintainer: 'testuser',
      repository: 'https://github.com/testuser/project-a',
      urgency: 'high',
      projectSize: 'medium',
      services: ['security-audit', 'funding'],
      technologies: ['javascript', 'typescript'],
      additionalNotes: 'We need help with security',
      approvalStatus: 'approved' as const,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-15',
    },
    {
      id: 2,
      project: 'Test Project B',
      maintainer: 'testuser',
      repository: 'https://github.com/testuser/project-b',
      urgency: 'medium',
      projectSize: 'large',
      services: ['community-strategy'],
      technologies: ['python'],
      additionalNotes: 'Growing community support needed',
      approvalStatus: 'pending' as const,
      createdAt: '2025-01-05',
      updatedAt: '2025-01-10',
    },
  ];

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    
    // Mock fetch for API calls
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ wishlists: mockWishlists }),
      })
    ) as any;

    // Mock window.location.href
    delete (window as any).location;
    window.location = { href: '', reload: vi.fn() } as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  describe('Display Modes', () => {
    it('should display wishlist cards on normal page load', async () => {
      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Test Project A')).toBeInTheDocument();
        expect(screen.getByText('Test Project B')).toBeInTheDocument();
      });
    });

    it('should hide cards and show back button when in edit mode', async () => {
      // Set edit mode flags
      sessionStorage.setItem('wishlist_edit_issue_number', '1');
      sessionStorage.setItem('wishlist_navigated_to_edit', 'true');

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        // Cards should not be visible
        expect(screen.queryByText('Test Project A')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Project B')).not.toBeInTheDocument();
        
        // Back button should be visible
        expect(screen.getByText(/Back to Your Wishlists/)).toBeInTheDocument();
      });
    });

    it('should hide cards and show back button when in create mode', async () => {
      // Set create mode flag
      sessionStorage.setItem('wishlist_in_create_mode', 'true');

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        // Cards should not be visible
        expect(screen.queryByText('Test Project A')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Project B')).not.toBeInTheDocument();
        
        // Back button should be visible
        expect(screen.getByText(/Back to Your Wishlists/)).toBeInTheDocument();
      });
    });

    it('should show empty state when user has no wishlists', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ wishlists: [] }),
        })
      ) as any;

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('No wishlists yet')).toBeInTheDocument();
        expect(screen.getByText(/Create your first wishlist below/)).toBeInTheDocument();
      });
    });

    it('should show error state when fetch fails', async () => {
      global.fetch = vi.fn(() =>
        Promise.resolve({
          ok: false,
          status: 500,
        })
      ) as any;

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Error loading wishlists')).toBeInTheDocument();
      });
    });
  });

  describe('Edit Mode Functionality', () => {
    it('should set sessionStorage flags when clicking edit button', async () => {
      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Test Project A')).toBeInTheDocument();
      });

      const editButtons = screen.getAllByText('Edit');
      fireEvent.click(editButtons[0]);

      expect(sessionStorage.getItem('wishlist_edit_issue_number')).toBe('1');
      expect(sessionStorage.getItem('wishlist_navigated_to_edit')).toBe('true');
      expect(window.location.href).toContain('/maintainers');
    });

    it('should not enter edit mode if only one flag is set', async () => {
      // Only set issue number, not the navigation flag
      sessionStorage.setItem('wishlist_edit_issue_number', '1');

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        // Should still show cards because both flags are required
        expect(screen.getByText('Test Project A')).toBeInTheDocument();
      });
    });

    it('should not enter edit mode if navigation flag is missing', async () => {
      // Only set navigation flag, not issue number
      sessionStorage.setItem('wishlist_navigated_to_edit', 'true');

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        // Should still show cards because both flags are required
        expect(screen.getByText('Test Project A')).toBeInTheDocument();
      });
    });
  });

  describe('Create Mode Functionality', () => {
    it('should hide cards when in create mode', async () => {
      sessionStorage.setItem('wishlist_in_create_mode', 'true');

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        expect(screen.queryByText('Test Project A')).not.toBeInTheDocument();
        expect(screen.getByText(/Back to Your Wishlists/)).toBeInTheDocument();
      });
    });

    it('should clear create mode flag when back button clicked', async () => {
      sessionStorage.setItem('wishlist_in_create_mode', 'true');

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Back to Your Wishlists/)).toBeInTheDocument();
      });

      const backButton = screen.getByText(/Back to Your Wishlists/);
      fireEvent.click(backButton);

      expect(sessionStorage.getItem('wishlist_in_create_mode')).toBeNull();
      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('Back Button Functionality', () => {
    it('should clear all edit mode flags when back button clicked from edit mode', async () => {
      sessionStorage.setItem('wishlist_edit_issue_number', '1');
      sessionStorage.setItem('wishlist_navigated_to_edit', 'true');

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Back to Your Wishlists/)).toBeInTheDocument();
      });

      const backButton = screen.getByText(/Back to Your Wishlists/);
      fireEvent.click(backButton);

      expect(sessionStorage.getItem('wishlist_edit_issue_number')).toBeNull();
      expect(sessionStorage.getItem('wishlist_navigated_to_edit')).toBeNull();
      expect(sessionStorage.getItem('wishlist_in_create_mode')).toBeNull();
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('should reload page when back button clicked', async () => {
      sessionStorage.setItem('wishlist_in_create_mode', 'true');

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText(/Back to Your Wishlists/)).toBeInTheDocument();
      });

      const backButton = screen.getByText(/Back to Your Wishlists/);
      fireEvent.click(backButton);

      expect(window.location.reload).toHaveBeenCalled();
    });
  });

  describe('Card Display', () => {
    it('should display correct wishlist information on cards', async () => {
      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        // Check project names
        expect(screen.getByText('Test Project A')).toBeInTheDocument();
        expect(screen.getByText('Test Project B')).toBeInTheDocument();

        // Check maintainer names
        expect(screen.getAllByText('@testuser')).toHaveLength(2);

        // Check approval status
        expect(screen.getByText('Approved')).toBeInTheDocument();
        expect(screen.getByText('Pending')).toBeInTheDocument();

        // Check urgency badge
        expect(screen.getByText('high')).toBeInTheDocument();
      });
    });

    it('should display services on cards', async () => {
      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('security-audit')).toBeInTheDocument();
        expect(screen.getByText('funding')).toBeInTheDocument();
        expect(screen.getByText('community-strategy')).toBeInTheDocument();
      });
    });

    it('should have View, Edit, and Delete buttons on each card', async () => {
      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        const viewButtons = screen.getAllByText('View');
        const editButtons = screen.getAllByText('Edit');
        const deleteButtons = screen.getAllByText('Delete');

        expect(viewButtons).toHaveLength(2);
        expect(editButtons).toHaveLength(2);
        expect(deleteButtons).toHaveLength(2);
      });
    });
  });

  describe('Delete Mode Functionality', () => {
    it('should call close-wishlist API when delete confirmed', async () => {
      global.fetch = vi.fn()
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ wishlists: mockWishlists }),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true }),
          })
        )
        .mockImplementationOnce(() =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ wishlists: [mockWishlists[1]] }),
          })
        ) as any;

      window.confirm = vi.fn(() => true);

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Test Project A')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/close-wishlist'),
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('should not delete if user cancels confirmation', async () => {
      window.confirm = vi.fn(() => false);

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        expect(screen.getByText('Test Project A')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByText('Delete');
      fireEvent.click(deleteButtons[0]);

      // fetch should only have been called once (for initial load)
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Loading and Error States', () => {
    it('should show loading spinner initially', () => {
      global.fetch = vi.fn(
        () => new Promise(() => {}) // Never resolves
      ) as any;

      render(<YourWishlistsGrid user={mockUser} />);

      expect(screen.getByText('Loading your wishlists...')).toBeInTheDocument();
    });

    it('should not fetch wishlists when in edit mode', async () => {
      sessionStorage.setItem('wishlist_edit_issue_number', '1');
      sessionStorage.setItem('wishlist_navigated_to_edit', 'true');

      global.fetch = vi.fn();

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        // fetch should not have been called because we're in edit mode
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });

    it('should not fetch wishlists when in create mode', async () => {
      sessionStorage.setItem('wishlist_in_create_mode', 'true');

      global.fetch = vi.fn();

      render(<YourWishlistsGrid user={mockUser} />);

      await waitFor(() => {
        // fetch should not have been called because we're in create mode
        expect(global.fetch).not.toHaveBeenCalled();
      });
    });
  });
});
