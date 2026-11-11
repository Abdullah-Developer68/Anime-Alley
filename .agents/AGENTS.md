# Anime Alley — Agent & Developer Guide

This document defines the architectural standards, code conventions, security practices, and project setup for all developers and AI agents working on the **Anime Alley** codebase.

---

## 1. Code Conventions & Coding Standards

### Parameter & Property Extraction
Follow this strict two-part convention across all controllers, services, and middlewares:

1. **Multiple Fields (3+ or complex payloads)**: Use destructuring with an empty object fallback (`|| {}`) to prevent `TypeError: Cannot destructure property ... of undefined` when a request body or query string is omitted:
   ```javascript
   // Multiple fields from body
   const { email, password, username } = req.body || {};

   // Multiple fields from query
   const { page, limit, category } = req.query || {};

   // Multiple fields from params
   const { orderId, itemId } = req.params || {};
   ```

2. **Single Field**: Use optional chaining with the dot operator (`?.`) directly. Avoid creating redundant fallback objects in memory:
   ```javascript
   // Single field from body
   const productID = req.body?.productID;

   // Single field from params
   const dataType = req.params?.dataType;

   // Single field from query
   const stripeSessionID = req.query?.stripeSessionID;

   // Context fields from authenticated user
   const userId = req.user?.id;
   const userEmail = req.user?.email;
   ```

### Strict Variable Typing Standard
- **No Stringified Numbers from Frontend**: The frontend must never send a string for a variable that is contractually a number. Numeric fields (such as `price`, `stock`, `quantity`, `page`, etc.) must always be sent as native numbers (e.g., using `Number(...)`, `parseInt(...)`, or numeric input values), never stringified numbers.
- **Strict Server-Side Type Enforcement**: Backend endpoints and controllers must strictly validate and enforce expected data types. If a variable is required to be numeric (such as `price` or numeric `stock`), any payload where `typeof value === "string"` or non-numeric must be rejected immediately (e.g., returning 400 Bad Request). The backend must never implicitly coerce strings into numbers for fields contractually defined as numeric.

### If / Else Formatting Standard
- **Single-statement blocks**: If an `if` or `else` block contains only 1 statement, do **not** use curly braces (`{ }`). Place on the same line or indented on the next line:
  ```javascript
  // Single statement - no curly braces
  if (!userId) return res.status(400).json({ message: "User ID is required." });

  // If-else single statements - no curly braces
  if (["comics", "clothes", "shoes"].includes(category) && variant)
    updateField = `stock.${variant}`;
  else if (category === "toys")
    updateField = "stock";
  ```
- **Multi-statement blocks**: Only use curly braces (`{ }`) if the block contains 2 or more statements.

### Commenting Standard
- **Always use single-line comments (`//`)**:
   ```javascript
   // Validate essential order information
   // Abort transaction and return early if user information is missing
   ```
- **Never use multi-line comment blocks (`/* ... */`)**: Multi-line comment blocks can interfere with linting, minification, and diff clarity.
- **Comment density limit**: At most 1 line of comment for every 3 lines of code. Comment the *why* (security reasons, non-obvious behavior), not what the code already says.

### REST API Standard
- **Plural nouns, no verbs in paths**: `/api/products`, `/api/orders/:orderId`, not `/product/deleteProduct` or `/order/getOrders`.
- **The HTTP method is the action**:
  - `GET` reads and never changes data.
  - `POST` creates and returns `201`.
  - `PUT` replaces the whole resource.
  - `PATCH` updates some fields.
  - `DELETE` removes.
- **IDs go in the path** (`DELETE /api/coupons/:couponId`), filters and paging go in the query (`?currPage=2`), and the data being written goes in the body.
- **Each router is mounted on its own path** in `server/routes/index.routes.js`. Never mount a router at `/`, because its `router.use(...)` middleware would run for every route.
- **Allowed exceptions** (they have a comment in the route file):
  - auth actions such as `/auth/login`;
  - the Google OAuth redirects;
  - `POST /api/stripe/webhook`, whose URL is registered with Stripe;
  - the cron cleanup routes, which are `GET` because Vercel Cron only sends `GET`.

### Authentication Standard
- **Bearer header only**: the JWT is sent as `Authorization: Bearer <token>`.
- **Short access token + refresh token**: every login goes through `createSession` (`server/utils/authSession.utils.js`).
  - The access token lasts 15 minutes and holds only `userid` and `sid`.
  - The client renews it with `POST /api/auth/refresh`.
- **Never trust token claims for authorization**: `verifyTokenMiddleware` loads the user and the session from the database. Read the role and email from `req.user`.
- **Revoke sessions when credentials change**:
  - after a password change, call `revokeUserSessions(userId, req.user.sessionId)`;
  - when deleting a user, call `revokeUserSessions(userId)`.
- **One key per purpose**:
  - Sign other tokens with `keyFor("<purpose>")` (`server/utils/tokenKeys.utils.js`), never with `JWT_KEY` directly.
  - Always pass `algorithm: "HS256"` / `algorithms: ["HS256"]`.
- **User text in a RegExp must go through `escapeRegex`** (`server/utils/validation.utils.js`).
- **Never send `error.message` to the client**:
  - 500 responses use a fixed message, and the real error goes to `console.error`;
  - for duplicate or invalid data, use `clientError(error)` (`server/utils/errors.utils.js`), which returns a safe 409/400.
- **No account enumeration**: login failures share one message, and `/auth/otp` replies the same for every email. Don't add messages that show whether an account exists.
- **New passwords go through `passwordProblem()`**: 8 characters to 72 bytes. Not at login, so existing passwords keep working.
- **CORS uses only the allow-list in `server/utils/origin.utils.js`**: no "allow all" fallback in any environment. Localhost is trusted only outside production.
- **Rate limits** live in `server/middlewares/custom/rateLimiters.middleware.js`:
  - Every `/api` route already gets `apiLimiter` (300 per minute per IP).
  - A new route that sends email, creates records or Stripe sessions, guesses secrets, or runs heavy queries also needs its own `createLimiter`.
  - Put a per-user limiter (`keyGenerator: byUser`) after `verifyTokenMiddleware`, and put any limiter before multer so a blocked request never uploads its file.
  - Counters live in MongoDB (`MongoRateLimitStore`), because each Vercel instance has its own memory. Never fall back to the default in-memory store.
- **No debug `console.log`** of request bodies, user documents, tokens or passwords, on the server or the client.
- **Client CSP**: `client/vercel.json` sets the Content Security Policy. A new external script, API or frame origin must be added there, or the browser blocks it. Stripe is a redirect to its hosted Checkout page (the server returns `url`), so no Stripe script or frame is allowed.
- **Demo accounts are read-only**: anyone can create one with a click.
  - Every admin write route gets `blockDemoWrites` (`server/middlewares/custom/demo.middleware.js`) after `requireAdmin`.
  - Admin reads that return other people's data mask it for `req.user.isDemo` with `maskEmail` / `maskText` / `HIDDEN_ADDRESS` (`server/utils/privacy.utils.js`). Demo admins can't search users or export anything but products.
- **Admins never change another user's email or password**; only the account owner can (`editProblem` in `user.controller.js`).
- **User data in responses uses an explicit field list** (`SAFE_USER_FIELDS`), never a whole user document.
- **Emails go through `normalizeEmail`** (`validation.utils.js`) before any lookup or write; the schema stores them lower-case.
- **Refresh tokens rotate** on every refresh (`refreshSession` in `authSession.utils.js`); the client stores the new one.
- **Uploads**: routes use `singleImage(field)` (`multerConfig.js`: memory storage, 4 MB, JPG/PNG/WebP), and controllers call `uploadImage` only after the request has been validated. Never trust an image URL from the request body.
- **Stock updates use `$elemMatch`** so the label and the stock check apply to the same variant, and multi-step writes run in `inTransaction` (`server/utils/transaction.utils.js`), which retries on write conflicts. Throw `RequestError` inside it to roll back with a 4xx.
- **Heavy libraries load on first use** (Stripe, Cloudinary, nodemailer, exceljs, pdfkit) to keep cold starts fast. Don't add top-level requires for them.
- **Never read the token from a cookie**: browsers attach cookies to requests that other sites start, which enables CSRF.
- **No `express.urlencoded` parser**: the API accepts JSON, plus multipart for uploads.
- **Never put a JWT in a URL**: Google login sends a short-lived handoff code in the URL fragment, and the client swaps it for the JWT with `POST /api/googleAuth/token`, proving with its `sessionStorage` verifier that it started the login.

### No Prop Drilling Standard
- **No Prop Drilling**: Prop drilling (passing state, configuration, layout flags, or handlers down component trees) is strictly forbidden across the codebase.
- **Redux as Single Source of Truth**: Any shared state, layout modes, or cross-component communication must be read and dispatched via Redux Toolkit slices (`useSelector` / `useDispatch`), never passed down as component props.

### Design System (client)
The UI follows a light, editorial look: an off-white canvas, white surfaces, hairline borders, near-black ink, two-tone headings and pill buttons.

- **Tokens live in `client/src/index.css` (`@theme`)**. Use them through Tailwind classes, never raw hex values or Tailwind's default palette:
  - colors: `canvas`, `surface`, `sunken`, `ink`, `ink-soft`, `muted`, `subtle`, `line`, `line-strong`, and `success` / `danger` / `warning` / `info` / `violet` each with a `-soft` tint;
  - `rounded-panel`, `shadow-panel`, `shadow-float`, `max-w-frame`;
  - font: Geist Variable (self-hosted via `@fontsource-variable/geist`, so the CSP needs no font origin).
- **Primitives live in `client/src/components/ui/`**. Reuse them before writing new markup:
  - `Button` / `ButtonLink` (variants `primary`, `secondary`, `ghost`, `danger`, `danger-ghost`; sizes `sm`, `md`, `lg`, `icon`, `icon-sm`), `Badge`, `Modal`, `Spinner` / `PageSpinner`, `EmptyState`, `Pagination`, `Avatar`, `Logo`, `Frame`, `TwoTone`, `Reveal`;
  - class recipes in `styles.js`: `buttonClass`, `inputClass`, `textareaClass`, `labelClass`, `panelClass`, `eyebrowClass`, `BADGE_TONES`, `ORDER_STATUS_TONES`, and `cx` to join classes. When a class must beat one in a recipe, use Tailwind's important suffix (`w-auto!`).
- **Layout**: pages sit in `Frame` (the bordered content column); sections inside stack with `border-t border-line`. Headings are `font-medium` with negative tracking; long headings use `TwoTone`.
- **Motion**: use the `motion` package through `m.*` components only. `LazyMotion` runs in `strict` mode with `domAnimation` (loaded lazily from `utils/motionFeatures.js`), so `motion.*` components and layout animations are not available. `MotionConfig reducedMotion="user"` is global. Use `Reveal` for scroll-in effects and `AnimatePresence` for anything that leaves the screen.
- **Icons** come from `lucide-react`; don't add image files for icons.
- **Images**: product images from Cloudinary go through `productImage(url, width)` (`utils/images.js`), and below-the-fold `<img>` tags get `loading="lazy"`. Marketing images live in `src/assets/img/products/` as display-sized WebP.
- **Routes** other than `/` are lazy-loaded in `App.jsx`; a new page should be too.
- Shared constants (categories, product types, sort options, cart limits) live in `client/src/utils/catalog.js`.

---

## 2. Project Architecture & Setup

### Architecture Overview
- **Client (`/client`)**: React 19 single-page application built with Vite, Tailwind CSS 4, Motion and Lucide icons. Redux Toolkit holds shared state; React Context holds only the signed-in user (`AuthProvider`). All requests go through the `fetch` wrapper in `client/src/api/api.js`.
- **Server (`/server`)**: Node.js & Express REST API using Mongoose for MongoDB data modeling, Stripe SDK for checkout/payments, and JWT/Nodemailer for authentication & OTP verification.
- **Serverless & Cron (`/api`, `/vercel.json`)**: Vercel Serverless Functions and Vercel Cron Jobs (`/api/cron/cleanup-users`, `/api/cron/cleanup-reservations`) triggering backend cleanup routines via HTTP GET.

### Key Architectural Patterns
1. **Fail-Fast / Early Return In-Memory Validation**:
   - Always validate request parameters, payload bodies, and JWT tokens in memory *before* acquiring database connections with `await dbConnect()`.
   - Never establish database connections or start MongoDB sessions on invalid or malformed requests.
2. **Database Resilience**:
   - Wrap all `await dbConnect()` and database operations inside `try / catch` blocks to prevent unhandled promise rejections and server crashes during database latency or outages.
3. **Transactional Integrity & Stock Restoration**:
   - Multi-step inventory operations (such as order checkout, reservation releases, and user cleanups) must use MongoDB sessions and transactions where applicable, guaranteeing atomic inventory rollbacks on failures.

---

## 3. Git & Workflow Guidelines

### Explicit Push Approval Policy
- **Never Push Without Explicit Permission**: AI agents and developers must NEVER run `git push` or push commits to any branch (including remote PR branches) without explicit, affirmative permission from the user.
- Always commit changes locally first, summarize the work completed, and wait for the user's explicit confirmation before executing any push commands.