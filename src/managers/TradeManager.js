class TradeManager {
  constructor() {
    this.pendingTrades = new Map();
  }

  _getKey(initiatorId, targetId) {
    return `${initiatorId}:${targetId}`;
  }

  createTradeOffer(
    initiatorId,
    targetId,
    initiatorPlayerId,
    targetPlayerId,
    initiatorPlayerName,
    targetPlayerName,
    timeoutId = null
  ) {
    if (!initiatorId || !targetId || !initiatorPlayerId || !targetPlayerId) {
      return { success: false, error: "invalid_params" };
    }

    if (initiatorId === targetId) {
      return { success: false, error: "cannot_trade_with_self" };
    }

    const key = this._getKey(initiatorId, targetId);
    if (this.pendingTrades.has(key)) {
      return { success: false, error: "already_pending" };
    }

    const offer = {
      initiatorId,
      targetId,
      initiatorPlayerId,
      targetPlayerId,
      initiatorPlayerName,
      targetPlayerName,
      createdAt: Date.now(),
      status: "pending",
      timeoutId,
    };

    this.pendingTrades.set(key, offer);
    return { success: true, offer };
  }

  setOfferTimeout(initiatorId, targetId, timeoutId) {
    const key = this._getKey(initiatorId, targetId);
    const offer = this.pendingTrades.get(key);
    if (offer) {
      offer.timeoutId = timeoutId;
      this.pendingTrades.set(key, offer);
    }
  }

  cancelOfferTimeout(initiatorId, targetId) {
    const key = this._getKey(initiatorId, targetId);
    const offer = this.pendingTrades.get(key);
    if (offer && offer.timeoutId) {
      clearTimeout(offer.timeoutId);
      offer.timeoutId = null;
      this.pendingTrades.set(key, offer);
    }
  }

  getTradeOffer(initiatorId, targetId) {
    const key = this._getKey(initiatorId, targetId);
    return this.pendingTrades.get(key) || null;
  }

  removeTradeOffer(initiatorId, targetId) {
    const key = this._getKey(initiatorId, targetId);
    return this.pendingTrades.delete(key);
  }

  getTradeOfferByTarget(targetId) {
    for (const [key, offer] of this.pendingTrades.entries()) {
      if (offer.targetId === targetId && offer.status === "pending") {
        return offer;
      }
    }
    return null;
  }

  getTradeOfferByInitiator(initiatorId) {
    for (const [key, offer] of this.pendingTrades.entries()) {
      if (offer.initiatorId === initiatorId && offer.status === "pending") {
        return offer;
      }
    }
    return null;
  }
}

module.exports = TradeManager;
