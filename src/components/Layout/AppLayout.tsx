import { useEffect, type ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useStore } from '../../store/useStore'
import { useAuthStore } from '../../store/useAuthStore'

interface AppLayoutProps {
  children: ReactNode
  title: string
  subtitle?: string
}

export function AppLayout({ children, title, subtitle }: AppLayoutProps) {
  const { loadData, isDataLoaded } = useStore()
  const { isAuthenticated } = useAuthStore()

  useEffect(() => {
    if (isAuthenticated && !isDataLoaded) {
      loadData()
    }
  }, [isAuthenticated, isDataLoaded, loadData])

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header title={title} subtitle={subtitle} />
        <main className="flex-1 overflow-y-auto">
          <div className="p-6 max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
