## This file is just for containing the knowledge i gained from this project. -> Status ( Work in progress )

1. Vercel Conifg

```js
{
    "version": 2,
    "builds": [
      {
        "src": "app.js",
        // This is the Vercel's Node.js builder that automatically creates serverless functions.
        "use": "@vercel/node"
      }
    ],
    "routes": [
      {
        "src": "/(.*)",
        "dest": "/app.js"
      }
    ],
     "crons": [
      {
        "path": "/api/cleanup/users",
        "schedule": "0 2 * * *"
      },
      {
        "path": "/api/cleanup/reservations",
        "schedule": "0 3 * * *"
      }
    ]
  }
```

2. Vercel Functions:

   - Vercel deploys the controllers as edge functions and they are serverless as well.
   - Edge Funtions are serverless functions that are distributed across multiple mini-servers across the world.
   - Such a Network is called an Edge Network.

3. How this express.js app is deployed and run on Vercel :

   - This backend has been deployed as a single serverless function as when the request arrives, Vercel imports the whole backend from app.js and creates a handler function for execution and in that handler function. Hence, the whole backend runs as a serverless function.

   Pros :

   - Instances/Containers are created per Backend not per ( controller function / api ).
   - After one function is called and shifts from the cold start state to warm state. This shifts the state of the whole app to warm.

   Cons :

   - The Cold start is shared, but is longer as no individual api is being setup but the whole app.
   - Cost can be reduced for small to medium apps, but not for larger traffic apps. ( Read docs )

4. How Next.js backends are deployed on Vercel :

   - In Next.js to write the APIs there is a specific structure one has to follow and that is to declare them in the api folder and only one funtion can be created per route. On Vercel, these API end points are deployed as individual components with their own context and runtime.

  Prop : 

   - Each API is a serverless function, so the initial cold start for a request is faster as only that specific API loads.
   - It can be cheper for bigger projects (View docs)
  
  Cons :

   - After one API shifts from the cold start state to warm state the rest of the app does not as the context is not shared. The rest of the functions will experience individually.
  
  # Important Note :
     - Even Express.js can be deployed like Next.js as individual serverless functions instead of wrapping the whole app as a single serverless function by changing the structure.
     - Like creating the controllers in the API folder ( view docs )
     
1. Why dbConnect in every controller? :
     - In a VPS based deployment when we call dbConnect while having await in it in the app.js file it the app.listen does not start until the database connection has been made even if await is used which guarantee that the controllers will have access to the database when the request arrives, but in case of a serverless environment Vercel imports our whole app using this code
     ```js 
     module.exports = app; // <-- Add this line for Vercel
     ``` 
     and creates a handler function. The handler function does not wait for the database connection to be made it starts building and executes if the database connection is made before the handler function gets created then the controllers will have access to the database when the request arrives, but if the handler function gets created and then the database connection is made the controllers won't have access to it. If the database is near the server then the database connection can be made faster then in the case if the database is far away from the server, but to make sure that every controller has access to the database we call dbConnect in every controller.

// CONTINUE THE TOUGHT THE CONTENT BELOW IS A SEPERATE THING

---

# Serverless Cleanup Service - Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [What Changed](#what-changed)
3. [Architecture](#architecture)
4. [Files Modified and Created](#files-modified-and-created)
5. [API Endpoints](#api-endpoints)
6. [Cron Configuration](#cron-configuration)
7. [Testing](#testing)
8. [Security Considerations](#security-considerations)
9. [Deployment Steps](#deployment-steps)
10. [Post-Deployment Cleanup](#post-deployment-cleanup)
11. [Monitoring and Logging](#monitoring-and-logging)
12. [Troubleshooting](#troubleshooting)
13. [Architecture Diagrams](#architecture-diagrams)

---

## Overview

This document describes the refactoring of cleanup utilities from node-cron (which requires a persistent server) to Vercel Cron Jobs (serverless-compatible).

### Key Changes

- Removed node-cron dependency
- Created HTTP endpoints for cleanup operations
- Configured Vercel Cron Jobs to trigger cleanup via HTTP requests
- Added proper error handling and logging
- Implemented health check endpoint

---

## What Changed

### Before (Node-Cron - Not Serverless Compatible)

**Problem:**

- Used node-cron for scheduling
- Required persistent server process running 24/7
- Didn't work with Vercel's serverless functions
- No HTTP endpoints for manual testing
- Poor error visibility

**Code Example:**

```javascript
const cron = require("node-cron");

cron.schedule("0 2 * * *", async () => {
  // cleanup logic
});

// In app.js
require("./utils/cleanUpUsers.js"); // Loaded on app start
```

### After (Vercel Cron Jobs - Serverless Compatible)

**Benefits:**

- Works with serverless architecture
- Each cron job is an independent function invocation
- HTTP endpoints for manual testing and monitoring
- Better logging and error handling
- Cost-effective (pay per invocation)

**Code Example:**

```javascript
// Controller with HTTP endpoint
const cleanupUnverifiedUsers = async (req, res) => {
  // cleanup logic
  res.json({ success: true, deletedCount: 5 });
};

// In vercel.json
{
  "crons": [
    {
      "path": "/api/cleanup/users",
      "schedule": "0 2 * * *"
    }
  ]
}
```

---

## Architecture

### High-Level Flow

```
Vercel Cron Scheduler
    |
    | (HTTP POST Request)
    v
Serverless Function (/api/cleanup/users or /api/cleanup/reservations)
    |
    v
Controller (cleanup.controller.js)
    |
    v
Utils Layer (cleanUpUsers.js or cleanUpReservation.js)
    |
    v
MongoDB Database
```

### Request Flow - User Cleanup

1. Vercel Cron triggers at 2:00 AM UTC
2. POST request sent to /api/cleanup/users
3. Controller connects to database
4. Utils function calculates date (7 days ago)
5. MongoDB query: Delete users with role "verifying" older than 7 days
6. Return JSON response with deleted count
7. Function terminates

### Request Flow - Reservation Cleanup

1. Vercel Cron triggers at 3:00 AM UTC
2. POST request sent to /api/cleanup/reservations
3. Controller connects to database
4. Utils function starts MongoDB transaction
5. Find reservations older than 2 days
6. For each expired reservation:
   - For each product: Restore stock (variant or total)
   - Delete reservation document
7. Commit transaction (or rollback on error)
8. Return JSON response
9. Function terminates

---

## Files Modified and Created

### New Files Created

1. **server/controllers/cleanup.controller.js**

   - Purpose: HTTP controllers for cleanup operations
   - Functions:
     - `cleanupUnverifiedUsers()` - Controller for user cleanup
     - `cleanupReservations()` - Controller for reservation cleanup
     - `healthCheck()` - Health check endpoint

2. **server/routes/modules/cleanup.route.js**
   - Purpose: Define cleanup API routes
   - Routes:
     - POST /api/cleanup/users - Cleanup unverified users
     - POST /api/cleanup/reservations - Cleanup expired reservations
     - GET /api/cleanup/health - Health check

### Modified Files

1. **server/utils/cleanUpUsers.js**

   - Removed: node-cron import and scheduling
   - Added: Exportable function that returns result
   - Added: Better error handling and logging

2. **server/utils/cleanUpReservation.js**

   - Removed: node-cron import and scheduling
   - Note: Function already exportable, minimal changes

3. **server/app.js**

   - Removed: require("./utils/cleanUpUsers.js")
   - Removed: require("./utils/cleanUpReservation.js")
   - Added: Comment explaining new architecture

4. **server/routes/index.routes.js**

   - Added: Import of cleanup routes
   - Added: router.use("/cleanup", cleanupRoutes)

5. **server/vercel.json**
   - Removed: Old example cron job
   - Added: User cleanup cron (2:00 AM daily)
   - Added: Reservation cleanup cron (3:00 AM daily)

---

## API Endpoints

### 1. Cleanup Unverified Users

**Endpoint:** POST /api/cleanup/users

**Purpose:** Deletes users with role "verifying" that were created more than 7 days ago

**Success Response (200):**

```json
{
  "success": true,
  "message": "Successfully deleted 5 unverified users",
  "deletedCount": 5,
  "timestamp": "2025-10-14T02:00:00.000Z"
}
```

**Error Response (500):**

```json
{
  "success": false,
  "message": "Failed to cleanup unverified users",
  "error": "Database connection failed"
}
```

### 2. Cleanup Expired Reservations

**Endpoint:** POST /api/cleanup/reservations

**Purpose:** Restores product stock from reservations older than 2 days and deletes the reservations

**Success Response (200):**

```json
{
  "success": true,
  "message": "Successfully cleaned up expired reservations",
  "timestamp": "2025-10-14T03:00:00.000Z"
}
```

**Error Response (500):**

```json
{
  "success": false,
  "message": "Failed to cleanup expired reservations",
  "error": "Transaction failed"
}
```

### 3. Health Check

**Endpoint:** GET /api/cleanup/health

**Purpose:** Verifies that the cleanup service is responsive and database is connected

**Success Response (200):**

```json
{
  "success": true,
  "message": "Cleanup service is healthy",
  "timestamp": "2025-10-14T12:00:00.000Z",
  "services": {
    "database": "connected",
    "users": "ready",
    "reservations": "ready"
  }
}
```

**Error Response (503):**

```json
{
  "success": false,
  "message": "Cleanup service is unhealthy",
  "error": "Database connection timeout"
}
```

---

## Cron Configuration

### Vercel Cron Jobs Setup

Located in `server/vercel.json`:

```json
{
  "version": 2,
  "builds": [
    {
      "src": "app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/app.js"
    }
  ],
  "crons": [
    {
      "path": "/api/cleanup/users",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cleanup/reservations",
      "schedule": "0 3 * * *"
    }
  ]
}
```

### Schedule Explanation

**User Cleanup:** `0 2 * * *`

- Runs daily at 2:00 AM UTC
- Deletes users with role "verifying" older than 7 days

**Reservation Cleanup:** `0 3 * * *`

- Runs daily at 3:00 AM UTC (1 hour after user cleanup)
- Restores stock from reservations older than 2 days
- Deletes expired reservations

### Cron Syntax Reference

```
* * * * *
| | | | |
| | | | +---- Day of week (0-7, Sunday = 0 or 7)
| | | +------ Month (1-12)
| | +-------- Day of month (1-31)
| +---------- Hour (0-23)
+------------ Minute (0-59)
```

**Examples:**

- `0 2 * * *` - Every day at 2:00 AM
- `0 */6 * * *` - Every 6 hours
- `0 0 * * 0` - Every Sunday at midnight
- `*/15 * * * *` - Every 15 minutes

---

## Testing

### Local Development Testing

Start your development server:

```bash
cd server
npm run dev
```

Test the endpoints manually:

```bash
# Test user cleanup
curl -X POST http://localhost:3000/api/cleanup/users

# Test reservation cleanup
curl -X POST http://localhost:3000/api/cleanup/reservations

# Test health check
curl http://localhost:3000/api/cleanup/health
```

### Production Testing (After Deployment)

Test on Vercel:

```bash
# Replace with your actual domain
curl -X POST https://your-app.vercel.app/api/cleanup/users
curl -X POST https://your-app.vercel.app/api/cleanup/reservations
curl https://your-app.vercel.app/api/cleanup/health
```

### Testing with Vercel CLI

Install Vercel CLI:

```bash
npm install -g vercel
```

Login and link project:

```bash
vercel login
vercel link
```

Run locally with Vercel environment:

```bash
vercel dev
```

---

## Security Considerations

**WARNING:** Currently, the cleanup endpoints are publicly accessible. For production, you should add authentication.

### Recommended: Add Cron Secret Authentication

#### Step 1: Create Middleware

Update `server/routes/modules/cleanup.route.js`:

```javascript
// Add this middleware before routes
const verifyCronSecret = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const cronSecret = process.env.CRON_SECRET;

  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized: Invalid cron secret",
    });
  }

  next();
};

// Apply to all cleanup routes
router.use(verifyCronSecret);
```

#### Step 2: Add Environment Variable

In Vercel Dashboard:

1. Go to Project Settings
2. Navigate to Environment Variables
3. Add variable:
   - Name: `CRON_SECRET`
   - Value: Generate a random string (e.g., using `openssl rand -hex 32`)
   - Environments: Production, Preview, Development

#### Step 3: Update vercel.json

```json
{
  "crons": [
    {
      "path": "/api/cleanup/users",
      "schedule": "0 2 * * *",
      "headers": {
        "Authorization": "Bearer ${CRON_SECRET}"
      }
    },
    {
      "path": "/api/cleanup/reservations",
      "schedule": "0 3 * * *",
      "headers": {
        "Authorization": "Bearer ${CRON_SECRET}"
      }
    }
  ]
}
```

---

## Deployment Steps

### Step 1: Commit Changes

```bash
git add .
git commit -m "Refactor cleanup utilities for Vercel serverless architecture"
git push origin main
```

### Step 2: Verify Automatic Deployment

Vercel will automatically deploy when you push to your main branch (if connected to GitHub).

### Step 3: Check Vercel Dashboard

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to Settings > Cron Jobs
4. Verify both cron jobs appear:
   - /api/cleanup/users - 0 2 \* \* \*
   - /api/cleanup/reservations - 0 3 \* \* \*

### Step 4: Monitor First Deployment

1. Go to Deployments tab
2. Click on the latest deployment
3. Check the Functions tab
4. Verify no errors during deployment

---

## Post-Deployment Cleanup

### Remove node-cron Dependency

Since node-cron is no longer used:

```bash
cd server
npm uninstall node-cron
git add package.json package-lock.json
git commit -m "Remove unused node-cron dependency"
git push origin main
```

### Update README.md

If your README lists node-cron in the tech stack, update it:

**Change from:**

```markdown
- Node-Cron
```

**Change to:**

```markdown
- Vercel Cron Jobs
```

### Verify First Cron Execution

After the scheduled time (2:00 AM and 3:00 AM UTC):

1. Vercel Dashboard > Deployments > Latest > Functions
2. Look for /api/cleanup/users and /api/cleanup/reservations
3. Verify successful execution (status 200)
4. Check logs for cleanup messages

---

## Monitoring and Logging

### View Logs in Vercel Dashboard

1. Go to your project in Vercel Dashboard
2. Navigate to Deployments
3. Select your deployment
4. Click on Functions tab
5. Filter by /api/cleanup/\*
6. View execution logs

### Console Log Format

The cleanup operations log to console with the following format:

```javascript
// User cleanup
console.log(`[CLEANUP] Deleted ${result.deletedCount} unverified users`);

// Reservation cleanup
console.log("[CLEANUP] Successfully cleaned up expired reservations");

// Errors
console.error("[CLEANUP] Error deleting unverified users:", err);
console.error("[CLEANUP] Error cleaning up expired reservations:", error);
```

### Set Up Monitoring Alerts

Configure Vercel to send alerts for failed cron jobs:

1. Vercel Dashboard > Project > Settings > Notifications
2. Enable notifications for:
   - Function errors
   - Cron job failures
3. Add email or Slack webhook

### Health Check Monitoring

Use the health check endpoint for uptime monitoring:

```bash
# Add to your monitoring service (UptimeRobot, Pingdom, etc.)
GET https://your-app.vercel.app/api/cleanup/health
```

Expected response: 200 OK with JSON body

---

## Troubleshooting

### Issue: Cron jobs not appearing in Vercel Dashboard

**Cause:** Vercel Cron Jobs require the Pro plan

**Solution:**

- Upgrade to Vercel Pro ($20/month)
- Or use alternative scheduling (GitHub Actions, external cron service)

### Issue: Function timeout

**Cause:** Operation takes too long

- Hobby plan: 10-second timeout
- Pro plan: 60-second timeout

**Solution:**

- Optimize database queries
- Add indexes to MongoDB collections
- Process in smaller batches
- Upgrade to Pro plan for longer timeout

### Issue: Database connection timeout

**Cause:** MongoDB connection string incorrect or network issue

**Solution:**

- Verify MONGODB_URI in Vercel environment variables
- Check MongoDB Atlas network access settings
- Ensure IP whitelist includes 0.0.0.0/0 for Vercel functions
- Test connection locally first

### Issue: Cron job runs but fails silently

**Cause:** Endpoint returns error but no alerts configured

**Solution:**

- Check Function logs in Vercel Dashboard
- Enable error notifications in Vercel settings
- Add try-catch blocks with detailed logging
- Use health check endpoint to verify service status

### Issue: Transaction fails in reservation cleanup

**Cause:** MongoDB session or transaction error

**Solution:**

- Ensure MongoDB is replica set (required for transactions)
- Check for network interruptions
- Verify all operations in transaction are supported
- Add retry logic for transient failures

### Issue: Stock not restored correctly

**Cause:** Product category logic error

**Solution:**

- Verify product category values match: "comics", "clothes", "shoes" vs "toys"
- Check variant names match exactly
- Review MongoDB schema for stock fields
- Add detailed logging in restoration logic

---

## Architecture Diagrams

### Component Overview

```
+-----------------------------------+
|        Vercel Platform            |
|                                   |
|  +-----------------------------+  |
|  |    Cron Scheduler           |  |
|  |  - Users @ 2:00 AM          |  |
|  |  - Reservations @ 3:00 AM   |  |
|  +-----------------------------+  |
|           |                       |
|           | HTTP POST             |
|           v                       |
|  +-----------------------------+  |
|  |  Serverless Functions       |  |
|  |  - /api/cleanup/users       |  |
|  |  - /api/cleanup/reservations|  |
|  +-----------------------------+  |
|           |                       |
+-----------|----------------------+
            |
            | MongoDB Queries
            v
+----------------------------+
|      MongoDB Atlas         |
|  - Users Collection        |
|  - Reservations Collection |
|  - Products Collection     |
+----------------------------+
```

### Execution Flow

```
[Vercel Cron]
    |
    | 1. Trigger at scheduled time
    v
[POST /api/cleanup/users or /reservations]
    |
    | 2. Invoke serverless function
    v
[cleanup.controller.js]
    |
    | 3. Handle HTTP request
    | 4. Connect to database
    v
[cleanUpUsers.js or cleanUpReservation.js]
    |
    | 5. Execute cleanup logic
    | 6. Query/update MongoDB
    v
[MongoDB Database]
    |
    | 7. Delete/update documents
    v
[Return Results]
    |
    | 8. JSON response
    | 9. Log results
    v
[Vercel Logs]
```

### Reservation Cleanup Detail

```
1. Find expired reservations (> 2 days old)
    |
    v
2. Start MongoDB transaction
    |
    v
3. For each reservation:
    |
    +-- For each product in reservation:
        |
        +-- Check product category
        |   |
        |   +-- If "comics", "clothes", or "shoes":
        |   |   Update stock.{variant} += quantity
        |   |
        |   +-- If "toys":
        |       Update stock += quantity
        |
        +-- Delete reservation document
    |
    v
4. Commit transaction (or rollback on error)
    |
    v
5. Return success response
```

---

## Benefits of Serverless Architecture

### Cost Efficiency

- No persistent server running 24/7
- Pay only for execution time
- Automatic scaling (no over-provisioning)

### Reliability

- Built-in retries for failed executions
- Multiple availability zones
- Vercel handles infrastructure

### Scalability

- Each invocation is independent
- No resource contention
- Handles traffic spikes automatically

### Maintainability

- Clean separation of concerns
- HTTP endpoints for testing
- Easy to monitor and debug

### Developer Experience

- Simple deployment (git push)
- No server configuration needed
- Built-in logging and monitoring

---

## Important Notes

### Vercel Function Limitations

1. **Execution Time Limits:**

   - Hobby plan: 10 seconds
   - Pro plan: 60 seconds
   - Enterprise: Custom

2. **Memory Limits:**

   - Default: 1024 MB
   - Can be increased in vercel.json

3. **Stateless:**

   - No persistent memory between invocations
   - Global variables reset on each invocation
   - Use database for state management

4. **Cold Starts:**
   - Function may take longer on first invocation
   - Subsequent invocations are faster
   - Consider warming up critical functions

### MongoDB Transaction Requirements

Transactions require:

- MongoDB 4.0 or higher
- Replica set deployment (not standalone)
- MongoDB Atlas clusters support transactions by default

### Cron Job Requirements

- Vercel Pro plan required ($20/month)
- Maximum 1 cron job on Hobby plan
- Unlimited cron jobs on Pro/Enterprise plans

---

## Quick Reference

### Endpoints Summary

| Method | Endpoint                  | Purpose                                               | Schedule            |
| ------ | ------------------------- | ----------------------------------------------------- | ------------------- |
| POST   | /api/cleanup/users        | Delete unverified users (>7 days)                     | Daily @ 2:00 AM UTC |
| POST   | /api/cleanup/reservations | Restore stock & delete expired reservations (>2 days) | Daily @ 3:00 AM UTC |
| GET    | /api/cleanup/health       | Health check                                          | Manual/Monitoring   |

### Deployment Checklist

- [ ] Commit and push changes to repository
- [ ] Verify automatic deployment to Vercel
- [ ] Check cron jobs appear in Vercel Dashboard
- [ ] Test endpoints manually (optional)
- [ ] Add CRON_SECRET for security (recommended)
- [ ] Monitor first cron execution
- [ ] Remove node-cron from package.json
- [ ] Update README if necessary
- [ ] Set up monitoring alerts (optional)

### Useful Commands

```bash
# Local testing
curl -X POST http://localhost:3000/api/cleanup/users
curl -X POST http://localhost:3000/api/cleanup/reservations
curl http://localhost:3000/api/cleanup/health

# Production testing
curl -X POST https://your-app.vercel.app/api/cleanup/users

# Remove old dependency
npm uninstall node-cron

# View Vercel logs
vercel logs

# Deploy to production
vercel --prod
```

---

## Additional Resources

- [Vercel Cron Jobs Documentation](https://vercel.com/docs/cron-jobs)
- [Vercel Serverless Functions Documentation](https://vercel.com/docs/functions)
- [Cron Expression Tester](https://crontab.guru/)
- [MongoDB Transactions Documentation](https://docs.mongodb.com/manual/core/transactions/)

---

**Document Version:** 1.0.0  
**Last Updated:** October 14, 2025  
**Author:** GitHub Copilot  
**Status:** Ready for Production Deployment
