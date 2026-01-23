// RAZOR: Header title behavior (MkDocs Material)
// - Big logo, fixed navbar height
// - On articles: show the current article title instead of the site name
// - On section indexes/home: keep the site name (clean blog feel)
(function () {
  const SECTIONS = ["writeups", "cheatsheets", "research"];

  function cleanTitle(s) {
    return (s || "")
      .replace(/¶/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getH1Title() {
    const h1 = document.querySelector("main .md-content__inner h1");
    return cleanTitle(h1?.textContent);
  }

  function getPageTitleFallback() {
    // document.title is typically "Page - RAZOR"
    const t = (document.title || "").split(" - ")[0];
    return cleanTitle(t) || "RAZOR";
  }

  function isArticleRoute() {
    const path = (location.pathname || "/").replace(/index\.html$/i, "");
    const parts = path.split("/").filter(Boolean);
    if (parts.length === 0) return false; // home

    const first = parts[0];
    if (!SECTIONS.includes(first)) return true; // any non-section page treated as article-like

    // /writeups/  => index
    // /writeups/<something>/ => article
    return parts.length >= 2;
  }

  function ensureHeaderTitle() {
    const headerTitle = document.querySelector(".md-header__title");
    if (!headerTitle) return;

    const ellipsis = headerTitle.querySelector(".md-header__ellipsis") || headerTitle;
    let node = ellipsis.querySelector(".razor-page-title");
    if (!node) {
      node = document.createElement("span");
      node.className = "razor-page-title";
      ellipsis.appendChild(node);
    }

    const title = getH1Title() || getPageTitleFallback();
    const article = isArticleRoute();

    document.body.classList.toggle("razor-is-article", article);
    node.textContent = title;
    node.setAttribute("title", title);
  }

  // Initial
  ensureHeaderTitle();

  // Material instant navigation
  document.addEventListener("DOMContentLoaded", () => {
    ensureHeaderTitle();
    setTimeout(ensureHeaderTitle, 50);
    document.addEventListener("navigation", () => {
      ensureHeaderTitle();
      setTimeout(ensureHeaderTitle, 30);
    });
  });

  window.addEventListener("load", () => setTimeout(ensureHeaderTitle, 50));
})();
