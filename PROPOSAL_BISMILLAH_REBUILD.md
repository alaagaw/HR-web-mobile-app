# Abu Ndar Restaurant App — Architecture & Execution Plan

A modern, modular rebuild of the [Bismillah Restaurant App](https://github.com/Noor-e-Iqra/Bismillah-Restaurant-App-React-Native) built for **long-term maintainability**, **backend flexibility**, and **clean architecture**.

This document serves as both a technical proposal and a mentoring guide. Every decision includes a "why".

---

## Table of Contents

1. [Philosophy & Principles](#1-philosophy--principles)
2. [Tech Stack & Justification](#2-tech-stack--justification)
3. [Architecture Overview](#3-architecture-overview)
4. [SOLID in Practice](#4-solid-in-practice)
5. [Design Patterns Used](#5-design-patterns-used)
6. [Project Structure](#6-project-structure)
7. [The Service Layer — Backend Flexibility](#7-the-service-layer--backend-flexibility)
8. [Database Schema](#8-database-schema)
9. [Screen Inventory](#9-screen-inventory)
10. [Design System](#10-design-system)
11. [Execution Plan — Step by Step](#11-execution-plan--step-by-step)
12. [Future Enhancements](#12-future-enhancements)

---

## 1. Philosophy & Principles

### Why modular?

The #1 mistake in mobile apps is coupling your UI to your backend. When screens call `supabase.from('menu').select()` directly, every screen becomes glued to Supabase. Swapping backends later means rewriting every screen.

**Our rule: Screens never know what backend they're talking to.**

### SOLID Principles (simplified for this project)

| Principle | What it means here |
|-----------|-------------------|
| **S — Single Responsibility** | Each file does one thing. A screen renders UI. A service fetches data. A store holds state. They don't mix. |
| **O — Open/Closed** | Adding a new backend (e.g., Express API) means adding a new service file — not modifying existing screens or stores. |
| **L — Liskov Substitution** | Any service that implements `AuthService` can replace any other. Supabase auth, Firebase auth, custom JWT — the app doesn't care. |
| **I — Interface Segregation** | We don't create one giant `BackendService`. We create small, focused interfaces: `AuthService`, `MenuService`, `CartService`, `OrderService`. |
| **D — Dependency Inversion** | Screens depend on abstract interfaces (types), not concrete implementations (Supabase SDK). The concrete implementation is injected via a provider. |

---

## 2. Tech Stack & Justification

### Frontend

| Technology | Version | Why |
|-----------|---------|-----|
| **Expo SDK 54** | ~54.0 | Managed workflow — no Xcode/Android Studio setup needed. Handles native modules, OTA updates, builds. Already set up. |
| **TypeScript** | ~5.9 | Catches bugs at compile time. Makes refactoring safe. Essential for the interface/service pattern we'll use. Already set up. |
| **Expo Router v6** | ~6.0 | File-based routing (like Next.js). URLs work on web automatically. Deep linking is free. Type-safe routes. Already set up. |
| **NativeWind v4** | Latest | Tailwind CSS for React Native. Utility-first styling means no stylesheet files. Consistent spacing/colors. Works on web + native. |
| **Zustand** | Latest | State management in ~5 lines per store. No boilerplate (unlike Redux). Supports persistence, middleware, devtools. |
| **React Hook Form + Zod** | Latest | RHF: uncontrolled forms = fewer re-renders = better perf. Zod: TypeScript-first validation — one schema generates both types and validation. |
| **Lucide React Native** | Latest | 1000+ vector icons, tree-shakeable (only ships icons you use). Replaces 28 custom PNG files from the original app. |
| **expo-image** | ~3.0 | Built-in caching, blur placeholders, animated transitions. Already installed. |
| **react-native-reanimated** | ~4.1 | 60fps animations on the UI thread. Already installed. |

### Backend (Starting Point)

| Technology | Why |
|-----------|-----|
| **Supabase (PostgreSQL)** | Free tier is generous. Auto-generated REST API from tables. Built-in auth, storage, and realtime. No backend code to write on day one. |

### Why not Firebase?

The original app used Firebase Realtime Database. We're moving away because:

- Firebase Realtime DB is a giant JSON tree — no relations, no joins, lots of data duplication
- Querying is limited (can't filter on multiple fields easily)
- Supabase uses PostgreSQL — real SQL, real relations, real queries
- Supabase is open-source — you can self-host if needed
- **Most importantly**: our architecture makes this choice reversible

### Why not start with Express/Django?

- You'd need to write, host, and maintain a backend server on day one
- Supabase gives you the same result (API + Auth + DB) with zero server code
- When the app grows and you need custom business logic, you can add Express/Django for specific features while keeping Supabase Auth
- This is a common production pattern: **Supabase Auth + custom API for business logic + Supabase Storage for files**

---

## 3. Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                        SCREENS                          │
│   (tabs)/index.tsx  ·  item/[id].tsx  ·  cart.tsx  ... │
│                                                         │
│   Screens only call hooks. They never import services.  │
└─────────────────┬───────────────────────────────────────┘
                  │ uses
┌─────────────────▼───────────────────────────────────────┐
│                     HOOKS + STORES                       │
│   useMenu()  ·  useCart()  ·  useAuth()  ·  useOrders() │
│                                                         │
│   Hooks call services. Stores hold client-side state.   │
└─────────────────┬───────────────────────────────────────┘
                  │ calls
┌─────────────────▼───────────────────────────────────────┐
│                   SERVICE INTERFACES                     │
│   AuthService  ·  MenuService  ·  CartService  ·  ...   │
│                                                         │
│   TypeScript interfaces. Define WHAT, not HOW.          │
└─────────────────┬───────────────────────────────────────┘
                  │ implemented by
┌─────────────────▼───────────────────────────────────────┐
│               CONCRETE IMPLEMENTATIONS                   │
│                                                         │
│   supabase/           express/          firebase/       │
│   ├── auth.ts         ├── auth.ts       ├── auth.ts    │
│   ├── menu.ts         ├── menu.ts       ├── menu.ts    │
│   ├── cart.ts         ├── cart.ts       ├── cart.ts    │
│   └── orders.ts       └── orders.ts     └── orders.ts  │
│                                                         │
│   Only ONE folder is active at a time (per service).    │
│   You can MIX: Supabase auth + Express menu + etc.      │
└─────────────────────────────────────────────────────────┘
```

### The key insight

Swapping from Supabase to Express means:

1. Write new files in `services/express/`
2. Change one line in `services/index.ts` (the barrel export)
3. Zero screen changes. Zero store changes. Zero hook changes.

You can also **mix providers**: use Supabase for auth + storage, and Express for menu/orders/cart. Each service is independent.

---

## 4. SOLID in Practice

### Single Responsibility — One file, one job

```
BAD:  CartScreen.tsx fetches cart data, manages quantities, calculates totals, calls Supabase
GOOD: CartScreen.tsx renders UI using useCart() hook
      useCart.ts hook reads from cartStore and calls cartService
      cartStore.ts manages cart state
      cartService.ts handles API calls
```

### Open/Closed — Extend without modifying

```
To add Express backend:
  ADD:    services/express/menu.ts (new file)
  CHANGE: services/index.ts (one import line)
  MODIFY: nothing else — screens, hooks, stores are untouched
```

### Interface Segregation — Small, focused contracts

```typescript
// NOT this — one giant interface
interface BackendService {
  signIn(); signUp(); getMenu(); addToCart(); placeOrder(); uploadPhoto(); ...
}

// YES this — small focused interfaces
interface AuthService { signIn(); signUp(); signOut(); getSession(); }
interface MenuService { getItems(); getCategories(); searchItems(); }
interface CartService { getCart(); addItem(); removeItem(); updateQty(); }
interface OrderService { placeOrder(); getOrders(); cancelOrder(); trackOrder(); }
interface StorageService { uploadImage(); getImageUrl(); }
```

### Dependency Inversion — Depend on abstractions

```typescript
// useMenu hook depends on the MenuService TYPE, not the Supabase implementation
// If we swap Supabase for Express, useMenu.ts doesn't change at all

import { menuService } from '@/services';  // ← abstract import

function useMenu() {
  const items = menuService.getItems();     // ← doesn't know it's Supabase
}
```

---

## 5. Design Patterns Used

| Pattern | Where | Why |
|---------|-------|-----|
| **Repository Pattern** | `services/` layer | Abstracts data access behind interfaces. The app doesn't know if data comes from Supabase, REST API, or local storage. |
| **Provider/Registry Pattern** | `services/index.ts` | Single file that wires concrete implementations to interfaces. Change backends by changing this one file. |
| **Custom Hook Pattern** | `hooks/` | Encapsulates data fetching + state logic. Screens stay clean — they just call `useMenu()` and render. |
| **Store Pattern (Zustand)** | `stores/` | Client-side state (cart contents, auth user, favorites) lives in stores. Persisted to device storage. Survives app restarts. |
| **Adapter Pattern** | Service implementations | Each backend adapter (Supabase, Express, Firebase) adapts its specific SDK to our common interface. |
| **Composition over Inheritance** | Components | Small, composable UI components (`Card`, `Button`, `Badge`) combined to build screens. No deep inheritance chains. |

---

## 6. Project Structure

```
restaurant-app/
│
├── app/                              # SCREENS (Expo Router file-based routing)
│   ├── _layout.tsx                   #   Root layout: fonts, providers, splash
│   ├── (tabs)/                       #   Tab navigator group
│   │   ├── _layout.tsx               #     Tab bar config (5 tabs)
│   │   ├── index.tsx                 #     Home — hero, search, categories, popular
│   │   ├── menu.tsx                  #     Full menu — browse by category
│   │   ├── favorites.tsx             #     Saved items
│   │   ├── cart.tsx                  #     Shopping cart
│   │   └── account.tsx              #     Profile / auth prompt
│   ├── item/
│   │   └── [id].tsx                  #   Item detail (modal presentation)
│   ├── orders/
│   │   ├── index.tsx                 #   Order history
│   │   └── [id]/
│   │       └── track.tsx             #   Live order tracking (map)
│   ├── auth/
│   │   ├── sign-in.tsx               #   Login form
│   │   ├── sign-up.tsx               #   Registration form
│   │   └── forgot-password.tsx       #   Password reset
│   └── account/
│       └── edit.tsx                  #   Edit profile + photo
│
├── components/                       # REUSABLE UI COMPONENTS
│   ├── ui/                           #   Design system primitives
│   │   ├── button.tsx                #     Primary, secondary, outline variants
│   │   ├── input.tsx                 #     Text input with label + error
│   │   ├── card.tsx                  #     Surface container
│   │   ├── badge.tsx                 #     Status/count badge
│   │   ├── skeleton.tsx              #     Loading placeholder
│   │   └── icon-button.tsx           #     Circular icon tap target
│   ├── menu/
│   │   ├── menu-card.tsx             #   Food item card (image, name, price, heart)
│   │   ├── category-pill.tsx         #   Horizontal scrollable category selector
│   │   └── search-bar.tsx            #   Animated search input
│   ├── cart/
│   │   ├── cart-item.tsx             #   Cart row (image, name, qty +/-, price, delete)
│   │   └── cart-summary.tsx          #   Total + checkout button
│   ├── orders/
│   │   ├── order-card.tsx            #   Order in history list
│   │   └── delivery-map.tsx          #   Map with markers + route
│   └── layout/
│       ├── screen-header.tsx         #   Back button + title + optional action
│       └── tab-bar.tsx               #   Custom styled tab bar
│
├── hooks/                            # CUSTOM HOOKS (bridge between screens and services)
│   ├── use-auth.ts                   #   Auth state + sign in/up/out methods
│   ├── use-menu.ts                   #   Menu items + categories + search
│   ├── use-cart.ts                   #   Cart CRUD + totals
│   ├── use-favorites.ts             #   Favorites toggle + list
│   └── use-orders.ts                #   Order history + placement + tracking
│
├── stores/                           # ZUSTAND STORES (client-side state)
│   ├── auth-store.ts                 #   Current user, session token
│   ├── cart-store.ts                 #   Cart items, quantities (persisted)
│   └── favorites-store.ts           #   Favorite item IDs (persisted)
│
├── services/                         # SERVICE LAYER (backend abstraction)
│   ├── types.ts                      #   ★ Service interfaces (AuthService, MenuService, etc.)
│   ├── index.ts                      #   ★ Barrel export — THE place to swap backends
│   ├── supabase/                     #   Supabase implementation
│   │   ├── client.ts                 #     Supabase client initialization
│   │   ├── auth.ts                   #     AuthService implementation
│   │   ├── menu.ts                   #     MenuService implementation
│   │   ├── cart.ts                   #     CartService implementation
│   │   ├── orders.ts                #     OrderService implementation
│   │   └── storage.ts               #     StorageService implementation
│   └── express/                      #   (Future) Express API implementation
│       ├── client.ts                 #     Axios/fetch client with base URL
│       ├── auth.ts                   #     Could reuse Supabase auth or use JWT
│       ├── menu.ts                   #     REST calls to Express endpoints
│       ├── cart.ts
│       ├── orders.ts
│       └── storage.ts
│
├── types/                            # SHARED TYPESCRIPT TYPES
│   ├── models.ts                     #   MenuItem, CartItem, Order, User, Category
│   └── navigation.ts                #   Route params (if needed beyond expo-router)
│
├── constants/                        # STATIC DATA + THEME TOKENS
│   ├── theme.ts                      #   Colors, fonts, spacing (used by Tailwind + code)
│   ├── categories.ts                 #   Static category data (id, name, icon)
│   └── menu-data.ts                  #   Mock menu data (for development before backend)
│
├── lib/                              # UTILITIES
│   ├── utils.ts                      #   Formatting helpers (currency, dates)
│   └── validators.ts                #   Zod schemas (shared between forms and API)
│
├── assets/                           # STATIC ASSETS
│   ├── images/                       #   App icon, splash, logo
│   └── fonts/                        #   Poppins font files (Regular, Medium, SemiBold, Bold)
│
├── global.css                        # Tailwind CSS entry point
├── tailwind.config.ts                # Tailwind theme customization
├── app.json                          # Expo configuration
├── tsconfig.json                     # TypeScript configuration
└── package.json                      # Dependencies
```

### Why this structure?

- **`app/`** — Only screen files. No business logic. Easy to see all routes at a glance.
- **`components/`** — Grouped by domain (menu, cart, orders) + shared `ui/` primitives. Follows atomic design loosely.
- **`hooks/`** — The "glue" layer. Screens import hooks, hooks import services. This is where data fetching and state updates happen.
- **`stores/`** — Client-side state only. Cart contents while browsing, current user session. Not a mirror of the database.
- **`services/`** — The critical layer. Backend-specific code is **quarantined** here. Nothing outside this folder knows what backend you're using.
- **`types/`** — Shared across all layers. A `MenuItem` type is the same whether it comes from Supabase or Express.

---

## 7. The Service Layer — Backend Flexibility

### The Interface File (`services/types.ts`)

This is the most important file in the project. It defines **what** the app can do, without saying **how**.

```
AuthService
├── signIn(email, password) → User
├── signUp(email, password, name, phone) → User
├── signOut() → void
├── getSession() → User | null
└── onAuthStateChange(callback) → unsubscribe

MenuService
├── getCategories() → Category[]
├── getItems(categoryId?) → MenuItem[]
├── getItemById(id) → MenuItem
├── searchItems(query) → MenuItem[]
└── getPopularItems() → MenuItem[]

CartService
├── getCart(userId) → CartItem[]
├── addItem(userId, itemId, qty) → void
├── removeItem(userId, itemId) → void
├── updateQuantity(userId, itemId, qty) → void
└── clearCart(userId) → void

OrderService
├── placeOrder(userId, items, total) → Order
├── getOrders(userId) → Order[]
├── getOrderById(id) → Order
├── cancelOrder(id) → void
└── trackOrder(id) → OrderStatus (realtime)

StorageService
├── uploadProfilePhoto(userId, file) → url string
└── getProfilePhotoUrl(userId) → url string

UserService
├── getProfile(userId) → UserProfile
└── updateProfile(userId, data) → UserProfile
```

### How swapping works

**`services/index.ts`** — The registry:

```
// Today: everything from Supabase
export { authService } from './supabase/auth'
export { menuService } from './supabase/menu'
export { cartService } from './supabase/cart'
export { orderService } from './supabase/orders'

// Tomorrow: mix and match
export { authService } from './supabase/auth'      ← keep Supabase auth
export { menuService } from './express/menu'        ← moved to Express
export { cartService } from './express/cart'         ← moved to Express
export { orderService } from './express/orders'      ← moved to Express
```

**That's it.** One file changes. Zero screens touched.

### Migration scenarios

| Scenario | What changes |
|----------|-------------|
| Keep everything on Supabase | Nothing — this is the starting point |
| Move menu/cart/orders to Express, keep Supabase Auth | Write `services/express/*.ts`, update `services/index.ts` |
| Move everything to Express + JWT auth | Write all `services/express/*.ts`, update `services/index.ts` |
| Move to Django | Write `services/django/*.ts` (same HTTP calls, different base URL), update `services/index.ts` |
| Use Firebase instead | Write `services/firebase/*.ts`, update `services/index.ts` |

---

## 8. Database Schema

### PostgreSQL Tables (Supabase)

```sql
-- Users (managed by Supabase Auth, extended with profile)
profiles
├── id              UUID (FK → auth.users.id)  PRIMARY KEY
├── name            TEXT NOT NULL
├── phone           TEXT
├── photo_url       TEXT
├── created_at      TIMESTAMPTZ DEFAULT now()
└── updated_at      TIMESTAMPTZ DEFAULT now()

-- Food categories
categories
├── id              SERIAL PRIMARY KEY
├── name            TEXT NOT NULL
├── icon            TEXT NOT NULL          -- Lucide icon name (e.g., "beef", "fish")
└── sort_order      INT DEFAULT 0

-- Menu items
menu_items
├── id              SERIAL PRIMARY KEY
├── name            TEXT NOT NULL
├── description     TEXT
├── price           DECIMAL(10,2) NOT NULL
├── rating          DECIMAL(2,1) DEFAULT 0.0
├── duration        TEXT                   -- e.g., "20-25 min"
├── image_url       TEXT
├── category_id     INT (FK → categories.id)
├── is_available    BOOLEAN DEFAULT true
└── created_at      TIMESTAMPTZ DEFAULT now()

-- Shopping cart
cart_items
├── id              SERIAL PRIMARY KEY
├── user_id         UUID (FK → auth.users.id)
├── item_id         INT (FK → menu_items.id)
├── quantity        INT DEFAULT 1
└── created_at      TIMESTAMPTZ DEFAULT now()
└── UNIQUE(user_id, item_id)              -- one row per user+item combo

-- Favorites
favorites
├── id              SERIAL PRIMARY KEY
├── user_id         UUID (FK → auth.users.id)
├── item_id         INT (FK → menu_items.id)
└── created_at      TIMESTAMPTZ DEFAULT now()
└── UNIQUE(user_id, item_id)

-- Orders
orders
├── id              UUID DEFAULT gen_random_uuid() PRIMARY KEY
├── user_id         UUID (FK → auth.users.id)
├── status          TEXT DEFAULT 'pending'  -- pending, preparing, delivering, delivered, cancelled
├── total           DECIMAL(10,2) NOT NULL
├── estimated_mins  INT
├── created_at      TIMESTAMPTZ DEFAULT now()
└── updated_at      TIMESTAMPTZ DEFAULT now()

-- Order line items (each item in an order)
order_items
├── id              SERIAL PRIMARY KEY
├── order_id        UUID (FK → orders.id)
├── item_id         INT (FK → menu_items.id)
├── quantity        INT NOT NULL
├── unit_price      DECIMAL(10,2) NOT NULL  -- snapshot of price at order time
└── UNIQUE(order_id, item_id)
```

### Why this schema?

- **Normalized** — No data duplication. Item name/price stored once in `menu_items`, not copied into cart and orders.
- **`order_items.unit_price`** — Snapshot of price when ordered. If menu price changes later, past orders stay accurate.
- **`UNIQUE` constraints** — Prevent duplicate cart entries or double-favoriting. The app handles "add again = increase quantity" in the service layer.
- **`profiles` separate from `auth.users`** — Supabase manages auth users internally. We extend it with a `profiles` table for app-specific data (phone, photo).
- **`status` as TEXT** — Simple, readable. Could be an ENUM for stricter validation. Good enough for now.

### If you migrate to Express + PostgreSQL later

**The schema stays exactly the same.** You just connect your Express server to the same (or migrated) PostgreSQL database. The tables, relations, and constraints don't change.

---

## 9. Screen Inventory

### Tab Screens (5 tabs)

| Tab | Route | Purpose | Key Components |
|-----|-------|---------|----------------|
| Home | `/(tabs)/` | Landing page. Hero area, search bar, horizontal category scroll, popular items grid (rating >= 4.5) | `search-bar`, `category-pill`, `menu-card` |
| Menu | `/(tabs)/menu` | Full menu browsing. Category tabs at top, scrollable item grid below. Tap category = filter. | `category-pill`, `menu-card` |
| Favorites | `/(tabs)/favorites` | Grid of favorited items. Heart icon to remove. Empty state when none. | `menu-card`, empty state |
| Cart | `/(tabs)/cart` | Cart items with quantity controls (+/-), swipe to delete, running total, "Place Order" button | `cart-item`, `cart-summary` |
| Account | `/(tabs)/account` | If logged in: profile card (photo, name, email, phone), edit button, logout. If not: prompt to sign in. | `button`, profile display |

### Stack Screens

| Route | Purpose | Notes |
|-------|---------|-------|
| `/item/[id]` | Item detail. Large image, name, description, price, rating, duration. "Add to Cart" button. | Presented as modal with shared element transition on the food image |
| `/orders/` | Order history list. Each order shows items, total, status badge, date. "Track" and "Cancel" buttons. | Only accessible when authenticated |
| `/orders/[id]/track` | Live map. Restaurant marker, user marker, delivery route polyline. Status steps at bottom. | Uses react-native-maps |
| `/auth/sign-in` | Email + password form. Link to sign-up and forgot-password. | React Hook Form + Zod validation |
| `/auth/sign-up` | Name, email, password, phone form. Link to sign-in. | React Hook Form + Zod validation |
| `/auth/forgot-password` | Email-only form. Sends reset link. | Simple form |
| `/account/edit` | Edit name, phone. Tap photo to change via image picker. Save button. | expo-image-picker |

---

## 10. Design System

### Color Palette

| Token | Hex | Usage |
|-------|-----|-------|
| `primary` | `#D4A052` | Warm gold. Buttons, active states, accents. Refined version of original `#E1AD01`. |
| `primary-dark` | `#B8862D` | Pressed/hover state for primary |
| `secondary` | `#1A1A2E` | Deep navy. Headers, dark backgrounds |
| `background` | `#FAFAF8` | Off-white. Screen backgrounds |
| `surface` | `#FFFFFF` | Cards, sheets, elevated surfaces |
| `text` | `#1F2937` | Primary text (dark charcoal) |
| `text-muted` | `#6B7280` | Secondary text, labels |
| `text-light` | `#9CA3AF` | Placeholder text, disabled |
| `border` | `#E5E7EB` | Subtle borders, dividers |
| `success` | `#16A34A` | Order delivered, success states |
| `warning` | `#F59E0B` | Order preparing, pending |
| `error` | `#DC2626` | Validation errors, cancel |

### Dark Mode Variants

| Token | Light | Dark |
|-------|-------|------|
| `background` | `#FAFAF8` | `#0F0F14` |
| `surface` | `#FFFFFF` | `#1A1A2E` |
| `text` | `#1F2937` | `#E5E7EB` |
| `text-muted` | `#6B7280` | `#9CA3AF` |
| `border` | `#E5E7EB` | `#2D2D3F` |

### Typography (Poppins)

| Style | Weight | Size | Use |
|-------|--------|------|-----|
| Display | Bold (700) | 28px | Screen titles, hero text |
| Heading | SemiBold (600) | 22px | Section headers |
| Subheading | Medium (500) | 18px | Card titles, item names |
| Body | Regular (400) | 16px | Descriptions, content |
| Caption | Regular (400) | 14px | Labels, secondary info |
| Small | Medium (500) | 12px | Badges, timestamps |

### Component Styling Rules

- **Border radius**: `rounded-2xl` (16px) for cards, `rounded-full` for pills/badges/avatars
- **Shadows**: Subtle only. `shadow-sm` for cards, `shadow-md` for floating elements
- **Spacing**: 4px grid — `p-4` (16px), `gap-3` (12px), `mb-6` (24px)
- **Touch targets**: Minimum 44x44px (Apple HIG)
- **Image aspect ratio**: 4:3 for food cards, 16:9 for hero/detail

---

## 11. Execution Plan — Step by Step

### Prerequisites: Environment Setup (From Zero)

> **Audience**: A mentee with a fresh machine. Nothing is installed.

#### Step 0.1 — Install Node.js

- Download **Node.js LTS** (v20+) from https://nodejs.org
- Run installer, accept defaults
- Verify: open terminal, run `node --version` and `npm --version`
- **Why**: Node.js is the JavaScript runtime. npm is its package manager. Everything in our stack depends on it.

#### Step 0.2 — Install Git

- Download from https://git-scm.com
- Run installer, accept defaults
- Verify: `git --version`
- Configure: `git config --global user.name "Your Name"` and `git config --global user.email "you@email.com"`
- **Why**: Version control. Every change is tracked. You can undo mistakes. Required for collaboration.

#### Step 0.3 — Install VS Code

- Download from https://code.visualstudio.com
- Install these extensions:
  - **ESLint** — catches code issues
  - **Tailwind CSS IntelliSense** — autocomplete for class names
  - **Prettier** — auto-formats code
  - **ES7+ React/Redux/React-Native snippets** — code shortcuts
- **Why**: Best editor for TypeScript + React Native. Extensions give you autocomplete, error highlighting, and formatting.

#### Step 0.4 — Install Expo CLI

- Run: `npm install -g expo-cli`
- Also install EAS CLI: `npm install -g eas-cli`
- Verify: `expo --version`
- **Why**: Expo CLI runs your development server, builds your app, and manages dependencies.

#### Step 0.5 — Install Expo Go on your phone

- iOS: App Store → "Expo Go"
- Android: Play Store → "Expo Go"
- **Why**: Lets you test the app on your real phone by scanning a QR code. No emulator needed.

#### Step 0.6 — Create a Supabase account

- Go to https://supabase.com → Sign up (free)
- Create a new project (name: "abu-ndar", region: closest to you)
- Note down: **Project URL** and **anon key** (found in Project Settings → API)
- **Why**: This is your backend. Database, auth, file storage — all in one.

#### Step 0.7 — (Optional) Install Android Studio / Xcode

- **Android Studio**: For Android emulator (Windows/Mac/Linux)
- **Xcode**: For iOS simulator (Mac only)
- Only needed if you want to test on emulators. Expo Go on a physical phone works fine.

---

### Phase 1 — Foundation (NativeWind + Theme + Types)

> **Goal**: Project builds and runs with Tailwind CSS working. No features yet.

#### Step 1.1 — Initialize Git repository

- `cd restaurant-app && git init`
- Create `.gitignore` (node_modules, .expo, etc.)
- Initial commit
- **Why**: Start tracking changes from day one. Every phase gets its own commits.

#### Step 1.2 — Install NativeWind v4

- `npm install nativewind tailwindcss`
- Create `tailwind.config.ts` with custom colors/fonts from our design system
- Create `global.css` with `@tailwind` directives
- Update `app/_layout.tsx` to import `global.css`
- Update `metro.config.js` for NativeWind
- Update `babel.config.js` for NativeWind
- Verify: add `className="bg-primary"` to a test View, confirm it turns gold
- **Why**: Tailwind must work before we build any UI. It affects every component we'll create.

#### Step 1.3 — Install and load Poppins font

- Download Poppins (Regular, Medium, SemiBold, Bold) from Google Fonts
- Place in `assets/fonts/`
- Load via `expo-font` in root `_layout.tsx`
- Configure in `tailwind.config.ts` as `fontFamily`
- **Why**: Typography is a core part of the design. Every text element will use Poppins.

#### Step 1.4 — Define TypeScript types

- Create `types/models.ts` with: `User`, `Category`, `MenuItem`, `CartItem`, `Order`, `OrderItem`, `OrderStatus`
- **Why**: Types are the contract between all layers. Define them first so every file agrees on data shapes.

#### Step 1.5 — Define service interfaces

- Create `services/types.ts` with: `AuthService`, `MenuService`, `CartService`, `OrderService`, `StorageService`, `UserService`
- **Why**: This is the architectural backbone. Interfaces before implementations. Everything depends on these contracts.

#### Step 1.6 — Create mock data

- Create `constants/categories.ts` — 8-10 food categories with Lucide icon names
- Create `constants/menu-data.ts` — 15-20 mock menu items (name, price, rating, image placeholder, category)
- **Why**: We'll build the entire UI against mock data first. Backend integration comes later. This lets us iterate on design without waiting for database setup.

#### Step 1.7 — Install remaining dependencies

- `npm install zustand lucide-react-native react-native-svg`
- `npm install react-hook-form @hookform/resolvers zod`
- `npm install @supabase/supabase-js`
- **Why**: Install everything now so we don't interrupt UI work later with dependency issues.

---

### Phase 2 — Design System Components

> **Goal**: All reusable UI primitives built and visually tested.

#### Step 2.1 — Build `ui/button.tsx`

- Variants: primary (gold), secondary (outlined), ghost (text only)
- States: default, pressed, disabled, loading
- Props: `variant`, `size`, `loading`, `disabled`, `onPress`, `children`
- **Why**: Used on every screen. Build it once, reuse everywhere.

#### Step 2.2 — Build `ui/input.tsx`

- Label above, text input, error message below
- States: default, focused (primary border), error (red border)
- Props: `label`, `error`, `placeholder`, + all TextInput props
- **Why**: Used in all auth forms and profile editing.

#### Step 2.3 — Build `ui/card.tsx`

- White surface, rounded corners, subtle shadow
- Props: `children`, `className` (for Tailwind overrides)
- **Why**: Container for menu items, cart items, order cards.

#### Step 2.4 — Build `ui/badge.tsx`

- Small colored pill with text
- Variants: primary, success, warning, error
- Props: `variant`, `children`
- **Why**: Order status (pending, delivering, delivered), cart count.

#### Step 2.5 — Build `ui/skeleton.tsx`

- Animated pulsing placeholder rectangles
- Props: `width`, `height`, `rounded`
- **Why**: Shown while data is loading. Better UX than a spinner.

#### Step 2.6 — Build `ui/icon-button.tsx`

- Circular touchable with icon
- Props: `icon` (Lucide icon component), `size`, `onPress`, `variant`
- **Why**: Back buttons, favorites heart, delete, quantity +/-.

#### Step 2.7 — Build `layout/screen-header.tsx`

- Back arrow (left), title (center), optional action button (right)
- Props: `title`, `showBack`, `rightAction`
- **Why**: Used on every non-tab screen (item detail, orders, auth, edit profile).

---

### Phase 3 — Tab Layout + Home Screen

> **Goal**: App has 5-tab navigation with a polished home screen.

#### Step 3.1 — Configure 5-tab layout

- Update `app/(tabs)/_layout.tsx` for: Home, Menu, Favorites, Cart, Account
- Custom tab bar component with Lucide icons
- Active tab indicator (animated)
- **Why**: The tab bar is the primary navigation. Users see it on every screen.

#### Step 3.2 — Build `menu/category-pill.tsx`

- Horizontal scrollable list of category pills
- Selected state: filled gold background, white text
- Unselected state: white background, dark text
- Props: `categories`, `selected`, `onSelect`

#### Step 3.3 — Build `menu/menu-card.tsx`

- Food image (expo-image with placeholder), name, price, rating stars, heart icon
- Tap card → navigate to item detail
- Tap heart → toggle favorite
- Props: `item`, `isFavorite`, `onPressFavorite`, `onPress`

#### Step 3.4 — Build `menu/search-bar.tsx`

- Search icon, text input, clear button
- Debounced search (300ms delay before triggering)
- Props: `onSearch`, `placeholder`

#### Step 3.5 — Build Home screen

- Hero section: restaurant name/tagline + search bar
- Categories: horizontal scroll of `category-pill`
- Popular items: 2-column grid of `menu-card` (items with rating >= 4.5)
- Uses mock data from `constants/menu-data.ts`

---

### Phase 4 — Menu + Item Detail + Favorites

> **Goal**: Users can browse menu, view item details, and favorite items.

#### Step 4.1 — Build Menu screen

- Category pills at top (tap to filter)
- Full item grid below (2 columns)
- "All" default category showing everything
- Uses mock data

#### Step 4.2 — Build Item Detail screen (`/item/[id]`)

- Large food image at top (takes ~40% of screen)
- Content sheet below: name, description, rating, duration, price
- "Add to Cart" button (full width, sticky bottom)
- Quantity selector (optional: choose qty before adding)

#### Step 4.3 — Set up Zustand favorites store

- `favorites-store.ts`: Set of item IDs. `toggle(id)`, `isFavorite(id)`, `getAll()`
- Persisted to device storage (AsyncStorage/MMKV)
- **Why**: Favorites work offline. No backend call needed to check if something is favorited.

#### Step 4.4 — Build Favorites screen

- Grid of `menu-card` for favorited items
- Empty state: illustration + "No favorites yet" text + "Browse Menu" button
- Heart icon removes from favorites

---

### Phase 5 — Cart + Order Placement

> **Goal**: Users can manage cart and place orders.

#### Step 5.1 — Set up Zustand cart store

- `cart-store.ts`: Map of `itemId → { item, quantity }`
- Methods: `addItem`, `removeItem`, `updateQty`, `clearCart`, `getTotal`, `getItemCount`
- Persisted to device storage
- **Why**: Cart works offline. Backend sync happens when placing the order.

#### Step 5.2 — Build `cart/cart-item.tsx`

- Row: food image, name, unit price, quantity controls (+/-), line total, delete button
- Quantity minimum is 1. Delete button removes entirely.

#### Step 5.3 — Build `cart/cart-summary.tsx`

- Subtotal, delivery fee (static or calculated), total
- "Place Order" button
- Item count summary

#### Step 5.4 — Build Cart screen

- List of `cart-item`
- `cart-summary` sticky at bottom
- Empty state: "Cart is empty" + "Browse Menu" button
- Swipe to delete (optional enhancement)

#### Step 5.5 — Build order placement flow

- "Place Order" → confirmation prompt → create order → navigate to order confirmation/tracking
- Clear cart after successful order

---

### Phase 6 — Authentication

> **Goal**: Users can sign up, sign in, reset password. Protected routes work.

#### Step 6.1 — Set up Supabase client

- Create `services/supabase/client.ts`
- Initialize with project URL + anon key (from environment/constants)
- **Why**: Single client instance shared by all Supabase services.

#### Step 6.2 — Implement Supabase AuthService

- `services/supabase/auth.ts` implementing `AuthService` interface
- Sign in, sign up, sign out, session management, auth state listener

#### Step 6.3 — Set up auth store + hook

- `stores/auth-store.ts`: current user, loading state
- `hooks/use-auth.ts`: wraps store + service. Provides `signIn()`, `signUp()`, `signOut()`, `user`, `isAuthenticated`

#### Step 6.4 — Build auth screens

- `/auth/sign-in` — email + password form with Zod validation
- `/auth/sign-up` — name + email + password + phone form
- `/auth/forgot-password` — email form, sends reset link
- All use `ui/input` and `ui/button` components
- Error display for invalid credentials, network errors

#### Step 6.5 — Add route protection

- Wrap order-related routes: must be authenticated to place order, view orders
- Account screen: show profile if logged in, show sign-in prompt if not
- Cart "Place Order": redirect to sign-in if not authenticated, return after auth

---

### Phase 7 — Backend Integration (Supabase)

> **Goal**: Replace mock data with real Supabase data. App is fully functional.

#### Step 7.1 — Set up Supabase database

- Create tables via Supabase SQL editor (use schema from Section 8)
- Set up Row Level Security (RLS) policies:
  - `menu_items` and `categories`: readable by everyone (public)
  - `cart_items`, `favorites`, `orders`, `order_items`: users can only read/write their own rows
  - `profiles`: users can only read/update their own profile
- Seed with initial data: categories + 15-20 menu items
- **Why**: RLS is Supabase's security model. Without it, any user can read/modify any data.

#### Step 7.2 — Implement MenuService

- `services/supabase/menu.ts`
- `getItems()` → `supabase.from('menu_items').select('*, categories(*)')`
- `searchItems(query)` → `supabase.from('menu_items').ilike('name', '%query%')`
- `getPopularItems()` → `supabase.from('menu_items').gte('rating', 4.5)`

#### Step 7.3 — Implement CartService

- `services/supabase/cart.ts`
- Sync local cart store with Supabase cart_items table when user is authenticated
- Unauthenticated users: cart stays local only (Zustand store)
- On sign-in: merge local cart with server cart

#### Step 7.4 — Implement OrderService

- `services/supabase/orders.ts`
- Place order: insert into `orders` + `order_items`, clear `cart_items`
- Get orders: query with joins to get item details
- Cancel: update status to 'cancelled' (soft delete — don't actually delete)

#### Step 7.5 — Implement StorageService + UserService

- Profile photo upload to Supabase Storage
- Profile CRUD on `profiles` table

#### Step 7.6 — Wire services to barrel export

- Update `services/index.ts` to export Supabase implementations
- Hooks now call real services instead of mock data
- Test every flow end-to-end

---

### Phase 8 — Account + Profile

> **Goal**: Users can view and edit their profile.

#### Step 8.1 — Build Account screen

- Authenticated: profile card (photo, name, email, phone), "Edit Profile" button, "Logout" button
- Unauthenticated: "Sign in to view your profile" prompt with sign-in button

#### Step 8.2 — Build Edit Profile screen

- Editable fields: name, phone
- Tap profile photo → `expo-image-picker` → upload to Supabase Storage
- Save button → update profile via UserService

---

### Phase 9 — Orders + Tracking

> **Goal**: Users can view order history and track active orders.

#### Step 9.1 — Build Order History screen

- List of orders with: order ID, item names, total, status badge, date
- "Track" button → navigate to tracking screen
- "Cancel" button → confirmation → cancel order
- Empty state: "No orders yet"

#### Step 9.2 — Build Order Tracking screen

- Map with restaurant and user markers
- Delivery route polyline (hardcoded demo route — same as original app)
- Status timeline at bottom: ordered → preparing → delivering → delivered
- Courier info card: name, phone (tap to call)

#### Step 9.3 — (Optional) Realtime order updates

- Subscribe to order status changes via Supabase Realtime
- Status badge updates live without refresh
- **Why this is optional**: Requires an admin interface to update order status. Can be added later.

---

### Phase 10 — Polish + Testing

> **Goal**: App feels complete and professional.

#### Step 10.1 — Animations

- Add-to-cart: item image flies to cart tab icon (or a bounce animation on the cart badge)
- Screen transitions: shared element transition on food image (item card → detail)
- Skeleton loading: pulsing placeholders while data loads
- Tab switch: smooth animated indicator

#### Step 10.2 — Error handling

- Network error: "No internet connection" banner
- Empty states: meaningful illustrations + action buttons on every screen
- Form errors: inline, per-field validation messages
- Toast notifications: "Added to cart", "Order placed", "Removed from favorites"

#### Step 10.3 — Dark mode

- NativeWind `dark:` variants on all components
- Test on both light and dark system settings
- Ensure images/icons have proper contrast in both modes

#### Step 10.4 — Web responsiveness

- Since we target web too (Expo web), add responsive breakpoints
- Desktop: wider layout, sidebar navigation option
- Mobile web: same as native

#### Step 10.5 — Performance check

- Verify `expo-image` caching is working (no redundant network requests)
- Check FlatList optimization (keyExtractor, getItemLayout where possible)
- Profile with React DevTools — no unnecessary re-renders

---

## 12. Future Enhancements

These are **not** part of the initial build but are designed to be easy to add thanks to our modular architecture:

| Enhancement | Effort | Notes |
|-------------|--------|-------|
| Push notifications (order status) | Medium | `expo-notifications` + Supabase Edge Functions |
| Ratings & reviews | Medium | New `reviews` table + ReviewService interface |
| Admin panel (manage menu/orders) | Large | Separate web app (React/Next.js) using same Supabase |
| Payment integration (Stripe) | Medium | PaymentService interface + Stripe SDK |
| Multi-language support (i18n) | Medium | `expo-localization` + translation files |
| Offline mode (full) | Medium | Zustand persistence + queue offline mutations |
| Analytics | Small | Mixpanel or Supabase Analytics |
| Move to Express/Django backend | Medium | Write new `services/express/*.ts` files, change one import file |

---

## Summary

| Aspect | Decision | Key Reason |
|--------|----------|------------|
| Backend | Supabase (swappable) | Zero server code to start, full SQL database, clean migration path |
| Architecture | Service layer with interfaces | SOLID principles. Swap backends by changing one file. |
| State | Zustand (persisted) | Simple, performant, works offline |
| Styling | NativeWind (Tailwind) | Consistent design system, fast iteration |
| Forms | React Hook Form + Zod | Type-safe validation, great performance |
| Routing | Expo Router (file-based) | Type-safe, web-compatible, deep links free |
| Data flow | Screen → Hook → Service → Backend | Each layer has one job. Easy to test, debug, and replace. |

**Total estimated screens**: 12
**Total estimated components**: ~20
**Total estimated service files**: ~12 (6 interfaces + 6 Supabase implementations)

---

*Inspired by [Bismillah Restaurant App](https://github.com/Noor-e-Iqra/Bismillah-Restaurant-App-React-Native). Rebuilt for [Abu Ndar](https://github.com/) with modern architecture.*
