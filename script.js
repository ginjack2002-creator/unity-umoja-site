/* ============================================
   UNITY UMOJA — Clean Minimal 3D Background
   Soft particles + Smooth camera movement
   No sparkle, no wireframes, no clutter
   ============================================ */

import * as THREE from 'three';

// ============================================
// GLOBALS
// ============================================
const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
const SECTION_COUNT = 7;
let activeSection = 0;
let scrollProgress = 0;
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

// ============================================
// THREE.JS SCENE — Clean, minimal
// ============================================
const canvas = document.getElementById('three-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a1a1f, 0.012);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 30);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));

// ============================================
// SOFT PARTICLES — No sparkle, just gentle dots
// ============================================
const PARTICLE_COUNT = isMobile ? 400 : 800;
const particleGeometry = new THREE.BufferGeometry();
const positions = new Float32Array(PARTICLE_COUNT * 3);
const colors = new Float32Array(PARTICLE_COUNT * 3);
const sizes = new Float32Array(PARTICLE_COUNT);
const phases = new Float32Array(PARTICLE_COUNT);

const roseCol = new THREE.Color(0xB76E79);
const goldCol = new THREE.Color(0xC9A84C);
const warmCol = new THREE.Color(0xE8DDD4);
const softCol = new THREE.Color(0xD4A0A7);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const i3 = i * 3;
  // Spherical distribution — spread out evenly
  const phi = Math.acos(2 * Math.random() - 1);
  const theta = Math.random() * Math.PI * 2;
  const r = 8 + Math.random() * 40;
  positions[i3]     = r * Math.sin(phi) * Math.cos(theta);
  positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  positions[i3 + 2] = r * Math.cos(phi);

  // Soft warm palette — no harsh colors
  const roll = Math.random();
  const c = roll < 0.25 ? roseCol : roll < 0.45 ? goldCol : roll < 0.7 ? softCol : warmCol;
  colors[i3]     = c.r;
  colors[i3 + 1] = c.g;
  colors[i3 + 2] = c.b;

  sizes[i] = Math.random() * 1.8 + 0.4;
  phases[i] = Math.random() * Math.PI * 2;
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// Simple point material — soft, no sparkle shader
const particleMaterial = new THREE.PointsMaterial({
  size: isMobile ? 1.5 : 2,
  vertexColors: true,
  transparent: true,
  opacity: 0.35,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  sizeAttenuation: true,
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// ============================================
// CAMERA PATH — Gentle, smooth movement
// ============================================
const cameraSpline = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 30),      // 0: Hero — wide, centered
  new THREE.Vector3(4, 2, 22),      // 1: About — slight shift
  new THREE.Vector3(-3, 3, 16),     // 2: Journey — drift left, closer
  new THREE.Vector3(2, -1, 12),     // 3: Board — gentle orbit
  new THREE.Vector3(-2, 1, 8),      // 4: Events — closer still
  new THREE.Vector3(3, 2, 10),      // 5: Gallery — pull back slightly
  new THREE.Vector3(0, 0, 14),      // 6: Connect — centered, medium distance
]);

const lookAtSpline = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 0),
  new THREE.Vector3(1, 0.5, -2),
  new THREE.Vector3(-1, 1, -4),
  new THREE.Vector3(0, 0, -5),
  new THREE.Vector3(0.5, 0, -6),
  new THREE.Vector3(-0.5, 0.5, -4),
  new THREE.Vector3(0, 0, -3),
]);

// ============================================
// MOUSE PARALLAX — subtle
// ============================================
if (!isMobile) {
  document.addEventListener('mousemove', (e) => {
    mouse.tx = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.ty = -(e.clientY / window.innerHeight) * 2 + 1;
  });
}

// ============================================
// GSAP SCROLL ORCHESTRATION
// ============================================
gsap.registerPlugin(ScrollTrigger, ScrollToPlugin);

const panels = document.querySelectorAll('.panel');
const allDots = document.querySelectorAll('.p-dot');

const sectionThresholds = [0, 0.15, 0.30, 0.45, 0.60, 0.75, 0.90, 1.01];
let targetScrollProgress = 0;

const panelStates = new Array(SECTION_COUNT).fill(0);
panelStates[0] = 1;

function readScrollProgress() {
  const container = document.getElementById('scroll-container');
  const maxScroll = container.offsetHeight - window.innerHeight;
  if (maxScroll <= 0) return 0;
  return Math.max(0, Math.min(1, window.scrollY / maxScroll));
}

function getSectionFromProgress(progress) {
  for (let i = sectionThresholds.length - 2; i >= 0; i--) {
    if (progress >= sectionThresholds[i]) return i;
  }
  return 0;
}

function computePanelOpacity(sectionIdx, progress) {
  const start = sectionThresholds[sectionIdx];
  const end = sectionThresholds[sectionIdx + 1];
  const fadeZone = 0.04;

  if (progress < start - fadeZone || progress > end + fadeZone) return 0;
  if (progress < start + fadeZone) {
    return Math.max(0, Math.min(1, (progress - start + fadeZone) / (fadeZone * 2)));
  }
  if (progress > end - fadeZone) {
    return Math.max(0, Math.min(1, (end + fadeZone - progress) / (fadeZone * 2)));
  }
  return 1;
}

function updatePanels(progress) {
  const currentSection = getSectionFromProgress(progress);

  panels.forEach((panel, i) => {
    const targetOpacity = computePanelOpacity(i, progress);
    panelStates[i] += (targetOpacity - panelStates[i]) * 0.12;

    if (panelStates[i] < 0.01) panelStates[i] = 0;
    if (panelStates[i] > 0.99) panelStates[i] = 1;

    panel.style.opacity = panelStates[i];

    if (panelStates[i] > 0) {
      panel.style.visibility = 'visible';
      panel.style.pointerEvents = panelStates[i] > 0.5 ? 'auto' : 'none';
      panel.classList.add('active');
    } else {
      panel.style.visibility = 'hidden';
      panel.style.pointerEvents = 'none';
      panel.classList.remove('active');
      panel.querySelectorAll('.reveal-up, .reveal-scale').forEach(el => {
        el.classList.remove('visible');
      });
    }
  });

  if (currentSection !== activeSection) {
    activeSection = currentSection;
  }

  allDots.forEach((d, i) => d.classList.toggle('on', i === currentSection));

  const activePanel = panels[currentSection];
  if (activePanel && panelStates[currentSection] > 0.5) {
    activePanel.querySelectorAll('.reveal-up:not(.visible), .reveal-scale:not(.visible)').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 100);
    });
  }
}

// Initialize hero visible
panels[0].style.visibility = 'visible';
panels[0].style.opacity = '1';
panels[0].classList.add('active');

// ============================================
// CAMERA UPDATE
// ============================================
const cameraTargetPos = new THREE.Vector3();
const cameraTargetLookAt = new THREE.Vector3();
const currentLookAt = new THREE.Vector3(0, 0, 0);

function updateCamera() {
  const t = Math.max(0, Math.min(0.9999, scrollProgress));
  cameraSpline.getPointAt(t, cameraTargetPos);
  lookAtSpline.getPointAt(t, cameraTargetLookAt);

  // Subtle mouse parallax
  cameraTargetPos.x += mouse.x * 0.8;
  cameraTargetPos.y += mouse.y * 0.5;

  // Smooth camera movement
  camera.position.lerp(cameraTargetPos, 0.04);
  currentLookAt.lerp(cameraTargetLookAt, 0.04);
  camera.lookAt(currentLookAt);
}

// ============================================
// ANIMATION LOOP — Clean and simple
// ============================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // Read scroll
  targetScrollProgress = readScrollProgress();
  scrollProgress += (targetScrollProgress - scrollProgress) * 0.06;

  // Update UI
  updatePanels(scrollProgress);
  updateCamera();

  // Smooth mouse
  mouse.x += (mouse.tx - mouse.x) * 0.04;
  mouse.y += (mouse.ty - mouse.y) * 0.04;

  // Very gentle particle rotation — slow, dreamy
  particles.rotation.y = elapsed * 0.008 + mouse.x * 0.08;
  particles.rotation.x = elapsed * 0.004 + mouse.y * 0.05;

  // Subtle vertical float on particles
  const posArr = particles.geometry.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    posArr[i * 3 + 1] += Math.sin(elapsed * 0.15 + phases[i]) * 0.001;
  }
  particles.geometry.attributes.position.needsUpdate = true;

  // Adjust particle opacity based on section (dimmer on light sections)
  const isLightSection = activeSection === 1 || activeSection === 2 || activeSection === 3 || activeSection === 5;
  const targetOpacity = isLightSection ? 0.12 : 0.35;
  particleMaterial.opacity += (targetOpacity - particleMaterial.opacity) * 0.03;

  renderer.render(scene, camera);
}
animate();

// ============================================
// RESIZE
// ============================================
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ============================================
// UI LOGIC
// ============================================

// Preloader — shorter wait
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('preloader').classList.add('done');
  }, 1800);
});

// Nav background
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('solid', window.scrollY > 60);
}, { passive: true });

// Mobile menu
const burger = document.getElementById('navBurger');
const mobMenu = document.getElementById('mobMenu');
burger.addEventListener('click', () => {
  burger.classList.toggle('active');
  mobMenu.classList.toggle('open');
  document.body.style.overflow = mobMenu.classList.contains('open') ? 'hidden' : '';
});
mobMenu.querySelectorAll('a').forEach((a) => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    burger.classList.remove('active');
    mobMenu.classList.remove('open');
    document.body.style.overflow = '';
    scrollToSection(parseInt(a.dataset.goto));
  });
});

// Nav links
document.querySelectorAll('[data-goto]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    scrollToSection(parseInt(el.dataset.goto));
  });
});

// Progress dots
allDots.forEach((dot) => {
  dot.addEventListener('click', () => {
    scrollToSection(parseInt(dot.dataset.idx));
  });
});

function scrollToSection(idx) {
  if (idx < 0 || idx >= SECTION_COUNT) return;
  const start = sectionThresholds[idx];
  const maxScroll = document.getElementById('scroll-container').offsetHeight - window.innerHeight;
  gsap.to(window, {
    scrollTo: { y: start * maxScroll, autoKill: false },
    duration: 1,
    ease: 'power2.inOut',
  });
}

// Counter animation
const counters = document.querySelectorAll('.stat-val[data-count]');
let countersAnimated = false;

function animateCounters() {
  if (countersAnimated) return;
  countersAnimated = true;
  counters.forEach((el) => {
    const target = parseInt(el.dataset.count);
    const obj = { val: 0 };
    gsap.to(obj, {
      val: target,
      duration: 1.5,
      ease: 'power2.out',
      onUpdate: () => { el.textContent = Math.floor(obj.val); },
      onComplete: () => { el.textContent = target; },
    });
  });
}

const counterCheck = setInterval(() => {
  if (activeSection === 1) {
    animateCounters();
    clearInterval(counterCheck);
  }
}, 200);

// Contact form
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button span');
    btn.textContent = 'Welcome to Unity';
    form.reset();
    setTimeout(() => (btn.textContent = 'Join Unity'), 3000);
  });
}
