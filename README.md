# Tinedy CRM - Enterprise Booking Management System

A modern, mobile-first CRM application for managing Cleaning and Training service bookings. Built with React, TypeScript, Tailwind CSS, and Supabase.

## Features

### Admin Portal
- **Dashboard** - Overview of bookings, revenue, customers, and pending tasks
- **Booking Management** - Full CRUD operations for service bookings
- **Customer Management** - Manage customer database with detailed information
- **Calendar** - Visual booking calendar (Coming soon)
- **Staff Management** - Manage staff members and assignments (Coming soon)
- **Team Management** - Organize staff into teams (Coming soon)
- **Chat System** - Internal messaging (Coming soon)
- **Workload Management** - Distribute work among staff (Coming soon)
- **Service Packages** - Create and manage service offerings (Coming soon)
- **Reports & Analytics** - Business insights and metrics (Coming soon)
- **Audit Log** - Track all system changes (Coming soon)
- **Settings** - Configure system preferences (Coming soon)

### Staff Portal
- **My Bookings** - View assigned bookings (Coming soon)
- **Calendar** - Personal schedule (Coming soon)
- **Chat** - Team communication (Coming soon)
- **Profile** - Manage personal information (Coming soon)

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
- `profiles` - User profiles with role-based access
- `customers` - Customer information
- `service_packages` - Available service offerings
- `bookings` - Service booking records
- `teams` - Staff team organization
- `team_members` - Team membership
- `messages` - Chat messages
- `audit_logs` - System audit trail

All tables include:
- Row Level Security (RLS) policies
- Automated timestamps (created_at, updated_at)
- Proper indexes for performance
- Foreign key relationships

## Project Structure

```
src/
├── components/
│   ├── auth/              # Authentication components
│   ├── layout/            # Layout components (Sidebar, Header, etc.)
│   └── ui/                # Reusable UI components (Shadcn UI)
├── contexts/              # React contexts (Auth, etc.)
├── hooks/                 # Custom React hooks
├── lib/                   # Utility functions and configs
│   ├── supabase.ts       # Supabase client
│   └── utils.ts          # Helper functions
├── pages/                 # Page components
│   ├── admin/            # Admin portal pages
│   ├── auth/             # Authentication pages
│   └── staff/            # Staff portal pages
├── types/                 # TypeScript type definitions
│   └── database.types.ts # Database types
├── App.tsx               # Main app component with routing
└── main.tsx              # Application entry point
```

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

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

## Authentication

The app supports role-based authentication:
- **Admin**: Full access to all features
- **Staff**: Limited access to assigned bookings and personal data

Protected routes automatically redirect unauthenticated users to the login page.

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

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is proprietary software for Tinedy CRM.

## Support

For support, please contact the development team.

---

Built with ❤️ for Tinedy CRM
