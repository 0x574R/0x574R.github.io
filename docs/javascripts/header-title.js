// Keep the header title synced with the current page title
// - Compatible with Material 'navigation.instant'
// - Shows ONLY the current page/article title

(function () {
  function cleanTitle(t) {
    return (t || '').replace(/\s*¶\s*$/, '').trim();
  }

  function setHeaderTitle() {
    const h1 = document.querySelector('main article h1');
    const headerEllipsis = document.querySelector('.md-header__title .md-header__topic .md-ellipsis');
    if (!headerEllipsis) return;

    const titleText = cleanTitle(h1 ? h1.textContent : '');
    if (titleText) headerEllipsis.textContent = titleText;
  }

  // Material exposes a lifecycle hook for instant navigation
  if (window.document$ && typeof window.document$.subscribe === 'function') {
    window.document$.subscribe(setHeaderTitle);
  } else {
    document.addEventListener('DOMContentLoaded', setHeaderTitle);
    window.addEventListener('load', setHeaderTitle);
  }
})();
