import { ThemeEvents } from "@theme/events";
import { morph } from "@theme/morph";

class ShippingDate extends HTMLElement {
  connectedCallback() {
    const closestSection = this.closest(".shopify-section, dialog");
    closestSection?.addEventListener(ThemeEvents.variantUpdate, this.updateShippingDate);
  }

  disconnectedCallback() {
    const closestSection = this.closest(".shopify-section, dialog");
    closestSection?.removeEventListener(ThemeEvents.variantUpdate, this.updateShippingDate);
  }

  /**
   * Updates the shipping date.
   * @param {VariantUpdateEvent} event - The variant update event.
   */
  updateShippingDate = (event) => {
    if (event.detail.data.newProduct) {
      this.dataset.productId = event.detail.data.newProduct.id;
    } else if (
      event.target instanceof HTMLElement &&
      event.target.dataset.productId !== this.dataset.productId
    ) {
      return;
    }

    // Skip if no HTML (cache hit - will sync via background fetch)
    if (!event.detail.data.html) return;

    const productId = this.dataset.productId;
    let newEl = null;

    if (productId) {
      for (const el of event.detail.data.html.querySelectorAll("shipping-date")) {
        if (el.dataset.productId === productId) {
          newEl = el;
          break;
        }
      }
    }

    if (!newEl) newEl = event.detail.data.html.querySelector("shipping-date");
    if (!newEl) return;

    morph(this, newEl, { childrenOnly: true });
  };
}

if (!customElements.get("shipping-date")) {
  customElements.define("shipping-date", ShippingDate);
}