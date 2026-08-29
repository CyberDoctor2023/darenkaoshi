const AUDIO_KEY = 'darenkaoshi:route-music-muted:v1'
const toggle = document.querySelector('[data-route-sound]')
const music = new Audio('../assets/audio/happy-clappy-loop.wav')

music.loop = true
music.preload = 'auto'
music.volume = 0.16

let muted = false
try {
  muted = window.localStorage.getItem(AUDIO_KEY) === '1'
} catch (error) {
  muted = false
}

function updateToggle() {
  if (!toggle) return
  toggle.setAttribute('aria-pressed', String(muted))
  toggle.setAttribute('aria-label', muted ? '开启首页等待音乐' : '关闭首页等待音乐')
  toggle.innerHTML = `<span aria-hidden="true">${muted ? '◌' : '♪'}</span><b>${muted ? '音乐已关' : '等待音乐'}</b>`
}

function startMusic() {
  if (muted || !music.paused) return
  music.play().catch(() => {})
}

function stopMusic() {
  music.pause()
  music.currentTime = 0
}

function rememberPreference() {
  try {
    window.localStorage.setItem(AUDIO_KEY, muted ? '1' : '0')
  } catch (error) {
    // A blocked storage API should not block the route page.
  }
}

toggle?.addEventListener('click', () => {
  muted = !muted
  rememberPreference()
  if (muted) stopMusic()
  else startMusic()
  updateToggle()
})

const unlockMusic = () => {
  startMusic()
  window.removeEventListener('pointerdown', unlockMusic)
  window.removeEventListener('keydown', unlockMusic)
}

window.addEventListener('pointerdown', unlockMusic, { passive: true })
window.addEventListener('keydown', unlockMusic, { passive: true })
updateToggle()
startMusic()
