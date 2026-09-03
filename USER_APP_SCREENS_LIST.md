# Turf User App - Complete End-to-End Screens & Navigation Directory

> **Application:** Turf User Mobile App (`TurfUserApp`)  
> **Framework:** React Native 0.74.5 • React Navigation 6 • Redux Toolkit  
> **Total Screens & Modals:** 24 Screens  
> **Source Directory:** `c:\Turf-Booking-App-Official\TurfUserApp\src`

---

## 1. Complete Screen Inventory by Module

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   TURF USER APP NAVIGATION MAP                                   │
├───────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [Splash] ──▶ [Onboarding] ──▶ [Login / OTP / Register] ──▶ [Location]                             │
│                                                                 │                                 │
│                                                                 ▼                                 │
│                                                   ┌───────────────────────────┐                   │
│                                                   │      Main Bottom Tabs     │                   │
│                                                   ├───────────────────────────┤                   │
│                                                   │ 1. Home (Explore Feed)    │                   │
│                                                   │ 2. Bookings (History/Pass)│                   │
│                                                   │ 3. Wishlist (Saved Turfs) │                   │
│                                                   │ 4. Profile (Settings)     │                   │
│                                                   └─────────────┬─────────────┘                   │
│                                                                 │                                 │
│         ┌───────────────────────────────────────────────────────┴───────────────────────┐         │
│         ▼                                                                               ▼         │
│  [ Turf Booking Flow ]                                                    [ Cricket Tournament ]  │
│  • Explore / Search / Filters                                             • Create Match / Join   │
│  • Turf Detail & Reviews                                                  • Select Squad Players  │
│  • Slot Picker (7-Day)                                                    • Build Team A & Team B │
│  • Booking Confirm (Razorpay)                                             • 3D Coin Toss Screen   │
│  • Digital Pass (QR Code)                                                 • Live Scorecard        │
└───────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### Module 1: App Launch & Authentication Flow
| Screen Name | File Path | Route Key | Key Features & Purpose |
| :--- | :--- | :--- | :--- |
| **Splash Screen** | `src/screens/SplashScreen.jsx` | `Splash` | Brand splash animation, session token validation, auto-route check |
| **Onboarding Screen** | `src/screens/OnboardingScreen.jsx` | `Onboarding` | Feature walk-through carousel highlighting booking, tournaments, and social play |
| **Phone Login Screen** | `src/screens/LoginScreen.jsx` | `Login` | Mobile phone number input, Google One-Tap auth button, terms acceptance |
| **Email Login Screen** | `src/screens/Login2Screen.jsx` | `Login2` | Traditional email/password sign-in screen with password reset link |
| **OTP Verification** | `src/screens/OTPScreen.jsx` | `OTP` | 4–6 digit SMS OTP input, timer countdown, auto-resend OTP trigger |
| **Register Screen** | `src/screens/RegisterScreen.jsx` | `Register` | New player registration form (Name, email, mobile number, avatar) |
| **Location Permission** | `src/screens/LocationScreen.jsx` | `Location` | GPS prompt, reverse geocoding to detect current city/town name |

---

### Module 2: Main Bottom Tabs (`MainTabs`)
| Tab Screen | File Path | Tab Route | Key Features & Purpose |
| :--- | :--- | :--- | :--- |
| **Home (Explore)** | `src/screens/HomeScreen.jsx` | `Home` | Dynamic banner, sport categories (Cricket, Football, Tennis, etc.), nearby turfs, search bar |
| **My Bookings** | `src/screens/MyBookingsScreen.jsx` | `Bookings` | Categorized booking tabs (*Upcoming*, *Completed*, *Cancelled*), booking passes |
| **Wishlist** | `src/screens/WishlistScreen.jsx` | `Wishlist` | Saved favorite turfs grid for fast 1-click rebooking |
| **Profile** | `src/screens/ProfileScreen.jsx` | `Profile` | User avatar, account stats, dark mode toggle, help support, logout |

---

### Module 3: Turf Discovery, Slot Selection & In-App Payment Flow
| Screen Name | File Path | Route Key | Key Features & Purpose |
| :--- | :--- | :--- | :--- |
| **Explore & Search** | `src/screens/ExploreScreen.jsx` | `Explore` | Search turfs by query, sport type, pricing range, rating, distance |
| **Filter Bottom Sheet** | `src/screens/FilterBottomSheet.jsx` | *Modal Component* | Slide-up filter drawer with price sliders, distance radius, and amenity chips |
| **Turf Detail Screen** | `src/screens/TurfDetailScreen.jsx` | `TurfDetail` | Full turf photo gallery, ground dimensions, rules, map directions, pricing tiers, reviews |
| **Slot Picker Screen** | `src/screens/SlotPickerScreen.jsx` | `SlotPicker` | 7-day calendar bar, court selector, duration calculator, 5-minute atomic slot lock |
| **Booking Confirm** | `src/screens/BookingConfirmScreen.jsx` | `BookingConfirm` | Price summary, split-bill calculator, WhatsApp share, **In-App Razorpay Checkout** |
| **Request Pending** | `src/screens/RequestPendingScreen.jsx` | `RequestPending` | Slot reservation hold animation & confirmation status |
| **Booking Detail & Pass** | `src/screens/BookingDetailScreen.jsx` | `BookingDetail` | Digital ticket with QR code, turf map route, receipt download, and cancellation |

---

### Module 4: Cricket Matches & Live Scoring Engine
| Screen Name | File Path | Route Key | Key Features & Purpose |
| :--- | :--- | :--- | :--- |
| **Create Match Screen** | `src/screens/CreateMatchScreen.jsx` | `CreateMatch` | Setup match format (Overs, ball type), generate 6-character hex join code |
| **Select Players** | `src/screens/SelectPlayersScreen.jsx` | `SelectPlayers` | Invite players, add friends, manage registered squad roster |
| **Build Teams Screen** | `src/screens/BuildTeamsScreen.jsx` | `BuildTeams` | Assign squad members to Team A and Team B, appoint captains |
| **Match Lobby** | `src/screens/MatchScreen.jsx` | `Match` | Match room overview, team lineups, toss summary, and match progress |
| **Toss Screen** | `src/screens/TossScreen.jsx` | `Toss` | Interactive 3D Coin Toss simulation (Heads/Tails & Bat/Bowl decision) |
| **Live Scorecard** | `src/screens/ScorecardScreen.jsx` | `Scorecard` | Ball-by-ball cricket scoring engine (Runs, Wickets, Extras, Overs, Striker/Bowler analytics) |

---

### Module 5: Account Management & Utility Screens
| Screen / Modal Name | File Path | Route Key / Type | Key Features & Purpose |
| :--- | :--- | :--- | :--- |
| **Personal Info Screen** | `src/screens/PersonalInfoScreen.jsx` | `PersonalInfo` | Edit player profile, name, phone, email, avatar photo upload |
| **Notifications Screen** | `src/screens/NotificationsScreen.jsx` | `Notifications` | Real-time booking alerts, payment receipts, tournament invites |
| **Rate Review Modal** | `src/screens/RateReviewModal.jsx` | *Modal Component* | Post-game star rating (1–5 stars) and review text submission |
| **Rate Experience Modal** | `src/screens/RateExperienceModal.jsx` | *Modal Component* | Quick popup feedback prompt after match completion |
| **No Internet Screen** | `src/screens/NoInternetScreen.jsx` | `NoInternet` | Offline network state screen with animated retry button |

---

## 2. Navigation Architecture

* **Root Navigator:** [`src/navigation/RootNavigator.jsx`](file:///c:/Turf-Booking-App-Official/TurfUserApp/src/navigation/RootNavigator.jsx) (Stack Navigator)
* **Main Tabs Navigator:** [`src/navigation/MainTabs.jsx`](file:///c:/Turf-Booking-App-Official/TurfUserApp/src/navigation/MainTabs.jsx) (Bottom Tab Navigator)
* **Theme Hook:** [`src/hooks/useTheme.js`](file:///c:/Turf-Booking-App-Official/TurfUserApp/src/hooks/useTheme.js) (Supports Dark & Light Mode across all screens)
* **State Management:** Redux Toolkit (`authSlice`, `wishlistSlice`)
