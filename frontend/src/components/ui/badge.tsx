// src/components/ui/badge.tsx
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold select-none',
  {
    variants: {
      variant: {
        // Asset / generic status
        available:  'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
        loaned:     'bg-blue-50   text-blue-700   ring-1 ring-inset ring-blue-200',
        maintenance:'bg-amber-50  text-amber-700  ring-1 ring-inset ring-amber-200',
        damaged:    'bg-red-50    text-red-600    ring-1 ring-inset ring-red-200',
        'written-off':'bg-gray-100 text-gray-500 ring-1 ring-inset ring-gray-200',

        // Vehicle status
        active:   'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
        inactive: 'bg-gray-100   text-gray-500   ring-1 ring-inset ring-gray-200',

        // Alert urgency
        ok:       'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
        medium:   'bg-amber-50   text-amber-700   ring-1 ring-inset ring-amber-200',
        high:     'bg-orange-50  text-orange-700  ring-1 ring-inset ring-orange-200',
        critical: 'bg-red-50     text-red-700     ring-1 ring-inset ring-red-200',

        // Generic
        default:  'bg-gray-100   text-gray-700   ring-1 ring-inset ring-gray-200',
        brand:    'bg-brand-primary/10 text-brand-primary ring-1 ring-inset ring-brand-primary/20',
        accent:   'bg-brand-accent/10  text-brand-accent  ring-1 ring-inset ring-brand-accent/20',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full', {
            'bg-emerald-500': variant === 'available' || variant === 'active' || variant === 'ok',
            'bg-blue-500':    variant === 'loaned',
            'bg-amber-500':   variant === 'maintenance' || variant === 'medium',
            'bg-orange-500':  variant === 'high',
            'bg-red-500':     variant === 'damaged' || variant === 'critical',
            'bg-gray-400':    variant === 'inactive' || variant === 'written-off',
          })}
        />
      )}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }

// ── Helpers para mapear enums do backend para variantes do Badge ──────────────

export type AssetStatusVariant = VariantProps<typeof badgeVariants>['variant']

export const ASSET_STATUS_BADGE: Record<
  string,
  { variant: AssetStatusVariant; label: string }
> = {
  AVAILABLE:   { variant: 'available',   label: 'Disponível' },
  LOANED:      { variant: 'loaned',      label: 'Emprestado' },
  MAINTENANCE: { variant: 'maintenance', label: 'Manutenção' },
  DAMAGED:     { variant: 'damaged',     label: 'Danificado' },
  WRITTEN_OFF: { variant: 'written-off', label: 'Baixado' },
}

export const VEHICLE_STATUS_BADGE: Record<
  string,
  { variant: AssetStatusVariant; label: string }
> = {
  ACTIVE:      { variant: 'active',      label: 'Ativo' },
  MAINTENANCE: { variant: 'maintenance', label: 'Manutenção' },
  INACTIVE:    { variant: 'inactive',    label: 'Inativo' },
}
