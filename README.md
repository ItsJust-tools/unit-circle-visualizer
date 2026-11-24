# Unit Circle Visualizer

An interactive unit circle explorer for students, teachers and anyone brushing up on trigonometry. Drag the pointer around the circle (or type an angle) and instantly see degrees, radians, all six trig values and the quadrant — with exact radian forms for special angles.

**Live:** [unit-circle-visualizer.itsjust.tools](https://unit-circle-visualizer.itsjust.tools)

## Features

- Interactive draggable angle pointer on a live SVG unit circle
- Angle input in degrees and radians with instant sync
- Live display of `sin`, `cos`, `tan`, `csc`, `sec`, `cot` values (undefined reciprocals marked)
- Quadrant and reference-angle indicator
- Special-angle quick presets (0°, 30°, 45°, 60°, 90°, …) in degrees and exact radian form (π/6, π/4, …)
- Radian value shown as decimal and exact form (multiples of π)
- Toggle to animate pointer rotation and to show/hide the tangent line
- Copy all trig values to the clipboard and shareable state via URL params
- Snapshot coordinates into the sidebar history
- Shareable state via URL, `.itsjust.json` import/export and image/PDF export
- 100% client-side — no data ever leaves the browser

## Getting Started

```bash
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to use the tool.

## Running Tests

```bash
npm test            # unit tests
npm run test:e2e    # Playwright end-to-end tests
npm run lint        # ESLint
npx tsc --noEmit    # type checks
```

## Building for Production

```bash
npm run build
npm start
```

## Tech Stack

- Next.js (App Router) + React
- Tailwind CSS
- TypeScript
- Vitest + Testing Library (unit), Playwright (e2e)
- `@itsjust/core` tool shell (import/export, theming, persistence)

## License

MIT
