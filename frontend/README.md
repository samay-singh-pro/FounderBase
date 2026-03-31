# FoundrBase Frontend

React + TypeScript + Vite frontend application.

## Tech Stack

- **React 19** - UI library
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v3** - Utility-first CSS
- **shadcn/ui** - Component library (Radix UI)
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Zustand** - Client state management
- **Axios** - HTTP client

## Getting Started

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:5173)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure

```
src/
├── components/       # React components
│   └── ui/          # shadcn/ui components (auto-generated)
├── lib/             # Utility functions
│   └── utils.ts     # cn() helper for class names
├── App.tsx          # Root component
├── main.tsx         # Entry point
└── index.css        # Global styles & Tailwind
```

## Adding shadcn/ui Components

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
# etc.
```

Components will be added to `src/components/ui/`
