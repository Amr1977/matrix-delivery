import React from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'secondary';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-matrix-green/10 text-matrix-green border-matrix-green',
  warning: 'bg-yellow-500/10 text-yellow-500 border-yellow-500',
  error: 'bg-red-500/10 text-red-500 border-red-500',
  info: 'bg-matrix-cyan/10 text-matrix-cyan border-matrix-cyan',
  secondary: 'bg-matrix-purple/10 text-matrix-purple border-matrix-purple'
};

export const Badge: React.FC<BadgeProps> = ({
  variant = 'secondary',
  children,
  className = ''
}) => {
  return (
    <span className={`
      inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
      border ${variantStyles[variant]} ${className}
    `}>
      {children}
    </span>
  );
};

export default Badge;
