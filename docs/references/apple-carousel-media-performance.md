# Apple Carousel Media Performance Research

Research date: 2026-07-13

## Question

How does Apple's current iOS highlights gallery avoid unnecessary video loading and decoding, and what should the LifeNotes carousel copy from that architecture?

## Apple Page Evidence

Source inspected in EGO: <https://www.apple.com/os/ios/>

- Each animated highlight contains a normal MP4 plus separate start-frame and end-frame JPG images.
- Highlight video elements report `preload="none"` and `autoplay=false`.
- Start-frame images remain available as the stable visual layer while the gallery controller decides when to load and play a video.
- The inspected cards use full-card `1260x680` media compositions. Device framing and copy placement are already part of each card's authored media/layout rather than additional always-running media layers.
- The gallery may fetch an activated card and nearby cards after interaction, but the markup does not eagerly autoplay every card at document load.

## Browser Platform Evidence

- web.dev video performance: <https://web.dev/learn/performance/video-performance>
  - Recommends posters with `preload="none"` or `preload="metadata"` to avoid default video downloads.
  - Recommends activating video near the viewport with Intersection Observer.
- HTML Living Standard: <https://html.spec.whatwg.org/multipage/media.html>
  - `preload` is a hint, while `autoplay` can override it because playback requires buffering.
  - Authors can change `preload` from `none` to `auto` when a video is actually requested.

## LifeNotes Evidence

Local page inspected in EGO at `http://localhost:5173/`:

- Six `.screen-poster-video` elements use `autoplay` and `preload="auto"`.
- A refresh produced 11 MP4 resource timing entries.
- All 12 video elements reached `readyState=4`, including non-current carousel videos.
- Cached transfer size can be zero while HEVC/HDR decoder setup and decoded-frame memory still consume resources.
- Inactive copy uses `filter: blur(1px)`, adding avoidable compositing work during horizontal scrolling.

## Recommendation

1. Remove the six start-frame MP4 layers from the default loading path. Keep static start-frame images visible until the selected main video paints a decoded frame.
2. Give every non-hero carousel video `preload="none"`, no `autoplay`, and no `src` until the carousel is near the viewport.
3. Activate the current video, then prepare only the next video after current playback is stable and the browser is idle. Clean A/B testing showed that strict single-decoder cold starts moved HDR setup into the transition path and worsened rAF frame intervals.
4. Pause a slide immediately when it stops being current, but clear distant `src` values and call `load()` only in an idle callback. Keep current plus next prepared to balance transition latency and decoder memory.
5. Remove inactive-copy blur and retain opacity/translation for focus motion.
6. Keep `requestVideoFrameCallback` for progress synchronization because it tracks rendered frames rather than a timer.

## Motion And Control Evidence

- Apple caption sampling during a gallery transition kept both outgoing and incoming captions at `opacity: 1`; their screen position changed with the native gallery scroll instead of a delayed secondary text reveal.
- Apple's `56px` control measured `112px` above the bottom of its `680px` authored card, inside a content-safe lower region. LifeNotes phones extend through that region, so its control should use a dedicated lane below the card rather than covering the device.

## Constraints

- Preserve the original HEVC/H.265 HDR main recordings.
- Do not add an H.264 fallback.
- Preserve stable poster-to-video behavior and avoid black frames after page resume.
- Validate poster/HDR color matching before removing the current short HDR start-frame videos from production.
