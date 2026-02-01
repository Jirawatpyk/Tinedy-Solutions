import { useState, useCallback } from 'react'
import type { Booking } from '@/types/booking'

export function useBookingModal() {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [isDetailOpen, setIsDetailOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)

  const openDetail = useCallback((booking: Booking) => {
    setSelectedBooking(booking)
    setIsDetailOpen(true)
  }, [])

  const closeDetail = useCallback(() => {
    setIsDetailOpen(false)
  }, [])

  const openEdit = useCallback(() => {
    setIsDetailOpen(false)
    setIsEditOpen(true)
  }, [])

  const closeEdit = useCallback(() => {
    setIsEditOpen(false)
    setSelectedBooking(null)
  }, [])

  const updateSelectedBooking = useCallback((booking: Booking) => {
    setSelectedBooking(booking)
  }, [])

  return {
    selectedBooking,
    isDetailOpen,
    isEditOpen,
    openDetail,
    closeDetail,
    openEdit,
    closeEdit,
    updateSelectedBooking,
    setSelectedBooking,
    setIsDetailOpen,
    setIsEditOpen,
  }
}
