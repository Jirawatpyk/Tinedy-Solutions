import { useLocalStorage } from './useLocalStorage'

/**
 * Custom hook สำหรับจัดการ collapsible state พร้อม localStorage persistence
 *
 * @param key - localStorage key (จะเพิ่ม prefix 'tinedy-crm-collapsed-' ให้อัตโนมัติ)
 * @param defaultOpen - สถานะเริ่มต้น (default = true)
 * @returns [isOpen, toggle] - สถานะและ function สำหรับ toggle
 *
 * @example
 * const [isStatsOpen, toggleStats] = useCollapsible('dashboard-stats')
 * const [isFiltersOpen, toggleFilters] = useCollapsible('calendar-filters', false)
 */
export function useCollapsible(key: string, defaultOpen: boolean = true): [boolean, () => void] {
  const storageKey = `tinedy-crm-collapsed-${key}`
  const [isOpen, setIsOpen] = useLocalStorage(storageKey, defaultOpen)

  const toggle = () => {
    setIsOpen(prev => !prev)
  }

  return [isOpen, toggle]
}
