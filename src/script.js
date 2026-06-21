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
let lastTrackScrollLeft = track.scrollLeft;
let wheelSnapTarget = -1;
let carouselVisible = false;

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

function setSlideProgress(value) {
  progressDots.style.setProperty("--slide-progress", Math.max(0, Math.min(1, value)));
}

function getVideoSlideIndex(video) {
  const slide = video?.closest(".slide");
  return slides.indexOf(slide);
}

function updateSlideProgress(video) {
  if (getVideoSlideIndex(video) !== index || !Number.isFinite(video.duration) || video.duration <= 0) return;
  setSlideProgress(video.currentTime / video.duration);
}

function advanceAfterVideoEnd(video) {
  const slideIndex = getVideoSlideIndex(video);
  if (slideIndex !== index || !carouselVisible || document.hidden) return;
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
    video.addEventListener("playing", () => waitForPaintedFrame(video));
    video.addEventListener("timeupdate", () => updateSlideProgress(video));
    video.addEventListener("ended", () => advanceAfterVideoEnd(video));
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

function prewarmCarouselVideos() {
  if (hasPrewarmedCarousel) return;
  hasPrewarmedCarousel = true;
  slides.forEach((slide) => {
    const video = slide.querySelector(".screen-video");
    loadVideo(video, "auto");
    pauseVideo(video);
  });
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

function updateVideoPlayback() {
  slides.forEach((slide, slideIndex) => {
    const video = slide.querySelector(".screen-video");
    if (slideIndex === index && carouselVisible) {
      if (previousIndex !== index && video) {
        resetVideo(video);
      }
      playQuietly(video);
    } else if (Math.abs(slideIndex - index) === 1) {
      loadVideo(video, "auto");
      pauseVideo(video);
    } else {
      loadVideo(video, "metadata");
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
  setSlideProgress(0);
  updateVideoPlayback();
}

function getClosestSlideIndex() {
  const trackRect = track.getBoundingClientRect();
  const trackCenter = trackRect.left + trackRect.width / 2;
  let closestIndex = index;
  let closestDistance = Number.POSITIVE_INFINITY;

  slides.forEach((slide, slideIndex) => {
    const rect = slide.getBoundingClientRect();
    const slideCenter = rect.left + rect.width / 2;
    const distance = Math.abs(slideCenter - trackCenter);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestIndex = slideIndex;
    }
  });

  return closestIndex;
}

function getSlideSnapLeft(slide) {
  return slide.offsetLeft + slide.offsetWidth / 2 - track.clientWidth / 2;
}

function getScrollProgressIndex(direction = 0) {
  const activationProgress = 0.18;
  const currentLeft = getSlideSnapLeft(slides[index]);

  if (direction > 0 && index < slides.length - 1) {
    const nextLeft = getSlideSnapLeft(slides[index + 1]);
    if (track.scrollLeft >= currentLeft + (nextLeft - currentLeft) * activationProgress) {
      return index + 1;
    }
  }

  if (direction < 0 && index > 0) {
    const previousLeft = getSlideSnapLeft(slides[index - 1]);
    if (track.scrollLeft <= currentLeft - (currentLeft - previousLeft) * activationProgress) {
      return index - 1;
    }
  }

  return getClosestSlideIndex();
}

function syncCurrentFromScroll() {
  const direction = Math.sign(track.scrollLeft - lastTrackScrollLeft);
  lastTrackScrollLeft = track.scrollLeft;
  const nextIndex = direction ? getScrollProgressIndex(direction) : getClosestSlideIndex();
  if (wheelSnapTarget !== -1 && Math.abs(track.scrollLeft - getSlideSnapLeft(slides[wheelSnapTarget])) < 4) {
    wheelSnapTarget = -1;
  }
  if (nextIndex !== index) {
    setCurrent(nextIndex);
    return;
  }
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
    prewarmCarouselVideos();
    wheelSnapTarget = -1;
    scrollToSlide(dotIndex);
  });
});

track.addEventListener(
  "wheel",
  (event) => {
    if (Math.abs(event.deltaX) < 8 || Math.abs(event.deltaX) < Math.abs(event.deltaY) * 0.8) return;

    event.preventDefault();
    prewarmCarouselVideos();

    if (wheelSnapTarget !== -1) return;

    const direction = Math.sign(event.deltaX);
    const nextIndex = Math.max(0, Math.min(slides.length - 1, index + direction));
    if (nextIndex === index) return;

    wheelSnapTarget = nextIndex;
    scrollToSlide(nextIndex);
  },
  { passive: false }
);

track.addEventListener(
  "scroll",
  () => {
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
      updateVideoPlayback();
    },
    { threshold: 0.18 }
  );
  heroObserver.observe(heroVideo);
}

if ("IntersectionObserver" in window) {
  const carouselObserver = new IntersectionObserver(
    ([entry]) => {
      carouselVisible = entry.isIntersecting;
      if (carouselVisible) {
        prewarmCarouselVideos();
        updateVideoPlayback();
      } else {
        updateVideoPlayback();
      }
    },
    { threshold: 0.35 }
  );
  carouselObserver.observe(carousel);
} else {
  carouselVisible = true;
  updateVideoPlayback();
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
