# Source Tree Analysis - Tinedy CRM

> Generated: 2026-01-22 | Scan Level: Quick

## Project Structure Overview

```
tinedy-crm/                           # Project Root
├── 📄 Configuration Files
│   ├── package.json                  # Dependencies & scripts
│   ├── tsconfig.json                 # TypeScript config (references)
│   ├── vite.config.ts                # Vite build config + code splitting
│   ├── vitest.config.ts              # Test configuration
│   ├── tailwind.config.js            # Tailwind + custom design tokens
│   ├── postcss.config.js             # PostCSS config
│   └── eslint.config.js              # ESLint flat config
│
├── 📁 src/                           # Main Source Code (271 files)
│   ├── 📁 components/                # React Components (176 files, 22 dirs)
│   │   ├── auth/                     # Authentication components
│   │   ├── booking/                  # Booking management UI
│   │   ├── calendar/                 # Calendar views
│   │   ├── charts/                   # Reusable chart components
│   │   ├── chat/                     # Chat system UI
│   │   ├── common/                   # Shared components (ConfirmDialog, etc.)
│   │   ├── customers/                # Customer management UI
│   │   ├── dashboard/                # Dashboard widgets & stats
│   │   ├── error/                    # Error handling components
│   │   ├── layout/                   # MainLayout, Sidebar, Header
│   │   ├── notifications/            # Notification components
│   │   ├── payment/                  # Payment UI components
│   │   ├── profile/                  # Profile management
│   │   ├── reports/                  # Reports & analytics UI
│   │   ├── routing/                  # Route-related components
│   │   ├── schedule/                 # Weekly schedule views
│   │   ├── service-packages/         # Service package management
│   │   ├── settings/                 # Settings UI
│   │   ├── skeletons/                # Loading skeletons
│   │   ├── staff/                    # Staff management UI
│   │   ├── teams/                    # Team management UI
│   │   └── ui/                       # Shadcn/Radix primitives
│   │
│   ├── 📁 hooks/                     # Custom React Hooks (70 files)
│   │   ├── dashboard/                # Dashboard data hooks
│   │   ├── chat/                     # Chat functionality hooks
│   │   ├── use-permissions.ts        # ⭐ Permission checking
│   │   ├── use-staff-bookings.ts     # Staff booking data
│   │   ├── use-notifications.ts      # Notification system
│   │   └── ...                       # 65+ more hooks
│   │
│   ├── 📁 pages/                     # Route Pages (25 files)
│   │   ├── admin/                    # Admin portal pages
│   │   │   ├── dashboard.tsx         # Main dashboard
│   │   │   ├── bookings.tsx          # Booking management
│   │   │   ├── customers.tsx         # Customer list
│   │   │   ├── staff.tsx             # Staff management
│   │   │   ├── teams.tsx             # Team management
│   │   │   ├── reports.tsx           # Reports & analytics
│   │   │   ├── settings.tsx          # System settings
│   │   │   └── ...
│   │   ├── staff/                    # Staff portal pages
│   │   │   ├── dashboard.tsx         # Staff dashboard
│   │   │   ├── calendar.tsx          # Staff calendar
│   │   │   └── profile.tsx           # Staff profile
│   │   ├── payment/                  # Payment pages
│   │   └── login.tsx                 # Login page
│   │
│   ├── 📁 lib/                       # Utility Libraries (30+ files)
│   │   ├── supabase.ts               # ⭐ Supabase client init
│   │   ├── permissions.ts            # ⭐ Permission matrix (157 tests)
│   │   ├── utils.ts                  # Common utilities
│   │   ├── queries/                  # React Query definitions
│   │   ├── error-utils.ts            # Error handling
│   │   ├── analytics.ts              # Analytics calculations
│   │   └── ...
│   │
│   ├── 📁 contexts/                  # React Contexts (3 files)
│   │   ├── auth-context.tsx          # ⭐ Authentication state
│   │   ├── permission-context.tsx    # Permission state
│   │   └── permission-context-provider.tsx
│   │
│   ├── 📁 types/                     # TypeScript Types (17 files)
│   │   ├── database.types.ts         # Supabase generated types
│   │   ├── booking.ts                # Booking types
│   │   ├── customer.ts               # Customer types
│   │   ├── staff.ts                  # Staff types
│   │   └── ...
│   │
│   ├── 📁 schemas/                   # Zod Validation Schemas
│   ├── 📁 services/                  # API Services
│   ├── 📁 constants/                 # Application Constants
│   ├── 📁 config/                    # Configuration
│   ├── 📁 data/                      # Static Data
│   ├── 📁 providers/                 # Context Providers
│   ├── 📁 assets/                    # Static Assets
│   │
│   ├── 📁 __tests__/                 # Test Files (43 files)
│   ├── 📁 test/                      # Test Setup & Utilities
│   │
│   ├── App.tsx                       # ⭐ Main App + Routes
│   ├── main.tsx                      # Entry Point
│   └── index.css                     # Global Styles
│
├── 📁 supabase/                      # Backend Configuration
│   ├── 📁 migrations/                # Database Migrations (109 files)
│   ├── 📁 functions/                 # Edge Functions (9 functions)
│   │   ├── create-staff/             # Create staff user
│   │   ├── delete-user/              # Delete user
│   │   ├── send-booking-confirmation/
│   │   ├── send-booking-reminder/
│   │   ├── send-payment-confirmation/
│   │   └── ...
│   └── 📁 storage/                   # Storage Configuration
│
├── 📁 docs/                          # Generated Documentation (this folder)
├── 📁 _bmad/                         # BMad Method Configuration
├── 📁 _bmad-output/                  # BMad Workflow Outputs
├── 📁 coverage/                      # Test Coverage Reports
├── 📁 dist/                          # Production Build Output
│
└── 📄 Documentation (61 files)       # Existing documentation at root
    ├── CLAUDE.md                     # ⭐ Developer Guide (740+ lines)
    ├── README.md                     # Project Overview
    ├── EPIC_*.md                     # Feature Epics (4 files)
    ├── DEPLOYMENT*.md                # Deployment Guides (4 files)
    └── ...                           # 50+ more documentation files
```

## Critical Paths Summary

| Path | Purpose | File Count |
|------|---------|------------|
| `src/components/` | React UI Components | 176 |
| `src/hooks/` | Custom React Hooks | 70 |
| `src/pages/` | Route Pages | 25 |
| `src/lib/` | Utilities & Services | 30+ |
| `src/types/` | TypeScript Definitions | 17 |
| `src/__tests__/` | Test Files | 43 |
| `supabase/migrations/` | Database Migrations | 109 |
| `supabase/functions/` | Edge Functions | 9 |

## Entry Points

| Entry Point | File | Purpose |
|-------------|------|---------|
| **Application** | `src/main.tsx` | React app initialization |
| **Routes** | `src/App.tsx` | Route definitions & providers |
| **Supabase** | `src/lib/supabase.ts` | Database client |
| **Auth** | `src/contexts/auth-context.tsx` | Authentication state |
| **Permissions** | `src/lib/permissions.ts` | RBAC permission matrix |

## Key Integration Points

| From | To | Type |
|------|-----|------|
| Components | Hooks | State & Logic |
| Hooks | Supabase | Data Fetching |
| Pages | Components | UI Composition |
| Contexts | App-wide | Global State |
| Edge Functions | Supabase DB | Server Logic |
