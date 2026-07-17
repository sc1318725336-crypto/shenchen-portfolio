const menuRoot = document.querySelector('[data-menu]');
const menuButton = document.querySelector('.menu-toggle');
const siteLogo = document.querySelector('.site-logo');
const menuPanel = document.querySelector('.menu-panel');
const menuBackdrop = document.querySelector('.menu-backdrop');
const menuLinks = [...document.querySelectorAll('.menu-list a')];
const progress = document.querySelector('.scroll-progress span');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// PLAYER SKILLS: measure the rendered cards, then place their bottom centres at
// equal arc-length intervals on one ellipse. Card rotation follows the tangent.
const skillFan = document.querySelector('.skill-fan');
const skillCards = skillFan ? [...skillFan.querySelectorAll('.skill-card')] : [];

const layoutSkillArc = () => {
  if (!skillFan || !skillCards.length || !window.matchMedia('(min-width: 801px)').matches) return;

  const fanWidth = skillFan.clientWidth;
  const fanHeight = skillFan.clientHeight;
  const cardWidth = skillCards[0].offsetWidth;
  const cardHeight = skillCards[0].offsetHeight;
  if (!fanWidth || !fanHeight || !cardWidth || !cardHeight) return;

  const gap = Math.max(8, Math.min(14, cardWidth * .045));
  const arcStep = cardWidth + gap;
  const radiusX = Math.min(fanWidth * .31, fanHeight * .54);
  const radiusY = radiusX * .86;

  // A dense lookup keeps adjacent centres equally spaced along the ellipse,
  // instead of merely using equal x percentages or equal parameter angles.
  const samples = 2048;
  const maxT = Math.PI * .499;
  const arcTable = [{ t: 0, length: 0 }];
  let previousX = 0;
  let previousY = 0;
  let totalLength = 0;
  for (let sample = 1; sample <= samples; sample += 1) {
    const t = maxT * sample / samples;
    const x = radiusX * Math.sin(t);
    const y = radiusY * (1 - Math.cos(t));
    totalLength += Math.hypot(x - previousX, y - previousY);
    arcTable.push({ t, length: totalLength });
    previousX = x;
    previousY = y;
  }

  const parameterAtLength = (targetLength) => {
    let low = 0;
    let high = arcTable.length - 1;
    while (low + 1 < high) {
      const middle = (low + high) >> 1;
      if (arcTable[middle].length < targetLength) low = middle;
      else high = middle;
    }
    const start = arcTable[low];
    const end = arcTable[high];
    const span = end.length - start.length || 1;
    return start.t + (end.t - start.t) * ((targetLength - start.length) / span);
  };

  const innerT = parameterAtLength(Math.min(arcStep, totalLength * .45));
  const outerT = parameterAtLength(Math.min(arcStep * 2, totalLength * .9));
  const outerAngle = Math.atan2(radiusY * Math.sin(outerT), radiusX * Math.cos(outerT));
  const outerDrop = radiusY * (1 - Math.cos(outerT));
  const outerBottomProjection = cardWidth * .5 * Math.abs(Math.sin(outerAngle));
  const heading = document.querySelector('.skills-heading');
  const headingBottom = heading ? heading.offsetTop + heading.offsetHeight : 0;
  const minimumTop = headingBottom + cardHeight + Math.max(24, fanHeight * .03);
  const maximumTop = fanHeight - outerDrop - outerBottomProjection - Math.max(14, fanHeight * .02);
  const ellipseTop = Math.max(minimumTop, Math.min(fanHeight * .61, maximumTop));
  const centerX = fanWidth / 2;
  const parameters = [-outerT, -innerT, 0, innerT, outerT];

  skillFan.style.setProperty('--skill-ellipse-rx', `${radiusX}px`);
  skillFan.style.setProperty('--skill-ellipse-ry', `${radiusY}px`);
  skillFan.style.setProperty('--skill-ellipse-top', `${ellipseTop}px`);
  skillFan.style.setProperty('--skill-arc-step', `${arcStep}px`);

  skillCards.forEach((card, index) => {
    const t = parameters[index];
    const x = centerX + radiusX * Math.sin(t);
    const y = ellipseTop + radiusY * (1 - Math.cos(t));
    const rotation = Math.atan2(radiusY * Math.sin(t), radiusX * Math.cos(t)) * 180 / Math.PI;
    card.style.setProperty('--skill-arc-x', `${x}px`);
    card.style.setProperty('--skill-arc-y', `${y}px`);
    card.style.setProperty('--r', `${rotation}deg`);
  });
};

layoutSkillArc();

let prepareSkillDeal = () => {};

// Spread the five measured cards from left to right once they enter the viewport.
if (skillFan && !reduceMotion.matches && window.matchMedia('(min-width: 801px)').matches) {
  const dealDelays = [0, 85, 170, 255, 340];

  prepareSkillDeal = () => {
    const anchorStyles = getComputedStyle(skillCards[0]);
    const anchorX = Number.parseFloat(anchorStyles.getPropertyValue('--skill-arc-x'));
    const anchorY = Number.parseFloat(anchorStyles.getPropertyValue('--skill-arc-y'));
    if (!Number.isFinite(anchorX) || !Number.isFinite(anchorY)) return;
    skillCards.forEach((card, index) => {
      const styles = getComputedStyle(card);
      const cardX = Number.parseFloat(styles.getPropertyValue('--skill-arc-x'));
      const cardY = Number.parseFloat(styles.getPropertyValue('--skill-arc-y'));
      const rotation = Number.parseFloat(styles.getPropertyValue('--r')) || 0;
      card.style.setProperty('--deal-x', (anchorX - cardX) + 'px');
      card.style.setProperty('--deal-y', (anchorY - cardY) + 'px');
      card.style.setProperty('--deal-r', (rotation * .2) + 'deg');
      card.style.setProperty('--deal-delay', dealDelays[index] + 'ms');
    });
    skillFan.classList.add('is-deal-ready');
  };

  prepareSkillDeal();
  const skillDealObserver = new IntersectionObserver((entries, observer) => {
    if (!entries.some(entry => entry.isIntersecting)) return;
    requestAnimationFrame(() => skillFan.classList.add('is-dealt'));
    window.setTimeout(() => skillFan.classList.remove('is-deal-ready'), 1020);
    observer.unobserve(skillFan);
  }, { threshold: .28, rootMargin: '0px 0px -8% 0px' });

  skillDealObserver.observe(skillFan);
}

let skillResizeFrame;
const refreshSkillArc = () => {
  layoutSkillArc();
  if (skillFan?.classList.contains('is-deal-ready')) prepareSkillDeal();
};
const scheduleSkillArcRefresh = () => {
  cancelAnimationFrame(skillResizeFrame);
  skillResizeFrame = requestAnimationFrame(refreshSkillArc);
};

document.fonts?.ready.then(scheduleSkillArcRefresh);
window.addEventListener('resize', scheduleSkillArcRefresh);

if (skillFan && 'ResizeObserver' in window) {
  const skillArcObserver = new ResizeObserver(scheduleSkillArcRefresh);
  skillArcObserver.observe(skillFan);
  const skillsHeading = document.querySelector('.skills-heading');
  if (skillsHeading) skillArcObserver.observe(skillsHeading);
  if (skillCards[0]) skillArcObserver.observe(skillCards[0]);
}

let menuOpen = false;
let focusTimer;

const setMenu = (open, returnFocus = true) => {
  menuOpen = open;
  clearTimeout(focusTimer);
  menuRoot?.classList.toggle('is-open', open);
  document.body.classList.toggle('menu-open', open);
  menuButton?.setAttribute('aria-expanded', String(open));
  menuButton?.setAttribute('aria-label', open ? '关闭菜单' : '打开菜单');
  menuPanel?.setAttribute('aria-hidden', String(!open));

  if (open) {
    menuPanel?.removeAttribute('inert');
    const delay = reduceMotion.matches ? 0 : 420;
    focusTimer = window.setTimeout(() => menuLinks[0]?.focus({ preventScroll: true }), delay);
  } else {
    menuPanel?.setAttribute('inert', '');
    if (returnFocus) menuButton?.focus({ preventScroll: true });
  }
};

menuButton?.addEventListener('click', () => setMenu(!menuOpen));
menuBackdrop?.addEventListener('click', () => setMenu(false));
siteLogo?.addEventListener('click', () => { if (menuOpen) setMenu(false, false); });
menuLinks.forEach((link) => link.addEventListener('click', () => setMenu(false, false)));

document.addEventListener('keydown', (event) => {
  if (!menuOpen) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    setMenu(false);
    return;
  }
  if (event.key !== 'Tab') return;

  const focusables = [menuButton, ...menuLinks].filter(Boolean);
  const current = focusables.indexOf(document.activeElement);
  if (event.shiftKey && current <= 0) {
    event.preventDefault();
    focusables.at(-1)?.focus();
  } else if (!event.shiftKey && current === focusables.length - 1) {
    event.preventDefault();
    focusables[0]?.focus();
  }
});

const updateScroll = () => {
  const total = document.documentElement.scrollHeight - window.innerHeight;
  const ratio = total > 0 ? window.scrollY / total : 0;
  if (progress) progress.style.transform = `scaleX(${ratio})`;
};
window.addEventListener('scroll', updateScroll, { passive: true });
updateScroll();

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

document.querySelectorAll('.reveal').forEach((element) => observer.observe(element));

const setupShuffle = (element) => {
  const text = element.dataset.shuffle || element.textContent || '';
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%';
  element.textContent = '';
  element.setAttribute('aria-label', text);

  const letters = [];
  [...text].forEach((character) => {
    const span = document.createElement('span');
    span.setAttribute('aria-hidden', 'true');
    if (character === ' ') {
      span.className = 'shuffle-space';
      span.textContent = ' ';
    } else {
      span.className = `shuffle-letter${'MW'.includes(character) ? ' is-wide' : ''}`;
      span.textContent = character;
      span.dataset.original = character;
      letters.push(span);
    }
    element.appendChild(span);
  });

  let playing = false;
  const play = () => {
    if (playing || reduceMotion.matches) return;
    playing = true;
    let longest = 0;

    letters.forEach((letter, index) => {
      const sequenceIndex = Math.floor(index / 2);
      const delay = sequenceIndex * 34 + (index % 2 === 0 ? 145 : 0);
      longest = Math.max(longest, delay);
      window.setTimeout(() => {
        let ticks = 0;
        const scramble = window.setInterval(() => {
          letter.textContent = charset[Math.floor(Math.random() * charset.length)];
          ticks += 1;
          if (ticks >= 6) {
            clearInterval(scramble);
            letter.textContent = letter.dataset.original;
          }
        }, 42);

        letter.animate?.([
          { transform: 'translateX(-105%)', opacity: .18, color: '#2d73ff' },
          { transform: 'translateX(8%)', opacity: 1, color: '#ffffff', offset: .72 },
          { transform: 'translateX(0)', opacity: 1, color: '#ffffff' }
        ], { duration: 360, easing: 'cubic-bezier(.16,1,.3,1)' });
      }, delay);
    });

    window.setTimeout(() => {
      letters.forEach((letter) => { letter.textContent = letter.dataset.original; });
      playing = false;
    }, longest + 480);
  };

  element.addEventListener('mouseenter', play);
  element.addEventListener('focus', play);
  if ('fonts' in document) document.fonts.ready.then(play);
  else play();
};

document.querySelectorAll('[data-shuffle]').forEach(setupShuffle);

const packageCarousel = document.querySelector('[data-package-carousel]');
if (packageCarousel) {
  const ring = packageCarousel.querySelector('.package-carousel-ring');
  const sourceCards = [...packageCarousel.querySelectorAll('.package-carousel-card')];
  sourceCards.forEach((card) => {
    const clone = card.cloneNode(true);
    clone.classList.add('package-carousel-card--clone');
    clone.setAttribute('aria-hidden', 'true');
    clone.tabIndex = -1;
    ring.appendChild(clone);
  });
  const cards = [...packageCarousel.querySelectorAll('.package-carousel-card')];
  const step = 360 / cards.length;
  const motion = {
    rotation: 0,
    targetRotation: 0,
    last: performance.now(),
    dragging: false,
    moved: false,
    suppressClick: false,
    hovered: false,
    focusWithin: false,
    visible: true,
    startX: 0,
    startRotation: 0,
    pauseUntil: 0,
    activeCard: -1
  };

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const normalizeAngle = (angle) => ((angle + 180) % 360 + 360) % 360 - 180;
  const pauseAutoplay = (duration = 1800) => {
    motion.pauseUntil = performance.now() + duration;
  };

  const updateActiveCard = () => {
    let activeIndex = 0;
    let nearestAngle = Infinity;
    cards.forEach((card, index) => {
      const angle = Math.abs(normalizeAngle(index * step + motion.rotation));
      if (angle < nearestAngle) {
        nearestAngle = angle;
        activeIndex = index;
      }
    });
    if (activeIndex === motion.activeCard) return;
    motion.activeCard = activeIndex;
    cards.forEach((card, index) => {
      if (index === activeIndex) card.setAttribute('aria-current', 'true');
      else card.removeAttribute('aria-current');
    });
  };

  const layoutPackageCarousel = () => {
    const width = packageCarousel.clientWidth || 1;
    const cardWidth = clamp(width * .35, 220, 460);
    const cardHeight = cardWidth * 3 / 4;
    const radius = Math.max(cardWidth * 2.55, cardWidth * cards.length / (Math.PI * 2) * 1.02);
    ring.style.setProperty('--package-card-w', cardWidth + 'px');
    ring.style.setProperty('--package-card-h', cardHeight + 'px');
    ring.style.setProperty('--package-radius', radius + 'px');
    cards.forEach((card, index) => {
      card.style.transform = `rotateY(${index * step}deg) translateZ(${radius}px)`;
    });
  };

  const applyPackageCarousel = () => {
    ring.style.transform = `translateZ(calc(var(--package-radius, 720px) * -1)) rotateY(${motion.rotation}deg)`;
    updateActiveCard();
  };

  const tickPackageCarousel = (now) => {
    const delta = Math.min(48, now - motion.last);
    motion.last = now;
    const shouldAutoplay = !reduceMotion.matches
      && motion.visible
      && !motion.dragging
      && !packageCarousel.matches(':hover')
      && !packageCarousel.matches(':focus-within')
      && now > motion.pauseUntil
      && document.visibilityState === 'visible';
    if (shouldAutoplay) motion.targetRotation -= delta * .016;
    const easing = 1 - Math.pow(.88, delta / 16.667);
    motion.rotation += (motion.targetRotation - motion.rotation) * easing;
    applyPackageCarousel();
    requestAnimationFrame(tickPackageCarousel);
  };

  packageCarousel.addEventListener('pointerenter', () => { motion.hovered = true; });
  packageCarousel.addEventListener('pointerleave', () => { motion.hovered = false; });
  packageCarousel.addEventListener('focusin', () => { motion.focusWithin = true; });
  packageCarousel.addEventListener('focusout', () => {
    requestAnimationFrame(() => {
      motion.focusWithin = packageCarousel.contains(document.activeElement);
    });
  });

  packageCarousel.addEventListener('pointerdown', (event) => {
    if (event.button !== 0) return;
    motion.dragging = true;
    motion.moved = false;
    motion.startX = event.clientX;
    motion.startRotation = motion.targetRotation;
    packageCarousel.classList.add('is-dragging');
    packageCarousel.setPointerCapture?.(event.pointerId);
  });
  packageCarousel.addEventListener('pointermove', (event) => {
    if (!motion.dragging) return;
    const distance = event.clientX - motion.startX;
    if (Math.abs(distance) > 5) motion.moved = true;
    motion.targetRotation = motion.startRotation + distance * .18;
  });
  const endPackageDrag = (event) => {
    if (!motion.dragging) return;
    motion.dragging = false;
    packageCarousel.classList.remove('is-dragging');
    packageCarousel.releasePointerCapture?.(event.pointerId);
    if (motion.moved) {
      motion.suppressClick = true;
      window.setTimeout(() => { motion.suppressClick = false; }, 120);
    }
    pauseAutoplay();
  };
  packageCarousel.addEventListener('pointerup', endPackageDrag);
  packageCarousel.addEventListener('pointercancel', endPackageDrag);

  packageCarousel.addEventListener('wheel', (event) => {
    event.preventDefault();
    const delta = clamp(event.deltaY || event.deltaX || 0, -100, 100);
    motion.targetRotation -= delta * .08;
    pauseAutoplay();
  }, { passive: false });

  packageCarousel.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      motion.targetRotation -= step;
      pauseAutoplay();
    }
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      motion.targetRotation += step;
      pauseAutoplay();
    }
  });

  cards.forEach((card) => {
    card.addEventListener('click', (event) => {
      if (!motion.suppressClick) return;
      event.preventDefault();
    });
  });

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      motion.visible = entry.isIntersecting;
    }, { threshold: .08 });
    observer.observe(packageCarousel);
  }

  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(layoutPackageCarousel);
    observer.observe(packageCarousel);
  } else {
    window.addEventListener('resize', layoutPackageCarousel);
  }

  layoutPackageCarousel();
  applyPackageCarousel();
  requestAnimationFrame(tickPackageCarousel);
}

window.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash) return;
  const target = document.querySelector(window.location.hash);
  window.setTimeout(() => target?.scrollIntoView({ block: 'start' }), 80);
});
const brandCylinder = document.querySelector('[data-brand-cylinder]');
if (brandCylinder) {
  const originalBrandColumns = [...brandCylinder.querySelectorAll('.brand-column')];
  const brandColumnCount = originalBrandColumns.length;
  originalBrandColumns.forEach((column) => {
    const clone = column.cloneNode(true);
    clone.classList.add('is-clone');
    clone.setAttribute('aria-hidden', 'true');
    clone.inert = true;
    clone.querySelectorAll('a,button').forEach((control) => {
      control.tabIndex = -1;
      if (control instanceof HTMLButtonElement) control.disabled = true;
    });
    brandCylinder.appendChild(clone);
  });
  const brandColumns = [...brandCylinder.querySelectorAll('.brand-column')];
  const cylinderState = {
    progress: 0,
    velocity: 0,
    pointerDown: false,
    dragging: false,
    hover: false,
    visible: false,
    lastX: 0,
    lastTime: 0,
    moved: 0,
    frame: 0,
    previousFrame: performance.now()
  };

  const wrapCylinderSlot = (value) => {
    const half = brandColumnCount / 2;
    return ((value + half) % brandColumnCount + brandColumnCount) % brandColumnCount - half;
  };

  const renderBrandCylinder = () => {
    const width = brandCylinder.clientWidth;
    const pitch = width / 5.85;
    const stepAngle = Math.PI / 15;
    const radius = pitch / Math.sin(stepAngle);
    brandColumns.forEach((column) => {
      const index = Number(column.dataset.column || 0);
      const baseSlot = wrapCylinderSlot(index - cylinderState.progress);
      const slot = column.classList.contains('is-clone')
        ? baseSlot + (baseSlot < 0 ? brandColumnCount : -brandColumnCount)
        : baseSlot;
      const theta = slot * stepAngle;
      const x = Math.sin(theta) * radius;
      const z = (1 - Math.cos(theta)) * radius;
      const edge = Math.abs(slot);
      const brightness = Math.max(.28, 1 - edge * .14);
      const visibility = Math.max(0, 1 - Math.max(0, edge - 2.72) * 3.6);
      column.style.transform = `translate3d(calc(-50% + ${x}px), 0, ${z}px) rotateY(${-theta * 180 / Math.PI}deg)`;
      column.style.opacity = String(visibility);
      column.style.filter = `brightness(${brightness})`;
      column.style.zIndex = '';
    });
  };

  const animateBrandCylinder = (now) => {
    const delta = Math.min(40, now - cylinderState.previousFrame);
    cylinderState.previousFrame = now;
    if (cylinderState.visible && !reduceMotion.matches && !cylinderState.dragging) {
      if (Math.abs(cylinderState.velocity) > .00008) {
        cylinderState.progress += cylinderState.velocity * delta;
        cylinderState.velocity *= Math.pow(.92, delta / 16.67);
      } else {
        cylinderState.velocity = 0;
        cylinderState.progress += delta / 2500;
      }
    }
    renderBrandCylinder();
    cylinderState.frame = requestAnimationFrame(animateBrandCylinder);
  };

  brandCylinder.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    cylinderState.pointerDown = true;
    cylinderState.dragging = false;
    cylinderState.lastX = event.clientX;
    cylinderState.lastTime = performance.now();
    cylinderState.moved = 0;
    cylinderState.velocity = 0;
  });

  brandCylinder.addEventListener('pointermove', (event) => {
    if (!cylinderState.pointerDown) return;
    const now = performance.now();
    const dx = event.clientX - cylinderState.lastX;
    const dt = Math.max(8, now - cylinderState.lastTime);
    cylinderState.moved += Math.abs(dx);
    if (!cylinderState.dragging && cylinderState.moved > 6) {
      cylinderState.dragging = true;
      brandCylinder.classList.add('is-dragging');
      brandCylinder.setPointerCapture(event.pointerId);
    }
    if (!cylinderState.dragging) {
      cylinderState.lastX = event.clientX;
      cylinderState.lastTime = now;
      return;
    }
    const change = -dx / Math.max(120, brandCylinder.clientWidth * .2);
    cylinderState.progress += change;
    cylinderState.velocity = change / dt;
    cylinderState.lastX = event.clientX;
    cylinderState.lastTime = now;
    renderBrandCylinder();
  });

  const releaseBrandCylinder = (event) => {
    if (!cylinderState.pointerDown) return;
    cylinderState.pointerDown = false;
    cylinderState.dragging = false;
    brandCylinder.classList.remove('is-dragging');
    if (brandCylinder.hasPointerCapture(event.pointerId)) brandCylinder.releasePointerCapture(event.pointerId);
  };

  brandCylinder.addEventListener('pointerup', releaseBrandCylinder);
  brandCylinder.addEventListener('pointercancel', releaseBrandCylinder);
  brandCylinder.addEventListener('dragstart', (event) => event.preventDefault());
  brandCylinder.addEventListener('pointerenter', () => { cylinderState.hover = true; });
  brandCylinder.addEventListener('pointerleave', () => { cylinderState.hover = false; });
  brandCylinder.addEventListener('click', (event) => {
    if (cylinderState.moved > 7) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  new IntersectionObserver((entries) => {
    cylinderState.visible = entries.some(entry => entry.isIntersecting);
  }, { threshold: .15 }).observe(brandCylinder);

  window.addEventListener('resize', renderBrandCylinder, { passive: true });
  renderBrandCylinder();
  cylinderState.frame = requestAnimationFrame(animateBrandCylinder);
}
const ipCylinder = document.querySelector('[data-ip-cylinder]');
if (ipCylinder) {
  const cards = [...ipCylinder.querySelectorAll('.ip-cylinder-card')];
  const state = { progress: 0, velocity: 0, dragging: false, visible: false, lastX: 0, lastTime: 0, moved: 0, previousFrame: performance.now() };
  const wrap = (value) => {
    const total = cards.length;
    const half = total / 2;
    return ((value + half) % total + total) % total - half;
  };

  const render = () => {
    const width = ipCylinder.clientWidth;
    const cardWidth = cards[0]?.offsetWidth || width * .2;
    const radius = Math.max(width * .56, cardWidth * 1.7);
    const targetGap = Math.max(8, Math.min(14, width * .008));
    const thetaStep = Math.asin(Math.min(.82, (cardWidth + targetGap) / radius));
    cards.forEach((card, index) => {
      const slot = wrap(index - state.progress);
      const theta = slot * thetaStep;
      const x = Math.sin(theta) * radius;
      const z = (Math.cos(theta) - 1) * radius;
      const edge = Math.abs(slot);
      card.style.transform = `translate3d(calc(-50% + ${x}px), -50%, ${z}px) rotateY(${-theta * 180 / Math.PI}deg)`;
      card.style.opacity = String(Math.max(.18, 1 - Math.max(0, edge - 1.65) * .52));
      card.style.zIndex = String(20 - Math.round(edge * 4));
    });
  };

  const animate = (now) => {
    const delta = Math.min(40, now - state.previousFrame);
    state.previousFrame = now;
    if (state.visible && !reduceMotion.matches && !state.dragging) {
      if (Math.abs(state.velocity) > .00008) {
        state.progress += state.velocity * delta;
        state.velocity *= Math.pow(.92, delta / 16.67);
      } else {
        state.velocity = 0;
        state.progress += delta / 5200;
      }
    }
    render();
    requestAnimationFrame(animate);
  };

  ipCylinder.addEventListener('pointerdown', (event) => {
    state.dragging = true; state.lastX = event.clientX; state.lastTime = performance.now(); state.moved = 0; state.velocity = 0;
    ipCylinder.classList.add('is-dragging'); ipCylinder.setPointerCapture(event.pointerId);
  });
  ipCylinder.addEventListener('pointermove', (event) => {
    if (!state.dragging) return;
    const now = performance.now(); const dx = event.clientX - state.lastX; const dt = Math.max(8, now - state.lastTime);
    const change = -dx / Math.max(120, ipCylinder.clientWidth * .2);
    state.progress += change; state.velocity = change / dt; state.moved += Math.abs(dx); state.lastX = event.clientX; state.lastTime = now; render();
  });
  const release = (event) => {
    if (!state.dragging) return;
    state.dragging = false; ipCylinder.classList.remove('is-dragging');
    if (ipCylinder.hasPointerCapture(event.pointerId)) ipCylinder.releasePointerCapture(event.pointerId);
  };
  ipCylinder.addEventListener('pointerup', release);
  ipCylinder.addEventListener('pointercancel', release);
  ipCylinder.addEventListener('click', (event) => { if (state.moved > 7) { event.preventDefault(); event.stopPropagation(); } }, true);
  new IntersectionObserver((entries) => { state.visible = entries.some(entry => entry.isIntersecting); }, { threshold: .15 }).observe(ipCylinder);
  window.addEventListener('resize', render, { passive: true });
  render(); requestAnimationFrame(animate);
}
// Brand data counts begin only when the reference-layout block scrolls into view.
const brandStats = document.querySelector('.brand-service .stats');
if (brandStats) {
  const counters = [...brandStats.querySelectorAll('[data-count]')];
  const setCount = (element, value) => { element.textContent = `${Math.round(value)}${element.dataset.suffix || ''}`; };
  const playCounts = () => {
    counters.forEach((counter) => {
      const target = Number(counter.dataset.count);
      if (reduceMotion.matches) { setCount(counter, target); return; }
      const start = performance.now();
      const duration = 1050;
      const tick = (now) => {
        const progress = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        setCount(counter, target * eased);
        if (progress < 1) requestAnimationFrame(tick);
      };
      setCount(counter, 0);
      requestAnimationFrame(tick);
    });
  };
  const statsObserver = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) { playCounts(); statsObserver.disconnect(); }
  }, { threshold: .4 });
  statsObserver.observe(brandStats);
}

const spaceProjectReel = document.querySelector('.space-project-reel');
if (spaceProjectReel) {
  const spaceSection = spaceProjectReel.closest('.space');
  const spaceTrack = spaceProjectReel.querySelector('.space-project-track');
  const originalProjects = [...spaceTrack.querySelectorAll('.space-project')];
  const desktopSpaceProjects = window.matchMedia('(min-width: 801px)');
  const reducedSpaceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const AUTO_SPEED = 38;

  if (spaceSection && originalProjects.length > 1) {
    const trailingClones = originalProjects.map((project) => {
      const clone = project.cloneNode(true);
      clone.classList.add('space-project--clone');
      clone.setAttribute('aria-hidden', 'true');
      clone.setAttribute('tabindex', '-1');
      return clone;
    });
    spaceTrack.append(...trailingClones);

    let spaceAnimation = null;
    let loopWidth = 0;
    let pointerInCardBand = false;

    const animationProgress = () => {
      if (!spaceAnimation) return 0;
      const timing = spaceAnimation.effect.getComputedTiming();
      const duration = Number(timing.duration) || 1;
      return (((spaceAnimation.currentTime || 0) % duration) + duration) % duration / duration;
    };

    const shouldAutoPlay = () => desktopSpaceProjects.matches
      && !reducedSpaceMotion.matches
      && !pointerInCardBand
      && Boolean(spaceAnimation);

    const syncSpacePlayback = () => {
      const playing = shouldAutoPlay();
      spaceTrack.classList.toggle('is-auto-scrolling', playing);
      if (!spaceAnimation) return;
      if (playing) {
        spaceAnimation.play();
      } else {
        spaceAnimation.pause();
      }
    };

    const buildSpaceAnimation = (preserveProgress = false) => {
      const previousProgress = preserveProgress ? animationProgress() : 0;
      if (spaceAnimation) spaceAnimation.cancel();

      if (!desktopSpaceProjects.matches) {
        spaceAnimation = null;
        loopWidth = 0;
        spaceTrack.style.transform = '';
        spaceTrack.classList.remove('is-auto-scrolling');
        return;
      }

      loopWidth = trailingClones[0].offsetLeft - originalProjects[0].offsetLeft;
      if (loopWidth <= 0) return;

      const duration = loopWidth / AUTO_SPEED * 1000;
      spaceAnimation = spaceTrack.animate(
        [
          { transform: 'translate3d(0, 0, 0)' },
          { transform: 'translate3d(-' + loopWidth + 'px, 0, 0)' }
        ],
        { duration, iterations: Infinity, easing: 'linear' }
      );
      spaceAnimation.currentTime = previousProgress * duration;
      syncSpacePlayback();
    };

    const cardBandContains = (clientY) => {
      const card = originalProjects[0].querySelector('.space-project-card');
      if (!card) return false;
      const rect = card.getBoundingClientRect();
      return clientY >= rect.top && clientY <= rect.bottom;
    };

    const shiftSpaceAnimation = (pixelDelta) => {
      if (!spaceAnimation || !loopWidth) return;
      const timing = spaceAnimation.effect.getComputedTiming();
      const duration = Number(timing.duration) || 1;
      const timeShift = pixelDelta / AUTO_SPEED * 1000;
      const nextTime = (((spaceAnimation.currentTime || 0) + timeShift) % duration + duration) % duration;
      spaceAnimation.currentTime = nextTime;
    };

    const spaceWheelDelta = (event) => {
      const rawDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;
      if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return rawDelta * 18;
      if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return rawDelta * spaceProjectReel.clientWidth;
      return rawDelta;
    };

    spaceSection.addEventListener('pointermove', (event) => {
      const nextState = cardBandContains(event.clientY);
      if (nextState === pointerInCardBand) return;
      pointerInCardBand = nextState;
      syncSpacePlayback();
    });

    spaceSection.addEventListener('pointerleave', () => {
      pointerInCardBand = false;
      syncSpacePlayback();
    });

    spaceSection.addEventListener('wheel', (event) => {
      if (!desktopSpaceProjects.matches || !cardBandContains(event.clientY)) return;
      const delta = spaceWheelDelta(event);
      if (!delta || !spaceAnimation) return;
      event.preventDefault();
      pointerInCardBand = true;
      spaceAnimation.pause();
      shiftSpaceAnimation(delta);
    }, { passive: false });

    spaceProjectReel.addEventListener('keydown', (event) => {
      if (!desktopSpaceProjects.matches || !spaceAnimation) return;
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      shiftSpaceAnimation(event.key === 'ArrowLeft' ? -80 : 80);
    });


    const rebuildSpaceAnimation = () => {
      requestAnimationFrame(() => buildSpaceAnimation(true));
    };
    window.addEventListener('resize', rebuildSpaceAnimation, { passive: true });
    desktopSpaceProjects.addEventListener('change', rebuildSpaceAnimation);
    reducedSpaceMotion.addEventListener('change', syncSpacePlayback);

    requestAnimationFrame(() => buildSpaceAnimation(false));
  }
}

const eventBrowser = document.querySelector('[data-event-browser]');
if (eventBrowser) {
  const rail = eventBrowser.querySelector('[data-event-rail]');
  const cards = [...eventBrowser.querySelectorAll('[data-event-card]')];
  const menuItems = [...eventBrowser.querySelectorAll('[data-event-project]')];
  let activeEventIndex = 0;
  let dragStartY = 0;
  let dragDeltaY = 0;
  let eventPointerDown = false;
  let isDraggingEvent = false;
  let wheelBuffer = 0;
  let wheelTimer;

  const eventDistance = (index) => {
    const total = cards.length;
    let distance = index - activeEventIndex;
    if (distance > total / 2) distance -= total;
    if (distance < -total / 2) distance += total;
    return distance;
  };

  const renderEventCards = (dragOffset = 0, animate = true) => {
    const step = rail.clientWidth * 9 / 16 + Math.max(18, rail.clientWidth * .035);
    cards.forEach((card, index) => {
      const distance = eventDistance(index);
      const offset = distance * step + dragOffset;
      card.style.setProperty('--event-y', `${offset}px`);
      card.style.transitionDuration = animate ? '' : '0ms';
      card.classList.toggle('is-active', distance === 0);
      card.classList.toggle('is-near', Math.abs(distance) === 1);
      card.classList.toggle('is-far', Math.abs(distance) > 1);
      card.setAttribute('aria-current', distance === 0 ? 'true' : 'false');
    });

    menuItems.forEach((item, index) => {
      const selected = index === activeEventIndex;
      item.classList.toggle('is-active', selected);
      item.setAttribute('aria-selected', String(selected));
    });
  };

  const setEventIndex = (index) => {
    const total = cards.length;
    activeEventIndex = (index + total) % total;
    renderEventCards(0, true);
  };

  const eventSection = eventBrowser.closest('.event');
  const handleEventWheel = (event) => {
    const sectionRect = eventSection?.getBoundingClientRect();
    const sectionVisible = sectionRect && sectionRect.top < window.innerHeight * .72 && sectionRect.bottom > window.innerHeight * .28;
    const target = event.target;
    const directHit = target.closest('.event-card-rail');
    const leftZoneHit = sectionVisible && event.clientX <= window.innerWidth * .46;
    if (!directHit && !leftZoneHit) return;
    event.preventDefault();
    wheelBuffer += event.deltaY;
    window.clearTimeout(wheelTimer);
    wheelTimer = window.setTimeout(() => { wheelBuffer = 0; }, 130);
    if (Math.abs(wheelBuffer) < 48) return;
    setEventIndex(activeEventIndex + Math.sign(wheelBuffer));
    wheelBuffer = 0;
  };

  window.addEventListener('wheel', handleEventWheel, { passive: false });

  rail?.addEventListener('pointerdown', (event) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    eventPointerDown = true;
    isDraggingEvent = false;
    dragStartY = event.clientY;
    dragDeltaY = 0;
  });

  rail?.addEventListener('pointermove', (event) => {
    if (!eventPointerDown) return;
    dragDeltaY = event.clientY - dragStartY;
    if (!isDraggingEvent && Math.abs(dragDeltaY) > 7) {
      isDraggingEvent = true;
      rail.setPointerCapture(event.pointerId);
    }
    if (!isDraggingEvent) return;
    renderEventCards(dragDeltaY, false);
  });

  const releaseEventDrag = (event) => {
    if (!eventPointerDown) return;
    eventPointerDown = false;
    if (!isDraggingEvent) return;
    isDraggingEvent = false;
    if (rail.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    const threshold = Math.max(54, rail.clientWidth * .08);
    if (Math.abs(dragDeltaY) > threshold) {
      setEventIndex(activeEventIndex - Math.sign(dragDeltaY));
    } else {
      renderEventCards(0, true);
    }
  };

  rail?.addEventListener('pointerup', releaseEventDrag);
  rail?.addEventListener('pointercancel', releaseEventDrag);
  rail?.addEventListener('dragstart', (event) => event.preventDefault());
  rail?.addEventListener('click', (event) => {
    if (Math.abs(dragDeltaY) > 7) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  menuItems.forEach((item) => {
    item.addEventListener('click', () => setEventIndex(Number(item.dataset.eventProject)));
  });

  window.addEventListener('resize', () => renderEventCards(0, false));
  renderEventCards(0, false);
}

// Full-screen React Bits dome gallery opened from the brand cylinder.
const logoExplorer = document.querySelector('[data-logo-explorer]');
const logoExplorerClose = logoExplorer?.querySelector('[data-close-logo-explorer]');
const logoExplorerOpeners = [...document.querySelectorAll('[data-open-logo-explorer]')];

if (logoExplorer && logoExplorerClose && logoExplorerOpeners.length) {
  let logoExplorerReturnFocus = null;

  const openLogoExplorer = (opener) => {
    logoExplorerReturnFocus = opener;

    const origin = opener.getBoundingClientRect();
    logoExplorer.style.setProperty('--logo-origin-x', `${origin.left + origin.width / 2}px`);
    logoExplorer.style.setProperty('--logo-origin-y', `${origin.top + origin.height / 2}px`);
    logoExplorer.inert = false;
    logoExplorer.setAttribute('aria-hidden', 'false');
    document.body.classList.add('logo-explorer-open');
    logoExplorer.classList.add('is-open');
    requestAnimationFrame(() => logoExplorerClose.focus());
  };

  const closeEnlargedLogo = () => {
    const dome = logoExplorer.querySelector(".sphere-root[data-enlarging='true']");
    const scrim = dome?.querySelector('.scrim');
    if (!dome || !scrim) return;
    scrim.click();
    window.setTimeout(() => {
      if (dome.getAttribute('data-enlarging') === 'true') scrim.click();
    }, 280);
  };

  const closeLogoExplorer = () => {
    if (!logoExplorer.classList.contains('is-open')) return;
    closeEnlargedLogo();
    logoExplorer.classList.remove('is-open');
    logoExplorer.setAttribute('aria-hidden', 'true');
    logoExplorer.inert = true;
    document.body.classList.remove('logo-explorer-open');
    logoExplorerReturnFocus?.focus();
  };

  logoExplorerOpeners.forEach((opener) => {
    opener.addEventListener('click', () => openLogoExplorer(opener));
  });

  logoExplorerClose.addEventListener('click', closeLogoExplorer);
  logoExplorer.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (logoExplorer.querySelector(".sphere-root[data-enlarging='true']")) return;
      event.preventDefault();
      closeLogoExplorer();
      return;
    }

    if (event.key !== 'Tab') return;
    const focusable = [
      logoExplorerClose,
      ...logoExplorer.querySelectorAll('.item__image[tabindex="0"]')
    ].filter((element) => element.getClientRects().length > 0);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
}
// Final-page WeChat copy action.
const wechatCopyButton = document.querySelector('[data-copy-wechat]');
const copyToast = document.querySelector('.copy-toast');
let copyToastTimer = 0;

const fallbackCopyText = (value) => {
  const field = document.createElement('textarea');
  field.value = value;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Copy command failed');
};

wechatCopyButton?.addEventListener('click', async () => {
  const wechatId = wechatCopyButton.dataset.copyWechat || '';
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(wechatId);
    } else {
      fallbackCopyText(wechatId);
    }
    if (copyToast) {
      copyToast.textContent = `微信号已复制：${wechatId}`;
      copyToast.classList.add('is-visible');
      window.clearTimeout(copyToastTimer);
      copyToastTimer = window.setTimeout(() => copyToast.classList.remove('is-visible'), 1800);
    }
  } catch {
    if (copyToast) {
      copyToast.textContent = `复制失败，请手动复制：${wechatId}`;
      copyToast.classList.add('is-visible');
      window.clearTimeout(copyToastTimer);
      copyToastTimer = window.setTimeout(() => copyToast.classList.remove('is-visible'), 2600);
    }
  }
});

/* SELECTED CLIENTS: staggered section entrance plus pointer-led card tilt. */
const clientsSection = document.querySelector('.clients');
const clientCards = clientsSection ? [...clientsSection.querySelectorAll('.client-item button')] : [];
if (clientsSection && clientCards.length) {
  clientCards.forEach((card) => {
    card.addEventListener('pointermove', (event) => {
      if (reduceMotion.matches || event.pointerType === 'touch') return;
      const bounds = card.getBoundingClientRect();
      const x = (event.clientX - bounds.left) / bounds.width - .5;
      const y = (event.clientY - bounds.top) / bounds.height - .5;
      card.style.setProperty('--client-rx', `${(-y * 8).toFixed(2)}deg`);
      card.style.setProperty('--client-ry', `${(x * 10).toFixed(2)}deg`);
    });
    card.addEventListener('pointerleave', () => {
      card.style.setProperty('--client-rx', '0deg');
      card.style.setProperty('--client-ry', '0deg');
    });
  });
  if (!reduceMotion.matches && 'IntersectionObserver' in window) {
    const revealClients = new IntersectionObserver((entries, observer) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      clientCards.forEach((card, index) => {
        card.animate(
          [
            { opacity: 0, transform: 'perspective(900px) translateY(34px) scale(.96)' },
            { opacity: 1, transform: 'perspective(900px) translateY(0) scale(1)' }
          ],
          { duration: 680, delay: index * 115, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' }
        );
      });
      observer.disconnect();
    }, { threshold: .22 });
    revealClients.observe(clientsSection);
  }
}
