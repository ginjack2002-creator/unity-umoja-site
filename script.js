/* ============================================
   UNITY UMOJA — Immersive 3D Website
   Three.js r162 + GSAP ScrollTrigger + Post-Processing
   Camera Spline Flythrough + Cinematic Section Reveals
   ============================================ */

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ============================================
// GLOBALS
// ============================================
const isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
const SECTION_COUNT = 7;
const SCROLL_HEIGHT = 700; // vh
let activeSection = 0;
let scrollProgress = 0;
const mouse = { x: 0, y: 0, tx: 0, ty: 0 };

// ============================================
// THREE.JS SCENE SETUP
// ============================================
const canvas = document.getElementById('three-canvas');
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x1a0f14, 0.008);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
camera.position.set(0, 0, 30);

const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: true,
  antialias: true,
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

// ============================================
// POST-PROCESSING
// ============================================
let composer = null;
if (!isMobile) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.4,  // strength
    0.5,  // radius
    0.6   // threshold
  );
  composer.addPass(bloomPass);

  // Vignette shader
  const vignetteShader = {
    uniforms: {
      tDiffuse: { value: null },
      darkness: { value: 1.2 },
      offset: { value: 1.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float darkness;
      uniform float offset;
      varying vec2 vUv;
      void main() {
        vec4 texel = texture2D(tDiffuse, vUv);
        vec2 uv = (vUv - 0.5) * 2.0;
        float vig = clamp(1.0 - dot(uv, uv) * darkness + offset, 0.0, 1.0);
        gl_FragColor = texel * vig;
      }
    `,
  };
  composer.addPass(new ShaderPass(vignetteShader));
}

// ============================================
// PARTICLE UNIVERSE — Spherical Distribution
// ============================================
const PARTICLE_COUNT = isMobile ? 1500 : 3000;
const particleGeometry = new THREE.BufferGeometry();
const pPositions = new Float32Array(PARTICLE_COUNT * 3);
const pColors = new Float32Array(PARTICLE_COUNT * 3);
const pSizes = new Float32Array(PARTICLE_COUNT);
const pPhases = new Float32Array(PARTICLE_COUNT); // for sparkle

const roseCol = new THREE.Color(0xB76E79);
const goldCol = new THREE.Color(0xD4AF37);
const creamCol = new THREE.Color(0xFFF8F0);
const warmWhite = new THREE.Color(0xFFF0E6);

for (let i = 0; i < PARTICLE_COUNT; i++) {
  const i3 = i * 3;
  // Spherical distribution
  const phi = Math.acos(2 * Math.random() - 1);
  const theta = Math.random() * Math.PI * 2;
  const r = 5 + Math.random() * 45;
  pPositions[i3]     = r * Math.sin(phi) * Math.cos(theta);
  pPositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
  pPositions[i3 + 2] = r * Math.cos(phi);

  const roll = Math.random();
  const c = roll < 0.3 ? roseCol : roll < 0.55 ? goldCol : roll < 0.8 ? warmWhite : creamCol;
  pColors[i3]     = c.r;
  pColors[i3 + 1] = c.g;
  pColors[i3 + 2] = c.b;

  pSizes[i] = Math.random() * 2.5 + 0.5;
  pPhases[i] = Math.random() * Math.PI * 2;
}

particleGeometry.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
particleGeometry.setAttribute('color', new THREE.BufferAttribute(pColors, 3));
particleGeometry.setAttribute('aSize', new THREE.BufferAttribute(pSizes, 1));
particleGeometry.setAttribute('aPhase', new THREE.BufferAttribute(pPhases, 1));

// Custom particle shader with sparkle
const particleShaderMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
  },
  vertexShader: `
    attribute float aSize;
    attribute float aPhase;
    varying vec3 vColor;
    varying float vSparkle;
    uniform float uTime;
    uniform float uPixelRatio;
    void main() {
      vColor = color;
      vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
      float sparkle = 0.5 + 0.5 * sin(uTime * 2.0 + aPhase * 6.28);
      vSparkle = sparkle;
      gl_PointSize = aSize * sparkle * uPixelRatio * (80.0 / -mvPos.z);
      gl_Position = projectionMatrix * mvPos;
    }
  `,
  fragmentShader: `
    varying vec3 vColor;
    varying float vSparkle;
    void main() {
      float d = length(gl_PointCoord - 0.5);
      if (d > 0.5) discard;
      float alpha = smoothstep(0.5, 0.1, d) * vSparkle;
      gl_FragColor = vec4(vColor, alpha * 0.75);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
  vertexColors: true,
});

const particles = new THREE.Points(particleGeometry, particleShaderMat);
scene.add(particles);

// ============================================
// FLOATING WIREFRAME GEOMETRY
// ============================================
const shapeCount = isMobile ? 10 : 22;
const shapes = [];
const shapeGeos = [
  () => new THREE.OctahedronGeometry(1.2, 0),
  () => new THREE.IcosahedronGeometry(0.9, 0),
  () => new THREE.DodecahedronGeometry(0.8, 0),
  () => new THREE.TorusKnotGeometry(0.6, 0.2, 32, 8),
  () => new THREE.TetrahedronGeometry(1, 0),
  () => new THREE.TorusGeometry(0.7, 0.15, 8, 20),
];
const shapeMats = [
  new THREE.MeshBasicMaterial({ color: 0xB76E79, wireframe: true, transparent: true, opacity: 0.12 }),
  new THREE.MeshBasicMaterial({ color: 0xD4AF37, wireframe: true, transparent: true, opacity: 0.08 }),
  new THREE.MeshBasicMaterial({ color: 0xFFF0E6, wireframe: true, transparent: true, opacity: 0.06 }),
];

for (let i = 0; i < shapeCount; i++) {
  const geo = shapeGeos[Math.floor(Math.random() * shapeGeos.length)]();
  const mat = shapeMats[Math.floor(Math.random() * shapeMats.length)].clone();
  const mesh = new THREE.Mesh(geo, mat);

  mesh.position.set(
    (Math.random() - 0.5) * 60,
    (Math.random() - 0.5) * 50,
    (Math.random() - 0.5) * 40 - 5
  );
  mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
  mesh.userData = {
    basePos: mesh.position.clone(),
    speed: Math.random() * 0.5 + 0.2,
    rotSpeed: Math.random() * 0.008 + 0.002,
    floatAmp: Math.random() * 2.5 + 1,
    phase: Math.random() * Math.PI * 2,
  };
  shapes.push(mesh);
  scene.add(mesh);
}

// ============================================
// GODDESS BILLBOARD
// ============================================
let goddessMesh = null;
let goddessTexture = null;
let goddessCanvas = null;
let goddessCtx = null;
const goddessImg = document.getElementById('goddess-src');

function initGoddess() {
  if (!goddessImg || !goddessImg.naturalWidth) return;
  goddessCanvas = document.createElement('canvas');
  const w = goddessImg.naturalWidth || 512;
  const h = goddessImg.naturalHeight || 512;
  goddessCanvas.width = w;
  goddessCanvas.height = h;
  goddessCtx = goddessCanvas.getContext('2d');
  goddessCtx.drawImage(goddessImg, 0, 0, w, h);

  goddessTexture = new THREE.CanvasTexture(goddessCanvas);
  goddessTexture.minFilter = THREE.LinearFilter;
  goddessTexture.magFilter = THREE.LinearFilter;

  const aspect = w / h;
  const height = 14;
  const width = height * aspect;

  const geo = new THREE.PlaneGeometry(width, height);
  const mat = new THREE.MeshBasicMaterial({
    map: goddessTexture,
    transparent: true,
    alphaTest: 0.15,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  goddessMesh = new THREE.Mesh(geo, mat);
  goddessMesh.position.set(0, 0, 5);
  scene.add(goddessMesh);
}

// Try to init goddess immediately or on load
if (goddessImg.complete && goddessImg.naturalWidth) {
  initGoddess();
} else if (goddessImg) {
  goddessImg.addEventListener('load', initGoddess);
}

// ============================================
// ORBITING LIGHT RINGS around goddess
// ============================================
const orbRings = [];
const ringColors = [0xB76E79, 0xD4AF37, 0xE8C5CA];
for (let i = 0; i < 3; i++) {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(5 + i * 2.5, 0.025, 16, 80),
    new THREE.MeshBasicMaterial({
      color: ringColors[i],
      transparent: true,
      opacity: 0.22 - i * 0.05,
    })
  );
  ring.position.set(0, 0, 5);
  ring.userData = { speed: 0.004 + i * 0.0015, tilt: 0.3 + i * 0.25, baseOpacity: 0.22 - i * 0.05 };
  orbRings.push(ring);
  scene.add(ring);
}

// ============================================
// SECTION-SPECIFIC 3D ELEMENTS
// ============================================

// Journey: 7 glowing spheres along curved path
const journeySpheres = [];
const journeyCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-8, 2, 0),
  new THREE.Vector3(-4, -1, 3),
  new THREE.Vector3(0, 1, -2),
  new THREE.Vector3(4, -2, 2),
  new THREE.Vector3(8, 0, -1),
  new THREE.Vector3(12, 2, 1),
  new THREE.Vector3(16, -1, 3),
]);
for (let i = 0; i < 7; i++) {
  const t = i / 6;
  const pt = journeyCurve.getPointAt(t);
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 16, 16),
    new THREE.MeshBasicMaterial({
      color: i === 6 ? 0xD4AF37 : 0xB76E79,
      transparent: true,
      opacity: 0,
    })
  );
  sphere.position.copy(pt);
  sphere.userData = { basePos: pt.clone(), idx: i };
  journeySpheres.push(sphere);
  scene.add(sphere);
}

// Leadership: 9 small rotating polyhedra in circle
const leaderPolyhedra = [];
for (let i = 0; i < 9; i++) {
  const angle = (i / 9) * Math.PI * 2;
  const radius = 6;
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.3, 0),
    new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? 0xB76E79 : 0xD4AF37,
      wireframe: true,
      transparent: true,
      opacity: 0,
    })
  );
  mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
  mesh.userData = { angle, radius, idx: i };
  leaderPolyhedra.push(mesh);
  scene.add(mesh);
}

// Events: 3 floating planes
const eventPlanes = [];
for (let i = 0; i < 3; i++) {
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 1.2),
    new THREE.MeshBasicMaterial({
      color: 0xB76E79,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      wireframe: true,
    })
  );
  plane.position.set(-4 + i * 4, 0, 2);
  plane.userData = { baseX: -4 + i * 4, idx: i };
  eventPlanes.push(plane);
  scene.add(plane);
}

// ============================================
// CAMERA SPLINE FLYTHROUGH
// ============================================
const cameraSpline = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 30),     // 0: Wide establishing shot
  new THREE.Vector3(8, 3, 20),     // 1: Orbit right
  new THREE.Vector3(-5, 5, 15),    // 2: Sweep left and up
  new THREE.Vector3(0, -2, 10),    // 3: Dive down
  new THREE.Vector3(6, 0, 5),      // 4: Close intimate
  new THREE.Vector3(-4, 3, 8),     // 5: Pull back
  new THREE.Vector3(0, 0, 12),     // 6: Final centered
]);

const lookAtSpline = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0, 5),
  new THREE.Vector3(2, 1, 3),
  new THREE.Vector3(-1, 2, 0),
  new THREE.Vector3(0, 0, -2),
  new THREE.Vector3(1, 0, -3),
  new THREE.Vector3(-1, 1, -1),
  new THREE.Vector3(0, 0, 0),
]);

// ============================================
// MOUSE TRACKING
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

// Each section's center in scroll progress (0-1)
const sectionCenters = [0.07, 0.22, 0.37, 0.52, 0.67, 0.82, 0.95];
// Thresholds for switching sections
const sectionThresholds = [0, 0.15, 0.30, 0.45, 0.60, 0.75, 0.90, 1.01];

// Track target scroll progress (smoothed)
let targetScrollProgress = 0;

// Read raw scroll position every frame via scroll event
function readScrollProgress() {
  const container = document.getElementById('scroll-container');
  const maxScroll = container.offsetHeight - window.innerHeight;
  if (maxScroll <= 0) return 0;
  return Math.max(0, Math.min(1, window.scrollY / maxScroll));
}

// Panel opacity states — managed directly, no competing tweens
const panelStates = new Array(SECTION_COUNT).fill(0);
panelStates[0] = 1; // Hero starts visible

function getSectionFromProgress(progress) {
  for (let i = sectionThresholds.length - 2; i >= 0; i--) {
    if (progress >= sectionThresholds[i]) return i;
  }
  return 0;
}

// Compute panel opacity based on scroll progress
// Each panel fades in as we approach its range and fades out as we leave
function computePanelOpacity(sectionIdx, progress) {
  const start = sectionThresholds[sectionIdx];
  const end = sectionThresholds[sectionIdx + 1];
  const fadeZone = 0.04; // 4% of total scroll for fade transitions

  if (progress < start - fadeZone || progress > end + fadeZone) return 0;

  // Fade in zone
  if (progress < start + fadeZone) {
    return Math.max(0, Math.min(1, (progress - start + fadeZone) / (fadeZone * 2)));
  }
  // Fade out zone
  if (progress > end - fadeZone) {
    return Math.max(0, Math.min(1, (end + fadeZone - progress) / (fadeZone * 2)));
  }
  // Fully visible
  return 1;
}

// Apply panel visibility each frame
function updatePanels(progress) {
  const currentSection = getSectionFromProgress(progress);

  panels.forEach((panel, i) => {
    const targetOpacity = computePanelOpacity(i, progress);

    // Smooth interpolation for silky transitions
    panelStates[i] += (targetOpacity - panelStates[i]) * 0.15;

    // Snap near-zero / near-one for clean hide/show
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
      // Reset reveal animations for re-entry
      panel.querySelectorAll('.reveal-up, .reveal-left, .reveal-scale').forEach(el => {
        el.classList.remove('visible');
      });
    }
  });

  // Update active section tracking
  if (currentSection !== activeSection) {
    activeSection = currentSection;
  }

  // Update progress dots
  allDots.forEach((d, i) => d.classList.toggle('on', i === currentSection));

  // Trigger reveal animations for active panel
  const activePanel = panels[currentSection];
  if (activePanel && panelStates[currentSection] > 0.5) {
    activePanel.querySelectorAll('.reveal-up:not(.visible), .reveal-left:not(.visible), .reveal-scale:not(.visible)').forEach((el, i) => {
      setTimeout(() => el.classList.add('visible'), i * 80);
    });
  }
}

// Initialize: hero panel visible
panels[0].style.visibility = 'visible';
panels[0].style.opacity = '1';
panels[0].classList.add('active');

// ============================================
// CAMERA UPDATE (runs every frame in animate loop)
// ============================================
const cameraTargetPos = new THREE.Vector3();
const cameraTargetLookAt = new THREE.Vector3();
const currentLookAt = new THREE.Vector3(0, 0, 5);

function updateCamera() {
  const t = Math.max(0, Math.min(0.9999, scrollProgress));
  cameraSpline.getPointAt(t, cameraTargetPos);
  lookAtSpline.getPointAt(t, cameraTargetLookAt);

  // Add mouse parallax offset
  cameraTargetPos.x += mouse.x * 1.5;
  cameraTargetPos.y += mouse.y * 1.0;
  cameraTargetLookAt.x += mouse.x * 0.5;
  cameraTargetLookAt.y += mouse.y * 0.3;

  // Smooth lerp every frame for silky camera movement
  camera.position.lerp(cameraTargetPos, 0.06);
  currentLookAt.lerp(cameraTargetLookAt, 0.06);
  camera.lookAt(currentLookAt);
}

// ============================================
// 3D ELEMENT UPDATES PER SECTION
// ============================================
function update3DElements(progress) {
  // Goddess: fade after hero section
  if (goddessMesh) {
    const goddessOpacity = Math.max(0, 1 - (progress - 0.1) * 8);
    goddessMesh.material.opacity = goddessOpacity;
    const s = 1 - Math.max(0, (progress - 0.1) * 3);
    goddessMesh.scale.setScalar(Math.max(0.3, s));
  }

  // Orbiting rings: visible during hero
  orbRings.forEach((ring, i) => {
    const fade = Math.max(0, 1 - progress * 7);
    ring.material.opacity = ring.userData.baseOpacity * fade;
  });

  // Journey spheres: visible during section 2
  const journeyActive = progress >= 0.28 && progress <= 0.47;
  journeySpheres.forEach((s, i) => {
    const targetOp = journeyActive ? 0.7 + (i === 6 ? 0.3 : 0) : 0;
    s.material.opacity += (targetOp - s.material.opacity) * 0.08;
  });

  // Leadership polyhedra: visible during section 3
  const leaderActive = progress >= 0.43 && progress <= 0.62;
  leaderPolyhedra.forEach((m) => {
    const targetOp = leaderActive ? 0.25 : 0;
    m.material.opacity += (targetOp - m.material.opacity) * 0.08;
  });

  // Event planes: visible during section 4
  const eventActive = progress >= 0.58 && progress <= 0.77;
  eventPlanes.forEach((p) => {
    const targetOp = eventActive ? 0.15 : 0;
    p.material.opacity += (targetOp - p.material.opacity) * 0.08;
  });
}

// ============================================
// ANIMATION LOOP
// ============================================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const elapsed = clock.getElapsedTime();

  // ---- Read scroll position every frame ----
  targetScrollProgress = readScrollProgress();
  scrollProgress += (targetScrollProgress - scrollProgress) * 0.08;

  // ---- Update panels based on smooth scroll progress ----
  updatePanels(scrollProgress);

  // ---- Update camera along spline ----
  updateCamera();

  // ---- Update section-specific 3D elements ----
  update3DElements(scrollProgress);

  // ---- Smooth mouse ----
  mouse.x += (mouse.tx - mouse.x) * 0.05;
  mouse.y += (mouse.ty - mouse.y) * 0.05;

  // Particle time uniform
  particleShaderMat.uniforms.uTime.value = elapsed;

  // Gentle particle rotation
  particles.rotation.y = elapsed * 0.015 + mouse.x * 0.15;
  particles.rotation.x = elapsed * 0.008 + mouse.y * 0.1;

  // Particle sine displacement
  const posArr = particles.geometry.attributes.position.array;
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const i3 = i * 3;
    posArr[i3 + 1] += Math.sin(elapsed * 0.25 + pPhases[i]) * 0.002;
  }
  particles.geometry.attributes.position.needsUpdate = true;

  // Floating shapes animation
  shapes.forEach((shape) => {
    const d = shape.userData;
    shape.position.y = d.basePos.y + Math.sin(elapsed * d.speed + d.phase) * d.floatAmp;
    shape.position.x = d.basePos.x + Math.cos(elapsed * d.speed * 0.7 + d.phase) * d.floatAmp * 0.4;
    shape.rotation.x += d.rotSpeed;
    shape.rotation.y += d.rotSpeed * 0.7;
  });

  // Orbiting rings
  orbRings.forEach((ring, i) => {
    ring.rotation.x = ring.userData.tilt + elapsed * ring.userData.speed;
    ring.rotation.y = elapsed * ring.userData.speed * 1.3;
    ring.rotation.z = Math.sin(elapsed * 0.4 + i) * 0.15;
  });

  // Goddess texture update (for GIF animation)
  if (goddessCtx && goddessImg && goddessMesh && goddessMesh.material.opacity > 0.01) {
    goddessCtx.drawImage(goddessImg, 0, 0, goddessCanvas.width, goddessCanvas.height);
    goddessTexture.needsUpdate = true;
    goddessMesh.lookAt(camera.position);
  }

  // Journey spheres pulse
  journeySpheres.forEach((s, i) => {
    if (s.material.opacity > 0.01) {
      const pulse = 1 + Math.sin(elapsed * 2 + i * 0.8) * 0.2;
      s.scale.setScalar(pulse);
    }
  });

  // Leadership polyhedra orbit
  leaderPolyhedra.forEach((m, i) => {
    if (m.material.opacity > 0.01) {
      const angle = m.userData.angle + elapsed * 0.3;
      m.position.x = Math.cos(angle) * m.userData.radius;
      m.position.y = Math.sin(angle) * m.userData.radius;
      m.rotation.x += 0.01;
      m.rotation.z += 0.008;
    }
  });

  // Event planes float
  eventPlanes.forEach((p, i) => {
    if (p.material.opacity > 0.01) {
      p.position.y = Math.sin(elapsed * 0.5 + i * 1.5) * 1.5;
      p.rotation.y = elapsed * 0.2 + i;
    }
  });

  // Render
  if (composer) {
    composer.render();
  } else {
    renderer.render(scene, camera);
  }
}
animate();

// ============================================
// RESIZE HANDLER
// ============================================
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  if (composer) {
    composer.setSize(w, h);
  }
  particleShaderMat.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
});

// ============================================
// UI LOGIC
// ============================================

// ---- Preloader ----
window.addEventListener('load', () => {
  setTimeout(() => {
    document.getElementById('preloader').classList.add('done');
  }, 2800);
});

// ---- Nav solid on scroll ----
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => {
  nav.classList.toggle('solid', window.scrollY > 60);
}, { passive: true });

// ---- Mobile menu ----
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
    const idx = parseInt(a.dataset.goto);
    scrollToSection(idx);
  });
});

// ---- Navigation links (data-goto) ----
document.querySelectorAll('[data-goto]').forEach((el) => {
  el.addEventListener('click', (e) => {
    e.preventDefault();
    const idx = parseInt(el.dataset.goto);
    scrollToSection(idx);
  });
});

// ---- Progress dot clicks ----
allDots.forEach((dot) => {
  dot.addEventListener('click', () => {
    const idx = parseInt(dot.dataset.idx);
    scrollToSection(idx);
  });
});

function scrollToSection(idx) {
  if (idx < 0 || idx >= SECTION_COUNT) return;
  const start = sectionThresholds[idx];
  const maxScroll = document.getElementById('scroll-container').offsetHeight - window.innerHeight;
  const scrollTarget = start * maxScroll;
  gsap.to(window, {
    scrollTo: { y: scrollTarget, autoKill: false },
    duration: 1.2,
    ease: 'power3.inOut',
  });
}

// ---- Counter animation ----
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

// Trigger counters when About section is active
const counterCheck = setInterval(() => {
  if (activeSection === 1) {
    animateCounters();
    clearInterval(counterCheck);
  }
}, 200);

// ---- Contact form ----
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

// ---- Gallery 3D tilt on hover ----
if (!isMobile) {
  document.querySelectorAll('.gal-cell').forEach((cell) => {
    cell.addEventListener('mousemove', (e) => {
      const rect = cell.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      cell.style.transform = `perspective(800px) rotateY(${x * 12}deg) rotateX(${-y * 12}deg) scale(1.02)`;
    });
    cell.addEventListener('mouseleave', () => {
      cell.style.transform = 'perspective(800px) rotateY(0) rotateX(0) scale(1)';
      cell.style.transition = 'transform 0.5s ease';
    });
    cell.addEventListener('mouseenter', () => {
      cell.style.transition = 'none';
    });
  });
}
