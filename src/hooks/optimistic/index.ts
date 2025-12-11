/**
 * Optimistic Mutations
 *
 * Centralized exports สำหรับ optimistic update hooks
 */

export { useOptimisticMutation } from './useOptimisticMutation'
export { useOptimisticPayment } from './useOptimisticPayment'
export { useOptimisticDelete } from './useOptimisticDelete'

export type {
  UseOptimisticMutationOptions,
  UseOptimisticMutationReturn,
  OptimisticUpdateConfig,
  LocalStateUpdate,
  ToastConfig,
} from './types'

export type { UseOptimisticPaymentReturn } from './useOptimisticPayment'
export type { UseOptimisticDeleteReturn, SoftDeleteTable } from './useOptimisticDelete'
