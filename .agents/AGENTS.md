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

---

## 2. Project Architecture & Setup

### Architecture Overview
- **Client (`/client`)**: React 18 single-page application built with Vite, Tailwind CSS, Lucide icons, and Axios. Uses React Context for Cart, Auth, and Theme state.
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