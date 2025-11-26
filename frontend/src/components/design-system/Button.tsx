import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: LucideIcon;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  children,
  className = '',
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-matrix-green focus:ring-offset-2 focus:ring-offset-matrix-bg';

  const variantClasses = {
    primary: 'bg-gradient-to-r from-matrix-green to-matrix-cyan text-matrix-bg hover:shadow-lg hover:shadow-matrix-green/50',
    secondary: 'bg-matrix-purple text-white hover:shadow-lg hover:shadow-matrix-purple/50',
    outline: 'bg-transparent text-white border border-matrix-green hover:bg-matrix-green/10',
    ghost: 'bg-transparent text-matrix-secondary hover:text-white hover:bg-matrix-surface'
  };

  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  return (
    <button className={classes} {...props}>
      {Icon && <Icon className="w-5 h-5 mr-2" />}
      {children}
    </button>
  );
};

export default Button;
