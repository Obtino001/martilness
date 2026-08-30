import { Component } from "@theme/component";
import { ThemeEvents } from "@theme/events";
import { morph } from "@theme/morph";
import { getLenis } from "@theme/utilities";

class StickyAddToCart extends Component {
  requiredRefs = ["stickyBar"];

  #abortController = new AbortController();
  #buyButtonsIntersectionObserver = null;
  #footerSectionObserver = null;
  #isSticky = false;
  #hiddenInFooter = false;

  connectedCallback() {
    super.connectedCallback();

    this.#setupIntersectionObserver();
    const { signal } = this.#abortController;
    const target = this.closest(".shopify-section");

    target?.addEventListener(ThemeEvents.variantUpdate, this.#handleVariantUpdate, { signal });
    target?.addEventListener(ThemeEvents.variantSelected, this.#handleVariantSelected, { signal });
  }

  disconnectedCallback() {
    this.#buyButtonsIntersectionObserver?.disconnect();
    this.#footerSectionObserver?.disconnect();
    this.#abortController.abort();
    super.disconnectedCallback();
  }

  updatedCallback() {
    super.updatedCallback?.();
    // Re-setup observers with fresh DOM references after morph
    this.#buyButtonsIntersectionObserver?.disconnect();
    this.#footerSectionObserver?.disconnect();
    this.#setupIntersectionObserver();
  }

  #setupIntersectionObserver() {
    const productForm = this.#getProductForm();
    if (!productForm) return;

    const buyButtonsBlock = productForm.closest(".buy-buttons-block");
    if (!buyButtonsBlock) return;

    const footer = document.querySelector("footer") ?? document.querySelector(".shopify-section-group-footer-group");
    if (!footer) return;

    this.#buyButtonsIntersectionObserver = new IntersectionObserver((entries) => {
      const [entry] = entries;
      if (!entry) return;

      if (!entry.isIntersecting && !this.#isSticky) {
        const rect = entry.target.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top < 0) {
          this.#show();
        }
      } else if (this.#isSticky && entry.isIntersecting) {
        this.#hiddenInFooter = false;
        this.#hide();
      }
    });

    this.#footerSectionObserver = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (!entry) return;
        if (entry.isIntersecting && this.#isSticky) {
          this.#hiddenInFooter = true;
          this.#hide();
        } else if (!entry.isIntersecting && this.#hiddenInFooter) {
          const rect = buyButtonsBlock.getBoundingClientRect();
          if (rect.bottom < 0 || rect.top < 0) {
            this.#hiddenInFooter = false;
            this.#show();
          }
        }
      },
      {
        rootMargin: "0px 0px -200px 0px",
      }
    );

    this.#buyButtonsIntersectionObserver.observe(buyButtonsBlock);
    this.#footerSectionObserver.observe(footer);
  }

  #handleVariantUpdate = (event) => {
    if (event.detail.data.productId !== this.dataset.productId) return;

    const variant = event.detail.resource;
    const html = event.detail.data?.html;

    if (!html) return;

    const newStickyAddToCart = html.querySelector("sticky-add-to-cart");
    if (!newStickyAddToCart) return;

    const newStickyBar = newStickyAddToCart.querySelector('[ref="stickyBar"]');
    if (!newStickyBar) return;

    const currentSticky = this.refs.stickyBar.getAttribute("data-sticky") || "false";
    const variantAvailable = newStickyAddToCart.dataset.variantAvailable;

    // Use default MORPH_OPTIONS (not a plain object) so onAfterUpdate fires,
    // which triggers updatedCallback on responsive-image and re-adds .loaded/.in-view.
    morph(this.refs.stickyBar, newStickyBar);

    this.refs.stickyBar.setAttribute("data-sticky", currentSticky);
    this.dataset.variantAvailable = variantAvailable;

    if (variant && variant.id) {
      this.dataset.currentVariantId = variant.id;
    }

    if (variant == null) {
      this.#handleVariantUnavailable();
    }
  };

  #handleVariantSelected = (event) => {
    const variantId = event.detail.resource?.id;
    if (!variantId) return;
    this.dataset.currentVariantId = variantId;
  };

  /**
   * Called when the selected option combination maps to no variant at all.
   *
   * The bar no longer renders a variant-title line (the content stack is title +
   * price-per-gram range), so there is nothing to write the option names into.
   * The round button scrolls rather than adds, so there is no label or disabled
   * state to update either — all that remains is clearing the tracked variant.
   */
  #handleVariantUnavailable = () => {
    this.dataset.currentVariantId = "";
  };

  /**
   * Viewport offset so the invalid control sits below the sticky header (not flush/covered).
   * Prefers `--header-height` from `BasicHeader` (#setHeight); falls back to
   * measuring `header[is="sticky-header"]` when the variable is unset or still 0 (e.g. first frame).
   *
   * @returns {number}
   */
  #getConstraintScrollClearancePx() {
    const raw = getComputedStyle(document.documentElement).getPropertyValue("--header-height").trim();
    let headerPx = parseFloat(raw);
    if (!Number.isFinite(headerPx) || headerPx <= 0) {
      const sticky = document.querySelector('header[is="sticky-header"]');
      headerPx = sticky instanceof HTMLElement ? Math.round(sticky.getBoundingClientRect().height) : 0;
    }

    const gapPx = 50;

    return headerPx + gapPx;
  }

  scrollToVariantPicker = () => {
    const productId = this.dataset.productId;
    const picker =
      (productId && document.querySelector(`variant-picker[data-product-id="${productId}"]`)) ||
      document.querySelector("variant-picker");

    // Enkelt-variant-produkter har maaske ingen variantvaelger; scroll da til
    // koebsomraadet i stedet, saa knappen aldrig er en blind vej.
    const target = picker?.querySelector(".variant-picker__form") ?? picker ?? this.#getProductForm();
    if (!target) return;

    // Ekstra luft ud over header-clearance, saa vaelgeren ikke lander klistret op
    // under headeren men med titel og pris synlige over sig. Samme mønster som
    // gapPx i #getConstraintScrollClearancePx — juster dette ene tal for at
    // scrolle laengere op eller ned.
    const extraGapPx = 90;
    const clearancePx = this.#getConstraintScrollClearancePx() + extraGapPx;

    const lenis = getLenis();
    if (lenis) {
      // Explicit duration here on purpose. The global Lenis config is lerp-driven and
      // deliberately snappy so wheel scrolling feels native; but a JUMP across the page
      // still wants a visible travel time, otherwise the picker just teleports in and
      // the shopper loses their place. Wheel = fast, jump = legible.
      lenis.scrollTo(target, { offset: -clearancePx, duration: 0.6, immediate: false });
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rect = target.getBoundingClientRect();
    window.scrollTo({
      top: Math.max(0, rect.top + window.scrollY - clearancePx),
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
  };

  #getProductForm() {
    const productId = this.dataset.productId;
    if (!productId) return null;

    const sectionElement = this.closest(".shopify-section");
    if (!sectionElement) return null;

    const sectionId = sectionElement.id.replace("shopify-section-", "");
    return document.querySelector(
      `#shopify-section-${sectionId} product-form-component[data-product-id="${productId}"]`
    );
  }

  #show() {
    const { stickyBar } = this.refs;
    this.#isSticky = true;
    stickyBar.dataset.sticky = "true";

    // The global reveal IntersectionObserver excludes the bottom 50px (rootMargin -50px),
    // so the fixed sticky bar is never detected as in-viewport by it.
    // Force-add .in-view when the bar becomes visible so zoom-reveal images display correctly.
    const mediaWrapper = stickyBar.querySelector(".sticky-add-to-cart__image .media");
    if (mediaWrapper?.classList.contains("loaded")) {
      mediaWrapper.classList.add("in-view");
    }
  }

  #hide() {
    const { stickyBar } = this.refs;
    this.#isSticky = false;
    stickyBar.dataset.sticky = "false";
  }

}

if (!customElements.get("sticky-add-to-cart")) {
  customElements.define("sticky-add-to-cart", StickyAddToCart);
}
