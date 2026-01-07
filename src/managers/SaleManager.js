class SaleManager {
  constructor() {
    this.pendingSales = new Map();
  }

  _getKey(sellerId, buyerId) {
    return `${sellerId}:${buyerId}`;
  }

  createSaleOffer(
    sellerId,
    buyerId,
    playerId,
    playerName,
    salePrice,
    timeoutId = null
  ) {
    if (!sellerId || !buyerId || !playerId) {
      return { success: false, error: "invalid_params" };
    }

    const key = this._getKey(sellerId, buyerId);
    if (this.pendingSales.has(key)) {
      return { success: false, error: "already_pending" };
    }

    const offer = {
      sellerId,
      buyerId,
      playerId,
      playerName,
      salePrice,
      createdAt: Date.now(),
      status: "pending",
      timeoutId,
    };

    this.pendingSales.set(key, offer);
    return { success: true, offer };
  }

  setOfferTimeout(sellerId, buyerId, timeoutId) {
    const key = this._getKey(sellerId, buyerId);
    const offer = this.pendingSales.get(key);
    if (offer) {
      offer.timeoutId = timeoutId;
      this.pendingSales.set(key, offer);
    }
  }

  cancelOfferTimeout(sellerId, buyerId) {
    const key = this._getKey(sellerId, buyerId);
    const offer = this.pendingSales.get(key);
    if (offer && offer.timeoutId) {
      clearTimeout(offer.timeoutId);
      offer.timeoutId = null;
      this.pendingSales.set(key, offer);
    }
  }

  getSaleOffer(sellerId, buyerId) {
    const key = this._getKey(sellerId, buyerId);
    return this.pendingSales.get(key) || null;
  }

  removeSaleOffer(sellerId, buyerId) {
    const key = this._getKey(sellerId, buyerId);
    return this.pendingSales.delete(key);
  }

  getSaleOfferByBuyer(buyerId) {
    for (const [key, offer] of this.pendingSales.entries()) {
      if (offer.buyerId === buyerId && offer.status === "pending") {
        return offer;
      }
    }
    return null;
  }

  getSaleOfferBySeller(sellerId) {
    for (const [key, offer] of this.pendingSales.entries()) {
      if (offer.sellerId === sellerId && offer.status === "pending") {
        return offer;
      }
    }
    return null;
  }
}

module.exports = SaleManager;
