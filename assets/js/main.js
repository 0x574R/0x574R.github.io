(function(){
  // Reveal on scroll
  const els = Array.from(document.querySelectorAll('.reveal'));
  const io = new IntersectionObserver((entries)=>{
    for (const e of entries){
      if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); }
    }
  }, {threshold: .12});
  els.forEach(el=>io.observe(el));
})();

// Table of contents + reading time
(function(){
  const container = document.querySelector('.post .post-body');
  if(!container) return;
  const words = container.innerText.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.round(words/220));
  const rt = document.querySelector('[data-reading-time]');
  if(rt) rt.textContent = minutes + ' min';
  const tocRoot = document.querySelector('.toc ul');
  if(!tocRoot) return;
  const hs = container.querySelectorAll('h2, h3');
  hs.forEach((h,i)=>{
    if(!h.id) h.id = 'sec-' + (i+1);
    const li = document.createElement('li');
    li.className = 'toc-' + h.tagName.toLowerCase();
    const a = document.createElement('a'); a.href = '#' + h.id; a.textContent = h.textContent;
    li.appendChild(a);
    tocRoot.appendChild(li);
  });
})();
