# Carousel Window/Layout Fix Spec

## Goal

Make the latest LifeNotes homepage stable when the browser viewport changes size and keep every carousel caption fully visible inside its authored card while preserving the fixed phone composition and continuous caption parallax.

## Root-cause research

- Local Ego probe at a 1249px viewport: current slide bounds are `x=82.5..1151.5`; caption bounds are `x=43.5..723.5`; caption computed `translate` is `-103px`; the slide reports `overflow:hidden`.
- The caption parallax path in `src/script.js:updateCopyParallax` clamps only against the phone safe zone. It does not clamp against the slide's left/right paint bounds.
- The slide uses `overflow:hidden` and `contain: layout paint style`. CSS paint containment clips descendants at the containing box. References: [MDN contain](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/contain) and [MDN overflow](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/overflow).
- The resize path calls `scrollToSlide(index, "auto")` while `.carousel-track` computes `scroll-behavior: smooth`. CSSOM `scrollTo` with `behavior: "auto"` follows the element's computed `scroll-behavior`; `behavior: "instant"` is the explicit immediate mode. Reference: [MDN Element.scrollTo](https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollTo).
- Local Ego repro of the resize path recorded `scrollTo({left:1096.5, behavior:"auto"})` with computed `scroll-behavior:"smooth"` and failed the regression assertion.

## Target fix

- Recenter the current slide after resize without calling the normal state-changing `scrollToSlide` path, and use an explicit instant scroll operation so native smooth scrolling is reserved for user-initiated slide changes.
- Clamp every parallax caption to both the card's paint bounds and the phone safe zone. Keep the caption width responsive to the actual card width so the card/phone/caption geometry has a feasible safe interval before parallax is applied.

## Non-goals

- Do not remove native horizontal scrolling or CSS scroll snap.
- Do not change the authored phone width, phone anchors, card height, media loading, copy, or Cloudflare deployment behavior.
- Do not use a post-render detector that hides a clipped caption; fix the geometry and motion inputs that produce it.

## Completion conditions

- A browser window resize from the current window size to a maximized/full viewport does not animate the carousel to a slide and back; the current slide remains selected and is recentered instantly if its snap coordinate changes.
- At desktop widths from 1024px through 1440px, every caption's painted bounding box stays within its slide's left/right bounds while preserving at least a 16px phone gap where the layout has a phone/caption relationship.
- Mobile caption and phone placement remain within the existing card geometry.
- Existing dot navigation, native horizontal scroll, active-slide state, and video playback behavior remain unchanged.

## Validation plan

- Run an Ego browser regression probe at widths `1024, 1100, 1200, 1249, 1280, 1440` and assert caption/card bounds plus phone gap.
- Instrument the resize recenter path and assert it does not request `behavior:"auto"` on the smooth-scrolling track; assert the explicit instant path is used.
- Use Ego screenshots at representative desktop and mobile sizes for visual confirmation.
- Run a source/content review and verify the worktree retains unrelated user untracked files.
