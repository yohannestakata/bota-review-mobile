# Bota Review — Mobile App Standards and Code Organization

**Stack:** Expo SDK 56 · React Native 0.85 · React 19.2 · TypeScript · Clerk · React Query · React Hook Form + Zod  
**Platform:** Android-first (New Architecture — mandatory, no opt-out)  
**Pattern:** Feature-based folder structure with Expo Router

---

## SDK 56 — What This Means for Bota

SDK 56 is a significant release. These points affect how the app is built from day one.

### Mandatory and non-negotiable

- **New Architecture is always on** — SDK 55+ removed the opt-out entirely. There is no `newArchEnabled` flag to manage.
- **Node ≥ 20.19.4** required for the dev environment and CI.
- **iOS minimum 16.4** — noted for completeness even though Android is the launch target; relevant when iOS work begins post-MVP.
- **No direct `@react-navigation/*` imports** in application code. Expo Router has decoupled from React Navigation as of SDK 56. `expo-doctor` will flag this — run it as part of CI.
- **`@expo/vector-icons` is a separate explicit dependency** — no longer bundled through the `expo` package.
- **`expo/fetch` is the default global `fetch`** — our API client uses this implicitly; no polyfill needed.

### New capabilities — used selectively

**Expo UI** (stable on Android via Jetpack Compose, stable on iOS via SwiftUI, web experimental) provides native primitives: `Host`, `Row`, `Column`, `Text`, `TextInput`, `Button`, `Switch`, `Slider`, `Checkbox`, `BottomSheet`.

For Bota at MVP:
- **Use Expo UI's `BottomSheet`** for filters, branch quick-actions, and the photo category picker — these benefit most from native feel and gesture handling
- **Do not rebuild the core UI** (cards, screens, lists) on Expo UI yet — it's one release old, ecosystem patterns are still forming, and our existing StyleSheet-based component system is proven and consistent
- Revisit broader Expo UI adoption after MVP launch

### Library compatibility

| Library | Status on SDK 56 | Notes |
|---|---|---|
| `@shopify/flash-list` v2 | New Architecture only — required | Drop-in for FlatList, no size estimates needed |
| `react-native-reanimated` v4 | New Architecture only — required | Uses `react-native-worklets` |
| `expo-image` | New Architecture compatible | Disk caching, use everywhere |
| `@expo/vector-icons` | Separate dependency now | `npx expo install @expo/vector-icons` |
| `@clerk/clerk-expo` | Compatible | Verify version supports RN 0.85 at install time |
| `zustand` | Compatible | No native dependencies |
| `@tanstack/react-query` | Compatible | No native dependencies |
| `react-hook-form` + `zod` | Compatible | No native dependencies |
| `@expo/ui` | Stable on Android/iOS, web experimental | Used for `BottomSheet` only at MVP |

Run `npx expo-doctor` in CI — it validates dependencies against React Native Directory and flags New Architecture incompatibilities and `expo-router`/`react-navigation` conflicts automatically.

---

## Project Structure

```
bota-mobile/
├── app/                          # Expo Router file-based navigation
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── sign-in.tsx
│   │   └── sign-up.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Home
│   │   ├── discover.tsx          # Browse + filters
│   │   └── saved.tsx             # Saved branches
│   ├── branch/
│   │   └── [id].tsx              # Branch detail
│   ├── place/
│   │   └── [id].tsx              # Place overview
│   ├── collection/
│   │   └── [slug].tsx            # Curated collection
│   ├── review/
│   │   ├── write.tsx              # Write / edit review
│   │   └── [id].tsx               # View single review
│   ├── claim/
│   │   └── [branchId].tsx         # Business claim form
│   ├── profile/
│   │   ├── index.tsx              # Own profile
│   │   └── [id].tsx               # Public profile
│   ├── _layout.tsx                # Root layout
│   └── +not-found.tsx
├── src/
│   ├── api/                       # API client and request functions
│   │   ├── client.ts
│   │   ├── branches.ts
│   │   ├── places.ts
│   │   ├── reviews.ts
│   │   ├── menus.ts
│   │   ├── photos.ts
│   │   ├── saves.ts
│   │   ├── submissions.ts
│   │   ├── claims.ts
│   │   └── analytics.ts
│   ├── components/                # Shared UI components
│   │   ├── ui/                    # Primitives: Button, Text, Input, etc.
│   │   ├── branch/                # Branch-specific components
│   │   ├── review/                # Review-specific components
│   │   ├── layout/                # Screen wrappers, headers, etc.
│   │   └── common/                 # EmptyState, LoadingSpinner, ErrorScreen
│   ├── hooks/                      # Shared custom hooks
│   │   ├── use-debounce.ts
│   │   ├── use-analytics.ts
│   │   └── use-branch-detail.ts
│   ├── forms/                      # React Hook Form + Zod schemas
│   │   ├── review-form.schema.ts
│   │   ├── claim-form.schema.ts
│   │   └── submission-form.schema.ts
│   ├── stores/                     # Zustand stores for local UI state
│   │   ├── filters.store.ts
│   │   └── search.store.ts
│   ├── lib/                        # Pure utility functions
│   │   ├── format.ts               # Date, price, address formatting
│   │   ├── cloudinary.ts
│   │   └── error-messages.ts       # Error code → product message map
│   ├── constants/
│   │   ├── theme.ts                 # Colors, spacing, typography
│   │   ├── query-keys.ts            # React Query key factory
│   │   ├── error-codes.ts           # Mirrors backend ErrorCode
│   │   └── config.ts                # API base URL, env flags
│   └── types/
│       ├── api.ts                   # Response types mirroring backend
│       └── navigation.ts            # Route param types
├── assets/
│   ├── fonts/
│   └── images/
├── app.json
├── expo-env.d.ts
└── package.json
```

---

## app.json — Required Configuration

```json
{
  "expo": {
    "newArchEnabled": true,
    "experiments": {
      "typedRoutes": true
    },
    "plugins": [
      "expo-router"
    ]
  }
}
```

`typedRoutes` generates TypeScript types for every route in `app/` — `router.push()` and `useLocalSearchParams()` calls are type-checked against actual file structure. This is required, not optional, for a codebase this size.

`newArchEnabled` is technically redundant on SDK 56 (it's always on) but kept explicit for clarity and to avoid confusion if the project is ever inspected against older SDK assumptions.

---

## Navigation

Expo Router, file-based. Never import from `@react-navigation/*` directly — all navigation primitives come through `expo-router`.

```typescript
// Navigate programmatically
import { router } from 'expo-router'

router.push('/branch/abc-123')
router.push({ pathname: '/branch/[id]', params: { id: branch.id } })
router.back()
```

```typescript
// Read route params — typed via experiments.typedRoutes
import { useLocalSearchParams } from 'expo-router'

export default function BranchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  // ...
}
```

### Rules

- Always use `router` from `expo-router` — never `navigation.navigate()`
- Always type `useLocalSearchParams` with the expected param shape
- Use `useLocalSearchParams`, never `useGlobalSearchParams` — the global variant re-renders on every navigation event across the app
- Keep `_layout.tsx` files lean — navigation structure and providers only, no data fetching
- Auth-protected routes live inside `(auth)` group with a guard in `_layout.tsx`
- Run `npx expo-doctor` in CI to catch any accidental `react-navigation` imports

---

## Naming Conventions

### Files and folders

```
branch-card.tsx              # kebab-case for all files
use-branch-detail.ts         # hooks prefixed with use-
review-form.schema.ts        # Zod schemas suffixed with .schema
branches.ts                  # API modules are plural nouns
```

### Components

```typescript
export function BranchCard() {}
export function ReviewItem() {}
export function FilterBottomSheet() {}
```

### Hooks

```typescript
export function useBranchDetail(id: string) {}
export function useDiscoverFilters() {}
export function useSaveBranch() {}
```

### Constants

```typescript
export const MAX_REVIEW_LENGTH = 2000
export const DEFAULT_PAGE_SIZE = 20
export const PLACEHOLDER_IMAGE = require('@/assets/images/placeholder.png')
```

### Types

```typescript
export type Branch = { id: string; label: string /* ... */ }
export type BranchFilters = { neighborhoodId?: string; priceLevel?: number }
```

---

## Error Handling

The mobile client receives errors in the backend's standard shape (see backend standards doc): `statusCode`, `code`, `message`, optional `fields`, `requestId`. The `code` is stable and mapped to product-facing copy on the client — the `message` is a backend technical string and is never shown to users directly.

### API client

```typescript
// src/api/client.ts

import { useAuth } from '@clerk/clerk-expo'
import { config } from 'src/constants/config'

type ApiErrorBody = {
  statusCode: number
  code: string
  message: string
  requestId: string
  fields?: Record<string, { code: string; message: string }>
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    public readonly requestId: string,
    public readonly fields?: ApiErrorBody['fields'],
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'ApiError'
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options

  // expo/fetch is the global fetch on SDK 56 — no polyfill needed
  const response = await fetch(`${config.apiUrl}${path}`, {
    ...fetchOptions,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...fetchOptions.headers,
    },
  })

  if (!response.ok) {
    const body: ApiErrorBody = await response.json().catch(() => ({
      statusCode: response.status,
      code: 'UNKNOWN_ERROR',
      message: 'Request failed',
      requestId: '',
    }))

    throw new ApiError(body.statusCode, body.code, body.requestId, body.fields, body.message)
  }

  return response.json()
}
```

### Error code → product message map

```typescript
// src/lib/error-messages.ts

import { ApiError } from 'src/api/client'

const errorMessages: Record<string, string> = {
  BRANCH_NOT_FOUND: "We couldn't find this place. It may have been removed.",
  BRANCH_INCOMPLETE: 'This listing is still being prepared.',
  REVIEW_ALREADY_EXISTS: "You've already reviewed this place. You can edit your review instead.",
  REVIEW_NOT_OWNED: "You can only edit your own reviews.",
  REVIEW_CANNOT_REPORT_OWN: "You can't report your own review.",
  SAVE_ALREADY_EXISTS: 'This place is already in your saved list.',
  SAVE_NOT_FOUND: "This place isn't in your saved list.",
  CLAIM_ALREADY_PENDING: 'A claim for this business is already being reviewed.',
  CLAIM_ALREADY_VERIFIED: 'This business has already been verified.',
  ACCOUNT_SUSPENDED: 'Your account has been suspended. Contact support for help.',
  VALIDATION_ERROR: 'Please check the highlighted fields.',
  RATE_LIMITED: "You're doing that too quickly. Please wait a moment and try again.",
  UNAUTHORIZED: 'Please sign in to continue.',
  FORBIDDEN: "You don't have permission to do that.",
  INTERNAL_ERROR: 'Something went wrong on our end. Please try again.',
}

const DEFAULT_MESSAGE = 'Something went wrong. Please try again.'

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return errorMessages[error.code] ?? DEFAULT_MESSAGE
  }
  return DEFAULT_MESSAGE
}

// Field-level errors for forms — used with React Hook Form's setError
export function getFieldErrorMessage(fieldCode: string): string {
  const fieldMessages: Record<string, string> = {
    TOO_SHORT: 'This is too short.',
    TOO_BIG: 'This is too long.',
    REQUIRED: 'This field is required.',
    INVALID_TYPE: 'This value is not valid.',
    TOO_SMALL: 'This value is too small.',
  }
  return fieldMessages[fieldCode] ?? 'This field is invalid.'
}
```

### Rules

- Never display `error.message` directly to users — always go through `getErrorMessage()`
- New error codes added to the backend must be added to `error-messages.ts` — treat this as part of the API contract
- Unmapped codes fall back to a generic message — never show raw codes or technical messages to users
- `requestId` is logged (not shown) for debugging — include it in any bug report flow

---

## API Layer

### Client setup

Covered above in Error Handling. The client is the single point where `fetch`, auth headers, and error parsing happen.

### API module example

```typescript
// src/api/branches.ts

import { apiRequest } from './client'
import type { Branch, BranchDetail, BranchFilters, BranchCard } from 'src/types/api'

export const branchesApi = {
  list: (filters: BranchFilters, token?: string) =>
    apiRequest<BranchCard[]>(
      `/v1/branches?${new URLSearchParams(filters as Record<string, string>)}`,
      { token },
    ),

  getById: (id: string) =>
    apiRequest<BranchDetail>(`/v1/branches/${id}`),

  save: (id: string, token: string) =>
    apiRequest<void>(`/v1/branches/${id}/saves`, { method: 'POST', token }),

  unsave: (id: string, token: string) =>
    apiRequest<void>(`/v1/branches/${id}/saves`, { method: 'DELETE', token }),
}
```

Note responses are **not enveloped** — `list` returns `BranchCard[]` directly, matching the backend's no-envelope convention. Pagination metadata (`X-Total-Count`, `X-Page`, `X-Per-Page`) is read from response headers when needed for "load more" UI.

```typescript
// Reading pagination headers when needed
async function listWithPagination(filters: BranchFilters, token?: string) {
  const response = await fetch(`${config.apiUrl}/v1/branches?${new URLSearchParams(filters as any)}`)
  const data: BranchCard[] = await response.json()

  return {
    data,
    total: Number(response.headers.get('X-Total-Count') ?? 0),
    page: Number(response.headers.get('X-Page') ?? 1),
    perPage: Number(response.headers.get('X-Per-Page') ?? 20),
  }
}
```

---

## Data Fetching with React Query

All server data goes through TanStack Query. No `useEffect` + `useState` for data fetching.

### Query key factory

```typescript
// src/constants/query-keys.ts

export const queryKeys = {
  branches: {
    all: ['branches'] as const,
    lists: () => [...queryKeys.branches.all, 'list'] as const,
    list: (filters: object) => [...queryKeys.branches.lists(), filters] as const,
    detail: (id: string) => [...queryKeys.branches.all, 'detail', id] as const,
    saved: () => [...queryKeys.branches.all, 'saved'] as const,
  },
  reviews: {
    all: ['reviews'] as const,
    byBranch: (branchId: string) => [...queryKeys.reviews.all, 'branch', branchId] as const,
    own: () => [...queryKeys.reviews.all, 'own'] as const,
  },
  discovery: {
    home: () => ['discovery', 'home'] as const,
    collection: (slug: string) => ['discovery', 'collection', slug] as const,
  },
  places: {
    detail: (id: string) => ['places', 'detail', id] as const,
  },
}
```

### Query hook example

```typescript
// src/hooks/use-branch-detail.ts

import { useQuery } from '@tanstack/react-query'
import { branchesApi } from 'src/api/branches'
import { queryKeys } from 'src/constants/query-keys'

export function useBranchDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.branches.detail(id),
    queryFn: () => branchesApi.getById(id),
    staleTime: 1000 * 60 * 5,
    enabled: !!id,
  })
}
```

### Mutation example

```typescript
// src/hooks/use-save-branch.ts

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-expo'
import { branchesApi } from 'src/api/branches'
import { queryKeys } from 'src/constants/query-keys'

export function useSaveBranch(branchId: string) {
  const { getToken } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      return branchesApi.save(branchId, token)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.lists() })
      queryClient.invalidateQueries({ queryKey: queryKeys.branches.saved() })
    },
  })
}
```

### Rules

- `staleTime` always set explicitly — never rely on the default of `0`
- `enabled: !!id` prevents queries firing with undefined params
- Prefer `invalidateQueries` over manual cache writes
- Never fetch data directly in components — always via a hook
- Use `error instanceof ApiError` and `getErrorMessage(error)` for any error display

---

## Forms — React Hook Form + Zod

Used for review writing, business claims, and suggested edits. Zod schemas should mirror the shape of the backend's `nestjs-zod` schemas where the same data is validated on both sides — keeps validation rules consistent and makes the relationship between client and server validation explicit.

### Schema

```typescript
// src/forms/review-form.schema.ts

import { z } from 'zod'

export const reviewFormSchema = z.object({
  rating: z.number().int().min(1).max(5),
  text: z.string().min(20, 'Reviews need at least 20 characters').max(2000),
  visitDate: z.date().max(new Date(), 'Visit date must be in the past').optional(),
})

export type ReviewFormValues = z.infer<typeof reviewFormSchema>
```

```typescript
// src/forms/claim-form.schema.ts

import { z } from 'zod'

export const claimFormSchema = z.object({
  contactName: z.string().min(1, 'Name is required').max(100),
  contactRole: z.enum(['owner', 'manager', 'marketing']),
  contactPhone: z.string().min(7, 'Enter a valid phone number').max(20),
  contactEmail: z.string().email('Enter a valid email'),
  note: z.string().max(500).optional(),
})

export type ClaimFormValues = z.infer<typeof claimFormSchema>
```

### Usage with React Hook Form

```typescript
// app/review/write.tsx

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { View, TextInput, Text } from 'react-native'
import { reviewFormSchema, ReviewFormValues } from 'src/forms/review-form.schema'
import { useSubmitReview } from 'src/hooks/use-submit-review'
import { getErrorMessage } from 'src/lib/error-messages'
import { ApiError } from 'src/api/client'

export default function WriteReviewScreen() {
  const { id: branchId } = useLocalSearchParams<{ id: string }>()
  const submitReview = useSubmitReview(branchId)

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewFormSchema),
    defaultValues: { rating: 0, text: '' },
  })

  const onSubmit = async (values: ReviewFormValues) => {
    try {
      await submitReview.mutateAsync(values)
      router.back()
    } catch (error) {
      if (error instanceof ApiError && error.fields) {
        // Map backend field errors onto the form
        for (const [field, detail] of Object.entries(error.fields)) {
          setError(field as keyof ReviewFormValues, { message: detail.message })
        }
      } else {
        // Show a toast/banner with getErrorMessage(error)
      }
    }
  }

  return (
    <View>
      <Controller
        control={control}
        name="text"
        render={({ field }) => (
          <TextInput
            multiline
            value={field.value}
            onChangeText={field.onChange}
            placeholder="Share your experience..."
          />
        )}
      />
      {errors.text && <Text style={styles.error}>{errors.text.message}</Text>}
      {/* rating input, visit date picker, submit button */}
    </View>
  )
}
```

### Rules

- Every user-facing form uses `react-hook-form` with `zodResolver`
- Client-side Zod schemas mirror backend validation rules where the same field is validated — keeps error messages consistent and catches issues before a network round-trip
- Backend `fields` errors (422 responses) are mapped onto form fields via `setError` — this handles cases where server-side validation catches something the client schema didn't (e.g. uniqueness checks)
- Field-level error messages use `getFieldErrorMessage()` for any codes not already covered by the Zod schema's own messages

---

## Component Standards

```typescript
// src/components/branch/branch-card.tsx

import { StyleSheet, View, Text, Pressable } from 'react-native'
import { Image } from 'expo-image'
import { router } from 'expo-router'
import { colors, spacing, typography, radius } from 'src/constants/theme'
import type { BranchCard as BranchCardType } from 'src/types/api'

type Props = {
  branch: BranchCardType
  onPress?: () => void
}

export function BranchCard({ branch, onPress }: Props) {
  const handlePress = () => {
    onPress?.()
    router.push(`/branch/${branch.id}`)
  }

  return (
    <Pressable style={styles.container} onPress={handlePress}>
      <Image
        source={{ uri: branch.coverPhotoUrl }}
        style={styles.image}
        contentFit="cover"
        transition={200}
        cachePolicy="memory-disk"
      />
      <View style={styles.info}>
        <Text style={styles.name}>{branch.label}</Text>
        <Text style={styles.neighborhood}>{branch.neighborhood}</Text>
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surface,
  },
  image: {
    width: '100%',
    height: 160,
    backgroundColor: colors.border,
  },
  info: {
    padding: spacing.md,
  },
  name: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  neighborhood: {
    ...typography.bodySmall,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
})
```

### Rules

- Always use `StyleSheet.create()` — never inline style objects
- Never use magic numbers — reference `theme.ts`
- Use `Pressable`, not `TouchableOpacity` — better Android feedback under New Architecture
- Always `expo-image`, never RN's built-in `Image`
- Prop types as explicit `type Props = {}`, never inlined
- One component per file, named exports only

---

## Lists — FlashList v2

FlashList v2 is New Architecture only — which is mandatory on SDK 56, so this is a clean requirement, not a tradeoff. Use it for any list that can exceed ~20 items: branch results, reviews, search results, saved branches, collection branch lists.

```typescript
// app/(tabs)/discover.tsx

import { FlashList } from '@shopify/flash-list'
import { BranchCard } from 'src/components/branch/branch-card'
import { useBranchList } from 'src/hooks/use-branch-list'
import { useFiltersStore } from 'src/stores/filters.store'
import { EmptyState } from 'src/components/common/empty-state'
import { LoadingScreen } from 'src/components/common/loading-screen'
import { ErrorScreen } from 'src/components/common/error-screen'

export default function DiscoverScreen() {
  const filters = useFiltersStore()
  const { data, isLoading, isError, refetch } = useBranchList(filters)

  if (isLoading) return <LoadingScreen />
  if (isError) return <ErrorScreen onRetry={refetch} />
  if (!data?.length) return <EmptyState title="No places found" subtitle="Try adjusting your filters" />

  return (
    <FlashList
      data={data}
      renderItem={({ item }) => <BranchCard branch={item} />}
      keyExtractor={(item) => item.id}
      // v2 handles sizing automatically — no estimatedItemSize required
    />
  )
}
```

### Mixed item types — collections on home screen

```typescript
type HomeSection =
  | { type: 'collection'; collection: Collection }
  | { type: 'branch_row'; branches: BranchCard[] }

<FlashList
  data={sections}
  getItemType={(item) => item.type}    // separate recycling pools per type
  renderItem={({ item }) => {
    switch (item.type) {
      case 'collection':
        return <CollectionSection collection={item.collection} />
      case 'branch_row':
        return <BranchRow branches={item.branches} />
    }
  }}
  keyExtractor={(item, index) => `${item.type}-${index}`}
/>
```

### Rules

- Use `FlashList`, never `FlatList`, for any list of branch cards, reviews, or search results
- No `estimatedItemSize` needed in v2 — don't add it
- Use `getItemType` whenever a list mixes different card shapes (home screen sections)
- `maintainVisibleContentPosition` is enabled by default in v2 — useful for "load more" pagination without scroll jump

---

## Theme System

```typescript
// src/constants/theme.ts

export const colors = {
  primary: '#2D6A4F',
  primaryLight: '#52B788',
  surface: '#FFFFFF',
  background: '#F8F8F6',
  border: '#E8E8E4',
  error: '#D62828',

  text: {
    primary: '#1A1A1A',
    secondary: '#666666',
    disabled: '#AAAAAA',
    inverse: '#FFFFFF',
  },

  rating: '#F4A261',
  fasting: '#457B9D',
  verified: '#2D6A4F',
}

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
}

export const radius = {
  sm: 6,
  md: 12,
  lg: 20,
  full: 9999,
}

export const typography = {
  heading1: { fontSize: 28, fontWeight: '700', lineHeight: 34 },
  heading2: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  heading3: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  bodyLarge: { fontSize: 16, fontWeight: '400', lineHeight: 24 },
  bodyMedium: { fontSize: 14, fontWeight: '400', lineHeight: 20 },
  bodySmall: { fontSize: 12, fontWeight: '400', lineHeight: 16 },
  label: { fontSize: 12, fontWeight: '600', lineHeight: 16, letterSpacing: 0.5 },
} as const
```

### Rules

- Never hardcode colors or spacing — always reference `theme.ts`
- Use semantic color names (`text.primary`, not `black`) — enables future dark mode
- Typography scales defined once, referenced everywhere

---

## Native Bottom Sheets — Expo UI

Use Expo UI's `BottomSheet` for filters, branch quick-actions (save, share, directions, report), and category pickers. This gives native gesture handling and platform-correct presentation without a third-party sheet library.

```typescript
// src/components/branch/filter-bottom-sheet.tsx

import { Host, BottomSheet, Column, Text, Button } from '@expo/ui'
import { useFiltersStore } from 'src/stores/filters.store'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function FilterBottomSheet({ isOpen, onClose }: Props) {
  const filters = useFiltersStore()

  return (
    <Host>
      <BottomSheet isOpened={isOpen} onIsOpenedChange={(open) => !open && onClose()}>
        <Column padding={16} spacing={12}>
          <Text size="title">Filters</Text>
          {/* neighborhood, cuisine, price level, tag controls */}
          <Button onPress={onClose}>Apply</Button>
        </Column>
      </BottomSheet>
    </Host>
  )
}
```

### Rules

- Expo UI is used for `BottomSheet` only at MVP — not a replacement for the core component system
- Wrap Expo UI components in a `Host` as required by the API
- Test on Android primarily — iOS SwiftUI rendering is stable but secondary for this build
- If Expo UI's API shifts in a future SDK, isolate the blast radius by keeping all Expo UI usage inside dedicated components (like `FilterBottomSheet`) — never spread inline through screens

---

## State Management

React Query for server state. Zustand for local UI state shared across screens (filters, search). `useState` for component-local state.

```typescript
// src/stores/filters.store.ts

import { create } from 'zustand'

type FiltersState = {
  neighborhoodId: string | null
  priceLevel: number | null
  tagIds: string[]
  setNeighborhood: (id: string | null) => void
  setPriceLevel: (level: number | null) => void
  toggleTag: (id: string) => void
  reset: () => void
}

const initialState = {
  neighborhoodId: null,
  priceLevel: null,
  tagIds: [],
}

export const useFiltersStore = create<FiltersState>((set) => ({
  ...initialState,
  setNeighborhood: (id) => set({ neighborhoodId: id }),
  setPriceLevel: (level) => set({ priceLevel: level }),
  toggleTag: (id) =>
    set((state) => ({
      tagIds: state.tagIds.includes(id)
        ? state.tagIds.filter((t) => t !== id)
        : [...state.tagIds, id],
    })),
  reset: () => set(initialState),
}))
```

### Rules

- Zustand stores hold UI state only — never API response data
- Keep stores small and single-purpose
- Every store exposes a `reset` action
- Never access a Zustand store inside an API call

---

## Analytics

```typescript
// src/hooks/use-analytics.ts

import { useCallback } from 'react'
import { analyticsApi } from 'src/api/analytics'
import { useAuth } from '@clerk/clerk-expo'
import { getSessionId } from 'src/lib/session'

type EventName =
  | 'search_submitted'
  | 'search_no_results'
  | 'branch_viewed'
  | 'menu_viewed'
  | 'directions_clicked'
  | 'phone_clicked'
  | 'branch_saved'
  | 'branch_unsaved'
  | 'share_clicked'
  | 'review_started'
  | 'review_submitted'
  | 'filter_applied'
  | 'collection_viewed'
  | 'edit_suggested'
  | 'claim_submitted'

type TrackParams = {
  name: EventName
  branchId?: string
  properties?: Record<string, unknown>
}

export function useAnalytics() {
  const { userId } = useAuth()

  const track = useCallback(
    (params: TrackParams) => {
      analyticsApi
        .track({ ...params, userId: userId ?? undefined, sessionId: getSessionId() })
        .catch(() => {})
    },
    [userId],
  )

  return { track }
}
```

### Rules

- Analytics calls are fire-and-forget — never `await`
- Failures silently swallowed — never affect the UI
- Event names typed against the shared list — no arbitrary strings
- PostHog events fire via `posthog-react-native` SDK directly, separate from this internal-table tracker (see backend standards for the split)

---

## Image Handling

```typescript
// src/lib/cloudinary.ts

import { config } from 'src/constants/config'

export function getImageUrl(
  publicId: string,
  options: { width?: number; height?: number; quality?: number } = {},
) {
  const { width = 800, height, quality = 80 } = options

  const transforms = [
    `w_${width}`,
    height ? `h_${height}` : null,
    `q_${quality}`,
    'f_auto',
    'c_fill',
  ]
    .filter(Boolean)
    .join(',')

  return `https://res.cloudinary.com/${config.cloudinaryCloudName}/image/upload/${transforms}/${publicId}`
}

// Usage
getImageUrl(photo.cloudinaryPublicId, { width: 400, height: 300 })   // card thumbnail
getImageUrl(photo.cloudinaryPublicId, { width: 1200 })               // full detail view
```

### Rules

- Always `expo-image`, never RN's `Image`
- Always request appropriately sized images via Cloudinary transforms — never load full-res for thumbnails
- `cachePolicy="memory-disk"` on every image for offline-friendly repeat views

---

## Photo Upload Flow

Matches the backend's documented flow exactly — client uploads directly to Cloudinary, then registers the result.

```typescript
// src/hooks/use-upload-photo.ts

import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@clerk/clerk-expo'
import { photosApi } from 'src/api/photos'

export function useUploadPhoto(branchId: string) {
  const { getToken } = useAuth()

  return useMutation({
    mutationFn: async ({ uri, category, reviewId }: {
      uri: string
      category: string
      reviewId?: string
    }) => {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      // 1. Get signed upload params
      const signature = await photosApi.getUploadSignature(token)

      // 2. Upload directly to Cloudinary
      const formData = new FormData()
      formData.append('file', { uri, type: 'image/jpeg', name: 'photo.jpg' } as any)
      formData.append('api_key', signature.apiKey)
      formData.append('timestamp', String(signature.timestamp))
      formData.append('signature', signature.signature)
      formData.append('upload_preset', signature.uploadPreset)

      const uploadResponse = await fetch(
        `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
        { method: 'POST', body: formData },
      )

      if (!uploadResponse.ok) throw new Error('Upload failed')
      const result = await uploadResponse.json()

      // 3. Register with backend
      try {
        return await photosApi.register(branchId, {
          publicId: result.public_id,
          url: result.secure_url,
          width: result.width,
          height: result.height,
          category,
          reviewId,
        }, token)
      } catch (err) {
        // 4. Clean up on registration failure
        await photosApi.deleteCloudinaryAsset(result.public_id, token).catch(() => {})
        throw err
      }
    },
  })
}
```

---

## Screen Structure

Screens live in `app/`, are thin, and coordinate hooks and components. Every data-dependent screen handles loading, error, and empty states.

```typescript
// app/branch/[id].tsx

import { ScrollView, StyleSheet } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import { useEffect } from 'react'
import { useBranchDetail } from 'src/hooks/use-branch-detail'
import { useAnalytics } from 'src/hooks/use-analytics'
import { BranchHeader } from 'src/components/branch/branch-header'
import { BranchMenu } from 'src/components/branch/branch-menu'
import { ReviewList } from 'src/components/review/review-list'
import { LoadingScreen } from 'src/components/common/loading-screen'
import { ErrorScreen } from 'src/components/common/error-screen'

export default function BranchDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: branch, isLoading, isError, refetch } = useBranchDetail(id)
  const { track } = useAnalytics()

  useEffect(() => {
    if (branch) track({ name: 'branch_viewed', branchId: id, properties: { source: 'direct' } })
  }, [branch])

  if (isLoading) return <LoadingScreen />
  if (isError || !branch) return <ErrorScreen onRetry={refetch} />

  return (
    <ScrollView style={styles.container}>
      <BranchHeader branch={branch} />
      <BranchMenu branchId={id} />
      <ReviewList branchId={id} />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
})
```

### Rules

- Screens contain no business logic — only hooks, components, and layout
- Every screen handles loading, error, and empty states explicitly via shared components
- `ErrorScreen` accepts `onRetry` and displays `getErrorMessage(error)` — never raw error text

---

## Error and Empty States

```typescript
// src/components/common/loading-screen.tsx
export function LoadingScreen() { /* centered spinner */ }

// src/components/common/error-screen.tsx
export function ErrorScreen({ error, onRetry }: { error?: unknown; onRetry?: () => void }) {
  // Displays getErrorMessage(error) and a retry button
}

// src/components/common/empty-state.tsx
export function EmptyState({ title, subtitle, action }: EmptyStateProps) { /* illustration + text */ }
```

---

## Environment Variables

```
# .env.local (never committed)
EXPO_PUBLIC_API_URL=http://localhost:3000
EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=...
EXPO_PUBLIC_POSTHOG_API_KEY=phc_...
```

```typescript
// src/constants/config.ts

export const config = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL!,
  clerkPublishableKey: process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!,
  cloudinaryCloudName: process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME!,
  posthogApiKey: process.env.EXPO_PUBLIC_POSTHOG_API_KEY!,
} as const
```

### Rules

- All public env vars prefixed `EXPO_PUBLIC_`
- Never hardcode URLs — always `config.apiUrl`
- Provide `.env.example` with every key
- Never commit `.env.local`

---

## Git Standards

### Branch naming

```
feature/branch-detail-screen
feature/review-write-flow
feature/business-claim-form
fix/image-caching-android
chore/upgrade-expo-sdk-56
```

### Commit messages

```
feat: add branch detail screen with menu and reviews
feat: implement save/unsave branch
feat: add business claim form with rhf + zod
fix: correct image aspect ratio on Android
chore: upgrade to Expo SDK 56
```

### Rules

- Never commit directly to `main`
- Run `npx expo-doctor` before opening a PR — catches New Architecture and router/navigation conflicts
- Test on a real Android device or emulator before pushing — not only Expo Go
- One feature or fix per branch

