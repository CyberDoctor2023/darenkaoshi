const music = new Audio('../assets/audio/exam-piano-loop.ogg')

music.loop = true
music.autoplay = true
music.preload = 'auto'
music.volume = 0.16
music.load()

function startMusic() {
  if (!music.paused) return
  music.play().catch(() => {})
}

const unlockMusic = () => {
  startMusic()
  window.removeEventListener('pointerdown', unlockMusic)
  window.removeEventListener('keydown', unlockMusic)
}

window.addEventListener('pointerdown', unlockMusic, { passive: true })
window.addEventListener('keydown', unlockMusic, { passive: true })
window.addEventListener('pageshow', startMusic)
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') startMusic()
})

startMusic()
