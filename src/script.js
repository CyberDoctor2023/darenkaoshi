const carousel = document.querySelector("[data-carousel]");
const track = carousel.querySelector(".carousel-track");
const slides = [...carousel.querySelectorAll(".slide")];
const dots = [...carousel.querySelectorAll(".progress-dots button")];
const progressDots = carousel.querySelector(".progress-dots");
const videos = [...document.querySelectorAll("video")];
const heroVideo = document.querySelector(".hero video");

let index = 0;
let previousIndex = -1;
let heroVisible = true;

function loadVideo(video, preload = "metadata") {
  if (!video) return;
  if (!video.src && video.dataset.src) {
    video.src = video.dataset.src;
  }
  video.preload = preload;
  if (video.readyState < 2) {
    video.load();
  }
}

function markReady(video) {
  if (!video) return;
  video.classList.toggle("is-ready", video.readyState >= 2);
}

function setMutedVideos() {
  videos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.addEventListener("loadeddata", () => markReady(video), { once: true });
    video.addEventListener("playing", () => markReady(video));
    markReady(video);
  });
}

function playQuietly(video) {
  if (!video) return;
  video.autoplay = true;
  loadVideo(video, "auto");
  if (!video.paused) return;
  const playPromise = video.play();
  if (playPromise) playPromise.catch(() => {});
}

function pauseVideo(video) {
  if (!video || video.paused) return;
  video.pause();
}

function updateVideoPlayback() {
  slides.forEach((slide, slideIndex) => {
    const video = slide.querySelector("video");
    if (slideIndex === index) {
      if (previousIndex !== index && video) {
        video.currentTime = 0;
      }
      playQuietly(video);
    } else if (Math.abs(slideIndex - index) === 1) {
      loadVideo(video, "metadata");
      pauseVideo(video);
    } else {
      pauseVideo(video);
    }
  });

  if (heroVisible) {
    playQuietly(heroVideo);
  } else {
    pauseVideo(heroVideo);
  }
}

function setCurrent(nextIndex) {
  previousIndex = index;
  index = (nextIndex + slides.length) % slides.length;
  slides.forEach((slide, slideIndex) => {
    const isCurrent = slideIndex === index;
    slide.classList.toggle("is-current", isCurrent);
    slide.toggleAttribute("inert", !isCurrent);
    slide.setAttribute("aria-hidden", String(!isCurrent));
  });
  dots.forEach((dot, dotIndex) => {
    dot.classList.toggle("is-active", dotIndex === index);
  });
  progressDots.style.setProperty("--active-dot", index);
  updateVideoPlayback();
}

function scrollToSlide(nextIndex, behavior = "smooth") {
  const boundedIndex = (nextIndex + slides.length) % slides.length;
  const slide = slides[boundedIndex];
  track.scrollTo({
    left: slide.offsetLeft + slide.offsetWidth / 2 - track.clientWidth / 2,
    behavior,
  });
  setCurrent(boundedIndex);
}

dots.forEach((dot, dotIndex) => {
  dot.addEventListener("click", () => {
    scrollToSlide(dotIndex);
  });
});

if ("IntersectionObserver" in window) {
  const slideObserver = new IntersectionObserver(
    (entries) => {
      const centered = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!centered) return;
      const nextIndex = slides.indexOf(centered.target);
      if (nextIndex !== -1 && nextIndex !== index) setCurrent(nextIndex);
    },
    {
      root: track,
      threshold: [0.55, 0.7, 0.85],
    }
  );
  slides.forEach((slide) => slideObserver.observe(slide));
}

if ("IntersectionObserver" in window && heroVideo) {
  const heroObserver = new IntersectionObserver(
    ([entry]) => {
      heroVisible = entry.isIntersecting;
      updateVideoPlayback();
    },
    { threshold: 0.18 }
  );
  heroObserver.observe(heroVideo);
}

window.addEventListener("resize", () => {
  window.requestAnimationFrame(() => scrollToSlide(index, "auto"));
});

setMutedVideos();
setCurrent(0);
scrollToSlide(0, "auto");
