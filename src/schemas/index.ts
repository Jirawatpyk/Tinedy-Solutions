/**
 * Centralized Schema Exports
 *
 * Import all schemas from this file for consistency
 */

// Common Validators
export {
  emailSchema,
  phoneSchema,
  phoneOptionalSchema,
  passwordSchema,
  passwordOptionalSchema,
  nameSchema,
  nameOptionalSchema,
  urlSchema,
  positiveNumberSchema,
  nonNegativeNumberSchema,
  dateStringSchema,
  timeStringSchema,
  uuidSchema,
  uuidOptionalSchema,
} from './common.schema'

// Authentication Schemas
export {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  type LoginFormData,
  type RegisterFormData,
  type ForgotPasswordFormData,
  type ResetPasswordFormData,
  type ChangePasswordFormData,
} from './auth.schema'

// Address Schemas
export {
  fullAddressSchema,
  partialAddressSchema,
  thaiPostalCodeSchema,
  thaiProvinceSchema,
  thaiProvinceOptionalSchema,
  thaiProvinces,
  type FullAddress,
  type PartialAddress,
  type ThaiProvince,
} from './address.schema'

// Customer Schemas
export {
  customerCreateSchema,
  customerUpdateSchema,
  customerRegistrationSchema,
  relationshipLevelSchema,
  preferredContactMethodSchema,
  customerSourceSchema,
  type CustomerCreateFormData,
  type CustomerUpdateFormData,
  type CustomerRegistrationFormData,
} from './customer.schema'

// Booking Schemas
export {
  bookingCreateSchema,
  bookingUpdateSchema,
  recurringBookingSchema,
  paymentUpdateSchema,
  bookingStatusSchema,
  paymentStatusSchema,
  frequencySchema,
  recurringPatternSchema,
  type BookingCreateFormData,
  type BookingUpdateFormData,
  type RecurringBookingFormData,
  type PaymentUpdateFormData,
} from './booking.schema'

// Service Package V2 Schemas (Phase 3)
export {
  ServicePackageV2Schema,
  ServicePackageV2UpdateSchema,
  PackagePricingTierSchema,
  ServicePackageV2FormSchema,
  ServiceTypeEnum,
  PricingModelEnum,
  ServiceCategoryEnum,
  validateTiersNoOverlap,
  type ServicePackageV2FormData,
  type PackagePricingTierFormData,
  type ServicePackageV2CompleteFormData,
  type ServiceType,
  type PricingModel,
  type ServiceCategory,
} from './service-package-v2.schema'

// Staff Schemas (Phase 3)
export {
  StaffCreateSchema,
  StaffCreateWithSkillsSchema,
  StaffUpdateSchema,
  StaffUpdateWithSkillsSchema,
  ChangePasswordSchema as StaffChangePasswordSchema,
  UserRoleEnum,
  StaffRoleEnum,
  emailSchema as staffEmailSchema,
  phoneSchema as staffPhoneSchema,
  passwordSchema as staffPasswordSchema,
  type StaffCreateFormData,
  type StaffCreateWithSkills,
  type StaffUpdateFormData,
  type StaffUpdateWithSkills,
  type UserRole,
  type StaffRole,
  type ChangePasswordFormData as StaffChangePasswordFormData,
} from './staff.schema'

// Team Schemas (Phase 3)
export {
  TeamCreateSchema,
  TeamUpdateSchema,
  TeamCreateTransformSchema,
  TeamUpdateTransformSchema,
  AddTeamMemberSchema,
  UpdateTeamMemberRoleSchema,
  ToggleTeamMemberStatusSchema,
  BulkAddTeamMembersSchema,
  TeamMemberRoleEnum,
  validateNoDuplicateMember,
  validateMinimumMembers,
  type TeamCreateFormData,
  type TeamUpdateFormData,
  type TeamCreateData,
  type TeamUpdateData,
  type AddTeamMemberFormData,
  type UpdateTeamMemberRoleFormData,
  type ToggleTeamMemberStatusFormData,
  type BulkAddTeamMembersFormData,
  type TeamMemberRole,
} from './team.schema'

// Staff Availability Schemas (Phase 3)
export {
  StaffAvailabilityCreateSchema,
  StaffAvailabilityCreateTransformSchema,
  StaffAvailabilityUpdateSchema,
  StaffAvailabilityUpdateTransformSchema,
  BulkStaffAvailabilitySchema,
  AvailabilityReasonEnum,
  validateNotPastDate,
  validateNoTimeOverlap,
  timeToMinutes,
  type StaffAvailabilityCreateFormData,
  type StaffAvailabilityCreateData,
  type StaffAvailabilityUpdateFormData,
  type StaffAvailabilityUpdateData,
  type BulkStaffAvailabilityFormData,
  type AvailabilityReason,
} from './staff-availability.schema'

// Settings Schemas (Phase 5)
export {
  GeneralSettingsSchema,
  BookingSettingsSchema,
  NotificationSettingsSchema,
  GeneralSettingsTransformSchema,
  BookingSettingsTransformSchema,
  NotificationSettingsTransformSchema,
  CompleteSettingsSchema,
  TimeSlotDurationEnum,
  MinAdvanceBookingEnum,
  MaxBookingWindowEnum,
  CancellationHoursEnum,
  DepositPercentageEnum,
  ReminderHoursEnum,
  validateLogoFile,
  validateDepositPercentage,
  type GeneralSettingsFormData,
  type GeneralSettingsData,
  type BookingSettingsFormData,
  type BookingSettingsData,
  type NotificationSettingsFormData,
  type NotificationSettingsData,
  type CompleteSettingsFormData,
  type TimeSlotDuration,
  type MinAdvanceBooking,
  type MaxBookingWindow,
  type CancellationHours,
  type DepositPercentage,
  type ReminderHours,
} from './settings.schema'

// Profile Schemas (Phase 5)
export {
  ProfileUpdateSchema,
  PasswordChangeSchema,
  AvatarUpdateSchema,
  ProfileUpdateTransformSchema,
  AvatarUpdateTransformSchema,
  validateAvatarFile,
  validatePasswordStrength,
  type ProfileUpdateFormData,
  type ProfileUpdateData,
  type PasswordChangeFormData,
  type AvatarUpdateFormData,
  type AvatarUpdateData,
} from './profile.schema'

// ============================================================================
// API VALIDATION SCHEMAS (Phase 7)
// ============================================================================

// Booking API Schemas
export {
  BookingCreateRequestSchema,
  BookingUpdateRequestSchema,
  RecurringBookingCreateRequestSchema,
  BookingBaseResponseSchema,
  BookingResponseSchema,
  RecurringGroupResponseSchema,
  RecurringBookingCreateResponseSchema,
  BookingStatusEnum,
  PaymentStatusEnum,
  BookingSourceEnum,
  type BookingCreateRequest,
  type BookingUpdateRequest,
  type RecurringBookingCreateRequest,
  type BookingResponse,
  type BookingBaseResponse,
  type RecurringGroupResponse,
  type RecurringBookingCreateResponse,
  type BookingStatus,
  type PaymentStatus,
  type BookingSource,
} from './api/booking-api.schema'

// Customer API Schemas
export {
  CustomerCreateRequestSchema,
  CustomerUpdateRequestSchema,
  CustomerBaseResponseSchema,
  CustomerResponseSchema,
  CustomerListItemSchema,
  validateThaiPhone,
  validateLineId,
  type CustomerCreateRequest,
  type CustomerUpdateRequest,
  type CustomerResponse,
  type CustomerBaseResponse,
  type CustomerListItem,
  type CustomerBookingRelation,
} from './api/customer-api.schema'

// Staff API Schemas
export {
  StaffCreateRequestSchema,
  StaffUpdateRequestSchema,
  StaffBaseResponseSchema,
  StaffWithRatingsResponseSchema,
  StaffResponseSchema,
  StaffListItemSchema,
  StaffPerformanceStatsSchema,
  StaffRoleEnum as StaffApiRoleEnum,
  StaffStatusEnum,
  validateStaffNumber,
  validateSkill,
  type StaffCreateRequest,
  type StaffUpdateRequest,
  type StaffResponse,
  type StaffBaseResponse,
  type StaffWithRatingsResponse,
  type StaffListItem,
  type StaffPerformanceStats,
  type StaffRole as StaffApiRole,
  type StaffStatus,
  type StaffRatingRelation,
  type StaffBookingRelation,
} from './api/staff-api.schema'

// Team API Schemas
export {
  TeamCreateRequestSchema,
  TeamUpdateRequestSchema,
  TeamMemberAddRequestSchema,
  TeamMemberUpdateRequestSchema,
  TeamMemberRemoveRequestSchema,
  TeamBaseResponseSchema,
  TeamWithMembersResponseSchema,
  TeamResponseSchema,
  TeamListItemSchema,
  TeamPerformanceStatsSchema,
  TeamStatusEnum,
  TeamMemberRoleEnum as TeamApiMemberRoleEnum,
  validateTeamNumber,
  type TeamCreateRequest,
  type TeamUpdateRequest,
  type TeamMemberAddRequest,
  type TeamMemberUpdateRequest,
  type TeamMemberRemoveRequest,
  type TeamResponse,
  type TeamBaseResponse,
  type TeamWithMembersResponse,
  type TeamListItem,
  type TeamPerformanceStats,
  type TeamStatus,
  type TeamMemberRole as TeamApiMemberRole,
  type TeamMemberRelation,
  type TeamBookingRelation,
} from './api/team-api.schema'

// Package API Schemas
export {
  PackageV1ResponseSchema,
  PackageV2BaseResponseSchema,
  PackageV2ResponseSchema,
  PackageV2CreateRequestSchema,
  PackageV2UpdateRequestSchema,
  PricingTierSchema,
  PricingTierCreateRequestSchema,
  PricingTierUpdateRequestSchema,
  UnifiedPackageResponseSchema,
  PackageListItemSchema,
  PackageStatusEnum,
  PackageCategoryEnum,
  type PackageV1Response,
  type PackageV2Response,
  type PackageV2BaseResponse,
  type PackageV2CreateRequest,
  type PackageV2UpdateRequest,
  type PricingTier,
  type PricingTierCreateRequest,
  type PricingTierUpdateRequest,
  type UnifiedPackageResponse,
  type PackageListItem,
  type PackageStatus,
  type PackageCategory,
} from './api/package-api.schema'

// Dashboard API Schemas
export {
  DashboardStatsResponseSchema,
  TodayStatsResponseSchema,
  BookingsByStatusResponseSchema,
  TodayBookingsResponseSchema,
  DailyRevenueDataPointSchema,
  DailyRevenueResponseSchema,
  MonthlyRevenueDataPointSchema,
  MonthlyRevenueResponseSchema,
  StaffPerformanceDataSchema,
  StaffPerformanceResponseSchema,
  TeamPerformanceDataSchema,
  TeamPerformanceResponseSchema,
  CustomerAnalyticsDataSchema,
  TopCustomersResponseSchema,
  PackagePerformanceDataSchema,
  PackagePerformanceResponseSchema,
  type DashboardStatsResponse,
  type TodayStatsResponse,
  type BookingsByStatusResponse,
  type TodayBookingsResponse,
  type DailyRevenueDataPoint,
  type DailyRevenueResponse,
  type MonthlyRevenueDataPoint,
  type MonthlyRevenueResponse,
  type StaffPerformanceData,
  type StaffPerformanceResponse,
  type TeamPerformanceData,
  type TeamPerformanceResponse,
  type CustomerAnalyticsData,
  type TopCustomersResponse,
  type PackagePerformanceData,
  type PackagePerformanceResponse,
} from './api/dashboard-api.schema'

// Settings & Profile API Schemas
export {
  SettingsResponseSchema,
  GeneralSettingsUpdateRequestSchema,
  BookingSettingsUpdateRequestSchema,
  NotificationSettingsUpdateRequestSchema,
  ProfileResponseSchema,
  ProfileUpdateRequestSchema,
  PasswordChangeRequestSchema,
  AvatarUploadRequestSchema,
  AvatarUploadResponseSchema,
  SignInRequestSchema,
  SignUpRequestSchema,
  AuthSessionResponseSchema,
  PasswordResetRequestSchema,
  PasswordResetConfirmRequestSchema,
  type SettingsResponse,
  type GeneralSettingsUpdateRequest,
  type BookingSettingsUpdateRequest,
  type NotificationSettingsUpdateRequest,
  type ProfileResponse,
  type ProfileUpdateRequest,
  type PasswordChangeRequest,
  type AvatarUploadRequest,
  type AvatarUploadResponse,
  type SignInRequest,
  type SignUpRequest,
  type AuthSessionResponse,
  type PasswordResetRequest,
  type PasswordResetConfirmRequest,
} from './api/settings-api.schema'
