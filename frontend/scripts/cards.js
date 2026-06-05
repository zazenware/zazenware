/* ============================================================================
   zazenware — cards.js
   ----------------------------------------------------------------------------
   Pure render functions for product/design cards.

   Card rules:
     - DesignCard: parent artwork. No Add to Cart.
     - ShirtCard: size + colour required before Add to Cart enables.
     - PatchCard: immediate Add to Cart, no variants.
     - PrintCard: immediate Add to Cart, no variants.

   Cart shortcut:
     - Each product card includes a "Go to cart" link.
     - It is hidden while the cart is empty.
     - It appears on all product cards once the cart contains at least one item.

   Image oracle:
     - Design / patch / print: /assets/images/{slug}/{slug}-design.png
     - Shirt black default:    stored in shirts.image_url
     - Shirt white variant:    /assets/images/{slug}/{slug}-shirt-white.png
   ============================================================================ */

import { el, formatMoney } from "./format.js";
import { addToCart, readCart, totalQuantity } from "./cart.js";

const SHIRT_SIZES = ["S", "M", "L", "XL", "2XL"];
const SHIRT_COLORS = ["Black", "White"];

const CART_HREF = "/cart.html";

/* ─── Shared image helpers ────────────────────────────────────────────── */

function designImageUrl(design) {
  return cleanPath(
    design?.image_url ||
    `/assets/images/${design?.slug}/${design?.slug}-design.png`
  );
}

function productImage(product, fallback = "") {
  return cleanPath(product?.image_url || product?.image || fallback || "");
}

function shirtImageUrl(design, shirt, color) {
  const c = String(color || "Black").trim().toLowerCase();

  if (c === "black") {
    return productImage(
      shirt,
      `/assets/images/${design.slug}/${design.slug}-shirt-black.png`,
    );
  }

  if (c === "white") {
    return cleanPath(
      shirt?.white_image_url ||
      shirt?.image_url_white ||
      shirt?.shirt_white_image_url ||
      `/assets/images/${design.slug}/${design.slug}-shirt-white.png`,
    );
  }

  return productImage(shirt, designImageUrl(design));
}

/**
 * Normalize older bad paths if they sneak in from stale data.
 * Oracle path is /assets/images/...
 */
function cleanPath(path) {
  const p = String(path || "").trim();

  if (p.startsWith("/images/")) {
    return p.replace("/images/", "/assets/images/");
  }

  return p;
}

function cardImage(src, alt, fallbackSrc = "") {
  const safeSrc = cleanPath(src);
  const safeFallback = cleanPath(fallbackSrc);

  return el("div", { class: "zw-card__image zw-img-frame zw-aspect-square" }, [
    el("img", {
      src: safeSrc,
      alt: alt || "",
      loading: "lazy",
      decoding: "async",
      onError: (event) => {
        if (!safeFallback) return;
        if (event.currentTarget.src.endsWith(safeFallback)) return;

        event.currentTarget.src = safeFallback;
      },
    }),
  ]);
}

/* ─── Shared product helpers ──────────────────────────────────────────── */

function productId(product) {
  return Number(product?.id ?? product?.product_id);
}

function priceCents(product) {
  return Number(product?.unit_price_cents ?? product?.price_cents);
}

function productName(design, label) {
  return `${design.name} — ${label}`;
}

function cartHasItems() {
  return totalQuantity(readCart()) > 0;
}

function makeGoToCartLink() {
  return el("a", {
    href: CART_HREF,
    class: "zw-btn zw-btn--secondary",
    dataset: { zwGoToCart: "true" },
    hidden: !cartHasItems(),
  }, ["Go to cart"]);
}

function syncGoToCartLinks() {
  const show = cartHasItems();

  document.querySelectorAll("[data-zw-go-to-cart]").forEach((link) => {
    link.hidden = !show;
  });
}

function updatePressed(clicked, group) {
  for (const button of group) {
    button.setAttribute("aria-pressed", button === clicked ? "true" : "false");
  }
}

function flashStatus(statusEl, text, variant = "success") {
  if (!statusEl) return;

  statusEl.textContent = "";

  const cls = variant === "error"
    ? "zw-status zw-status--error"
    : "zw-status zw-status--success";

  statusEl.append(el("div", { class: cls }, [text]));

  clearTimeout(statusEl._flashTimer);
  statusEl._flashTimer = setTimeout(() => {
    statusEl.textContent = "";
  }, 4000);
}

document.addEventListener("zw:cart-updated", syncGoToCartLinks);

window.addEventListener("storage", (event) => {
  if (event.key === "zw-cart") syncGoToCartLinks();
});

/* ─── DesignCard: Art page ────────────────────────────────────────────── */

export function renderDesignCard(design) {
  const actions = [];

  if (design.shirt) {
    actions.push(
      el("a", {
        href: `/shop.html#shirt-${design.slug}`,
        class: "zw-btn zw-btn--secondary zw-btn--small",
      }, ["View shirt"]),
    );
  }

  if (design.patch) {
    actions.push(
      el("a", {
        href: `/shop.html#patch-${design.slug}`,
        class: "zw-btn zw-btn--secondary zw-btn--small",
      }, ["View patch"]),
    );
  }

  if (design.print) {
    actions.push(
      el("a", {
        href: `/shop.html#print-${design.slug}`,
        class: "zw-btn zw-btn--secondary zw-btn--small",
      }, ["View print"]),
    );
  }

  return el("article", {
    class: "zw-card zw-design-card",
    dataset: { slug: design.slug },
  }, [
    cardImage(
      designImageUrl(design),
      design.alt_text,
      "",
    ),

    el("div", { class: "zw-card__body zw-stack" }, [
      el("h3", { class: "zw-card__title zw-display" }, [design.name]),

      el("p", { class: "zw-card__meta" }, [
        design.short_description || "",
      ]),

      actions.length > 0
        ? el("div", { class: "zw-card__actions zw-cluster" }, actions)
        : el("p", { class: "zw-text-muted zw-text-small" }, [
            "Not available right now.",
          ]),
    ]),
  ]);
}

/* ─── ShirtCard ──────────────────────────────────────────────────────── */

export function renderShirtCard(design) {
  const shirt = design.shirt;
  if (!shirt) return null;

  let selectedSize = null;
  let selectedColor = null;

  const helperId = `shirt-helper-${design.slug}`;
  const fallbackImg = designImageUrl(design);
  const initialShirtImg = shirtImageUrl(design, shirt, "Black");

  const cardImg = cardImage(
    initialShirtImg,
    shirt.alt_text || `${design.name} shirt`,
    fallbackImg,
  );

  const imgEl = cardImg.querySelector("img");

  const statusEl = el("div", {
    class: "zw-card__status",
    role: "status",
    "aria-live": "polite",
  });

  const sizeButtons = SHIRT_SIZES.map((size) =>
    el("button", {
      type: "button",
      class: "zw-btn zw-btn--small zw-variant-btn",
      "aria-pressed": "false",
      dataset: {
        variantType: "size",
        variant: size,
      },
      onClick: (event) => {
        selectedSize = size;
        updatePressed(event.currentTarget, sizeButtons);
        refreshAddButton();
      },
    }, [size]),
  );

  const colorButtons = SHIRT_COLORS.map((color) =>
    el("button", {
      type: "button",
      class: "zw-btn zw-btn--small zw-variant-btn",
      "aria-pressed": "false",
      dataset: {
        variantType: "color",
        variant: color,
      },
      onClick: (event) => {
        selectedColor = color;
        updatePressed(event.currentTarget, colorButtons);

        if (imgEl) {
          imgEl.src = shirtImageUrl(design, shirt, color);
          imgEl.alt = `${design.name} shirt in ${color}`;
        }

        refreshAddButton();
      },
    }, [color]),
  );

  const addBtn = el("button", {
    type: "button",
    class: "zw-btn zw-btn--primary",
    disabled: true,
    "aria-disabled": "true",
    "aria-describedby": helperId,
    onClick: () => {
      handleAddShirt(design, shirt, selectedSize, selectedColor, statusEl);
    },
  }, ["Add to cart"]);

  const helper = el("p", {
    class: "zw-card__helper zw-text-muted zw-text-small",
    id: helperId,
  }, ["Select size and colour first."]);

  function refreshAddButton() {
    const ok = Boolean(selectedSize && selectedColor);

    addBtn.disabled = !ok;
    addBtn.setAttribute("aria-disabled", ok ? "false" : "true");

    helper.textContent = ok
      ? `Selected: size ${selectedSize}, colour ${selectedColor}.`
      : "Select size and colour first.";
  }

  return el("article", {
    class: "zw-card zw-shirt-card",
    id: `shirt-${design.slug}`,
    dataset: {
      slug: design.slug,
      productId: String(productId(shirt)),
    },
  }, [
    cardImg,

    el("div", { class: "zw-card__body zw-stack" }, [
      el("h3", { class: "zw-card__title zw-display" }, [design.name]),

      el("p", { class: "zw-card__price" }, [
        formatMoney(priceCents(shirt)),
      ]),

      el("div", { class: "zw-card__variants zw-stack-sm" }, [
        el("fieldset", { class: "zw-variant-group" }, [
          el("legend", { class: "zw-variant-legend" }, ["Size"]),
          el("div", { class: "zw-cluster zw-cluster-sm" }, sizeButtons),
        ]),

        el("fieldset", { class: "zw-variant-group" }, [
          el("legend", { class: "zw-variant-legend" }, ["Colour"]),
          el("div", { class: "zw-cluster zw-cluster-sm" }, colorButtons),
        ]),
      ]),

      helper,

      el("div", { class: "zw-card__actions zw-cluster" }, [
        addBtn,
        makeGoToCartLink(),
      ]),

      statusEl,
    ]),
  ]);
}

/* ─── PatchCard ──────────────────────────────────────────────────────── */

export function renderPatchCard(design) {
  const patch = design.patch;
  if (!patch) return null;

  const statusEl = el("div", {
    class: "zw-card__status",
    role: "status",
    "aria-live": "polite",
  });

  return el("article", {
    class: "zw-card zw-patch-card",
    id: `patch-${design.slug}`,
    dataset: {
      slug: design.slug,
      productId: String(productId(patch)),
    },
  }, [
    cardImage(
      productImage(patch, designImageUrl(design)),
      patch.alt_text || `${design.name} patch`,
      designImageUrl(design),
    ),

    el("div", { class: "zw-card__body zw-stack" }, [
      el("h3", { class: "zw-card__title zw-display" }, [design.name]),

      patch.size_label
        ? el("p", { class: "zw-card__meta" }, [patch.size_label])
        : null,

      el("p", { class: "zw-card__price" }, [
        formatMoney(priceCents(patch)),
      ]),

      el("div", { class: "zw-card__actions zw-cluster" }, [
        el("button", {
          type: "button",
          class: "zw-btn zw-btn--primary",
          onClick: () => {
            handleAddSimple(design, patch, "patch", "Back Patch", statusEl);
          },
        }, ["Add to cart"]),

        makeGoToCartLink(),
      ]),

      statusEl,
    ]),
  ]);
}

/* ─── PrintCard ──────────────────────────────────────────────────────── */

export function renderPrintCard(design) {
  const print = design.print;
  if (!print) return null;

  const statusEl = el("div", {
    class: "zw-card__status",
    role: "status",
    "aria-live": "polite",
  });

  return el("article", {
    class: "zw-card zw-print-card",
    id: `print-${design.slug}`,
    dataset: {
      slug: design.slug,
      productId: String(productId(print)),
    },
  }, [
    cardImage(
      productImage(print, designImageUrl(design)),
      print.alt_text || `${design.name} print`,
      designImageUrl(design),
    ),

    el("div", { class: "zw-card__body zw-stack" }, [
      el("h3", { class: "zw-card__title zw-display" }, [design.name]),

      print.size_label
        ? el("p", { class: "zw-card__meta" }, [print.size_label])
        : null,

      el("p", { class: "zw-card__price" }, [
        formatMoney(priceCents(print)),
      ]),

      el("div", { class: "zw-card__actions zw-cluster" }, [
        el("button", {
          type: "button",
          class: "zw-btn zw-btn--primary",
          onClick: () => {
            handleAddSimple(design, print, "print", "Print", statusEl);
          },
        }, ["Add to cart"]),

        makeGoToCartLink(),
      ]),

      statusEl,
    ]),
  ]);
}

/* ─── Add handlers ───────────────────────────────────────────────────── */

function handleAddShirt(design, shirt, size, color, statusEl) {
  if (!size || !color) {
    flashStatus(statusEl, "Select size and colour first.", "error");
    return;
  }

  try {
    addToCart({
      product_id: productId(shirt),
      product_type: "shirt",
      design_slug: design.slug,
      name: productName(design, "Shirt"),
      unit_price_cents: priceCents(shirt),
      quantity: 1,
      image_url: shirtImageUrl(design, shirt, color),
      size,
      color,
    });

    syncGoToCartLinks();

    flashStatus(
      statusEl,
      `Added: ${design.name} shirt, size ${size}, colour ${color}.`,
      "success",
    );
  } catch (err) {
    console.error("[zw] addToCart failed:", err);
    flashStatus(statusEl, "Couldn't add to cart. Please try again.", "error");
  }
}

function handleAddSimple(design, product, type, label, statusEl) {
  try {
    addToCart({
      product_id: productId(product),
      product_type: type,
      design_slug: design.slug,
      name: productName(design, label),
      unit_price_cents: priceCents(product),
      quantity: 1,
      image_url: productImage(product, designImageUrl(design)),
    });

    syncGoToCartLinks();

    flashStatus(
      statusEl,
      `Added: ${design.name} ${label.toLowerCase()}.`,
      "success",
    );
  } catch (err) {
    console.error("[zw] addToCart failed:", err);
    flashStatus(statusEl, "Couldn't add to cart. Please try again.", "error");
  }
}