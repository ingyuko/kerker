# Ingyu's 3daysofdesign Guide

A mobile-first web app for planning and navigating Copenhagen **3daysofdesign**.

Not a generic event site — a personal design guide that helps you discover
exhibitions, filter by interest, plan daily routes, explore by zone, save
favorites, and quickly decide what's worth visiting.

Built for **iPhone Safari** first (390px / iPhone 15 Pro), desktop second.

## Tech stack

- **Next.js 15** (App Router) + **TypeScript**
- **TailwindCSS** with an editorial Scandinavian palette
- **shadcn/ui**-style components (Button, Card, Badge, Tabs) + **Radix UI**
- **Lucide** icons
- Deploy target: **Vercel**

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000.

```bash
npm run build   # production build
npm run start   # serve the production build
npm run lint    # eslint
```

## Pages

| Route       | Purpose                                                               |
| ----------- | --------------------------------------------------------------------- |
| `/`         | Browse exhibitions. Sticky tag + zone filter bar (multi-select, AND). |
| `/planner`  | Day 1–3 itinerary tabs, each themed and ordered as a walking route.   |
| `/map`      | Static zone cards grouping exhibitions (Google Maps integration TBD). |
| `/saved`    | Favorites saved to `localStorage` via the heart on each card.         |

## Filtering

- **Tag filters** (`Yellow Nose`, `Curator Pick`, `Hospitality`, `Material`,
  `Lighting`, `Japan`, `Must Go`) are multi-select and combine with **AND**
  semantics — `Yellow Nose` + `Curator Pick` shows only exhibitions carrying
  both tags.
- **Zone filters** (`All`, `Frederiksstaden`, `City Center`, `Nordhavn`,
  `Refshaleøen`) combine with the tag filters.

## Project structure

```
app/
  layout.tsx          # fonts, metadata, viewport, bottom nav shell
  page.tsx            # Home (browse)
  planner/page.tsx    # Planner
  map/page.tsx        # Map
  saved/page.tsx      # Saved
components/
  ui/                 # shadcn-style primitives (button, badge, card, tabs)
  exhibition-card.tsx # full card + compact row
  home-browser.tsx    # client filter state
  filter-bar.tsx      # tag + zone chips
  planner-tabs.tsx    # day tabs + route list
  saved-list.tsx      # localStorage-backed favorites list
  bottom-nav.tsx      # fixed mobile tab bar
lib/
  types.ts            # Exhibition model + filter constants
  data.ts             # seed data (13 exhibitions, placeholder images)
  planner.ts          # three-day itinerary
  useSavedExhibitions.ts  # localStorage favorites hook
  utils.ts            # cn() helper
```

## Data model

```ts
interface Exhibition {
  id: string;
  name: string;
  zone: "Frederiksstaden" | "City Center" | "Nordhavn" | "Refshaleøen";
  priority: "must-go" | "worth-it" | "optional";
  tags: string[];
  images: string[]; // placeholders for now — no real imagery yet
  about: string;
  whyGo: string;
  whatToLookFor: string;
  websiteUrl: string;
  eventUrl: string;
  mapUrl: string;
}
```

Seed data covers 13 exhibitions: Carl Hansen & Søn, Fredericia, Ark Journal,
COMPOSED MATTER, Frama, La Cabra, Kvadrat, Japanmade, Dynaudio × Karimoku,
Louis Poulsen, Ingo Maurer, Display, and Other Circle.

## Not built yet (foundation only)

Google Maps API, route optimization, AI recommendations, calendar sync,
ticket reservations, and user accounts are intentionally out of scope.
