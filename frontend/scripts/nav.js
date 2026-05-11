/* ============================================================================
   zazenware — nav.js
   ----------------------------------------------------------------------------
   Wires:
     1. The desktop Shop dropdown (open on click, close on outside click / ESC,
        arrow-key navigation between menu items).
     2. The mobile nav drawer (open on hamburger, focus trap, ESC closes,
        click-outside on overlay closes, body scroll lock).
     3. The aria-current="page" indicator on the active nav link.

   Master Spec § 9.3.1 (Shop dropdown) and § 9.3.2 (Mobile nav drawer).

   Runs once on 'zw:partials-ready'.
   ============================================================================ */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(",");

/* ─── Shop dropdown ─────────────────────────────────────────────────────── */

function wireDropdown() {
  const root = document.querySelector("[data-zw-dropdown]");
  if (!root) return;

  const trigger = root.querySelector("[data-zw-dropdown-trigger]");
  const menu = root.querySelector("[data-zw-dropdown-menu]");
  if (!trigger || !menu) return;

  const items = Array.from(menu.querySelectorAll('[role="menuitem"]'));

  const open = () => {
    trigger.setAttribute("aria-expanded", "true");
    menu.hidden = false;
    // Focus first item on open
    if (items[0]) items[0].focus();
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeydown);
  };

  const close = ({ returnFocus = false } = {}) => {
    trigger.setAttribute("aria-expanded", "false");
    menu.hidden = true;
    document.removeEventListener("click", onDocClick);
    document.removeEventListener("keydown", onKeydown);
    if (returnFocus) trigger.focus();
  };

  const isOpen = () => trigger.getAttribute("aria-expanded") === "true";

  function onTriggerClick(e) {
    e.stopPropagation();
    if (isOpen()) close({ returnFocus: true });
    else open();
  }

  function onDocClick(e) {
    if (!root.contains(e.target)) close();
  }

  function onKeydown(e) {
    if (!isOpen()) return;
    const idx = items.indexOf(document.activeElement);
    switch (e.key) {
      case "Escape":
        e.preventDefault();
        close({ returnFocus: true });
        break;
      case "ArrowDown":
        e.preventDefault();
        items[(idx + 1) % items.length].focus();
        break;
      case "ArrowUp":
        e.preventDefault();
        items[(idx - 1 + items.length) % items.length].focus();
        break;
      case "Home":
        e.preventDefault();
        items[0].focus();
        break;
      case "End":
        e.preventDefault();
        items[items.length - 1].focus();
        break;
      case "Tab":
        close();
        break;
    }
  }

  trigger.addEventListener("click", onTriggerClick);
}

/* ─── Mobile drawer ─────────────────────────────────────────────────────── */

function wireDrawer() {
  const trigger = document.querySelector("[data-zw-drawer-trigger]");
  const drawer = document.querySelector("[data-zw-drawer]");
  if (!trigger || !drawer) return;

  const panel = drawer.querySelector("[data-zw-drawer-panel]");
  const overlay = drawer.querySelector("[data-zw-drawer-overlay]");
  const closeBtn = drawer.querySelector("[data-zw-drawer-close]");
  let lastFocused = null;

  const open = () => {
    lastFocused = document.activeElement;
    drawer.hidden = false;
    drawer.setAttribute("aria-hidden", "false");
    trigger.setAttribute("aria-expanded", "true");
    document.body.style.overflow = "hidden";
    // Small delay so transition can play
    requestAnimationFrame(() => {
      drawer.classList.add("zw-drawer--open");
      if (closeBtn) closeBtn.focus();
    });
    document.addEventListener("keydown", onKeydown);
  };

  const close = () => {
    drawer.classList.remove("zw-drawer--open");
    drawer.setAttribute("aria-hidden", "true");
    trigger.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    document.removeEventListener("keydown", onKeydown);
    // Hide after transition (180ms) so focus can't land inside
    setTimeout(() => {
      drawer.hidden = true;
      if (lastFocused && typeof lastFocused.focus === "function") {
        lastFocused.focus();
      }
    }, 180);
  };

  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Tab") {
      // Focus trap inside the drawer
      const focusables = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  trigger.addEventListener("click", open);
  if (closeBtn) closeBtn.addEventListener("click", close);
  if (overlay) overlay.addEventListener("click", close);

  // Close when a drawer link is followed (so the new page doesn't open in drawer mode)
  drawer.querySelectorAll("a[href]").forEach((a) => {
    a.addEventListener("click", () => close());
  });
}

/* ─── aria-current ──────────────────────────────────────────────────────── */

function markActiveNav() {
  const path = window.location.pathname;
  let key = "home";
  if (path.startsWith("/art")) key = "art";
  else if (path.startsWith("/shop")) key = "shop";
  else if (path.startsWith("/cart")) key = "cart";
  else if (path.startsWith("/contact")) key = "contact";

  document.querySelectorAll(`[data-nav="${key}"]`).forEach((el) => {
    el.setAttribute("aria-current", "page");
  });
}

/* ─── Boot ──────────────────────────────────────────────────────────────── */

function wire() {
  wireDropdown();
  wireDrawer();
  markActiveNav();
}

document.addEventListener("zw:partials-ready", wire);
