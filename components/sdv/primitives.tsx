import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline' | 'toolbar'
type Size = 'sm' | 'md' | 'icon' | 'icon-sm'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-[#2a4cb0] border border-primary shadow-xs',
  secondary: 'bg-card text-foreground border border-input hover:bg-muted shadow-xs',
  ghost: 'text-secondary-text hover:bg-muted hover:text-strong border border-transparent',
  danger: 'bg-destructive text-white border border-destructive hover:bg-[#9a1f15]',
  'danger-outline': 'text-destructive border border-[#f3c4bf] bg-card hover:bg-danger-bg',
  toolbar: 'text-secondary-text border border-transparent hover:bg-muted hover:text-strong aria-pressed:bg-selected aria-pressed:text-accent-foreground',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-9 px-3.5 text-sm gap-2',
  icon: 'size-9',
  'icon-sm': 'size-8',
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
})

export const inputClass =
  'h-9 w-full rounded-md border border-input bg-card px-3 text-sm text-strong shadow-xs placeholder:text-[#98a2b3] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-primary/20 disabled:bg-muted disabled:text-muted-foreground'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />
})

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        inputClass,
        'appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%23667085%27 stroke-width=%272%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8',
        className,
      )}
      {...props}
    />
  )
}

export function Divider({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('mx-1 h-5 w-px shrink-0 bg-border', className)} />
}

export function SectionLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn('text-[11px] font-semibold tracking-wide text-muted-foreground uppercase', className)}>{children}</span>
}
