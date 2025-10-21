# 🎯 EPIC: Customer Management System Enhancement

## 📋 Overview
Enhance the customer management system to better track customer relationships, preferences, and business value for Tinedy CRM. This epic focuses on building a comprehensive customer profile with contact preferences, relationship tracking, and business insights.

---

## 🎨 Design Philosophy
- **Customer-Centric**: Focus on building strong customer relationships
- **Data-Driven**: Track metrics that matter for business decisions
- **Communication-Friendly**: Support Thai business communication preferences (LINE, Phone, Email)
- **Value Tracking**: Understand customer lifetime value and loyalty

---

## 📊 Current State vs Target State

### Current State ✅
- Basic customer information (name, email, phone, address)
- Simple search functionality
- Create/Edit/Delete operations
- Notes field
- Stats cards (Total, Complete Profiles, New This Month)

### Target State 🎯
- Enhanced contact information with LINE ID
- Relationship level tracking (New, Regular, VIP, Inactive)
- Preferred contact method
- Customer tags/categories
- Booking history integration
- Lifetime value calculation
- Purchase patterns analysis
- Customer detail page with comprehensive insights

---

## 🚀 Phase 1: Enhanced Customer Profile

### Objectives
- Add Thai-specific contact methods (LINE ID)
- Track customer relationship levels
- Understand preferred communication channels
- Improve customer categorization

### Database Changes

```sql
-- Add new columns to customers table
ALTER TABLE customers
ADD COLUMN line_id VARCHAR(100),
ADD COLUMN relationship_level VARCHAR(20) DEFAULT 'new' CHECK (relationship_level IN ('new', 'regular', 'vip', 'inactive')),
ADD COLUMN preferred_contact_method VARCHAR(20) DEFAULT 'phone' CHECK (preferred_contact_method IN ('phone', 'email', 'line', 'sms')),
ADD COLUMN tags TEXT[], -- Array of customer tags
ADD COLUMN source VARCHAR(50), -- How they found us (referral, social media, website, etc.)
ADD COLUMN birthday DATE,
ADD COLUMN company_name VARCHAR(255),
ADD COLUMN tax_id VARCHAR(50);

-- Add indexes
CREATE INDEX idx_customers_relationship_level ON customers(relationship_level);
CREATE INDEX idx_customers_preferred_contact ON customers(preferred_contact_method);
CREATE INDEX idx_customers_tags ON customers USING GIN(tags);

-- Add comments
COMMENT ON COLUMN customers.line_id IS 'Customer LINE ID for Thai market';
COMMENT ON COLUMN customers.relationship_level IS 'Customer relationship status: new, regular, vip, inactive';
COMMENT ON COLUMN customers.preferred_contact_method IS 'Preferred way to contact customer';
COMMENT ON COLUMN customers.tags IS 'Customer tags for categorization';
COMMENT ON COLUMN customers.source IS 'How the customer found the business';
```

### UI Components

#### 1. Enhanced Customer Form
**Fields to Add:**
- LINE ID (optional)
- Relationship Level (dropdown: New, Regular, VIP, Inactive)
- Preferred Contact Method (dropdown: Phone, Email, LINE, SMS)
- Tags (multi-select chips)
- Source (dropdown: Referral, Facebook, Instagram, Google, Walk-in, Other)
- Birthday (date picker)
- Company Name (optional)
- Tax ID (optional for corporate customers)

**Form Layout:**
```
┌─────────────────────────────────────────────┐
│ Personal Information                         │
├─────────────────────────────────────────────┤
│ [Full Name*]          [Email*]              │
│ [Phone*]              [LINE ID]             │
│ [Birthday]            [Company Name]        │
│ [Tax ID]                                    │
├─────────────────────────────────────────────┤
│ Relationship & Contact                      │
├─────────────────────────────────────────────┤
│ [Relationship Level▾]  [Contact Method▾]   │
│ [Source▾]                                   │
│ [Tags: ○ VIP ○ Corporate ○ Repeat +]       │
├─────────────────────────────────────────────┤
│ Address Information                         │
├─────────────────────────────────────────────┤
│ [Address]                                   │
│ [City]    [State]    [Zip Code]            │
├─────────────────────────────────────────────┤
│ Additional Notes                            │
├─────────────────────────────────────────────┤
│ [Notes textarea]                            │
└─────────────────────────────────────────────┘
```

#### 2. Enhanced Customer Cards
**Visual Improvements:**
- Relationship level badge (color-coded)
  - 🆕 New: Gray
  - 💚 Regular: Green
  - 👑 VIP: Gold
  - 💤 Inactive: Red
- Contact method icons (Phone, Email, LINE, SMS)
- Tags as colored chips
- Quick action buttons (Call, Email, LINE message)

#### 3. Enhanced Stats Cards
**Additional Metrics:**
- VIP Customers
- Active Customers (Last 90 days)
- Average Customer Value
- Top Contact Method

---

## 🚀 Phase 2: Customer Detail Page

### Objectives
- Create dedicated customer profile page
- Display booking history
- Calculate and show lifetime value
- Track customer engagement

### Features

#### 1. Customer Profile Header
```
┌──────────────────────────────────────────────────────┐
│ 👤 John Doe                    [Edit] [Delete]       │
│ 👑 VIP Customer                                      │
│ 📱 +66-XX-XXX-XXXX  ✉️ john@email.com  💬 @johndoe  │
│ 🎂 Birthday: Jan 15  📍 Bangkok                      │
│ 🏷️ [VIP] [Corporate] [Repeat Customer]              │
└──────────────────────────────────────────────────────┘
```

#### 2. Customer Metrics Overview (4 Cards)
```
┌─────────────────────────────────────────────────────────────┐
│ Lifetime Value  │ Total Bookings │ Last Booking │ Join Date │
│   ฿45,000       │      12        │  2 days ago  │ Jan 2024  │
└─────────────────────────────────────────────────────────────┘
```

#### 3. Booking History Section
**Table showing:**
- Booking ID
- Service
- Staff assigned
- Date & Time
- Status (Completed, Cancelled, No-show)
- Amount
- Notes

**Features:**
- Filter by status, date range
- Search bookings
- Quick actions (View details, Rebook)
- Export to PDF/Excel

#### 4. Communication Timeline
**Activity feed showing:**
- Bookings created
- Calls made
- Emails sent
- LINE messages
- Notes added
- Profile updates

#### 5. Analytics Tab
**Charts and Insights:**
- Booking frequency chart (monthly/quarterly)
- Preferred services pie chart
- Spending trends line chart
- Visit patterns (day of week, time preferences)
- Average booking value
- Cancellation rate

#### 6. Quick Actions Sidebar
```
┌────────────────────┐
│ Quick Actions      │
├────────────────────┤
│ 📅 New Booking    │
│ 📞 Call Customer  │
│ ✉️  Send Email    │
│ 💬 LINE Message   │
│ 📝 Add Note       │
│ 🎁 Send Promotion │
└────────────────────┘
```

### Database Views for Customer Analytics

```sql
-- Create view for customer lifetime value
CREATE OR REPLACE VIEW customer_lifetime_value AS
SELECT
  c.id,
  c.full_name,
  COUNT(b.id) as total_bookings,
  COALESCE(SUM(sp.price), 0) as lifetime_value,
  MAX(b.booking_date) as last_booking_date,
  MIN(b.booking_date) as first_booking_date,
  COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
  COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
  COUNT(CASE WHEN b.status = 'no_show' THEN 1 END) as no_show_bookings
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
LEFT JOIN service_packages sp ON b.service_id = sp.id
GROUP BY c.id, c.full_name;

-- Create view for customer engagement score
CREATE OR REPLACE VIEW customer_engagement AS
SELECT
  c.id,
  c.full_name,
  c.relationship_level,
  CASE
    WHEN MAX(b.booking_date) >= CURRENT_DATE - INTERVAL '30 days' THEN 'active'
    WHEN MAX(b.booking_date) >= CURRENT_DATE - INTERVAL '90 days' THEN 'at_risk'
    WHEN MAX(b.booking_date) < CURRENT_DATE - INTERVAL '90 days' THEN 'inactive'
    ELSE 'new'
  END as engagement_status,
  COUNT(b.id) as booking_count_90_days
FROM customers c
LEFT JOIN bookings b ON c.id = b.customer_id
  AND b.booking_date >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY c.id, c.full_name, c.relationship_level;
```

---

## 🚀 Phase 3: Advanced Features

### 1. Customer Segmentation
**Automatic Categorization:**
- New Customer (0-2 bookings)
- Regular Customer (3-10 bookings)
- VIP Customer (10+ bookings OR high lifetime value)
- Inactive Customer (No booking in 90+ days)
- At-Risk Customer (No booking in 60-90 days)

### 2. Customer Tags System
**Pre-defined Tags:**
- 🎯 Behavior: VIP, Regular, First-timer, Returner
- 💼 Type: Corporate, Individual, Walk-in
- 🎁 Marketing: Newsletter, Promotion, Birthday-reminder
- ⚠️ Notes: Special-needs, Payment-issue, Complaint
- ⭐ Value: High-value, Medium-value, Low-value

**Custom Tags:**
- Allow creating custom tags
- Color coding
- Filter customers by tags

### 3. Customer Import/Export
**Features:**
- Import from CSV/Excel
- Export filtered customers
- Bulk update operations
- Data validation

### 4. Customer Communication Hub
**Features:**
- Email templates for different scenarios
- LINE message templates
- SMS notifications
- Birthday/anniversary reminders
- Promotional campaign targeting
- Communication history tracking

### 5. Customer Loyalty Program (Future)
**Features:**
- Points system
- Rewards tiers
- Referral tracking
- Special promotions for VIP
- Birthday discounts

---

## 📋 Implementation Checklist

### Phase 1: Enhanced Profile ✅ (Current Focus)
- [ ] Database migration for new fields
- [ ] Update customer form with new fields
- [ ] Add LINE ID input
- [ ] Add relationship level dropdown
- [ ] Add preferred contact method dropdown
- [ ] Add tags multi-select
- [ ] Add source dropdown
- [ ] Add birthday picker
- [ ] Add company name & tax ID fields
- [ ] Update customer cards with badges
- [ ] Add filter by relationship level
- [ ] Add filter by tags
- [ ] Update stats cards with new metrics

### Phase 2: Customer Detail Page
- [ ] Create customer detail route
- [ ] Design customer profile header component
- [ ] Create metrics overview cards
- [ ] Build booking history table
- [ ] Implement booking filters & search
- [ ] Create communication timeline
- [ ] Build analytics charts
- [ ] Add quick actions sidebar
- [ ] Implement customer lifetime value calculation
- [ ] Create database views for analytics

### Phase 3: Advanced Features
- [ ] Implement automatic customer segmentation
- [ ] Build tags management system
- [ ] Create import/export functionality
- [ ] Design communication hub
- [ ] Build email template system
- [ ] Implement LINE integration
- [ ] Create SMS notification system
- [ ] Build birthday reminder automation

---

## 🎨 UI/UX Mockups

### Customer List Page (Enhanced)
```
┌────────────────────────────────────────────────────────────┐
│ Customers                                    [+ New Customer]│
├────────────────────────────────────────────────────────────┤
│ Stats Cards Row                                            │
│ [Total: 150] [VIP: 25] [Active: 120] [Avg Value: ฿2,500] │
├────────────────────────────────────────────────────────────┤
│ Filters & Search                                           │
│ [🔍 Search...] [Level▾] [Tags▾] [Contact Method▾]        │
├────────────────────────────────────────────────────────────┤
│ Customer Cards Grid                                        │
│ ┌───────────┐ ┌───────────┐ ┌───────────┐                │
│ │ 👑 VIP    │ │ 💚 Regular│ │ 🆕 New    │                │
│ │ John Doe  │ │ Jane Smith│ │ Bob Lee   │                │
│ │ ฿45,000   │ │ ฿12,500   │ │ ฿2,000    │                │
│ │ 12 visits │ │ 5 visits  │ │ 1 visit   │                │
│ └───────────┘ └───────────┘ └───────────┘                │
└────────────────────────────────────────────────────────────┘
```

### Customer Detail Page
```
┌────────────────────────────────────────────────────────────┐
│ ← Back to Customers                                        │
├────────────────────────────────────────────────────────────┤
│ Profile Header                                             │
│ 👤 John Doe                           [Edit] [Delete]     │
│ 👑 VIP Customer  📱 +66-XX  ✉️ john@email.com  💬 LINE    │
├────────────────────────────────────────────────────────────┤
│ Metrics                                                    │
│ [฿45,000] [12 Bookings] [2 days ago] [Member since Jan]  │
├────────────────────────────────────────────────────────────┤
│ Tabs: [Overview] [Bookings] [Analytics] [Communications]  │
├────────────────────────────────────────────────────────────┤
│ Content Area                                               │
│                                                            │
│ [Booking History Table / Charts / Timeline]               │
│                                                            │
├────────────────────────────────────────────────────────────┤
│ Sidebar: Quick Actions                                    │
│ [📅 New Booking] [📞 Call] [✉️ Email] [💬 LINE]           │
└────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Technical Considerations

### Frontend
- Create new components:
  - `CustomerForm` (enhanced)
  - `CustomerCard` (enhanced)
  - `CustomerDetail` (new page)
  - `BookingHistory` component
  - `CustomerAnalytics` component
  - `CommunicationTimeline` component
  - `TagSelector` component
  - `RelationshipLevelBadge` component

### Backend/Database
- New columns in `customers` table
- Create database views for analytics
- Optimize queries for customer detail page
- Add indexes for performance

### Integration Points
- Bookings system (for history and value calculation)
- Service packages (for pricing)
- Communication systems (Email, LINE, SMS)
- Calendar (for scheduling)

---

## 📈 Success Metrics

### Phase 1
- ✅ All customer fields captured
- ✅ 80%+ customers have contact preference set
- ✅ Relationship levels assigned to all customers
- ✅ Improved data quality (addresses, LINE IDs)

### Phase 2
- ✅ Customer detail page load time < 2 seconds
- ✅ Lifetime value calculation accuracy
- ✅ Complete booking history visible
- ✅ Analytics provide actionable insights

### Phase 3
- ✅ Automated customer segmentation working
- ✅ 50%+ reduction in manual customer updates
- ✅ Communication hub used for customer outreach
- ✅ Improved customer retention rate

---

## 🎯 Business Value

### For Business Owners
- Better understand customer value and loyalty
- Identify VIP customers automatically
- Target marketing based on segments
- Reduce customer churn with at-risk alerts
- Improve customer communication

### For Staff
- Quick access to customer history
- Better preparation for appointments
- Easy contact customer preferences
- Faster customer service

### For Customers
- Personalized service based on preferences
- Preferred communication method honored
- Special treatment for loyalty
- Better experience overall

---

## 📅 Estimated Timeline

| Phase | Duration | Priority |
|-------|----------|----------|
| Phase 1: Enhanced Profile | 1 week | 🔴 High |
| Phase 2: Detail Page | 2 weeks | 🟡 Medium |
| Phase 3: Advanced Features | 3-4 weeks | 🟢 Low |

**Total Estimated Time: 6-7 weeks**

---

## 🚧 Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data migration issues | High | Test migration on staging, backup data |
| Performance with large datasets | Medium | Use pagination, optimize queries, add indexes |
| LINE API integration complexity | Medium | Start with manual LINE contact, add integration later |
| User adoption of new fields | Low | Make critical fields required, provide training |

---

## 📚 Related Epics
- EPIC_BOOKING_SYSTEM.md (for booking history integration)
- EPIC_CHAT_SYSTEM.md (for customer communications)
- Future: EPIC_MARKETING_AUTOMATION.md
- Future: EPIC_LOYALTY_PROGRAM.md

---

## 🎉 Conclusion

This epic transforms the basic customer management into a comprehensive CRM that truly understands and serves Thai business needs. By tracking LINE IDs, relationship levels, and lifetime value, Tinedy CRM will help businesses build stronger customer relationships and make data-driven decisions.

**Next Steps:**
1. Review and approve this epic
2. Create detailed tickets for Phase 1
3. Design UI mockups for new components
4. Begin database migration planning
5. Start implementation! 🚀
