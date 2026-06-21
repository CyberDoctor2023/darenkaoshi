const carousel = document.querySelector("[data-carousel]");
const track = carousel.querySelector(".carousel-track");
const slides = [...carousel.querySelectorAll(".slide")];
const dots = [...carousel.querySelectorAll(".progress-dots button")];
const progressDots = carousel.querySelector(".progress-dots");
const videos = [...document.querySelectorAll(".screen-video")];
const posterVideos = [...document.querySelectorAll(".screen-poster-video")];
const heroVideo = document.querySelector(".hero .screen-video");

let index = 0;
let previousIndex = -1;
let heroVisible = true;

function getScreen(video) {
  return video?.closest(".screen");
}

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

function revealVideo(video) {
  if (!video) return;
  video.classList.add("is-ready");
  getScreen(video)?.classList.add("is-video-ready");
}

function showPoster(video) {
  if (!video) return;
  video.dataset.paintToken = "";
  video.classList.remove("is-ready");
  getScreen(video)?.classList.remove("is-video-ready");
}

function waitForPaintedFrame(video) {
  if (!video || video.paused || video.readyState < 2) return;

  const token = `${performance.now()}-${Math.random()}`;
  video.dataset.paintToken = token;

  const revealIfCurrent = () => {
    if (video.dataset.paintToken !== token || video.paused || document.hidden) return;
    revealVideo(video);
  };

  if ("requestVideoFrameCallback" in video) {
    video.requestVideoFrameCallback(() => {
      requestAnimationFrame(revealIfCurrent);
    });
    return;
  }

  const onTimeUpdate = () => {
    if (video.currentTime <= 0 && video.readyState < 3) return;
    video.removeEventListener("timeupdate", onTimeUpdate);
    requestAnimationFrame(() => requestAnimationFrame(revealIfCurrent));
  };

  video.addEventListener("timeupdate", onTimeUpdate, { once: false });

  window.setTimeout(() => {
    if (!video.paused && video.readyState >= 3) revealIfCurrent();
  }, 480);
}

function setMutedVideos() {
  posterVideos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.addEventListener("loadeddata", () => video.classList.add("is-ready"), { once: true });
    video.addEventListener("playing", () => video.classList.add("is-ready"), { once: true });
    const playPromise = video.play();
    if (playPromise) playPromise.catch(() => {});
  });

  videos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.addEventListener("loadeddata", () => waitForPaintedFrame(video), { once: true });
    video.addEventListener("canplay", () => waitForPaintedFrame(video));
    video.addEventListener("playing", () => waitForPaintedFrame(video));
    video.addEventListener("waiting", () => showPoster(video));
    video.addEventListener("stalled", () => showPoster(video));
    video.addEventListener("emptied", () => showPoster(video));
  });
}

function playQuietly(video) {
  if (!video) return;
  video.autoplay = true;
  loadVideo(video, "auto");
  if (!video.paused) {
    waitForPaintedFrame(video);
    return;
  }
  const playPromise = video.play();
  if (playPromise) {
    playPromise.then(() => waitForPaintedFrame(video)).catch(() => {});
  }
}

function pauseVideo(video) {
  if (!video || video.paused) return;
  video.pause();
}

function updateVideoPlayback() {
  slides.forEach((slide, slideIndex) => {
    const video = slide.querySelector(".screen-video");
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

function restoreAfterPageResume() {
  videos.forEach(showPoster);
  window.setTimeout(updateVideoPlayback, 120);
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

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    videos.forEach((video) => {
      showPoster(video);
      pauseVideo(video);
    });
    return;
  }
  restoreAfterPageResume();
});

window.addEventListener("pagehide", () => {
  videos.forEach((video) => {
    showPoster(video);
    pauseVideo(video);
  });
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) restoreAfterPageResume();
});

setMutedVideos();
setCurrent(0);
scrollToSlide(0, "auto");
