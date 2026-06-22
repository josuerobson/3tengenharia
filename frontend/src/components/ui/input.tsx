// src/components/ui/input.tsx
import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, type = 'text', ...props }, ref) => (
    <div className="relative w-full">
      {icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </div>
      )}
      <input
        ref={ref}
        type={type}
        className={cn(
          // Base
          'flex h-12 w-full rounded-xl border bg-white px-4 py-3',
          'text-sm text-gray-900 placeholder:text-gray-400',
          // Border & focus
          'border-gray-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
          'outline-none transition-all duration-150',
          // Error state
          error && 'border-red-400 focus:border-red-500 focus:ring-red-200',
          // Icon padding
          icon && 'pl-10',
          className,
        )}
        {...props}
      />
      {error && (
        <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
          <span className="font-semibold">⚠</span> {error}
        </p>
      )}
    </div>
  ),
)
Input.displayName = 'Input'

export { Input }
