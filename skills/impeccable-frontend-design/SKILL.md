---
name: impeccable-frontend-design
description: Eliminates generic AI slop from frontend user interfaces with deterministic design rules and design polish workflows. Use when crafting bespoke UI/UX, running design audits, eliminating generic AI patterns like default Inter fonts, purple-blue gradients, or nested card borders, or polishing web typography and spacing.
---

# Impeccable Frontend Design

## Overview

AI-generated frontend interfaces frequently suffer from unmistakable "AI Slop": lazy default Inter typefaces, monotonous purple-to-blue neon gradients, repetitive card-inside-a-card layouts, identical rounded corners, and lack of visual soul.

Synthesizing principles from `pbakaus/impeccable` and `Leonxlnx/taste-skill`, this skill enforces **61 deterministic design heuristics** and structured design commands (`audit`, `critique`, `polish`, `harden`). It elevates frontend engineering from generic boilerplate to production-grade interfaces with intentional typography, bespoke palettes, rhythmic spatial scales, and authentic tactile interactions.

## When to Use

- Building or refining production web user interfaces, dashboards, or landing pages
- Purging generic AI aesthetics, repetitive components, or clichéd visual patterns
- Auditing Tailwind, CSS, or component libraries against deterministic design detectors
- Polishing typography hierarchies, font pairings, contrast ratios, and spacing rhythms
- Hardening UI for accessible contrast (WCAG AAA), touch targets, and reduced-motion states

**When NOT to use:**
- Backend API design or database schema modeling — use `api-and-interface-design`
- Basic accessibility compliance auditing without design polish — use `frontend-ui-engineering`
- General text or prose editing unrelated to UI — use `unslop-code-and-prose`

## The 4 Design Commands

```
┌────────────────────────────────────────────────────────────────────────┐
│                   THE 4 DESIGN COMMAND WORKFLOWS                       │
├────────────────────────────────────────────────────────────────────────┤
│ 1. /impeccable audit    → Run deterministic rules (0 LLM token cost)   │
│ 2. /impeccable critique → Socratic visual appraisal (hierarchy, rhythm)│
│ 3. /impeccable polish   → Elevate typography, micro-spacing & lighting  │
│ 4. /impeccable harden   → WCAG AAA contrast, touch targets, reduced-mo │
└────────────────────────────────────────────────────────────────────────┘
```

### 1. Deterministic Design Detectors (The Anti-Slop Rules)

Apply these hard rules across all stylesheets and components:

#### Typography Rules
- **Ban Default Inter Everywhere**: Never set `font-sans: Inter` by default. Choose intentional font pairings that reflect the product domain (e.g., editorial serif headers like Newsreader/Instrument Serif paired with clean sans, or functional monospaces like JetBrains Mono/Geist Mono for data displays).
- **Proportional Tracking**: Enforce negative letter-spacing on large display headings (`tracking-tight` / `-0.02em` to `-0.04em`) and neutral or slightly expanded tracking on small uppercase labels (`tracking-wide` / `+0.05em`).
- **Strict Line Heights**: Enforce tight line heights on large headings (`leading-none` or `leading-tight`, 1.05–1.15) and comfortable line heights on body paragraphs (`leading-relaxed`, 1.5–1.65).

#### Color and Lighting Rules
- **Ban Clichéd AI Gradients**: Never use generic `from-indigo-500 via-purple-500 to-pink-500` gradient text or backgrounds.
- **Natural Light & Tonal Hierarchy**: Treat surfaces as having a consistent directional light source. Elevated layers receive subtle translucent white top highlights (`border-t border-white/10`) and diffuse soft ambient shadows rather than harsh drop shadows.
- **Semantic Color Tokens**: Ground all colors in functional tokens (`surface-subtle`, `text-primary`, `border-muted`) rather than raw arbitrary hex codes.

#### Layout and Surface Rules
- **Ban Russian-Nesting-Doll Cards**: Never nest a bordered card inside a bordered card inside a bordered modal. Demarcate secondary sections with subtle background tone shifts (`bg-muted/30`) or simple white-space breathing room rather than adding additional border boxes.
- **8pt Spatial Grid Discipline**: Enforce strict rhythmic spacing steps (`gap-2`, `gap-4`, `gap-6`, `gap-8`). Never use arbitrary ad-hoc margins (`mt-[17px]`).
- **Responsive Padding Stratification**: Mobile viewports receive compact edge padding (`p-4`), desktop viewports receive generous breathing space (`p-8` or `p-12`).

#### Interaction and Tactile Feel
- **Natural Springs Over Linear Transitions**: Never use `transition-all duration-300 linear`. Use intentional spring easing (`cubic-bezier(0.16, 1, 0.3, 1)`) with quick micro-durations (`150ms–200ms`).
- **Explicit Focus Rings**: Ensure distinct, high-contrast, offset focus rings (`focus-visible:ring-2 focus-visible:ring-offset-2`).

### 2. Design Polish Checklist

When reviewing or generating UI components:

```
[ ] Typography: Heading font is domain-intentional, not generic system fallback
[ ] Hierarchy: Primary action stands out; secondary actions do not compete
[ ] Surfaces: Depth created via tonal contrast and ambient light, not nested boxes
[ ] Spacing: Elements conform to 4px/8px rhythm; no visual overcrowding
[ ] Tactile feedback: Buttons and interactive cards feature responsive hover and press states
[ ] Accessibility: Contrast passes WCAG AAA standards for text against all background tones
```

## Common Rationalizations

| Rationalization | Reality |
|---|---|
| "Inter and purple gradients look modern and clean." | They are the ubiquitous signature of low-effort AI slop. Modern production design demands intentional branding, bespoke palettes, and typographic character. |
| "Adding another card border helps organize the content." | Stacking bordered containers creates visual noise and claustrophobic interfaces. Subtle background tints and whitespace organize content far more cleanly. |
| "Fast linear transitions are fine." | Linear transitions feel mechanical and stiff. Eased spring curves feel responsive and natural. |

## Red Flags

- Defaulting to `Inter` without evaluating typography context
- Using neon purple/cyan gradients for headers or primary button backgrounds
- Stacking more than two nested bordered boxes (`div.border > div.border > div.border`)
- Using inconsistent arbitrary pixel margins (`margin-top: 13px`)
- Omitting active and focus-visible states on interactive elements

## Verification

Before finalizing frontend UI changes, verify:

- [ ] Zero clichéd AI gradients or unstyled default typefaces
- [ ] Nested card borders replaced with tonal shifts or whitespace
- [ ] Typography scale, tracking, and leading are proportionally balanced
- [ ] 8pt grid alignment verified across desktop and mobile breakpoints
- [ ] Contrast ratios meet WCAG standards and keyboard focus rings are visible
