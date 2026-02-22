# Tinedy CRM - Architecture Document

> Generated: 2026-01-22 | Type: Brownfield Web Application

## Executive Summary

Tinedy CRM is a **booking management system** for service businesses, built with a modern React + Supabase stack. The system manages bookings between customers and staff, with role-based access control for Admin, Manager, and Staff users.

**Core Purpose:** จัดการ Booking ระหว่าง Customer และ Staff พร้อมติดตามสถานะและการชำระเงิน

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT (Browser)                         │
├─────────────────────────────────────────────────────────────────┤
│  React 18 + TypeScript + Vite                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Pages     │  │ Components  │  │   Hooks     │             │
│  │  (Routes)   │──│    (UI)     │──│  (Logic)    │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                │                │                     │
│  ┌─────────────────────────────────────────────────┐           │
│  │              React Query + Context               │           │
│  │         (Server State + Auth State)              │           │
│  └─────────────────────────────────────────────────┘           │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS
┌────────────────────────────┴────────────────────────────────────┐
│                      SUPABASE (BaaS)                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │    Auth     │  │  Database   │  │  Realtime   │             │
│  │   (JWT)     │  │ (PostgreSQL)│  │ (WebSocket) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│         │                │                │                     │
│  ┌─────────────────────────────────────────────────┐           │
│  │           Row Level Security (RLS)               │           │
│  │        (Database-level access control)           │           │
│  └─────────────────────────────────────────────────┘           │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐                              │
│  │    Edge     │  │   Storage   │                              │
│  │  Functions  │  │   (Files)   │                              │
│  └─────────────┘  └─────────────┘                              │
└─────────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend

| Category | Technology | Version | Purpose |
|----------|------------|---------|---------|
| Framework | React | 18.3.1 | UI library |
| Language | TypeScript | 5.9.3 | Type safety |
| Build Tool | Vite | 7.1.11 | Fast development & bundling |
| Styling | Tailwind CSS | 3.4.18 | Utility-first CSS |
| UI Components | Shadcn/ui (Radix) | Various | Accessible primitives |
| State (Server) | React Query | 5.90.10 | Server state management |
| State (Client) | React Context | - | Auth & permissions |
| Routing | React Router | 7.9.4 | Client-side routing |
| Forms | React Hook Form | 7.65.0 | Form management |
| Validation | Zod | 4.1.12 | Schema validation |
| Charts | Recharts | 3.3.0 | Data visualization |
| Calendar | React Big Calendar | 1.19.4 | Calendar views |
| Icons | Lucide React | 0.546.0 | Icon library |
| Date | date-fns | 4.1.0 | Date utilities |

### Backend (Supabase)

| Category | Technology | Purpose |
|----------|------------|---------|
| Database | PostgreSQL | Primary data store |
| Authentication | Supabase Auth | JWT-based auth |
| Authorization | Row Level Security | Database-level RBAC |
| Realtime | Supabase Realtime | WebSocket subscriptions |
| Storage | Supabase Storage | File uploads |
| Serverless | Edge Functions | Custom backend logic |

### Development

| Category | Technology | Purpose |
|----------|------------|---------|
| Testing | Vitest + RTL | Unit & component testing |
| Linting | ESLint | Code quality |
| Environment | happy-dom | Test DOM simulation |
| Coverage | v8 | Code coverage reports |

## Architecture Patterns

### 1. Layered Component Architecture

```
Pages (Route containers)
    └── Components (UI building blocks)
            └── Hooks (Business logic & state)
                    └── Supabase Client (Data access)
```

### 2. State Management Strategy

| State Type | Solution | Scope |
|------------|----------|-------|
| Server State | React Query | Caching, refetching, optimistic updates |
| Auth State | React Context | User, profile, session |
| Permission State | React Context | RBAC checks |
| UI State | Local useState | Component-specific |

### 3. Security Model (Defense in Depth)

```
┌─────────────────────────────────────────┐
│         Frontend Permission Checks      │  ← UX Layer
│  (usePermissions hook, ProtectedRoute)  │
├─────────────────────────────────────────┤
│         Row Level Security (RLS)        │  ← Database Layer
│    (PostgreSQL policies per role)       │
└─────────────────────────────────────────┘
```

**Roles:**
- **Admin:** Full system access
- **Manager:** Operational access (no hard delete, no settings)
- **Staff:** Personal work access only

## Data Architecture

### Core Entities

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   profiles  │────<│  bookings   │>────│  customers  │
│   (Users)   │     │             │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │                   │
       │            ┌──────┴──────┐
       │            │             │
       ▼            ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────────┐
│   teams     │ │  team_      │ │ service_        │
│             │ │  members    │ │ packages_v2     │
└─────────────┘ └─────────────┘ └─────────────────┘
```

### Key Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `profiles` | User profiles (extends auth.users) | role, staff_number, skills |
| `customers` | Customer records | name, phone, address, tags |
| `bookings` | Booking records | status, staff_id/team_id, datetime |
| `service_packages_v2` | Services with tiered pricing | tiers, duration, price |
| `teams` | Staff teams | team_lead_id, members |
| `team_members` | Team membership (M:N) | team_id, profile_id |
| `messages` | Chat messages | sender_id, content, attachments |
| `notifications` | In-app notifications | user_id, type, read |

### Soft Delete Pattern

All tables support soft delete:
- `deleted_at` - Timestamp of deletion
- `deleted_by` - User who deleted

Query pattern: `.is('deleted_at', null)`

## Architecture Decisions (ADRs)

| ID | Decision | Rationale | Risk |
|----|----------|-----------|------|
| ADR-001 | React + Vite + TypeScript | Fast HMR, type safety, large ecosystem | Low |
| ADR-002 | Supabase (BaaS) | Auth + DB + Realtime in one, PostgreSQL | Medium |
| ADR-003 | React Query + Context | Server state caching, simple client state | Low |
| ADR-004 | Shadcn/ui + Tailwind | Component ownership, accessibility | Low |
| ADR-005 | RLS + Frontend RBAC | Defense in depth, database-level security | Medium |
| ADR-006 | Soft Delete | Data recovery, audit trail | Low |

## Component Architecture

### Directory Structure

```
src/components/
├── ui/                 # Shadcn primitives (Button, Dialog, etc.)
├── common/             # Shared components (ConfirmDialog, StatCard)
├── layout/             # Layout (MainLayout, Sidebar, Header)
├── auth/               # Auth components (ProtectedRoute)
├── booking/            # Booking feature components
├── customers/          # Customer feature components
├── staff/              # Staff feature components
├── dashboard/          # Dashboard widgets
├── calendar/           # Calendar views
├── chat/               # Chat system
├── reports/            # Reports & analytics
└── [feature]/          # Other feature components
```

### Component Count: 176 files across 22 directories

## API Architecture

### Supabase Client Usage

```typescript
// Direct database queries
const { data, error } = await supabase
  .from('bookings')
  .select('*, customer:customers(*), staff:profiles(*)')
  .is('deleted_at', null)
  .order('created_at', { ascending: false })

// Realtime subscriptions
const channel = supabase
  .channel('bookings')
  .on('postgres_changes', { event: '*', table: 'bookings' }, callback)
  .subscribe()
```

### Edge Functions (9 functions)

| Function | Purpose |
|----------|---------|
| `create-staff` | Create staff user with proper auth setup |
| `delete-user` | Hard delete user from auth and profiles |
| `send-booking-confirmation` | Email booking confirmation |
| `send-booking-reminder` | Email booking reminder |
| `send-payment-confirmation` | Email payment confirmation |
| `send-refund-confirmation` | Email refund confirmation |
| `send-recurring-booking-confirmation` | Email recurring booking |
| `auto-send-booking-reminders` | Cron orchestrator for booking reminders |
| `update-staff-password` | Admin password reset |

## Testing Architecture

| Type | Tool | Location | Count |
|------|------|----------|-------|
| Unit Tests | Vitest | `src/**/__tests__/` | 43 files |
| Component Tests | RTL | `src/**/__tests__/` | Included |
| Permission Tests | Vitest | `src/lib/__tests__/` | 157 tests |

**Coverage Target:** 75%

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│              Vercel (CDN)               │
│         (Static hosting + SPA)          │
└────────────────────┬────────────────────┘
                     │
┌────────────────────┴────────────────────┐
│           Supabase Cloud                │
│  (PostgreSQL + Auth + Realtime + Edge)  │
└─────────────────────────────────────────┘
```

## Known Gaps & Future Considerations

| Gap | Severity | Description |
|-----|----------|-------------|
| Customer Portal | High | Customers cannot self-service |
| Payment Integration | Medium | UI exists, gateway pending |
| Notification Automation | Medium | Edge functions exist, not fully integrated |
| CI/CD Pipeline | Medium | Manual deployments |
| Error Monitoring | High | No Sentry or similar |

## Health Scores

| Area | Score | Notes |
|------|-------|-------|
| Structure | 80% | Clean but needs refactor |
| Security | 90% | RLS + RBAC comprehensive |
| Testing | 40% | Infrastructure ready, coverage TBD |
| Documentation | 60% | CLAUDE.md good, needs architecture docs |
| Operations | 30% | No CI/CD, no monitoring |

---

*This document was generated by the BMad Method document-project workflow.*
