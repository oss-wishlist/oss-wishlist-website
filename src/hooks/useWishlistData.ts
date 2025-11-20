/**
 * Shared hook for fetching and managing wishlist data
 * Used by both WishlistsGrid and YourWishlistsGrid components
 */

import { useState, useEffect } from 'react';
import type { Wishlist } from '../types/wishlist';

interface UseWishlistDataOptions {
  mode: 'public' | 'private';
  username?: string;
}

interface UseWishlistDataReturn {
  wishlists: Wishlist[];
  loading: boolean;
  error: string | null;
  refetch: (basePath: string) => Promise<void>;
}

export function useWishlistData({ mode, username }: UseWishlistDataOptions): UseWishlistDataReturn {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [basePath, setBasePath] = useState('');

  useEffect(() => {
    // Get base path with trailing slash
    const base = import.meta.env.BASE_URL || '/';
    const path = base.endsWith('/') ? base : `${base}/`;
    setBasePath(path);

    // Initial fetch
    if (mode === 'private') {
      fetchUserWishlists(path);
    } else {
      fetchPublicWishlists(path);
    }

    // Set up event listeners for real-time updates (private mode only)
    if (mode === 'private' && typeof window !== 'undefined') {
      const handleNewWishlist = async (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.wishlist) {
          const newWishlist = customEvent.detail.wishlist;
          setWishlists(prev => [newWishlist, ...prev]);
        }
      };

      const handleUpdatedWishlist = async (event: Event) => {
        const customEvent = event as CustomEvent;
        if (customEvent.detail?.wishlist) {
          const updatedWishlist = customEvent.detail.wishlist;
          const issueNumber = customEvent.detail.issueNumber;
          
          setWishlists(prev => prev.map((w: Wishlist) => 
            w.id === issueNumber ? updatedWishlist : w
          ));
        }
      };

      window.addEventListener('wishlist-created', handleNewWishlist);
      window.addEventListener('wishlist-updated', handleUpdatedWishlist);

      return () => {
        window.removeEventListener('wishlist-created', handleNewWishlist);
        window.removeEventListener('wishlist-updated', handleUpdatedWishlist);
      };
    }
  }, [mode, username]);

  const fetchUserWishlists = async (base: string) => {
    try {
      setLoading(true);
      setError(null);

      const cacheBuster = Date.now();
      const response = await fetch(`${base}api/user-wishlists?username=${username}&_=${cacheBuster}`, {
        cache: 'no-store',
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
        return dateB - dateA;
      });

      setWishlists(sortedWishlists);
    } catch (err) {
      console.error('[useWishlistData] Error:', err);
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

      setWishlists(approvedWishlists);
    } catch (err) {
      console.error('[useWishlistData] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wishlists');
    } finally {
      setLoading(false);
    }
  };

  const refetch = async (path: string) => {
    if (mode === 'private') {
      await fetchUserWishlists(path);
    } else {
      await fetchPublicWishlists(path);
    }
  };

  return {
    wishlists,
    loading,
    error,
    refetch
  };
}
