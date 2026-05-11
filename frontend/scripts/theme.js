/* ============================================================================
   zazenware — theme.js
   ----------------------------------------------------------------------------
   Wires the [data-zw-theme-toggle] button that's injected by header.html.
   Reads & writes localStorage 'zw-theme'.
   Updates the <html data-theme="..."> attribute, button aria-pressed,
   and button aria-label.

   Runs once on 'zw:partials-ready' (dispatched by partials.js).

   The initial paint is already handled by theme-init.js (synchronous, in <head>)
   so there's no flash. This file only handles user interaction afterward.
   ============================================================================ */

const STORAGE_KEY = "zw-theme";

function currentTheme() {
  return document.documentElement.getAttribute("data-theme") || "light";
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch (_) {
    /* private mode — ignore */
  }
  updateButton(theme);
}

function updateButton(theme) {
  const btn = document.querySelector("[data-zw-theme-toggle]");
  if (!btn) return;
  const isDark = theme === "dark";
  btn.setAttribute("aria-pressed", String(isDark));
  btn.setAttribute(
    "aria-label",
    isDark ? "Switch to light theme" : "Switch to dark theme",
  );
}

function onToggleClick() {
  const next = currentTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
}

function wire() {
  const btn = document.querySelector("[data-zw-theme-toggle]");
  if (!btn) return;
  // Initialize aria-pressed/label from the current theme set by theme-init.js
  updateButton(currentTheme());
  btn.addEventListener("click", onToggleClick);
}

document.addEventListener("zw:partials-ready", wire);
