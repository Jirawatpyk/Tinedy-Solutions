import { useState, useEffect } from 'react'

/**
 * Custom hook สำหรับจัดการ localStorage แบบ type-safe
 * พร้อม automatic sync กับ state
 *
 * @param key - localStorage key
 * @param initialValue - ค่าเริ่มต้นถ้ายังไม่มีใน localStorage
 * @returns [value, setValue] - คล้าย useState แต่ sync กับ localStorage
 *
 * @example
 * const [theme, setTheme] = useLocalStorage('theme', 'light')
 * const [isCollapsed, setIsCollapsed] = useLocalStorage('sidebar-collapsed', false)
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  // State เพื่อเก็บค่า
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue
    }

    try {
      // ดึงค่าจาก localStorage
      const item = window.localStorage.getItem(key)
      // Parse JSON หรือใช้ค่าเริ่มต้น
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      // ถ้า error (เช่น parse JSON ไม่ได้) ให้ใช้ค่าเริ่มต้น
      console.warn(`Error reading localStorage key "${key}":`, error)
      return initialValue
    }
  })

  // Function สำหรับ set ค่าใหม่
  const setValue = (value: T | ((val: T) => T)) => {
    try {
      // รองรับทั้งค่าตรงๆ และ function (เหมือน setState)
      const valueToStore = value instanceof Function ? value(storedValue) : value

      // บันทึกลง state
      setStoredValue(valueToStore)

      // บันทึกลง localStorage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.warn(`Error setting localStorage key "${key}":`, error)
    }
  }

  // Sync กับ localStorage เมื่อ key เปลี่ยน
  useEffect(() => {
    if (typeof window === 'undefined') return

    try {
      const item = window.localStorage.getItem(key)
      if (item) {
        setStoredValue(JSON.parse(item))
      }
    } catch (error) {
      console.warn(`Error syncing localStorage key "${key}":`, error)
    }
  }, [key])

  return [storedValue, setValue]
}
