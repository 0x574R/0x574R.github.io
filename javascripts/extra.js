// Extra JavaScript for enhanced UX

document.addEventListener('DOMContentLoaded', function() {
  // Add copy feedback
  document.querySelectorAll('.md-clipboard').forEach(btn => {
    btn.addEventListener('click', function() {
      const originalTitle = this.title;
      this.title = '¡Copiado!';
      setTimeout(() => {
        this.title = originalTitle;
      }, 2000);
    });
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Add animation on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-in');
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.grid.cards > ul > li, .admonition, pre').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });

  // Animate in class
  const style = document.createElement('style');
  style.textContent = `
    .animate-in {
      opacity: 1 !important;
      transform: translateY(0) !important;
    }
  `;
  document.head.appendChild(style);

  // Console easter egg
  console.log('%c0x574R', 'font-size: 48px; font-weight: bold; color: #a855f7; text-shadow: 2px 2px 0 #22d3ee;');
  console.log('%cOffensive Security Research', 'font-size: 16px; color: #94a3b8;');
});
