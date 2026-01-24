/* ============================================
   RAZOR Security Blog - JavaScript Effects
   ============================================ */

document.addEventListener('DOMContentLoaded', function() {
  
  // ============================================
  // Terminal Typing Effect
  // ============================================
  
  function typeWriter(element, text, speed = 50) {
    let i = 0;
    element.innerHTML = '';
    
    function type() {
      if (i < text.length) {
        element.innerHTML += text.charAt(i);
        i++;
        setTimeout(type, speed);
      }
    }
    
    type();
  }
  
  // Apply to elements with .auto-type class
  document.querySelectorAll('.auto-type').forEach(el => {
    const text = el.getAttribute('data-text') || el.textContent;
    typeWriter(el, text);
  });
  
  // ============================================
  // Scroll Reveal Animation
  // ============================================
  
  const revealElements = document.querySelectorAll('.reveal, .card, .stat-item');
  
  const revealOnScroll = () => {
    revealElements.forEach(el => {
      const windowHeight = window.innerHeight;
      const elementTop = el.getBoundingClientRect().top;
      const elementVisible = 150;
      
      if (elementTop < windowHeight - elementVisible) {
        el.classList.add('active');
      }
    });
  };
  
  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll(); // Initial check
  
  // ============================================
  // Smooth Anchor Scrolling
  // ============================================
  
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
  
  // ============================================
  // Code Block Copy Enhancement
  // ============================================
  
  document.querySelectorAll('pre code').forEach(block => {
    // Add line numbers visual effect on hover
    block.addEventListener('mouseenter', function() {
      this.parentElement.style.boxShadow = '0 0 30px rgba(0, 255, 65, 0.2)';
    });
    
    block.addEventListener('mouseleave', function() {
      this.parentElement.style.boxShadow = '';
    });
  });
  
  // ============================================
  // Dynamic Header Shadow on Scroll
  // ============================================
  
  const header = document.querySelector('.md-header');
  
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.style.boxShadow = '0 4px 30px rgba(0, 255, 65, 0.15)';
    } else {
      header.style.boxShadow = '0 2px 20px rgba(0, 255, 65, 0.1)';
    }
  });
  
  // ============================================
  // Interactive Stats Counter
  // ============================================
  
  function animateCounter(element, target, duration = 2000) {
    let start = 0;
    const increment = target / (duration / 16);
    
    const updateCounter = () => {
      start += increment;
      if (start < target) {
        element.textContent = Math.floor(start);
        requestAnimationFrame(updateCounter);
      } else {
        element.textContent = target;
      }
    };
    
    updateCounter();
  }
  
  // Observe stat numbers
  const statNumbers = document.querySelectorAll('.stat-number');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.getAttribute('data-target'));
        if (target) {
          animateCounter(entry.target, target);
        }
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });
  
  statNumbers.forEach(stat => observer.observe(stat));
  
  // ============================================
  // Keyboard Navigation Enhancement
  // ============================================
  
  document.addEventListener('keydown', (e) => {
    // Press '/' to focus search
    if (e.key === '/' && !e.ctrlKey && !e.metaKey) {
      const searchInput = document.querySelector('.md-search__input');
      if (searchInput && document.activeElement !== searchInput) {
        e.preventDefault();
        searchInput.focus();
      }
    }
    
    // Press 'Escape' to close search
    if (e.key === 'Escape') {
      const searchInput = document.querySelector('.md-search__input');
      if (document.activeElement === searchInput) {
        searchInput.blur();
      }
    }
  });
  
  // ============================================
  // Console Easter Egg
  // ============================================
  
  console.log('%c██████╗  █████╗ ███████╗ ██████╗ ██████╗ ', 'color: #00ff41; font-family: monospace;');
  console.log('%c██╔══██╗██╔══██╗╚══███╔╝██╔═══██╗██╔══██╗', 'color: #00ff41; font-family: monospace;');
  console.log('%c██████╔╝███████║  ███╔╝ ██║   ██║██████╔╝', 'color: #00ff41; font-family: monospace;');
  console.log('%c██╔══██╗██╔══██║ ███╔╝  ██║   ██║██╔══██╗', 'color: #00ff41; font-family: monospace;');
  console.log('%c██║  ██║██║  ██║███████╗╚██████╔╝██║  ██║', 'color: #00ff41; font-family: monospace;');
  console.log('%c╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝ ╚═╝  ╚═╝', 'color: #00ff41; font-family: monospace;');
  console.log('%c', 'padding: 5px;');
  console.log('%c[*] Security Blog by 0x574R', 'color: #00d4ff; font-family: monospace; font-size: 12px;');
  console.log('%c[*] Offensive Security Research', 'color: #00d4ff; font-family: monospace; font-size: 12px;');
  console.log('%c', 'padding: 5px;');
  
  // ============================================
  // Mobile Menu Enhancement
  // ============================================
  
  const menuToggle = document.querySelector('.md-header__button.md-icon');
  if (menuToggle) {
    menuToggle.addEventListener('click', () => {
      document.body.classList.toggle('menu-open');
    });
  }
  
  // ============================================
  // External Link Handler
  // ============================================
  
  document.querySelectorAll('a[href^="http"]').forEach(link => {
    if (!link.href.includes(window.location.hostname)) {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    }
  });
  
  // ============================================
  // Table of Contents Highlight
  // ============================================
  
  const tocLinks = document.querySelectorAll('.md-nav__link');
  const sections = document.querySelectorAll('h2[id], h3[id]');
  
  window.addEventListener('scroll', () => {
    let current = '';
    
    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      if (window.scrollY >= sectionTop - 100) {
        current = section.getAttribute('id');
      }
    });
    
    tocLinks.forEach(link => {
      link.classList.remove('md-nav__link--active');
      if (link.getAttribute('href') === '#' + current) {
        link.classList.add('md-nav__link--active');
      }
    });
  });
  
  // ============================================
  // Performance: Lazy Load Images
  // ============================================
  
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          imageObserver.unobserve(img);
        }
      });
    });
    
    document.querySelectorAll('img[data-src]').forEach(img => {
      imageObserver.observe(img);
    });
  }
  
});

// ============================================
// Matrix Rain Effect (Optional - Disabled by default)
// ============================================

function createMatrixRain() {
  const canvas = document.createElement('canvas');
  canvas.id = 'matrix-canvas';
  canvas.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: -1;
    opacity: 0.05;
  `;
  document.body.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  
  const chars = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';
  const fontSize = 14;
  const columns = canvas.width / fontSize;
  const drops = Array(Math.floor(columns)).fill(1);
  
  function draw() {
    ctx.fillStyle = 'rgba(10, 10, 10, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#00ff41';
    ctx.font = `${fontSize}px monospace`;
    
    drops.forEach((y, i) => {
      const text = chars[Math.floor(Math.random() * chars.length)];
      ctx.fillText(text, i * fontSize, y * fontSize);
      
      if (y * fontSize > canvas.height && Math.random() > 0.975) {
        drops[i] = 0;
      }
      drops[i]++;
    });
  }
  
  setInterval(draw, 50);
  
  window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

// Uncomment to enable Matrix rain effect:
// createMatrixRain();
