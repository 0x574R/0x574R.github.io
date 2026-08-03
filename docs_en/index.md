---
description: Offensive security blog. Low-level techniques in x86-64 assembly on Linux, without libc.
---

# RAZOR

<div class="razor-hero razor-hero--no-logo">
  <div class="razor-hero__content">
    <div class="razor-hero__kicker">Offensive Security</div>
    <p class="razor-hero__subtitle">
      Technical notes on offensive security.
    </p>
    <p class="razor-hero__tagline">
      Reconnaissance · Intrusion · Evasion · Exfiltration · Persistence
    </p>
  </div>
</div>

---

## Sections

<div class="razor-cards razor-cards--sections">

<a href="research/malware-dev/" class="razor-card">
  <div class="razor-card__image">
    <img src="assets/images/malware-hero.svg" alt="Malware Dev">
  </div>
  <span class="razor-card__title">Malware Development</span>
  <span class="razor-card__desc">Development and Explanation of Offensive Techniques</span>
  <div class="razor-card__meta">
    <span class="razor-card__tag">Low-level</span>
  </div>
</a>

<a href="research/kernel-theory/" class="razor-card">
  <div class="razor-card__image">
    <img src="assets/images/kernel-theory-hero.svg" alt="Kernel Theory">
  </div>
  <span class="razor-card__title">Kernel Theory</span>
  <span class="razor-card__desc">Linux Kernel Theory from an Offensive Perspective</span>
  <div class="razor-card__meta">
    <span class="razor-card__tag">Kernel</span>
  </div>
</a>

</div>

---

## Latest posts

<div class="razor-series-header">
<span class="razor-series-header__dot"><span></span><span></span><span></span></span>
<span class="razor-series-header__title">DARKCLOAK Series</span>
<span class="razor-series-header__count">4 articles · Process Identity Cloaking</span>
</div>

<div class="razor-cards razor-cards--posts">

<a href="research/kernel-theory/identity-model/" class="razor-card razor-card--series">
  <div class="razor-card__image">
    <img src="assets/images/identity-model-hero.svg" alt="Identity Model">
  </div>
  <span class="razor-card__title">Identity and Privileges of a Process (1)</span>
  <span class="razor-card__desc">UIDs, GIDs, capabilities, transitions and retention mechanisms in struct cred</span>
  <div class="razor-card__meta">
    <span class="razor-card__tag">Kernel</span>
    <span class="razor-card__time"><span class="razor-card__star">★</span> 45 min</span>
  </div>
</a>

<a href="research/kernel-theory/elf-internals/" class="razor-card razor-card--series">
  <div class="razor-card__image">
    <img src="assets/images/elf-internals-hero.svg" alt="ELF Internals">
  </div>
  <span class="razor-card__title">ELF Internals (2)</span>
  <span class="razor-card__desc">What an ELF binary contains and how the kernel interprets it to turn it into a process</span>
  <div class="razor-card__meta">
    <span class="razor-card__tag">Kernel</span>
    <span class="razor-card__time"><span class="razor-card__star">★</span> 60 min</span>
  </div>
</a>

<a href="research/kernel-theory/process-identity/" class="razor-card razor-card--series">
  <div class="razor-card__image">
    <img src="assets/images/process-id-hero.svg" alt="Process Identity Spoofing">
  </div>
  <span class="razor-card__title">Process Identity Spoofing: What Linux Exposes and How to Fake It (3)</span>
  <span class="razor-card__desc">What information Linux exposes about its processes, where it lives and how it is manipulated</span>
  <div class="razor-card__meta">
    <span class="razor-card__tag">Kernel</span>
    <span class="razor-card__time"><span class="razor-card__star">★</span> 60 min</span>
  </div>
</a>

<a href="research/malware-dev/darkcloak/" class="razor-card razor-card--series">
  <div class="razor-card__image">
    <img src="assets/images/darkcloak-hero.svg" alt="DARKCLOAK">
  </div>
  <span class="razor-card__title">DARKCLOAK: Novel Flow for Process Masquerading (4)</span>
  <span class="razor-card__desc">Complete process identity spoofing pipeline on Linux</span>
  <div class="razor-card__meta">
    <span class="razor-card__tag">Assembly</span>
    <span class="razor-card__time"><span class="razor-card__star">★</span> 90 min</span>
  </div>
</a>

</div>

---

<div class="razor-cards razor-cards--posts">

<a href="research/malware-dev/fileless-loader/" class="razor-card">
  <div class="razor-card__image">
    <img src="assets/images/fileless-hero.svg" alt="Fileless Loader">
  </div>
  <span class="razor-card__title">Fileless Loader</span>
  <span class="razor-card__desc">Executing a binary without writing any file to the filesystem, no dependencies</span>
  <div class="razor-card__meta">
    <span class="razor-card__tag">Assembly</span>
    <span class="razor-card__time"><span class="razor-card__star">★</span> 60 min</span>
  </div>
</a>

<a href="research/malware-dev/ptrace-injection/" class="razor-card">
  <div class="razor-card__image">
    <img src="assets/images/ptrace-hero.svg" alt="Ptrace Injection">
  </div>
  <span class="razor-card__title">Process Injection via Ptrace</span>
  <span class="razor-card__desc">Shellcode injection into Linux processes using Ptrace, no dependencies</span>
  <div class="razor-card__meta">
    <span class="razor-card__tag">Assembly</span>
    <span class="razor-card__time">120 min</span>
  </div>
</a>

<a href="research/malware-dev/reverse-shell/" class="razor-card">
  <div class="razor-card__image">
    <img src="assets/images/shell-hero.svg" alt="Reverse Shell">
  </div>
  <span class="razor-card__title">Reverse TCP Shell</span>
  <span class="razor-card__desc">Reverse TCP Shell, no dependencies</span>
  <div class="razor-card__meta">
    <span class="razor-card__tag">Assembly</span>
    <span class="razor-card__time">5 min</span>
  </div>
</a>

</div>
