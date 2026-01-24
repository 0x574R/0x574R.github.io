/* RAZOR - micro interactions
   - Reveal on scroll for elements with [data-rz-reveal]
   - Safe for instant navigation (Material)
*/

(function () {
  function revealInit() {
    const els = Array.from(document.querySelectorAll('[data-rz-reveal]'));
    if (!els.length) return;

    // Ensure initial state
    els.forEach(el => el.classList.add('rz-reveal'));

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('rz-reveal--in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.1 }
    );

    els.forEach(el => io.observe(el));
  }

  // Material for MkDocs uses instant navigation
  document.addEventListener('DOMContentLoaded', revealInit);
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'complete') revealInit();
  });

  // Hook into Material navigation events (best-effort)
  document.addEventListener('DOMContentSwitch', revealInit);
  document.addEventListener('navigation', revealInit);

  // Fallback: re-init after a short delay (covers SPA nav)
  setTimeout(revealInit, 250);
})();
