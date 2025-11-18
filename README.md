# Tinedy CRM - Enterprise Booking Management System

A modern, mobile-first CRM application for managing Cleaning and Training service bookings. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

### Role-Based Access Control

The system implements a comprehensive permission-based access control with three distinct roles:

#### Admin Portal
Full administrative access with all privileges:
- **Dashboard** - Overview of bookings, revenue, customers, and pending tasks
- **Booking Management** - Full CRUD operations including hard delete
- **Customer Management** - Complete customer database management
- **Staff Management** - Create, update, and delete staff accounts
- **Team Management** - Organize staff into teams
- **Service Packages** - Create and manage service offerings
- **Reports & Analytics** - Business insights and metrics
- **Settings** - Configure system preferences and manage roles
- **Audit Log** - Track all system changes (Coming soon)
- **Chat System** - Internal messaging (Coming soon)

#### Manager Portal
Management-level access with operational control:
- **Dashboard** - View bookings, revenue, and team performance
- **Booking Management** - Create, read, update, and archive (soft delete) bookings
- **Customer Management** - Create and update customer information
- **Team Management** - Create and update teams, assign staff
- **Staff Assignments** - Update staff assignments and schedules
- **Reports & Analytics** - View and export business reports
- **Archive Management** - Archive and restore soft-deleted records
- **Calendar** - Visual booking calendar (Coming soon)
- **Chat System** - Team communication (Coming soon)

#### Staff Portal
Staff-level access for personal work:
- **My Bookings** - View assigned bookings (Coming soon)
- **Calendar** - Personal schedule (Coming soon)
- **Chat** - Team communication (Coming soon)
- **Profile** - Manage personal information (Coming soon)

> **Note**: For detailed information about roles and permissions, see:
> - [Manager Role User Guide](USER_GUIDE_MANAGER_ROLE.md)
> - [Admin User Management Guide](ADMIN_GUIDE_USER_MANAGEMENT.md)
> - [Manager Role Migration Guide](MANAGER_ROLE_MIGRATION_GUIDE.md)

## Tech Stack

- **Frontend Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn UI + Radix UI
- **Icons**: Lucide React
- **Routing**: React Router v6
- **Form Validation**: Zod
- **Database & Auth**: Supabase
- **Date Handling**: date-fns

## Design System

### Colors
- **Primary Blue**: `#2e4057` - Main brand color
- **Secondary Green**: `#8fb996` - Success states and secondary actions
- **Accent Yellow**: `#e7d188` - Highlights and warnings
- **Off White**: `#f5f3ee` - Background
- **Dark**: `#2d241d` - Text and headings

### Typography
- **Sans**: Poppins - Body text
- **Display**: Raleway - Headings and titles
- **Rule**: Sarabun - Special text and labels

## Getting Started

### Prerequisites
- Node.js 18+ installed
- Supabase account and project

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. Set up the database:
   - Go to your Supabase project SQL Editor
   - Run the SQL script from `supabase-schema.sql`
   - This will create all necessary tables, indexes, and Row Level Security policies

4. Start the development server:
```bash
npm run dev
```

5. Open your browser and navigate to:
```
http://localhost:5173
```

## Database Setup

The application uses the following main tables:
- `profiles` - User profiles with role-based access (admin, manager, staff)
- `customers` - Customer information
- `service_packages` - Available service offerings
- `bookings` - Service booking records with soft delete support
- `teams` - Staff team organization
- `team_members` - Team membership
- `messages` - Chat messages
- `audit_logs` - System audit trail

### Database Features

All tables include:
- **Row Level Security (RLS)** policies for role-based data access
- **Automated timestamps** (created_at, updated_at)
- **Proper indexes** for query performance
- **Foreign key relationships** with cascade rules
- **Soft delete support** (deleted_at, deleted_by) for data recovery

### 🔴 CRITICAL: Row Level Security (RLS)

> **⚠️ IMPORTANT:** RLS is **NOT enabled by default** in Supabase! Without RLS, anyone with the anon key can access all data directly via the Supabase API, completely bypassing frontend permissions.

**Before deploying to production, you MUST enable RLS:**

1. **Backup your database** first
2. **Run the RLS migration** from `supabase/migrations/enable_rls_policies_v2.sql`
3. **Verify RLS is enabled** on all tables

For detailed instructions, see:
- [Pre-Production Checklist](PRE_PRODUCTION_CHECKLIST.md)
- [Deployment Guide](DEPLOYMENT.md)
- [RLS Security Setup](RLS_SECURITY_SETUP.md)

### Role-Based Row Level Security

The database implements RLS policies that match the application's permission system:

- **Admin**: Full access to all records
- **Manager**: Read/write access to operational data, cannot hard delete
- **Staff**: Access only to assigned records and personal data

Example RLS policy structure:
```sql
-- Managers can view all bookings
CREATE POLICY "Managers can view all bookings"
ON bookings FOR SELECT
TO authenticated
USING (
  auth.jwt() ->> 'role' IN ('admin', 'manager')
);

-- Only admins can hard delete
CREATE POLICY "Only admins can delete bookings"
ON bookings FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'role' = 'admin'
);
```

For complete database schema, see `supabase-schema.sql`.

## Project Structure

```
src/
├── __tests__/                      # Integration tests
│   └── manager-role-integration.test.tsx
├── components/
│   ├── auth/                       # Authentication components
│   │   └── protected-route.tsx    # Role-based route protection
│   ├── layout/                     # Layout components (Sidebar, Header, etc.)
│   └── ui/                         # Reusable UI components (Shadcn UI)
├── contexts/                       # React contexts
│   ├── auth-context.tsx           # Authentication state
│   └── permission-context.tsx     # Permission checking
├── hooks/                          # Custom React hooks
│   ├── __tests__/
│   │   └── use-permissions.test.ts
│   └── use-permissions.ts         # Permission checking hook
├── lib/                            # Utility functions and configs
│   ├── __tests__/
│   │   └── permissions.test.ts
│   ├── permissions.ts             # Permission utilities and matrix
│   ├── supabase.ts                # Supabase client
│   └── utils.ts                   # Helper functions
├── pages/                          # Page components
│   ├── admin/                     # Admin portal pages
│   ├── manager/                   # Manager portal pages
│   ├── staff/                     # Staff portal pages
│   └── auth/                      # Authentication pages
├── types/                          # TypeScript type definitions
│   ├── common.ts                  # Common types and permissions
│   └── database.types.ts          # Database types
├── App.tsx                         # Main app component with routing
└── main.tsx                        # Application entry point
```

### Key Files

- **[src/lib/permissions.ts](src/lib/permissions.ts)** - Permission matrix and utility functions
- **[src/hooks/use-permissions.ts](src/hooks/use-permissions.ts)** - React hook for permission checks
- **[src/contexts/permission-context.tsx](src/contexts/permission-context.tsx)** - Permission context provider
- **[src/components/auth/protected-route.tsx](src/components/auth/protected-route.tsx)** - Route protection component

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:ui` - Run tests with UI interface
- `npm run test:coverage` - Generate test coverage report

### Testing

The project uses **Vitest** and **React Testing Library** for comprehensive test coverage:

#### Test Coverage

- **157 tests** covering the permission system
  - 61 tests for `usePermissions` hook
  - 73 tests for permission utility functions
  - 23 integration tests for Manager role

#### Test Structure

```
src/
├── hooks/
│   └── __tests__/
│       └── use-permissions.test.ts    # Permission hook tests
├── lib/
│   └── __tests__/
│       └── permissions.test.ts        # Permission utility tests
└── __tests__/
    └── manager-role-integration.test.tsx  # Integration tests
```

#### Running Tests

```bash
# Run all tests
npm run test:run

# Run specific test file
npm run test:run src/hooks/__tests__/use-permissions.test.ts

# Run tests in watch mode
npm test

# Generate coverage report
npm run test:coverage
```

All permission checks, role validations, and access controls are thoroughly tested to ensure security and correctness.

### Code Style

- **Mobile-first**: All components are designed for mobile first, then scaled up
- **Responsive**: Breakpoints at sm (640px), md (768px), lg (1024px), xl (1280px)
- **Accessible**: Proper ARIA labels and semantic HTML
- **Type-safe**: Full TypeScript coverage
- **Error handling**: Try-catch blocks with user-friendly toast notifications

### Best Practices

1. **Component Design**
   - Use functional components with hooks
   - Keep components small and focused
   - Extract reusable logic into custom hooks
   - Use proper TypeScript types

2. **State Management**
   - Use React Context for global state (Auth)
   - Use local state for component-specific data
   - Fetch data with useEffect and proper cleanup

3. **Database Queries**
   - Use Supabase client for all database operations
   - Implement proper error handling
   - Use RLS policies for security
   - Create audit logs for important actions

4. **Security**
   - Never expose sensitive credentials
   - Use environment variables
   - Implement role-based access control
   - Validate all user inputs with Zod

## Authentication & Authorization

### User Roles

The application implements a three-tier role-based access control system:

| Role | Access Level | Permissions |
|------|--------------|-------------|
| **Admin** | Full Control | All CRUD operations, hard delete, settings management, user role assignment |
| **Manager** | Operational | Create, read, update, soft delete (archive), reports, team management |
| **Staff** | Personal | View assigned bookings, update personal profile, team chat |

### Permission Features

- **Soft Delete**: Managers can archive records instead of permanently deleting them
- **Restore**: Managers can restore archived records
- **Hard Delete**: Only admins can permanently delete records
- **Route Protection**: Each role has access only to their designated routes
- **Feature Flags**: Granular control over feature access per role

### Authentication Flow

1. Users log in with email and password
2. System validates credentials via Supabase Auth
3. User role is fetched from the `profiles` table
4. Routes and features are filtered based on role permissions
5. Protected routes automatically redirect unauthorized users

For more details, see the [Permission System Documentation](src/lib/permissions.ts).

## Deployment

### Build for Production

```bash
npm run build
```

The build output will be in the `dist/` directory.

### Deployment Options

1. **Vercel** (Recommended)
```bash
npm install -g vercel
vercel
```

2. **Netlify**
```bash
npm install -g netlify-cli
netlify deploy
```

3. **Traditional Hosting**
- Upload the `dist/` folder to your web server
- Configure to serve `index.html` for all routes

## Environment Variables

Required environment variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

## Documentation

### User Guides

- **[Manager Role User Guide](USER_GUIDE_MANAGER_ROLE.md)** - Complete guide for Manager users
  - Role capabilities and limitations
  - Permission matrix
  - Common workflows
  - Tips and best practices
  - FAQ

- **[Admin User Management Guide](ADMIN_GUIDE_USER_MANAGEMENT.md)** - Guide for Admins
  - User creation and management
  - Role assignment procedures
  - Permission overview
  - Monitoring and audit
  - Common admin tasks

### Technical Documentation

- **[Manager Role Migration Guide](MANAGER_ROLE_MIGRATION_GUIDE.md)** - Migration instructions
  - Pre-migration checklist
  - Step-by-step migration
  - Post-migration verification
  - Rollback procedures
  - Troubleshooting

- **[Permission System](src/lib/permissions.ts)** - Permission matrix and utilities
- **[Test Documentation](src/__tests__)** - 157 comprehensive tests

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new features
5. Ensure all tests pass (`npm run test:run`)
6. Test thoroughly
7. Submit a pull request

### Development Workflow

1. Create feature branch from `main`
2. Implement changes following best practices
3. Add/update tests
4. Run linting and tests
5. Update documentation if needed
6. Submit PR with clear description

## License

This project is proprietary software for Tinedy CRM.

## Support

For support, please contact the development team.

### Quick Links

- [Permission System Documentation](src/lib/permissions.ts)
- [Manager Role User Guide](USER_GUIDE_MANAGER_ROLE.md)
- [Admin Guide](ADMIN_GUIDE_USER_MANAGEMENT.md)
- [Migration Guide](MANAGER_ROLE_MIGRATION_GUIDE.md)

---

**Built with ❤️ for Tinedy CRM**

*Version: 2.0 with Manager Role Support*
