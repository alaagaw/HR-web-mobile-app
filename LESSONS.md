# Abu Ndar Restaurant App — Step-by-Step Lesson Plan

> Every session ends with something **visible** on screen. No invisible/abstract sessions.
> Components are built **as needed**, not upfront in isolation.

---

## Prerequisites (Session 0 — Self-Guided Setup)

Before the first lesson, the student should have:

- [ ] **Node.js LTS (v20+)** installed — `node --version`
- [ ] **Git** installed and configured — `git --version`
- [ ] **VS Code** with extensions: ESLint, Tailwind CSS IntelliSense, Prettier, ES7+ React snippets
- [ ] **Expo Go** on their phone (App Store / Play Store)
- [ ] **Supabase account** created at https://supabase.com (free tier)
  - Project created (name: "abu-ndar", nearest region)
  - Project URL and anon key noted down (Settings > API)

---

## Session 1: Project Setup + Tab Navigation + NativeWind

### Goal

A 5-tab app running on their phone with styled tab bar and Tailwind CSS working.

### What They Learn

- Expo managed workflow
- File-based routing (Expo Router)
- Tailwind CSS in React Native (NativeWind)
- Custom fonts

### Steps

#### 1.1 — Create the Expo Project

```bash
npx create-expo-app@latest restaurant-app --template tabs
cd restaurant-app
```

**Explain:**
- `create-expo-app` scaffolds a new project with Expo Router already configured
- The `tabs` template gives us file-based routing + a tab navigator out of the box
- Open the project in VS Code: `code .`

**Verify:** Run `npx expo start`, scan QR with Expo Go. They should see the default template app.

---

#### 1.2 — Initialize Git

```bash
git init
```

Create `.gitignore`:
```
node_modules/
.expo/
dist/
.env
*.local
```

```bash
git add .
git commit -m "Initial project setup with Expo"
```

**Explain:**
- Every session gets commits. You can always go back to a working state.
- Never commit `node_modules` or `.env` files.

---

#### 1.3 — Install and Configure NativeWind v4

```bash
npm install nativewind tailwindcss
npx tailwindcss init
```

Create `global.css` in the project root:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Update `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary:        "#D4A052",
        "primary-dark": "#B8862D",
        secondary:      "#1A1A2E",
        background:     "#FAFAF8",
        surface:        "#FFFFFF",
        text:           "#1F2937",
        "text-muted":   "#6B7280",
        "text-light":   "#9CA3AF",
        border:         "#E5E7EB",
        success:        "#16A34A",
        warning:        "#F59E0B",
        error:          "#DC2626",
      },
      fontFamily: {
        poppins:          ["Poppins_400Regular"],
        "poppins-medium": ["Poppins_500Medium"],
        "poppins-semi":   ["Poppins_600SemiBold"],
        "poppins-bold":   ["Poppins_700Bold"],
      },
    },
  },
  plugins: [],
};
```

Update `metro.config.js`:
```js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);
module.exports = withNativeWind(config, { input: "./global.css" });
```

Update `babel.config.js` — add NativeWind preset:
```js
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
```

Import `global.css` in `app/_layout.tsx` (at the top):
```tsx
import "../global.css";
```

**Verify:** Add `className="bg-primary"` to any View. It should turn gold.

**Explain:**
- NativeWind translates Tailwind class names into React Native styles at build time
- `tailwind.config.js` is where our entire design system lives (colors, fonts, spacing)
- Every color from the proposal is now available as `bg-primary`, `text-error`, etc.

---

#### 1.4 — Install and Load Poppins Font

```bash
npx expo install @expo-google-fonts/poppins expo-font expo-splash-screen
```

In `app/_layout.tsx`:
```tsx
import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
} from "@expo-google-fonts/poppins";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
```

**Verify:** Use `className="font-poppins-bold text-2xl"` on a Text component. It should render in Poppins Bold.

**Explain:**
- `expo-font` loads custom fonts at startup
- `expo-splash-screen` keeps the splash visible until fonts are ready (no flash of unstyled text)
- Now every text in the app can use `font-poppins`, `font-poppins-medium`, etc.

---

#### 1.5 — Install Lucide Icons

```bash
npm install lucide-react-native react-native-svg
```

**Verify:** Import and render an icon:
```tsx
import { Home } from "lucide-react-native";
// ...
<Home size={24} color="#D4A052" />
```

**Explain:**
- Lucide gives us 1000+ icons, tree-shakeable (only the icons you import end up in the bundle)
- Replaces the need for custom PNG icon files

---

#### 1.6 — Create the 5-Tab Layout

Delete the template files inside `app/(tabs)/` and recreate the structure:

**`app/(tabs)/_layout.tsx`** — Tab navigator configuration:
```tsx
import { Tabs } from "expo-router";
import { Home, UtensilsCrossed, Heart, ShoppingCart, User } from "lucide-react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: "#D4A052",
        tabBarInactiveTintColor: "#9CA3AF",
        tabBarStyle: {
          backgroundColor: "#FFFFFF",
          borderTopColor: "#E5E7EB",
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontFamily: "Poppins_500Medium",
          fontSize: 11,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color, size }) => <UtensilsCrossed size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          title: "Favorites",
          tabBarIcon: ({ color, size }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: "Cart",
          tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color, size }) => <User size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
```

**Create placeholder tab screens:**

`app/(tabs)/index.tsx`:
```tsx
import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View className="flex-1 items-center justify-center bg-background">
      <Text className="font-poppins-bold text-3xl text-secondary">Abu Ndar</Text>
      <Text className="font-poppins text-text-muted mt-2">Welcome home</Text>
    </View>
  );
}
```

Create similar placeholder files for:
- `app/(tabs)/menu.tsx` — "Menu" title
- `app/(tabs)/favorites.tsx` — "Favorites" title
- `app/(tabs)/cart.tsx` — "Cart" title
- `app/(tabs)/account.tsx` — "Account" title

**Verify:** Run app. Five tabs visible. Tapping each shows its placeholder. Active tab is gold.

---

#### 1.7 — Commit

```bash
git add .
git commit -m "Session 1: NativeWind, Poppins, 5-tab navigation"
```

### Session 1 Outcome

The student has a **real app** running on their phone with:
- 5 working tabs with icons
- Custom gold color theme
- Poppins font loaded
- Tailwind CSS working for styling

---

## Session 2: Home Screen (Build Components As You Need Them)

### Goal

A polished home screen with hero, search bar, category scroll, and popular food cards — all driven by mock data.

### What They Learn

- TypeScript interfaces and data modeling
- Building reusable components (driven by need, not in isolation)
- FlatList and ScrollView
- Mock data pattern (UI before backend)

### Steps

#### 2.1 — Define TypeScript Types

Create `types/models.ts`:
```ts
export interface Category {
  id: number;
  name: string;
  icon: string; // Lucide icon name
}

export interface MenuItem {
  id: number;
  name: string;
  description: string;
  price: number;
  rating: number;
  duration: string;      // e.g. "20-25 min"
  image_url: string;
  category_id: number;
  is_available: boolean;
}

export interface CartItem {
  item: MenuItem;
  quantity: number;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  photo_url?: string;
}

export type OrderStatus = "pending" | "preparing" | "delivering" | "delivered" | "cancelled";

export interface Order {
  id: string;
  user_id: string;
  status: OrderStatus;
  total: number;
  estimated_mins?: number;
  items: OrderItem[];
  created_at: string;
}

export interface OrderItem {
  id: number;
  item_id: number;
  quantity: number;
  unit_price: number;
  item?: MenuItem;       // joined from menu_items
}
```

**Explain:**
- These types are the **contract** between all layers of the app
- A `MenuItem` looks the same whether it comes from mock data, Supabase, or Express
- TypeScript catches mistakes: try passing a string where a number is expected — red squiggle
- `?` means optional (phone, photo might not exist yet)

---

#### 2.2 — Create Mock Data

Create `constants/categories.ts`:
```ts
import type { Category } from "@/types/models";

export const categories: Category[] = [
  { id: 0, name: "All",      icon: "grid" },
  { id: 1, name: "Burger",   icon: "beef" },
  { id: 2, name: "Pizza",    icon: "pizza" },
  { id: 3, name: "Chicken",  icon: "drumstick" },
  { id: 4, name: "Seafood",  icon: "fish" },
  { id: 5, name: "Rice",     icon: "wheat" },
  { id: 6, name: "Drinks",   icon: "cup-soda" },
  { id: 7, name: "Dessert",  icon: "cake-slice" },
];
```

Create `constants/menu-data.ts`:
```ts
import type { MenuItem } from "@/types/models";

export const menuItems: MenuItem[] = [
  {
    id: 1,
    name: "Classic Smash Burger",
    description: "Double beef patty, melted cheddar, caramelized onions, house sauce on a brioche bun.",
    price: 12.99,
    rating: 4.8,
    duration: "15-20 min",
    image_url: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500",
    category_id: 1,
    is_available: true,
  },
  {
    id: 2,
    name: "Margherita Pizza",
    description: "San Marzano tomatoes, fresh mozzarella, basil, extra virgin olive oil on wood-fired crust.",
    price: 14.99,
    rating: 4.7,
    duration: "20-25 min",
    image_url: "https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500",
    category_id: 2,
    is_available: true,
  },
  {
    id: 3,
    name: "Crispy Fried Chicken",
    description: "Buttermilk-brined, double-coated, fried golden. Served with honey drizzle and pickles.",
    price: 11.49,
    rating: 4.9,
    duration: "20-25 min",
    image_url: "https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500",
    category_id: 3,
    is_available: true,
  },
  {
    id: 4,
    name: "Grilled Salmon",
    description: "Atlantic salmon fillet, lemon butter sauce, grilled asparagus, garlic mashed potatoes.",
    price: 19.99,
    rating: 4.6,
    duration: "25-30 min",
    image_url: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500",
    category_id: 4,
    is_available: true,
  },
  {
    id: 5,
    name: "Chicken Biryani",
    description: "Fragrant basmati rice layered with spiced chicken, saffron, fried onions, and raita.",
    price: 13.99,
    rating: 4.8,
    duration: "25-30 min",
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500",
    category_id: 5,
    is_available: true,
  },
  {
    id: 6,
    name: "BBQ Bacon Burger",
    description: "Angus beef, crispy bacon, smoked gouda, BBQ sauce, onion rings on a toasted bun.",
    price: 14.49,
    rating: 4.5,
    duration: "15-20 min",
    image_url: "https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500",
    category_id: 1,
    is_available: true,
  },
  {
    id: 7,
    name: "Pepperoni Pizza",
    description: "Loaded pepperoni, mozzarella blend, tomato sauce on a crispy thin crust.",
    price: 13.99,
    rating: 4.6,
    duration: "20-25 min",
    image_url: "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500",
    category_id: 2,
    is_available: true,
  },
  {
    id: 8,
    name: "Lemon Herb Chicken",
    description: "Grilled chicken breast marinated in lemon, herbs, garlic. Served with roasted vegetables.",
    price: 12.99,
    rating: 4.4,
    duration: "20-25 min",
    image_url: "https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500",
    category_id: 3,
    is_available: true,
  },
  {
    id: 9,
    name: "Shrimp Pad Thai",
    description: "Rice noodles, tiger shrimp, bean sprouts, peanuts, lime, tamarind sauce.",
    price: 15.49,
    rating: 4.7,
    duration: "20-25 min",
    image_url: "https://images.unsplash.com/photo-1559314809-0d155014e29e?w=500",
    category_id: 4,
    is_available: true,
  },
  {
    id: 10,
    name: "Lamb Kabsa",
    description: "Saudi-style spiced rice with tender lamb, tomatoes, raisins, and almonds.",
    price: 16.99,
    rating: 4.9,
    duration: "30-35 min",
    image_url: "https://images.unsplash.com/photo-1642821373181-696a54913e93?w=500",
    category_id: 5,
    is_available: true,
  },
  {
    id: 11,
    name: "Fresh Mango Smoothie",
    description: "Ripe mangoes blended with yogurt, honey, and a touch of cardamom.",
    price: 5.99,
    rating: 4.5,
    duration: "5 min",
    image_url: "https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=500",
    category_id: 6,
    is_available: true,
  },
  {
    id: 12,
    name: "Iced Caramel Latte",
    description: "Espresso, cold milk, caramel syrup, served over ice with whipped cream.",
    price: 4.99,
    rating: 4.3,
    duration: "5 min",
    image_url: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500",
    category_id: 6,
    is_available: true,
  },
  {
    id: 13,
    name: "Kunafa",
    description: "Crispy shredded pastry filled with sweet cheese, soaked in rose-scented syrup.",
    price: 8.99,
    rating: 4.8,
    duration: "15 min",
    image_url: "https://images.unsplash.com/photo-1579888944880-d98341245702?w=500",
    category_id: 7,
    is_available: true,
  },
  {
    id: 14,
    name: "Chocolate Lava Cake",
    description: "Warm chocolate cake with a molten center, served with vanilla ice cream.",
    price: 7.99,
    rating: 4.7,
    duration: "15 min",
    image_url: "https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=500",
    category_id: 7,
    is_available: true,
  },
  {
    id: 15,
    name: "Fish & Chips",
    description: "Beer-battered cod, thick-cut fries, mushy peas, tartar sauce, lemon wedge.",
    price: 13.49,
    rating: 4.5,
    duration: "20-25 min",
    image_url: "https://images.unsplash.com/photo-1579208030886-b1715a638694?w=500",
    category_id: 4,
    is_available: true,
  },
];
```

**Explain:**
- We build the entire UI with fake data first — this is a real production pattern
- Unsplash URLs give us real food photos for free during development
- When we connect Supabase later, we swap the data source but **screens don't change**
- The `@/` import alias (set up by Expo) means "project root" — avoids `../../..` paths

---

#### 2.3 — Build `components/ui/card.tsx`

**Why now:** We need it for the food cards on the Home screen.

```tsx
import { View } from "react-native";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <View className={`bg-surface rounded-2xl shadow-sm ${className}`}>
      {children}
    </View>
  );
}
```

**Explain:**
- Simplest component possible — just a styled container
- `className` prop lets the parent override/extend styles
- `bg-surface` = white, `rounded-2xl` = 16px corners, `shadow-sm` = subtle shadow

---

#### 2.4 — Build `components/menu/category-pill.tsx`

**Why now:** The Home screen has a horizontal category scroller.

```tsx
import { ScrollView, TouchableOpacity, Text } from "react-native";
import type { Category } from "@/types/models";

interface CategoryPillsProps {
  categories: Category[];
  selected: number;
  onSelect: (id: number) => void;
}

export function CategoryPills({ categories, selected, onSelect }: CategoryPillsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
    >
      {categories.map((cat) => {
        const isActive = cat.id === selected;
        return (
          <TouchableOpacity
            key={cat.id}
            onPress={() => onSelect(cat.id)}
            className={`px-5 py-2.5 rounded-full ${
              isActive ? "bg-primary" : "bg-surface border border-border"
            }`}
          >
            <Text
              className={`font-poppins-medium text-sm ${
                isActive ? "text-white" : "text-text-muted"
              }`}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}
```

**Explain:**
- Horizontal `ScrollView` for the pill list
- `selected` state lives in the parent — this component just renders and reports taps
- Conditional Tailwind classes: active pill gets gold background, inactive gets border
- This is **component composition** — small, focused, reusable

---

#### 2.5 — Build `components/menu/menu-card.tsx`

**Why now:** The Home screen shows a grid of popular food items.

```tsx
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Star, Heart } from "lucide-react-native";
import { Card } from "@/components/ui/card";
import type { MenuItem } from "@/types/models";

interface MenuCardProps {
  item: MenuItem;
  isFavorite?: boolean;
  onPress: () => void;
  onPressFavorite?: () => void;
}

export function MenuCard({ item, isFavorite, onPress, onPressFavorite }: MenuCardProps) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9} className="flex-1">
      <Card className="overflow-hidden">
        {/* Food Image */}
        <View className="relative">
          <Image
            source={{ uri: item.image_url }}
            className="w-full aspect-[4/3]"
            contentFit="cover"
            placeholder={{ blurhash: "LKO2?U%2Tw=w]~RBVZRi};RPxuwH" }}
            transition={300}
          />
          {/* Favorite Heart */}
          {onPressFavorite && (
            <TouchableOpacity
              onPress={onPressFavorite}
              className="absolute top-2 right-2 bg-white/80 rounded-full p-1.5"
            >
              <Heart
                size={18}
                color={isFavorite ? "#DC2626" : "#9CA3AF"}
                fill={isFavorite ? "#DC2626" : "none"}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Info */}
        <View className="p-3">
          <Text className="font-poppins-semi text-base text-text" numberOfLines={1}>
            {item.name}
          </Text>
          <View className="flex-row items-center justify-between mt-1">
            <Text className="font-poppins-bold text-primary text-base">
              ${item.price.toFixed(2)}
            </Text>
            <View className="flex-row items-center gap-1">
              <Star size={14} color="#F59E0B" fill="#F59E0B" />
              <Text className="font-poppins-medium text-xs text-text-muted">
                {item.rating}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}
```

**Explain:**
- Uses the `Card` component we just built — composition in action
- `expo-image` gives us blur placeholder (that blurhash string) + smooth transition
- Heart icon conditionally filled/colored based on `isFavorite`
- `aspect-[4/3]` keeps all food images the same ratio regardless of source
- `numberOfLines={1}` truncates long names with ellipsis

---

#### 2.6 — Build `components/menu/search-bar.tsx`

**Why now:** The Home screen hero area includes a search bar.

```tsx
import { View, TextInput } from "react-native";
import { Search, X } from "lucide-react-native";
import { useState } from "react";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export function SearchBar({ onSearch, placeholder = "Search dishes..." }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleChange = (text: string) => {
    setQuery(text);
    onSearch(text);
  };

  const handleClear = () => {
    setQuery("");
    onSearch("");
  };

  return (
    <View className="flex-row items-center bg-surface border border-border rounded-2xl px-4 py-3 mx-4">
      <Search size={20} color="#9CA3AF" />
      <TextInput
        value={query}
        onChangeText={handleChange}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        className="flex-1 ml-3 font-poppins text-base text-text"
      />
      {query.length > 0 && (
        <X size={18} color="#9CA3AF" onPress={handleClear} />
      )}
    </View>
  );
}
```

**Explain:**
- Search icon on the left, clear X on the right (only when there's text)
- `onSearch` callback lets the parent decide what to do with the query
- We'll add debouncing later when connected to a real backend

---

#### 2.7 — Build the Home Screen

Replace the placeholder `app/(tabs)/index.tsx`:

```tsx
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";

import { SearchBar } from "@/components/menu/search-bar";
import { CategoryPills } from "@/components/menu/category-pill";
import { MenuCard } from "@/components/menu/menu-card";

import { categories } from "@/constants/categories";
import { menuItems } from "@/constants/menu-data";

export default function HomeScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");

  // Filter popular items (rating >= 4.5)
  const popularItems = menuItems
    .filter((item) => item.rating >= 4.5)
    .filter((item) =>
      searchQuery
        ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={popularItems}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 16, gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        ListHeaderComponent={
          <View className="gap-5 mb-2">
            {/* Hero */}
            <View className="px-4 pt-4">
              <Text className="font-poppins text-text-muted text-base">
                Welcome to
              </Text>
              <Text className="font-poppins-bold text-secondary text-3xl">
                Abu Ndar
              </Text>
              <Text className="font-poppins text-text-muted text-sm mt-1">
                Delicious food, delivered to your door
              </Text>
            </View>

            {/* Search */}
            <SearchBar onSearch={setSearchQuery} />

            {/* Categories */}
            <View>
              <Text className="font-poppins-semi text-lg text-text px-4 mb-3">
                Categories
              </Text>
              <CategoryPills
                categories={categories}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
              />
            </View>

            {/* Section Title */}
            <Text className="font-poppins-semi text-lg text-text px-4">
              Popular Dishes
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <MenuCard
            item={item}
            onPress={() => router.push(`/item/${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <View className="items-center py-12 px-4">
            <Text className="font-poppins-medium text-text-muted text-base">
              No dishes found
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
```

**Verify:** Run app. Home tab shows: hero text, search bar, category pills, 2-column grid of food cards with images, prices, ratings.

**Explain:**
- `FlatList` is better than `ScrollView` for lists — it only renders visible items (performance)
- `numColumns={2}` gives us a 2-column grid
- `ListHeaderComponent` puts the hero, search, and categories ABOVE the grid (scrolls together)
- Filtering is done in-memory on mock data — later this becomes a service call
- `router.push('/item/${item.id}')` will navigate to the detail page (we'll build it next session)

---

#### 2.8 — Commit

```bash
git add .
git commit -m "Session 2: Home screen with types, mock data, categories, food grid"
```

### Session 2 Outcome

The student sees a **beautiful, data-driven Home screen** with:
- Hero section with restaurant name
- Working search (filters food cards in real-time)
- Horizontal scrollable category pills
- 2-column grid of food cards with real photos, prices, ratings
- Heart icon on each card (not functional yet — that's next session)

---

## Session 3: Menu Screen + Item Detail + Favorites

### Goal

Browse the full menu by category, tap an item to see its detail page, and favorite items with a heart toggle that persists.

### What They Learn

- Dynamic routes (`/item/[id]`)
- Zustand state management + persistence
- Filtering data by category
- Modal-style screen presentation

### Steps

#### 3.1 — Build the Menu Screen

`app/(tabs)/menu.tsx`:
```tsx
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useState } from "react";

import { CategoryPills } from "@/components/menu/category-pill";
import { MenuCard } from "@/components/menu/menu-card";
import { SearchBar } from "@/components/menu/search-bar";

import { categories } from "@/constants/categories";
import { menuItems } from "@/constants/menu-data";
import { useFavoritesStore } from "@/stores/favorites-store";

export default function MenuScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const { isFavorite, toggle } = useFavoritesStore();

  const filteredItems = menuItems
    .filter((item) =>
      selectedCategory === 0 ? true : item.category_id === selectedCategory
    )
    .filter((item) =>
      searchQuery
        ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true
    );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        numColumns={2}
        columnWrapperStyle={{ paddingHorizontal: 16, gap: 12 }}
        contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
        ListHeaderComponent={
          <View className="gap-4 mb-2">
            <Text className="font-poppins-bold text-2xl text-text px-4 pt-4">
              Our Menu
            </Text>
            <SearchBar onSearch={setSearchQuery} />
            <CategoryPills
              categories={categories}
              selected={selectedCategory}
              onSelect={setSelectedCategory}
            />
          </View>
        }
        renderItem={({ item }) => (
          <MenuCard
            item={item}
            isFavorite={isFavorite(item.id)}
            onPress={() => router.push(`/item/${item.id}`)}
            onPressFavorite={() => toggle(item.id)}
          />
        )}
        ListEmptyComponent={
          <View className="items-center py-12 px-4">
            <Text className="font-poppins-medium text-text-muted">
              No items in this category
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}
```

**Explain:**
- Category filtering: `selectedCategory === 0` means "All"
- `isFavorite` and `toggle` come from the Zustand store (we build it in step 3.3)
- Same `MenuCard` component reused from Session 2 — that's the benefit of building it reusable

---

#### 3.2 — Create a Utility Formatter

Create `lib/utils.ts`:
```ts
export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function formatDuration(duration: string): string {
  return duration;
}
```

**Explain:**
- Simple helpers. Later we might add locale-aware formatting, but keep it simple for now.

---

#### 3.3 — Set Up Zustand Favorites Store

First install Zustand and persistence:
```bash
npm install zustand
npx expo install @react-native-async-storage/async-storage
```

Create `stores/favorites-store.ts`:
```ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";

interface FavoritesState {
  ids: number[];
  toggle: (id: number) => void;
  isFavorite: (id: number) => boolean;
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      ids: [],
      toggle: (id) =>
        set((state) => ({
          ids: state.ids.includes(id)
            ? state.ids.filter((fid) => fid !== id)
            : [...state.ids, id],
        })),
      isFavorite: (id) => get().ids.includes(id),
    }),
    {
      name: "favorites-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Explain:**
- Zustand store in ~20 lines — compare to Redux which would need actions, reducers, slices, selectors
- `persist` middleware saves to AsyncStorage automatically — favorites survive app restart
- `toggle` either adds or removes an ID — one function handles both tap to favorite AND unfavorite
- `isFavorite` reads current state — no need for useEffect or separate queries

---

#### 3.4 — Build the Item Detail Screen

Create the route file `app/item/[id].tsx`:
```tsx
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Star, Clock, Heart } from "lucide-react-native";

import { menuItems } from "@/constants/menu-data";
import { useFavoritesStore } from "@/stores/favorites-store";

export default function ItemDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isFavorite, toggle } = useFavoritesStore();

  const item = menuItems.find((i) => i.id === Number(id));

  if (!item) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <Text className="font-poppins-medium text-text-muted">Item not found</Text>
      </SafeAreaView>
    );
  }

  const favorite = isFavorite(item.id);

  return (
    <View className="flex-1 bg-background">
      {/* Hero Image */}
      <View className="relative">
        <Image
          source={{ uri: item.image_url }}
          className="w-full aspect-[16/10]"
          contentFit="cover"
          transition={300}
        />
        {/* Back Button */}
        <SafeAreaView className="absolute top-0 left-0 right-0">
          <View className="flex-row items-center justify-between px-4 pt-2">
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-white/80 rounded-full p-2"
            >
              <ArrowLeft size={22} color="#1F2937" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => toggle(item.id)}
              className="bg-white/80 rounded-full p-2"
            >
              <Heart
                size={22}
                color={favorite ? "#DC2626" : "#1F2937"}
                fill={favorite ? "#DC2626" : "none"}
              />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>

      {/* Content */}
      <ScrollView className="flex-1 -mt-6 bg-background rounded-t-3xl">
        <View className="p-6 gap-4">
          <Text className="font-poppins-bold text-2xl text-text">
            {item.name}
          </Text>

          {/* Rating + Duration Row */}
          <View className="flex-row items-center gap-4">
            <View className="flex-row items-center gap-1.5">
              <Star size={18} color="#F59E0B" fill="#F59E0B" />
              <Text className="font-poppins-semi text-sm text-text">
                {item.rating}
              </Text>
            </View>
            <View className="flex-row items-center gap-1.5">
              <Clock size={18} color="#6B7280" />
              <Text className="font-poppins text-sm text-text-muted">
                {item.duration}
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text className="font-poppins text-base text-text-muted leading-6">
            {item.description}
          </Text>

          {/* Price */}
          <Text className="font-poppins-bold text-3xl text-primary">
            ${item.price.toFixed(2)}
          </Text>
        </View>
      </ScrollView>

      {/* Sticky Bottom: Add to Cart */}
      <View className="px-6 pb-8 pt-4 bg-background border-t border-border">
        <TouchableOpacity
          className="bg-primary rounded-2xl py-4 items-center"
          activeOpacity={0.8}
        >
          <Text className="font-poppins-bold text-white text-lg">
            Add to Cart
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
```

Register it in the root layout. Update `app/_layout.tsx` Stack:
```tsx
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen
    name="item/[id]"
    options={{
      headerShown: false,
      presentation: "modal",
    }}
  />
</Stack>
```

**Verify:** Tap a food card on Home or Menu. Detail page slides up with large image, back button, heart, name, rating, duration, description, price, and "Add to Cart" button.

**Explain:**
- `[id]` in the filename = dynamic route segment. `useLocalSearchParams` reads it
- `presentation: "modal"` makes it slide up from bottom (iOS) or fade (Android)
- The image overlaps the content (`-mt-6 rounded-t-3xl`) for a modern look
- "Add to Cart" is just a button for now — we wire it up in Session 4
- Favorites heart works already because it uses the same Zustand store

---

#### 3.5 — Build the Favorites Screen

`app/(tabs)/favorites.tsx`:
```tsx
import { View, Text, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Heart } from "lucide-react-native";

import { MenuCard } from "@/components/menu/menu-card";
import { menuItems } from "@/constants/menu-data";
import { useFavoritesStore } from "@/stores/favorites-store";

export default function FavoritesScreen() {
  const router = useRouter();
  const { ids, isFavorite, toggle } = useFavoritesStore();

  const favoriteItems = menuItems.filter((item) => ids.includes(item.id));

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Text className="font-poppins-bold text-2xl text-text px-4 pt-4 mb-4">
        Favorites
      </Text>

      {favoriteItems.length === 0 ? (
        /* Empty State */
        <View className="flex-1 items-center justify-center px-8">
          <Heart size={64} color="#E5E7EB" />
          <Text className="font-poppins-semi text-lg text-text mt-4">
            No favorites yet
          </Text>
          <Text className="font-poppins text-text-muted text-center mt-2">
            Tap the heart icon on any dish to save it here
          </Text>
        </View>
      ) : (
        <FlatList
          data={favoriteItems}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          columnWrapperStyle={{ paddingHorizontal: 16, gap: 12 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <MenuCard
              item={item}
              isFavorite={isFavorite(item.id)}
              onPress={() => router.push(`/item/${item.id}`)}
              onPressFavorite={() => toggle(item.id)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
```

**Verify:** Go to Menu, tap hearts on a few items, switch to Favorites tab — they appear. Tap heart again — they disappear. Close and reopen app — favorites are still saved.

**Explain:**
- Empty state with big icon + message is much better UX than a blank screen
- Zustand persistence means favorites survive app restart — they see this magic in real-time
- Same `MenuCard` component used for the 3rd time — zero duplicate code

---

#### 3.6 — Commit

```bash
git add .
git commit -m "Session 3: Menu screen, item detail, Zustand favorites with persistence"
```

### Session 3 Outcome

- Menu screen with category filtering and search
- Item detail page (modal) with image, info, back/heart buttons
- Favorites that persist across app restarts
- Heart toggle works across Home, Menu, Detail, and Favorites screens

---

## Session 4: Cart (Zustand Store + Cart Screen)

### Goal

A fully working cart: add items from detail page, adjust quantities, see totals, remove items.

### What They Learn

- Complex Zustand store (maps, derived state)
- Computed values (subtotals, totals)
- Quantity management UI
- Cart badge on tab bar

### Steps

#### 4.1 — Create the Cart Store

Create `stores/cart-store.ts`:
```ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { MenuItem, CartItem } from "@/types/models";

interface CartState {
  items: CartItem[];
  addItem: (item: MenuItem, qty?: number) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, qty: number) => void;
  clearCart: () => void;
  getItemCount: () => number;
  getSubtotal: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item, qty = 1) =>
        set((state) => {
          const existing = state.items.find((ci) => ci.item.id === item.id);
          if (existing) {
            return {
              items: state.items.map((ci) =>
                ci.item.id === item.id
                  ? { ...ci, quantity: ci.quantity + qty }
                  : ci
              ),
            };
          }
          return { items: [...state.items, { item, quantity: qty }] };
        }),

      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((ci) => ci.item.id !== itemId),
        })),

      updateQuantity: (itemId, qty) =>
        set((state) => ({
          items:
            qty <= 0
              ? state.items.filter((ci) => ci.item.id !== itemId)
              : state.items.map((ci) =>
                  ci.item.id === itemId ? { ...ci, quantity: qty } : ci
                ),
        })),

      clearCart: () => set({ items: [] }),

      getItemCount: () =>
        get().items.reduce((sum, ci) => sum + ci.quantity, 0),

      getSubtotal: () =>
        get().items.reduce(
          (sum, ci) => sum + ci.item.price * ci.quantity,
          0
        ),
    }),
    {
      name: "cart-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
```

**Explain:**
- `addItem` checks if item already exists → increase qty instead of duplicating
- `updateQuantity` with qty <= 0 auto-removes the item
- `getItemCount` and `getSubtotal` are derived values computed from the items array
- Cart persists to device — survives app restart, just like favorites

---

#### 4.2 — Wire "Add to Cart" on Item Detail

Update the "Add to Cart" button in `app/item/[id].tsx`:

Add the import and state:
```tsx
import { useCartStore } from "@/stores/cart-store";

// inside component:
const addItem = useCartStore((s) => s.addItem);
const [qty, setQty] = useState(1);
```

Replace the static "Add to Cart" button area with a quantity selector + button:
```tsx
{/* Sticky Bottom: Qty + Add to Cart */}
<View className="px-6 pb-8 pt-4 bg-background border-t border-border">
  <View className="flex-row items-center justify-between mb-4">
    <Text className="font-poppins-semi text-base text-text">Quantity</Text>
    <View className="flex-row items-center gap-4">
      <TouchableOpacity
        onPress={() => setQty(Math.max(1, qty - 1))}
        className="w-10 h-10 rounded-full bg-surface border border-border items-center justify-center"
      >
        <Text className="font-poppins-bold text-lg text-text">−</Text>
      </TouchableOpacity>
      <Text className="font-poppins-bold text-lg text-text w-8 text-center">
        {qty}
      </Text>
      <TouchableOpacity
        onPress={() => setQty(qty + 1)}
        className="w-10 h-10 rounded-full bg-primary items-center justify-center"
      >
        <Text className="font-poppins-bold text-lg text-white">+</Text>
      </TouchableOpacity>
    </View>
  </View>
  <TouchableOpacity
    className="bg-primary rounded-2xl py-4 items-center"
    activeOpacity={0.8}
    onPress={() => {
      addItem(item, qty);
      router.back();
    }}
  >
    <Text className="font-poppins-bold text-white text-lg">
      Add to Cart — ${(item.price * qty).toFixed(2)}
    </Text>
  </TouchableOpacity>
</View>
```

**Verify:** Open item detail, select qty, tap "Add to Cart". It navigates back.

---

#### 4.3 — Add Cart Badge to Tab Bar

Update `app/(tabs)/_layout.tsx` for the cart tab:
```tsx
import { useCartStore } from "@/stores/cart-store";

// inside TabLayout:
const getItemCount = useCartStore((s) => s.getItemCount);
const cartCount = getItemCount();

// update the Cart Tabs.Screen:
<Tabs.Screen
  name="cart"
  options={{
    title: "Cart",
    tabBarIcon: ({ color, size }) => <ShoppingCart size={size} color={color} />,
    tabBarBadge: cartCount > 0 ? cartCount : undefined,
    tabBarBadgeStyle: { backgroundColor: "#D4A052", fontSize: 11 },
  }}
/>
```

**Verify:** Add items to cart. Gold badge with count appears on Cart tab icon.

---

#### 4.4 — Build `components/cart/cart-item.tsx`

```tsx
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { Trash2 } from "lucide-react-native";
import type { CartItem as CartItemType } from "@/types/models";

interface CartItemProps {
  cartItem: CartItemType;
  onUpdateQty: (qty: number) => void;
  onRemove: () => void;
}

export function CartItemRow({ cartItem, onUpdateQty, onRemove }: CartItemProps) {
  const { item, quantity } = cartItem;
  const lineTotal = item.price * quantity;

  return (
    <View className="flex-row items-center bg-surface rounded-2xl p-3 gap-3">
      {/* Image */}
      <Image
        source={{ uri: item.image_url }}
        className="w-20 h-20 rounded-xl"
        contentFit="cover"
      />

      {/* Info */}
      <View className="flex-1 gap-1">
        <Text className="font-poppins-semi text-base text-text" numberOfLines={1}>
          {item.name}
        </Text>
        <Text className="font-poppins-bold text-primary">
          ${lineTotal.toFixed(2)}
        </Text>
        {/* Qty Controls */}
        <View className="flex-row items-center gap-3 mt-1">
          <TouchableOpacity
            onPress={() => onUpdateQty(quantity - 1)}
            className="w-8 h-8 rounded-full border border-border items-center justify-center"
          >
            <Text className="font-poppins-bold text-text">−</Text>
          </TouchableOpacity>
          <Text className="font-poppins-semi text-text w-6 text-center">
            {quantity}
          </Text>
          <TouchableOpacity
            onPress={() => onUpdateQty(quantity + 1)}
            className="w-8 h-8 rounded-full bg-primary items-center justify-center"
          >
            <Text className="font-poppins-bold text-white">+</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Delete */}
      <TouchableOpacity onPress={onRemove} className="p-2">
        <Trash2 size={20} color="#DC2626" />
      </TouchableOpacity>
    </View>
  );
}
```

---

#### 4.5 — Build `components/cart/cart-summary.tsx`

```tsx
import { View, Text, TouchableOpacity } from "react-native";

interface CartSummaryProps {
  subtotal: number;
  deliveryFee?: number;
  onPlaceOrder: () => void;
}

export function CartSummary({
  subtotal,
  deliveryFee = 2.99,
  onPlaceOrder,
}: CartSummaryProps) {
  const total = subtotal + deliveryFee;

  return (
    <View className="px-4 pb-8 pt-4 bg-background border-t border-border gap-3">
      <View className="flex-row justify-between">
        <Text className="font-poppins text-text-muted">Subtotal</Text>
        <Text className="font-poppins-medium text-text">${subtotal.toFixed(2)}</Text>
      </View>
      <View className="flex-row justify-between">
        <Text className="font-poppins text-text-muted">Delivery fee</Text>
        <Text className="font-poppins-medium text-text">${deliveryFee.toFixed(2)}</Text>
      </View>
      <View className="h-px bg-border" />
      <View className="flex-row justify-between">
        <Text className="font-poppins-bold text-lg text-text">Total</Text>
        <Text className="font-poppins-bold text-lg text-primary">
          ${total.toFixed(2)}
        </Text>
      </View>
      <TouchableOpacity
        onPress={onPlaceOrder}
        className="bg-primary rounded-2xl py-4 items-center mt-2"
        activeOpacity={0.8}
      >
        <Text className="font-poppins-bold text-white text-lg">Place Order</Text>
      </TouchableOpacity>
    </View>
  );
}
```

---

#### 4.6 — Build the Cart Screen

`app/(tabs)/cart.tsx`:
```tsx
import { View, Text, FlatList, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ShoppingCart } from "lucide-react-native";
import { useRouter } from "expo-router";

import { CartItemRow } from "@/components/cart/cart-item";
import { CartSummary } from "@/components/cart/cart-summary";
import { useCartStore } from "@/stores/cart-store";

export default function CartScreen() {
  const router = useRouter();
  const { items, updateQuantity, removeItem, getSubtotal, clearCart } =
    useCartStore();

  const handlePlaceOrder = () => {
    Alert.alert(
      "Order Placed!",
      "Your order has been placed successfully. (Backend coming in Session 7)",
      [{ text: "OK", onPress: () => clearCart() }]
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Text className="font-poppins-bold text-2xl text-text px-4 pt-4 mb-4">
        My Cart
      </Text>

      {items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-8">
          <ShoppingCart size={64} color="#E5E7EB" />
          <Text className="font-poppins-semi text-lg text-text mt-4">
            Your cart is empty
          </Text>
          <Text className="font-poppins text-text-muted text-center mt-2">
            Browse the menu and add some delicious items
          </Text>
        </View>
      ) : (
        <>
          <FlatList
            data={items}
            keyExtractor={(ci) => ci.item.id.toString()}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 12 }}
            renderItem={({ item: ci }) => (
              <CartItemRow
                cartItem={ci}
                onUpdateQty={(qty) => updateQuantity(ci.item.id, qty)}
                onRemove={() => removeItem(ci.item.id)}
              />
            )}
          />
          <CartSummary
            subtotal={getSubtotal()}
            onPlaceOrder={handlePlaceOrder}
          />
        </>
      )}
    </SafeAreaView>
  );
}
```

**Verify:**
- Add items from item detail → they show in cart
- Tap +/- to change quantities, price updates
- Tap trash icon to remove
- "Place Order" shows alert and clears cart
- Cart badge on tab updates in real-time

---

#### 4.7 — Commit

```bash
git add .
git commit -m "Session 4: Cart store, cart screen, qty controls, badge, place order"
```

### Session 4 Outcome

Full cart flow working:
- Add to Cart from item detail (with quantity selector)
- Cart screen with +/-, delete, subtotal/delivery/total
- Cart tab badge shows item count
- "Place Order" (mock — clears cart with alert)
- Cart persists across app restart

---

## Session 5: Auth — Supabase Sign In / Sign Up / Forgot Password

### Goal

Real authentication with Supabase. Users can create accounts, log in, log out, and reset passwords.

### What They Learn

- Backend integration (Supabase SDK)
- Service interface pattern (the architecture's core)
- Form validation (React Hook Form + Zod)
- Auth state management
- Route protection

### Steps

#### 5.1 — Install Auth Dependencies

```bash
npm install react-hook-form @hookform/resolvers zod
npx expo install @supabase/supabase-js expo-secure-store
```

---

#### 5.2 — Define Service Interfaces

Create `services/types.ts`:
```ts
import type { User } from "@/types/models";

export interface AuthService {
  signIn(email: string, password: string): Promise<User>;
  signUp(email: string, password: string, name: string, phone?: string): Promise<User>;
  signOut(): Promise<void>;
  getSession(): Promise<User | null>;
  onAuthStateChange(callback: (user: User | null) => void): () => void;
}

export interface MenuService {
  getCategories(): Promise<{ id: number; name: string; icon: string }[]>;
  getItems(categoryId?: number): Promise<import("@/types/models").MenuItem[]>;
  getItemById(id: number): Promise<import("@/types/models").MenuItem | null>;
  searchItems(query: string): Promise<import("@/types/models").MenuItem[]>;
  getPopularItems(): Promise<import("@/types/models").MenuItem[]>;
}

export interface CartService {
  getCart(userId: string): Promise<import("@/types/models").CartItem[]>;
  addItem(userId: string, itemId: number, qty: number): Promise<void>;
  removeItem(userId: string, itemId: number): Promise<void>;
  updateQuantity(userId: string, itemId: number, qty: number): Promise<void>;
  clearCart(userId: string): Promise<void>;
}

export interface OrderService {
  placeOrder(userId: string, items: import("@/types/models").CartItem[], total: number): Promise<import("@/types/models").Order>;
  getOrders(userId: string): Promise<import("@/types/models").Order[]>;
  getOrderById(id: string): Promise<import("@/types/models").Order | null>;
  cancelOrder(id: string): Promise<void>;
}

export interface StorageService {
  uploadProfilePhoto(userId: string, uri: string): Promise<string>;
  getProfilePhotoUrl(userId: string): Promise<string | null>;
}

export interface UserService {
  getProfile(userId: string): Promise<User>;
  updateProfile(userId: string, data: Partial<User>): Promise<User>;
}
```

**Explain:**
- **This is the most important file in the project.** It defines WHAT the app can do.
- Every function returns a Promise (because backends are async)
- Screens and hooks never import Supabase directly — they import from services
- When you swap backends, only the implementation files change. These interfaces stay the same.

---

#### 5.3 — Set Up Supabase Client

Create `services/supabase/client.ts`:
```ts
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const supabaseUrl = "YOUR_SUPABASE_URL";       // ← Replace with your project URL
const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY"; // ← Replace with your anon key

// Secure token storage (native) / localStorage (web)
const ExpoSecureStoreAdapter = {
  getItem: (key: string) => {
    if (Platform.OS === "web") return localStorage.getItem(key);
    return SecureStore.getItemAsync(key);
  },
  setItem: (key: string, value: string) => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: (key: string) => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }
    return SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: ExpoSecureStoreAdapter as any,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

**Explain:**
- `supabaseUrl` and `supabaseAnonKey` come from your Supabase dashboard (Settings > API)
- `expo-secure-store` encrypts the auth token on device (native). Falls back to localStorage on web.
- `persistSession: true` means users stay logged in across app restarts
- This file is the ONLY file that talks to Supabase SDK directly for setup

---

#### 5.4 — Implement Supabase AuthService

Create `services/supabase/auth.ts`:
```ts
import { supabase } from "./client";
import type { AuthService } from "../types";
import type { User } from "@/types/models";

function mapUser(supabaseUser: any): User {
  return {
    id: supabaseUser.id,
    email: supabaseUser.email ?? "",
    name: supabaseUser.user_metadata?.name ?? "",
    phone: supabaseUser.user_metadata?.phone ?? undefined,
    photo_url: supabaseUser.user_metadata?.photo_url ?? undefined,
  };
}

export const authService: AuthService = {
  async signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error(error.message);
    return mapUser(data.user);
  },

  async signUp(email, password, name, phone) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone }, // stored in user_metadata
      },
    });
    if (error) throw new Error(error.message);
    if (!data.user) throw new Error("Sign up failed");
    return mapUser(data.user);
  },

  async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  },

  async getSession() {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.user) return null;
    return mapUser(data.session.user);
  },

  onAuthStateChange(callback) {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ? mapUser(session.user) : null);
    });
    return () => data.subscription.unsubscribe();
  },
};
```

---

#### 5.5 — Create the Service Barrel Export

Create `services/index.ts`:
```ts
// ★ THE place to swap backends. Change imports here, zero screen changes.

// Auth — Supabase
export { authService } from "./supabase/auth";

// Menu, Cart, Orders — still using mock data (will implement in Session 7)
// export { menuService } from "./supabase/menu";
// export { cartService } from "./supabase/cart";
// export { orderService } from "./supabase/orders";
```

**Explain:**
- This is the "registry" file from the architecture diagram
- Right now only auth is wired. Menu/cart/orders will be added in Session 7.
- To swap auth to Firebase: write `services/firebase/auth.ts`, change ONE line here

---

#### 5.6 — Create Auth Store + Hook

Create `stores/auth-store.ts`:
```ts
import { create } from "zustand";
import type { User } from "@/types/models";

interface AuthState {
  user: User | null;
  isLoading: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));
```

Create `hooks/use-auth.ts`:
```ts
import { useEffect } from "react";
import { useAuthStore } from "@/stores/auth-store";
import { authService } from "@/services";

export function useAuth() {
  const { user, isLoading, setUser, setLoading } = useAuthStore();

  useEffect(() => {
    // Check existing session on mount
    authService.getSession().then((u) => {
      setUser(u);
      setLoading(false);
    });

    // Listen for auth state changes
    const unsubscribe = authService.onAuthStateChange((u) => {
      setUser(u);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const u = await authService.signIn(email, password);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (
    email: string,
    password: string,
    name: string,
    phone?: string
  ) => {
    setLoading(true);
    try {
      const u = await authService.signUp(email, password, name, phone);
      setUser(u);
      return u;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await authService.signOut();
    setUser(null);
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    signIn,
    signUp,
    signOut,
  };
}
```

**Explain:**
- Hook = the "glue" between UI and services
- `useAuth()` provides everything a screen needs: user info, loading state, auth methods
- The hook calls `authService` — it has NO idea it's Supabase behind the scenes
- `onAuthStateChange` keeps the user in sync (e.g., if session expires)

---

#### 5.7 — Build `components/ui/input.tsx`

**Why now:** Auth forms need text inputs with labels and error messages.

```tsx
import { View, Text, TextInput, type TextInputProps } from "react-native";

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, ...props }: InputProps) {
  return (
    <View className="gap-1.5">
      <Text className="font-poppins-medium text-sm text-text">{label}</Text>
      <TextInput
        placeholderTextColor="#9CA3AF"
        className={`bg-surface border rounded-xl px-4 py-3.5 font-poppins text-base text-text ${
          error ? "border-error" : "border-border"
        }`}
        {...props}
      />
      {error && (
        <Text className="font-poppins text-xs text-error">{error}</Text>
      )}
    </View>
  );
}
```

---

#### 5.8 — Build `components/ui/button.tsx`

**Why now:** Auth forms need proper buttons with loading state.

```tsx
import { TouchableOpacity, Text, ActivityIndicator } from "react-native";

interface ButtonProps {
  children: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "ghost";
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

const variantStyles = {
  primary: "bg-primary",
  secondary: "bg-surface border border-border",
  ghost: "bg-transparent",
};

const textStyles = {
  primary: "text-white",
  secondary: "text-text",
  ghost: "text-primary",
};

export function Button({
  children,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  className = "",
}: ButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
      className={`rounded-2xl py-4 items-center justify-center ${variantStyles[variant]} ${
        disabled ? "opacity-50" : ""
      } ${className}`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#D4A052"} />
      ) : (
        <Text className={`font-poppins-bold text-base ${textStyles[variant]}`}>
          {children}
        </Text>
      )}
    </TouchableOpacity>
  );
}
```

---

#### 5.9 — Define Zod Validation Schemas

Create `lib/validators.ts`:
```ts
import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

export type SignInData = z.infer<typeof signInSchema>;
export type SignUpData = z.infer<typeof signUpSchema>;
export type ForgotPasswordData = z.infer<typeof forgotPasswordSchema>;
```

**Explain:**
- Zod schemas validate AND generate TypeScript types — one source of truth
- `z.infer` extracts the type from the schema — `SignInData = { email: string; password: string }`
- These run on form submit: if validation fails, errors show inline on each field

---

#### 5.10 — Build Sign In Screen

Create `app/auth/sign-in.tsx`:
```tsx
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { signInSchema, type SignInData } from "@/lib/validators";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, isLoading } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: SignInData) => {
    try {
      await signIn(data.email, data.password);
      router.replace("/(tabs)");
    } catch (err: any) {
      Alert.alert("Sign In Failed", err.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-12 gap-6">
        <View>
          <Text className="font-poppins-bold text-3xl text-text">Welcome Back</Text>
          <Text className="font-poppins text-text-muted mt-1">
            Sign in to your account
          </Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Email"
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
              />
            )}
          />

          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Password"
                placeholder="Enter your password"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />

          <TouchableOpacity onPress={() => router.push("/auth/forgot-password")}>
            <Text className="font-poppins-medium text-primary text-right">
              Forgot password?
            </Text>
          </TouchableOpacity>
        </View>

        <Button onPress={handleSubmit(onSubmit)} loading={isLoading}>
          Sign In
        </Button>

        <View className="flex-row items-center justify-center gap-1">
          <Text className="font-poppins text-text-muted">
            Don't have an account?
          </Text>
          <TouchableOpacity onPress={() => router.replace("/auth/sign-up")}>
            <Text className="font-poppins-semi text-primary">Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
```

---

#### 5.11 — Build Sign Up Screen

Create `app/auth/sign-up.tsx`:
```tsx
import { View, Text, TouchableOpacity, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { signUpSchema, type SignUpData } from "@/lib/validators";

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp, isLoading } = useAuth();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", phone: "" },
  });

  const onSubmit = async (data: SignUpData) => {
    try {
      await signUp(data.email, data.password, data.name, data.phone);
      Alert.alert("Account Created!", "Please check your email to verify your account.", [
        { text: "OK", onPress: () => router.replace("/auth/sign-in") },
      ]);
    } catch (err: any) {
      Alert.alert("Sign Up Failed", err.message);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-12 gap-6">
        <View>
          <Text className="font-poppins-bold text-3xl text-text">Create Account</Text>
          <Text className="font-poppins text-text-muted mt-1">
            Join Abu Ndar today
          </Text>
        </View>

        <View className="gap-4">
          <Controller
            control={control}
            name="name"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Full Name"
                placeholder="Your name"
                value={value}
                onChangeText={onChange}
                error={errors.name?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Email"
                placeholder="your@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={value}
                onChangeText={onChange}
                error={errors.email?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Password"
                placeholder="At least 6 characters"
                secureTextEntry
                value={value}
                onChangeText={onChange}
                error={errors.password?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="phone"
            render={({ field: { onChange, value } }) => (
              <Input
                label="Phone (optional)"
                placeholder="+1 (555) 000-0000"
                keyboardType="phone-pad"
                value={value}
                onChangeText={onChange}
              />
            )}
          />
        </View>

        <Button onPress={handleSubmit(onSubmit)} loading={isLoading}>
          Create Account
        </Button>

        <View className="flex-row items-center justify-center gap-1">
          <Text className="font-poppins text-text-muted">
            Already have an account?
          </Text>
          <TouchableOpacity onPress={() => router.replace("/auth/sign-in")}>
            <Text className="font-poppins-semi text-primary">Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
```

---

#### 5.12 — Build Forgot Password Screen

Create `app/auth/forgot-password.tsx`:
```tsx
import { View, Text, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react-native";
import { TouchableOpacity } from "react-native";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/services/supabase/client";
import { forgotPasswordSchema, type ForgotPasswordData } from "@/lib/validators";

export default function ForgotPasswordScreen() {
  const router = useRouter();

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ForgotPasswordData) => {
    const { error } = await supabase.auth.resetPasswordForEmail(data.email);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    Alert.alert("Check your email", "We sent you a password reset link.", [
      { text: "OK", onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6 gap-6">
        <TouchableOpacity onPress={() => router.back()}>
          <ArrowLeft size={24} color="#1F2937" />
        </TouchableOpacity>

        <View>
          <Text className="font-poppins-bold text-3xl text-text">Forgot Password</Text>
          <Text className="font-poppins text-text-muted mt-1">
            Enter your email and we'll send you a reset link
          </Text>
        </View>

        <Controller
          control={control}
          name="email"
          render={({ field: { onChange, value } }) => (
            <Input
              label="Email"
              placeholder="your@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              value={value}
              onChangeText={onChange}
              error={errors.email?.message}
            />
          )}
        />

        <Button onPress={handleSubmit(onSubmit)}>Send Reset Link</Button>
      </View>
    </SafeAreaView>
  );
}
```

---

#### 5.13 — Register Auth Routes in Root Layout

Update `app/_layout.tsx`:
```tsx
<Stack>
  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
  <Stack.Screen name="item/[id]" options={{ headerShown: false, presentation: "modal" }} />
  <Stack.Screen name="auth/sign-in" options={{ headerShown: false }} />
  <Stack.Screen name="auth/sign-up" options={{ headerShown: false }} />
  <Stack.Screen name="auth/forgot-password" options={{ headerShown: false }} />
</Stack>
```

---

#### 5.14 — Add Auth to Account Tab + Route Protection

Update `app/(tabs)/account.tsx`:
```tsx
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { User } from "lucide-react-native";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function AccountScreen() {
  const router = useRouter();
  const { user, isAuthenticated, signOut } = useAuth();

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center px-8 gap-4">
          <User size={64} color="#E5E7EB" />
          <Text className="font-poppins-semi text-xl text-text">
            Sign in to your account
          </Text>
          <Text className="font-poppins text-text-muted text-center">
            View your profile, track orders, and more
          </Text>
          <Button onPress={() => router.push("/auth/sign-in")} className="w-full mt-4">
            Sign In
          </Button>
          <Button
            variant="ghost"
            onPress={() => router.push("/auth/sign-up")}
            className="w-full"
          >
            Create Account
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6 gap-6">
        <Text className="font-poppins-bold text-2xl text-text">My Account</Text>

        {/* Profile Card */}
        <View className="bg-surface rounded-2xl p-6 items-center gap-3">
          <View className="w-20 h-20 rounded-full bg-primary/20 items-center justify-center">
            <Text className="font-poppins-bold text-2xl text-primary">
              {user?.name?.charAt(0)?.toUpperCase() ?? "?"}
            </Text>
          </View>
          <Text className="font-poppins-semi text-lg text-text">{user?.name}</Text>
          <Text className="font-poppins text-text-muted">{user?.email}</Text>
          {user?.phone && (
            <Text className="font-poppins text-text-muted">{user.phone}</Text>
          )}
        </View>

        <Button variant="secondary" onPress={signOut}>
          Log Out
        </Button>
      </View>
    </SafeAreaView>
  );
}
```

---

#### 5.15 — Initialize Auth Listener in Root Layout

Update `app/_layout.tsx` to initialize auth on app start:
```tsx
import { useAuth } from "@/hooks/use-auth";

// Inside RootLayout component, add:
useAuth(); // initializes auth listener on app start
```

---

#### 5.16 — Commit

```bash
git add .
git commit -m "Session 5: Supabase auth, sign in/up/forgot, Zod validation, account screen"
```

### Session 5 Outcome

- Real authentication with Supabase
- Sign in, sign up, forgot password — all with form validation
- Account screen shows profile when logged in, sign-in prompt when not
- Auth persists across app restart (secure token storage)
- Service interface pattern demonstrated — screens don't know about Supabase

---

## Session 6: Backend Integration — Menu + Orders via Supabase

### Goal

Replace all mock data with real Supabase data. The app is now fully functional end-to-end.

### What They Learn

- Supabase database setup (SQL, tables, RLS)
- Implementing service interfaces for real backend
- Data fetching hooks
- Connecting the service layer to the barrel export

### Steps

#### 6.1 — Create Database Tables in Supabase

Go to Supabase Dashboard > SQL Editor. Run the full schema:

```sql
-- Categories
CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- Menu items
CREATE TABLE menu_items (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  rating DECIMAL(2,1) DEFAULT 0.0,
  duration TEXT,
  image_url TEXT,
  category_id INT REFERENCES categories(id),
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- User profiles (extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT,
  photo_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Favorites
CREATE TABLE favorites (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id INT REFERENCES menu_items(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_id)
);

-- Orders
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  status TEXT DEFAULT 'pending',
  total DECIMAL(10,2) NOT NULL,
  estimated_mins INT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Order line items
CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  item_id INT REFERENCES menu_items(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  UNIQUE(order_id, item_id)
);
```

---

#### 6.2 — Set Up Row Level Security (RLS)

```sql
-- Enable RLS on all tables
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Public read for categories and menu items
CREATE POLICY "Anyone can read categories" ON categories FOR SELECT USING (true);
CREATE POLICY "Anyone can read menu items" ON menu_items FOR SELECT USING (true);

-- Profiles: users can read/update their own
CREATE POLICY "Users can read own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Favorites: users manage their own
CREATE POLICY "Users can read own favorites" ON favorites FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own favorites" ON favorites FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own favorites" ON favorites FOR DELETE USING (auth.uid() = user_id);

-- Orders: users manage their own
CREATE POLICY "Users can read own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own orders" ON orders FOR UPDATE USING (auth.uid() = user_id);

-- Order items: users can read their own order items
CREATE POLICY "Users can read own order items" ON order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );
CREATE POLICY "Users can insert own order items" ON order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = order_items.order_id AND orders.user_id = auth.uid())
  );
```

**Explain:**
- RLS = Row Level Security. Without it, any user can read/modify ALL data.
- `auth.uid()` returns the currently logged-in user's ID
- Menu/categories are public (anyone can browse). Everything else is per-user.

---

#### 6.3 — Seed the Database

```sql
-- Insert categories
INSERT INTO categories (id, name, icon, sort_order) VALUES
  (1, 'Burger', 'beef', 1),
  (2, 'Pizza', 'pizza', 2),
  (3, 'Chicken', 'drumstick', 3),
  (4, 'Seafood', 'fish', 4),
  (5, 'Rice', 'wheat', 5),
  (6, 'Drinks', 'cup-soda', 6),
  (7, 'Dessert', 'cake-slice', 7);

-- Insert menu items (same data as mock, but now in the database)
INSERT INTO menu_items (name, description, price, rating, duration, image_url, category_id) VALUES
  ('Classic Smash Burger', 'Double beef patty, melted cheddar, caramelized onions, house sauce on a brioche bun.', 12.99, 4.8, '15-20 min', 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500', 1),
  ('Margherita Pizza', 'San Marzano tomatoes, fresh mozzarella, basil, extra virgin olive oil on wood-fired crust.', 14.99, 4.7, '20-25 min', 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=500', 2),
  ('Crispy Fried Chicken', 'Buttermilk-brined, double-coated, fried golden. Served with honey drizzle and pickles.', 11.49, 4.9, '20-25 min', 'https://images.unsplash.com/photo-1626645738196-c2a7c87a8f58?w=500', 3),
  ('Grilled Salmon', 'Atlantic salmon fillet, lemon butter sauce, grilled asparagus, garlic mashed potatoes.', 19.99, 4.6, '25-30 min', 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=500', 4),
  ('Chicken Biryani', 'Fragrant basmati rice layered with spiced chicken, saffron, fried onions, and raita.', 13.99, 4.8, '25-30 min', 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500', 5),
  ('BBQ Bacon Burger', 'Angus beef, crispy bacon, smoked gouda, BBQ sauce, onion rings on a toasted bun.', 14.49, 4.5, '15-20 min', 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=500', 1),
  ('Pepperoni Pizza', 'Loaded pepperoni, mozzarella blend, tomato sauce on a crispy thin crust.', 13.99, 4.6, '20-25 min', 'https://images.unsplash.com/photo-1628840042765-356cda07504e?w=500', 2),
  ('Lemon Herb Chicken', 'Grilled chicken breast marinated in lemon, herbs, garlic. Served with roasted vegetables.', 12.99, 4.4, '20-25 min', 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=500', 3),
  ('Shrimp Pad Thai', 'Rice noodles, tiger shrimp, bean sprouts, peanuts, lime, tamarind sauce.', 15.49, 4.7, '20-25 min', 'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=500', 4),
  ('Lamb Kabsa', 'Saudi-style spiced rice with tender lamb, tomatoes, raisins, and almonds.', 16.99, 4.9, '30-35 min', 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=500', 5),
  ('Fresh Mango Smoothie', 'Ripe mangoes blended with yogurt, honey, and a touch of cardamom.', 5.99, 4.5, '5 min', 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=500', 6),
  ('Iced Caramel Latte', 'Espresso, cold milk, caramel syrup, served over ice with whipped cream.', 4.99, 4.3, '5 min', 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=500', 6),
  ('Kunafa', 'Crispy shredded pastry filled with sweet cheese, soaked in rose-scented syrup.', 8.99, 4.8, '15 min', 'https://images.unsplash.com/photo-1579888944880-d98341245702?w=500', 7),
  ('Chocolate Lava Cake', 'Warm chocolate cake with a molten center, served with vanilla ice cream.', 7.99, 4.7, '15 min', 'https://images.unsplash.com/photo-1624353365286-3f8d62daad51?w=500', 7),
  ('Fish & Chips', 'Beer-battered cod, thick-cut fries, mushy peas, tartar sauce, lemon wedge.', 13.49, 4.5, '20-25 min', 'https://images.unsplash.com/photo-1579208030886-b1715a638694?w=500', 4);
```

---

#### 6.4 — Implement Supabase MenuService

Create `services/supabase/menu.ts`:
```ts
import { supabase } from "./client";
import type { MenuService } from "../types";

export const menuService: MenuService = {
  async getCategories() {
    const { data, error } = await supabase
      .from("categories")
      .select("*")
      .order("sort_order");
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getItems(categoryId) {
    let query = supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .order("name");

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getItemById(id) {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data;
  },

  async searchItems(query) {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .ilike("name", `%${query}%`);
    if (error) throw new Error(error.message);
    return data ?? [];
  },

  async getPopularItems() {
    const { data, error } = await supabase
      .from("menu_items")
      .select("*")
      .eq("is_available", true)
      .gte("rating", 4.5)
      .order("rating", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
};
```

---

#### 6.5 — Implement Supabase OrderService

Create `services/supabase/orders.ts`:
```ts
import { supabase } from "./client";
import type { OrderService } from "../types";
import type { CartItem, Order } from "@/types/models";

export const orderService: OrderService = {
  async placeOrder(userId, items, total) {
    // Create the order
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({ user_id: userId, total, estimated_mins: 30 })
      .select()
      .single();
    if (orderErr) throw new Error(orderErr.message);

    // Create order items
    const orderItems = items.map((ci) => ({
      order_id: order.id,
      item_id: ci.item.id,
      quantity: ci.quantity,
      unit_price: ci.item.price,
    }));

    const { error: itemsErr } = await supabase
      .from("order_items")
      .insert(orderItems);
    if (itemsErr) throw new Error(itemsErr.message);

    return { ...order, items: orderItems } as Order;
  },

  async getOrders(userId) {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, menu_items(*))")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((o: any) => ({
      ...o,
      items: o.order_items.map((oi: any) => ({
        ...oi,
        item: oi.menu_items,
      })),
    }));
  },

  async getOrderById(id) {
    const { data, error } = await supabase
      .from("orders")
      .select("*, order_items(*, menu_items(*))")
      .eq("id", id)
      .single();
    if (error) return null;
    return {
      ...data,
      items: data.order_items.map((oi: any) => ({
        ...oi,
        item: oi.menu_items,
      })),
    };
  },

  async cancelOrder(id) {
    const { error } = await supabase
      .from("orders")
      .update({ status: "cancelled", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw new Error(error.message);
  },
};
```

---

#### 6.6 — Create a `useMenu` Hook

Create `hooks/use-menu.ts`:
```ts
import { useState, useEffect, useCallback } from "react";
import { menuService } from "@/services";
import type { MenuItem } from "@/types/models";

export function useMenu(categoryId?: number) {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const data = categoryId
        ? await menuService.getItems(categoryId)
        : await menuService.getItems();
      setItems(data);
    } catch (err) {
      console.error("Failed to fetch menu:", err);
    } finally {
      setLoading(false);
    }
  }, [categoryId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const search = async (query: string) => {
    if (!query.trim()) {
      fetchItems();
      return;
    }
    setLoading(true);
    try {
      const data = await menuService.searchItems(query);
      setItems(data);
    } finally {
      setLoading(false);
    }
  };

  return { items, loading, refresh: fetchItems, search };
}

export function usePopularItems() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    menuService
      .getPopularItems()
      .then(setItems)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return { items, loading };
}
```

---

#### 6.7 — Update the Barrel Export

Update `services/index.ts`:
```ts
// ★ THE place to swap backends. Change imports here, zero screen changes.
export { authService } from "./supabase/auth";
export { menuService } from "./supabase/menu";
export { orderService } from "./supabase/orders";
```

---

#### 6.8 — Update Screens to Use Hooks Instead of Mock Data

The Home screen and Menu screen now use `useMenu` / `usePopularItems` hooks instead of importing from `constants/menu-data.ts`. The item detail screen now uses `menuService.getItemById()`.

Update the cart's "Place Order" to call `orderService.placeOrder()` when authenticated.

**This is the "aha moment":** same screens, same UI, but now backed by a real PostgreSQL database.

---

#### 6.9 — Commit

```bash
git add .
git commit -m "Session 6: Supabase DB, RLS, menu/order services, hooks, real data"
```

### Session 6 Outcome

- Real database with categories and menu items
- RLS policies securing all user data
- Menu loads from Supabase (not mock data)
- Orders are saved to the database
- The service pattern proven: one barrel export change, zero screen changes

---

## Session 7: Account + Profile + Image Upload

### Goal

Users can view and edit their profile, upload a profile photo.

### What They Learn

- Image picker (`expo-image-picker`)
- File upload (Supabase Storage)
- Profile CRUD

### Steps

#### 7.1 — Create a Supabase Storage Bucket

In Supabase Dashboard > Storage:
- Create bucket `avatars` (public)
- Add policy: authenticated users can upload to their own path

#### 7.2 — Implement StorageService + UserService

Create `services/supabase/storage.ts` and `services/supabase/user.ts` implementing the interfaces.

#### 7.3 — Build Edit Profile Screen

Create `app/account/edit.tsx`:
- Tap avatar → `expo-image-picker` → pick image → upload to Supabase Storage
- Edit name, phone fields
- Save button → update profile

#### 7.4 — Wire Account Screen "Edit Profile" Button

Navigate to `/account/edit` from the Account tab.

### Session 7 Outcome

- Profile photo upload and display
- Editable name and phone
- Profile data persisted in Supabase

---

## Session 8: Order History + Tracking

### Goal

Users can view past orders and see a tracking map for active orders.

### What They Learn

- Complex data queries (orders with joined items)
- Map integration (`react-native-maps`)
- Status workflows (pending → preparing → delivering → delivered)

### Steps

#### 8.1 — Build `components/ui/badge.tsx`

**Why now:** Order cards need status badges (pending=yellow, delivered=green, cancelled=red).

#### 8.2 — Build `components/orders/order-card.tsx`

Order card showing: date, item names, total, status badge, "Track" / "Cancel" buttons.

#### 8.3 — Build Order History Screen

Create `app/orders/index.tsx` — list of orders from `orderService.getOrders()`.

#### 8.4 — Build Order Tracking Screen

Create `app/orders/[id]/track.tsx`:
- Map with restaurant marker and user marker
- Status timeline: ordered → preparing → delivering → delivered
- Demo delivery route (hardcoded polyline)

#### 8.5 — Register Routes + Navigation

Add order routes to the root layout. Link from cart "order placed" confirmation and from Account screen.

### Session 8 Outcome

- Order history with status badges
- Tracking screen with map and status timeline
- Cancel order functionality

---

## Session 9: Polish — Animations, Dark Mode, Error Handling

### Goal

The app feels complete and professional.

### What They Learn

- `react-native-reanimated` for smooth animations
- NativeWind dark mode (`dark:` variants)
- Error boundaries, loading states, toast notifications

### Steps

#### 9.1 — Build `components/ui/skeleton.tsx`

Animated pulsing placeholder shown while data loads. Replace raw `ActivityIndicator` with skeleton screens on Home and Menu.

#### 9.2 — Add Loading States to All Screens

Each screen shows skeleton placeholders while fetching, not a blank screen.

#### 9.3 — Add Empty States to All Screens

Every list screen (favorites, cart, orders) has an illustration + message + action button when empty.

#### 9.4 — Implement Dark Mode

- Add `dark:` variant classes to all components (e.g., `bg-background dark:bg-[#0F0F14]`)
- Test on both light and dark system settings
- Use `useColorScheme()` hook from `nativewind`

#### 9.5 — Add Animations

- Cart badge bounce when item count changes
- Smooth shared element transition on food images (card → detail)
- Tab bar animated indicator
- Skeleton pulse animation

#### 9.6 — Add Toast Notifications

"Added to cart", "Order placed", "Removed from favorites" — brief, non-blocking messages.

#### 9.7 — Final Commit

```bash
git add .
git commit -m "Session 9: Skeletons, dark mode, animations, toasts, polish"
```

### Session 9 Outcome

- Professional loading states (skeletons, not spinners)
- Dark mode across the entire app
- Smooth animations throughout
- Toast notifications for user actions
- The app feels production-ready

---

## Summary: What the Student Sees After Each Session

| Session | What's on Screen |
|---------|-----------------|
| **1** | 5-tab app with styled icons, gold theme, Poppins font |
| **2** | Home screen: hero, search bar, category pills, food card grid with real photos |
| **3** | Menu browsing with filters, item detail modal, working favorites with persistence |
| **4** | Full cart: add items, +/- qty, totals, badge on tab, "Place Order" |
| **5** | Real sign in/up/forgot with Supabase, validation errors, account profile |
| **6** | All data from real database, orders saved to Supabase, service pattern proven |
| **7** | Profile editing with photo upload |
| **8** | Order history with status badges, tracking map |
| **9** | Skeletons, dark mode, animations, toasts — production feel |

---

## Key Teaching Principles Used

1. **Every session = visible progress.** No "trust me" sessions.
2. **Build components when you need them**, not in isolation.
3. **Mock data first, backend later.** Proves UI and backend are independent.
4. **Concepts introduced through practice.** Zustand taught via favorites (simple), then cart (complex).
5. **Architecture revealed gradually.** Service interfaces introduced when auth is added, proven when menu switches from mock to Supabase.
6. **Each session builds on the last.** No session can be skipped — they're dependent but self-contained.
