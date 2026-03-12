/* ============================================
   UNITY UMOJA — Apple-Clean Interactive Site
   Click goddess → transition to Unity → navigate
   No Three.js, no particles, just intention
   ============================================ */

// ============================================
// ELEMENTS
// ============================================
const stage = document.getElementById('stage');
const goddess = document.getElementById('goddess');
const clickHint = document.getElementById('clickHint');
const reveal = document.getElementById('reveal');
const revealLogo = document.getElementById('revealLogo');
const wordNav = document.getElementById('wordNav');
const words = document.querySelectorAll('.word');
const content = document.querySelector('.content');
const topNav = document.getElementById('topNav');
const burger = document.getElementById('burger');
const mobileMenu = document.getElementById('mobileMenu');

// ============================================
// STAGE 1 → STAGE 2: Goddess click transition
// ============================================
stage.addEventListener('click', () => {
  // Goddess scales up and fades
  goddess.style.transform = 'scale(1.15)';
  goddess.style.opacity = '0';
  clickHint.style.opacity = '0';

  // After goddess fades, show reveal
  setTimeout(() => {
    stage.classList.add('gone');
    reveal.classList.add('active');

    // Stagger the navigation words
    setTimeout(() => {
      words.forEach((word, i) => {
        const delay = parseInt(word.dataset.delay) || 0;
        setTimeout(() => word.classList.add('visible'), 600 + delay * 120);
      });
    }, 200);
  }, 600);
});

// ============================================
// STAGE 2 → CONTENT: Word click enters the site
// ============================================
words.forEach(word => {
  word.addEventListener('click', (e) => {
    e.preventDefault();
    const target = word.getAttribute('href');
    enterSite(target);
  });
});

function enterSite(scrollTarget) {
  // Fade out the reveal screen
  reveal.classList.add('gone');

  // Show content and nav
  setTimeout(() => {
    content.classList.add('active');
    topNav.classList.add('visible');

    // Scroll to the target section
    if (scrollTarget) {
      setTimeout(() => {
        const el = document.querySelector(scrollTarget);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }

    // Initialize scroll observers
    initScrollObserver();
    initNavObserver();
  }, 500);
}

// ============================================
// SCROLL FADE-IN OBSERVER
// ============================================
function initScrollObserver() {
  const fadeEls = document.querySelectorAll('.fade-in');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger siblings slightly
        const siblings = Array.from(entry.target.parentElement.querySelectorAll('.fade-in'));
        const idx = siblings.indexOf(entry.target);
        setTimeout(() => {
          entry.target.classList.add('visible');
        }, idx * 80);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });

  fadeEls.forEach(el => observer.observe(el));
}

// ============================================
// NAV DARK/LIGHT OBSERVER
// ============================================
function initNavObserver() {
  const darkSections = document.querySelectorAll('.page-dark');
  const navObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        topNav.classList.add('dark');
      } else {
        // Check if ANY dark section is visible
        const anyDark = Array.from(darkSections).some(s => {
          const rect = s.getBoundingClientRect();
          return rect.top < 72 && rect.bottom > 72;
        });
        if (!anyDark) topNav.classList.remove('dark');
      }
    });
  }, { threshold: 0, rootMargin: '-72px 0px 0px 0px' });

  darkSections.forEach(s => navObserver.observe(s));
}

// ============================================
// MOBILE MENU
// ============================================
burger.addEventListener('click', () => {
  burger.classList.toggle('active');
  mobileMenu.classList.toggle('open');
  document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
});

mobileMenu.querySelectorAll('a').forEach(a => {
  a.addEventListener('click', () => {
    burger.classList.remove('active');
    mobileMenu.classList.remove('open');
    document.body.style.overflow = '';
  });
});

// ============================================
// TOP NAV LINKS — smooth scroll
// ============================================
document.querySelectorAll('.top-nav-links a').forEach(a => {
  a.addEventListener('click', (e) => {
    e.preventDefault();
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// Logo click returns to goddess
document.querySelector('.top-nav-logo').addEventListener('click', (e) => {
  e.preventDefault();
  // Fade out content
  content.classList.remove('active');
  topNav.classList.remove('visible');

  // Reset and show stage
  setTimeout(() => {
    goddess.style.transform = '';
    goddess.style.opacity = '';
    clickHint.style.opacity = '';
    stage.classList.remove('gone');
    reveal.classList.remove('active');
    reveal.classList.remove('gone');
    words.forEach(w => w.classList.remove('visible'));
    window.scrollTo(0, 0);
  }, 400);
});

// ============================================
// COUNTER ANIMATION
// ============================================
let countersAnimated = false;

function initCounters() {
  if (countersAnimated) return;
  const counters = document.querySelectorAll('.stat-num[data-count]');
  if (!counters.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !countersAnimated) {
        countersAnimated = true;
        counters.forEach(el => {
          const target = parseInt(el.dataset.count);
          const start = performance.now();
          const duration = 1200;
          function step(now) {
            const t = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.floor(eased * target);
            if (t < 1) requestAnimationFrame(step);
            else el.textContent = target;
          }
          requestAnimationFrame(step);
        });
        observer.disconnect();
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

// Run counter init when content becomes visible
const contentObserver = new MutationObserver(() => {
  if (content.classList.contains('active')) {
    initCounters();
  }
});
contentObserver.observe(content, { attributes: true, attributeFilter: ['class'] });

// ============================================
// CONTACT FORM
// ============================================
const form = document.getElementById('contactForm');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.textContent = 'Welcome to Unity';
    form.reset();
    setTimeout(() => (btn.textContent = 'Join Unity'), 3000);
  });
}
