/**
 * Error Message Utility
 *
 * Centralized error mapping for user-friendly error messages.
 * Maps technical errors (database, network, validation) to clear,
 * actionable messages that users can understand.
 */

// ============================================================================
// ERROR TYPES
// ============================================================================

export type ErrorContext =
  | 'staff'
  | 'booking'
  | 'customer'
  | 'team'
  | 'service_package'
  | 'general'

export interface UserFriendlyError {
  title: string
  description: string
  action?: string // Optional suggested action
}

// ============================================================================
// DATABASE ERROR CODES
// ============================================================================

const POSTGRES_ERROR_CODES = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
} as const

// ============================================================================
// ERROR MESSAGE TEMPLATES
// ============================================================================

const ERROR_MESSAGES = {
  // Load/Fetch errors
  LOAD_FAILED: {
    staff: {
      title: 'Unable to Load Staff',
      description: 'Unable to load staff members. Please check your connection and try again. If the problem persists, contact support.',
    },
    booking: {
      title: 'Unable to Load Bookings',
      description: 'Unable to load bookings. Please refresh the page or check your internet connection.',
    },
    customer: {
      title: 'Unable to Load Customers',
      description: 'Unable to load customer list. Please refresh the page or check your connection.',
    },
    team: {
      title: 'Unable to Load Teams',
      description: 'Unable to load teams. Please refresh the page or check your connection.',
    },
  },

  // Save/Create errors
  DUPLICATE_ENTRY: {
    staff: {
      title: 'Duplicate Email',
      description: 'This email is already registered. Please use a different email address.',
    },
    customer: {
      title: 'Duplicate Email',
      description: 'This email is already in use. Please use a different email address.',
    },
    team: {
      title: 'Duplicate Team Name',
      description: 'A team with this name already exists. Please choose a different name.',
    },
  },

  // Delete errors
  DELETE_FAILED: {
    staff: {
      title: 'Cannot Delete Staff',
      description: 'Cannot delete this staff member. They may have active bookings. Try archiving instead, or check with your administrator.',
    },
    booking: {
      title: 'Cannot Delete Booking',
      description: 'Unable to delete this booking. It may be linked to payment records or other data. Try archiving instead.',
    },
    customer: {
      title: 'Cannot Delete Customer',
      description: 'Unable to delete this customer. They may have active bookings or payment history. Try archiving instead.',
    },
    team: {
      title: 'Cannot Delete Team',
      description: 'Cannot delete this team. It may have active bookings or members assigned. Try archiving instead.',
    },
  },

  // Booking-specific errors
  BOOKING_CONFLICT: {
    title: 'Time Slot Unavailable',
    description: 'This time slot is already booked. Please choose a different time or staff member.',
  },

  RECURRING_BOOKING_FAILED: {
    title: 'Recurring Booking Failed',
    description: 'Unable to create recurring bookings. This may be due to scheduling conflicts or system limitations. Please try adjusting your schedule or contact support.',
  },

  RECURRING_DELETE_FAILED: {
    title: 'Cannot Delete Recurring Bookings',
    description: 'Unable to delete recurring bookings. Some bookings may have already started or have payments. Contact support if you need assistance.',
  },

  // Validation errors
  VALIDATION_FAILED: {
    title: 'Validation Error',
    description: 'Please check your input. Some fields may be invalid.',
  },

  INVALID_PHONE: {
    title: 'Invalid Phone Number',
    description: 'The phone number format is invalid. Please check and try again.',
  },

  INVALID_EMAIL: {
    title: 'Invalid Email',
    description: 'Please enter a valid email address.',
  },

  MISSING_REQUIRED_FIELDS: {
    title: 'Missing Information',
    description: 'Please fill in all required fields.',
  },

  // Archive/Restore errors
  ARCHIVE_FAILED: {
    title: 'Archive Failed',
    description: 'Unable to archive this item. Please try again or contact support if the issue persists.',
  },

  RESTORE_FAILED: {
    title: 'Restore Failed',
    description: 'Unable to restore this item. Please ensure the data is valid and try again.',
  },

  // Team operations
  ADD_MEMBER_FAILED: {
    already_member: {
      title: 'Already a Member',
      description: 'This staff member is already in the team.',
    },
    inactive_staff: {
      title: 'Inactive Staff',
      description: 'This staff member is inactive. Please activate them first before adding to a team.',
    },
  },

  REMOVE_MEMBER_FAILED: {
    title: 'Cannot Remove Member',
    description: 'Unable to remove team member. They may have active assignments. Please check and try again.',
  },

  // Network errors
  NETWORK_ERROR: {
    title: 'Connection Error',
    description: 'Unable to connect to the server. Please check your internet connection and try again.',
  },

  // Generic fallback
  GENERIC_ERROR: {
    title: 'Something Went Wrong',
    description: 'An unexpected error occurred. Please try again or contact support if the problem persists.',
  },
} as const

// ============================================================================
// ERROR MAPPING FUNCTIONS
// ============================================================================

/**
 * Map a generic error to a user-friendly message
 * @param error - The error object
 * @param context - The context where the error occurred (staff, booking, etc.)
 * @returns User-friendly error object
 */
export function mapErrorToUserMessage(
  error: unknown,
  context: ErrorContext = 'general'
): UserFriendlyError {
  // Handle null/undefined
  if (!error) {
    return ERROR_MESSAGES.GENERIC_ERROR
  }

  // Type guard for error objects
  const errorObj = error as { message?: string; code?: string }
  const errorMessage = errorObj?.message || ''
  const errorCode = errorObj?.code

  // Network errors
  if (
    errorMessage.includes('fetch') ||
    errorMessage.includes('network') ||
    errorMessage.includes('Failed to fetch')
  ) {
    return ERROR_MESSAGES.NETWORK_ERROR
  }

  // Database constraint violations
  if (errorCode === POSTGRES_ERROR_CODES.UNIQUE_VIOLATION || errorMessage.includes('duplicate')) {
    if (context === 'staff' || context === 'customer') {
      return ERROR_MESSAGES.DUPLICATE_ENTRY[context]
    }
    if (context === 'team') {
      return ERROR_MESSAGES.DUPLICATE_ENTRY.team
    }
  }

  if (errorCode === POSTGRES_ERROR_CODES.FOREIGN_KEY_VIOLATION) {
    if (context === 'staff') return ERROR_MESSAGES.DELETE_FAILED.staff
    if (context === 'customer') return ERROR_MESSAGES.DELETE_FAILED.customer
    if (context === 'team') return ERROR_MESSAGES.DELETE_FAILED.team
    if (context === 'booking') return ERROR_MESSAGES.DELETE_FAILED.booking
  }

  // Validation errors
  if (errorMessage.includes('invalid email') || errorMessage.includes('Invalid email')) {
    return ERROR_MESSAGES.INVALID_EMAIL
  }

  if (errorMessage.includes('invalid phone') || errorMessage.includes('phone number')) {
    return ERROR_MESSAGES.INVALID_PHONE
  }

  if (errorMessage.includes('required') || errorMessage.includes('missing')) {
    return ERROR_MESSAGES.MISSING_REQUIRED_FIELDS
  }

  // Booking-specific errors
  if (errorMessage.includes('conflict') || errorMessage.includes('already booked')) {
    return ERROR_MESSAGES.BOOKING_CONFLICT
  }

  // Generic fallback
  return ERROR_MESSAGES.GENERIC_ERROR
}

/**
 * Map load/fetch errors to user-friendly messages
 * @param context - The context (staff, booking, customer, team)
 * @returns User-friendly error object
 */
export function getLoadErrorMessage(context: ErrorContext): UserFriendlyError {
  if (context in ERROR_MESSAGES.LOAD_FAILED) {
    return ERROR_MESSAGES.LOAD_FAILED[context as keyof typeof ERROR_MESSAGES.LOAD_FAILED]
  }
  return ERROR_MESSAGES.GENERIC_ERROR
}

/**
 * Map delete errors to user-friendly messages
 * @param context - The context (staff, booking, customer, team)
 * @returns User-friendly error object
 */
export function getDeleteErrorMessage(context: ErrorContext): UserFriendlyError {
  if (context in ERROR_MESSAGES.DELETE_FAILED) {
    return ERROR_MESSAGES.DELETE_FAILED[context as keyof typeof ERROR_MESSAGES.DELETE_FAILED]
  }
  return ERROR_MESSAGES.GENERIC_ERROR
}

/**
 * Get booking conflict error message
 * @returns User-friendly error object
 */
export function getBookingConflictError(): UserFriendlyError {
  return ERROR_MESSAGES.BOOKING_CONFLICT
}

/**
 * Get recurring booking error message
 * @param operation - 'create' or 'delete'
 * @returns User-friendly error object
 */
export function getRecurringBookingError(operation: 'create' | 'delete'): UserFriendlyError {
  return operation === 'create'
    ? ERROR_MESSAGES.RECURRING_BOOKING_FAILED
    : ERROR_MESSAGES.RECURRING_DELETE_FAILED
}

/**
 * Get archive error message
 * @returns User-friendly error object
 */
export function getArchiveErrorMessage(): UserFriendlyError {
  return ERROR_MESSAGES.ARCHIVE_FAILED
}

/**
 * Get restore error message
 * @returns User-friendly error object
 */
export function getRestoreErrorMessage(): UserFriendlyError {
  return ERROR_MESSAGES.RESTORE_FAILED
}

/**
 * Get team member operation error
 * @param operation - 'add' or 'remove'
 * @param reason - Specific reason (e.g., 'already_member', 'inactive_staff')
 * @returns User-friendly error object
 */
export function getTeamMemberError(
  operation: 'add' | 'remove',
  reason?: 'already_member' | 'inactive_staff'
): UserFriendlyError {
  if (operation === 'add' && reason) {
    return ERROR_MESSAGES.ADD_MEMBER_FAILED[reason]
  }
  return operation === 'add'
    ? ERROR_MESSAGES.GENERIC_ERROR
    : ERROR_MESSAGES.REMOVE_MEMBER_FAILED
}

/**
 * Get validation error message
 * @returns User-friendly error object
 */
export function getValidationErrorMessage(): UserFriendlyError {
  return ERROR_MESSAGES.VALIDATION_FAILED
}

// ============================================================================
// HELPER FUNCTION FOR LEGACY getErrorMessage()
// ============================================================================

/**
 * Legacy error message extractor - Use mapErrorToUserMessage instead
 * @deprecated Use mapErrorToUserMessage for better error handling
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
}
