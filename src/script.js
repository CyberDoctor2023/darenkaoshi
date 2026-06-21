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
let scrollRaf = 0;
let scrollEndTimer = 0;
let hasPrewarmedCarousel = false;
let carouselVisible = false;
let carouselStarted = false;
let playbackIndex = -1;
let progressFrameRequest = 0;
let progressFrameVideo = null;

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
  const screen = getScreen(video);
  video.classList.add("is-ready");
  screen?.classList.add("is-video-ready");
  window.setTimeout(() => {
    if (video.classList.contains("is-ready") && !video.paused && !document.hidden) {
      screen?.classList.add("is-fallback-hidden");
    }
  }, 180);
}

function showPoster(video) {
  if (!video) return;
  const screen = getScreen(video);
  video.dataset.paintToken = "";
  video.classList.remove("is-ready");
  screen?.classList.remove("is-video-ready");
  screen?.classList.remove("is-fallback-hidden");
}

function setSlideProgress(value) {
  const progress = Math.max(0, Math.min(1, value));
  progressDots.style.setProperty("--slide-progress", progress);
  progressDots.style.setProperty("--slide-progress-pct", `${progress * 100}%`);
}

function stopRenderedProgress() {
  if (progressFrameRequest && progressFrameVideo && "cancelVideoFrameCallback" in progressFrameVideo) {
    progressFrameVideo.cancelVideoFrameCallback(progressFrameRequest);
  } else if (progressFrameRequest) {
    window.cancelAnimationFrame(progressFrameRequest);
  }

  progressFrameRequest = 0;
  progressFrameVideo = null;
}

function getVideoSlideIndex(video) {
  const slide = video?.closest(".slide");
  return slides.indexOf(slide);
}

function updateSlideProgress(video) {
  if (getVideoSlideIndex(video) !== index || !Number.isFinite(video.duration) || video.duration <= 0) return;
  setSlideProgress(video.currentTime / video.duration);
}

function startRenderedProgress(video) {
  if (!video || getVideoSlideIndex(video) !== index) return;

  stopRenderedProgress();
  progressFrameVideo = video;

  const keepGoing = () => {
    return progressFrameVideo === video && getVideoSlideIndex(video) === index && !video.paused && !video.ended && carouselVisible && !document.hidden;
  };

  if ("requestVideoFrameCallback" in video) {
    const tick = () => {
      if (!keepGoing()) {
        stopRenderedProgress();
        return;
      }

      updateSlideProgress(video);
      progressFrameRequest = video.requestVideoFrameCallback(tick);
    };

    progressFrameRequest = video.requestVideoFrameCallback(tick);
    return;
  }

  const tick = () => {
    if (!keepGoing()) {
      stopRenderedProgress();
      return;
    }

    updateSlideProgress(video);
    progressFrameRequest = window.requestAnimationFrame(tick);
  };

  progressFrameRequest = window.requestAnimationFrame(tick);
}

function advanceAfterVideoEnd(video) {
  const slideIndex = getVideoSlideIndex(video);
  if (slideIndex !== index || !carouselVisible || document.hidden) return;
  stopRenderedProgress();
  setSlideProgress(1);
  scrollToSlide((index + 1) % slides.length);
}

function pauseOnFirstPaint(video) {
  if (!video) return;
  const markReady = () => {
    video.classList.add("is-ready");
    video.pause();
  };

  if ("requestVideoFrameCallback" in video) {
    video.requestVideoFrameCallback(() => {
      requestAnimationFrame(markReady);
    });
    return;
  }

  video.addEventListener("timeupdate", markReady, { once: true });
  window.setTimeout(markReady, 600);
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
    video.addEventListener("loadeddata", () => pauseOnFirstPaint(video), { once: true });
    video.addEventListener("playing", () => pauseOnFirstPaint(video), { once: true });
    const playPromise = video.play();
    if (playPromise) playPromise.then(() => pauseOnFirstPaint(video)).catch(() => {});
  });

  videos.forEach((video) => {
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.playsInline = true;
    video.addEventListener("loadeddata", () => waitForPaintedFrame(video), { once: true });
    video.addEventListener("canplay", () => waitForPaintedFrame(video));
    video.addEventListener("playing", () => {
      waitForPaintedFrame(video);
      if (getVideoSlideIndex(video) === index) startRenderedProgress(video);
    });
    video.addEventListener("pause", () => {
      if (progressFrameVideo === video) stopRenderedProgress();
    });
    video.addEventListener("ended", () => advanceAfterVideoEnd(video));
    video.addEventListener("waiting", () => {
      if (progressFrameVideo === video) stopRenderedProgress();
      showPoster(video);
    });
    video.addEventListener("stalled", () => {
      if (progressFrameVideo === video) stopRenderedProgress();
      showPoster(video);
    });
    video.addEventListener("emptied", () => {
      if (progressFrameVideo === video) stopRenderedProgress();
      showPoster(video);
    });
  });
}

function playQuietly(video) {
  if (!video) return;
  video.autoplay = true;
  loadVideo(video, "auto");
  if (!video.paused) {
    waitForPaintedFrame(video);
    if (getVideoSlideIndex(video) === index) startRenderedProgress(video);
    return;
  }
  const playPromise = video.play();
  if (playPromise) {
    playPromise
      .then(() => {
        waitForPaintedFrame(video);
        if (getVideoSlideIndex(video) === index) startRenderedProgress(video);
      })
      .catch(() => {});
  }
}

function pauseVideo(video, restoreFallback = false) {
  if (!video) return;
  if (!video.paused) video.pause();
  if (restoreFallback) showPoster(video);
}

function prewarmCarouselVideos() {
  if (hasPrewarmedCarousel) return;
  hasPrewarmedCarousel = true;
  slides.forEach((slide) => {
    const video = slide.querySelector(".screen-video");
    const slideIndex = getVideoSlideIndex(video);
    if (slideIndex === index || Math.abs(slideIndex - index) === 1) {
      loadVideo(video, "auto");
    } else {
      loadVideo(video, "metadata");
    }
  });
}

function activateCarousel() {
  carouselStarted = true;
  if (carouselVisible) {
    playCurrentVideo();
    return;
  }
  carouselVisible = true;
  playCurrentVideo();
}

function resetVideo(video) {
  if (!video) return;
  const reset = () => {
    try {
      video.currentTime = 0;
    } catch (_) {}
  };

  if (video.readyState > 0) {
    reset();
    return;
  }

  video.addEventListener("loadedmetadata", reset, { once: true });
}

function preloadNeighborVideos() {
  slides.forEach((slide, slideIndex) => {
    const video = slide.querySelector(".screen-video");
    if (slideIndex === index) return;
    if (Math.abs(slideIndex - index) === 1) {
      loadVideo(video, "auto");
    } else {
      loadVideo(video, "metadata");
    }
  });
}

function pauseNonCurrentVideos() {
  slides.forEach((slide, slideIndex) => {
    if (slideIndex === index) return;
    const video = slide.querySelector(".screen-video");
    pauseVideo(video, previousIndex === slideIndex);
  });
}

function playCurrentVideo() {
  pauseNonCurrentVideos();

  const currentVideo = slides[index]?.querySelector(".screen-video");
  if (carouselStarted && carouselVisible && currentVideo) {
    preloadNeighborVideos();
    if (playbackIndex !== index) {
      resetVideo(currentVideo);
      setSlideProgress(0);
      playbackIndex = index;
    }
    playQuietly(currentVideo);
  } else {
    pauseVideo(currentVideo, true);
  }

  if (heroVisible) {
    playQuietly(heroVideo);
  } else {
    pauseVideo(heroVideo, true);
  }
}

function restoreAfterPageResume() {
  videos.forEach(showPoster);
  window.setTimeout(playCurrentVideo, 120);
}

function setCurrent(nextIndex) {
  if (nextIndex === index && previousIndex !== -1) return;
  stopRenderedProgress();
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
  setSlideProgress(0);
  playCurrentVideo();
}

function setInitialCurrent(nextIndex) {
  index = (nextIndex + slides.length) % slides.length;
  previousIndex = -1;
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
  setSlideProgress(0);
}

function getDominantSlideIndex() {
  const trackRect = track.getBoundingClientRect();
  let dominantIndex = index;
  let dominantWidth = 0;

  slides.forEach((slide, slideIndex) => {
    const rect = slide.getBoundingClientRect();
    const visibleWidth = Math.max(0, Math.min(rect.right, trackRect.right) - Math.max(rect.left, trackRect.left));
    if (visibleWidth > dominantWidth) {
      dominantWidth = visibleWidth;
      dominantIndex = slideIndex;
    }
  });

  return dominantIndex;
}

function getSlideSnapLeft(slide) {
  return slide.offsetLeft + slide.offsetWidth / 2 - track.clientWidth / 2;
}

function syncCurrentFromScroll() {
  const nextIndex = getDominantSlideIndex();
  if (nextIndex !== index) {
    setCurrent(nextIndex);
  }
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
    activateCarousel();
    prewarmCarouselVideos();
    scrollToSlide(dotIndex);
  });
});

track.addEventListener(
  "scroll",
  () => {
    activateCarousel();
    prewarmCarouselVideos();
    if (!scrollRaf) {
      scrollRaf = window.requestAnimationFrame(() => {
        scrollRaf = 0;
        syncCurrentFromScroll();
      });
    }

    window.clearTimeout(scrollEndTimer);
    scrollEndTimer = window.setTimeout(syncCurrentFromScroll, 90);
  },
  { passive: true }
);

track.addEventListener("scrollend", syncCurrentFromScroll);

if ("IntersectionObserver" in window && heroVideo) {
  const heroObserver = new IntersectionObserver(
    ([entry]) => {
      heroVisible = entry.isIntersecting;
      playCurrentVideo();
    },
    { threshold: 0.18 }
  );
  heroObserver.observe(heroVideo);
}

if ("IntersectionObserver" in window) {
  const carouselObserver = new IntersectionObserver(
    ([entry]) => {
      carouselVisible = entry.intersectionRatio >= 0.42;
      if (carouselVisible) {
        carouselStarted = true;
        prewarmCarouselVideos();
        playCurrentVideo();
      } else {
        playCurrentVideo();
      }
    },
    { threshold: [0, 0.18, 0.42, 0.6] }
  );
  carouselObserver.observe(carousel);
} else {
  carouselVisible = true;
  carouselStarted = true;
  playCurrentVideo();
}

window.addEventListener("resize", () => {
  window.requestAnimationFrame(() => scrollToSlide(index, "auto"));
});

document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    stopRenderedProgress();
    videos.forEach((video) => {
      showPoster(video);
      pauseVideo(video);
    });
    return;
  }
  restoreAfterPageResume();
});

window.addEventListener("pagehide", () => {
  stopRenderedProgress();
  videos.forEach((video) => {
    showPoster(video);
    pauseVideo(video);
  });
});

window.addEventListener("pageshow", (event) => {
  if (event.persisted) restoreAfterPageResume();
});

setMutedVideos();
setInitialCurrent(0);
track.scrollTo({ left: getSlideSnapLeft(slides[0]), behavior: "auto" });
