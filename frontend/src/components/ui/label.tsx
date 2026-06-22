// src/components/ui/label.tsx
import { forwardRef, type LabelHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean
}

const Label = forwardRef<HTMLLabelElement, LabelProps>(
  ({ className, children, required, ...props }, ref) => (
    <label
      ref={ref}
      className={cn('block text-sm font-semibold text-gray-700 mb-1.5', className)}
      {...props}
    >
      {children}
      {required && (
        <span className="ml-1 text-red-500 text-xs" aria-hidden="true">
          *
        </span>
      )}
    </label>
  ),
)
Label.displayName = 'Label'

export { Label }
