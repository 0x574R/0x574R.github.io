
if(!window.__CYBER_V10R__){
  window.__CYBER_V10R__ = true;

  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  async function typeHuman(el, text, min=26, max=52){
    el.textContent='';
    for(const ch of text){
      if(Math.random()<0.02){ el.textContent += String.fromCharCode(33 + Math.floor(Math.random()*40)); await sleep(18); el.textContent = el.textContent.slice(0,-1); }
      el.textContent += ch; await sleep(min + Math.random()*(max-min));
    }
  }

  (async function brand(){
    const nameEl = document.querySelector('[data-typing="name"]');
    const subEl  = document.querySelector('[data-typing="subtitle"]');
    const NAME = (window.GITHUB_NAME || window.BRAND_NAME || document.querySelector("meta[name='application-name']")?.content || 'CYBER·LAB').trim();
    if(nameEl){ await typeHuman(nameEl, NAME); }
    if(subEl){ subEl.textContent = "malware goes brrrrrr"; }
  })();

  (function toolbar(){
    const mapLang = (raw) => {
      if(!raw) return 'code'; const l = raw.toLowerCase();
      if(['sh','bash','shell','zsh'].includes(l)) return 'bash';
      if(['py','python'].includes(l)) return 'python';
      if(['js','javascript','node'].includes(l)) return 'js';
      if(['c','cpp','c++'].includes(l)) return l;
      if(['asm','assembly','nasm'].includes(l)) return 'asm';
      if(['ps1','powershell'].includes(l)) return 'ps';
      return l;
    };
    document.querySelectorAll('figure.highlight, pre.highlight').forEach(block=>{
      const pre = block.querySelector('pre') || block;
      const code = pre.querySelector('code') || pre;
      const lang = mapLang(code.getAttribute('data-lang') || (code.className.match(/language-([a-z0-9\+\-]+)/i)||[])[1] || '');
      block.classList.add('code-toolbar'); if(lang) block.classList.add('has-badge');
      if(!block.querySelector('.copy-btn')){
        const btn = document.createElement('button'); btn.className='copy-btn'; btn.type='button'; btn.textContent='Copiar';
        btn.addEventListener('click', async ()=>{
          try{ await navigator.clipboard.writeText(code.innerText); btn.textContent='Copiado ✓'; btn.classList.add('copied'); setTimeout(()=>{btn.textContent='Copiar'; btn.classList.remove('copied')}, 900); }
          catch(e){ btn.textContent='Error'; setTimeout(()=>btn.textContent='Copiar', 900); }
        });
        block.appendChild(btn);
      }
      if(lang && !block.querySelector('.lang-badge')){
        const badge = document.createElement('span'); badge.className='lang-badge'; badge.textContent=lang; block.appendChild(badge);
      }
    });
  })();

  (function postEnh(){
    const article = document.querySelector('.post .post-body') || document.querySelector('.post');
    if(!article) return;
    const heads = article.querySelectorAll('h2, h3');
    heads.forEach(h=>{
      if(!h.id){ h.id = h.textContent.trim().toLowerCase().replace(/\s+/g,'-').replace(/[^\w\-]+/g,''); }
      if(!h.querySelector('.anchor')){
        const a = document.createElement('a'); a.className='anchor'; a.href='#'+h.id; a.textContent='#'; h.appendChild(a);
      }
    });
    function scrollWithOffset(e, target){
      e.preventDefault(); const el = document.querySelector(target); if(!el) return;
      const header = document.querySelector('header.site'); const offset = (header?.offsetHeight || 70) + 12;
      const top = el.getBoundingClientRect().top + window.pageYOffset - offset;
      window.scrollTo({ top, behavior:'smooth' });
    }
    document.querySelectorAll('.toc a, .post .post-body .anchor').forEach(a=> a.addEventListener('click', e=>scrollWithOffset(e, a.getAttribute('href'))));
    const text = article.innerText || ''; const words = text.trim().split(/\s+/).length; const mins = Math.max(1, Math.round(words/220));
    const rt = document.querySelector('[data-reading-time]'); if(rt){ rt.textContent = mins + ' min'; }
  })();

  (function hero(){
    const atk = document.getElementById('term-attacker'); const tgt = document.getElementById('term-target');
    if(!atk || !tgt) return;
    const el = (html)=>{ const d=document.createElement('div'); d.innerHTML=html.trim(); return d.firstChild; };
    const line = (p, r, c='')=> el(`<div class="line"><span class="prompt">${p}</span><span class="role"> ${r}</span> <span class="cmd">${c}</span><span class="cursor"></span></div>`);
    [ line("┌──(", "attacker@lab", ")-[/sessions]"), line("└─$", "", " nc -lvnp 9001") ].forEach(n=>atk.appendChild(n));
    [ line("┌──(", "target", ")-[/tmp]"),      line("└─$", "", " connecting to 10.10.10.2:9001 ...") ].forEach(n=>tgt.appendChild(n));
    (async()=>{
      await sleep(700); atk.appendChild(el('<div class="line">listening on [any] 9001 ...</div>'));
      await sleep(450); atk.appendChild(el('<div class="line">connect from 10.10.10.10 to 10.10.10.2:9001</div>'));
      await sleep(650); atk.appendChild(el('<div class="line">$ whoami</div>'));
      await sleep(350); atk.appendChild(el('<div class="line">www-data</div>'));
      await sleep(350); atk.appendChild(el('<div class="line">$ hostname</div>'));
      await sleep(350); atk.appendChild(el('<div class="line">target</div>'));
    })();
  })();

  (function reveal(){
    const io = new IntersectionObserver((els)=>{ els.forEach(e=>{ if(e.isIntersecting){ e.target.classList.add('is-in'); io.unobserve(e.target); } }); },{threshold:.08});
    document.querySelectorAll('.card, .post .post-body > *').forEach(el=>{ el.classList.add('reveal'); io.observe(el); });
  })();
}
