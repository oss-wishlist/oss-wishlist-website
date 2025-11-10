import React, { useState, useEffect } from 'react';
import type { User } from '../lib/auth';

interface Props {
  user: User | null;
}

interface Wishlist {
  id: number;
  project: string;
  maintainer: string;
  repository: string;
  urgency?: string;
  projectSize?: string;
  services?: string[];
  technologies?: string[];
  additionalNotes?: string;
  approvalStatus?: 'approved' | 'pending';
  createdAt?: string;
  updatedAt?: string;
}

const statusColors: Record<string, string> = {
  'Open': 'bg-gray-100 text-gray-800',
  'In Progress': 'bg-gray-200 text-gray-900',
  'Review': 'bg-gray-300 text-gray-900',
  'Funded': 'bg-gray-400 text-white',
  'Completed': 'bg-gray-700 text-white',
  'On Hold': 'bg-gray-500 text-white',
};

const urgencyColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-gray-200 text-gray-800',
  high: 'bg-gray-600 text-white',
  critical: 'bg-gray-800 text-white'
};

export default function YourWishlistsGrid({ user }: Props) {
  const [wishlists, setWishlists] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [basePath, setBasePath] = useState('');
  const [isEditMode, setIsEditMode] = useState(() => {
    // Initialize from sessionStorage - only true if BOTH flags are set
    if (typeof window !== 'undefined') {
      const hasIssueNumber = !!sessionStorage.getItem('wishlist_edit_issue_number');
      const wasNavigatedToEdit = !!sessionStorage.getItem('wishlist_navigated_to_edit');
      const isInCreateMode = !!sessionStorage.getItem('wishlist_in_create_mode');
      return (hasIssueNumber && wasNavigatedToEdit) || isInCreateMode;
    }
    return false;
  });

  useEffect(() => {
    // Get base path
    const base = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');
    setBasePath(base);

    // Only fetch wishlists if NOT in edit mode
    if (!isEditMode) {
      fetchUserWishlists(base);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserWishlists = async (base: string) => {
    try {
      setLoading(true);
      setError(null);

      // Use the new user-wishlists endpoint that returns both approved and pending
      const response = await fetch(`${base}/api/user-wishlists?username=${user?.username}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch wishlists: ${response.status}`);
      }

      const data = await response.json();
      const allWishlists = Array.isArray(data.wishlists) ? data.wishlists : data;

      // For user's own dashboard, show both approved AND pending wishlists
      setWishlists(allWishlists);
    } catch (err) {
      console.error('[YourWishlistsGrid] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load wishlists');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (issueNumber: number) => {
    // Store the issue number in sessionStorage so the form can load it
    sessionStorage.setItem('wishlist_edit_issue_number', issueNumber.toString());
    // Set flag to indicate we're navigating to edit mode (persists only through one reload)
    sessionStorage.setItem('wishlist_navigated_to_edit', 'true');
    // Navigate to maintainers page
    window.location.href = `${basePath}/maintainers`;
  };

  const handleDelete = async (issueNumber: number) => {
    const confirmed = confirm('Are you sure you want to delete this wishlist? This will mark it as no longer needing help.');
    if (!confirmed) return;

    try {
      setLoading(true);
      const response = await fetch(`${basePath}/api/close-wishlist`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ issueNumber })
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Failed to delete wishlist');
      }

      // Refresh the list
      await fetchUserWishlists(basePath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete wishlist');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="col-span-full text-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-600 mx-auto mb-3"></div>
        <p className="text-sm text-gray-600">Loading your wishlists...</p>
      </div>
    );
  }

  // If in edit mode, show back link instead of cards - CHECK THIS FIRST before empty state!
  if (isEditMode) {
    return (
      <button
        onClick={() => {
          sessionStorage.removeItem('wishlist_edit_issue_number');
          sessionStorage.removeItem('wishlist_navigated_to_edit');
          sessionStorage.removeItem('wishlist_in_create_mode');
          window.location.reload();
        }}
        className="text-sm text-gray-600 hover:text-gray-900 underline"
      >
        ← Back to Your Wishlists
      </button>
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
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5.291A7.962 7.962 0 0112 20a7.962 7.962 0 01-5-1.709M15 17a2 2 0 11-4 0 2 2 0 014 0z"></path>
        </svg>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No wishlists yet</h3>
        <p className="text-gray-600">Create your first wishlist below</p>
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
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      ))}
    </>
  );
}

function WishlistCard({
  wishlist,
  basePath,
  onEdit,
  onDelete,
}: {
  wishlist: Wishlist;
  basePath: string;
  onEdit: (issueNumber: number) => void;
  onDelete: (issueNumber: number) => void;
}) {
  const urgencyColorClass = urgencyColors[wishlist.urgency || ''] || 'bg-gray-100 text-gray-700';
  const maintainerAvatar = `https://github.com/${wishlist.maintainer}.png`;

  // Format services list
  const servicesHtml = wishlist.services && wishlist.services.length > 0
    ? wishlist.services.slice(0, 3).map((service) => (
        <span key={service} className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
          {service}
        </span>
      ))
    : [<span key="none" className="text-sm text-gray-500 italic">No services specified</span>];

  const moreServices = wishlist.services && wishlist.services.length > 3
    ? `+${wishlist.services.length - 3} more`
    : '';

  // Truncate project notes
  const projectNotes = wishlist.additionalNotes
    ? wishlist.additionalNotes.length > 100
      ? wishlist.additionalNotes.substring(0, 100) + '...'
      : wishlist.additionalNotes
    : '';

  return (
    <div className="wishlist-card bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow p-6">
      {/* Project Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3 flex-1">
          <a href={`https://github.com/${wishlist.maintainer}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
            <img
              src={maintainerAvatar}
              alt={wishlist.maintainer}
              className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-colors"
              loading="lazy"
            />
          </a>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{wishlist.project}</h3>
            <a href={`https://github.com/${wishlist.maintainer}`} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-gray-900">
              @{wishlist.maintainer}
            </a>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          {/* Approval Status Badge */}
          <span className={`px-2 py-1 text-xs rounded-full font-semibold ${
            wishlist.approvalStatus === 'pending'
              ? 'bg-gray-300 text-gray-900'
              : 'bg-gray-700 text-white'
          }`}>
            {wishlist.approvalStatus === 'pending' ? 'Pending' : 'Approved'}
          </span>
          {wishlist.urgency && wishlist.urgency !== 'medium' && (
            <span className={`px-2 py-1 text-xs rounded-full ${urgencyColorClass}`}>
              {wishlist.urgency}
            </span>
          )}
        </div>
      </div>

      {/* Project Details */}
      {projectNotes && (
        <div className="mb-4">
          <p className="text-sm text-gray-600">{projectNotes}</p>
        </div>
      )}

      {/* Services Needed */}
      <div className="mb-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">Services Needed:</h4>
        <div className="flex flex-wrap gap-2 items-center">
          {servicesHtml}
          {moreServices && <span className="text-xs text-gray-600">{moreServices}</span>}
        </div>
      </div>

      {/* Project Metadata */}
      <div className="flex items-center gap-4 text-xs text-gray-500 mb-4 pb-4 border-b">
        {wishlist.projectSize && <span className="capitalize">{wishlist.projectSize} project</span>}
        {wishlist.repository && (
          <a href={wishlist.repository} target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 underline">
            View repository
          </a>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <a
          href={`${basePath}/wishlist/${wishlist.id}`}
          className="btn-primary inline-flex items-center text-sm px-4 py-2"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
          </svg>
          View
        </a>
        <button
          onClick={() => onEdit(wishlist.id)}
          className="btn-secondary inline-flex items-center text-sm px-4 py-2"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
          </svg>
          Edit
        </button>
        <button
          onClick={() => onDelete(wishlist.id)}
          className="btn-secondary inline-flex items-center text-sm px-4 py-2"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
          Delete
        </button>
      </div>
    </div>
  );
}
