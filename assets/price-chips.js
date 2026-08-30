import { ThemeEvents } from "@theme/events";

/**
 * Holder kr/gram- og rabat-chippen i sync ved variant-skift.
 *
 * Gram stammer fra variant-metafeltet custom.grams. Metafelter er ikke en del af
 * Shopifys variant-JSON, så price-chips.liquid server-renderer FÆRDIGE
 * kr/gram-strenge i data-unit-chips (variant_id -> "99,50 kr/gram"). Vi sender
 * strenge og ikke gram-tal, fordi Liquids money-filtre ikke kan gengives 1:1 i JS
 * — så kan tallet her aldrig afvige fra tallet på produktkortet.
 *
 * To opdaterings-veje, begge dækket:
 *   1. "price:update-optimistic" på <product-price> — variant-picker sender den
 *      ved ALLE variant-skift (cache-hit, JSON-fetch og HTML-fetch).
 *   2. variant:update på nærmeste section/dialog — sikkerhedsnet hvis den
 *      optimistiske vej skulle springes over.
 * Begge veje er idempotente, så dobbelt-kald gør ingen skade.
 */
class PriceChips extends HTMLElement {
  #scope = null;
  #rawUnitChips = null;
  #unitChips = {};

  connectedCallback() {
    this.priceComponent = this.closest("product-price");
    this.#scope = this.closest(".shopify-section, dialog");

    this.priceComponent?.addEventListener("price:update-optimistic", this.handleOptimistic);
    this.#scope?.addEventListener(ThemeEvents.variantUpdate, this.handleVariantUpdate);
  }

  disconnectedCallback() {
    this.priceComponent?.removeEventListener("price:update-optimistic", this.handleOptimistic);
    this.#scope?.removeEventListener(ThemeEvents.variantUpdate, this.handleVariantUpdate);
    this.#scope = null;
  }

  /**
   * Læs variant_id -> kr/gram-tabellen. Genparses kun når attributten faktisk er
   * ændret, så en morph af elementet plukkes op uden at parse på hvert kald.
   * @returns {Record<string, string>}
   */
  get unitChips() {
    const raw = this.dataset.unitChips || "{}";

    if (raw !== this.#rawUnitChips) {
      this.#rawUnitChips = raw;
      try {
        this.#unitChips = JSON.parse(raw);
      } catch (error) {
        console.warn("price-chips: kunne ikke parse data-unit-chips", error);
        this.#unitChips = {};
      }
    }

    return this.#unitChips;
  }

  handleOptimistic = (event) => {
    this.update(event.detail?.variant);
  };

  handleVariantUpdate = (event) => {
    // Ignorér events fra andre produkter i samme section (fx kombinerede lister).
    const eventProductId = event.detail?.data?.newProduct?.id ?? event.detail?.data?.productId;
    const ownProductId = this.dataset.productId;

    if (eventProductId && ownProductId && String(eventProductId) !== String(ownProductId)) return;

    this.update(event.detail?.resource);
  };

  /**
   * @param {{ id?: number|string, price?: number, compare_at_price?: number|null } | null | undefined} variant
   */
  update(variant) {
    const unitChip = this.querySelector('[ref="unitChip"]');
    const saveChip = this.querySelector('[ref="saveChip"]');

    if (!variant) {
      if (unitChip) unitChip.hidden = true;
      if (saveChip) saveChip.hidden = true;
      return;
    }

    if (unitChip) {
      // Opslag i den server-renderede tabel. Mangler custom.grams på varianten,
      // findes der ingen nøgle — og chippen skjules.
      const perGramText = this.unitChips[String(variant.id)];

      if (perGramText) {
        unitChip.textContent = perGramText;
        unitChip.hidden = false;
      } else {
        unitChip.textContent = "";
        unitChip.hidden = true;
      }
    }

    if (saveChip) {
      const compareAt = variant.compare_at_price;
      const saveAmount = compareAt > variant.price ? compareAt - variant.price : 0;
      const savePercent =
        compareAt > variant.price ? Math.round(((compareAt - variant.price) * 100) / compareAt) : 0;

      if (savePercent > 0) {
        const formatted = (saveAmount / 100)
          .toFixed(2)
          .replace(".", ",")
          .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
          .replace(/,00$/, "");
        saveChip.textContent = `Spar ${formatted} kr`;
        saveChip.hidden = false;
      } else {
        saveChip.textContent = "";
        saveChip.hidden = true;
      }
    }
  }
}

if (!customElements.get("price-chips")) {
  customElements.define("price-chips", PriceChips);
}
