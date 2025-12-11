/**
 * Type definitions for useOptimisticMutation hook
 *
 * Generic hook สำหรับจัดการ optimistic updates พร้อม rollback mechanism
 * และ error handling แบบ centralized
 */

import type { QueryKey } from '@tanstack/react-query'

/**
 * ข้อมูลที่ต้องการสำหรับ optimistic update
 */
export interface OptimisticUpdateConfig<TData, TVariables> {
  /**
   * Query keys ที่ต้อง update (รองรับหลาย queries)
   * @example [queryKeys.bookings.all]
   */
  queryKeys: QueryKey[]

  /**
   * ฟังก์ชัน updater สำหรับแก้ไข cache data
   * @param oldData - ข้อมูลเดิมใน cache
   * @param variables - ค่าที่ส่งเข้ามาใน mutation
   * @returns ข้อมูลใหม่ที่จะ set เข้า cache
   */
  updater: (oldData: TData | undefined, variables: TVariables) => TData | undefined
}

/**
 * Local state ที่ต้องการ update (เช่น selectedBooking)
 */
export interface LocalStateUpdate<TLocalState, TVariables> {
  /** Current local state value */
  currentState: TLocalState | null

  /** Function to update local state */
  setState: (newState: TLocalState | null) => void

  /**
   * Function to compute new local state based on variables
   * @param currentState - Current local state
   * @param variables - Mutation variables
   * @returns New local state value
   */
  updater: (currentState: TLocalState, variables: TVariables) => TLocalState

  /**
   * Condition to check if should update (optional)
   * เช่น: ถ้า bookingId ตรงกับ selectedBooking.id
   */
  shouldUpdate?: (currentState: TLocalState, variables: TVariables) => boolean
}

/**
 * Toast notification configuration
 */
export interface ToastConfig {
  /** Toast title on success */
  successTitle?: string

  /**
   * Toast description on success (can be function for dynamic message)
   * @example (result) => result.count > 1 ? `${result.count} items updated` : 'Item updated'
   */
  successDescription?: string | ((result: unknown) => string)

  /** Toast title on error (optional, default: ใช้จาก error-messages.ts) */
  errorTitle?: string

  /** Toast description on error (optional, default: ใช้จาก error-messages.ts) */
  errorDescription?: string

  /**
   * Error context for mapErrorToUserMessage (default: 'general')
   */
  errorContext?: 'staff' | 'booking' | 'customer' | 'team' | 'service_package' | 'general'
}

/**
 * Configuration options for useOptimisticMutation
 */
export interface UseOptimisticMutationOptions<TData, TVariables, TLocalState = never> {
  /**
   * Mutation function ที่จะเรียก API
   * @param variables - ค่าที่ส่งเข้ามา
   * @returns Promise ของ API response
   */
  mutationFn: (variables: TVariables) => Promise<unknown>

  /**
   * Optimistic update configuration (optional)
   * ถ้าไม่ใส่จะไม่ทำ optimistic update (ใช้แค่ mutation ธรรมดา)
   */
  optimisticUpdate?: OptimisticUpdateConfig<TData, TVariables>

  /**
   * Local state update configuration (optional)
   * สำหรับ update state เช่น selectedBooking, selectedCustomer
   */
  localStateUpdate?: LocalStateUpdate<TLocalState, TVariables>

  /**
   * Toast notification configuration (optional)
   */
  toast?: ToastConfig

  /**
   * Callback after successful mutation (optional)
   * เรียกหลังจาก API สำเร็จ
   */
  onSuccess?: () => void | Promise<void>

  /**
   * Callback on error (optional)
   * เรียกหลังจาก rollback สำเร็จ
   */
  onError?: (error: unknown) => void

  /**
   * Callback ที่เรียกเสมอไม่ว่า success หรือ error (optional)
   */
  onSettled?: () => void
}

/**
 * Return type of useOptimisticMutation
 */
export interface UseOptimisticMutationReturn<TVariables> {
  /**
   * Mutation function to call
   * @param variables - Mutation input
   */
  mutate: (variables: TVariables) => Promise<void>

  /**
   * Async mutation function (รอ Promise resolve/reject)
   * @param variables - Mutation input
   * @returns Promise that resolves on success, rejects on error
   */
  mutateAsync: (variables: TVariables) => Promise<void>

  /** กำลัง loading อยู่หรือไม่ */
  isLoading: boolean

  /** Error ล่าสุด (ถ้ามี) */
  error: unknown | null

  /** Reset error state */
  reset: () => void
}
