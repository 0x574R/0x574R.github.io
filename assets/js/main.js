
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
