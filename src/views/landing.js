import { setView } from '../store/appStore.js';

export function initLanding() {
  const landing = document.getElementById('view-landing');

  // Buttons marked data-go="view-name" navigate between views.
  landing.querySelectorAll('[data-go]').forEach((btn) => {
    btn.addEventListener('click', () => setView({ name: btn.dataset.go }));
  });

  // Hero parallax: layers drift at their own speed on scroll.
  const layers = landing.querySelectorAll('[data-parallax]');
  let raf = 0;
  const onScroll = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      layers.forEach((el) => {
        el.style.transform = `translate3d(0, ${window.scrollY * parseFloat(el.dataset.parallax)}px, 0)`;
      });
    });
  };
  window.addEventListener('scroll', onScroll, { passive: true });

  // Scroll-reveal: elements fade up when they enter the viewport.
  const io = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add('revealed');
    }),
    { threshold: 0.15 }
  );
  landing.querySelectorAll('.reveal').forEach((n) => io.observe(n));
}
