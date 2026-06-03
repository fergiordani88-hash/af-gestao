import { clsx } from 'clsx'
import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function Card({ children, className, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'bg-white rounded-2xl border border-gray-100 shadow-sm',
        onClick && 'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
    >
      {children}
    </div>
  )
}

interface StatCardProps {
  label: string
  value: string
  sub?: string
  icon: ReactNode
  color?: 'green' | 'gold' | 'blue' | 'red' | 'purple'
  trend?: { value: string; up: boolean }
}

const colorMap = {
  green:  'bg-af-green-pale text-af-green',
  gold:   'bg-af-gold-pale text-af-gold',
  blue:   'bg-blue-50 text-blue-600',
  red:    'bg-red-50 text-red-600',
  purple: 'bg-purple-50 text-purple-600',
}

export function StatCard({ label, value, sub, icon, color = 'green', trend }: StatCardProps) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
          {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
          {trend && (
            <p className={clsx('mt-1 text-xs font-medium', trend.up ? 'text-emerald-600' : 'text-red-500')}>
              {trend.up ? '▲' : '▼'} {trend.value}
            </p>
          )}
        </div>
        <span className={clsx('p-2.5 rounded-xl', colorMap[color])}>{icon}</span>
      </div>
    </Card>
  )
}
