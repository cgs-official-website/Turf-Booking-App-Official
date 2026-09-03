# 🏆 Turf Vendor App — "God-Tier" Splash Screen Design & Animation Specification

An elevated, cinematic version of the splash screen spec — layered motion, physics-based easing, and premium micro-interactions designed to feel like a flagship consumer app (Stripe / Linear / Apple-tier polish).

---

## 💡 AI Prompt / Feature Specification Prompt

> **"Create a cinematic, ultra-premium, light-themed splash screen for a sports venue and turf management mobile app in React Native / Reanimated 3. This is not a static logo screen — it is a choreographed motion sequence with layered depth, physics-based easing, and a signature 'brand reveal' moment. Requirements:**
>
> 1. **Layered Atmosphere (not flat background)**
>    - Base: crisp white (`#FFFFFF`) canvas.
>    - Layer 1: a slow-drifting radial mesh gradient (`rgba(0,197,102,0.12)` → transparent) that subtly shifts position over 6s (parallax-like, barely perceptible — "alive" not "static").
>    - Layer 2: 3 concentric ambient rings pulsing at staggered offsets (150ms delay each) so the glow feels organic, not mechanically synced.
>    - Layer 3: faint particle field — 8–12 soft emerald dots drifting upward at varying speeds/opacities (0.05–0.15 opacity), like turf grass particles rising. Disable on low-end devices via a performance flag.
>
> 2. **Logo Badge — Physics, Not Just Fade**
>    - Entrance: spring scale from `0.82 → 1.06 → 1.0` (slight overshoot bounce, `tension: 55, friction: 7, mass: 0.9`) — must feel like it has weight.
>    - Elevation: animated shadow that grows in tandem with scale (shadow radius `4 → 18`, opacity `0.08 → 0.18`) so the card feels like it's lifting off the page.
>    - Rotation micro-detail: badge starts at `-4deg`, springs to `0deg` on entrance for organic asymmetry.
>
> 3. **5-Frame Logo Reveal — Choreographed, Not Linear**
>    - Frames crossfade AND scale slightly (`0.96 → 1.0`) on each transition — no frame just "appears," each one arrives.
>    - Easing per frame uses `Easing.bezier(0.22, 1, 0.36, 1)` (premium "ease-out-expo" feel) — fast start, buttery settle.
>    - Frame 5 (final logo) gets a distinct "hero moment": brief scale pop to `1.08` then settle to `1.0` with a soft emerald glow flash behind it (opacity `0 → 0.4 → 0` over 400ms) — this is the emotional peak of the animation.
>
> 4. **Typographic Reveal — Staggered, Directional**
>    - `"TURF VENDOR"` reveals letter-group by letter-group (not the whole string at once) using a 40ms stagger per word, translateY `16 → 0`, with a subtle blur-to-sharp effect (`blur: 4px → 0px`) for a "focusing" feel.
>    - Tagline `"Partner Portal & Facility Manager"` follows 150ms after with a simpler fade + 8px slide.
>
> 5. **Micro-Progress Bar — Alive, Not a Static Fill**
>    - Track has a subtle inner shadow for depth.
>    - Fill uses a gradient sweep (`#00C566 → #00E67A → #00C566`) that shimmers left-to-right continuously while filling, like a loading "energy" effect.
>    - Fill growth is eased with `Easing.bezier(0.4, 0, 0.2, 1)`, not linear — it should feel like it's anticipating completion, slightly accelerating near the end.
>
> 6. **Exit Transition — The Detail Most Apps Skip**
>    - On completion, do NOT hard-cut to the next screen. Perform a coordinated exit: logo card scales to `1.04` and fades over 220ms while the entire screen does a subtle upward parallax exit (translateY `0 → -24`) with opacity fade, crossfading into the app shell.
>    - Haptic feedback fires at the exact frame the hero glow flashes, reinforcing the "arrival" moment.
>
> 7. **Safety & Performance**
>    - Hard fallback timer guarantees navigation even if any animation stalls or assets fail to load.
>    - All animations run on the native thread (`useNativeDriver: true`) — zero JS-thread jank.
>    - Particle layer and mesh gradient auto-disable on devices below a performance threshold (reduced-motion / low-end fallback to a clean static version of the same brand moment)."**

---

## 🎨 Design System & Palette

| Element | Token / Color | Purpose |
| :--- | :--- | :--- |
| **Background** | `#FFFFFF` | Crisp light base |
| **Primary Accent** | `#00C566` (Vibrant Emerald) | Signature brand color |
| **Accent Highlight** | `#00E67A` | Shimmer sweep on progress fill |
| **Ambient Glow** | `rgba(0, 197, 102, 0.12–0.2)` | Layered pulsing halo |
| **Particle Color** | `rgba(0, 197, 102, 0.05–0.15)` | Drifting atmosphere dots |
| **Logo Card Background** | `#FFFFFF` | Elevated container |
| **Card Border** | `rgba(0, 197, 102, 0.25)` | Subtle brand edge |
| **Primary Text** | `#0F172A` (Slate 900) | App title |
| **Secondary Text** | `#64748B` (Slate 500) | Tagline |
| **Progress Track** | `#E2E8F0` (Slate 200) | Inactive bar |
| **Progress Fill** | Gradient `#00C566 → #00E67A → #00C566` | Shimmering active bar |

---

## ⏱️ Animation Timings & Configuration

```json
{
  "totalDuration": 2800,
  "frameDuration": 320,
  "frameEasing": "bezier(0.22, 1, 0.36, 1)",
  "heroFrameGlow": {
    "scalePop": 1.08,
    "settle": 1.0,
    "glowOpacityPeak": 0.4,
    "duration": 400
  },
  "logoSpring": {
    "tension": 55,
    "friction": 7,
    "mass": 0.9,
    "initialScale": 0.82,
    "overshootScale": 1.06,
    "settleScale": 1.0,
    "initialRotation": "-4deg"
  },
  "ambientRings": {
    "count": 3,
    "staggerDelay": 150,
    "duration": 1200,
    "scaleRange": [1.0, 1.25],
    "opacityRange": [0.35, 0.10],
    "loop": true
  },
  "particleField": {
    "count": [8, 12],
    "opacityRange": [0.05, 0.15],
    "driftDuration": [4000, 7000],
    "enabledOnLowEndDevices": false
  },
  "titleReveal": {
    "staggerPerWord": 40,
    "translateY": [16, 0],
    "blur": [4, 0],
    "duration": 700
  },
  "taglineReveal": {
    "delayAfterTitle": 150,
    "translateY": [8, 0],
    "duration": 500
  },
  "progressBar": {
    "easing": "bezier(0.4, 0, 0.2, 1)",
    "shimmerLoop": true,
    "shimmerDuration": 900
  },
  "exitTransition": {
    "cardScaleTo": 1.04,
    "fadeDuration": 220,
    "screenTranslateY": [0, -24],
    "hapticSyncWithHeroGlow": true
  },
  "fallbackTimeout": 3000
}
```

---

## 📂 Assets Required

`TurfVendorApp/src/assets/`
* `splash-1.png` — Silhouette / base frame
* `splash-2.png` — Initial turf contour frame
* `splash-3.png` — Mid-stage highlight frame
* `splash-4.png` — Near-complete logo frame
* `splash-5.png` — Full vibrant brand logo (hero glow frame)

---

## 💻 Source Code Reference

Implementation target:
👉 [`TurfVendorApp/src/screens/SplashScreen.jsx`](file:///c:/Turf-Booking-App-Official/TurfVendorApp/src/screens/SplashScreen.jsx)

---

## 🧠 Why This Is "God-Tier" vs. the Standard Spec

| Standard Version | God-Tier Version |
| :--- | :--- |
| Flat white background | Layered mesh gradient + drifting particles |
| Single ambient pulse | 3 staggered rings for organic, non-mechanical feel |
| Linear frame crossfade | Bezier-eased crossfade + scale on every frame |
| No emotional peak | Dedicated "hero moment" on final frame (glow flash) |
| Whole-string text fade | Word-staggered reveal with focus feel |
| Static-fill progress bar | Shimmering gradient sweep with eased, accelerating fill |
| Hard cut to next screen | Choreographed parallax exit transition |
| Fixed animation for all devices | Clean fallbacks & native driver performance |
