'use client';

import { forwardRef, type InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-ft-body">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-3 py-2 text-sm border rounded-lg
            bg-white text-ft-ink placeholder:text-ft-muted
            focus:outline-none focus:ring-2 focus:ring-ft-navy/20 focus:border-ft-navy
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-ft-red' : 'border-ft-border'}
            ${className}
          `.trim()}
          {...props}
        />
        {error && <p className="text-xs text-ft-red">{error}</p>}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
