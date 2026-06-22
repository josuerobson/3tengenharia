// src/components/ui/textarea.tsx
import { forwardRef, type TextareaHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => (
    <div className="w-full">
      <textarea
        ref={ref}
        className={cn(
          'flex min-h-[96px] w-full rounded-xl border bg-white px-4 py-3',
          'text-sm text-gray-900 placeholder:text-gray-400 leading-relaxed',
          'border-gray-200 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20',
          'outline-none transition-all duration-150 resize-y',
          error && 'border-red-400 focus:border-red-500 focus:ring-red-200',
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
Textarea.displayName = 'Textarea'

export { Textarea }
