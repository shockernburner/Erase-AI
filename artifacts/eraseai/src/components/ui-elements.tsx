import React, { ButtonHTMLAttributes, InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export const Button = React.forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'destructive' | 'outline' | 'ghost', size?: 'sm' | 'md' | 'lg', isLoading?: boolean }>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: "bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)] hover:shadow-[0_0_25px_-5px_rgba(6,182,212,0.6)] border border-primary/50",
      secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border",
      destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-[0_0_20px_-5px_rgba(239,68,68,0.4)] hover:shadow-[0_0_25px_-5px_rgba(239,68,68,0.6)] border border-destructive/50",
      outline: "bg-transparent border-2 border-border hover:border-primary/50 hover:bg-primary/5 text-foreground",
      ghost: "bg-transparent hover:bg-muted text-foreground",
    };
    
    const sizes = {
      sm: "px-3 py-1.5 text-sm",
      md: "px-4 py-2.5",
      lg: "px-6 py-3 text-lg font-medium",
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          "inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-300 ease-out active:scale-[0.98]",
          "disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "flex w-full rounded-xl border border-border bg-input/50 px-4 py-3 text-sm text-foreground shadow-inner transition-colors",
          "placeholder:text-muted-foreground",
          "focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary focus:bg-input",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export const Card = ({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("glass-panel rounded-2xl overflow-hidden flex flex-col", className)} {...props}>
    {children}
  </div>
);

export const Badge = ({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: 'default' | 'success' | 'destructive' | 'warning' }) => {
  const variants = {
    default: "bg-muted text-muted-foreground border-border",
    success: "bg-success/10 text-success border-success/20",
    destructive: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-medium border", variants[variant], className)}>
      {children}
    </span>
  );
}
