import React from 'react';
import { statusColors, urgencyColors } from '../lib/wishlist-constants';

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
  createdAt?: string;
  updatedAt?: string;
  wishlistUrl?: string;
}

interface WishlistCardProps {
  wishlist: Wishlist;
  basePath: string;
  mode: 'public' | 'private'; // public = no edit/delete, private = show edit/delete
  onEdit?: (issueNumber: number) => void;
  onDelete?: (issueNumber: number) => void;
}

export default function WishlistCard({ wishlist, basePath, mode, onEdit, onDelete }: WishlistCardProps) {
  const urgencyColorClass = urgencyColors[wishlist.urgency || ''] || 'bg-gray-100 text-gray-700';
  
  // Normalize field names (handle both API formats)
  const projectName = wishlist.projectName || wishlist.project || '';
  const maintainerUsername = wishlist.maintainerUsername || wishlist.maintainer || '';
  const repositoryUrl = wishlist.repositoryUrl || wishlist.repository || '';
  const servicesList = wishlist.wishes || wishlist.services || [];
  
  // Use local logo to avoid cross-site cookie errors with GitHub images
  const maintainerAvatar = `${basePath}images/oss-wishlist-logo.jpg`;

  // Format services list
  const servicesHtml = servicesList.length > 0
    ? servicesList.slice(0, 3).map((service) => (
        <span key={service} className="inline-block badge-pending px-2 py-1 text-xs rounded">
          {service}
        </span>
      ))
    : [<span key="none" className="text-sm text-gray-500 italic">No services specified</span>];

  const moreServices = servicesList.length > 3
    ? `+${servicesList.length - 3} more`
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
          <a href={`https://github.com/${maintainerUsername}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
            <img
              src={maintainerAvatar}
              alt={maintainerUsername}
              className="w-10 h-10 rounded-full border-2 border-gray-200 hover:border-gray-400 transition-colors"
              loading="lazy"
            />
          </a>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{projectName}</h3>
            <a href={`https://github.com/${maintainerUsername}`} target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 hover:text-gray-900">
              @{maintainerUsername}
            </a>
          </div>
        </div>
        <div className="flex flex-col items-end space-y-1">
          {/* Show approval status for private mode only */}
          {mode === 'private' && (
            <span className="badge-pending px-2 py-1 text-xs rounded-full font-semibold">
              {wishlist.approvalStatus === 'pending' ? 'Pending' : 'Approved'}
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
        {repositoryUrl && (
          <a href={repositoryUrl} target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 underline">
            View repository
          </a>
        )}
      </div>

      {/* Actions - Different for public vs private mode */}
      {mode === 'public' ? (
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <a 
              href={wishlist.wishlistUrl || `${normalizedBasePath}wishlist/${wishlist.id}`}
              className="bg-gray-900 text-white px-4 py-2 rounded text-sm hover:bg-gray-800 transition-colors"
            >
              View details
            </a>
            <a 
              href={`${normalizedBasePath}fulfill?issue=${wishlist.id}`}
              className="btn-sparkle"
            >
              <svg className="btn-sparkle-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span className="btn-sparkle-text">Fulfill wish</span>
              <span className="btn-sparkle-particles">
                <span className="sparkle-particle" style={{top: '50%', left: '25%', backgroundColor: 'rgb(196, 181, 253)'}}></span>
                <span className="sparkle-particle" style={{top: '25%', right: '33%', backgroundColor: 'rgb(167, 139, 250)', animationDelay: '0.1s'}}></span>
                <span className="sparkle-particle" style={{bottom: '33%', right: '25%', backgroundColor: 'rgb(217, 213, 254)', animationDelay: '0.2s'}}></span>
              </span>
            </a>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <a
            href={`${basePath}wishlist/${wishlist.id}`}
            className="btn-primary inline-flex items-center text-sm px-4 py-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path>
            </svg>
            View
          </a>
          <button
            onClick={() => onEdit?.(wishlist.id)}
            className="btn-secondary inline-flex items-center text-sm px-4 py-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Edit
          </button>
          <button
            onClick={() => onDelete?.(wishlist.id)}
            className="btn-secondary inline-flex items-center text-sm px-4 py-2"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
            </svg>
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
