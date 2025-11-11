# 🎯 Migration Scope: Cleaning Service Tiered Pricing

**Project**: Tinedy CRM - Service Packages V2
**Date**: 2025-01-11
**Scope**: Cleaning Service Only
**Status**: Planning Phase

---

## 📋 Scope Summary

### ✅ In Scope (Cleaning Service)

#### 1. Service Categories
- **Deep Cleaning Office** - 5 tiers (0-100, 101-200, 201-300, 301-400, 401-500 ตร.ม.)
- **Deep Cleaning Condo** - 5 tiers (0-90, 91-150, 151-250, 251-350, 351-450 ตร.ม.)
- **Deep Cleaning House** (if needed) - TBD

#### 2. Pricing Structure
- Area-based tiers (ตารางเมตร)
- Frequency options: 1, 2, 4, 8 times/month
- Each tier includes:
  - Area range (min-max)
  - Required staff count
  - Price for each frequency
  - Estimated hours

#### 3. Database Changes
- ✅ Create `service_packages_v2` table
- ✅ Create `package_pricing_tiers` table
- ✅ Add `area_sqm`, `frequency`, `calculated_price` to `bookings` table
- ✅ Helper functions for price calculation
- ✅ Migration script from V1 to V2

#### 4. UI Components
- ✅ Package management with tier editor
- ✅ Booking form with area/frequency inputs
- ✅ Auto-calculate price display
- ✅ Staff count suggestion
- ✅ Updated package list view

#### 5. Business Logic
- ✅ Price calculation based on area + frequency
- ✅ Staff requirement calculation
- ✅ Tier validation (no gaps, no overlaps)
- ✅ Backward compatibility with fixed pricing

---

### ❌ Out of Scope (Not Included)

#### 1. Training Service
- ⏸️ Training packages migration (future phase)
- ⏸️ Training-specific fields
- ⏸️ Different pricing model for training
- **Note**: Structure remains in database but not actively used

#### 2. Advanced Features
- ⏸️ Dynamic pricing based on time/season
- ⏸️ Promotional codes/discounts
- ⏸️ Package bundles
- ⏸️ Subscription management
- ⏸️ Automated price adjustments

#### 3. External Integrations
- ⏸️ Payment gateway integration
- ⏸️ SMS notifications for bookings
- ⏸️ Email reminders
- ⏸️ Third-party scheduling systems

#### 4. Customer Portal
- ⏸️ Self-service booking (customer side)
- ⏸️ Customer package selection
- ⏸️ Online payment

---

## 🎯 Success Criteria

### Must Have ✅
1. All existing Cleaning packages migrated to V2 format
2. Tiered pricing works accurately for all tiers
3. Booking form calculates price correctly
4. No data loss during migration
5. Staff portal shows area information
6. Reports include frequency data
7. Mobile-responsive UI
8. Page load time < 3 seconds

### Should Have 🟡
1. Bulk tier import (Excel/CSV)
2. Package templates
3. Duplicate package functionality
4. Export package pricing table
5. Package usage statistics

### Nice to Have 🔵
1. Pricing simulator/calculator
2. Visual tier editor with drag-drop
3. Price comparison between frequencies
4. Historical pricing data

---

## 📊 Data Migration Strategy

### Current Cleaning Packages (Example)

Assume we have:
```
- Basic Cleaning (Condo) - 2,500 บาท, 120 min
- Deep Cleaning (Office) - 4,500 บาท, 240 min
- Premium Cleaning (House) - 6,000 บาท, 360 min
```

### Migration Approach

**Option 1: Convert to Single Tier** (Safe but limited)
- Create one tier: 0-999999 ตร.ม.
- Use existing price as `price_1_time`
- Set `pricing_model = 'fixed'`
- ✅ Safe, no data loss
- ❌ Not utilizing new tiered system

**Option 2: Create Default Tiers** (Recommended)
- Create reasonable tiers based on typical sizes
- Distribute existing price across tiers
- Allow admin to adjust later
- ✅ Start using tiered system immediately
- ✅ Can be refined over time

**Option 3: Start Fresh** (Clean slate)
- Don't migrate old packages
- Create new tiered packages from scratch
- Keep old bookings referencing old packages
- ✅ Clean implementation
- ❌ Lose historical pricing data

**Recommended: Option 2**

---

## ⚠️ Known Limitations

### Technical Limitations
1. **Area Validation**: No automatic floor plan measurement
2. **Staff Scheduling**: Manual assignment (no auto-optimization)
3. **Frequency Enforcement**: System doesn't track if customer books correct frequency
4. **Price Changes**: No historical pricing (always uses current tier pricing)

### Business Limitations
1. **Fixed Tiers**: Can't do custom pricing per customer easily
2. **Area Verification**: Relies on customer input (no validation)
3. **Partial Areas**: What if customer wants 155 ตร.ม. but tier is 151-250?
4. **Mixed Services**: Can't combine multiple packages in one booking

### User Experience Limitations
1. **Complex UI**: Tier editor might be overwhelming for new admins
2. **Mobile Input**: Entering many tiers on mobile is tedious
3. **Price Transparency**: Customers don't see why prices change across tiers

---

## 🗓️ Phased Rollout Plan

### Phase 1: Core Implementation (This Migration)
- Week 1: Database + Types + Basic UI
- Week 2: Package Management + Booking Form
- Week 3: Testing + Bug Fixes
- Week 4: Documentation + Training

### Phase 2: Refinements (1-2 months later)
- Add bulk import functionality
- Enhanced reports with tier analysis
- Package templates
- Mobile UX improvements

### Phase 3: Training Service (3-6 months later)
- Design Training pricing model
- Implement Training-specific features
- Migrate or create Training packages
- Training booking flow

### Phase 4: Advanced Features (6-12 months later)
- Dynamic pricing
- Promotional system
- Customer portal
- Integration with external systems

---

## 📝 Post-Migration Checklist

After completing migration, verify:

### Data Integrity
- [ ] All cleaning packages migrated
- [ ] All bookings preserved
- [ ] No orphaned records
- [ ] Price calculations match manual calculations
- [ ] Staff requirements are reasonable

### Functionality
- [ ] Can create new tiered package
- [ ] Can edit existing tier
- [ ] Can delete tier (if no bookings)
- [ ] Booking form calculates price correctly
- [ ] Dashboard shows correct revenue
- [ ] Reports include new fields

### User Acceptance
- [ ] Admin can manage packages easily
- [ ] Staff can view booking details
- [ ] Price calculation is transparent
- [ ] Mobile UI is usable
- [ ] No confusion about area input

### Performance
- [ ] Page load < 3 seconds
- [ ] Price calculation < 500ms
- [ ] Database queries optimized
- [ ] No N+1 query problems

### Documentation
- [ ] User guide updated
- [ ] Admin training completed
- [ ] CLAUDE.md updated
- [ ] API documentation updated

---

## 🔍 Future Considerations

### When to Add Training Service

Consider adding Training service when:
1. Business requirements are clear
2. Training pricing model is defined
3. Cleaning migration is stable (3+ months)
4. User feedback collected

### Potential Training Requirements
- Per-person pricing vs per-session
- Training topics/categories
- Trainer assignment (not staff)
- Certificate generation
- Training materials management
- Attendee registration

### Technical Debt to Address
- Refactor package management UI (currently getting large)
- Extract tier editor to separate component
- Add comprehensive unit tests
- Implement caching for pricing calculations
- Add audit logging for price changes

---

## 📞 Stakeholder Communication

### Before Migration
- **To Admin Users**: "We're upgrading the package system to support area-based pricing. Training session scheduled."
- **To Staff**: "Bookings will now show property area. No action needed from you."
- **To Customers**: (No communication needed - internal change only)

### During Migration
- **Status Updates**: Daily during migration week
- **Downtime Notice**: "System maintenance: 2-4 AM (if needed)"
- **Issue Reporting**: Dedicated support channel

### After Migration
- **Success Announcement**: "New package system live! Check out the new features."
- **Training Sessions**: 2-hour workshop for admins
- **Feedback Collection**: Survey after 2 weeks

---

## ✅ Sign-off

This scope document should be reviewed and approved before starting migration.

**Reviewed by:**
- [ ] Project Manager
- [ ] Lead Developer
- [ ] Business Owner
- [ ] Admin User Representative

**Approved to proceed**: ___________________ Date: ___________

---

*Scope may be adjusted based on findings during implementation. Any changes must be documented and approved.*
