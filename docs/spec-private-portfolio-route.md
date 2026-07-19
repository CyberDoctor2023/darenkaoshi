# Portfolio Route Spec

## Goal

Publish the supplied AI product portfolio and resume PDFs under `/p/` inside the existing CyberDoctor site shell. Reuse the homepage global navigation design, expose `作品集` as a normal public destination across the site, and let visitors return to LifeNotes or SenseFlow without leaving `/p` in the resulting URL. Pre-render both documents as lossless PNG images so the pages are ordinary lightweight HTML and do not launch a PDF plugin or PDF.js runtime.

## Non-Goals

- Do not alter, reflow, compress, or rewrite the supplied PDF.
- Do not invent portfolio copy or add a marketing landing page.
- Do not change the site's existing global AI-training crawler policy as part of making the portfolio publicly navigable.

## Completion Conditions

- `/p/` renders all five supplied portfolio pages as lossless PNG images in source order.
- `/p/resume/` renders both supplied resume pages as lossless PNG images in source order.
- A compact secondary tab bar switches between `作品集` and `简历`; the active document is clearly indicated without adding explanatory copy.
- Portfolio PNG pages use the PDF's native 72 dpi page dimensions; A4 resume pages use a 4x 288 dpi render so text remains sharp at desktop reading widths on Retina displays. No JPG/WebP transcode or quality setting is allowed.
- Full-page PNG exports remain in the source PDF directory. For web delivery only, extremely tall pages may be divided into lossless vertical PNG crops with no resampling; the HTML must present those crops edge-to-edge as one continuous page.
- Page images use native lazy loading so long pages below the fold do not block the first page.
- The portfolio page reuses the existing global navigation styling.
- The global navigation contains `CyberDoctor`, `作品集`, `LifeNotes`, `SenseFlow`, `YouTube`, and `GitHub`, in that order. `作品集` is active on portfolio and resume pages.
- `LifeNotes` points to `/` and `SenseFlow` points to `/#senseflow`, so leaving the portfolio removes `/p` from the URL.
- The homepage navigation links directly to `/p/`.
- Portfolio HTML, PNG, and PDF responses use normal public caching and do not request `noindex`, `nofollow`, `noarchive`, or `nosnippet`; the site's existing `noai` and `noimageai` policy remains unchanged.
- The PDF remains byte-identical to the supplied source file.
- Resume sync source of truth is `/Users/jack/Downloads/简历作品集/聂宇杰的 AI PM 简历.pdf`; each sync must replace `p/resume/resume.pdf`, regenerate both `p/resume/pages/page-1-288dpi.png` and `page-2-288dpi.png` locally at 288dpi, visually inspect both pages, and publish content-addressed image URLs so immutable Cloudflare caches cannot retain one stale page.
- Hero case0 glow is rendered by the hero phone container itself and reproduces the first right-side use-case glow in the phone's own coordinate system: `left: 28.13%`, `top: 16.57%`, a 1517px desktop gradient canvas, and an 848px mobile canvas. It reuses the use-case glow color/stops and moves with the phone instead of using page-level coordinates.
- Hero case0 glow must sit above the hero's black background but below the phone screen and device frame; a computed gradient hidden behind the hero stacking context does not satisfy the visual requirement.
- Desktop and mobile layouts keep the navigation usable and the PNG pages visible without overlap.

## Validation Plan

- Compare source and deployed-copy SHA-256 hashes.
- Verify both locally rendered resume PNGs are `2380 × 3368`, and visually inspect page 1 and page 2 before deployment.
- Serve the site locally and open `/p/` directly.
- Verify the portfolio navigation item is present on `/`, `/p/`, and `/p/resume/`.
- Verify LifeNotes and SenseFlow links resolve outside `/p/`.
- Use Ego as the browser for desktop and mobile verification; check navigation scrolling, PNG sizing, rendered content, and overlap.
- In Ego, verify the hero glow's computed horizontal anchor equals the hero phone center at desktop and mobile widths, then inspect screenshots against the use-case cards.
- Inspect `_headers` and portfolio metadata to confirm search-index blocking directives were removed while global AI-training directives remain.
