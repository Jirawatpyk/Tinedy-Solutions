# EPIC: Booking Management System

## Overview
Comprehensive booking management system for Tinedy CRM to handle service bookings, scheduling, status tracking, and booking lifecycle management.

---

## Current State (Baseline)

### Existing Features
- ✅ Basic booking list page with table view
- ✅ Create booking from Customer Detail page
- ✅ Auto-calculate end_time from service duration
- ✅ Status tracking (pending, confirmed, in_progress, completed, cancelled, no_show)
- ✅ Calendar view with booking dots
- ✅ Service package integration
- ✅ Staff assignment

### Current Limitations
- ❌ No bulk actions (bulk status update, bulk delete)
- ❌ No advanced filtering (by date range, status, service type, customer)
- ❌ No booking detail view/modal
- ❌ No edit booking functionality
- ❌ No booking conflicts detection
- ❌ No recurring bookings
- ❌ No booking reminders/notifications
- ❌ No payment tracking integration
- ❌ No booking analytics/reports

---

## Phase 1: Enhanced Booking Management (High Priority)

### 1.1 Advanced Filtering & Search
**User Story:** As an admin, I want to filter bookings by multiple criteria so I can quickly find specific bookings.

**Features:**
- Date range picker (From - To)
- Status filter (multi-select: Pending, Confirmed, In Progress, Completed, Cancelled, No Show)
- Service type filter (Cleaning, Training)
- Customer search (by name/email/phone)
- Staff filter (assigned staff member)
- Team filter (assigned team)
- Quick filters: "Today", "This Week", "This Month", "Overdue"

**Technical Notes:**
- Use Radix UI Popover for date range picker
- Implement URL query parameters for shareable filters
- Add "Clear All Filters" button
- Show active filter count badge

---

### 1.2 Booking Detail Modal/Drawer
**User Story:** As an admin, I want to view full booking details in a modal so I can see all information without navigating away.

**Features:**
- Click on booking row to open detail view
- Display all booking information:
  - Customer details with link to profile
  - Service package details
  - Date, start time, end time
  - Status with colored badge
  - Assigned staff/team
  - Location/address
  - Notes
  - Price
  - Created/Updated timestamps
- Quick actions in modal:
  - Edit booking
  - Change status
  - Assign/reassign staff
  - Add notes
  - Delete booking

**Technical Notes:**
- Use Dialog component (can switch to Drawer for better mobile UX)
- Fetch full booking details on open
- Include customer avatar/photo if available

---

### 1.3 Edit Booking Functionality
**User Story:** As an admin, I want to edit existing bookings so I can make changes without deleting and recreating.

**Features:**
- Edit all booking fields:
  - Date, start time (end time auto-calculated)
  - Service package
  - Customer
  - Staff/Team assignment
  - Status
  - Notes
  - Address
- Validation:
  - Check for conflicts when changing date/time
  - Prevent overlapping bookings for same staff
- Audit trail: Log all booking changes

**Technical Notes:**
- Reuse booking form component
- Add conflict detection query
- Update audit_logs table on edit
- Show warning if editing a completed booking

---

### 1.4 Bulk Actions
**User Story:** As an admin, I want to perform actions on multiple bookings at once to save time.

**Features:**
- Select multiple bookings (checkbox)
- Bulk status update
- Bulk delete (with confirmation)
- Bulk export to CSV
- Select all / Deselect all
- Show count of selected bookings

**Technical Notes:**
- Add checkbox column to table
- Use array state for selected IDs
- Show bulk action toolbar when items selected
- Batch database updates for performance

---

### 1.5 Booking Conflicts Detection
**User Story:** As an admin, I want to be warned about booking conflicts so I can avoid double-booking staff.

**Features:**
- Real-time conflict check when creating/editing
- Show warning if:
  - Staff already has booking at same time
  - Team already assigned at same time (if team mode)
- Display conflicting bookings in warning message
- Allow override with confirmation

**Technical Notes:**
- Query bookings table for overlapping time ranges
- Check: `(new_start < existing_end) AND (new_end > existing_start)`
- Exclude cancelled/no_show bookings from conflict check
- Consider buffer time between bookings (configurable)

---

## Phase 2: Advanced Features (Medium Priority)

### 2.1 Booking Status Workflow
**User Story:** As an admin, I want a clear status workflow so bookings progress through logical stages.

**Features:**
- Status transition rules:
  - Pending → Confirmed, Cancelled
  - Confirmed → In Progress, Cancelled, No Show
  - In Progress → Completed, Cancelled
  - Completed → (final state)
  - Cancelled → (final state)
- Quick status change buttons in booking list
- Status change confirmation dialogs
- Automatic status update based on time:
  - Auto-confirm bookings X hours before start
  - Auto-mark as no-show if not confirmed Y minutes after start time

**Technical Notes:**
- Add status validation in backend
- Create database trigger or cron job for auto-status updates
- Log status changes in audit_logs

---

### 2.2 Payment Integration
**User Story:** As an admin, I want to track payment status with bookings so I know which bookings are paid.

**Features:**
- Payment status field: Unpaid, Partial, Paid, Refunded
- Payment method: Cash, Card, Bank Transfer, Line Pay, PromptPay
- Amount paid / Amount due
- Payment date
- Payment notes
- Filter bookings by payment status
- Quick "Mark as Paid" button

**Database Changes:**
```sql
ALTER TABLE bookings ADD COLUMN payment_status TEXT CHECK (payment_status IN ('unpaid', 'partial', 'paid', 'refunded')) DEFAULT 'unpaid';
ALTER TABLE bookings ADD COLUMN payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'bank_transfer', 'line_pay', 'promptpay'));
ALTER TABLE bookings ADD COLUMN amount_paid DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE bookings ADD COLUMN payment_date DATE;
ALTER TABLE bookings ADD COLUMN payment_notes TEXT;
```

---

### 2.3 Recurring Bookings
**User Story:** As an admin, I want to create recurring bookings so I don't have to manually create repeated appointments.

**Features:**
- Recurrence patterns:
  - Daily (every X days)
  - Weekly (specific days of week)
  - Monthly (same day each month)
  - Custom pattern
- End conditions:
  - After X occurrences
  - Until specific date
  - Never (manual stop)
- Edit options:
  - Edit single occurrence
  - Edit this and future occurrences
  - Edit all occurrences
- Display recurring series badge

**Database Changes:**
```sql
CREATE TABLE booking_series (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id),
  service_package_id UUID NOT NULL REFERENCES service_packages(id),
  staff_id UUID REFERENCES profiles(id),
  recurrence_pattern JSONB NOT NULL, -- {type: 'weekly', days: [1,3,5], interval: 1}
  start_date DATE NOT NULL,
  end_date DATE,
  max_occurrences INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE bookings ADD COLUMN series_id UUID REFERENCES booking_series(id);
ALTER TABLE bookings ADD COLUMN is_recurring BOOLEAN DEFAULT false;
```

---

### 2.4 Booking Analytics Dashboard
**User Story:** As an admin, I want to see booking analytics so I can understand business performance.

**Features:**
- KPI cards:
  - Total bookings (this month)
  - Confirmed bookings
  - Completion rate (%)
  - No-show rate (%)
  - Revenue (from completed bookings)
  - Average booking value
- Charts:
  - Bookings by day/week/month (line chart)
  - Bookings by status (pie chart)
  - Bookings by service type (bar chart)
  - Revenue trend (area chart)
- Date range selector
- Export analytics to PDF

**Technical Notes:**
- Create new `/admin/booking-analytics` route
- Use Recharts for visualization
- Calculate metrics from customer_lifetime_value view
- Add caching for performance

---

## Phase 3: Automation & Notifications (Low Priority)

### 3.1 Booking Reminders
**User Story:** As an admin, I want automatic reminders sent to customers so they don't forget their appointments.

**Features:**
- Automated reminders via:
  - Email
  - SMS (if phone number provided)
  - LINE (if LINE ID provided)
- Reminder schedule:
  - 24 hours before booking
  - 2 hours before booking
  - Custom reminder times (configurable)
- Reminder content:
  - Booking details
  - Service, date, time
  - Location
  - Confirmation link / Cancel link
- Manual "Send Reminder Now" button

**Technical Notes:**
- Requires external service (SendGrid for email, Twilio for SMS, LINE Messaging API)
- Create background job/cron for scheduled reminders
- Store reminder status in bookings table
- Add `reminders_sent` JSONB column to track sent reminders

---

### 3.2 Customer Self-Service Booking
**User Story:** As a customer, I want to book appointments online so I don't have to call.

**Features:**
- Public booking page
- Available time slots (check staff availability)
- Service selection
- Customer login or guest checkout
- Email confirmation
- Booking confirmation page

**Technical Notes:**
- Create new public routes (outside admin)
- Implement staff availability checking
- Add RLS policies for public access
- Create booking_settings table for business hours

---

### 3.3 Waitlist Management
**User Story:** As an admin, I want to manage a waitlist for fully booked time slots.

**Features:**
- Add customer to waitlist if time slot full
- Automatic notification when slot becomes available
- Waitlist priority queue
- Convert waitlist entry to booking

---

## Technical Requirements

### Database Indexes
```sql
-- Performance optimization
CREATE INDEX idx_bookings_date ON bookings(booking_date);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_staff ON bookings(staff_id);
CREATE INDEX idx_bookings_service ON bookings(service_package_id);
CREATE INDEX idx_bookings_date_time ON bookings(booking_date, start_time);
```

### RLS Policies
- Admin: Full access to all bookings
- Staff: Read own assigned bookings + create/update status
- Customer (future): Read own bookings only

---

## Implementation Roadmap

### Sprint 1 (Week 1-2): Foundation ✅ COMPLETED
- [x] Advanced filtering UI
- [x] Booking detail modal
- [x] Edit booking functionality

### Sprint 2 (Week 3-4): Enhancements ✅ COMPLETED
- [x] Bulk actions (select, bulk update, bulk delete, bulk export)
- [x] Conflict detection (real-time check with warning dialog)
- [x] Status workflow (transition validation + confirmation dialogs)

### Sprint 3 (Week 5-6): Analytics ⏸️ PARTIALLY COMPLETED
- [x] Payment integration (payment fields, mark as paid, payment status badge)
- [ ] Booking analytics dashboard (CANCELLED - using Reports & Analytics instead)
- [x] Export features (CSV export for selected bookings)

### Sprint 4 (Week 7-8): Automation ⏳ IN PROGRESS

#### Phase 2.3: Recurring Bookings ⏳ PENDING
- [ ] Create `booking_series` table schema
- [ ] Add `series_id` and `is_recurring` columns to bookings table
- [ ] Build recurrence pattern UI (Daily, Weekly, Monthly)
- [ ] Implement end conditions (After X occurrences, Until date, Never)
- [ ] Create recurring booking generator function
- [ ] Add "Edit series" options (single, this and future, all)
- [ ] Display recurring series badge in booking list

#### Phase 3.1: Booking Reminders ✅ MVP COMPLETED
**Database Changes:**
- [ ] Add `reminders_sent` JSONB column to bookings table (Future: auto-reminders)
- [ ] Add `reminder_settings` JSONB column to bookings table (Future: custom schedules)
- [ ] Create `booking_reminders` table for reminder logs (Future: tracking)

**Backend/API:**
- [x] Set up email service integration (Resend)
- [x] Create email template for booking reminders
- [ ] Build reminder scheduling logic (24h, 2h before) (Future: automated scheduling)
- [ ] Implement cron job / background task for auto-reminders (Future)
- [x] Add manual send reminder functionality

**Frontend UI:**
- [x] Add "Send Reminder" button in booking detail modal
- [ ] Add reminder status badge/indicator in booking list (Future)
- [ ] Create reminder settings panel (enable/disable, custom times) (Future)
- [ ] Show reminder history/logs in booking detail (Future)
- [x] Add toast notifications for sent reminders

**Features:**
- [x] Email reminder template with booking details (HTML template with Tinedy branding)
- [ ] Include confirmation/cancel links in email (Future)
- [ ] Track reminder delivery status (Future)
- [x] Manual "Send Reminder Now" functionality
- [ ] Configurable reminder schedule per booking (Future: automation)

**MVP Completed Features:**
- ✅ Manual email reminder sending via "Send Reminder" button
- ✅ Professional HTML email template with booking details
- ✅ Resend email service integration
- ✅ Toast notifications for success/error feedback
- ✅ Responsive Quick Actions layout (4 buttons in single row)

#### Phase 3.2: Customer Self-Service ⏳ PENDING
- [ ] Create public booking page routes
- [ ] Build staff availability checker
- [ ] Implement time slot selection UI
- [ ] Add customer authentication (login/guest)
- [ ] Email confirmation flow
- [ ] RLS policies for public access

---

## Success Metrics
- Reduce time to create booking by 50%
- Reduce double-booking incidents to 0
- Increase booking confirmation rate to >90%
- Reduce no-show rate to <5%
- Customer satisfaction score >4.5/5

---

## Dependencies
- Radix UI components (Dialog, Popover, Checkbox)
- Date picker library (react-day-picker or date-fns)
- Email service (SendGrid or similar)
- SMS service (Twilio - optional)
- LINE Messaging API (optional)

---

## Notes
- Start with Phase 1 - focus on core booking management
- Payment integration can be simplified initially (just track status, not process payments)
- Recurring bookings is complex - consider as Phase 2.5 after user feedback
- Customer self-service booking requires separate authentication system - deprioritize for now
