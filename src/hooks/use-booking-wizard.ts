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
import type { PriceMode } from '@/types/booking'

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
  frequency: 1 | 2 | 4 | 8 | null

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
  recurringPattern: 'auto_monthly' | 'manual'

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
  | { type: 'SET_FREQUENCY'; frequency: 1 | 2 | 4 | 8 | null }
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
  | { type: 'SET_RECURRING_PATTERN'; pattern: 'auto_monthly' | 'manual' }
  | { type: 'SET_VALIDATION_ERRORS'; errors: Partial<Record<string, string>> }
  | { type: 'SET_SUBMITTING'; isSubmitting: boolean }
  | { type: 'RESET' }

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
    price_mode: 'package',
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
    recurringPattern: 'manual',

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
      errors.customer = 'กรุณาเลือกลูกค้าหรือเพิ่มลูกค้าใหม่'
    }
    if (state.isNewCustomer) {
      if (!state.newCustomerData.full_name.trim()) {
        errors.new_customer_name = 'กรุณากรอกชื่อลูกค้า'
      }
      if (!state.newCustomerData.phone.trim()) {
        errors.new_customer_phone = 'กรุณากรอกเบอร์โทรศัพท์'
      }
    }
  }

  if (step === 2) {
    if (!state.booking_date) {
      errors.booking_date = 'กรุณาเลือกวันที่'
    }
    if (state.isMultiDay && state.end_date && state.end_date < state.booking_date) {
      errors.end_date = 'วันสิ้นสุดต้องไม่น้อยกว่าวันเริ่มต้น'
    }
    if (!state.start_time) {
      errors.start_time = 'กรุณากรอกเวลาเริ่มต้น'
    }
    if (state.price_mode === 'custom') {
      if (!state.job_name.trim()) {
        errors.job_name = 'กรุณาระบุชื่องาน'
      }
      if (state.custom_price === null || state.custom_price < 0) {
        errors.custom_price = 'กรุณาระบุราคา'
      }
    } else if (state.price_mode === 'override') {
      if (!state.package_v2_id) {
        errors.package_v2_id = 'กรุณาเลือก Package ก่อนปรับราคา'
      }
      if (state.custom_price === null || state.custom_price < 0) {
        errors.custom_price = 'กรุณาระบุราคาที่ต้องการ'
      }
    } else {
      // Package mode
      if (!state.package_v2_id) {
        errors.package_v2_id = 'กรุณาเลือก Package'
      }
    }
  }

  if (step === 3) {
    if (!state.address.trim()) {
      errors.address = 'กรุณากรอกที่อยู่'
    }
    if (!state.city.trim()) {
      errors.city = 'กรุณากรอกเมือง/เขต'
    }
  }

  return errors
}

/**
 * Full state validation for Submit button (RT7)
 */
export function validateFullState(state: WizardState): Partial<Record<string, string>> {
  return {
    ...validateStep(state, 1),
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
      if (!pkg) {
        return {
          ...state,
          package_v2_id: null,
          selectedPackage: null,
          price_mode: 'package',
          total_price: 0,
        }
      }

      // R7: Auto-calculate endTime only if not manually set
      const newEndTime = state.endTimeManuallySet
        ? state.end_time
        : calcEndTime(state.start_time, pkg.duration_minutes)

      return {
        ...state,
        package_v2_id: pkg.id,
        selectedPackage: pkg,
        price_mode: 'package',
        total_price: pkg.base_price ?? 0,
        custom_price: null,
        price_override: false,
        end_time: newEndTime,
      }
    }

    case 'SET_PRICE_MODE': {
      if (action.mode === 'custom') {
        return {
          ...state,
          price_mode: 'custom',
          package_v2_id: null,
          selectedPackage: null,
          total_price: 0,
          custom_price: null,
        }
      }
      if (action.mode === 'package') {
        // Switch to package: reset price (will be set by SELECT_PACKAGE) + clear custom fields
        return {
          ...state,
          price_mode: 'package',
          job_name: '',
          custom_price: null,
          total_price: 0,
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

    case 'SET_FREQUENCY':
      return { ...state, frequency: action.frequency }

    case 'SET_BOOKING_DATE':
      return { ...state, booking_date: action.date }

    case 'SET_END_DATE':
      return { ...state, end_date: action.date }

    case 'TOGGLE_MULTI_DAY': {
      // EC-D7: When toggling off, reset end_date
      return {
        ...state,
        isMultiDay: action.isMultiDay,
        end_date: action.isMultiDay ? state.end_date : null,
        // Disable recurring if multi-day
        isRecurring: action.isMultiDay ? false : state.isRecurring,
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

    case 'TOGGLE_RECURRING':
      return { ...state, isRecurring: action.isRecurring }

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
}

export function useBookingWizard(options: UseBookingWizardOptions = {}) {
  const { userId, initialState: overrides } = options

  // R5: Load mode from localStorage scoped per user (prevent preference leak between users)
  const storageKey = userId ? `${STORAGE_KEY_PREFIX}${userId}` : STORAGE_KEY_PREFIX
  const savedMode = (typeof window !== 'undefined'
    ? (localStorage.getItem(storageKey) as WizardMode | null)
    : null) ?? 'wizard'

  const [state, dispatch] = useReducer(
    wizardReducer,
    { ...createInitialState(savedMode), ...overrides }
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
