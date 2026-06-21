# LifeNotes Homepage Spec

## Goal

Build a LifeNotes product subpage inside a broader CyberDoctor personal portfolio site using the supplied Keynote text and video assets. The page should borrow the interaction structure of Apple's iOS page at `https://www.apple.com/os/ios/?version=no-hero`: a global portfolio nav, Helvetica/SF-like typography, and a horizontal use-case carousel with the current demo centered and neighboring demos peeking at the sides. The visual palette should return to the black Apple-like presentation with the soft glow treatment behind the phone demos.

## Non-Goals

- Do not implement the PRD content from Keynote page 1.
- Do not invent marketing copy beyond the text extracted from Keynote pages 2-7.
- Do not add product claims, pricing, signup flows, FAQ content, or invented section labels.
- Do not include audible video playback.
- Do not follow the Keynote/PDF visual formatting; it is a text source only.
- Do not use the Keynote/PDF slide layout.
- Do not build out full SenseFlow or YouTube pages in this pass; only expose them in the portfolio navigation framework.
- Do not treat client-side anti-crawler code as a replacement for Cloudflare WAF, Bot Fight Mode, or Managed Challenge rules.

## Source Content

- Page 2 hero: `一个支持自然语音操控的AI备忘录`
- Page 3 section title: `Explore use case for lifenotes`
- Page 3 copy: `用自然语音和 LifeNotes 交流，\n以帮你捕捉内容，并整理成清晰的记录。`
- Page 4 copy: `优先级不明确？\n只需轻轻下拉，lifenotes 就能帮你理清轻重缓急。`
- Page 5 copy: `笔记太多，忘记放在哪里？\n只需提问，lifenotes\n就能从过往记录中找到相关内容。`
- Page 6 copy: `需要更多信息时，LifeNotes 也可以连接外部搜索。\n从一个链接、一段问题，到一个需要补充背景的想法，\n都可以帮助你获得更完整的上下文。`
- Page 7 copy: `整个系统，都可以用语音交互。\n删除记录、移动看板、修改事件\n你只要说出来，LifeNotes 就能做到。`

## Design Reference

`extract-design` generated Apple design artifacts under `out/apple-design/`.

Key design signals:
- Colors: `#ffffff`, `#f5f5f7`, `#1d1d1f`, `#000000`, `#6e6e73`, accent `#0071e3`.
- Typography: Apple-style SF Pro Text/Display; this implementation uses Helvetica/Helvetica Neue as requested.
- Layout: dark Apple-inspired canvas, centered content max width around 1260px, horizontal feature carousel cards around 1260x680, current slide centered with adjacent slides partially visible, compact dot controls floating over the gallery like Apple's all-access-pass controls.
- Site framework: the top global navigation represents the CyberDoctor portfolio shell. `CyberDoctor` is the owner/name and must sit at the far upper-left with a higher visual hierarchy than the project links. `LifeNotes`, `SenseFlow`, and `YouTube` are secondary destinations inside that shell. No second floating LifeNotes local nav is shown.
- Use-case copy should sit around the visual middle of each card, not pinned to the bottom, with per-slide line breaks and widths chosen to avoid awkward one-character lines.
- Mobile demos may crop the device vertically to echo the desktop compositions, but must not crop the device horizontally; the phone screen's main information should remain readable.
- Hero headline should be centered within its text area.
- Motion: subtle entrance and scroll reveal, not decorative or loud.
- Motion: active use-case copy should lag slightly behind the slide/card motion, creating the Apple-like offset between content and background. Bottom dotnav should use a single sliding active capsule rather than resizing individual dots in place.
- Shape: Figma-sourced iPhone 17 White Portrait frame from node `2:207`; keep the frame as a separate overlay and use a first-frame poster for the screen content before video playback.
- Typography: hero/section headings around 48px desktop, carousel copy around 28px desktop, secondary/nav around 12-17px.
- Input: support pointer drag and two-finger/trackpad horizontal gestures through native horizontal scrolling plus CSS Scroll Snap. `scroll-snap-stop: always` should keep fast swipes from skipping over use cases.
- Performance: only the visible hero/current carousel video should play; offscreen carousel videos should be paused to avoid simultaneous high-resolution video decoding.
- Carousel state: native scroll, trackpad/two-finger gestures, and dot clicks must all update the same active slide, dot indicator, text opacity, and video playback state.
- Carousel state changes from trackpad/two-finger scrolling should feel immediate, with no extra visual delay compared with dot clicks.
- Carousel should auto-advance through the five use cases when the current demo video finishes, like Apple's iOS highlights gallery, so users can watch without manually clicking each item; do not use a fixed hard-coded timer.
- Carousel videos and their progress should remain idle while the user is still viewing the hero above; start the use-case playback only after the carousel is meaningfully visible or the user explicitly interacts with it.
- Carousel progress should reflect actually rendered playback on the current video. If a browser advances media time but stops painting new frames, the control must not continue showing a fake smooth play state.
- Performance: HDR start-frame videos should decode only long enough to paint their first frame, then pause; they must not all loop continuously in the background.
- Media loading should prewarm nearby carousel videos as compressed browser-cache data while keeping decoding/playback limited to the current slide.
- Perceived loading: mirror Apple's media stack pattern: keep a first-frame image layer and a video layer in the same positioned stack, then fade/hide the image layer once video data is ready so the screen is not black before MP4 loading/decoding catches up.
- Refresh loading: screen containers should also carry the matching first-frame image as a CSS background and preload poster assets so a refresh does not briefly expose a black phone screen before the poster image paints.
- Page resume: after lock screen, tab backgrounding, or bfcache restore, keep the first-frame image visible until the browser has actually painted a decoded video frame again; do not hide the poster merely because `canplay` or `playing` fired.
- Playback: when a use case becomes current through dots, native scroll snap, or drag, its demo video should start automatically without requiring the user to press play. No play/pause button is shown.
- Gesture containment: horizontal carousel gestures should use browser-native scrolling and `overscroll-behavior` instead of custom wheel delta state machines.
- Native-first audit: keep native scroll snap for movement, CSS transitions for visual motion, and only retain JavaScript where state synchronization is required for video playback, active controls, autoplay, and accessibility attributes.

## Completion Conditions

- Homepage opens as the first screen without a landing-page detour.
- Cloudflare Pages serves the site on `cyberdoctor.me`; `www.cyberdoctor.me` is attached as a custom domain and redirects permanently to the apex domain when active.
- Global nav brand is `CyberDoctor`, not `LifeNotes`; it sits at the far upper-left and reads as the primary identity while LifeNotes, SenseFlow, and YouTube read as secondary portfolio destinations.
- All visible marketing text comes from Keynote pages 2-7.
- Feature demos use the provided MP4 files and are muted.
- Feature demos should use the original high-quality muted recordings under `public/videos/`, not the low-bitrate `public/videos/optimized/` transcodes.
- Feature demos should be served as HEVC/H.265 HDR files from the original recordings.
- Use cases switch horizontally in an Apple-like carousel rather than as stacked vertical sections.
- Demo videos render inside the iPhone 17 frame overlay with matching first-frame posters to prevent black-screen flashes.
- Carousel dot controls float over the carousel; no play/pause control is shown.
- Carousel controls do not show flickering compositing rectangles.
- Device demos show stable first-frame posters before playback instead of a black screen flash.
- Refreshing the page should keep a matching first-frame image visible while videos reload.
- Poster-to-video transitions should not show an SDR-to-HDR flash; use matching HDR HEVC start-frame video layers before revealing the main HDR videos, with JPG posters only as the earliest fallback.
- Device demos do not reveal a black video layer after iOS lock/unlock or page visibility restore; the poster remains visible until the resumed video paints.
- Trackpad horizontal swipes inside the carousel use native snap behavior and do not require custom wheel locking.
- Use-case copy does not cover the phone screen and is vertically balanced against the demo placement.
- Mobile layout stacks text then video with no text/video overlap.
- Mobile device placement only crops top/bottom when cropping is needed; no mobile use case should push the phone beyond the left or right card edge.
- Design follows the extracted Apple visual language closely enough for a product homepage adaptation.
- Site declares no AI training/scraping permission through robots directives, response headers, and page metadata, and includes a light client-side guard for obvious AI bot or automated browser access.

## Validation Plan

- Run a local static dev server and inspect the page in a browser.
- Verify Cloudflare Pages custom domain API status for `cyberdoctor.me` and `www.cyberdoctor.me`, and verify DNS/redirect configuration through Cloudflare API because dashboard state can lag.
- Verify all videos load and have `muted` and `playsinline`; only the hero loops, while carousel demos advance on each current video's `ended` event.
- Verify each visible device video has a poster generated from the matching video, and static assets have long-lived cache headers on Cloudflare Pages.
- Verify generated video files have no audio stream where feasible.
- Verify only the current carousel video is playing after slide changes.
- Verify each newly selected use-case video starts automatically.
- Verify horizontal trackpad gestures use native scroll snap and cannot skip snap points under normal fast swipes.
- Check desktop and mobile screenshots for layout, spacing, and text overflow.
- Run a lightweight file/content review for unintended invented copy.
- Verify `robots.txt`, HTML metadata, `_headers`, and the client guard script are deployed and do not affect normal human browser access.
