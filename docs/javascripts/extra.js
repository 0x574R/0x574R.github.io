// RAZOR: Compact header page-title injection
// Shows current page title next to the logo (without changing header height).
(function () {
  function getPageTitle() {
    // Prefer the first h1 in content
    const h1 = document.querySelector("main .md-content__inner h1");
    if (h1 && h1.textContent) return h1.textContent.trim();

    // Fallback: document.title like "Cheatsheets - RAZOR"
    const t = (document.title || "").split(" - ")[0].trim();
    return t || "RAZOR";
  }

  function ensureTitle() {
    const headerTitle = document.querySelector(".md-header__title");
    if (!headerTitle) return;

    const ellipsis = headerTitle.querySelector(".md-header__ellipsis") || headerTitle;
    let node = ellipsis.querySelector(".razor-page-title");

    if (!node) {
      node = document.createElement("span");
      node.className = "razor-page-title";
      ellipsis.appendChild(node);
    }

    const title = getPageTitle();
    // Avoid duplicating the site name when on Home
    node.textContent = title;
    node.setAttribute("title", title);
  }

  // Run now and on instant navigation
  ensureTitle();
  document.addEventListener("DOMContentLoaded", ensureTitle);
  document.addEventListener("DOMContentLoaded", () => setTimeout(ensureTitle, 50));

  // MkDocs Material instant navigation events
  document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener("navigation", ensureTitle);
  });

  // Fallback for older event name
  window.addEventListener("load", () => setTimeout(ensureTitle, 50));
})();
