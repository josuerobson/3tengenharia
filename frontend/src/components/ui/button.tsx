// src/components/ui/button.tsx
import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 font-semibold rounded-xl',
    'transition-all duration-150 active:scale-[0.97]',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-40 select-none',
  ].join(' '),
  {
    variants: {
      variant: {
        default:
          'bg-brand-primary text-white hover:bg-brand-primary-hover active:bg-brand-primary-dark shadow-sm',
        accent:
          'bg-brand-accent text-white hover:bg-brand-accent-dark active:bg-brand-accent-dark shadow-sm',
        outline:
          'border-2 border-brand-primary text-brand-primary bg-transparent hover:bg-brand-primary hover:text-white',
        ghost:
          'text-gray-600 bg-transparent hover:bg-gray-100 hover:text-gray-900',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm',
        subtle:
          'bg-brand-primary/10 text-brand-primary hover:bg-brand-primary/20',
      },
      size: {
        sm: 'h-9 px-4 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-14 px-6 text-base', // Touch-friendly (56px)
        xl: 'h-16 px-8 text-lg',   // Very large primary actions
        icon: 'h-10 w-10 p-0',
        'icon-sm': 'h-8 w-8 p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  },
)

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
)
Button.displayName = 'Button'

export { Button, buttonVariants }
