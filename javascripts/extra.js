// RAZOR — Header title behavior (MkDocs Material)
// Goal:
// - Show ONLY the article title in the header (next to the logo) on content pages
// - Keep it minimal on Home/section indexes (no "RAZOR" duplicated)
// - Works with Material instant navigation (AJAX)

(function () {
  const SECTION_ROOTS = new Set(["writeups", "cheatsheets", "research"]);

  function cleanText(s) {
    return (s || "")
      .replace(/¶/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function isIndexPage(pathname) {
    // "/", "/writeups/", "/cheatsheets/", "/research/"
    const p = (pathname || "/").replace(/\/+$/, "/");
    if (p === "/" || p === "/index/") return true;
    const seg = p.split("/").filter(Boolean)[0];
    return SECTION_ROOTS.has(seg) && (p.endsWith(`/${seg}/`) || p.endsWith(`/${seg}/index/`) || p.endsWith(`/${seg}/`));
  }

  function getH1() {
    const h1 = document.querySelector("main .md-content__inner h1");
    return h1 ? cleanText(h1.textContent) : "";
  }

  function setHeaderTitle() {
    const topic = document.querySelector(".md-header__topic .md-ellipsis");
    if (!topic) return;

    const path = window.location.pathname || "/";
    const h1 = getH1();
    const indexLike = isIndexPage(path);

    // On article pages => show H1, otherwise keep minimal (empty)
    if (h1 && !indexLike && h1.toLowerCase() !== "razor") {
      topic.textContent = h1;
      topic.style.opacity = "1";
    } else {
      topic.textContent = ""; // minimal header
      topic.style.opacity = "0.85";
    }
  }

  // Initial run
  setHeaderTitle();

  // MkDocs Material supports document$ for instant navigation
  if (window.document$ && typeof window.document$.subscribe === "function") {
    window.document$.subscribe(() => {
      setHeaderTitle();
      // In case content renders slightly later
      setTimeout(setHeaderTitle, 30);
    });
  } else {
    // Fallback for environments without document$
    document.addEventListener("DOMContentLoaded", () => {
      setHeaderTitle();
      setTimeout(setHeaderTitle, 30);
    });
    window.addEventListener("popstate", () => {
      setHeaderTitle();
      setTimeout(setHeaderTitle, 30);
    });
  }
})();
