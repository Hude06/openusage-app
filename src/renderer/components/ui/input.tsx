import * as React from 'react'
import { cn } from '../../lib/utils'

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-9 w-full font-mono text-body-sm text-[var(--text-primary)] bg-transparent px-0 py-1 border-b border-[var(--border-visible)] transition-colors placeholder:text-[var(--text-disabled)] focus-visible:outline-none focus-visible:border-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-40',
        className
      )}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
