import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './sidebar'
import { Header } from './header'

const SIDEBAR_COLLAPSED_KEY = 'sidebar-collapsed'

export function MainLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Get initial state from localStorage
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
    return saved ? JSON.parse(saved) : false
  })

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen)
  }

  const closeSidebar = () => {
    setIsSidebarOpen(false)
  }

  const toggleCollapse = () => {
    setIsCollapsed((prev: boolean) => {
      const newValue = !prev
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(newValue))
      return newValue
    })
  }

  // Save to localStorage when isCollapsed changes
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, JSON.stringify(isCollapsed))
  }, [isCollapsed])

  return (
    <div className="flex h-screen bg-tinedy-off-white">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={closeSidebar}
        isCollapsed={isCollapsed}
        onToggleCollapse={toggleCollapse}
      />

      <div className={`flex-1 flex flex-col transition-all duration-300 ${isCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
        <Header onMenuClick={toggleSidebar} />

        <main className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col">
          <div className="container mx-auto px-4 py-6 lg:px-6 lg:py-8 flex-1 flex flex-col">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
