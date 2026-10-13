import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-outline' | 'toolbar'
type Size = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm'

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-primary text-primary-foreground hover:bg-primary-hover shadow-[0_1px_2px_rgb(13_21_38/0.12),inset_0_1px_0_rgb(255_255_255/0.12)]',
  secondary: 'bg-card text-strong ring-1 ring-input ring-inset hover:bg-muted',
  ghost: 'text-secondary-text hover:bg-muted hover:text-strong',
  danger: 'bg-destructive text-white hover:bg-[#9a1f15]',
  'danger-outline': 'text-destructive ring-1 ring-[#f1c3be] ring-inset bg-card hover:bg-danger-bg',
  toolbar: 'text-secondary-text hover:bg-muted hover:text-strong aria-pressed:bg-selected aria-pressed:text-accent-foreground',
}

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-2.5 text-[13px] gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-11 px-5 text-sm gap-2',
  icon: 'size-10',
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
        'inline-flex shrink-0 items-center justify-center rounded-md font-medium whitespace-nowrap transition-colors disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    />
  )
})

export const inputClass =
  'h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-strong placeholder:text-[#9aa3b2] transition-[border-color,box-shadow] hover:border-[#b9c2ce] focus-visible:border-primary focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:bg-muted disabled:text-muted-foreground'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input({ className, ...props }, ref) {
  return <input ref={ref} className={cn(inputClass, className)} {...props} />
})

const CHEVRON =
  'appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 fill=%27none%27 stroke=%27%23687387%27 stroke-width=%272%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27m6 9 6 6 6-6%27/%3E%3C/svg%3E")] bg-[length:16px] bg-[right_0.6rem_center] bg-no-repeat pr-8'

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={cn(inputClass, CHEVRON, className)} {...props} />
}

export function Divider({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn('mx-1 h-5 w-px shrink-0 bg-border', className)} />
}

export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase', className)}>{children}</span>
}

/** Shared page header: title block on the left, workspace context / actions on the right. */
export function PageHeader({ eyebrow, title, description, aside, children }: { eyebrow?: string; title: ReactNode; description?: ReactNode; aside?: ReactNode; children?: ReactNode }) {
  return (
    <div className="border-b border-border bg-card">
      <div className="mx-auto flex w-full max-w-[90rem] flex-col gap-4 px-4 py-5 md:flex-row md:items-end md:justify-between md:px-8 md:py-6">
        <div className="min-w-0">
          {eyebrow && <SectionLabel className="mb-1.5 block text-primary">{eyebrow}</SectionLabel>}
          <h1 className="text-xl font-semibold tracking-tight text-balance text-strong md:text-[22px]">{title}</h1>
          {description && <p className="mt-1 max-w-xl text-sm leading-relaxed text-pretty text-secondary-text">{description}</p>}
          {children}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </div>
    </div>
  )
}

export function Chip({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full bg-muted px-2.5 text-[12.5px] text-secondary-text ring-1 ring-border ring-inset', className)}>
      {label}
      <span className="font-semibold text-strong tabular-nums">{value}</span>
    </span>
  )
}
