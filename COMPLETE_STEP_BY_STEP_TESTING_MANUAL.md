# 🏟️ Namma Ooru Turf — Complete Step-by-Step Testing Manual

> **Comprehensive End-to-End Testing Guide for the Entire Turf Booking Ecosystem**  
> Covers: Deployed Railway Cloud Backend, Super Admin Web Dashboard, Turf Partner Mobile App, and Turf Customer Mobile App.

---

## 📌 1. Ecosystem Overview & Test Starting Point

### 🎯 Where is the Starting Point?
The **starting point** of testing this entire ecosystem is **Phase 0 & Phase 1**:
1. **Cloud Backend Verification**: Verify that the deployed cloud API and Redis cache are operational.
2. **Super Admin Baseline**: Log in to the Super Admin portal to verify existing platform state, dynamic subscription tiers, and operational dashboards.

```
                    ┌────────────────────────────────────────┐
                    │    START HERE: Cloud Backend Health    │
                    │   (/api/v1/health & Cloud Database)    │
                    └──────────────────┬─────────────────────┘
                                       │
                                       ▼
                    ┌────────────────────────────────────────┐
                    │      Phase 1: Super Admin Portal       │
                    │    (Login, Subscriptions, Reviews)     │
                    └──────────────────┬─────────────────────┘
                                       │
                                       ▼
                    ┌────────────────────────────────────────┐
                    │     Phase 2: Turf Partner App          │
                    │  (Register, Pitch Setup, KYC Upload)   │
                    └──────────────────┬─────────────────────┘
                                       │
                                       ▼
                    ┌────────────────────────────────────────┐
                    │  Phase 3: Super Admin Approvals        │
                    │   (Approve Partner & Turf Listing)     │
                    └──────────────────┬─────────────────────┘
                                       │
                                       ▼
                    ┌────────────────────────────────────────┐
                    │     Phase 4: Customer User App         │
                    │  (Browse Turf, Book Slot, Pay Cash)    │
                    └──────────────────┬─────────────────────┘
                                       │
                                       ▼
                    ┌────────────────────────────────────────┐
                    │  Phase 5 & 6: Cross-App Sync & Matches │
                    │  (Vendor Schedule & Live Match Score)  │
                    └──────────────────┬─────────────────────┘
                                       │
                                       ▼
                    ┌────────────────────────────────────────┐
                    │    Phase 7: Review Submission & Super  │
                    │    Admin Read-Only Reviews Module      │
                    └────────────────────────────────────────┘
```

---

## 🌐 2. Cloud Endpoints & Test Credentials

| Component | Target URL | Credentials |
| :--- | :--- | :--- |
| **Deployed Cloud Backend** | `https://turf-booking-app-official-production.up.railway.app/api/v1` | Public API |
| **Cloud Health Check** | `https://turf-booking-app-official-production.up.railway.app/api/v1/health` | Public |
| **Deployed Super Admin Portal** | `https://turf-booking-app-official-production.up.railway.app/admin` | **Email:** `admin@zuna.com`<br/>**Password:** `Cgs@001a` |
| **Local Super Admin (Vite Dev)** | `http://localhost:5173` | **Email:** `admin@zuna.com`<br/>**Password:** `Cgs@001a` |
| **Default Vendor Test Account** | Mobile App / Partner Login | **Email:** `partner@thunderarena.com`<br/>**Password:** `Partner@123` |
| **Default Player Test Account** | Mobile App / Customer Login | **Email:** `player@nammaooruturf.com`<br/>**Password:** `Player@123` |

---

## 📋 3. Step-by-Step Testing Procedure

---

### 🟢 Phase 0: Cloud Backend Health Check

1. Open your browser or terminal and test the deployed cloud health endpoint:
   ```bash
   curl https://turf-booking-app-official-production.up.railway.app/api/v1/health
   ```
2. **Expected Response (HTTP 200)**:
   ```json
   {
     "status": "healthy",
     "timestamp": "2026-09-04T...",
     "uptime": 1205.4,
     "services": {
       "database": "connected",
       "redis": "connected",
       "auth": "ready"
     }
   }
   ```
3. ✅ **Pass Criteria**: Database and Redis show `connected` with a status of `healthy`.

---

### 🟢 Phase 1: Super Admin Portal Baseline

1. Open the Super Admin Dashboard:
   - **Production:** `https://turf-booking-app-official-production.up.railway.app/admin`
   - **Local Dev:** `http://localhost:5173`
2. **Log In**:
   - **Email:** `admin@zuna.com`
   - **Password:** `Cgs@001a`
3. **Verify Sections**:
   - **Overview Dashboard**: Verify KPI cards (Total Users, Active Turfs, Live Bookings, Revenue).
   - **Partner Plans (`subscriptions`)**: Verify that the Dynamic Subscription Tiers are listed. Click **"Create New Plan"** to test creating/editing a custom membership tier.
   - **Turf Reviews (`reviews`)**: Open the new **Turf Reviews** module under `COMMUNITY & FEEDBACK`. Verify the average rating card, 1-to-5 star distribution bars, and search filter.
4. ✅ **Pass Criteria**: Super Admin logs in smoothly without console errors; all navigation tabs load cleanly.

---

### 🟢 Phase 2: Turf Partner App (Registration & Pitch Setup)

1. **Launch the Partner Mobile App**:
   ```powershell
   cd c:\Turf-Booking-App-Official\TurfVendorApp
   npm run android
   ```
2. **Register a New Partner Account**:
   - Tap **Sign Up**.
   - Enter **Business Name** (e.g. `Kovai Champions Turf`), **Email**, **Phone**, and **Password**.
   - Tap **Register & Start Onboarding**.
3. **Complete the 3-Step Turf Onboarding Wizard**:
   - **Step 1 (Turf Info):**
     - Turf Title: `Kovai Champions Arena`
     - Sports: Select `Cricket` & `Football`
     - Hourly Rate: `₹1000 / hr`
     - Operating Hours: `06:00 AM - 11:00 PM`
     - Location/City: `Coimbatore`
   - **Step 2 (KYC Identity Upload):**
     - Upload Aadhaar / Government ID & PAN document.
   - **Step 3 (Turf Verification):**
     - Upload Electricity Bill / Property tax receipt.
   - **Step 4 (Select Partner Plan):**
     - Select a plan from the real-time dynamic plans list (e.g. `Pro Growth Partner`).
4. **Submit Application**:
   - The app transitions to the **"KYC Application Under Review"** screen.
5. ✅ **Pass Criteria**: Vendor profile, turf details, and KYC documents are uploaded successfully.

---

### 🟢 Phase 3: Super Admin KYC & Turf Verification Desk

1. Switch back to the **Super Admin Portal** (`http://localhost:5173` or deployed URL).
2. Navigate to **`KYC & Approvals`** or **`Turf Partners`**.
3. Locate `Kovai Champions Arena` in the pending approval queue.
4. Click **Review Application**:
   - Inspect uploaded Aadhaar/PAN documents.
   - Inspect Turf operating specs.
5. Click **"Approve Partner & Turf"**.
6. **Verify Live Sync**:
   - Reopen or pull-to-refresh the **Turf Partner App**.
   - The partner app instantly unlocks the **Vendor Business Dashboard** (Revenue stats, Slot manager, Today's calendar).
7. ✅ **Pass Criteria**: Vendor is approved; Partner mobile dashboard becomes active immediately.

---

### 🟢 Phase 4: Turf Customer App (Discovery & Slot Booking)

1. **Launch the Customer Mobile App**:
   ```powershell
   cd c:\Turf-Booking-App-Official\TurfUserApp
   npm run android
   ```
2. **Register or Login**:
   - Enter name, email, phone number, and password.
3. **Discover Newly Approved Turf**:
   - On the **Home Screen** and **Explore Screen**, locate `Kovai Champions Arena`.
   - Verify that the sports chips (`Cricket`, `Football`), pricing (`₹1000/hr`), and city (`Coimbatore`) match what was submitted in Phase 2.
4. **Select Slot**:
   - Tap on the turf card to view full amenities, pitch dimensions, and gallery photos.
   - Tap **Book Slot**.
   - Pick Date: `Today` (or tomorrow).
   - Pick Time Slot: `07:00 PM - 08:00 PM`.
5. **Checkout & Payment**:
   - Review booking summary (Turf name, slot time, total amount).
   - Select **Pay at Venue (Cash)** or **Online Test Payment**.
   - Tap **Confirm Booking**.
6. **Booking Confirmation**:
   - A success screen appears with the Booking ID (e.g. `BK-89421`) and QR Code ticket.
7. ✅ **Pass Criteria**: Booking is stored in the database, slot is marked as reserved, and ticket is generated.

---

### 🟢 Phase 5: Cross-App Sync & Vendor Schedule Verification

1. Switch back to the **Turf Partner App** (`TurfVendorApp`).
2. Navigate to the **Schedule / Bookings** tab:
   - Verify that the new reservation (`07:00 PM - 08:00 PM`) for `Kovai Champions Arena` appears in real-time under Today's Bookings.
   - The Customer's name and contact number are visible on the booking card.
3. **Slot Freeze / Unfreeze Test**:
   - Tap **Manage Slots**.
   - Select `09:00 PM - 10:00 PM` and toggle **Freeze Slot (Maintenance)**.
   - Switch to the Customer App $\rightarrow$ The `09:00 PM` slot shows as **Unavailable/Locked**.
4. ✅ **Pass Criteria**: Real-time two-way synchronization between Customer booking actions and Vendor slot schedule.

---

### 🟢 Phase 6: Community Cricket Match & Live Scorecard

1. In the **Turf Customer App** (`TurfUserApp`), navigate to the **Matches & Community** tab.
2. **Create a Match**:
   - Tap **Create Match**.
   - Select Sport: `Cricket` (or `Football`).
   - Match Title: `Weekend Super League - Match 1`.
   - Overs: `6 Overs` (or `8 Overs`).
   - Team A: `Kovai Strikers` vs. Team B: `Perundurai Kings`.
3. **Start Live Scoring**:
   - Open the match scorecard.
   - Tap ball outcomes (`1 Run`, `4 Boundary`, `6 Sixer`, `Wicket`, `Dot Ball`, `Wide`).
   - Verify that the total runs, run rate (CRR), over count (e.g. `2.4 / 6`), and player strike rates update in real-time.
4. **View in Super Admin**:
   - Open **Super Admin Portal** $\rightarrow$ Navigate to **`Matches & Scores`**.
   - Verify that `Weekend Super League - Match 1` and live score stream appear in the admin monitor.
5. ✅ **Pass Criteria**: Match scores update dynamically on the customer scorecard and sync with the admin panel.

---

### 🟢 Phase 7: Customer Review & Super Admin Reviews Module

1. In the **Turf Customer App** (`TurfUserApp`):
   - Go to **My Bookings** $\rightarrow$ Completed Booking.
   - Tap **"Rate & Review Turf"**.
   - Select **5 Stars** ⭐⭐⭐⭐⭐.
   - Enter review comment: *"Fantastic pitch condition, clean floodlights, and great turf maintenance!"*.
   - Tap **Submit Review**.
2. **Verify in Super Admin Portal**:
   - Open **Super Admin Portal** $\rightarrow$ Click **`Turf Reviews`** in the sidebar.
   - Verify:
     - The newly submitted review appears at the top with player name, avatar, and 5-star rating.
     - The turf badge displays `Kovai Champions Arena • Coimbatore`.
     - The rating distribution counter for 5-star reviews increments.
     - Search for keyword `"floodlights"` $\rightarrow$ The review is filtered correctly.
3. ✅ **Pass Criteria**: Review immediately updates turf rating averages and is viewable in the Super Admin read-only module.

---

## ⚡ 4. Quick Testing Verification Matrix

| Step # | Test Flow | Expected Output | Status |
| :---: | :--- | :--- | :---: |
| **01** | `GET /api/v1/health` | Returns HTTP 200 with DB & Redis `connected` | 🟢 READY |
| **02** | Super Admin Login (`admin@zuna.com`) | Dashboard KPIs, Subscriptions, and Reviews load | 🟢 READY |
| **03** | Partner Registration & Onboarding | Turf profile & KYC docs uploaded to Cloudinary/DB | 🟢 READY |
| **04** | Super Admin Approval Desk | Partner KYC verified; Vendor App unlocked | 🟢 READY |
| **05** | Customer Turf Discovery & Booking | Approved turf searchable; Slot booked with ticket ID | 🟢 READY |
| **06** | Vendor Schedule Sync & Slot Lock | Booked slot appears on calendar; Slot locking works | 🟢 READY |
| **07** | Live Cricket Match Scoring | Ball-by-ball score updates run rate & overs | 🟢 READY |
| **08** | Customer Review & Admin Review View | Review posted and displayed in Super Admin reviews tab | 🟢 READY |

---

## 🛠️ 5. Troubleshooting & Port Configuration

### For Android USB Physical Device / Emulator:
```powershell
# If testing with local backend (localhost:5000)
adb reverse tcp:5000 tcp:5000
adb reverse tcp:5173 tcp:5173
```

### When Using the Deployed Railway Cloud Backend:
- The mobile apps automatically connect to `https://turf-booking-app-official-production.up.railway.app/api/v1`.
- No local server or port forwarding is required when running against the cloud backend.
- You can toggle between deployed backend and local server at any time in `TurfUserApp/src/api/client.js` and `TurfVendorApp/src/api/client.js`.
