---
name: Ghar (گھر)
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#3d4a42'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#6d7a72'
  outline-variant: '#bccac0'
  surface-tint: '#006c4a'
  primary: '#006948'
  on-primary: '#ffffff'
  primary-container: '#00855d'
  on-primary-container: '#f5fff7'
  inverse-primary: '#68dba9'
  secondary: '#545f73'
  on-secondary: '#ffffff'
  secondary-container: '#d5e0f8'
  on-secondary-container: '#586377'
  tertiary: '#825100'
  on-tertiary: '#ffffff'
  tertiary-container: '#a36700'
  on-tertiary-container: '#fffbff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#85f8c4'
  primary-fixed-dim: '#68dba9'
  on-primary-fixed: '#002114'
  on-primary-fixed-variant: '#005137'
  secondary-fixed: '#d8e3fb'
  secondary-fixed-dim: '#bcc7de'
  on-secondary-fixed: '#111c2d'
  on-secondary-fixed-variant: '#3c475a'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-lg:
    fontFamily: Noto Nastaliq Urdu
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 64px
  headline-md:
    fontFamily: Noto Nastaliq Urdu
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 48px
  headline-sm:
    fontFamily: Noto Nastaliq Urdu
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 40px
  body-lg:
    fontFamily: Noto Nastaliq Urdu
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 36px
  body-md:
    fontFamily: Noto Nastaliq Urdu
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 32px
  number-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '700'
    lineHeight: 24px
  number-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 20px
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 4px
  xs: 8px
  sm: 12px
  md: 16px
  lg: 24px
  xl: 32px
  touch-target: 48px
---

## Brand & Style
The design system for this property marketplace focuses on **Trust**, **Growth**, and **Inclusivity**. It is tailored for the Pakistani real estate landscape, ensuring that the interface is accessible to a wide demographic, including users with varying levels of literacy. 

The style is **Modern Corporate** with **High-Contrast** accents. It leverages clear iconography and large interactive zones to reduce cognitive load. The visual narrative balances professional reliability (through deep tones) with the optimism of home ownership (through vibrant greens). Every element is designed for high legibility and ease of use in a mobile-first, RTL-dominant environment.

## Colors
The palette is rooted in a professional "Real Estate Green" (#059669) which symbolizes prosperity and the local landscape. This is paired with "Deep Slate" (#1E293B) to provide a foundation of authority and trust. 

- **Primary:** Used for main actions, success states, and progress indicators.
- **Secondary:** Used for headers, prominent text, and structural elements.
- **Tertiary (Amber):** Specifically reserved for "Verified" badges, price tags, and urgent call-to-actions to ensure they stand out against the green.
- **Backgrounds:** Use a very light gray (#F8FAFC) instead of pure white to reduce glare and improve visual comfort for long browsing sessions.

## Typography
The system follows an **Urdu-first** hierarchy. Urdu text utilizes **Noto Nastaliq Urdu** with a generous line height (approx 1.8x - 2.0x) to prevent character overlap and ensure the script remains legible even at smaller sizes. 

For numbers, prices (Lakh/Crore), and English terminology, **Plus Jakarta Sans** is used. This provides a clean, modern contrast to the traditional script, making data points like area sizes and phone numbers immediately scannable. All price labels should prioritize the numeral in the sans-serif font, followed by the Urdu unit (لاکھ/کروڑ).

## Layout & Spacing
The layout is **Right-to-Left (RTL)** by default. Navigation flows from top-right to bottom-left. 

A **Fluid Grid** model is used for mobile devices, with a minimum side margin of 16px (md). Gutters between cards are set to 12px (sm) to maximize screen real estate for property imagery. 

**Accessibility Constraint:** Every interactive element (buttons, icons, checkboxes) must maintain a minimum hit area of **48px x 48px** to accommodate users who may struggle with fine motor precision.

## Elevation & Depth
The design system utilizes **Tonal Layers** rather than heavy shadows to maintain a clean, modern look. 

- **Level 0 (Surface):** Light gray background (#F8FAFC).
- **Level 1 (Cards):** Pure white background with a subtle 1px border (#E2E8F0).
- **Level 2 (Active/Floating):** A soft, diffused ambient shadow (8px blur, 4% opacity, Secondary color tint) is used exclusively for floating action buttons (FAB) like "Voice Search" and "Call Agent."

This approach ensures that property photos—the most important content—remain the focal point without competing with heavy UI shadows.

## Shapes
The shape language is **Rounded**, conveying friendliness and modernity. 
- **Standard Elements (Inputs/Buttons):** 0.5rem (8px) corner radius.
- **Property Cards:** 1rem (16px) corner radius to create a soft, "premium" container for photography.
- **Badges/Chips:** Full pill-shape (circular ends) to distinguish them from interactive buttons.

## Components

### Video-Centric Property Cards
Property cards must prioritize video previews. A "Play" icon should be anchored in the center of the image/video area. Price tags are displayed in a high-contrast Tertiary (Amber) pill in the top-right corner (RTL), using the Lakh/Crore format (e.g., **2.5 کروڑ**).

### Voice Search & TTS
A prominent Floating Action Button (FAB) for Voice Search must be present on the home and search screens. Text-to-Speech (TTS) icons (a speaker symbol) should be placed next to property descriptions to assist users with low literacy.

### Icon-Driven Navigation
Avoid text-only menus. Every primary navigation item must have a clear, thick-stroke icon. Bottom navigation labels should be in Urdu (body-md size) but secondary to the visual icon.

### Input Fields
Inputs use a 1px border that thickens and changes to Primary Green on focus. Labels should be right-aligned. For numeric inputs (Price/Area), the keyboard should default to the number pad.

### Buttons
- **Primary:** Solid Green with white Urdu text. High-contrast.
- **Secondary:** Deep Slate border with Slate text.
- **Action Targets:** All buttons must be at least 48px high to ensure accessibility.