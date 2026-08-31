import { CartAddEvent, CartErrorEvent, CartGroupedSections, ThemeEvents } from "@theme/events";
import { fetchConfig, formatCurrency } from "@theme/utilities";

class QuantityBundle extends HTMLElement {
  connectedCallback() {
    this.unit = Number(this.dataset.unit || 0);
    this.unitCompare = Number(this.dataset.unitCompare || this.unit);
    this.variantId = this.dataset.variantId;
    this.flexQty = Number(this.querySelector('[data-flex="true"]')?.dataset.qty || 3);
    this.covers = this.#parseCovers();
    this.coverPicks = [];

    this.addEventListener("click", this.#onClick);
    this.addEventListener("change", this.#onChange);
    this.addEventListener("keydown", this.#onKeydown);
    this.closest(".shopify-section, dialog")?.addEventListener(
      ThemeEvents.variantUpdate,
      this.#onVariantUpdate
    );

    this.#syncLive();
    if (!this.#selectedTier()) {
      this.#selectTier(this.querySelector(".qty-bundle__tier"));
    }
    if (this.querySelector("[data-addon].is-on")) {
      this.#setCoverCount(this.dataset.addonSync === "true" ? this.#qty() : 1);
    }
    this.#paint();
    this.classList.add("is-ready");
  }

  disconnectedCallback() {
    this.removeEventListener("click", this.#onClick);
    this.removeEventListener("change", this.#onChange);
    this.removeEventListener("keydown", this.#onKeydown);
    this.closest(".shopify-section, dialog")?.removeEventListener(
      ThemeEvents.variantUpdate,
      this.#onVariantUpdate
    );
  }

  #parseCovers() {
    const node = this.querySelector("[data-covers]");
    if (!node) return [];
    try {
      return JSON.parse(node.textContent || "[]");
    } catch {
      return [];
    }
  }

  #onVariantUpdate = (event) => {
    const resource = event.detail?.resource;
    const data = event.detail?.data || {};
    const newProduct = data.newProduct;
    const productId = data.productId;

    if (newProduct?.id) {
      this.dataset.productId = String(newProduct.id);
    } else if (productId && String(productId) !== String(this.dataset.productId)) {
      return;
    }

    if (!resource?.id) return;
    this.variantId = String(resource.id);
    this.dataset.variantId = this.variantId;
    if (resource.price != null && resource.price !== "") this.unit = Number(resource.price);
    if (resource.compare_at_price != null && resource.compare_at_price !== "") {
      this.unitCompare = Number(resource.compare_at_price) || this.unit;
    } else if (this.unitCompare < this.unit) {
      this.unitCompare = this.unit;
    }
    this.#syncProductName(data.html);
    this.#paint();
  };

  #syncProductName(html) {
    if (this.dataset.fixedName === "true" || !html) return;
    const raw =
      html.querySelector(".product-title__name")?.textContent ||
      html.querySelector("product-title .text-block")?.textContent ||
      "";
    const name = raw.split("|")[0].replace(/\s+/g, " ").trim();
    if (!name) return;
    this.querySelectorAll("[data-pname]").forEach((el) => {
      el.textContent = name;
    });
  };

  #onChange = (event) => {
    if (!(event.target instanceof HTMLInputElement)) return;
    if (!event.target.classList.contains("qty-bundle__radio")) return;
    this.#selectTier(event.target.closest(".qty-bundle__tier"));
  };

  #onKeydown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    if (!event.target.closest("[data-atop]")) return;
    event.preventDefault();
    this.#toggleAddon();
  };

  #onClick = (event) => {
    const step = event.target.closest("[data-step]");
    if (step) {
      event.preventDefault();
      this.#stepMain(step.dataset.step === "+" ? 1 : -1);
      return;
    }
    const coverStep = event.target.closest("[data-cs]");
    if (coverStep) {
      event.preventDefault();
      this.#stepCovers(coverStep.dataset.cs === "+" ? 1 : -1);
      return;
    }
    const swatch = event.target.closest("[data-ci]");
    if (swatch) {
      event.preventDefault();
      if (swatch.classList.contains("is-soldout")) return;
      const row = Number(swatch.closest("[data-row]")?.dataset.row || 0);
      this.coverPicks[row] = Number(swatch.dataset.ci);
      this.#renderAddonRows();
      this.#paint();
      return;
    }
    if (event.target.closest("[data-atop]")) {
      this.#toggleAddon();
      return;
    }
    if (event.target.closest("[data-cta]")) {
      event.preventDefault();
      this.#addToCart();
    }
  };

  #selectedTier() {
    return this.querySelector(".qty-bundle__tier.is-selected");
  }

  #selectTier(tier) {
    if (!tier) return;
    this.querySelectorAll(".qty-bundle__tier").forEach((el) => {
      el.classList.toggle("is-selected", el === tier);
      const input = el.querySelector("input");
      if (input) input.checked = el === tier;
    });
    if (tier.dataset.flex === "true") {
      this.flexQty = Number(tier.dataset.qty || this.flexQty);
    }
    if (this.dataset.addonSync === "true" && this.#addonOn()) {
      this.#setCoverCount(this.#qty());
    }
    this.#paint();
  }

  #qty() {
    const tier = this.#selectedTier();
    if (!tier) return 1;
    if (tier.dataset.flex === "true") return this.flexQty;
    return Number(tier.dataset.qty || 1);
  }

  #discount() {
    return Number(this.#selectedTier()?.dataset.discount || 0);
  }

  #stepMain(delta) {
    const tier = this.querySelector('[data-flex="true"]');
    if (!tier) return;
    this.#selectTier(tier);
    const min = Number(tier.dataset.qty || 3);
    const max = Number(this.dataset.flexMax || 8);
    this.flexQty = Math.min(max, Math.max(min, this.flexQty + delta));
    if (this.dataset.addonSync === "true" && this.#addonOn()) {
      this.#setCoverCount(this.flexQty);
    }
    this.#paint();
  }

  #addonOn() {
    return this.querySelector("[data-addon]")?.classList.contains("is-on");
  }

  #toggleAddon() {
    const addon = this.querySelector("[data-addon]");
    if (!addon) return;
    addon.classList.toggle("is-on");
    const on = addon.classList.contains("is-on");
    addon.querySelector("[data-atop]")?.setAttribute("aria-pressed", String(on));
    const hint = addon.querySelector("[data-ahint]");
    if (hint) hint.textContent = on ? addon.dataset.hintOn || "" : addon.dataset.hintOff || "";
    if (on && this.dataset.addonSync === "true") this.#setCoverCount(this.#qty());
    this.#paint();
  }

  #coverCount() {
    return this.coverPicks.length;
  }

  #setCoverCount(count) {
    const max = Number(this.querySelector("[data-addon]")?.dataset.max || 8);
    const next = Math.max(0, Math.min(max, count));
    const firstAvailable = this.covers.findIndex((c) => c.available !== false);
    const fallback = firstAvailable < 0 ? 0 : firstAvailable;
    while (this.coverPicks.length < next) this.coverPicks.push(this.coverPicks.at(-1) ?? fallback);
    this.coverPicks.length = next;
    this.#renderAddonRows();
  }

  #stepCovers(delta) {
    this.#setCoverCount(this.#coverCount() + delta);
    this.#paint();
  }

  #lineNow(qty, discount) {
    const keep = Math.max(0, 100 - Number(discount || 0));
    return Math.round((this.unit * qty * keep) / 100);
  }

  #lineCompare(qty) {
    const compare = this.unitCompare > this.unit ? this.unitCompare : this.unit;
    return compare * qty;
  }

  #addonUnit() {
    const cover = this.covers.find((c) => c.available !== false) || this.covers[0];
    return Number(cover?.price || 0);
  }

  #paint() {
    this.querySelectorAll(".qty-bundle__tier").forEach((tier) => {
      const flex = tier.dataset.flex === "true";
      const qty = flex ? this.flexQty : Number(tier.dataset.qty || 1);
      const discount = Number(tier.dataset.discount || 0);
      const now = this.#lineNow(qty, discount);
      const compare = this.#lineCompare(qty);
      const pill = tier.querySelector("[data-pill]");
      const price = tier.querySelector("[data-price-out]");
      const comp = tier.querySelector("[data-comp]");
      const qLabel = tier.querySelector("[data-lblq]");
      const qVal = tier.querySelector("[data-q]");
      const minus = tier.querySelector('[data-step="-"]');
      if (qLabel) qLabel.textContent = String(qty);
      if (qVal) qVal.textContent = String(qty);
      if (minus) minus.disabled = qty <= Number(tier.dataset.qty || 3);
      if (price) price.textContent = formatCurrency(now);
      if (comp) comp.textContent = compare > now ? formatCurrency(compare) : "";
      if (pill) {
        const pct =
          discount > 0
            ? discount
            : compare > now
              ? Math.round(((compare - now) / compare) * 100)
              : 0;
        pill.textContent = pct > 0 ? `${this.dataset.savePrefix || "Spar"} ${pct}%` : "";
      }
    });

    const qty = this.#qty();
    let now = this.#lineNow(qty, this.#discount());
    let compare = this.#lineCompare(qty);
    if (this.#addonOn()) {
      const addonNow = this.#addonUnit() * this.#coverCount();
      now += addonNow;
      compare += addonNow;
    }

    const totalNow = this.querySelector("[data-total]");
    const totalComp = this.querySelector("[data-total-compare]");
    const saveEl = this.querySelector("[data-save]");
    if (totalNow) totalNow.textContent = formatCurrency(now);
    if (totalComp) totalComp.textContent = compare > now ? formatCurrency(compare) : "";
    if (saveEl) {
      const saved = compare - now;
      saveEl.textContent =
        saved > 0 ? (this.dataset.saveLine || "Du sparer {amount}").replace("{amount}", formatCurrency(saved)) : "";
    }

    const coverCount = this.querySelector("[data-ccount]");
    if (coverCount) coverCount.textContent = String(this.#coverCount());
    const coverMinus = this.querySelector('[data-cs="-"]');
    if (coverMinus) coverMinus.disabled = this.#coverCount() <= 0;
  }

  #renderAddonRows() {
    const host = this.querySelector("[data-rows]");
    if (!host || !this.covers.length) return;
    const esc = (value) =>
      String(value || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    host.innerHTML = this.coverPicks
      .map((pick, row) => {
        const active = this.covers[pick] || this.covers[0];
        const swatches = this.covers
          .map((cover, i) => {
            const sold = cover.available === false ? " is-soldout" : "";
            const on = i === pick ? " is-active" : "";
            const title = esc(cover.title);
            const img = cover.image ? `<img src="${esc(cover.image)}" alt="${title}">` : "";
            return `<button type="button" class="qty-bundle__sw${on}${sold}" data-ci="${i}" aria-label="${title}">${img}</button>`;
          })
          .join("");
        return `<div class="qty-bundle__row" data-row="${row}"><span class="qty-bundle__rn">#${row + 1}</span><span class="qty-bundle__sws">${swatches}</span><span class="qty-bundle__rname">${esc(active?.title)}</span></div>`;
      })
      .join("");
  }

  #syncLive() {
    const n = this.querySelector("[data-live-n]");
    if (!n || this.dataset.live !== "true") return;
    const min = Number(this.dataset.liveMin || 20);
    const max = Number(this.dataset.liveMax || 80);
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    const key = `qty-bundle-live-${this.dataset.productId}`;
    let value = Number(sessionStorage.getItem(key) || 0);
    if (!value) {
      value = Math.floor(lo + Math.random() * (hi - lo + 1));
      sessionStorage.setItem(key, String(value));
    }
    n.textContent = String(value);
  }

  async #addToCart() {
    const cta = this.querySelector("[data-cta]");
    if (!cta || cta.classList.contains("is-loading")) return;
    if (!this.variantId) return;

    const items = [{ id: Number(this.variantId), quantity: this.#qty() }];
    if (this.#addonOn()) {
      this.coverPicks.forEach((pick) => {
        const cover = this.covers[pick];
        if (!cover?.id || cover.available === false) return;
        const existing = items.find((item) => item.id === cover.id);
        if (existing) existing.quantity += 1;
        else items.push({ id: cover.id, quantity: 1 });
      });
    }

    cta.classList.add("is-loading");
    const errorEl = this.querySelector("[data-error]");
    if (errorEl) {
      errorEl.textContent = "";
      errorEl.classList.add("hidden");
    }

    const sections = [];
    document.dispatchEvent(new CartGroupedSections(sections));
    const sectionIds = [...new Set(sections)];
    const addedQty = items.reduce((sum, item) => sum + item.quantity, 0);

    try {
      const response = await fetch(window.FoxTheme.routes.cart_add_url, fetchConfig("json", {
        body: JSON.stringify({
          items,
          sections: sectionIds.join(","),
          sections_url: window.location.pathname,
        }),
      }));
      const json = await response.json();
      if (json.status) {
        this.dispatchEvent(new CartErrorEvent(this.id || "", json.message, json.description, json.errors));
        if (errorEl) {
          errorEl.textContent = json.description || json.message || "";
          errorEl.classList.remove("hidden");
        }
        return;
      }
      const resource = { ...json };
      delete resource.items;
      this.dispatchEvent(
        new CartAddEvent(resource, this.id || "", {
          source: "quantity-bundle",
          itemCount: addedQty,
          productId: this.dataset.productId,
          variantId: this.variantId,
          sections: json.sections,
        })
      );
      document.dispatchEvent(
        new CustomEvent(ThemeEvents.productAjaxAdded, { detail: { product: json } })
      );
      if (this.dataset.afterAdd === "checkout") {
        window.location.href = window.FoxTheme?.routes?.checkout_url || "/checkout";
      }
    } catch (error) {
      if (errorEl) {
        errorEl.textContent = error.message || "";
        errorEl.classList.remove("hidden");
      }
    } finally {
      cta.classList.remove("is-loading");
    }
  }
}

if (!customElements.get("quantity-bundle")) {
  customElements.define("quantity-bundle", QuantityBundle);
}
