
if(!window.__CYBER_INIT__){
  window.__CYBER_INIT__ = true;

  (function(){
    const BRAND = (window.BRAND_NAME || document.querySelector('meta[name="application-name"]')?.content || 'CYBER·LAB').trim();
    const brandNameEl = document.querySelector('[data-typing="name"]');
    const subtitleEl = document.querySelector('[data-typing="subtitle"]');
    function type(el, text, speed=55){
      return new Promise((resolve)=>{
        el.textContent='';
        let i=0;
        const t=setInterval(()=>{
          el.textContent += (text[i++]||'');
          if(i>text.length){ clearInterval(t); resolve(); }
        }, speed);
      });
    }
    function erase(el, speed=35){
      return new Promise((resolve)=>{
        const t=setInterval(()=>{
          el.textContent = el.textContent.slice(0,-1);
          if(el.textContent.length===0){ clearInterval(t); resolve(); }
        }, speed);
      });
    }
    (async ()=>{
      if(brandNameEl){ await type(brandNameEl, BRAND); }
      const phrases = ["cybersecurity","pentesting","assembly x86-64","linux tricks","reverse shells","offensive security"];
      if(subtitleEl){
        let idx=0;
        while(true){
          const p=phrases[idx++%phrases.length];
          await erase(subtitleEl, 12);
          await type(subtitleEl, p, 40);
          await new Promise(r=>setTimeout(r,1500));
        }
      }
    })();
  })();

  (function(){
    const blocks = document.querySelectorAll('figure.highlight, pre.highlight');
    blocks.forEach(block=>{
      const pre = block.querySelector('pre') || block;
      const code = pre.querySelector('code') || pre;
      const wrapper = block;
      wrapper.classList.add('code-toolbar');
      const lang = code.getAttribute('data-lang') || (code.className.match(/language-([a-z0-9\+\-]+)/i)||[])[1] || '';
      const btn = document.createElement('button');
      btn.className='copy-btn'; btn.type='button'; btn.textContent='Copiar';
      btn.addEventListener('click', async ()=>{
        try{ await navigator.clipboard.writeText(code.innerText); btn.textContent='Copiado ✓'; setTimeout(()=>btn.textContent='Copiar', 1200); }
        catch(e){ btn.textContent='Error'; setTimeout(()=>btn.textContent='Copiar', 1200); }
      });
      const badge = document.createElement('span');
      badge.className='lang-badge'; badge.textContent=lang||'code';
      wrapper.appendChild(btn); wrapper.appendChild(badge);
    });
  })();

  (function(){
    const article = document.querySelector('.post .post-body') || document.querySelector('.post');
    if(!article) return;
    const text = article.innerText || '';
    const words = text.trim().split(/\s+/).length;
    const mins = Math.max(1, Math.round(words / 220));
    const rt = document.querySelector('[data-reading-time]');
    if(rt){ rt.textContent = mins + ' min'; }

    const tocRoot = document.querySelector('.toc ul');
    if(!tocRoot) return;
    const headings = article.querySelectorAll('h2, h3');
    headings.forEach(h=>{
      if(!h.id){
        h.id = h.textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-]+/g,'');
      }
      const li=document.createElement('li'); const a=document.createElement('a');
      a.href='#'+h.id; a.textContent=h.textContent;
      if(h.tagName.toLowerCase()==='h3'){ a.style.paddingLeft='.75rem'; }
      li.appendChild(a); tocRoot.appendChild(li);
    });
  })();
}

/* v7 code toolbar */
(function(){
  const mapLang = (raw) => {
    if(!raw) return 'code';
    const l = raw.toLowerCase();
    if(['sh','bash','shell','zsh'].includes(l)) return 'bash';
    if(['py','python'].includes(l)) return 'python';
    if(['js','javascript','node'].includes(l)) return 'js';
    if(['c','cpp','c++'].includes(l)) return l;
    if(['asm','assembly','nasm'].includes(l)) return 'asm';
    if(['ps1','powershell'].includes(l)) return 'ps';
    return l;
  };
  const blocks = document.querySelectorAll('figure.highlight, pre.highlight');
  blocks.forEach(block => {
    const pre = block.querySelector('pre') || block;
    const code = pre.querySelector('code') || pre;
    const wrapper = block;
    wrapper.classList.add('code-toolbar');
    const lang = mapLang(code.getAttribute('data-lang') || (code.className.match(/language-([a-z0-9\+\-]+)/i)||[])[1] || '');
    if(lang){ wrapper.classList.add('has-badge'); }
    // avoid duplicates
    if(!wrapper.querySelector('.copy-btn')){
      const btn = document.createElement('button');
      btn.className='copy-btn'; btn.type='button'; btn.textContent='Copiar';
      btn.addEventListener('click', async ()=>{
        try{ await navigator.clipboard.writeText(code.innerText); btn.textContent='Copiado ✓'; setTimeout(()=>btn.textContent='Copiar', 1200); }
        catch(e){ btn.textContent='Error'; setTimeout(()=>btn.textContent='Copiar', 1200); }
      });
      wrapper.appendChild(btn);
    }
    if(lang && !wrapper.querySelector('.lang-badge')){
      const badge = document.createElement('span');
      badge.className='lang-badge'; badge.textContent=lang;
      wrapper.appendChild(badge);
    }
  });
})();


/* v8 enhancements: smooth TOC scroll, heading anchors, stronger has-badge padding */
(function(){
  // Build anchors for h2/h3 inside post-body
  const body = document.querySelector('.post .post-body') || document.querySelector('.post');
  if(body){
    const heads = body.querySelectorAll('h2, h3');
    heads.forEach(h => {
      if(!h.id){
        h.id = h.textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-]+/g,'');
      }
      if(!h.querySelector('.anchor')){
        const a = document.createElement('a');
        a.className = 'anchor';
        a.href = '#' + h.id;
        a.textContent = '#';
        h.appendChild(a);
      }
    });
  }

  // Smooth scroll with header offset for TOC and heading anchors
  function scrollWithOffset(e, target){
    e.preventDefault();
    const el = document.querySelector(target);
    if(!el) return;
    const header = document.querySelector('header.site');
    const offset = (header?.offsetHeight || 70) + 12;
    const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top, behavior: 'smooth' });
  }
  document.querySelectorAll('.toc a, .post .post-body .anchor').forEach(a => {
    a.addEventListener('click', e => scrollWithOffset(e, a.getAttribute('href')));
  });

  // Ensure code-toolbar left padding when badge exists (defensive)
  document.querySelectorAll('figure.highlight, pre.highlight').forEach(block => {
    if(block.querySelector('.lang-badge')) block.classList.add('has-badge');
  });
})();


/* v9 animations: human typing, terminal hero, scroll reveal, copy feedback */
if(!window.__CYBER_V9__){
  window.__CYBER_V9__ = true;

  // Human-like typing with variable latency and tiny glitches
  (function(){
    const brandNameEl = document.querySelector('[data-typing="name"]');
    const subtitleEl = document.querySelector('[data-typing="subtitle"]');
    const BRAND = (window.BRAND_NAME || document.querySelector('meta[name="application-name"]')?.content || 'CYBER·LAB').trim();
    function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }
    async function typeHuman(el, text){
      el.textContent = '';
      for(const ch of text){
        // occasional micro-glitch
        if(Math.random()<0.02){
          el.textContent += String.fromCharCode(33 + Math.floor(Math.random()*40));
          await sleep(20);
          el.textContent = el.textContent.slice(0,-1);
        }
        el.textContent += ch;
        const jitter = 25 + Math.random()*45;
        await sleep(jitter);
      }
    }
    async function erase(el){
      while(el.textContent.length){
        el.textContent = el.textContent.slice(0,-1);
        await sleep(12 + Math.random()*20);
      }
    }
    (async ()=>{
      if(brandNameEl) await typeHuman(brandNameEl, BRAND);
      if(subtitleEl){
        const phrases = ["cybersecurity","pentesting","exploit dev","reverse shells","linux internals","assembly x86‑64"];
        let i=0;
        while(true){
          await erase(subtitleEl);
          await typeHuman(subtitleEl, phrases[i++ % phrases.length]);
          await sleep(1400 + Math.random()*600);
        }
      }
    })();
  })();

  // Terminal hero typing
  (function(){
    const host = document.getElementById('hero-term');
    if(!host) return;
    const lines = [
      {p:'┌──(cyber@lab)-[/targets]', c:''},
      {p:'└─$ ', c:'nmap -sC -sV 10.10.10.10'},
      {p:'└─$ ', c:'feroxbuster -u http://10.10.10.10'},
      {p:'└─$ ', c:'nc -lvnp 9001'},
    ];
    const frag = document.createDocumentFragment();
    lines.forEach(l=>{
      const div = document.createElement('div');
      div.className='line';
      div.innerHTML = `<span class="prompt">${l.p}</span><span class="path"></span><span class="cmd"></span><span class="cursor"></span>`;
      frag.appendChild(div);
    });
    host.appendChild(frag);
    const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
    (async()=>{
      const nodes = host.querySelectorAll('.line');
      for(let i=0;i<nodes.length;i++){
        const line = nodes[i];
        const cmdEl = line.querySelector('.cmd');
        const cmd = lines[i].c;
        if(!cmd){ continue; }
        for(const ch of cmd){
          cmdEl.textContent += ch;
          await sleep(18 + Math.random()*28);
        }
        await sleep(500);
      }
    })();
  })();

  // Scroll reveal for cards and post body chunks
  (function(){
    const io = new IntersectionObserver((els)=>{
      els.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } });
    },{threshold:.08});
    document.querySelectorAll('.card, .post .post-body > *').forEach(el=>{
      el.classList.add('reveal'); io.observe(el);
    });
  })();

  // Copy feedback visual
  (function(){
    document.querySelectorAll('.copy-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        btn.classList.add('copied');
        setTimeout(()=>btn.classList.remove('copied'), 900);
      });
    });
  })();

  // Defensive: ensure has-badge when a language badge exists
  document.querySelectorAll('figure.highlight, pre.highlight').forEach(block => {
    if(block.querySelector('.lang-badge')) block.classList.add('has-badge');
  });
}


/* v10 hero: attacker ↔ target connection simulation (non-instructional) */
(function(){
  const atk = document.getElementById('term-attacker');
  const tgt = document.getElementById('term-target');
  if(!atk || !tgt) return;

  function el(html){ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; }
  function line(prompt, role, cmd=''){
    return el(`<div class="line"><span class="prompt">${prompt}</span><span class="role"> ${role}</span> <span class="cmd">${cmd}</span><span class="cursor"></span></div>`);
  }
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  async function typeInto(node, txt, speed=[18,28]){
    const [a,b]=speed; for(const ch of txt){ node.textContent+=ch; await sleep(a+Math.random()*(b-a)); }
  }

  // Build initial lines
  const aL = [
    line("┌──(", "attacker@lab", ")-[/sessions]"),
    line("└─$", "", " nc -lvnp 9001"),
  ];
  const tL = [
    line("┌──(", "target", ")-[/tmp]"),
    line("└─$", "", " // outbound connection ..."),
  ];
  aL.forEach(n=>atk.appendChild(n));
  tL.forEach(n=>tgt.appendChild(n));

  (async()=>{
    await sleep(400);
    // Attacker "listening"
    let cmd = aL[1].querySelector('.cmd');
    cmd.textContent = " "; await typeInto(cmd, "nc -lvnp 9001");
    await sleep(800);

    // Target "connects" (no explicit payload shown)
    cmd = tL[1].querySelector('.cmd');
    cmd.textContent = " "; await typeInto(cmd, "connecting to 10.10.10.2:9001 ...");
    await sleep(900);

    // Attacker shows connection established
    atk.appendChild(el('<div class="line">listening on [any] 9001 ...</div>'));
    await sleep(250);
    atk.appendChild(el('<div class="line">connect from 10.10.10.10 to 10.10.10.2:9001</div>'));
    await sleep(600);
    atk.appendChild(el('<div class="line">$ whoami</div>'));
    await sleep(450);
    atk.appendChild(el('<div class="line">www-data</div>'));
    await sleep(350);
    atk.appendChild(el('<div class="line">$ hostname</div>'));
    await sleep(450);
    atk.appendChild(el('<div class="line">target</div>'));
  })();
})();

// Prefer GitHub owner for typing brand if available
(function(){
  if(!window.__CYBER_V10_BRAND__){
    window.__CYBER_V10_BRAND__ = true;
    const name = (window.GITHUB_NAME || window.BRAND_NAME || document.querySelector("meta[name='application-name']")?.content || 'CYBER·LAB').trim();
    const brandNameEl = document.querySelector('[data-typing="name"]');
    if(brandNameEl){
      // reuse human-like typing from v9 if present; else simple set
      const old = brandNameEl.textContent;
      if(typeof window.typeHuman === 'function'){ window.typeHuman(brandNameEl, name); }
      else { brandNameEl.textContent = name; }
    }
  }
})();
