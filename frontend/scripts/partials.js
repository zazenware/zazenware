/* ============================================================================
   zazenware — partials.js
   ----------------------------------------------------------------------------
   Fetches /partials/header.html and /partials/footer.html and injects them
   into <div id="site-header"></div> and <div id="site-footer"></div>.

   After injection, dispatches the custom event 'zw:partials-ready' so other
   scripts (theme.js, nav.js, cart-badge.js) can wire their behavior.

   Loaded as an ES module from every page:
     <script type="module" src="/scripts/partials.js"></script>
   ============================================================================ */

const PARTIALS = [
  { src: "/partials/header.html", target: "site-header" },
  { src: "/partials/footer.html", target: "site-footer" },
];

async function injectPartial({ src, target }) {
  const mount = document.getElementById(target);
  if (!mount) {
    console.warn(`[zw] No mount point #${target} found; skipping ${src}.`);
    return;
  }

  try {
    const res = await fetch(src, { cache: "no-cache" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    mount.innerHTML = html;
  } catch (err) {
    console.error(`[zw] Failed to load ${src}:`, err);
    mount.innerHTML = `
      <div class="zw-container" style="padding: 1rem; color: var(--zw-error);">
        Failed to load ${target.replace("site-", "")}. Refresh to retry.
      </div>`;
  }
}

async function loadAllPartials() {
  await Promise.all(PARTIALS.map(injectPartial));

  // Tell the rest of the app that header/footer DOM is now available.
  document.dispatchEvent(new CustomEvent("zw:partials-ready"));
}

// Run as soon as DOM is parsed. partials.js is loaded as module -> deferred.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", loadAllPartials);
} else {
  loadAllPartials();
}
