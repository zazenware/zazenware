/* ============================================================================
   zazenware — art.js
   ----------------------------------------------------------------------------
   Mount the Art page: fetch /api/designs, render DesignCards into #design-grid.
   ============================================================================ */

import { api, ApiError } from "./api.js";
import { el } from "./format.js";
import { renderDesignCard } from "./cards.js";

const GRID_ID = "design-grid";

async function load() {
  const grid = document.getElementById(GRID_ID);
  if (!grid) return;

  // Show loading state
  setState(grid, "loading");

  try {
    const data = await api.listDesigns();
    const designs = data?.designs || [];
    if (designs.length === 0) {
      setState(grid, "empty");
      return;
    }
    renderGrid(grid, designs);
  } catch (err) {
    console.error("[zw] Failed to load designs:", err);
    setState(grid, "error", err);
  }
}

function renderGrid(grid, designs) {
  grid.classList.add("zw-grid");
  grid.innerHTML = "";
  for (const d of designs) grid.append(renderDesignCard(d));
}

function setState(grid, state, err = null) {
  grid.innerHTML = "";
  if (state === "loading") {
    grid.append(el("article", { class: "zw-panel", "aria-busy": "true" }, [
      el("p", { class: "zw-text-muted" }, ["Loading designs…"]),
    ]));
  } else if (state === "empty") {
    grid.append(el("article", { class: "zw-panel" }, [
      el("p", {}, ["No designs are available right now. Check back soon."]),
    ]));
  } else if (state === "error") {
    grid.append(el("article", { class: "zw-panel zw-status zw-status--error" }, [
      el("p", {}, [
        err?.message || "Couldn't load designs.",
      ]),
      el("p", {}, [
        el("button", {
          type: "button",
          class: "zw-btn zw-btn--secondary",
          onClick: () => load(),
        }, ["Retry"]),
      ]),
    ]));
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", load);
} else {
  load();
}
