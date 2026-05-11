/* ============================================================================
   zazenware — theme-init.js
   ----------------------------------------------------------------------------
   Runs SYNCHRONOUSLY in <head> BEFORE the stylesheet paints.
   Prevents flash of incorrect theme on first paint.

   Priority:
     1. localStorage 'zw-theme' if set ('light' or 'dark')
     2. system preference via prefers-color-scheme
     3. fallback to light (default in tokens.css)

   This file must be loaded with:
     <script src="/scripts/theme-init.js"></script>
   placed in <head> BEFORE the <link rel="stylesheet">.

   No external dependencies. No async. No modules.
   ============================================================================ */
(function () {
  try {
    var stored = null;
    try { stored = localStorage.getItem("zw-theme"); } catch (e) { /* private mode */ }

    var theme;
    if (stored === "light" || stored === "dark") {
      theme = stored;
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      theme = "dark";
    } else {
      theme = "light";
    }

    document.documentElement.setAttribute("data-theme", theme);
  } catch (e) {
    /* swallow — default light theme will render */
  }
})();
