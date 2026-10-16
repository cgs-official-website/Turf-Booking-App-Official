# Images needed for the Auth Flow

The screens work right now without any images (they fall back to emoji), so
this is **not blocking** — drop these in when you have time and the app will
automatically pick them up (each screen does a safe `try { require(...) }`).

Put files directly in `src/assets/` with these exact names:

| # | Filename                     | Used on                | Suggested size    | Notes                                   |
|---|-------------------------------|-------------------------|--------------------|------------------------------------------|
| 1 | `turf-stadium-bg.png`         | Landing screen           | 1080×1920 (9:16)   | Full-bleed stadium/turf photo, dark overlay works best |
| 2 | `logo.png`                    | Landing screen           | 240×240 (square)   | App/brand logo, transparent background   |
| 3 | `terms-illustration.png`      | Terms of Service screen  | 800×500            | Same style as your screenshots (privacy/shield illustration) |
| 4 | `forgot-password-icon.png`    | (optional) Forgot Password / Check Email screens | 400×400 | Currently uses 🔑 / 📧 emoji instead |
| 5 | `reset-password-icon.png`     | (optional) New Password screen | 400×400      | Currently uses 🔒 emoji instead          |

Only #1–#3 are referenced in code today (LandingScreen.jsx, TermsScreen.jsx).
#4–#5 are optional polish — the emoji look fine for now given the deadline.

To wire up #4/#5 later, add the same pattern used in TermsScreen.jsx:
```js
let icon = null;
try { icon = require('../assets/forgot-password-icon.png'); } catch (e) {}
```
