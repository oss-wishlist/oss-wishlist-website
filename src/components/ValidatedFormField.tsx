import React from 'react';
import type { ValidationResult } from '../lib/realtime-validation';

interface ValidatedFieldProps {
  label: string;
  value: string;
  isValid: boolean;
  validationResult?: ValidationResult;
  onValidation?: (isValid: boolean) => void;
  showHelp?: boolean;
  helpText?: string;
}

/**
 * Reusable component that shows validation feedback
 * Displays green checkmark for valid, red X for invalid
 * Shows validation message
 */
export const ValidationFeedback: React.FC<ValidatedFieldProps> = ({
  label,
  value,
  isValid,
  validationResult,
  onValidation,
  showHelp = false,
  helpText,
}) => {
  React.useEffect(() => {
    onValidation?.(isValid);
  }, [isValid, onValidation]);

  if (!value && !validationResult) {
    return null; // Don't show anything for empty optional fields
  }

  const message = validationResult?.error;
  const severity = validationResult?.severity || 'error';

  return (
    <div className="flex items-center gap-2 mt-1">
      {isValid ? (
        <>
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
          <span className="text-xs text-green-600 font-medium">Valid</span>
        </>
      ) : (
        <>
          <svg className="w-4 h-4 text-red-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
          <span className={`text-xs font-medium ${severity === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
            {message || `${label} is invalid`}
          </span>
        </>
      )}

      {showHelp && helpText && (
        <span className="text-xs text-gray-500 ml-auto">{helpText}</span>
      )}
    </div>
  );
};

/**
 * Visual input wrapper with real-time validation
 */
export const ValidatedInput: React.FC<
  React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    validationResult?: ValidationResult;
    showValidation?: boolean;
    helpText?: string;
  }
> = ({ label, validationResult, showValidation = true, helpText, value, ...props }) => {
  const isValid = validationResult?.isValid ?? true;
  const severity = validationResult?.severity || 'error';

  return (
    <div className="space-y-1">
      <input
        {...props}
        value={value}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
          showValidation && validationResult
            ? isValid
              ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
              : severity === 'warning'
              ? 'border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500'
              : 'border-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-gray-500 focus:border-gray-500'
        }`}
      />
      {showValidation && validationResult && (
        <ValidationFeedback
          label={label}
          value={value as string}
          isValid={isValid}
          validationResult={validationResult}
          helpText={helpText}
        />
      )}
    </div>
  );
};

/**
 * Visual textarea wrapper with real-time validation and character count
 */
export const ValidatedTextarea: React.FC<
  React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label: string;
    validationResult?: ValidationResult;
    showValidation?: boolean;
    showCharCount?: boolean;
    maxChars?: number;
  }
> = ({ label, validationResult, showValidation = true, showCharCount = false, maxChars, value, ...props }) => {
  const isValid = validationResult?.isValid ?? true;
  const severity = validationResult?.severity || 'error';
  const charCount = (value as string)?.length || 0;
  const percentFull = maxChars ? Math.round((charCount / maxChars) * 100) : 0;

  return (
    <div className="space-y-1">
      <textarea
        {...props}
        value={value}
        className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors resize-vertical ${
          showValidation && validationResult
            ? isValid
              ? 'border-green-300 focus:ring-green-500 focus:border-green-500'
              : severity === 'warning'
              ? 'border-yellow-300 focus:ring-yellow-500 focus:border-yellow-500'
              : 'border-red-300 focus:ring-red-500 focus:border-red-500'
            : 'border-gray-300 focus:ring-gray-500 focus:border-gray-500'
        }`}
      />
      <div className="flex items-center justify-between">
        {showCharCount && maxChars && (
          <span className={`text-xs ${percentFull > 90 ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
            {charCount}/{maxChars} characters
            {percentFull > 90 && ` (${100 - percentFull}% remaining)`}
          </span>
        )}
        {showValidation && validationResult && (
          <ValidationFeedback
            label={label}
            value={value as string}
            isValid={isValid}
            validationResult={validationResult}
          />
        )}
      </div>
    </div>
  );
};
