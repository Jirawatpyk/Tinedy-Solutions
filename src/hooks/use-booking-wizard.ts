/**
 * useBookingWizard — useReducer-based state machine for booking creation
 *
 * Manages the 4-step booking wizard and Quick Mode (same state, different layout).
 *
 * State machine features:
 * - Step validation before advancing (R6 Pre-mortem)
 * - Auto-calculate endTime from package duration (R7: only if not manually set)
 * - Auto-fill address from customer when useCustomerAddress = true
 * - localStorage mode preference scoped per user (R5: prevent user preference leak)
 * - Full state re-validate before Submit (RT7)
 * - Disable recurring when isMultiDay = true
 *
 * FM1-C: Wizard does NOT subscribe to realtime. Conflicts checked at submit time.
 * A8: New customer creation happens ONLY in useCreateBookingMutation (not here).
 */

import { useReducer, useCallback, useEffect } from 'react'
import type { CustomerSearchResult } from '@/hooks/use-customer-search'
import type { ServicePackageV2WithTiers } from '@/lib/queries/package-queries'
import { PriceMode } from '@/types/booking'

// ============================================================================
// TYPES
// ============================================================================

export type WizardMode = 'wizard' | 'quick'
export type WizardStep = 1 | 2 | 3 | 4

export interface NewCustomerFormData {
  full_name: string
  phone: string
  email: string
}

export interface WizardState {
  // Mode & Step
  mode: WizardMode
  step: WizardStep

  // Step 1: Customer
  customer: CustomerSearchResult | null
  isNewCustomer: boolean
  newCustomerData: NewCustomerFormData

  // Step 2: Service & Schedule
  package_v2_id: string | null
  selectedPackage: ServicePackageV2WithTiers | null
  price_mode: PriceMode
  total_price: number
  custom_price: number | null
  price_override: boolean
  job_name: string
  area_sqm: number | null
  frequency: number | null

  booking_date: string         // YYYY-MM-DD
  end_date: string | null      // YYYY-MM-DD null = single-day
  isMultiDay: boolean
  start_time: string           // HH:MM
  end_time: string             // HH:MM
  endTimeManuallySet: boolean  // R7: only auto-calc if false

  // Step 3: Assignment & Address
  assignmentType: 'staff' | 'team' | 'none'
  staff_id: string | null
  team_id: string | null

  useCustomerAddress: boolean
  address: string
  city: string
  state: string
  zip_code: string

  notes: string

  // Recurring
  isRecurring: boolean
  recurringDates: string[]
  recurringPattern: 'auto-monthly' | 'custom'

  // Validation
  validationErrors: Partial<Record<string, string>>

  // Submit state
  isSubmitting: boolean
}

// ============================================================================
// ACTIONS
// ============================================================================

export type WizardAction =
  | { type: 'SET_MODE'; mode: WizardMode }
  | { type: 'NEXT_STEP' }
  | { type: 'PREV_STEP' }
  | { type: 'GOTO_STEP'; step: WizardStep }  // For editing from Step 4 (no validation)
  | { type: 'SELECT_CUSTOMER'; customer: CustomerSearchResult }
  | { type: 'CLEAR_CUSTOMER' }
  | { type: 'SET_NEW_CUSTOMER'; isNewCustomer: boolean }
  | { type: 'UPDATE_NEW_CUSTOMER'; field: keyof NewCustomerFormData; value: string }
  | { type: 'SELECT_PACKAGE'; package: ServicePackageV2WithTiers | null }
  | { type: 'SET_PRICE_MODE'; mode: PriceMode }
  | { type: 'SET_TOTAL_PRICE'; price: number }
  | { type: 'SET_CUSTOM_PRICE'; price: number | null }
  | { type: 'SET_JOB_NAME'; name: string }
  | { type: 'SET_AREA_SQM'; area: number | null }
  | { type: 'SET_FREQUENCY'; frequency: number | null }
  | { type: 'SET_BOOKING_DATE'; date: string }
  | { type: 'SET_END_DATE'; date: string | null }
  | { type: 'TOGGLE_MULTI_DAY'; isMultiDay: boolean }
  | { type: 'SET_START_TIME'; time: string }
  | { type: 'SET_END_TIME'; time: string; manual?: boolean }
  | { type: 'SET_ASSIGNMENT_TYPE'; assignmentType: 'staff' | 'team' | 'none' }
  | { type: 'SET_STAFF'; staffId: string | null }
  | { type: 'SET_TEAM'; teamId: string | null }
  | { type: 'TOGGLE_CUSTOMER_ADDRESS'; useCustomerAddress: boolean }
  | { type: 'SET_ADDRESS'; field: 'address' | 'city' | 'state' | 'zip_code'; value: string }
  | { type: 'SET_NOTES'; notes: string }
  | { type: 'TOGGLE_RECURRING'; isRecurring: boolean }
  | { type: 'SET_RECURRING_DATES'; dates: string[] }
  | { type: 'SET_RECURRING_PATTERN'; pattern: 'auto-monthly' | 'custom' }
  | { type: 'SET_VALIDATION_ERRORS'; errors: Partial<Record<string, string>> }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'RESET' }
  | { type: 'SEED'; overrides: Partial<Omit<WizardState, 'step' | 'mode' | 'isSubmitting' | 'validationErrors'>> }

// ============================================================================
// INITIAL STATE
// ============================================================================

export function createInitialState(mode: WizardMode = 'wizard'): WizardState {
  return {
    mode,
    step: 1,

    customer: null,
    isNewCustomer: false,
    newCustomerData: { full_name: '', phone: '', email: '' },

    package_v2_id: null,
    selectedPackage: null,
    price_mode: PriceMode.Package,
    total_price: 0,
    custom_price: null,
    price_override: false,
    job_name: '',
    area_sqm: null,
    frequency: null,

    booking_date: '',
    end_date: null,
    isMultiDay: false,
    start_time: '',
    end_time: '',
    endTimeManuallySet: false,

    assignmentType: 'none',
    staff_id: null,
    team_id: null,

    useCustomerAddress: false,
    address: '',
    city: '',
    state: '',
    zip_code: '',

    notes: '',

    isRecurring: false,
    recurringDates: [],
    recurringPattern: 'auto-monthly',

    validationErrors: {},
    isSubmitting: false,
  }
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateStep(state: WizardState, step: WizardStep): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {}

  if (step === 1) {
    // R6: Step 1 requires customerId OR (isNewCustomer AND name AND phone)
    if (!state.customer && !state.isNewCustomer) {
      errors.customer = 'Please select a customer or add a new one'
    }
    if (state.isNewCustomer) {
      if (!state.newCustomerData.full_name.trim()) {
        errors.new_customer_name = 'Please enter the customer name'
      }
      if (!state.newCustomerData.phone.trim()) {
        errors.new_customer_phone = 'Please enter a phone number'
      }
    }
  }

  if (step === 2) {
    // Recurring validation: require dates matching frequency
    if (state.isRecurring && state.recurringPattern === 'custom') {
      const requiredCount = state.frequency ?? 2
      if (state.recurringDates.length < requiredCount) {
        errors.recurringDates = `Please add ${requiredCount} dates (currently ${state.recurringDates.length})`
      }
    } else {
      if (!state.booking_date) {
        errors.booking_date = 'Please select a date'
      }
    }
    // auto-monthly: verify dates were generated (needs booking_date set first)
    if (state.isRecurring && state.recurringPattern === 'auto-monthly' && state.recurringDates.length === 0) {
      errors.recurringDates = 'Select a start date to generate recurring dates'
    }
    if (state.isMultiDay && state.end_date && state.end_date < state.booking_date) {
      errors.end_date = 'End date must not be before start date'
    }
    if (!state.start_time) {
      errors.start_time = 'Please enter a start time'
    }
    if (state.price_mode === PriceMode.Custom) {
      if (!state.job_name.trim()) {
        errors.job_name = 'Please enter a job name'
      }
      if (state.custom_price === null || state.custom_price < 0) {
        errors.custom_price = 'Please enter a price'
      }
    } else if (state.price_mode === PriceMode.Override) {
      if (!state.package_v2_id) {
        errors.package_v2_id = 'Please select a package before overriding price'
      }
      if (state.custom_price === null || state.custom_price < 0) {
        errors.custom_price = 'Please enter the desired price'
      }
    } else {
      // Package mode
      if (!state.package_v2_id) {
        errors.package_v2_id = 'Please select a package'
      }
    }
  }

  if (step === 3) {
    if (!state.address.trim()) {
      errors.address = 'Please enter an address'
    }
    if (!state.city.trim()) {
      errors.city = 'Please enter a city/district'
    }
  }

  return errors
}

/**
 * Count how many bookings will be created for recurring mode.
 * Shared between Step4Confirm (display) and mutation (price split).
 */
export function getRecurringDateCount(state: Pick<WizardState, 'isRecurring' | 'recurringDates' | 'recurringPattern'>): number {
  if (!state.isRecurring || state.recurringDates.length === 0) return 1
  return state.recurringPattern === 'custom'
    ? state.recurringDates.length
    : state.recurringDates.length + 1  // auto-monthly: booking_date + recurringDates
}

/**
 * Full state validation for Submit button (RT7) — used in Create flow.
 * Validates all 3 steps including customer selection (Step 1).
 */
export function validateFullState(state: WizardState): Partial<Record<string, string>> {
  return {
    ...validateStep(state, 1),
    ...validateStep(state, 2),
    ...validateStep(state, 3),
  }
}

/**
 * Edit-mode validation — skips Step 1 (customer is already bound to the booking).
 * Used in BookingEditModal where customer_id is immutable.
 */
export function validateEditState(state: WizardState): Partial<Record<string, string>> {
  return {
    ...validateStep(state, 2),
    ...validateStep(state, 3),
  }
}

// ============================================================================
// AUTO-CALCULATE END TIME
// ============================================================================

function calcEndTime(startTime: string, durationMinutes: number | null): string {
  if (!startTime || !durationMinutes) return ''

  const [hours, minutes] = startTime.split(':').map(Number)
  const totalMinutes = hours * 60 + minutes + durationMinutes
  const endHours = Math.floor(totalMinutes / 60) % 24
  const endMins = totalMinutes % 60

  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`
}

// ============================================================================
// REDUCER
// ============================================================================

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode }

    case 'NEXT_STEP': {
      // R6: Validate current step before advancing
      const errors = validateStep(state, state.step)
      if (Object.keys(errors).length > 0) {
        return { ...state, validationErrors: errors }
      }
      const nextStep = Math.min(state.step + 1, 4) as WizardStep
      return { ...state, step: nextStep, validationErrors: {} }
    }

    case 'PREV_STEP': {
      const prevStep = Math.max(state.step - 1, 1) as WizardStep
      return { ...state, step: prevStep, validationErrors: {} }
    }

    case 'GOTO_STEP':
      // RT7: Backward navigation from Step 4 — NO validation required
      return { ...state, step: action.step, validationErrors: {} }

    // ---- Step 1: Customer ----
    case 'SELECT_CUSTOMER':
      return {
        ...state,
        customer: action.customer,
        isNewCustomer: false,
        newCustomerData: { full_name: '', phone: '', email: '' },
        // A10: Auto-fill address only if customer has address
        useCustomerAddress: !!action.customer.address,
        address: action.customer.address || state.address,
        city: action.customer.city || state.city,
        state: action.customer.state || state.state,
        zip_code: action.customer.zip_code || state.zip_code,
        validationErrors: {},
      }

    case 'CLEAR_CUSTOMER':
      return {
        ...state,
        customer: null,
        useCustomerAddress: false,
        validationErrors: {},
      }

    case 'SET_NEW_CUSTOMER':
      return {
        ...state,
        isNewCustomer: action.isNewCustomer,
        customer: action.isNewCustomer ? null : state.customer,
        validationErrors: {},
      }

    case 'UPDATE_NEW_CUSTOMER':
      return {
        ...state,
        newCustomerData: { ...state.newCustomerData, [action.field]: action.value },
      }

    // ---- Step 2: Service & Schedule ----
    case 'SELECT_PACKAGE': {
      const pkg = action.package
      // Preserve Override mode when clearing package — don't fall back to Package
      if (!pkg) {
        return {
          ...state,
          package_v2_id: null,
          selectedPackage: null,
          price_mode: state.price_mode === PriceMode.Override ? PriceMode.Override : PriceMode.Package,
          total_price: 0,
          frequency: null,
        }
      }

      // R7: Auto-calculate endTime only if not manually set
      const newEndTime = state.endTimeManuallySet
        ? state.end_time
        : calcEndTime(state.start_time, pkg.duration_minutes)

      // Preserve Override mode — don't force back to Package
      const isOverride = state.price_mode === PriceMode.Override
      return {
        ...state,
        package_v2_id: pkg.id,
        selectedPackage: pkg,
        price_mode: isOverride ? PriceMode.Override : PriceMode.Package,
        total_price: isOverride ? state.total_price : (pkg.base_price ?? 0),
        custom_price: null,
        price_override: isOverride,
        end_time: newEndTime,
        // Reset frequency — new package may have different available frequencies
        frequency: null,
      }
    }

    case 'SET_PRICE_MODE': {
      if (action.mode === PriceMode.Custom) {
        return {
          ...state,
          price_mode: PriceMode.Custom,
          package_v2_id: null,
          selectedPackage: null,
          total_price: 0,
          custom_price: null,
          // Custom mode does not support recurring — reset all recurring state
          frequency: null,
          isRecurring: false,
          recurringDates: [],
        }
      }
      if (action.mode === PriceMode.Package) {
        // Switch to package: reset price (will be set by SELECT_PACKAGE) + clear custom fields
        return {
          ...state,
          price_mode: PriceMode.Package,
          job_name: '',
          custom_price: null,
          total_price: 0,
          recurringPattern: 'auto-monthly',
        }
      }
      // Override: keep current total_price (admin manually overrides it)
      return {
        ...state,
        price_mode: action.mode,
        job_name: '',
        custom_price: null,
      }
    }

    case 'SET_TOTAL_PRICE':
      return { ...state, total_price: action.price }

    case 'SET_CUSTOM_PRICE':
      return { ...state, custom_price: action.price }

    case 'SET_JOB_NAME':
      return { ...state, job_name: action.name }

    case 'SET_AREA_SQM':
      return { ...state, area_sqm: action.area }

    case 'SET_FREQUENCY': {
      const freqVal = action.frequency ?? 1
      // multi-day ไม่อนุญาต recurring — ไม่เปิด recurring แม้ freq > 1
      const canRecur = freqVal > 1 && !state.isMultiDay
      return {
        ...state,
        frequency: action.frequency,
        isRecurring: canRecur,
        recurringDates: canRecur ? state.recurringDates : [],
      }
    }

    case 'SET_BOOKING_DATE':
      return { ...state, booking_date: action.date }

    case 'SET_END_DATE':
      return { ...state, end_date: action.date }

    case 'TOGGLE_MULTI_DAY': {
      // EC-D7: When toggling off, reset end_date
      // Multi-day ไม่รองรับ recurring/frequency — reset ทั้งหมด
      return {
        ...state,
        isMultiDay: action.isMultiDay,
        end_date: action.isMultiDay ? state.end_date : null,
        isRecurring: action.isMultiDay ? false : state.isRecurring,
        frequency: action.isMultiDay ? null : state.frequency,
        recurringDates: action.isMultiDay ? [] : state.recurringDates,
      }
    }

    case 'SET_START_TIME': {
      // R7: Auto-recalculate endTime if not manually set
      const newEndTime = !state.endTimeManuallySet && state.selectedPackage
        ? calcEndTime(action.time, state.selectedPackage.duration_minutes)
        : state.end_time

      return { ...state, start_time: action.time, end_time: newEndTime }
    }

    case 'SET_END_TIME':
      return {
        ...state,
        end_time: action.time,
        endTimeManuallySet: action.manual !== false,  // default to true (manual)
      }

    // ---- Step 3: Assignment & Address ----
    case 'SET_ASSIGNMENT_TYPE':
      return {
        ...state,
        assignmentType: action.assignmentType,
        staff_id: action.assignmentType === 'staff' ? state.staff_id : null,
        team_id: action.assignmentType === 'team' ? state.team_id : null,
      }

    case 'SET_STAFF':
      return { ...state, staff_id: action.staffId }

    case 'SET_TEAM':
      return { ...state, team_id: action.teamId }

    case 'TOGGLE_CUSTOMER_ADDRESS': {
      if (action.useCustomerAddress && state.customer) {
        return {
          ...state,
          useCustomerAddress: true,
          address: state.customer.address || '',
          city: state.customer.city || '',
          state: state.customer.state || '',
          zip_code: state.customer.zip_code || '',
        }
      }
      return {
        ...state,
        useCustomerAddress: false,
        address: '',
        city: '',
        state: '',
        zip_code: '',
      }
    }

    case 'SET_ADDRESS':
      return { ...state, [action.field]: action.value }

    case 'SET_NOTES':
      return { ...state, notes: action.notes }

    case 'TOGGLE_RECURRING': {
      // When turning off recurring: reset frequency to null so price recalculates
      // (frequency > 1 and non-recurring is inconsistent)
      const resetFrequency = !action.isRecurring && (state.frequency ?? 1) > 1
      return {
        ...state,
        isRecurring: action.isRecurring,
        frequency: resetFrequency ? null : state.frequency,
        recurringDates: action.isRecurring ? state.recurringDates : [],
      }
    }

    case 'SET_RECURRING_DATES':
      return { ...state, recurringDates: action.dates }

    case 'SET_RECURRING_PATTERN':
      return { ...state, recurringPattern: action.pattern }

    case 'SET_VALIDATION_ERRORS':
      return { ...state, validationErrors: action.errors }

    case 'SET_SUBMITTING':
      return { ...state, isSubmitting: action.isSubmitting }

    case 'RESET':
      return { ...createInitialState(state.mode), mode: state.mode }

    case 'SEED':
      // Re-seed entire state from external data (e.g., edit modal opens with new booking)
      return { ...createInitialState(), mode: state.mode, ...action.overrides }

    default:
      return state
  }
}

// ============================================================================
// HOOK
// ============================================================================

const STORAGE_KEY_PREFIX = 'booking-form-mode_'

export interface UseBookingWizardOptions {
  userId?: string
  initialState?: Partial<WizardState>
  /** Pre-seed customer (e.g. when opening from Customer Detail page) */
  initialCustomer?: CustomerSearchResult
}

export function useBookingWizard(options: UseBookingWizardOptions = {}) {
  const { userId, initialState: overrides, initialCustomer } = options

  // R5: Load mode from localStorage scoped per user (prevent preference leak between users)
  const storageKey = userId ? `${STORAGE_KEY_PREFIX}${userId}` : STORAGE_KEY_PREFIX
  const savedMode = (typeof window !== 'undefined'
    ? (localStorage.getItem(storageKey) as WizardMode | null)
    : null) ?? 'wizard'

  // Pre-seed customer overrides: mirror SELECT_CUSTOMER reducer + skip to Step 2
  const customerOverrides: Partial<WizardState> = initialCustomer
    ? {
        customer: initialCustomer,
        isNewCustomer: false,
        useCustomerAddress: !!initialCustomer.address,
        address: initialCustomer.address ?? '',
        city: initialCustomer.city ?? '',
        state: initialCustomer.state ?? '',
        zip_code: initialCustomer.zip_code ?? '',
        step: 2 as WizardStep,
      }
    : {}

  const [state, dispatch] = useReducer(
    wizardReducer,
    { ...createInitialState(savedMode), ...customerOverrides, ...overrides }
  )

  // Persist mode preference on change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, state.mode)
    }
  }, [state.mode, storageKey])

  // Convenience setter for mode (also persists to localStorage)
  const setMode = useCallback((mode: WizardMode) => {
    dispatch({ type: 'SET_MODE', mode })
  }, [])

  return { state, dispatch, setMode }
}
