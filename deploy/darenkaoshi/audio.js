const POSITION_KEY = 'darenkaoshi:exam-music-position:v1'
const MUTE_KEY = 'darenkaoshi:exam-music-muted:v1'
const toggle = document.querySelector('[data-route-sound]')
const music = new Audio(new URL('./assets/audio/exam-piano-loop.ogg', import.meta.url).href)

music.loop = true
music.autoplay = true
music.preload = 'auto'
music.volume = 0.16

let lastSavedSecond = -1
let muted = false

try {
  muted = window.localStorage.getItem(MUTE_KEY) === '1'
} catch (error) {
  muted = false
}

function restorePosition() {
  try {
    const savedPosition = Number(window.sessionStorage.getItem(POSITION_KEY))
    if (Number.isFinite(savedPosition) && savedPosition >= 0 && music.duration) {
      music.currentTime = savedPosition % music.duration
    }
  } catch (error) {
    // A blocked session storage API should not block audio playback.
  }
}

function savePosition() {
  if (!Number.isFinite(music.currentTime)) return
  try {
    window.sessionStorage.setItem(POSITION_KEY, String(music.currentTime))
  } catch (error) {
    // A blocked session storage API should not block page navigation.
  }
}

function startMusic() {
  if (muted || !music.paused) return
  music.play().catch(() => {})
}

function stopMusic() {
  music.pause()
  music.currentTime = 0
}

function updateToggle() {
  if (!toggle) return
  toggle.setAttribute('aria-pressed', String(muted))
  toggle.setAttribute('aria-label', muted ? '开启首页等待音乐' : '关闭首页等待音乐')
  toggle.innerHTML = `<span aria-hidden="true">${muted ? '◌' : '♪'}</span><b>${muted ? '音乐已关' : '等待音乐'}</b>`
}

toggle?.addEventListener('click', () => {
  muted = !muted
  try {
    window.localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch (error) {
    // A blocked storage API should not block page audio.
  }
  if (muted) stopMusic()
  else startMusic()
  updateToggle()
})

music.addEventListener('loadedmetadata', restorePosition, { once: true })
music.addEventListener('timeupdate', () => {
  const second = Math.floor(music.currentTime)
  if (second === lastSavedSecond) return
  lastSavedSecond = second
  savePosition()
})

const unlockMusic = () => {
  startMusic()
  window.removeEventListener('pointerdown', unlockMusic)
  window.removeEventListener('keydown', unlockMusic)
}

window.addEventListener('pointerdown', unlockMusic, { passive: true })
window.addEventListener('keydown', unlockMusic, { passive: true })
window.addEventListener('pageshow', startMusic)
window.addEventListener('pagehide', savePosition)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') startMusic()
  else savePosition()
})

music.load()
updateToggle()
startMusic()
