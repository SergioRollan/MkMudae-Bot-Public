class WarManager {
  constructor() {
    this.requests = new Map();
    this.activeWars = new Map();
    this.timeouts = new Map();
  }

  _getKey(challengerId, opponentId, type) {
    return `${challengerId}:${opponentId}:${type}`;
  }

  _normalizeAmount(amount) {
    const numeric = Number(amount);
    if (!Number.isFinite(numeric) || numeric < 0) {
      return null;
    }
    return Math.floor(numeric);
  }

  createRequest(challengerId, opponentId, type, amount = 0, metadata = {}) {
    if (!challengerId || !opponentId) {
      return { success: false, error: "invalid_users" };
    }

    if (challengerId === opponentId) {
      return { success: false, error: "self_request" };
    }

    const normalizedAmount = this._normalizeAmount(amount);
    if (normalizedAmount === null) {
      return { success: false, error: "invalid_amount" };
    }

    for (const [existingKey, existingRequest] of this.requests.entries()) {
      if (existingRequest.status === "pending") {
        const isSamePair =
          (existingRequest.challengerId === challengerId &&
            existingRequest.opponentId === opponentId) ||
          (existingRequest.challengerId === opponentId &&
            existingRequest.opponentId === challengerId);

        if (isSamePair) {
          return { success: false, error: "already_pending" };
        }
      }
    }

    const key = this._getKey(challengerId, opponentId, type);
    if (this.requests.has(key)) {
      return { success: false, error: "already_pending" };
    }

    const request = {
      challengerId,
      opponentId,
      type,
      amount: normalizedAmount,
      metadata,
      createdAt: Date.now(),
      status: "pending",
    };

    this.requests.set(key, request);
    return { success: true, request, key };
  }

  setRequestTimeout(key, timeoutId) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
    }
    this.timeouts.set(key, timeoutId);
  }

  cancelRequestTimeout(key) {
    if (this.timeouts.has(key)) {
      clearTimeout(this.timeouts.get(key));
      this.timeouts.delete(key);
    }
  }

  expireRequest(key) {
    this.cancelRequestTimeout(key);
    this.requests.delete(key);
  }

  _findRequestByUser(userId, specificChallengerId = null) {
    const entries = Array.from(this.requests.entries()).reverse();

    if (specificChallengerId) {
      for (const [key, request] of entries) {
        if (
          request.status === "pending" &&
          request.opponentId === userId &&
          request.challengerId === specificChallengerId
        ) {
          return { key, request };
        }
      }
      return null;
    }

    for (const [key, request] of entries) {
      if (
        request.status === "pending" &&
        (request.opponentId === userId || request.challengerId === userId)
      ) {
        return { key, request };
      }
    }
    return null;
  }

  _findRequestByChallenger(challengerId) {
    const entries = Array.from(this.requests.entries()).reverse();

    for (const [key, request] of entries) {
      if (
        request.status === "pending" &&
        request.challengerId === challengerId
      ) {
        return { key, request };
      }
    }
    return null;
  }

  _countPendingRequestsForOpponent(opponentId) {
    let count = 0;
    for (const request of this.requests.values()) {
      if (request.status === "pending" && request.opponentId === opponentId) {
        count++;
      }
    }
    return count;
  }

  _countPendingRequestsForChallenger(challengerId) {
    let count = 0;
    for (const request of this.requests.values()) {
      if (
        request.status === "pending" &&
        request.challengerId === challengerId
      ) {
        count++;
      }
    }
    return count;
  }

  respond(userId, action, specificChallengerId = null) {
    const pendingCount = this._countPendingRequestsForOpponent(userId);

    if (pendingCount > 1 && !specificChallengerId) {
      return { success: false, error: "multiple_pending", count: pendingCount };
    }

    const entry = this._findRequestByUser(userId, specificChallengerId);
    if (!entry) {
      return { success: false, error: "no_pending_request" };
    }

    const { key, request } = entry;

    if (action === "accept" || action === "deny") {
      const isOpponent = request.opponentId === userId;
      const isTestUser =
        process.env.WAR_USER_TEST_ID && userId === process.env.WAR_USER_TEST_ID;

      if (!isOpponent && !isTestUser) {
        return { success: false, error: "not_opponent" };
      }
    }

    this.cancelRequestTimeout(key);
    this.requests.delete(key);

    const normalizedAction =
      action === "accept" ? "accepted" : action === "deny" ? "denied" : action;

    request.status = normalizedAction;
    request.resolvedBy = userId;
    request.resolvedAt = Date.now();

    return {
      success: true,
      request,
      action: normalizedAction,
    };
  }

  registerActiveWar(threadId, challengerId, opponentId) {
    this.activeWars.set(threadId, {
      challengerId,
      opponentId,
      stopRequests: new Set(),
    });
  }

  requestStop(threadId, userId) {
    const war = this.activeWars.get(threadId);
    if (!war) {
      return { success: false, error: "no_active_war" };
    }

    if (war.opponentId === "cpu") {
      return { success: false, error: "cpu_war" };
    }

    if (userId !== war.challengerId && userId !== war.opponentId) {
      return { success: false, error: "not_participant" };
    }

    war.stopRequests.add(userId);

    const bothRequested =
      war.stopRequests.has(war.challengerId) &&
      war.stopRequests.has(war.opponentId);

    return {
      success: true,
      bothRequested,
      challengerRequested: war.stopRequests.has(war.challengerId),
      opponentRequested: war.stopRequests.has(war.opponentId),
    };
  }

  clearActiveWar(threadId) {
    this.activeWars.delete(threadId);
  }

  getActiveWar(threadId) {
    return this.activeWars.get(threadId);
  }
}

module.exports = WarManager;
