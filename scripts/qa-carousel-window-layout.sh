#!/bin/sh
set -eu

ego-browser nodejs <<'EOF'
const task = await useOrCreateTaskSpace('lifenotes-layout-debug')
await cdp('Network.setCacheDisabled', { cacheDisabled: true })
await gotoAndWait('http://127.0.0.1:8787/?qa=carousel-window-layout', { timeout: 20, settle: 0.3 })
await cdp('Page.reload', { ignoreCache: true })
await wait(0.3)

const widths = [390, 768, 834, 1024, 1100, 1200, 1249, 1280, 1440]
for (const width of widths) {
  await cdp('Emulation.setDeviceMetricsOverride', {
    width,
    height: 900,
    deviceScaleFactor: 1,
    mobile: false,
  })
  await wait(0.8)

  const report = await js(`(() => {
    refreshSlideMetrics()
    updateCopyParallax()
    return [...document.querySelectorAll('.slide')].map((slide, index) => {
      const copy = slide.querySelector('p')
      const phone = slide.querySelector('.iphone-frame')
      const slideRect = slide.getBoundingClientRect()
      const copyRect = copy.getBoundingClientRect()
      const phoneRect = phone.getBoundingClientRect()
      const verticalOverlap = copyRect.bottom > phoneRect.top && copyRect.top < phoneRect.bottom
      return {
        index,
        kind: [...slide.classList].find((name) => name.startsWith('slide-device-')),
        slide: { left: slideRect.left, right: slideRect.right },
        copy: { left: copyRect.left, right: copyRect.right },
        phone: { left: phoneRect.left, right: phoneRect.right },
        verticalOverlap,
      }
    })
  })()`)

  cliLog(`width=${width} ${JSON.stringify(report)}`)
  const failures = report.filter((item) => {
    const outside = item.copy.left < item.slide.left - 0.5 || item.copy.right > item.slide.right + 0.5
    const overlapsPhone = item.verticalOverlap && (
      (item.kind === 'slide-device-right' && item.copy.right > item.phone.left - 15.5) ||
      (item.kind === 'slide-device-left' && item.copy.left < item.phone.right + 15.5)
    )
    return outside || overlapsPhone
  })
  if (failures.length) throw new Error(`caption/card/phone geometry failed at width ${width}`)
}

const resizeReport = await js(`(() => {
  const track = document.querySelector('.carousel-track')
  const original = track.scrollTo.bind(track)
  const calls = []
  track.scrollTo = (...args) => {
    calls.push(args)
    return original(...args)
  }
  if (typeof recenterCurrentSlide !== 'function') {
    scrollToSlide(index, 'auto')
    return { mode: 'legacy', calls, behavior: getComputedStyle(track).scrollBehavior }
  }
  recenterCurrentSlide()
  return { mode: 'instant', calls, behavior: getComputedStyle(track).scrollBehavior }
})()`)

cliLog(`resize=${JSON.stringify(resizeReport)}`)
if (resizeReport.mode !== 'instant' || resizeReport.calls.some((args) => args[0]?.behavior !== 'instant')) {
  throw new Error('resize recentering is not an explicit instant scroll')
}
EOF
