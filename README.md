# CouchCode

CouchCode is a browser-first cloud couch gaming platform. Users can play retro-era games (PSP, PS2, SNES, GBA class) directly in a browser tab using WebAssembly-based emulation — no downloads, no installs.

A unique feature is the multi-device session system: users generate a session code, multiple devices join that session, and each device can act as either a DISPLAY (shows the game) or a CONTROLLER (sends inputs to the game), replicating a console and controller experience over Wi-Fi.

## Key Features
- **Browser-based Emulation**: Games run entirely inside the browser tab using WebAssembly (via EmulatorJS).
- **Multi-Device Sessions**: Connect phones as wireless controllers while displaying the game on a larger screen.
- **WebRTC/WebSocket Networking**: Ultra-low latency controller input syncing.
- **Save States**: Cloud-synced save states for games.
- **Monetization**: Free tier with ads, Pro subscription (via Stripe) for ad-free experience, cloud saves, and premium features.

## Tech Stack
- **Frontend**: Next.js 14+ (App Router), React 18, Tailwind CSS, shadcn/ui, Zustand, React Query
- **Backend**: Next.js API Routes / Server Actions
- **Database**: PostgreSQL (Supabase/PlanetScale) with Drizzle ORM
- **Authentication**: NextAuth.js (Email/Password, Google OAuth, Guest Sessions)
- **Storage**: Cloudflare R2 (or AWS S3) for ROM files, cover arts, and save states
- **Realtime / Signaling**: Custom WebSocket server (Node.js + `ws` library) in `ws-server/`
- **Rate Limiting**: Upstash Redis
- **Payments**: Stripe

## Prerequisites

Before running the project locally, ensure you have the following installed and configured:
- Node.js (v18 or higher)
- A PostgreSQL Database (e.g., Supabase, Neon)
- Upstash Redis Account (for rate limiting)
- Cloudflare R2 or AWS S3 Bucket
- Stripe Account (for subscriptions/payments)
- Google Cloud Console Project (for Google OAuth)

---

## Setup Instructions

### 1. Main Next.js Application

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```
   Fill in the required keys in `.env.local`:
   - `DATABASE_URL`: PostgreSQL connection string.
   - `NEXTAUTH_SECRET`: A secure random string for NextAuth.
   - `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`: For Google OAuth.
   - `R2_*` variables: For Cloudflare R2 or S3 compatible storage.
   - `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`: Upstash credentials.
   - `STRIPE_*` variables: Stripe API keys and webhooks.

3. **Database Setup**
   Generate and apply the Drizzle schema migrations to your database:
   ```bash
   npm run db:generate
   npm run db:migrate
   ```
   *(Optional)* To view your database using Drizzle Studio:
   ```bash
   npm run db:studio
   ```

4. **Start the Development Server**
   ```bash
   npm run dev
   ```
   The app will be available at `http://localhost:3000`.

### 2. WebSocket Server (`ws-server`)

The project uses a separate lightweight WebSocket server for WebRTC signaling and input relaying.

1. **Navigate to the server directory**
   ```bash
   cd ws-server
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start the WebSocket Server**
   ```bash
   npm run dev
   ```
   The WebSocket server will start and listen for incoming connections. Ensure your main app's `.env.local` has the correct `NEXT_PUBLIC_WS_URL` pointing to this server (e.g., `ws://localhost:8080` if running locally).

---

## Available Scripts (Main App)

- `npm run dev`: Starts the Next.js development server.
- `npm run build`: Builds the app for production.
- `npm run start`: Starts the production server.
- `npm run lint`: Runs ESLint.
- `npm run test`: Runs Vitest test suites.
- `npm run test:ui`: Runs Vitest with a UI dashboard.
- `npm run db:generate`: Generates SQL migrations from Drizzle schemas.
- `npm run db:migrate`: Applies migrations to the database.
- `npm run db:studio`: Opens Drizzle Studio to browse database tables.
