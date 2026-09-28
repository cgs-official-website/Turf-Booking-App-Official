# Graph Report - C:\Users\mohan\Downloads\turf booking app\server  (2026-09-28)

## Corpus Check
- 44 files · ~658,627 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 304 nodes · 265 edges · 40 communities detected
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 4 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]

## God Nodes (most connected - your core abstractions)
1. `sendError()` - 4 edges
2. `now` - 3 edges
3. `otpRateLimiter()` - 3 edges
4. `errorHandler()` - 2 edges
5. `requireAdmin()` - 2 edges
6. `resetAndSeed()` - 2 edges
7. `express` - 1 edges
8. `cors` - 1 edges
9. `dotenv` - 1 edges
10. `v1Routes` - 1 edges

## Surprising Connections (you probably didn't know these)
- `errorHandler()` --calls--> `sendError()`  [INFERRED]
  C:\Users\mohan\Downloads\turf booking app\server\middleware\errorHandler.js → C:\Users\mohan\Downloads\turf booking app\server\utils\response.js
- `resetAndSeed()` --calls--> `now`  [INFERRED]
  C:\Users\mohan\Downloads\turf booking app\server\scripts\resetDatabase.js → C:\Users\mohan\Downloads\turf booking app\server\middleware\rateLimiter.js
- `otpRateLimiter()` --calls--> `sendError()`  [INFERRED]
  C:\Users\mohan\Downloads\turf booking app\server\middleware\rateLimiter.js → C:\Users\mohan\Downloads\turf booking app\server\utils\response.js
- `requireAdmin()` --calls--> `sendError()`  [INFERRED]
  C:\Users\mohan\Downloads\turf booking app\server\middleware\requireAdmin.js → C:\Users\mohan\Downloads\turf booking app\server\utils\response.js

## Communities

### Community 0 - "Community 0"
_Manages user authentication, authorization, OTP rate limiting, password hashing, admin access checks, and associated error handling and environment configuration._
Cohesion: 0.08
Nodes (18): errorHandler(), { sendError }, { ZodError }, memoryStore, now, otpRateLimiter(), redis, { sendError } (+10 more)

### Community 1 - "Community 1"
_Handles user authentication, venue bookings, match operations, payments and administrative functions for a sports tournament platform._
Cohesion: 0.1
Nodes (20): adminReviewSchema, createMatchSchema, createReviewSchema, googleAuthSchema, joinMatchSchema, paymentVerifySchema, reportIssueSchema, reserveSlotSchema (+12 more)

### Community 2 - "Community 2"
_Provides the backend routing and database logic for authentication, booking, payments, notifications, and vendor management in the turf and sports facility booking system._
Cohesion: 0.11
Nodes (18): adminRoutes, authRoutes, bookingRoutes, { db }, dbOk, express, matchRoutes, notificationRoutes (+10 more)

### Community 3 - "Community 3"
_Handles user authentication, OTP delivery and verification, JWT token issuance, and the related messaging services._
Cohesion: 0.14
Nodes (12): authController, cacheService, crypto, firestoreService, { generateOtp, hashOtp, verifyOtp }, jwt, JWT_EXPIRES_IN, JWT_SECRET (+4 more)

### Community 4 - "Community 4"

Cohesion: 0.17
Nodes (10): adminController, { adminReviewSchema, setAdminClaimSchema }, { auth }, firestoreService, jwt, JWT_SECRET, notificationService, { sendSuccess, sendError, sendPaginated } (+2 more)

### Community 5 - "Community 5"

Cohesion: 0.18
Nodes (10): app, cors, dotenv, errorHandler, express, { initCronJobs }, path, PORT (+2 more)

### Community 6 - "Community 6"

Cohesion: 0.2
Nodes (7): admin, { db }, firestoreDisabled, firestoreService, fs, LOCAL_DB_PATH, path

### Community 7 - "Community 7"

Cohesion: 0.22
Nodes (7): admin, auth, db, dotenv, isInitialized, messaging, storage

### Community 8 - "Community 8"

Cohesion: 0.22
Nodes (8): apiKey, apiSecret, cloudinary, cloudinaryService, cloudName, isConfigured, MAX_FILE_SIZE, uploadPreset

### Community 9 - "Community 9"

Cohesion: 0.25
Nodes (7): bookingController, cacheService, firestoreService, notificationService, razorpayService, { reserveSlotSchema, createReviewSchema }, { sendSuccess, sendError, sendPaginated }

### Community 10 - "Community 10"

Cohesion: 0.25
Nodes (6): {
  createMatchSchema,
  joinMatchSchema,
  updateTeamsSchema,
  tossSchema,
  updateScorecardSchema,
}, crypto, firestoreService, matchController, notificationService, { sendSuccess, sendError, sendPaginated }

### Community 11 - "Community 11"

Cohesion: 0.25
Nodes (7): cacheService, firestoreService, notificationService, paymentController, { paymentVerifySchema }, razorpayService, { sendSuccess, sendError }

### Community 12 - "Community 12"

Cohesion: 0.25
Nodes (6): cacheService, DEFAULT_TURFS, firestoreService, { sendSuccess, sendError, sendPaginated }, turfController, turfsSeeded

### Community 13 - "Community 13"

Cohesion: 0.25
Nodes (7): cacheService, firestoreService, notificationService, { sendSuccess, sendError, sendPaginated }, storageService, vendorController, {
  vendorTurfSetupSchema,
  slotOverrideSchema,
  reportIssueSchema,
}

### Community 14 - "Community 14"
_Handles vendor file uploads, authentication, and authorization within the API._
Cohesion: 0.25
Nodes (7): express, multer, requireRole, router, upload, vendorController, verifySessionToken

### Community 15 - "Community 15"

Cohesion: 0.29
Nodes (6): authController, express, { otpRateLimiter }, router, verifyFirebaseToken, verifySessionToken

### Community 16 - "Community 16"

Cohesion: 0.29
Nodes (6): cloudinaryService, crypto, fs, path, storageService, UPLOADS_DIR

### Community 17 - "Community 17"

Cohesion: 0.33
Nodes (3): dotenv, isRedisConnected, Redis

### Community 18 - "Community 18"

Cohesion: 0.33
Nodes (5): axios, GOOGLE_MAPS_API_KEY, placesController, POPULAR_HUBS, { sendSuccess, sendError }

### Community 19 - "Community 19"

Cohesion: 0.33
Nodes (5): firestoreService, razorpayService, SEED_PLANS, { sendSuccess, sendError }, subscriptionController

### Community 20 - "Community 20"

Cohesion: 0.33
Nodes (4): cacheService, cron, firestoreService, notificationService

### Community 21 - "Community 21"

Cohesion: 0.33
Nodes (5): adminController, express, requireAdmin, router, verifySessionToken

### Community 22 - "Community 22"

Cohesion: 0.33
Nodes (5): express, requireRole, router, subscriptionController, verifySessionToken

### Community 23 - "Community 23"

Cohesion: 0.33
Nodes (2): bcrypt, crypto

### Community 24 - "Community 24"

Cohesion: 0.4
Nodes (4): firestoreService, notificationController, notificationService, { sendSuccess, sendError }

### Community 25 - "Community 25"

Cohesion: 0.4
Nodes (4): DEFAULT_TURFS, firestoreService, { sendSuccess, sendError }, wishlistController

### Community 26 - "Community 26"

Cohesion: 0.4
Nodes (4): bookingController, express, router, verifySessionToken

### Community 27 - "Community 27"

Cohesion: 0.4
Nodes (4): express, matchController, router, verifySessionToken

### Community 28 - "Community 28"

Cohesion: 0.4
Nodes (4): express, notificationController, router, verifySessionToken

### Community 29 - "Community 29"

Cohesion: 0.4
Nodes (4): express, paymentController, router, verifySessionToken

### Community 30 - "Community 30"

Cohesion: 0.4
Nodes (4): express, router, turfController, verifySessionToken

### Community 31 - "Community 31"

Cohesion: 0.4
Nodes (4): express, router, verifySessionToken, wishlistController

### Community 32 - "Community 32"

Cohesion: 0.4
Nodes (3): nodemailer, nodemailerService, transporter

### Community 33 - "Community 33"

Cohesion: 0.5
Nodes (2): { db }, { sendError }

### Community 34 - "Community 34"

Cohesion: 0.5
Nodes (3): express, placesController, router

### Community 35 - "Community 35"

Cohesion: 0.5
Nodes (3): { db, messaging }, firestoreService, notificationService

### Community 36 - "Community 36"

Cohesion: 0.5
Nodes (3): crypto, razorpay, razorpayService

### Community 37 - "Community 37"

Cohesion: 0.67
Nodes (2): dotenv, Razorpay

### Community 38 - "Community 38"
_Provides temporary storage for frequently accessed data to reduce database load._
Cohesion: 0.67
Nodes (2): cacheService, redis

### Community 39 - "Community 39"

Cohesion: 0.67
Nodes (2): axios, msg91Service

## Knowledge Gaps
- **237 isolated node(s):** `express`, `cors`, `dotenv`, `v1Routes`, `errorHandler` (+232 more)
  These have ≤1 connection - possible missing edges or undocumented components.