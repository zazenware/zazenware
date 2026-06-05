/* ============================================================================
   zazenware — home.js
   ----------------------------------------------------------------------------
   Homepage interactions:
   - reveal-on-scroll
   - homepage signal selector
   - gentle card tilt
   - click-to-load YouTube embed
============================================================================ */

(() => {
  const signalMap = {
    shop: {
      title: "shop wall",
      copy: "browse shirts, patches, and prints from the same design families.",
      href: "/shop.html",
      link: "follow signal"
    },
    art: {
      title: "art archive",
      copy: "view the original visual work and see the pieces before they become products.",
      href: "/art.html",
      link: "view art"
    },
    bands: {
      title: "local design work",
      copy: "ask about custom artwork, local band designs, or printing pre-existing designs.",
      href: "/contact.html",
      link: "start contact"
    },
    support: {
      title: "support artist",
      copy: "direct orders and shares help keep the project independent, small, and human.",
      href: "/shop.html",
      link: "support shop"
    }
  };

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function initReveal() {
    const revealItems = document.querySelectorAll(".zw-reveal");

    if (!revealItems.length) return;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
      revealItems.forEach((item) => item.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;

          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.12 }
    );

    revealItems.forEach((item) => observer.observe(item));
  }

  function initSignalSelector() {
    const buttons = document.querySelectorAll("[data-zw-signal]");
    const title = document.querySelector("#signal-title");
    const copy = document.querySelector("#signal-copy");
    const link = document.querySelector("#signal-link");

    if (!buttons.length || !title || !copy || !link) return;

    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const signal = signalMap[button.dataset.zwSignal];

        if (!signal) return;

        buttons.forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");

        title.textContent = signal.title;
        copy.textContent = signal.copy;
        link.textContent = signal.link;
        link.href = signal.href;
      });
    });
  }

  function initTiltCards() {
    const cards = document.querySelectorAll(".zw-tilt-card");

    if (!cards.length || prefersReducedMotion) return;

    cards.forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width - 0.5) * 8;
        const y = ((event.clientY - rect.top) / rect.height - 0.5) * -8;

        card.style.setProperty("--tilt-x", `${x.toFixed(2)}deg`);
        card.style.setProperty("--tilt-y", `${y.toFixed(2)}deg`);
      });

      card.addEventListener("pointerleave", () => {
        card.style.setProperty("--tilt-x", "0deg");
        card.style.setProperty("--tilt-y", "0deg");
      });
    });
  }

  function initYouTubeLoaders() {
    const loaders = document.querySelectorAll("[data-zw-youtube]");

    loaders.forEach((loader) => {
      const id = loader.dataset.zwYoutube;
      const title = loader.dataset.zwYoutubeTitle || "zazenware video";
      const button = loader.querySelector("button");

      if (!id || !button) return;

      button.addEventListener("click", () => {
        const iframe = document.createElement("iframe");

        iframe.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0`;
        iframe.title = title;
        iframe.loading = "lazy";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;

        loader.replaceChildren(iframe);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    initReveal();
    initSignalSelector();
    initTiltCards();
    initYouTubeLoaders();
  });
})();