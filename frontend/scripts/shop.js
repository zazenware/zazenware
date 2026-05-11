/* ============================================================================
   zazenware — shop.js
   ----------------------------------------------------------------------------
   Mount the Shop page: fetch /api/designs, fan out into three grids
   (#shirts-grid, #patches-grid, #prints-grid) using ShirtCard / PatchCard /
   PrintCard. If a section has no products, show an empty message instead.

   After render, if the URL has a hash like #shirt-black-sun or
   #patches, scroll that into view.
   ============================================================================ */

import { api } from "./api.js";
import { el } from "./format.js";
import {
  renderShirtCard,
  renderPatchCard,
  renderPrintCard,
} from "./cards.js";

const GRIDS = [
  { type: "shirt", id: "shirts-grid",  empty: "No shirts available right now." },
  { type: "patch", id: "patches-grid", empty: "No patches available right now." },
  { type: "print", id: "prints-grid",  empty: "No prints available right now." },
];

async function load() {
  const containers = GRIDS.map((g) => ({ ...g, node: document.getElementById(g.id) }))
    .filter((g) => g.node);

  // Loading state for each grid
  for (const g of containers) showState(g.node, "loading");

  try {
    const data = await api.listDesigns();
    const designs = data?.designs || [];

    for (const g of containers) {
      const cards = designs
        .filter((d) => d[g.type])             // only designs with this medium
        .map(g.type === "shirt" ? renderShirtCard
           : g.type === "patch" ? renderPatchCard
           :                       renderPrintCard)
        .filter(Boolean);

      if (cards.length === 0) {
        showState(g.node, "empty", g.empty);
      } else {
        renderGrid(g.node, cards);
      }
    }

    // After render, honor URL hash
    maybeScrollToHash();
  } catch (err) {
    console.error("[zw] Failed to load shop:", err);
    for (const g of containers) showState(g.node, "error", err?.message);
  }
}

function renderGrid(node, cards) {
  node.classList.add("zw-grid");
  node.innerHTML = "";
  for (const c of cards) node.append(c);
}

function showState(node, state, msg = "") {
  node.innerHTML = "";
  if (state === "loading") {
    node.append(el("article", { class: "zw-panel", "aria-busy": "true" }, [
      el("p", { class: "zw-text-muted" }, ["Loading…"]),
    ]));
  } else if (state === "empty") {
    node.append(el("article", { class: "zw-panel" }, [
      el("p", {}, [msg || "Nothing here yet."]),
    ]));
  } else if (state === "error") {
    node.append(el("article", { class: "zw-panel zw-status zw-status--error" }, [
      el("p", {}, [msg || "Couldn't load. Try again."]),
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

function maybeScrollToHash() {
  const hash = window.location.hash;
  if (!hash) return;
  // Wait one frame so the DOM is laid out
  requestAnimationFrame(() => {
    const target = document.getElementById(hash.slice(1));
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", load);
} else {
  load();
}
