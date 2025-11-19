import React, { useState } from 'react';
import WishlistCard from './WishlistCard';
import type { User } from '../lib/auth';
import { useWishlistData } from '../hooks/useWishlistData';

interface Props {
  user?: User | null;
  mode: 'public' | 'private'; // public = approved only, no edit/delete; private = all user's wishlists with edit/delete
}

export default function WishlistsGrid({ user, mode }: Props) {
  const [basePath, setBasePath] = useState('');
  
  // Use shared hook for data fetching and event handling
  const { wishlists, loading, error } = useWishlistData({
    mode,
    username: user?.username
  });

  // Set base path on mount
  React.useEffect(() => {
    const base = import.meta.env.BASE_URL || '/';
    const path = base.endsWith('/') ? base : `${base}/`;
    setBasePath(path);
  }, []);

  const handleEdit = (issueNumber: number) => {
    window.location.href = `${basePath}edit-wishlist?edit=${issueNumber}`;
  };

  const handleDelete = async (issueNumber: number) => {
    const confirmed = confirm('Are you sure you want to delete this wishlist? This will mark it as no longer needing help.');
    if (!confirmed) return;

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

      // Reload the page to reflect changes
      window.location.reload();
    } catch (err) {
      console.error('[WishlistsGrid] Delete error:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete wishlist');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-gray-900"></div>
        <p className="mt-4 text-gray-600">Loading wishlists...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 mb-4">Error: {error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800"
        >
          Retry
        </button>
      </div>
    );
  }

  if (wishlists.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">
          {mode === 'private' ? 'No wishlists found. Create your first wishlist!' : 'No approved wishlists yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
    </div>
  );
}
