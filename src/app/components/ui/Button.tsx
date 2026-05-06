import * as React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'text';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', children, className, ...props }, ref) => {
    const baseStyles = "font-['Quicksand',sans-serif] font-semibold transition-all";
    
    const variantStyles = {
      primary: "bg-[#4D989B] text-white rounded-full shadow-[0px_4px_10px_0px_rgba(0,0,0,0.05),inset_0px_1px_1px_0px_rgba(255,255,255,0.8)] hover:bg-[#3d7a7d] active:scale-95",
      secondary: "bg-white text-[#2B2A28] rounded-full border border-[#E9E4DF] shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)] hover:bg-[#F8F6F4] active:scale-95",
      text: "text-[#4D989B] font-bold text-xs uppercase tracking-[0.3px] hover:opacity-70"
    };
    
    const sizeStyles = {
      sm: "px-4 py-2 text-xs",
      md: "px-4 py-3 text-sm",
      lg: "px-6 py-4 text-base"
    };

    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: variant === 'text' ? 1 : 0.97 }}
        className={clsx(
          baseStyles,
          variantStyles[variant],
          variant !== 'text' && sizeStyles[size],
          className
        )}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
