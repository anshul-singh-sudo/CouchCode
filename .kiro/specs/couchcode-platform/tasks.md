# Implementation Plan: CouchCode Platform

## Overview

Incremental implementation following the prescribed build order: scaffold → auth → schema → game library → emulator (Mode 1) → virtual gamepad → session system → modes 2/3/4 → monetization → admin panel → PWA → performance. Each task builds on the previous and ends with wired, integrated code. Property-based tests (fast-check) are placed close to the implementation they validate.

---

## Tasks

- [x] 1. Project Scaffold
  - [x] 1.1 Initialize Next.js 14 App Router project with TypeScript
    - Run `create-next-app` with TypeScript, ESLint, Tailwind CSS, App Router, and `src/` directory
    - Configure `next.config.ts`: set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers (required for SharedArrayBuffer)
    - Add Content Security Policy header: `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'`
    - _Requirements: 1.4, 27.9, 27.10_

  - [x] 1.2 Install and configure shadcn/ui
    - Run `shadcn-ui init`, select default theme, configure `components.json`
    - Add base components: Button, Card, Dialog, Input, Label, Select, Table, Tabs, Badge, Skeleton, Toast
    - _Requirements: 30.1_

  - [x] 1.3 Set up Drizzle ORM with Supabase PostgreSQL
    - Install `drizzle-orm`, `drizzle-kit`, `postgres` packages
    - Create `src/db/index.ts` with connection using `DATABASE_URL` env var
    - Create `drizzle.config.ts` pointing to `src/db/schema/` directory
    - Create `.env.local.example` listing all required environment variables from the design doc
    - _Requirements: 3.3_

  - [x] 1.4 Configure Zustand and React Query
    - Install `zustand` and `@tanstack/react-query`
    - Create `src/providers/QueryProvider.tsx` client component wrapping `QueryClientProvider`
    - Create `src/stores/` directory with placeholder files for `emulatorStore.ts`, `sessionStore.ts`, `userStore.ts`
    - Wrap root layout with `QueryProvider`
    - _Requirements: 9.7_

  - [x] 1.5 Set up Vitest and fast-check testing infrastructure
    - Install `vitest`, `@vitest/ui`, `fast-check`, `@testing-library/react`, `@testing-library/user-event`
    - Create `vitest.config.ts` with jsdom environment and path aliases
    - Create `src/__tests__/` directory with a placeholder smoke test
    - _Requirements: (testing infrastructure for all property tests)_


- [x] 2. Authentication System
  - [x] 2.1 Install and configure NextAuth.js
    - Install `next-auth`, `bcryptjs`, `@types/bcryptjs`
    - Create `src/lib/auth.ts` with `authOptions`: CredentialsProvider (email/password) + GoogleProvider
    - Create `src/app/api/auth/[...nextauth]/route.ts`
    - Configure session strategy as `jwt`, cookie options as `httpOnly: true, secure: true, sameSite: 'lax'`, 7-day maxAge
    - _Requirements: 15.1, 15.2, 15.5, 15.6_

  - [x] 2.2 Implement email/password registration endpoint
    - Create `POST /api/auth/register` route handler
    - Validate email format and password strength
    - Hash password with bcrypt (12 salt rounds)
    - Insert user record into `users` table; return 409 on duplicate email
    - _Requirements: 15.1, 15.3, 15.4_

  - [x] 2.3 Implement guest session endpoint
    - Create `POST /api/auth/guest` route handler
    - Sign a JWT with `sub=guest_<uuid>`, `exp=now+86400`, `tier=free` using `NEXTAUTH_SECRET`
    - Set response cookie `guest-token` as httpOnly, Secure
    - _Requirements: 16.1, 16.2, 16.3, 16.4_

  - [x] 2.4 Write property test for guest token expiry
    - **Property 10: Guest Token Expiry**
    - For any token generated at time T, assert `decoded.exp === T + 86400`
    - Use `fc.integer()` to generate arbitrary T values
    - **Validates: Requirements 16.3, 27.4**

  - [x] 2.5 Implement password reset flow
    - Create `POST /api/auth/reset-password` (request reset — generate signed token, send email)
    - Create `PUT /api/auth/reset-password` (confirm reset — validate token, update hash)
    - Reset tokens expire after 1 hour
    - _Requirements: 15.7, 15.8_

  - [x] 2.6 Build auth UI pages
    - Create `src/app/auth/page.tsx` with login and registration tabs using shadcn Tabs
    - Wire forms to NextAuth `signIn()` and the register endpoint
    - Add Google OAuth sign-in button
    - Add guest play CTA button that calls `POST /api/auth/guest`
    - _Requirements: 15.1, 15.2, 16.1_

  - [x] 2.7 Create auth middleware and session utilities
    - Create `src/middleware.ts` protecting `/dashboard`, `/play`, `/admin` routes
    - Create `src/lib/session.ts` with `getServerSession` wrapper and `requireAuth`, `requireAdmin` helpers
    - Create `userStore.ts` Zustand store with `user`, `tier`, `isAdmin` fields
    - _Requirements: 27.5, 27.6_

  - [x] 2.8 Checkpoint — auth system complete
    - Ensure registration, login, Google OAuth, guest token, and password reset all work end-to-end
    - Run `vitest --run` and confirm all auth tests pass


- [x] 3. Database Schema and Migrations
  - [x] 3.1 Define all Drizzle schema tables
    - Create `src/db/schema/users.ts`: `users` and `guests` tables as specified in design
    - Create `src/db/schema/games.ts`: `games` table
    - Create `src/db/schema/sessions.ts`: `game_sessions` and `session_devices` tables
    - Create `src/db/schema/saves.ts`: `save_states` table with unique constraint on `(userId, gameId, slotNumber)`
    - Create `src/db/schema/activity.ts`: `play_history`, `favorites`, `ad_impressions` tables
    - Create `src/db/schema/payments.ts`: `subscriptions` and `game_purchases` tables
    - Export all tables from `src/db/schema/index.ts`
    - _Requirements: 2.8, 3.3, 4.4, 17.2, 20.3, 28.1, 29.1_

  - [x] 3.2 Generate and run initial migration
    - Run `drizzle-kit generate` to produce SQL migration file
    - Run `drizzle-kit migrate` against Supabase PostgreSQL
    - Verify all tables exist with correct columns and constraints
    - _Requirements: 3.3_

  - [x] 3.3 Create database query helpers
    - Create `src/db/queries/games.ts`: `getGames(filters)`, `getGameBySlug(slug)`, `searchGames(query)`, `sortGames(key)`
    - Create `src/db/queries/sessions.ts`: `createSession()`, `getSession(code)`, `addDevice()`, `getDeviceCount(sessionId)`
    - Create `src/db/queries/users.ts`: `getUserById()`, `getUserByEmail()`, `updateUser()`
    - Create `src/db/queries/saves.ts`: `getSaveStates(userId, gameId)`, `countSaveStates(userId, gameId)`
    - Create `src/db/queries/favorites.ts`: `getFavorites(userId)`, `countFavorites(userId)`, `addFavorite()`, `removeFavorite()`
    - _Requirements: 2.1, 13.1, 29.6_

  - [x] 3.4 Checkpoint — schema complete
    - Confirm all tables created, foreign keys enforced, and query helpers return correct types


- [x] 4. Game Library
  - [x] 4.1 Implement Cloudflare R2 storage client
    - Install `@aws-sdk/client-s3` and `@aws-sdk/s3-request-presigner`
    - Create `src/lib/r2.ts` with `S3Client` configured for R2 endpoint
    - Implement `generateSignedGetUrl(path, expiresInSeconds)` — default 3600s
    - Implement `generateSignedPutUrl(path, contentType)` for uploads
    - _Requirements: 14.1, 14.2, 14.3, 27.1_

  - [x] 4.2 Write property test for signed URL expiry
    - **Property 9: Signed URL Expiry**
    - For any valid ROM path, assert generated URL expiry is in range `[now + 3599, now + 3601]`
    - Use `fc.string()` for arbitrary ROM paths
    - **Validates: Requirements 14.2, 27.1**

  - [x] 4.3 Implement game API routes
    - Create `GET /api/games` — paginated list with `system`, `genre`, `search`, `sort`, `page` query params; return only active games to non-admins
    - Create `GET /api/games/[slug]` — single game detail
    - Create `GET /api/games/[slug]/rom-url` — verify auth + tier, return signed R2 URL
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.6, 13.7, 14.2, 14.3_

  - [x] 4.4 Write property test for game search relevance
    - **Property 11: Game Search Relevance**
    - For any non-empty query string and game list, every result title SHALL contain the query (case-insensitive); no non-matching title appears
    - Use `fc.string({ minLength: 1 })` for queries and `fc.array(fc.record({ title: fc.string() }))` for game lists
    - **Validates: Requirements 13.2**

  - [x] 4.5 Write property test for game list sort correctness
    - **Property 12: Game List Sort Correctness**
    - For any game list and sort key (`title`, `releaseYear`, `totalPlays`), adjacent pairs in result satisfy `sortKey(a) <= sortKey(b)`
    - Use `fc.array(fc.record({ title: fc.string(), releaseYear: fc.integer(), totalPlays: fc.nat() }))`
    - **Validates: Requirements 13.8**

  - [x] 4.6 Build game browser page
    - Create `src/app/games/page.tsx` (Server Component) — fetch paginated games server-side
    - Implement search input, system filter chips, genre filter, sort dropdown using shadcn components
    - Render game grid with cover art (`next/image`), title, system badge
    - Implement client-side pagination with React Query `useGames(filters)` hook
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.8, 26.2_

  - [x] 4.7 Build game detail page
    - Create `src/app/games/[slug]/page.tsx` (Server Component) with `generateMetadata`
    - Display cover art, title, system, genre, description, release year, player count
    - Add "Play Now" button (routes to `/play/[slug]`), favorite toggle, purchase button for premium games
    - Show free/premium badge; gate play button by tier
    - _Requirements: 13.5, 20.1, 20.5, 29.5_

  - [x] 4.8 Build admin game upload interface
    - Create `src/app/admin/games/upload/page.tsx` (Client Component, admin-only)
    - Form fields: title, system (select), genre, description, release year, player count, isPremium, price
    - File inputs for ROM file and cover art; upload to R2 via signed PUT URL
    - On submit: call `POST /api/admin/games` to create game record
    - _Requirements: 22.1, 22.2, 22.3, 22.4_

  - [x] 4.9 Implement admin game management API routes
    - Create `POST /api/admin/games` — validate admin role, store ROM + art to R2, insert game record
    - Create `PUT /api/admin/games/[id]` — update metadata
    - Create `PATCH /api/admin/games/[id]/status` — toggle `isActive`
    - _Requirements: 22.1, 22.2, 22.5, 22.6, 22.7_

  - [x] 4.10 Checkpoint — game library complete
    - Confirm game upload, browse, search, filter, sort, and detail pages all work
    - Confirm signed ROM URLs are generated correctly and ROM access is gated


- [x] 5. Emulator Integration — Mode 1 (Single Device Single Player)
  - [x] 5.1 Create EmulatorCanvas client component scaffold
    - Create `src/components/emulator/EmulatorCanvas.tsx` as a `'use client'` component
    - Add `next/dynamic` import with `ssr: false` for EmulatorJS
    - Create a `<canvas>` ref and attach it to the component
    - Implement fullscreen toggle via the Fullscreen API
    - _Requirements: 1.1, 1.8, 1.9_

  - [x] 5.2 Integrate EmulatorJS Web Worker and SharedArrayBuffer
    - Install or vendor EmulatorJS; configure it to use its built-in Web Worker mode
    - Pass `SharedArrayBuffer`-backed frame buffer between worker and main thread
    - Confirm `COOP`/`COEP` headers are active (set in task 1.1) — required for `SharedArrayBuffer`
    - Wire `AudioWorklet` for audio output
    - _Requirements: 1.1, 1.4, 1.7_

  - [x] 5.3 Implement ROM loading flow
    - In `emulatorStore.ts`, implement `loadROM(url, system)`: fetch signed URL from `/api/games/[slug]/rom-url`, pass to EmulatorJS worker via `postMessage`
    - Support chunked streaming for ROMs > 10 MB
    - Show loading progress indicator; initialize within 5 seconds
    - _Requirements: 1.2, 1.3, 14.3, 14.5_

  - [x] 5.4 Implement keyboard input mapping for desktop
    - Create `src/lib/inputMap.ts` with default keyboard-to-buttonId mapping (arrow keys → D-pad, Z/X/A/S → A/B/X/Y, Enter/Shift → Start/Select, Q/W → L/R)
    - In `emulatorStore.ts`, implement `sendInput(event: InputEvent)` that posts to the EmulatorJS worker input poll loop
    - Attach `keydown`/`keyup` listeners in `EmulatorCanvas` component
    - _Requirements: 9.2, 9.4, 9.5_

  - [x] 5.5 Implement save state serialization and upload
    - In `emulatorStore.ts`, implement `saveState(slot)`: call EmulatorJS `saveState()` → get `Uint8Array` blob + canvas thumbnail
    - Call `POST /api/save-states` to get signed PUT URLs, upload blob and thumbnail to R2
    - Implement `loadState(slot)`: fetch signed GET URL, pass blob to EmulatorJS `loadState(blob)`
    - Create `GET /api/save-states/[gameId]`, `POST /api/save-states`, `DELETE /api/save-states/[id]` API routes
    - Enforce 1-slot limit for free tier in the API route
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

  - [x] 5.6 Write property test for save state round-trip
    - **Property 1: Save State Round Trip**
    - For any `Uint8Array` of arbitrary length, `deserialize(serialize(state))` SHALL be byte-for-byte equal to the original
    - Use `fc.uint8Array({ minLength: 1, maxLength: 65536 })` as arbitrary state blobs
    - **Validates: Requirements 1.10, 2.1, 2.3**

  - [x] 5.7 Build play page (Mode 1)
    - Create `src/app/play/[gameSlug]/page.tsx` (Client Component)
    - Compose `EmulatorCanvas`, `SaveStateControls`, `ModeSelector` components
    - Add session code display overlay and settings panel
    - Track play session: call `POST /api/play-history` on game start, `PATCH` on stop with duration
    - Gate page: redirect free-tier guests to auth if game is premium
    - _Requirements: 9.1, 9.3, 9.6, 9.7, 28.1, 28.2_

  - [x] 5.8 Checkpoint — Mode 1 complete
    - Confirm game loads, runs at target FPS, keyboard input works, save/load states work on desktop and mobile
    - Run `vitest --run` and confirm save state round-trip property test passes


- [x] 6. Virtual Gamepad
  - [x] 6.1 Implement input event serialization utilities
    - Create `src/lib/inputEvent.ts` with:
      - `serializeInputEvent(event: InputEvent): Uint8Array` — 7-byte binary format
      - `deserializeInputEvent(bytes: Uint8Array): InputEvent` — parse 7-byte buffer
      - `validateInputEvent(bytes: Uint8Array): boolean` — allowlist check
    - Binary format: byte 0 = playerId (1–4), byte 1 = buttonId (0–11), byte 2 = state (0/1), bytes 3–6 = uint32 LE timestamp
    - _Requirements: 7.1, 7.4, 7.6, 7.7_

  - [x] 6.2 Write property test for input event serialization round-trip
    - **Property 4: Input Event Serialization Round Trip**
    - For any valid `(playerId ∈ {1,2,3,4}, buttonId ∈ {0..11}, state ∈ {0,1}, timestamp ∈ uint32)`, `deserialize(serialize(event))` SHALL equal original
    - Use `fc.record({ playerId: fc.integer({min:1,max:4}), buttonId: fc.integer({min:0,max:11}), state: fc.integer({min:0,max:1}), timestamp: fc.integer({min:0,max:4294967295}) })`
    - **Validates: Requirements 7.1, 7.4**

  - [x] 6.3 Write property test for input event validation allowlist
    - **Property 5: Input Event Validation Allowlist**
    - For any 7-byte sequence, validator accepts iff byte 0 ∈ {1..4}, byte 1 ∈ {0..11}, byte 2 ∈ {0,1}; all others rejected
    - Use `fc.uint8Array({ minLength: 7, maxLength: 7 })` for arbitrary byte sequences
    - **Validates: Requirements 7.6, 7.7, 27.7**

  - [x] 6.4 Build VirtualGamepad component
    - Create `src/components/gamepad/VirtualGamepad.tsx` as `'use client'`
    - Render D-pad (4 directions), A/B/X/Y buttons, L/R shoulder buttons, Start/Select
    - Use `onTouchStart`/`onTouchEnd` (not `onClick`) with `touch-action: none` CSS to prevent scroll interference
    - Support simultaneous 4-touch detection via `TouchList` iteration
    - Each press/release calls `serializeInputEvent()` and passes to `onInput` prop callback
    - Apply visual feedback (scale/opacity change) within 16ms via CSS transitions
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7_

  - [x] 6.5 Write property test for virtual gamepad press registration
    - **Property 8: Virtual Gamepad Press Registration**
    - For any sequence of press/release events, every press produces exactly one `state=1` InputEvent and every release produces exactly one `state=0` InputEvent with no drops
    - Use `fc.array(fc.record({ buttonId: fc.integer({min:0,max:11}), type: fc.constantFrom('press','release') }), { minLength: 1, maxLength: 100 })`
    - **Validates: Requirements 8.3, 8.4, 8.8**

  - [x] 6.6 Build controller full-screen page
    - Create `src/app/controller/page.tsx` (Client Component)
    - Render `VirtualGamepad` full-screen with `position: fixed; inset: 0`
    - Wire `onInput` to `sessionStore.sendInput()` (stub for now; wired fully in task 7)
    - Show player slot badge (P1–P4) and session code
    - Render only on touch-enabled devices; show "use keyboard on desktop" message otherwise
    - _Requirements: 8.6, 11.3, 30.7_

  - [x] 6.7 Checkpoint — virtual gamepad complete
    - Confirm multi-touch works on iOS Safari and Android Chrome
    - Confirm no missed presses under rapid 4-simultaneous-touch sequences
    - Run `vitest --run` and confirm all input event property tests pass


- [x] 7. Session System — Signaling Server, WebRTC, and Relay
  - [x] 7.1 Implement session code generation utility
    - Create `src/lib/sessionCode.ts` with `generateSessionCode(): string` — 5-char `[A-Z0-9]` random string
    - Implement `generateUniqueCodes(n: number): string[]` — generate batch with uniqueness guarantee
    - _Requirements: 3.1, 3.4_

  - [x] 7.2 Write property test for session code format and uniqueness
    - **Property 2: Session Code Format and Uniqueness**
    - For any batch size N (1–1000), every code is exactly 5 chars, matches `[A-Z0-9]{5}`, and no two codes in the batch are identical
    - Use `fc.integer({ min: 1, max: 1000 })` for batch size N
    - **Validates: Requirements 3.1, 3.4**

  - [x] 7.3 Implement session REST API routes
    - Create `POST /api/sessions` — validate rate limit (Upstash Redis, 5/hr/IP), generate code, insert `game_sessions` record, return code
    - Create `GET /api/sessions/[code]` — return session info and device list
    - Create `DELETE /api/sessions/[code]` — host/admin only, mark session ended
    - Create `POST /api/sessions/[code]/join` — validate session active, check device count ≤ 4, insert `session_devices` record
    - _Requirements: 3.1, 3.2, 3.3, 3.5, 3.6, 3.7, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 7.4 Write property test for session device count invariant
    - **Property 3: Session Device Count Invariant**
    - For any sequence of join attempts, connected device count never exceeds 5; 5th+ join is rejected with error
    - Use `fc.array(fc.constant('join'), { minLength: 1, maxLength: 20 })` to simulate join sequences
    - **Validates: Requirements 4.6, 4.7**

  - [x] 7.5 Implement Upstash Redis rate limiter
    - Install `@upstash/redis` and `@upstash/ratelimit`
    - Create `src/lib/rateLimit.ts` with `sessionRateLimit` — sliding window, 5 requests per 3600s per IP
    - Apply in `POST /api/sessions` handler; return 429 with `retry-after` header on limit exceeded
    - _Requirements: 3.7, 27.2, 27.3_

  - [x] 7.6 Write property test for rate limit invariant
    - **Property 7: Rate Limit Invariant**
    - For any IP, after exactly 5 requests within 1-hour window, every subsequent request returns 429 with `retry-after` header
    - Use `fc.string()` for arbitrary IP addresses; simulate 6+ requests against the rate limiter logic
    - **Validates: Requirements 3.7, 27.2, 27.3**

  - [x] 7.7 Build WebSocket signaling server (Hono + ws on Fly.io)
    - Create `ws-server/` directory with `package.json`, `src/index.ts`
    - Install `hono`, `ws`, `@types/ws`, `jose` (JWT verification)
    - Implement connection handler: authenticate via `{ type: "auth", token }` message
    - Implement `create_session` handler: generate code, store in-memory session map, respond with `session_created`
    - Implement `join_session` handler: validate code, check device count ≤ 4, broadcast `device_joined`
    - Implement WebRTC signaling relay: forward `offer`, `answer`, `ice_candidate` messages to target device by token
    - Implement binary relay fallback: forward raw `ArrayBuffer` frames to display device
    - Implement `device_disconnected` broadcast on WebSocket close
    - Create `ws-server/fly.toml` deployment config
    - _Requirements: 5.7, 6.1, 6.2, 6.3, 6.5, 6.6, 6.7_

  - [x] 7.8 Implement WebRTC P2P connection on the client
    - Create `src/lib/webrtc.ts` with `createPeerConnection()` using Google STUN server
    - Configure DataChannel: `{ ordered: false, maxRetransmits: 0 }` for UDP-like low latency
    - Implement ICE candidate same-network detection (compare subnet prefix of candidates)
    - Implement 10-second connection timeout with automatic relay fallback
    - _Requirements: 5.1, 5.2, 5.3, 5.7_

  - [x] 7.9 Implement sessionStore with full WebRTC + relay logic
    - Implement `createSession(gameId)`: call `POST /api/sessions`, connect to WS server, return code
    - Implement `joinSession(code)`: call `POST /api/sessions/[code]/join`, connect to WS server, negotiate WebRTC
    - Implement `sendInput(event)`: serialize to 7 bytes, send via DataChannel if WebRTC active, else via WS relay
    - Track `connectionType` (`webrtc` | `relay`) and `latency`
    - Implement exponential backoff reconnect for WS (1s, 2s, 4s, max 30s)
    - _Requirements: 5.3, 5.4, 5.6, 6.1, 6.3, 6.4, 6.5_

  - [x] 7.10 Build session join page
    - Create `src/app/join/[sessionCode]/page.tsx` (Client Component)
    - Show game being played (fetch from session info), role selector (Display / Controller)
    - On role select: call `joinSession()`, route to `/play/[slug]` (display) or `/controller` (controller)
    - _Requirements: 4.1, 4.5, 11.6_

  - [x] 7.11 Checkpoint — session system complete
    - Confirm session creation, joining, WebRTC P2P, relay fallback, and disconnect handling all work
    - Confirm rate limiting returns 429 after 5 requests
    - Run `vitest --run` and confirm all session property tests pass


- [x] 8. Modes 2, 3, and 4
  - [x] 8.1 Implement Mode 2 — Single Device Two Player
    - Add `mode2` keyboard mapping in `src/lib/inputMap.ts`: Player 1 (WASD + keys), Player 2 (arrow keys + numpad)
    - Update `EmulatorCanvas` to accept `mode` prop; when `mode === 2`, render horizontal split-screen layout
    - Update `emulatorStore.sendInput()` to include `playerId` (1 or 2) based on which key set triggered the event
    - Gate Mode 2 behind Pro tier check in play page
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

  - [x] 8.2 Implement Mode 3 — Display + Controller Device
    - Update `ModeSelector` component to include Mode 3 option (Pro only)
    - When Mode 3 selected: display session code overlay on play page, prompt second device to join at `/join/[code]`
    - On controller device: render `VirtualGamepad` full-screen; wire `onInput` to `sessionStore.sendInput()`
    - On display device: receive input events from WebRTC/relay, apply to emulator worker
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 8.3 Implement Mode 4 — Display + Multiple Controllers (up to 4)
    - Update `POST /api/sessions/[code]/join` to assign `playerSlot` (1–4) to each controller device
    - Update WS server to track player slot assignments and include slot in `device_joined` message
    - Update display device input handler to route each received `InputEvent` to the correct emulator player slot based on `playerId` byte
    - Update `SessionOverlay` to show all connected controller devices with their player slot badges
    - Gate Mode 4 behind Pro tier check
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7_

  - [x] 8.4 Checkpoint — all modes complete
    - Confirm Mode 2 split-screen and dual input work
    - Confirm Mode 3 wireless controller input reaches emulator
    - Confirm Mode 4 correctly routes P1–P4 inputs to respective emulator slots


- [x] 9. Monetization — Stripe, Subscription Gating, Ads
  - [x] 9.1 Implement feature gating middleware
    - Create `src/lib/featureGate.ts` with `getFeatureAccess(user)` returning `{ showAds, saveStateLimit, allowedModes, fullLibrary }`
    - Free tier: `showAds=true`, `saveStateLimit=1`, `allowedModes=[1]`, `fullLibrary=false`
    - Pro tier (active subscription): `showAds=false`, `saveStateLimit=Infinity`, `allowedModes=[1,2,3,4]`, `fullLibrary=true`
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8_

  - [x] 9.2 Write property test for tier-based feature access gating
    - **Property 6: Tier-Based Feature Access Gating**
    - For any user object, `getFeatureAccess()` returns exactly free-tier set when subscription not active, and exactly pro-tier set when active
    - Use `fc.record({ subscriptionTier: fc.constantFrom('free','pro'), subscription: fc.option(fc.record({ status: fc.constantFrom('active','past_due','canceled','trialing') })) })`
    - **Validates: Requirements 17.4, 18.1, 18.2, 18.3, 18.4, 18.5, 18.6, 18.7, 18.8**

  - [x] 9.3 Implement Stripe subscription checkout
    - Install `stripe` package
    - Create `POST /api/subscriptions/checkout` — create Stripe Checkout Session with `STRIPE_PRO_PRICE_ID`, redirect URLs; return checkout URL
    - Create `POST /api/subscriptions/portal` — create Stripe Customer Portal session for subscription management
    - _Requirements: 17.1, 17.8_

  - [x] 9.4 Implement Stripe webhook handler
    - Create `POST /api/webhooks/stripe` — verify signature with `STRIPE_WEBHOOK_SECRET`
    - Handle `checkout.session.completed`: insert `subscriptions` record, set `users.subscriptionTier = 'pro'`
    - Handle `invoice.payment_failed`: set `subscriptions.status = 'past_due'`, notify user
    - Handle `customer.subscription.deleted`: set `subscriptions.status = 'canceled'`, revert tier to `'free'`
    - _Requirements: 17.2, 17.3, 17.5, 17.6, 17.7_

  - [x] 9.5 Implement game purchase (one-time Payment Intent)
    - Create `POST /api/purchases/[gameId]` — create Stripe Payment Intent for game price, return `client_secret`
    - On payment confirmation (webhook `payment_intent.succeeded`): insert `game_purchases` record, grant access
    - Update game access check to allow purchase owners regardless of subscription
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.6, 20.7_

  - [x] 9.6 Implement ad slot system
    - Create `src/components/ads/AdSlot.tsx` — renders Google AdSense unit or placeholder; only mounts when `showAds === true`
    - Place ad slots on dashboard page (between sections) and on game load transition screen
    - Create `POST /api/ad-impressions` route to record `ad_impressions` row on each display event
    - Enforce 1 ad per 5 minutes of gameplay via client-side timer
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5, 19.6, 19.7_

  - [x] 9.7 Build subscription UI on dashboard
    - Add subscription status card to `src/app/dashboard/page.tsx`
    - Show current tier, renewal date, "Upgrade to Pro" CTA (links to checkout) for free users
    - Show "Manage Subscription" button (links to portal) for pro users
    - Use `useSubscription()` React Query hook
    - _Requirements: 17.1, 17.8_

  - [x] 9.8 Checkpoint — monetization complete
    - Confirm Stripe checkout flow, webhook handling, tier upgrade, and ad suppression all work end-to-end
    - Run `vitest --run` and confirm feature gating property test passes


- [x] 10. Admin Panel
  - [x] 10.1 Implement admin route protection middleware
    - Update `src/middleware.ts` to check `isAdmin` on all `/admin/*` and `/api/admin/*` routes
    - Return 403 for non-admin users; redirect to `/auth` for unauthenticated users
    - _Requirements: 21.1, 27.6_

  - [x] 10.2 Build admin user management
    - Create `GET /api/admin/users` — paginated, filterable by registration date, subscription status, role
    - Create `PATCH /api/admin/users/[id]` — update `isBanned`, `role` fields; on ban, invalidate all sessions
    - Create `src/app/admin/users/page.tsx` with searchable/filterable user table (shadcn Table)
    - Add user detail drawer: profile, play history, subscription status, ban/unban/role-change actions
    - _Requirements: 21.2, 21.3, 21.4, 21.5, 21.6, 21.7, 21.8_

  - [x] 10.3 Build admin game management page
    - Create `src/app/admin/games/page.tsx` — table of all games with edit, toggle active, view stats actions
    - Wire to existing `PUT /api/admin/games/[id]` and `PATCH /api/admin/games/[id]/status` routes
    - Display per-game stats: total plays, avg session duration, active user count
    - _Requirements: 22.5, 22.6, 22.7, 22.8_

  - [x] 10.4 Implement analytics API and dashboard
    - Create `GET /api/admin/analytics` — aggregate queries for DAU, MAU, active sessions, MRR, total revenue, new subs, churn, top 10 games, device breakdown, mode breakdown, ad impressions
    - Create `src/app/admin/analytics/page.tsx` using Recharts: line charts for DAU/MAU/revenue, bar chart for top games, pie charts for device/mode breakdown
    - _Requirements: 23.1, 23.2, 23.3, 23.4, 23.5, 23.6, 23.7, 23.8, 23.9, 23.10, 23.11, 23.12_

  - [x] 10.5 Build session monitor
    - Create `GET /api/admin/sessions` — list active sessions with code, host, game, mode, device count, duration, latency
    - Create `DELETE /api/admin/sessions/[code]` — terminate session, disconnect all devices via WS server, mark ended
    - Create `src/app/admin/sessions/page.tsx` — auto-refreshes every 10 seconds using React Query `refetchInterval`
    - _Requirements: 24.1, 24.2, 24.3, 24.4, 24.5, 24.6_

  - [x] 10.6 Build admin layout and navigation
    - Create `src/app/admin/layout.tsx` with sidebar navigation: Users, Games, Analytics, Sessions
    - Apply admin role guard in layout (server-side redirect)
    - _Requirements: 21.1_

  - [x] 10.7 Checkpoint — admin panel complete
    - Confirm all admin sections load, data is accurate, and ban/terminate actions work


- [x] 11. Progressive Web App (PWA)
  - [x] 11.1 Create web app manifest
    - Create `public/manifest.json` with name, short_name, description, start_url, display: standalone, background_color: #0f0f0f, theme_color: #7c3aed
    - Add icon entries for 192x192, 512x512, and 512x512 maskable
    - Add `<link rel="manifest">` to root layout
    - _Requirements: 25.1_

  - [x] 11.2 Implement service worker with asset caching
    - Install `next-pwa` or implement custom service worker in `public/sw.js`
    - Cache-first strategy for shell assets (HTML, CSS, JS, fonts, icons, cover art)
    - Network-first with stale-while-revalidate for API responses
    - Explicitly exclude ROM files from caching (signed URLs are ephemeral)
    - Register service worker in root layout client component
    - _Requirements: 25.2, 25.3, 25.7_

  - [x] 11.3 Implement install prompt
    - Create `src/components/pwa/InstallPrompt.tsx` — listen for `beforeinstallprompt` event, show custom install banner
    - Show prompt after 30 seconds of use or on second visit
    - _Requirements: 25.4, 25.5_

  - [x] 11.4 Verify standalone mode behavior
    - Add `display-mode: standalone` CSS media query to hide browser chrome UI elements when launched from home screen
    - Confirm viewport meta tag is set: `width=device-width, initial-scale=1, viewport-fit=cover`
    - _Requirements: 25.6, 30.5_

  - [x] 11.5 Checkpoint — PWA complete
    - Confirm manifest is valid, service worker registers, install prompt appears on mobile, and app launches in standalone mode


- [x] 12. Performance Audit and Optimization
  - [x] 12.1 Implement image and asset optimizations
    - Replace all `<img>` tags with `next/image` for automatic format conversion and lazy loading
    - Add `loading="lazy"` and `sizes` attributes to below-fold images
    - Implement route-based code splitting (already default in App Router; verify no large shared chunks)
    - Add `<link rel="prefetch">` for game detail page resources on game library hover
    - _Requirements: 26.5, 26.6, 26.7, 26.8_

  - [x] 12.2 Optimize landing page for Core Web Vitals
    - Audit LCP element on `/` and `/games`; ensure it is server-rendered and not blocked by JS
    - Inline critical CSS for above-the-fold content
    - Defer non-critical third-party scripts (AdSense, analytics)
    - Target: LCP < 2.5s, FID < 100ms, CLS < 0.1
    - _Requirements: 26.1, 26.2, 26.3, 26.4_

  - [x] 12.3 Implement responsive design audit
    - Verify all pages render correctly at 320px, 640px, 768px, 1024px, 1280px, and 3840px widths
    - Confirm hamburger menu appears on mobile breakpoints
    - Confirm all touch targets are minimum 44×44px
    - Confirm `VirtualGamepad` only renders on touch-enabled devices (`'ontouchstart' in window`)
    - _Requirements: 30.1, 30.2, 30.3, 30.4, 30.7_

  - [x] 12.4 Implement favorites count enforcement
    - Update `POST /api/user/favorites/[gameId]` to check `countFavorites(userId) >= 50` before insert; return 409 if limit reached
    - _Requirements: 29.6_

  - [x] 12.5 Write property test for favorites count invariant
    - **Property 13: Favorites Count Invariant**
    - For any user with N favorites (0–50), adding one more succeeds; when N = 50, adding returns error and list is unchanged
    - Use `fc.integer({ min: 0, max: 51 })` for current favorites count
    - **Validates: Requirements 29.6**

  - [x] 12.6 Build user dashboard
    - Create `src/app/dashboard/page.tsx` with sections: Recent Games, Save States, Favorites, Play History
    - Implement `usePlayHistory()`, `useFavorites()`, `useSaveStates()` React Query hooks
    - Display play history sorted by most recent, showing game title, duration, date
    - Display most played games calculated from play history
    - _Requirements: 28.3, 28.4, 28.5, 28.6, 28.7, 29.2, 29.3_

  - [x] 12.7 Build landing page
    - Create `src/app/page.tsx` (Server Component) — hero section, feature explainer, demo CTA, game browser preview (top 6 games)
    - Ensure LCP element (hero image or heading) is server-rendered
    - _Requirements: 26.1_

  - [x] 12.8 Final checkpoint — all tests pass
    - Run `vitest --run` and confirm all 13 property tests and all unit tests pass
    - Verify no TypeScript errors with `tsc --noEmit`
    - Confirm all API routes return correct status codes for happy and error paths


---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP build
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at each major phase boundary
- Property tests validate universal correctness properties using fast-check (minimum 100 iterations each)
- Unit tests validate specific examples and edge cases
- The WebSocket signaling server (`ws-server/`) is a separate deployable to Fly.io — it must be deployed before testing Modes 3 and 4
- All 13 correctness properties from the design document are covered by property test sub-tasks:
  - Property 1 → Task 5.6
  - Property 2 → Task 7.2
  - Property 3 → Task 7.4
  - Property 4 → Task 6.2
  - Property 5 → Task 6.3
  - Property 6 → Task 9.2
  - Property 7 → Task 7.6
  - Property 8 → Task 6.5
  - Property 9 → Task 4.2
  - Property 10 → Task 2.4
  - Property 11 → Task 4.4
  - Property 12 → Task 4.5
  - Property 13 → Task 12.5
- Tag all property test files with: `// Feature: couchcode-platform, Property N: <property text>`
