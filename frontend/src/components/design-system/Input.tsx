import React, { forwardRef } from 'react';
import { LucideIcon } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
  label,
  icon: Icon,
  error,
  className = '',
  ...props
}, ref) => {
  const inputClasses = `
    w-full bg-matrix-bg border border-matrix-border rounded-lg px-4 py-3 text-matrix-primary
    placeholder-matrix-muted focus:border-matrix-green focus:outline-none transition-colors
    ${error ? 'border-red-500 focus:border-red-500' : ''}
    ${className}
  `;

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-white text-sm font-semibold block">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
            <Icon className="w-5 h-5 text-matrix-green" />
          </div>
        )}
        <input
          ref={ref}
          className={`${inputClasses} ${Icon ? 'pl-10' : ''}`}
          {...props}
        />
      </div>
      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
