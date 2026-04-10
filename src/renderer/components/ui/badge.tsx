import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center font-mono text-[10px] tracking-[0.08em] uppercase transition-colors',
  {
    variants: {
      variant: {
        default: 'text-[var(--text-secondary)] border border-[var(--border-visible)] rounded-pill px-2 py-0.5',
        outline: 'text-[var(--text-disabled)] border border-[var(--border)] rounded-pill px-2 py-0.5',
        success: 'text-[var(--success)] border border-[var(--success)] rounded-pill px-2 py-0.5',
        warning: 'text-[var(--warning)] border border-[var(--warning)] rounded-pill px-2 py-0.5',
        destructive: 'text-[var(--accent)] border border-[var(--accent)] rounded-pill px-2 py-0.5',
        muted: 'text-[var(--text-disabled)] border border-[var(--border)] rounded-pill px-2 py-0.5',
      },
    },
    defaultVariants: { variant: 'default' },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
