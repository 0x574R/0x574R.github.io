
(function(){
  const name = (window.GITHUB_NAME || '').trim();
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
