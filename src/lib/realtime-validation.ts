/**
 * Real-time Form Validation Utilities
 * 
 * Provides client-side validation with visual feedback
 * Shows green checkmarks for valid fields and red X for invalid
 */

export interface ValidationResult {
  isValid: boolean;
  error?: string;
  severity?: 'error' | 'warning';
}

/**
 * Validate email format in real-time
 */
export const validateEmail = (email: string): ValidationResult => {
  if (!email) {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

/**
 * Validate field length
 */
export const validateLength = (
  value: string,
  minLength: number = 0,
  maxLength: number = Infinity,
  fieldName: string = 'Field'
): ValidationResult => {
  const trimmed = value.trim();
  
  if (minLength > 0 && trimmed.length < minLength) {
    return {
      isValid: false,
      error: `${fieldName} must be at least ${minLength} characters`,
      severity: 'error'
    };
  }
  
  if (maxLength < Infinity && trimmed.length > maxLength) {
    return {
      isValid: false,
      error: `${fieldName} must be no more than ${maxLength} characters`,
      severity: 'warning'
    };
  }
  
  // Show warning when approaching limit
  if (maxLength < Infinity && trimmed.length > maxLength * 0.9) {
    return {
      isValid: true,
      error: `${Math.round((maxLength - trimmed.length) / maxLength * 100)}% space remaining`,
      severity: 'warning'
    };
  }
  
  return { isValid: true };
};

/**
 * Validate URL format
 */
export const validateUrl = (url: string, fieldName: string = 'URL'): ValidationResult => {
  if (!url) {
    return { isValid: true }; // Optional field
  }
  
  try {
    const urlObj = new URL(url);
    
    // Reject javascript:, data:, and vbscript: protocols
    if (
      urlObj.protocol === 'javascript:' ||
      urlObj.protocol === 'data:' ||
      urlObj.protocol === 'vbscript:'
    ) {
      return {
        isValid: false,
        error: 'Invalid protocol in URL',
        severity: 'error'
      };
    }
    
    // Require https for external URLs
    if (!url.startsWith('https://') && url.includes('://')) {
      return {
        isValid: false,
        error: 'Please use https:// URLs for security',
        severity: 'warning'
      };
    }
    
    return { isValid: true };
  } catch {
    return {
      isValid: false,
      error: `Invalid ${fieldName} format`,
      severity: 'error'
    };
  }
};

/**
 * Validate GitHub URL specifically
 */
export const validateGitHubUrl = (url: string): ValidationResult => {
  if (!url) {
    return { isValid: true }; // Optional
  }
  
  const urlValidation = validateUrl(url, 'GitHub URL');
  if (!urlValidation.isValid) {
    return urlValidation;
  }
  
  if (!url.includes('github.com')) {
    return {
      isValid: false,
      error: 'Please enter a GitHub URL',
      severity: 'error'
    };
  }
  
  return { isValid: true };
};

/**
 * Validate required field
 */
export const validateRequired = (value: string | undefined | null, fieldName: string = 'Field'): ValidationResult => {
  if (!value || !value.toString().trim()) {
    return {
      isValid: false,
      error: `${fieldName} is required`,
      severity: 'error'
    };
  }
  
  return { isValid: true };
};

/**
 * Validate number is positive
 */
export const validatePositiveNumber = (value: string | number, fieldName: string = 'Value'): ValidationResult => {
  const num = typeof value === 'string' ? parseInt(value, 10) : value;
  
  if (Number.isNaN(num)) {
    return {
      isValid: false,
      error: `${fieldName} must be a number`,
      severity: 'error'
    };
  }
  
  if (num < 0) {
    return {
      isValid: false,
      error: `${fieldName} must be positive`,
      severity: 'error'
    };
  }
  
  return { isValid: true };
};

/**
 * Check for profanity (basic check - server should do full check)
 */
export const checkProfanity = (text: string): ValidationResult => {
  // Common profanity filter (very basic, server has the real one)
  const profanityPatterns = [
    /\b(damn|hell)\b/gi,
    // Add more patterns as needed
  ];
  
  for (const pattern of profanityPatterns) {
    if (pattern.test(text)) {
      return {
        isValid: false,
        error: 'Text contains inappropriate language',
        severity: 'warning'
      };
    }
  }
  
  return { isValid: true };
};

/**
 * Validate no XSS patterns (basic check)
 */
export const validateNoXss = (text: string): ValidationResult => {
  const xssPatterns = [
    /<script/i,
    /javascript:/i,
    /on(load|error|click|submit|change)/i,
    /<svg/i,
  ];
  
  for (const pattern of xssPatterns) {
    if (pattern.test(text)) {
      return {
        isValid: false,
        error: 'Text contains potentially dangerous content',
        severity: 'error'
      };
    }
  }
  
  return { isValid: true };
};

/**
 * Validate email select (at least one expertise area)
 */
export const validateArrayNotEmpty = (arr: string[] | undefined, fieldName: string = 'Selection'): ValidationResult => {
  if (!arr || arr.length === 0) {
    return {
      isValid: false,
      error: `Please select at least one ${fieldName}`,
      severity: 'error'
    };
  }
  
  return { isValid: true };
};

/**
 * Validate array size limits
 */
export const validateArraySize = (
  arr: string[] | undefined,
  minSize: number = 0,
  maxSize: number = Infinity,
  fieldName: string = 'Items'
): ValidationResult => {
  if (!arr) arr = [];
  
  if (arr.length < minSize) {
    return {
      isValid: false,
      error: `Select at least ${minSize} ${fieldName}`,
      severity: 'error'
    };
  }
  
  if (arr.length > maxSize) {
    return {
      isValid: false,
      error: `Select no more than ${maxSize} ${fieldName}`,
      severity: 'error'
    };
  }
  
  return { isValid: true };
};
