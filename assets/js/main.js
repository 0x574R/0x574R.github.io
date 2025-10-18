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

 }); }
  async function run(){ A.textContent=""; B.textContent=""; for(let i=0;i<Math.max(seqVictim.length, seqAttacker.length);i++){ if(seqVictim[i]) await type(B, seqVictim[i], 22); if(seqAttacker[i]) await type(A, seqAttacker[i], 22); } }
  const grid = document.querySelector('.term-grid'); let played=false;
  const io = new IntersectionObserver(es=>{ es.forEach(e=>{ if(e.isIntersecting && !played){ played=true; run(); } }); }, {threshold:.12});
  if(grid) io.observe(grid); else run();
})();

// Hero terminals typing (attacker-only command entry)
(function(){
  const attacker = document.querySelector('[data-ty="a"]'); // attacker
  const victim   = document.querySelector('[data-ty="b"]'); // victim
  if(!attacker || !victim) return;

  // Only the attacker types commands; victim stays mostly idle
  const seqAttacker = [
    "id",
    "uid=0(root) gid=0(root) groups=0(root)"
  ];

  function typeLine(el, str, delay=24){
    return new Promise(resolve => {
      let i = 0;
      function step(){
        if(i < str.length){
          el.textContent += str[i++];
          setTimeout(step, delay);
        }else{
          el.textContent += "\n";
          resolve();
        }
      }
      step();
    });
  }

  async function run(){
    attacker.textContent = "";
    victim.textContent = ""; // leave blank for idle victim
    for(let i=0;i<seqAttacker.length;i++){
      await typeLine(attacker, seqAttacker[i], 22);
    }
  }

  const grid = document.querySelector('.term-grid');
  let played = false;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{
      if(e.isIntersecting && !played){
        played = true;
        run();
      }
    });
  }, {threshold:.12});
  if(grid) io.observe(grid); else run();
})();
// Post content: reveal children on scroll with small stagger
(function(){
  const body = document.querySelector('.post .post-body');
  if(!body) return;
  const nodes = Array.from(body.children);
  nodes.forEach((el,i)=>{
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 40) + 'ms';
  });
})();
