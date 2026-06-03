import { clsx } from 'clsx'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  children: ReactNode
}

const variants = {
  primary:   'bg-af-green text-white hover:bg-af-green-light shadow-sm',
  secondary: 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50',
  ghost:     'text-gray-600 hover:bg-gray-100',
  danger:    'bg-red-600 text-white hover:bg-red-700',
}
const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-2.5 text-sm gap-2',
}

export function Button({ variant = 'primary', size = 'md', icon, children, className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50',
        variants[variant], sizes[size], className
      )}
      {...props}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </button>
  )
}
