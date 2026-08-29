const POSITION_KEY = 'darenkaoshi:exam-music-position:v1'
const toggle = document.querySelector('[data-route-sound]')
const music = new Audio(new URL('./assets/audio/exam-piano-loop.ogg', import.meta.url).href)

music.loop = true
music.autoplay = true
music.preload = 'auto'
music.volume = 0.16

let lastSavedSecond = -1
let muted = false
let playbackBlocked = false

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

async function startMusic() {
  if (muted || !music.paused) return true
  try {
    await music.play()
    playbackBlocked = false
    updateToggle()
    return true
  } catch (error) {
    playbackBlocked = true
    updateToggle()
    return false
  }
}

function stopMusic() {
  music.pause()
  music.currentTime = 0
}

function updateToggle() {
  if (!toggle) return
  toggle.setAttribute('aria-pressed', String(muted))
  const label = muted ? '开启首页等待音乐' : playbackBlocked ? '点击开启首页等待音乐' : '关闭首页等待音乐'
  const text = muted ? '音乐已关' : playbackBlocked ? '点击开启音乐' : '等待音乐'
  toggle.setAttribute('aria-label', label)
  toggle.innerHTML = `<span aria-hidden="true">${muted ? '◌' : playbackBlocked ? '▶' : '♪'}</span><b>${text}</b>`
}

toggle?.addEventListener('click', () => {
  if (playbackBlocked && !muted) {
    startMusic()
    return
  }
  muted = !muted
  if (muted) stopMusic()
  else startMusic()
  updateToggle()
})

music.addEventListener('loadedmetadata', restorePosition, { once: true })
music.addEventListener('canplay', startMusic)
music.addEventListener('error', () => {
  playbackBlocked = true
  updateToggle()
})
music.addEventListener('timeupdate', () => {
  const second = Math.floor(music.currentTime)
  if (second === lastSavedSecond) return
  lastSavedSecond = second
  savePosition()
})

const unlockMusic = () => {
  startMusic().then((started) => {
    if (!started) return
    window.removeEventListener('pointerdown', unlockMusic)
    window.removeEventListener('keydown', unlockMusic)
  })
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
