/**
 * Shared constants for wishlist display
 */

export const statusColors: Record<string, string> = {
  'Open': 'bg-gray-100 text-gray-800',
  'In Progress': 'bg-gray-200 text-gray-900',
  'Review': 'bg-gray-300 text-gray-900',
  'Funded': 'bg-gray-400 text-white',
  'Completed': 'bg-gray-700 text-white',
  'On Hold': 'bg-gray-500 text-white',
};

export const urgencyColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-gray-200 text-gray-800',
  high: 'bg-gray-600 text-white',
  critical: 'bg-gray-800 text-white'
};
