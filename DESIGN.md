# CarDiag Design System

## Purpose

CarDiag is a mobile-first automotive inspection workspace: calm enough for a private owner, precise enough for a workshop. The interface must feel like a well-made diagnostic tool, never like a generic SaaS dashboard.

This project-specific guide adapts the useful principles from VoltAgent's automotive DESIGN.md collection: disciplined hierarchy, restrained surface treatment, image-led vehicle presentation, explicit selection states, and mobile controls sized for field work. It does not copy any vehicle manufacturer's brand identity.

## Visual direction

- **Atmosphere:** dark graphite workshop, technical but reassuring, with amber only for the current action or active selection.
- **Information density:** one decision at a time in the wizard; dense data is acceptable only in reports, comparisons, and workshop views.
- **Depth:** use borders, tonal surface changes and image composition. Avoid decorative gradients, glassy cards, or heavy shadows.
- **Photography:** actual vehicle and inspection photos have priority over ornamental imagery. Keep aspect ratios intact and label the inspected section clearly.

## Tokens

Use existing CSS variables in `css/styles.css` and theme files; do not add hard-coded colors to feature modules.

| Role | Existing intent |
| --- | --- |
| Canvas | Near-black graphite application background |
| Surface | Slightly lifted dark panel for cards, forms and sheets |
| Ink | High-contrast off-white, never pure white for long text |
| Muted | Cool grey for supporting metadata |
| Primary | CarDiag amber: one primary action or selection per view |
| Success / warning / error | Reserved for inspection statuses, never decorative |

## Typography

- Use **Sora** for headings, buttons and compact navigation.
- Use **Inter** for readable body text, labels and long reports.
- Use **JetBrains Mono** only for OBD codes, VIN snippets, counters and technical meta-data.
- Headings should be short and decisive. On mobile, avoid a heading wrapping to more than three lines.
- Do not simulate a manufacturer font or reuse a manufacturer wordmark as UI typography.

## Components

### Buttons

- All actions need a minimum 48px touch height; 44px is the absolute minimum for small icon-only controls.
- Primary: filled amber, dark label, used once per step for the next meaningful action.
- Secondary: transparent/dark surface with a visible neutral border.
- Destructive: neutral until confirmation; use red only in the confirmation state.
- Disabled buttons must remain legible and explain why when their action is unavailable.

### Selection cards

- Use card grids for vehicle make, model, chassis/generation, year and engine, with the same visual grammar on every step.
- Selected state: amber border and restrained amber-tinted surface. Do not change brand-logo colors.
- Vehicle-brand logos render inside a bounded, `object-fit: contain` area with a neutral fallback label; never use a huge background logo.
- Keep the popular selection grid compact and provide a clear **See all makes** expansion.

### Forms and field feedback

- Inputs use a single clear label, a 48px minimum height and visible focus ring.
- Validate inline after interaction; do not block navigation except for fields explicitly marked required.
- Keep contextual fields exclusive to the selected journey. Common vehicle data must survive a journey change.

### Inspection wizard

- Mobile default: exactly one inspection section visible at a time, with persistent progress and Previous/Next controls at the safe-area bottom.
- The seven-section stepper stays reachable to jump to any section.
- Each control has: title, plain-language description, status choice, optional photo and contextual help.
- For a non-professional, translate technical terms into practical observations before naming the component.
- A photo must retain its section and control identifier so the PDF places it under the correct finding.

### Chat assistant

- The assistant is chat-first only for the Owner diagnostic journey.
- For Buyer, Seller, Mechanic and Rental journeys, show it after the report as an optional “Questions?” action.
- Messages must use the chosen UI language and must never display raw parser or API errors.

### Reports

- The cover uses selected garage branding and the manufacturer logo where available, without modifying either logo’s colors.
- Maintain a clear visual sequence: verdict, overall score, findings by section, budget/negotiation, evidence/photos, signatures.
- Photos appear next to their relevant control, not in a disconnected gallery.
- Buyer and Seller reports may show negotiation range; Owner and professional reports must not invent one.

## Responsive and native behavior

- Start from 320px width. Prevent horizontal overflow during wizard transitions and PDF/report cards.
- Respect `env(safe-area-inset-top)` and `env(safe-area-inset-bottom)` in every fixed header, sheet and bottom CTA.
- When the keyboard opens, scroll the focused input and CTA into a visible region.
- On desktop, richer comparison tables and section overviews are allowed; mobile retains the field-first, one-decision flow.
- Motion is subtle: opacity and short translate transitions around 180–330ms. Respect `prefers-reduced-motion`.

## Non-negotiable design checks

- No mixed French/English UI after a language selection.
- No unlabelled icon-only controls.
- No essential action hidden behind hover.
- No more than one primary CTA in a focused wizard view.
- No decorative brand logo that overwhelms content or breaks the selection grid.
- No visual redesign may break offline storage, PDF evidence mapping, accessibility focus, or the four existing business journeys.
