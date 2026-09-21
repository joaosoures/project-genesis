# Tech Stack & Development Guidelines

## Core Technologies
- **React 18** with **TypeScript** - Primary frontend framework
- **Vite** - Build tool and development server
- **Tailwind CSS** - Utility-first CSS framework for styling
- **Shadcn/ui** - Pre-built UI components based on Radix UI primitives
- **React Router** - Client-side routing (keep routes in src/App.tsx)
- **Supabase** - Backend-as-a-service for database, auth, and storage
- **TanStack Query** - Data fetching and state management
- **Lucide React** - Icon library

## Library Usage Rules

### UI Components
- **Always use shadcn/ui components** when available (found in src/components/ui/)
- **Do not modify shadcn/ui component files** directly - create new components if customization is needed
- **Use Radix UI primitives** as the foundation for any custom UI components
- **Style with Tailwind CSS** exclusively - utilize utility classes for layout, spacing, colors, and design
- **Use lucide-react** for all icons

### State Management & Data
- **Use TanStack Query** for all data fetching and caching
- **Use Supabase** for all backend operations (auth, database, storage)
- **Keep API routes minimal** - prefer Supabase client-side operations with RLS
- **Use React Hook Form** with **Zod** for form validation and management

### Styling & Design
- **Follow the established design system** in src/index.css (Neumorphism light × Deep Navy palette)
- **Use CSS variables** defined in :root for theme consistency
- **Apply Tailwind utility classes** for all styling needs
- **Respect the dark mode** implementation using class strategy
- **Use the cn() utility function** from src/lib/utils.ts for combining Tailwind classes

### File Organization
- **Put pages in src/pages/** - each route corresponds to a page component
- **Put reusable components in src/components/** - organized by feature or type
- **Put shared logic in src/lib/** - utilities, helpers, constants
- **Put custom hooks in src/hooks/** - reusable React hooks
- **Put context providers in src/contexts/** - React context API usage
- **Keep routes centralized in src/App.tsx** - do not split routing configuration

### Development Practices
- **Always update the main page** (src/pages/Index.tsx) to include new components
- **Use lazy loading with Suspense** for route-based code splitting
- **Follow existing patterns** for authentication, data fetching, and error handling
- **Maintain type safety** - leverage TypeScript throughout
- **Keep components small and focused** - prefer composition over inheritance
- **Use the established error boundaries and toast patterns** from the codebase

### Specific Library Guidelines
- **Framer Motion**: Use for animations and transitions
- **Sonner**: Use for toast notifications (import from @/components/ui/sonner)
- **Date-fns**: Use for date formatting and manipulation
- **Stripe**: Use @stripe/react-stripe-js and @stripe/stripe-js for payment processing
- **Driver.js**: Use for product tours and feature highlights
- **Zod**: Use for schema validation, especially with React Hook Form
- **Clsx + tailwind-merge**: Use the cn() utility for conditional class merging