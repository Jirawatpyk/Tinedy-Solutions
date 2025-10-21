# Epic: Staff Portal Development

**Status**: 📝 Planning
**Priority**: High
**Start Date**: October 21, 2025
**Estimated Completion**: 8-12 hours

---

## 📋 Overview

Developing a comprehensive Staff Portal for Tinedy CRM that allows cleaning service staff to manage their daily work, view assigned bookings, check their schedule, and update their profile. The portal provides staff members with all the tools they need to perform their jobs efficiently.

---

## 🎯 Goals

- ✅ Enable staff to view their assigned bookings
- ✅ Provide a personal calendar view for staff
- ✅ Allow staff to update their profile information
- ✅ Display performance metrics and statistics
- ⏳ Support mobile-first design (staff use phones)
- ⏳ Offline capability (future enhancement)

---

## 📊 Current Status

### **Existing (✅)**
- ✅ Staff authentication & login
- ✅ Protected routes with role-based access
- ✅ **Chat** - Real-time messaging (100% complete)
- ✅ Sidebar navigation
- ✅ Main layout structure

### **Missing (❌ Coming Soon placeholders)**
- ❌ **My Bookings** (`/staff` - index page)
- ❌ **My Calendar** (`/staff/calendar`)
- ❌ **My Profile** (`/staff/profile`)

---

## 🏗️ Pages to Build

### 1. **My Bookings** (Staff Dashboard)
**Route**: `/staff` (index)
**Purpose**: Staff's main page - view assigned bookings

**Features**:
- Today's bookings (priority)
- Upcoming bookings (next 7 days)
- Booking status (pending, in progress, completed)
- Quick actions (mark as completed, add notes)
- Performance summary cards

**Layout**:
```
[Today's Date Header]

[Stats Cards]
- Today's Jobs: 3
- This Week: 12
- Completed: 85%
- Avg Rating: 4.8

[Today's Bookings]
┌────────────────────────────┐
│ 📍 John's House            │
│ ⏰ 9:00 AM - 12:00 PM     │
│ 🧹 Deep Cleaning          │
│ 📍 123 Main St            │
│ [View Details] [Complete] │
└────────────────────────────┘

[Upcoming Bookings]
[Table view of next 7 days]
```

---

### 2. **My Calendar**
**Route**: `/staff/calendar`
**Purpose**: Visual calendar of all staff's bookings

**Features**:
- Month/Week/Day views
- Color-coded by status
- Filter by service type
- Click booking to view details
- Sync with main calendar

**Layout**:
```
[Month Selector] [View Toggle]

[Calendar Grid]
- Bookings displayed on dates
- Color codes:
  - Green: Completed
  - Blue: Confirmed
  - Yellow: Pending
  - Gray: Cancelled
```

---

### 3. **My Profile**
**Route**: `/staff/profile`
**Purpose**: View and edit personal information

**Features**:
- Personal information (name, email, phone)
- Profile photo upload
- Availability settings
- Skills & certifications
- Performance history
- Change password

**Layout**:
```
[Profile Header]
- Avatar
- Name
- Role
- Member since

[Tabs]
1. Personal Info
2. Availability
3. Performance
4. Settings
```

---

## 📊 Progress Tracker

### Phase 1: My Bookings (Staff Dashboard)

| Task | Status | Notes |
|------|--------|-------|
| Design booking card component | 📝 TODO | Reusable component |
| Create stats cards | 📝 TODO | Today's metrics |
| Fetch staff bookings from DB | 📝 TODO | Filter by staff_id |
| Display today's bookings | 📝 TODO | Most important |
| Display upcoming bookings | 📝 TODO | Next 7 days |
| Add quick actions | 📝 TODO | Mark complete, notes |
| Add booking details modal | 📝 TODO | Full info popup |
| Implement filters | 📝 TODO | By status, date |
| Mobile responsive | 📝 TODO | Critical for staff |
| Test with real data | 📝 TODO | End-to-end |

### Phase 2: My Calendar

| Task | Status | Notes |
|------|--------|-------|
| Choose calendar library | 📝 TODO | react-big-calendar? |
| Integrate calendar component | 📝 TODO | Month/week/day views |
| Fetch and map bookings | 📝 TODO | To calendar events |
| Color code by status | 📝 TODO | Visual distinction |
| Add click to view details | 📝 TODO | Booking modal |
| Implement filters | 📝 TODO | Service type, status |
| Mobile responsive | 📝 TODO | Touch-friendly |
| Test navigation | 📝 TODO | Month/week/day |

### Phase 3: My Profile

| Task | Status | Notes |
|------|--------|-------|
| Design profile layout | 📝 TODO | Tabs structure |
| Personal info section | 📝 TODO | View & edit |
| Avatar upload component | 📝 TODO | Image upload |
| Availability settings | 📝 TODO | Work hours |
| Performance metrics | 📝 TODO | Stats from bookings |
| Change password form | 📝 TODO | Security |
| Update profile API | 📝 TODO | Supabase update |
| Validation | 📝 TODO | Form validation |
| Mobile responsive | 📝 TODO | Mobile-first |
| Test updates | 📝 TODO | Save changes |

---

## 🗂️ File Structure

```
src/
├── pages/
│   └── staff/
│       ├── dashboard.tsx         📝 TODO (My Bookings)
│       ├── calendar.tsx          📝 TODO (My Calendar)
│       ├── profile.tsx           📝 TODO (My Profile)
│       └── chat.tsx              ✅ DONE
├── components/
│   └── staff/
│       ├── booking-card.tsx      📝 TODO
│       ├── booking-details.tsx   📝 TODO
│       ├── stats-card.tsx        📝 TODO (reusable)
│       ├── profile-avatar.tsx    📝 TODO
│       ├── availability-form.tsx 📝 TODO
│       └── performance-chart.tsx 📝 TODO
├── hooks/
│   ├── use-staff-bookings.ts    📝 TODO
│   └── use-staff-profile.ts     📝 TODO
└── lib/
    └── staff-utils.ts            📝 TODO
```

---

## 🎨 Design Guidelines

### **Mobile-First**
- Staff primarily use phones
- Large touch targets (min 44x44px)
- Simple navigation
- Readable font sizes (min 16px)

### **Colors**
- **Primary Actions**: Tinedy Blue (#2e4057)
- **Success**: Green (#a8dadc)
- **Warning**: Yellow (#f1c40f)
- **Danger**: Red
- **Neutral**: Gray scale

### **Typography**
- Headers: font-display (bold)
- Body: Default sans-serif
- Mobile: Larger line height for readability

---

## 🔧 Technical Architecture

### **Database Queries**

#### My Bookings
```typescript
// Fetch staff's bookings
const { data } = await supabase
  .from('bookings')
  .select(`
    *,
    customers (full_name, phone, email),
    service_packages (name, service_type, duration),
    teams (name)
  `)
  .eq('staff_id', staffId)
  .gte('booking_date', startDate)
  .lte('booking_date', endDate)
  .order('booking_date', { ascending: true })
  .order('start_time', { ascending: true })
```

#### My Profile
```typescript
// Fetch staff profile
const { data } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', staffId)
  .single()

// Update profile
await supabase
  .from('profiles')
  .update({
    full_name,
    phone,
    avatar_url,
    // ... other fields
  })
  .eq('id', staffId)
```

---

## 📱 Mobile Considerations

### **Critical for Staff**
1. **Offline Support** (future)
   - Cache today's bookings
   - Service worker for offline access

2. **Push Notifications** (future)
   - New booking assigned
   - Booking time reminder
   - Customer message

3. **Quick Actions**
   - One-tap to call customer
   - One-tap to navigate (Google Maps)
   - Quick complete button

4. **Performance**
   - Fast loading (< 2 seconds)
   - Minimal data usage
   - Optimized images

---

## 🚀 Implementation Order

### **Week 1: My Bookings (5-6 hours)**
1. Create stats cards component (30 min)
2. Create booking card component (1 hour)
3. Implement data fetching hook (1 hour)
4. Build today's bookings section (1 hour)
5. Build upcoming bookings section (1 hour)
6. Add quick actions (45 min)
7. Booking details modal (45 min)
8. Mobile responsive (1 hour)
9. Testing (30 min)

### **Week 2: My Calendar (3-4 hours)**
1. Setup calendar library (30 min)
2. Integrate calendar component (1 hour)
3. Map bookings to events (1 hour)
4. Color coding (30 min)
5. Click to view details (30 min)
6. Filters (30 min)
7. Mobile optimization (45 min)
8. Testing (30 min)

### **Week 3: My Profile (3-4 hours)**
1. Profile layout with tabs (30 min)
2. Personal info section (1 hour)
3. Avatar upload (45 min)
4. Availability form (1 hour)
5. Performance metrics (45 min)
6. Change password (30 min)
7. Update API (30 min)
8. Validation (30 min)
9. Testing (30 min)

**Total**: ~12 hours spread over 3 weeks

---

## 🧪 Testing Checklist

### **My Bookings**
- [ ] Today's bookings display correctly
- [ ] Upcoming bookings show next 7 days
- [ ] Stats cards show accurate numbers
- [ ] Mark as completed works
- [ ] Booking details modal opens
- [ ] Filters work correctly
- [ ] Mobile responsive on small screens
- [ ] No bookings state displays
- [ ] Real-time updates (if booking assigned)

### **My Calendar**
- [ ] Calendar displays current month
- [ ] Bookings appear on correct dates
- [ ] Color coding matches status
- [ ] Month/week/day views work
- [ ] Click booking shows details
- [ ] Filters apply correctly
- [ ] Mobile touch navigation works
- [ ] Previous/next month works

### **My Profile**
- [ ] Profile loads correctly
- [ ] Edit mode enables fields
- [ ] Avatar upload works
- [ ] Changes save to database
- [ ] Validation catches errors
- [ ] Password change works
- [ ] Tabs switch correctly
- [ ] Mobile forms are usable
- [ ] Cancel reverts changes

---

## 📚 External Libraries

### **Calendar**
- **react-big-calendar** - Full-featured calendar
  - Pros: Month/week/day views, customizable
  - Cons: Large bundle size
- **FullCalendar** - Alternative
  - Pros: More features, better mobile
  - Cons: Commercial license for some features
- **Recommendation**: Start with react-big-calendar

### **Forms**
- **react-hook-form** - Already used in project
- **zod** - Schema validation

### **Image Upload**
- Supabase Storage (already setup)
- Image compression library (optional)

---

## 🎯 Success Criteria

### **Phase 1 Complete When**:
- [ ] Staff can see all assigned bookings
- [ ] Today's bookings are prominently displayed
- [ ] Stats show accurate metrics
- [ ] Mobile experience is smooth
- [ ] Quick actions work
- [ ] No critical bugs

### **Phase 2 Complete When**:
- [ ] Calendar displays all bookings
- [ ] Month/week/day views functional
- [ ] Color coding is clear
- [ ] Mobile calendar is usable
- [ ] Performance is acceptable

### **Phase 3 Complete When**:
- [ ] Staff can edit profile
- [ ] Avatar upload works
- [ ] Password can be changed
- [ ] All changes persist
- [ ] Validation prevents errors

---

## 💡 Future Enhancements

### **Phase 4: Advanced Features**
1. **Offline Mode**
   - Service worker
   - IndexedDB caching
   - Sync when online

2. **Push Notifications**
   - Browser notifications
   - Mobile app notifications
   - Email notifications

3. **GPS Check-in**
   - Verify staff at location
   - Automatic check-in
   - Geofencing

4. **Photo Upload**
   - Before/after photos
   - Attach to bookings
   - Customer can view

5. **Time Tracking**
   - Clock in/out
   - Break tracking
   - Overtime alerts

6. **Customer Feedback**
   - View ratings
   - Read reviews
   - Respond to feedback

---

## 🐛 Known Limitations

### **Current**
- No offline support
- No push notifications
- No GPS features
- Manual status updates

### **Future Improvements**
- Add offline capability
- Implement notifications
- GPS check-in
- Automated workflows

---

## 📞 Support & Questions

### **Design Questions**
- What info is most important for staff?
- How do staff currently track jobs?
- What devices do they use?

### **Technical Questions**
- Which calendar library?
- Offline support now or later?
- Photo upload file size limits?

---

## ✅ Definition of Done

### **Epic Complete When**:
- [ ] All 3 pages functional
- [ ] Mobile-responsive
- [ ] Data persists correctly
- [ ] No critical bugs
- [ ] User tested by real staff
- [ ] Documentation complete
- [ ] Code reviewed
- [ ] Deployed to production

---

**Last Updated**: October 21, 2025
**Next Review**: After Phase 1 completion
**Owner**: Development Team
