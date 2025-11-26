import React from 'react';
import { LucideIcon } from 'lucide-react';

interface CardProps {
  title?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  gradient?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  icon: Icon,
  children,
  className = '',
  hover = true,
  gradient = false
}) => {
  const baseClasses = 'bg-matrix-surface border border-matrix-border rounded-xl p-6';
  const hoverClasses = hover ? 'hover:border-matrix-green transition-all duration-300' : '';
  const gradientClasses = gradient ? 'bg-gradient-to-br from-matrix-elevated to-matrix-surface' : '';

  return (
    <div className={`${baseClasses} ${hoverClasses} ${gradientClasses} ${className}`}>
      {(title || Icon) && (
        <div className="flex items-center gap-3 mb-4">
          {Icon && (
            <div className="p-2 bg-matrix-green/10 rounded-lg">
              <Icon className="w-6 h-6 text-matrix-green" />
            </div>
          )}
          {title && (
            <div>
              <h3 className="text-white font-semibold">{title}</h3>
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;
