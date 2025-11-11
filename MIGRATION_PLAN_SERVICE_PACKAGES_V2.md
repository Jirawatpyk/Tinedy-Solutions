# 📋 Migration Plan: Service Packages V2
## Tiered Pricing System Implementation

**Project**: Tinedy CRM
**Migration Type**: Full Migration
**Target**: Service Packages with Area-based Tiered Pricing
**Estimated Time**: 2-3 days
**Risk Level**: 🔴 High (affects core booking functionality)

---

## 🎯 Objectives

### Current System
- ✅ Simple fixed pricing per package
- ✅ Single price point (e.g., 4,500 บาท)
- ✅ Duration-based (e.g., 240 minutes)
- ✅ Supports both 'cleaning' and 'training' service types (but only Cleaning is used)

### Target System
- 🎯 **Focus: Cleaning Service Only** (Training will be added later)
- 🎯 Area-based tiered pricing (e.g., 0-100 ตร.ม., 101-200 ตร.ม.)
- 🎯 Frequency-based pricing (1, 2, 4, 8 times/month)
- 🎯 Auto-calculated staff requirements
- 🎯 Multiple categories (Office, Condo, House)
- 🎯 Training service structure preserved but not migrated yet

---

## 📊 Impact Analysis

### Affected Components

| Component | Impact Level | Files Count | Complexity |
|-----------|--------------|-------------|------------|
| Database Schema | 🔴 Critical | 1 | High |
| TypeScript Types | 🟡 Medium | 2-3 | Medium |
| Package Management UI | 🔴 Critical | 1 | High |
| Booking Form | 🔴 Critical | 2-3 | High |
| Dashboard/Stats | 🟡 Medium | 2-3 | Medium |
| Reports | 🟡 Medium | 1-2 | Medium |
| Staff Portal | 🟢 Low | 2 | Low |
| APIs/Queries | 🟡 Medium | 5-7 | Medium |

**Total Files to Modify**: ~15-20 files

---

## 🗺️ Migration Phases

### Phase 0: Preparation & Backup ⏱️ 1-2 hours

**Objectives**:
- Ensure safe rollback capability
- Document current state
- Set up development environment

**Tasks**:
1. ✅ **Backup Database**
   ```sql
   -- Export current service_packages table
   -- Export current bookings table
   -- Save to: backups/pre-migration-YYYY-MM-DD/
   ```

2. ✅ **Backup Code**
   ```bash
   git checkout -b feature/service-packages-v2-migration
   git add .
   git commit -m "Pre-migration checkpoint"
   ```

3. ✅ **Document Current Data**
   - Count existing packages: `SELECT COUNT(*) FROM service_packages`
   - Count bookings using packages: `SELECT COUNT(*) FROM bookings WHERE package_id IS NOT NULL`
   - Export package list to CSV

4. ✅ **Setup Test Environment**
   - Create test Supabase project (optional but recommended)
   - Or use staging branch

**Deliverables**:
- ✅ Database dump file
- ✅ Git backup branch
- ✅ Current data documentation
- ✅ Test environment ready

---

### Phase 1: Database Schema Migration ⏱️ 2-3 hours

**Objectives**:
- Create new tables without breaking existing system
- Add new fields to bookings table
- Create helper functions

**Tasks**:

1. **Create New Tables** (30 min)
   ```sql
   -- Run: tinedy-crm/supabase-service-packages-v2.sql
   -- Creates:
   --   - service_packages_v2
   --   - package_pricing_tiers
   --   - Helper functions
   --   - Indexes
   ```

2. **Extend Bookings Table** (30 min)
   ```sql
   -- Add new fields to support tiered pricing
   ALTER TABLE bookings ADD COLUMN IF NOT EXISTS area_sqm INTEGER;
   ALTER TABLE bookings ADD COLUMN IF NOT EXISTS frequency INTEGER DEFAULT 1;
   ALTER TABLE bookings ADD COLUMN IF NOT EXISTS calculated_price DECIMAL(10, 2);
   ALTER TABLE bookings ADD COLUMN IF NOT EXISTS package_v2_id UUID REFERENCES service_packages_v2(id);

   -- Add index for performance
   CREATE INDEX IF NOT EXISTS idx_bookings_package_v2_id ON bookings(package_v2_id);
   ```

3. **Add Validation Constraints** (30 min)
   ```sql
   -- Ensure frequency is valid
   ALTER TABLE bookings ADD CONSTRAINT check_frequency
     CHECK (frequency IN (1, 2, 4, 8));

   -- Ensure area is positive
   ALTER TABLE bookings ADD CONSTRAINT check_area_positive
     CHECK (area_sqm > 0);
   ```

4. **Test Database Functions** (30 min)
   ```sql
   -- Test price calculation
   SELECT get_package_price('package-uuid', 150, 4);

   -- Test staff calculation
   SELECT get_required_staff('package-uuid', 150);
   ```

5. **Create Migration Script** (30 min)
   - File: `supabase-migration-packages-v1-to-v2.sql`
   - Convert existing simple packages to tiered format
   - Preserve all existing booking references

**Deliverables**:
- ✅ New tables created
- ✅ Bookings table extended
- ✅ Helper functions tested
- ✅ Migration script ready

**Rollback Plan**:
```sql
DROP TABLE IF EXISTS package_pricing_tiers CASCADE;
DROP TABLE IF EXISTS service_packages_v2 CASCADE;
ALTER TABLE bookings DROP COLUMN IF EXISTS area_sqm;
ALTER TABLE bookings DROP COLUMN IF EXISTS frequency;
ALTER TABLE bookings DROP COLUMN IF EXISTS calculated_price;
ALTER TABLE bookings DROP COLUMN IF EXISTS package_v2_id;
```

---

### Phase 2: TypeScript Types & Interfaces ⏱️ 2-3 hours

**Objectives**:
- Define TypeScript interfaces for new data structures
- Create helper functions for price calculations
- Ensure type safety

**Tasks**:

1. **Update Database Types** (30 min)

   File: `src/types/database.types.ts`
   ```typescript
   export interface ServicePackageV2 {
     id: string
     name: string
     description: string | null
     service_type: 'cleaning' | 'training'
     category: string | null
     pricing_model: 'fixed' | 'tiered'
     duration_minutes: number | null
     base_price: number | null
     is_active: boolean
     display_order: number
     created_at: string
     updated_at: string
   }

   export interface PackagePricingTier {
     id: string
     package_id: string
     area_min: number
     area_max: number
     required_staff: number
     estimated_hours: number | null
     price_1_time: number
     price_2_times: number | null
     price_4_times: number | null
     price_8_times: number | null
     created_at: string
     updated_at: string
   }
   ```

2. **Create Pricing Utilities** (60 min)

   File: `src/lib/pricing-utils.ts`
   ```typescript
   export async function calculatePackagePrice(
     packageId: string,
     area: number,
     frequency: 1 | 2 | 4 | 8
   ): Promise<number>

   export async function getRequiredStaff(
     packageId: string,
     area: number
   ): Promise<number>

   export async function getPricingTier(
     packageId: string,
     area: number
   ): Promise<PackagePricingTier | null>

   export function formatAreaRange(
     areaMin: number,
     areaMax: number
   ): string

   export function getFrequencyLabel(frequency: number): string
   ```

3. **Update Booking Types** (30 min)

   File: `src/types/index.ts`
   ```typescript
   export interface Booking {
     // ... existing fields
     area_sqm?: number
     frequency?: 1 | 2 | 4 | 8
     calculated_price?: number
     package_v2_id?: string
   }
   ```

4. **Create Type Guards** (30 min)
   ```typescript
   export function isV2Package(
     pkg: ServicePackage | ServicePackageV2
   ): pkg is ServicePackageV2

   export function isTieredPricing(
     pkg: ServicePackageV2
   ): boolean
   ```

**Deliverables**:
- ✅ `database.types.ts` updated
- ✅ `pricing-utils.ts` created
- ✅ `index.ts` updated
- ✅ Type guards implemented
- ✅ All types compile without errors

**Testing**:
```bash
npm run build  # Should compile without errors
```

---

### Phase 3: Service Package Management UI ⏱️ 4-5 hours

**Objectives**:
- Create new UI for managing tiered packages
- Support both fixed and tiered pricing models
- Maintain backward compatibility

**Tasks**:

1. **Create Package Form V2 Component** (2 hours)

   File: `src/components/packages/package-form-v2.tsx`

   Features:
   - ✅ Toggle between Fixed/Tiered pricing
   - ✅ Category selection (Office/Condo/House)
   - ✅ Dynamic tier editor (add/remove tiers)
   - ✅ Bulk tier input (paste from Excel)
   - ✅ Validation for overlapping ranges
   - ✅ Preview price table

   Components:
   ```tsx
   <PackageFormV2>
     <BasicInfoSection />
     <PricingModelSelector />
     {pricingModel === 'tiered' ? (
       <TieredPricingEditor />
     ) : (
       <FixedPricingEditor />
     )}
     <PreviewSection />
   </PackageFormV2>
   ```

2. **Create Tier Editor Component** (1.5 hours)

   File: `src/components/packages/tier-editor.tsx`

   Features:
   - ✅ Sortable table of tiers
   - ✅ Add/Edit/Delete tiers
   - ✅ Inline editing
   - ✅ Validation (no gaps, no overlaps)
   - ✅ Copy tier functionality

3. **Update Package List View** (1 hour)

   File: `src/pages/admin/service-packages.tsx`

   Changes:
   - ✅ Show "Fixed" or "Tiered" badge
   - ✅ Display price range for tiered (e.g., "฿1,950 - ฿6,900")
   - ✅ Show tier count (e.g., "5 tiers")
   - ✅ Filter by pricing model
   - ✅ Sort by category

4. **Create Package Detail Modal** (30 min)

   File: `src/components/packages/package-detail-modal.tsx`

   Shows:
   - ✅ Full pricing table
   - ✅ All tiers with staff requirements
   - ✅ Usage statistics
   - ✅ Quick actions (Edit, Duplicate, Activate/Deactivate)

**Deliverables**:
- ✅ `package-form-v2.tsx` component
- ✅ `tier-editor.tsx` component
- ✅ Updated `service-packages.tsx` page
- ✅ `package-detail-modal.tsx` component
- ✅ All forms validate correctly
- ✅ UI is mobile-responsive

**Testing Checklist**:
- [ ] Create tiered package with 5 tiers
- [ ] Edit existing tier
- [ ] Delete tier
- [ ] Validate overlapping ranges (should error)
- [ ] Validate gap in ranges (should error)
- [ ] Save and reload package
- [ ] Deactivate/Activate package

---

### Phase 4: Booking Form Enhancement ⏱️ 4-5 hours

**Objectives**:
- Add area and frequency inputs
- Auto-calculate price based on selections
- Auto-suggest staff count
- Maintain UX flow

**Tasks**:

1. **Update Booking Form Component** (2 hours)

   File: `src/pages/admin/bookings.tsx` or `src/components/booking/booking-form.tsx`

   New Fields:
   ```tsx
   // After package selection
   {selectedPackage?.pricing_model === 'tiered' && (
     <>
       <Input
         label="พื้นที่ (ตร.ม.)"
         type="number"
         value={area}
         onChange={handleAreaChange}
         required
       />

       <Select
         label="จำนวนครั้ง/เดือน"
         value={frequency}
         onChange={handleFrequencyChange}
       >
         <option value={1}>1 ครั้ง</option>
         <option value={2}>2 ครั้ง</option>
         <option value={4}>4 ครั้ง</option>
         <option value={8}>8 ครั้ง</option>
       </Select>

       <div className="price-preview">
         <strong>ราคา: {formatCurrency(calculatedPrice)}</strong>
         <span>พนักงานที่ต้องการ: {requiredStaff} คน</span>
       </div>
     </>
   )}
   ```

2. **Add Price Calculation Logic** (1 hour)
   ```typescript
   const handleAreaChange = async (area: number) => {
     if (!selectedPackage || !frequency) return

     const price = await calculatePackagePrice(
       selectedPackage.id,
       area,
       frequency
     )
     setCalculatedPrice(price)

     const staff = await getRequiredStaff(
       selectedPackage.id,
       area
     )
     setRequiredStaff(staff)
   }
   ```

3. **Update Form Validation** (30 min)
   ```typescript
   const validateBookingForm = () => {
     // Existing validations

     // New validations
     if (selectedPackage?.pricing_model === 'tiered') {
       if (!area || area <= 0) {
         errors.area = 'กรุณากรอกพื้นที่'
       }
       if (!frequency) {
         errors.frequency = 'กรุณาเลือกความถี่'
       }
     }
   }
   ```

4. **Update Save Logic** (1 hour)
   ```typescript
   const handleSaveBooking = async () => {
     const bookingData = {
       // ... existing fields
       area_sqm: area,
       frequency: frequency,
       calculated_price: calculatedPrice,
       package_v2_id: selectedPackage.id,
       price: calculatedPrice, // Override price with calculated
     }

     await supabase.from('bookings').insert(bookingData)
   }
   ```

5. **Add Smart Defaults** (30 min)
   - Default to 1 time frequency
   - Suggest area based on customer's previous bookings
   - Pre-fill address from customer record

**Deliverables**:
- ✅ Updated booking form with new fields
- ✅ Real-time price calculation
- ✅ Staff suggestion
- ✅ Form validation
- ✅ Save logic updated
- ✅ Mobile-responsive

**Testing Checklist**:
- [ ] Select tiered package → Shows area/frequency fields
- [ ] Enter area → Price updates automatically
- [ ] Change frequency → Price updates
- [ ] Save booking → All fields saved correctly
- [ ] Edit booking → Fields load correctly
- [ ] Validation works for all fields

---

### Phase 5: Dashboard & Reports Update ⏱️ 2-3 hours

**Objectives**:
- Update revenue calculations
- Show frequency-based statistics
- Update package usage reports

**Tasks**:

1. **Update Dashboard Stats** (1 hour)

   File: `src/pages/admin/dashboard.tsx`

   Changes:
   ```typescript
   // Update revenue calculation to use calculated_price
   const calculateRevenue = async () => {
     const { data } = await supabase
       .from('bookings')
       .select('price, calculated_price')

     const total = data.reduce((sum, booking) =>
       sum + (booking.calculated_price || booking.price), 0
     )
   }
   ```

2. **Update Reports Page** (1 hour)

   File: `src/pages/admin/reports.tsx`

   Add:
   - ✅ Frequency breakdown chart
   - ✅ Area distribution chart
   - ✅ Average booking size
   - ✅ Popular tiers report

3. **Update Package Analytics** (30 min)
   ```typescript
   // Add to package stats
   - Most popular tier
   - Average area per booking
   - Frequency distribution
   - Revenue by tier
   ```

**Deliverables**:
- ✅ Dashboard shows correct revenue
- ✅ Reports include new metrics
- ✅ Charts render correctly
- ✅ Export includes new fields

---

### Phase 6: Data Migration Script ⏱️ 2-3 hours

**Objectives**:
- Migrate existing packages to V2 format
- Preserve all booking history
- Ensure data integrity

**Tasks**:

1. **Create Migration Script** (1.5 hours)

   File: `supabase-migrate-data-v1-to-v2.sql`

   ```sql
   -- Step 1: Copy all packages to V2 as 'fixed' pricing
   INSERT INTO service_packages_v2 (
     name, description, service_type, category,
     pricing_model, duration_minutes, base_price, is_active
   )
   SELECT
     name, description, service_type,
     NULL as category,
     'fixed' as pricing_model,
     duration_minutes,
     price as base_price,
     is_active
   FROM service_packages;

   -- Step 2: Create default tier for fixed packages
   INSERT INTO package_pricing_tiers (
     package_id, area_min, area_max,
     required_staff, price_1_time
   )
   SELECT
     v2.id,
     0 as area_min,
     999999 as area_max,
     1 as required_staff,
     v2.base_price as price_1_time
   FROM service_packages_v2 v2
   WHERE v2.pricing_model = 'fixed';

   -- Step 3: Update bookings to reference V2 packages
   UPDATE bookings b
   SET
     package_v2_id = v2.id,
     calculated_price = b.price,
     frequency = 1,
     area_sqm = 100  -- default value
   FROM service_packages v1
   JOIN service_packages_v2 v2 ON v1.name = v2.name
   WHERE b.package_id = v1.id;
   ```

2. **Validation Queries** (30 min)
   ```sql
   -- Verify counts match
   SELECT
     (SELECT COUNT(*) FROM service_packages) as v1_count,
     (SELECT COUNT(*) FROM service_packages_v2) as v2_count;

   -- Verify bookings updated
   SELECT COUNT(*)
   FROM bookings
   WHERE package_v2_id IS NOT NULL;

   -- Check for orphaned bookings
   SELECT COUNT(*)
   FROM bookings
   WHERE package_id IS NOT NULL
     AND package_v2_id IS NULL;
   ```

3. **Create Rollback Script** (30 min)
   ```sql
   -- Revert bookings
   UPDATE bookings
   SET
     package_v2_id = NULL,
     calculated_price = NULL,
     frequency = NULL,
     area_sqm = NULL
   WHERE package_v2_id IS NOT NULL;

   -- Clear V2 tables
   DELETE FROM package_pricing_tiers;
   DELETE FROM service_packages_v2;
   ```

**Deliverables**:
- ✅ Migration script tested
- ✅ Validation queries ready
- ✅ Rollback script ready
- ✅ Data integrity confirmed

---

### Phase 7: Testing & Validation ⏱️ 3-4 hours

**Objectives**:
- Comprehensive testing of all features
- Performance testing
- User acceptance testing preparation

**Tasks**:

1. **Unit Tests** (1 hour)
   ```typescript
   // src/lib/__tests__/pricing-utils.test.ts
   describe('calculatePackagePrice', () => {
     it('calculates price for area in range')
     it('returns 0 for area out of range')
     it('handles different frequencies')
   })
   ```

2. **Integration Tests** (1 hour)
   - Test package creation end-to-end
   - Test booking creation end-to-end
   - Test price calculation accuracy

3. **Manual Testing** (1 hour)

   Test Cases:
   - [ ] Create tiered package (Office, 5 tiers)
   - [ ] Create tiered package (Condo, 5 tiers)
   - [ ] Edit tier ranges
   - [ ] Create booking with 150 ตร.ม., 4 times/month
   - [ ] Verify calculated price is correct
   - [ ] Edit booking, change area → price updates
   - [ ] View dashboard → revenue correct
   - [ ] Generate report → includes new fields
   - [ ] Staff can view booking → shows area
   - [ ] Deactivate package → can't select in booking
   - [ ] Reactivate package → appears in selection

4. **Performance Testing** (30 min)
   ```sql
   -- Test query performance
   EXPLAIN ANALYZE
   SELECT * FROM service_packages_v2
   JOIN package_pricing_tiers ON ...
   WHERE ...;

   -- Should use indexes
   -- Should complete in < 50ms
   ```

5. **Browser Testing** (30 min)
   - Chrome ✅
   - Firefox ✅
   - Safari ✅
   - Mobile Chrome ✅
   - Mobile Safari ✅

**Deliverables**:
- ✅ All unit tests pass
- ✅ All integration tests pass
- ✅ Manual test checklist completed
- ✅ Performance acceptable
- ✅ Cross-browser compatible

---

### Phase 8: Documentation & Deployment ⏱️ 2-3 hours

**Objectives**:
- Update all documentation
- Create user guide
- Deploy to production safely

**Tasks**:

1. **Update CLAUDE.md** (30 min)
   - Add Service Packages V2 section
   - Update database schema info
   - Add pricing calculation notes

2. **Create User Guide** (1 hour)

   File: `docs/USER_GUIDE_SERVICE_PACKAGES_V2.md`

   Include:
   - How to create tiered packages
   - How to set pricing tiers
   - How to create bookings with tiered packages
   - FAQ section

3. **Update API Documentation** (30 min)
   - Document new endpoints (if any)
   - Document helper functions
   - Update type definitions

4. **Deployment Checklist** (30 min)
   ```markdown
   Pre-Deployment:
   - [ ] All tests passing
   - [ ] Database backup complete
   - [ ] Migration script tested on staging
   - [ ] User guide ready
   - [ ] Rollback plan documented

   Deployment Steps:
   1. [ ] Run database migration
   2. [ ] Deploy frontend code
   3. [ ] Verify health checks
   4. [ ] Smoke test critical paths
   5. [ ] Monitor error logs

   Post-Deployment:
   - [ ] Train admin users
   - [ ] Monitor for 24 hours
   - [ ] Collect feedback
   ```

5. **Create Demo Data** (30 min)
   - Create 2-3 sample tiered packages
   - Create sample bookings
   - Prepare screenshots for user guide

**Deliverables**:
- ✅ CLAUDE.md updated
- ✅ User guide created
- ✅ API docs updated
- ✅ Deployment checklist ready
- ✅ Demo data prepared
- ✅ Successfully deployed

---

## ⚠️ Risk Management

### High-Risk Areas

1. **Data Loss**
   - **Risk**: Migration script fails, data corrupted
   - **Mitigation**:
     - Full database backup before migration
     - Test migration on copy first
     - Rollback script ready
     - Point-in-time recovery enabled

2. **Breaking Existing Bookings**
   - **Risk**: Old bookings become inaccessible
   - **Mitigation**:
     - Maintain both package_id and package_v2_id
     - Keep old service_packages table
     - Graceful fallback in UI

3. **Price Calculation Errors**
   - **Risk**: Wrong prices charged to customers
   - **Mitigation**:
     - Extensive unit tests
     - Manual verification of calculations
     - Show price breakdown to user
     - Admin review before confirming

4. **Performance Degradation**
   - **Risk**: Queries too slow with new joins
   - **Mitigation**:
     - Proper indexing
     - Query optimization
     - Caching strategy
     - Load testing

### Rollback Strategy

**If migration fails:**

```sql
-- 1. Stop application
-- 2. Restore database backup
pg_restore -d tinedy_crm backup_pre_migration.dump

-- 3. Or run rollback script
\i rollback-migration.sql

-- 4. Redeploy previous code version
git checkout main
git push production main
```

**Rollback triggers:**
- Data integrity check fails
- More than 5% of queries error
- Critical functionality broken
- User-reported data loss

---

## 📅 Timeline & Resources

### Estimated Timeline

| Phase | Duration | Dependencies |
|-------|----------|--------------|
| Phase 0: Preparation | 1-2 hours | None |
| Phase 1: Database | 2-3 hours | Phase 0 |
| Phase 2: Types | 2-3 hours | Phase 1 |
| Phase 3: Package UI | 4-5 hours | Phase 2 |
| Phase 4: Booking Form | 4-5 hours | Phase 2, 3 |
| Phase 5: Dashboard | 2-3 hours | Phase 2 |
| Phase 6: Migration | 2-3 hours | Phase 1 |
| Phase 7: Testing | 3-4 hours | All phases |
| Phase 8: Documentation | 2-3 hours | Phase 7 |

**Total Estimated Time**: 22-31 hours (3-4 days)

### Resource Requirements

- **Developer**: 1 full-time (you + Claude Code)
- **Database Access**: Supabase admin
- **Testing Environment**: Staging server recommended
- **Backup Storage**: ~500MB for database backup

---

## ✅ Success Criteria

### Must Have (P0)
- ✅ All existing packages migrated without data loss
- ✅ All existing bookings preserved
- ✅ Tiered pricing works correctly
- ✅ Price calculations are accurate
- ✅ No performance regression
- ✅ Mobile-responsive UI

### Should Have (P1)
- ✅ User-friendly tier editor
- ✅ Bulk import functionality
- ✅ Enhanced reports with new metrics
- ✅ Admin training completed

### Nice to Have (P2)
- Package templates
- Pricing simulator
- Automated pricing suggestions
- Integration with external pricing APIs

---

## 📞 Support & Escalation

### During Migration

- **Technical Issues**: Check logs in Supabase dashboard
- **Data Issues**: Refer to rollback script
- **UI Issues**: Check browser console, network tab
- **Performance Issues**: Run `EXPLAIN ANALYZE` on slow queries

### Post-Migration Support

- Monitor error logs for 48 hours
- Daily check-ins for 1 week
- User feedback collection
- Performance monitoring

---

## 📝 Next Steps

**Ready to begin?**

1. Review this plan thoroughly
2. Confirm backup strategy
3. Set up staging environment (recommended)
4. Start with Phase 0: Preparation
5. Proceed phase by phase with testing

**Questions to answer before starting:**
- Do you have database backup/restore access?
- Do you have a staging environment?
- What's the best time window for deployment? (low traffic time)
- Who will test the new features before production?

---

*This migration plan is a living document. Update as needed based on learnings during implementation.*
