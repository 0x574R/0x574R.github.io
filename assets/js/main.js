// === Razor Blog JS (restored & enhanced) ===

// Reveal on scroll + stagger for cards
(function(){
  const revealEls = Array.from(document.querySelectorAll('.reveal'));
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } });
  }, {threshold: .12});
  revealEls.forEach(el=>io.observe(el));

  // Stagger cards on index grid
  const cards = Array.from(document.querySelectorAll('.grid .card'));
  cards.forEach((el,i)=>{ el.classList.add('reveal'); el.style.transitionDelay = (i*70)+'ms'; });
})();

// Hero terminals typing (attacker-only command entry)
(function(){
  const attacker = document.querySelector('[data-ty="a"]'); // attacker
  const victim   = document.querySelector('[data-ty="b"]'); // victim
  if(!attacker || !victim) return;

  const seqAttacker = [
    "id",
    "uid=0(root) gid=0(root) groups=0(root)"
  ];

  function typeLine(el, str, delay){
    return new Promise(resolve => {
      let i = 0;
      (function step(){
        if(i < str.length){
          el.textContent += str.charAt(i++);
          setTimeout(step, delay);
        } else {
          el.textContent += "\n";
          resolve();
        }
      })();
    });
  }

  async function run(){
    attacker.textContent = "";
    victim.textContent = ""; // victim idle
    for(const line of seqAttacker){
      await typeLine(attacker, line, 22);
    }
  }

  // Play once when hero terminals appear
  const grid = document.querySelector('.term-grid');
  let played = false;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting && !played){
        played = true; run(); io.unobserve(e.target);
      }
    });
  }, {threshold: .12});
  if(grid) io.observe(grid); else run();
})();

// Post utilities: reading time + dynamic ToC + reveal inside post
(function(){
  const container = document.querySelector('.post .post-body');
  if(!container) return;

  // Reading time
  const words = container.textContent.trim().split(/\s+/).length;
  const rt = document.querySelector('[data-reading-time]');
  if(rt){ rt.textContent = Math.max(1, Math.round(words/220)) + ' min'; }

  // Generate ToC
  const tocRoot = document.querySelector('.toc ul');
  if(tocRoot){
    tocRoot.innerHTML = "";
    const headings = container.querySelectorAll('h2, h3');
    headings.forEach((h, idx)=>{
      if(!h.id){ h.id = (h.textContent.trim().toLowerCase().replace(/[^\w]+/g,'-') || 'sec') + '-' + idx; }
      const li = document.createElement('li');
      li.className = 'level-' + h.tagName.toLowerCase();
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      tocRoot.appendChild(li);
    });
  }

  // Reveal children of post with small stagger
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target);} });
  }, {threshold: .09});
  Array.from(container.children).forEach((el,i)=>{
    el.classList.add('reveal');
    el.style.transitionDelay = (i*35)+'ms';
    io.observe(el);
  });
})();
