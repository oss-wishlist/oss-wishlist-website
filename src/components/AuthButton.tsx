import React from 'react';
import type { User } from '../lib/auth';
import { getBasePath } from '../lib/paths';

interface AuthButtonProps {
  user?: User | null;
}

/**
 * Simple auth button for header - receives user from server (no async loading!)
 * Uses plain links for login/logout (no onClick handlers)
 */
export default function AuthButton({ user }: AuthButtonProps) {
  const basePath = getBasePath();
  if (user) {
    return (
      <a
  href={`${basePath}/api/auth/logout`}
        className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 102 0V4a1 1 0 00-1-1zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
        </svg>
        <span>Logout</span>
      </a>
    );
  }

  return (
    <a
  href={`${basePath}/login`}
      className="bg-gray-700 text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors flex items-center space-x-2"
    >
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V3zm10.293 9.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L14.586 9H7a1 1 0 100 2h7.586l-1.293 1.293z" clipRule="evenodd" />
      </svg>
      <span>Login</span>
    </a>
  );
}
