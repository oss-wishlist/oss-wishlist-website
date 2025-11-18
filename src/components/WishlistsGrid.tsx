import React, { useState, useEffect } from 'react';
import WishlistCard from './WishlistCard';
import type { User } from '../lib/auth';

interface Props {
  user?: User | null;
  mode: 'public' | 'private'; // public = approved only, no edit/delete; private = all user's wishlists with edit/delete
}

interface Wishlist {
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

export default function WishlistsGrid({ user, mode }: Props) {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [basePath, setBasePath] = useState('');

  useEffect(() => {
    // Get base path with trailing slash
    const base = import.meta.env.BASE_URL || '/';
    const basePath = base.endsWith('/') ? base : `${base}/`;
    setBasePath(basePath);

    // Fetch wishlists based on mode
    if (mode === 'private') {
      fetchUserWishlists(basePath);

      // Listen for new wishlist events from WishlistForm
      const handleNewWishlist = async (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.wishlist) {
          const newWishlist = customEvent.detail.wishlist;
          
          // Immediately add to UI (don't wait for API)
          setWishlists(prev => [newWishlist, ...prev]);
        }
      };

      // Listen for updated wishlist events from WishlistForm
      const handleUpdatedWishlist = async (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.wishlist) {
          const updatedWishlist = customEvent.detail.wishlist;
          const issueNumber = customEvent.detail.issueNumber;
          
          // Immediately update UI with the returned data (don't wait for API)
          const updated = wishlists.map((w: any) => {
            if (w.id === issueNumber) {
              return updatedWishlist;
            }
            return w;
          });
          setWishlists(updated);
        }
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('wishlist-created', handleNewWishlist);
        window.addEventListener('wishlist-updated', handleUpdatedWishlist);
        return () => {
          window.removeEventListener('wishlist-created', handleNewWishlist);
          window.removeEventListener('wishlist-updated', handleUpdatedWishlist);
        };
      }
    } else {
      // Public mode
      fetchPublicWishlists(basePath);
    }
  }, [mode]);

  const fetchUserWishlists = async (base: string) => {
    try {
      setLoading(true);
      setError(null);

      // Add cache busting timestamp to force fresh data
      const cacheBuster = Date.now();
      const response = await fetch(`${base}api/user-wishlists?username=${user?.username}&_=${cacheBuster}`, {
        cache: 'no-store', // Prevent browser caching
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) {
        throw new Error(`Failed to fetch wishlists: ${response.status}`);
      }

      const data = await response.json();
      const allWishlists = Array.isArray(data.wishlists) ? data.wishlists : data;

      // Sort by updatedAt date (newest first)
      const sortedWishlists = allWishlists.sort((a: Wishlist, b: Wishlist) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA; // Descending order (newest first)
      });

      // For user's own dashboard, show both approved AND pending wishlists
      setWishlists(sortedWishlists);
      
    } catch (err) {
      console.error('[WishlistsGrid] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wishlists');
    } finally {
      setLoading(false);
    }
  };

  const fetchPublicWishlists = async (base: string) => {
    try {
      setLoading(true);
      setError(null);

      const cleanBasePath = base.replace(/\/$/, '');
      const apiUrl = `${cleanBasePath}/api/wishlists`;
      
      const response = await fetch(apiUrl);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: Failed to fetch wishlists`);
      }
      
      const data = await response.json();
      const allWishlists = Array.isArray(data.wishlists) ? data.wishlists : data;
      
      // For public mode, only show approved wishlists
      const approvedWishlists = allWishlists.filter((w: Wishlist) => 
        w.approved === true || w.approvalStatus === 'approved'
      );

      // Sort by updatedAt date (newest first)
      const sortedWishlists = approvedWishlists.sort((a: Wishlist, b: Wishlist) => {
        const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return dateB - dateA;
      });
      
      setWishlists(sortedWishlists);
      
    } catch (err) {
      console.error('[WishlistsGrid] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wishlists');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (issueNumber: number) => {
    // Navigate to edit-wishlist page with edit parameter
    window.location.href = `${basePath}edit-wishlist?edit=${issueNumber}`;
  };

  const handleDelete = async (issueNumber: number) => {
    const confirmed = confirm('Are you sure you want to delete this wishlist? This will mark it as no longer needing help.');
    if (!confirmed) return;

    // Optimistically remove from UI immediately
    setWishlists(prev => prev.filter(w => w.id !== issueNumber));

    try {
      const response = await fetch(`${basePath}api/close-wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueNumber })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete wishlist');
      }
      
      // Success - wishlist already removed from UI
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete wishlist');
      // On error, we should ideally re-add the wishlist, but for now just show error
    }
  };

  if (loading) {
    return (
      <div className="col-span-full text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-600 mx-auto mb-3"></div>
        <p className="text-sm text-gray-600">Loading wishlists...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="col-span-full text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Error loading wishlists</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    );
  }

  if (wishlists.length === 0) {
    return (
      <div className="col-span-full text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {mode === 'private' ? 'No wishlists yet' : 'No approved wishlists yet'}
        </h3>
        <p className="text-gray-600">
          {mode === 'private' ? 'Create your first wishlist below' : 'Be the first to create a wishlist for your open source project!'}
        </p>
        {mode === 'public' && (
          <a href={`${basePath}create-wishlist`} className="btn-primary inline-block mt-4">
            Create Your Wishlist
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      {wishlists.map((wishlist) => (
        <WishlistCard
          key={wishlist.id}
          wishlist={wishlist}
          basePath={basePath}
          mode={mode}
          onEdit={mode === 'private' ? handleEdit : undefined}
          onDelete={mode === 'private' ? handleDelete : undefined}
        />
      ))}
    </>
  );
}
