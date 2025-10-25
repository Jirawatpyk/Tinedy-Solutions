import { useState, useCallback } from 'react'

/**
 * Custom hook for managing modal open/close state
 * Provides consistent modal state management across the application
 *
 * @example
 * const editModal = useModalState()
 * const deleteModal = useModalState()
 *
 * <Button onClick={editModal.open}>Edit</Button>
 * <Modal isOpen={editModal.isOpen} onClose={editModal.close}>
 *   ...
 * </Modal>
 */
export function useModalState(defaultOpen = false) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const open = useCallback(() => {
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
  }, [])

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev)
  }, [])

  return {
    isOpen,
    open,
    close,
    toggle,
    setIsOpen,
  }
}

/**
 * Custom hook for managing modal state with data
 * Useful for modals that need to pass data (e.g., edit modal with item data)
 *
 * @example
 * const editModal = useModalStateWithData<Customer>()
 *
 * <Button onClick={() => editModal.open(customer)}>Edit</Button>
 * <EditModal
 *   isOpen={editModal.isOpen}
 *   onClose={editModal.close}
 *   data={editModal.data}
 * />
 */
export function useModalStateWithData<T = unknown>(defaultOpen = false, defaultData: T | null = null) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [data, setData] = useState<T | null>(defaultData)

  const open = useCallback((newData?: T) => {
    if (newData !== undefined) {
      setData(newData)
    }
    setIsOpen(true)
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    // Optional: Clear data on close (can be disabled if needed)
    // setData(null)
  }, [])

  const toggle = useCallback((newData?: T) => {
    setIsOpen((prev) => {
      const nextOpen = !prev
      if (nextOpen && newData !== undefined) {
        setData(newData)
      }
      return nextOpen
    })
  }, [])

  const updateData = useCallback((newData: T | null) => {
    setData(newData)
  }, [])

  return {
    isOpen,
    data,
    open,
    close,
    toggle,
    updateData,
    setIsOpen,
    setData,
  }
}
