
(function(){
  const name = (window.BRAND_NAME || '').trim();
  const brandNameEl = document.querySelector('[data-typing="name"]');
  const subtitleEl = document.querySelector('[data-typing="subtitle"]');
  const caretEls = document.querySelectorAll('.caret');
  if(!brandNameEl) return;

  function type(el, text, speed=55){
    return new Promise((resolve)=>{
      el.textContent = '';
      let i=0;
      const t = setInterval(()=>{
        el.textContent += text[i++];
        if(i>=text.length){ clearInterval(t); resolve(); }
      }, speed);
    });
  }
  function erase(el, speed=35){
    return new Promise((resolve)=>{
      const t = setInterval(()=>{
        el.textContent = el.textContent.slice(0,-1);
        if(el.textContent.length===0){ clearInterval(t); resolve(); }
      }, speed);
    });
  }
  (async () => {
    const title = name || document.title.replace(/\s·.*$/, '');
    await type(brandNameEl, title);
    const phrases = [
      "cybersecurity",
      "pentesting",
      "assembly x86‑64",
      "linux tricks",
      "reverse shells",
      "offensive security"
    ];
    let idx = 0;
    if(subtitleEl){
      while(true){
        const p = phrases[idx++ % phrases.length];
        await erase(subtitleEl, 15);
        await type(subtitleEl, p, 40);
        await new Promise(r=>setTimeout(r, 1600));
      }
    }
  })();
})();


// === Brand typing without personal data ===
(function(){
  const BRAND = (window.BRAND_NAME || document.querySelector('meta[name="application-name"]')?.content || 'CYBER·LAB').trim();
  const brandNameEl = document.querySelector('[data-typing="name"]');
  const subtitleEl = document.querySelector('[data-typing="subtitle"]');
  function type(el, text, speed=55){
    return new Promise((resolve)=>{
      el.textContent = '';
      let i=0;
      const t = setInterval(()=>{
        el.textContent += text[i++] || '';
        if(i>text.length){ clearInterval(t); resolve(); }
      }, speed);
    });
  }
  function erase(el, speed=35){
    return new Promise((resolve)=>{
      const t = setInterval(()=>{
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
        const p = phrases[idx++ % phrases.length];
        await erase(subtitleEl, 12);
        await type(subtitleEl, p, 40);
        await new Promise(r=>setTimeout(r, 1500));
      }
    }
  })();
})();

// === Copy button & language badge for code blocks (Rouge/Kramdown) ===
(function(){
  const blocks = document.querySelectorAll('figure.highlight, pre.highlight');
  blocks.forEach(block => {
    const pre = block.querySelector('pre') || block;
    const code = pre.querySelector('code') || pre;
    const wrapper = block;
    wrapper.classList.add('code-toolbar');
    const lang = code.getAttribute('data-lang') || (code.className.match(/language-([a-z0-9\+\-]+)/i)||[])[1] || '';
    const btn = document.createElement('button');
    btn.className = 'copy-btn';
    btn.type = 'button';
    btn.textContent = 'Copiar';
    btn.addEventListener('click', async ()=>{
      try{ await navigator.clipboard.writeText(code.innerText); btn.textContent='Copiado ✓'; setTimeout(()=>btn.textContent='Copiar', 1200); }
      catch(e){ btn.textContent='Error'; setTimeout(()=>btn.textContent='Copiar', 1200); }
    });
    const badge = document.createElement('span');
    badge.className = 'lang-badge';
    badge.textContent = lang || 'code';
    wrapper.appendChild(btn);
    wrapper.appendChild(badge);
  });
})();

// === Build Table of Contents from h2/h3 and compute reading time ===
(function(){
  const article = document.querySelector('.post .post-body') || document.querySelector('.post');
  if(!article) return;
  // Reading time
  const text = article.innerText || '';
  const words = text.trim().split(/\s+/).length;
  const mins = Math.max(1, Math.round(words / 220));
  const rt = document.querySelector('[data-reading-time]');
  if(rt){ rt.textContent = mins + ' min'; }

  // TOC
  const tocRoot = document.querySelector('.toc ul');
  if(!tocRoot) return;
  const headings = article.querySelectorAll('h2, h3');
  headings.forEach((h)=>{
    if(!h.id){
      h.id = h.textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-]+/g,'');
    }
    const li = document.createElement('li');
    const a = document.createElement('a');
    a.href = '#' + h.id;
    a.textContent = h.textContent;
    if(h.tagName.toLowerCase()==='h3'){ a.style.paddingLeft = '.75rem'; }
    li.appendChild(a);
    tocRoot.appendChild(li);
  });
})();
