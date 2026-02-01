/**
 * Optimistic Mutations
 *
 * Centralized exports สำหรับ optimistic update hooks
 */

export { useOptimisticMutation } from './use-optimistic-mutation'
export { useOptimisticPayment } from './use-optimistic-payment'
export { useOptimisticDelete } from './use-optimistic-delete'

export type {
  UseOptimisticMutationOptions,
  UseOptimisticMutationReturn,
  OptimisticUpdateConfig,
  LocalStateUpdate,
  ToastConfig,
} from './types'

export type { UseOptimisticPaymentReturn } from './use-optimistic-payment'
export type { UseOptimisticDeleteReturn, SoftDeleteTable } from './use-optimistic-delete'
