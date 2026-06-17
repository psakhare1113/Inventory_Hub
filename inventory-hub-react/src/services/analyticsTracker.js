/**
 * analyticsTracker.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Client-side event tracker for the Real-Time User Analytics System.
 * Captures every meaningful user action and batches them to the analytics API.
 *
 * Architecture:
 *   User Action → track() → in-memory queue → flush() → POST /api/analytics/events/batch
 *
 * Critical events (payment, login, order) are flushed immediately.
 * All others are batched every 3 seconds.
 */

const ANALYTICS_API = 'http://localhost:9999/api/analytics/events/batch';
const FLUSH_INTERVAL_MS = 3000;
const MAX_QUEUE_SIZE = 100;

// Events that must be sent immediately (no batching delay)
const CRITICAL_EVENTS = new Set([
  'login', 'logout', 'payment_success', 'payment_failure',
  'order_placed', 'checkout_start', 'session_start', 'session_end',
]);

class AnalyticsTracker {
  constructor() {
    this._queue = [];
    this._sessionId = this._getOrCreateSession();
    this._userId = this._readUserId();
    this._pageStartTime = Date.now();
    this._lastActivityTime = Date.now();
    this._scrollDepth = 0;
    this._clickCount = 0;
    this._idleTimer = null;
    this._flushTimer = null;
    this._deviceInfo = this._collectDeviceInfo();
    this._initialized = false;
  }

  // ─── Public init (call once on app mount) ──────────────────────────────────
  init() {
    if (this._initialized) return;
    this._initialized = true;

    this._attachScrollTracker();
    this._attachClickTracker();
    this._attachIdleTracker();
    this._attachVisibilityTracker();
    this._startFlushLoop();

    window.addEventListener('beforeunload', () => {
      this._trackSessionEnd();
      this._flush(true); // synchronous keepalive flush
    });

    // Track initial page view
    this.track('page_view', {
      ...this._deviceInfo,
      trafficSource: this._getTrafficSource(),
    });
  }

  // ─── Core track method ─────────────────────────────────────────────────────
  track(eventType, payload = {}) {
    const event = {
      eventId: this._uuid(),
      userId: this._userId || 'anonymous',
      sessionId: this._sessionId,
      event: eventType,
      timestamp: new Date().toISOString(),
      pageUrl: window.location.pathname,
      referrer: document.referrer || null,
      ...payload,
    };

    this._queue.push(event);

    // ── Also persist to localStorage for admin dashboard ──────────────────
    this._saveToLocalStorage(event);

    // Prevent unbounded queue growth
    if (this._queue.length > MAX_QUEUE_SIZE) {
      this._queue = this._queue.slice(-MAX_QUEUE_SIZE);
    }

    if (CRITICAL_EVENTS.has(eventType)) {
      this._flush();
    }
  }

  // ─── Save event to localStorage (per-user activity store) ─────────────────
  _saveToLocalStorage(event) {
    try {
      const userId = event.userId;
      if (!userId || userId === 'anonymous') return;

      const key = `_ua_${userId}`; // user activity key
      const MAX_EVENTS = 200;

      let stored = [];
      try { stored = JSON.parse(localStorage.getItem(key) || '[]'); } catch { stored = []; }

      // Only store meaningful events
      const TRACK_EVENTS = new Set([
        'search', 'product_view', 'add_to_cart', 'remove_from_cart',
        'page_view', 'category_view', 'wishlist_add', 'wishlist_remove',
        'checkout_start', 'order_placed', 'payment_success', 'payment_failure',
        'login', 'logout',
      ]);
      if (!TRACK_EVENTS.has(event.event)) return;

      stored.push({
        e: event.event,
        t: event.timestamp,
        p: event.pageUrl,
        // event-specific fields
        ...(event.searchQuery  && { q: event.searchQuery }),
        ...(event.productId    && { pid: event.productId }),
        ...(event.productName  && { pn: event.productName }),
        ...(event.category     && { cat: event.category }),
        ...(event.price        && { price: event.price }),
        ...(event.quantity     && { qty: event.quantity }),
        ...(event.pageName     && { pg: event.pageName }),
        ...(event.categoryName && { cn: event.categoryName }),
        ...(event.orderId      && { oid: event.orderId }),
        ...(event.amount       && { amt: event.amount }),
      });

      // Keep only last MAX_EVENTS
      if (stored.length > MAX_EVENTS) stored = stored.slice(-MAX_EVENTS);
      localStorage.setItem(key, JSON.stringify(stored));
    } catch { /* storage full or unavailable */ }
  }

  // ─── Read stored activity for a user (called by admin dashboard) ──────────
  static getStoredActivity(userId) {
    try {
      const key = `_ua_${userId}`;
      return JSON.parse(localStorage.getItem(key) || '[]');
    } catch { return []; }
  }

  static clearStoredActivity(userId) {
    try { localStorage.removeItem(`_ua_${userId}`); } catch { /* ignore */ }
  }

  // ─── Flush queue to API ────────────────────────────────────────────────────
  async _flush(keepalive = false) {
    if (this._queue.length === 0) return;
    const batch = [...this._queue];
    this._queue = [];

    try {
      await fetch(ANALYTICS_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: batch }),
        keepalive,
      });
    } catch {
      // Re-queue on failure (capped to avoid memory leak)
      this._queue.unshift(...batch.slice(0, 20));
    }
  }

  _startFlushLoop() {
    this._flushTimer = setInterval(() => this._flush(), FLUSH_INTERVAL_MS);
  }

  // ─── Session management ────────────────────────────────────────────────────
  _getOrCreateSession() {
    let sid = sessionStorage.getItem('_analytics_sid');
    if (!sid) {
      sid = `SES-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
      sessionStorage.setItem('_analytics_sid', sid);
      // Session start tracked after init() so deviceInfo is ready
      setTimeout(() => this.track('session_start', { sessionId: sid }), 0);
    }
    return sid;
  }

  _trackSessionEnd() {
    const activeTime = Math.round((Date.now() - this._pageStartTime) / 1000);
    this.track('session_end', {
      sessionId: this._sessionId,
      activeTimeSeconds: activeTime,
      totalClicks: this._clickCount,
      maxScrollDepth: this._scrollDepth,
    });
  }

  // ─── Device / environment info ─────────────────────────────────────────────
  _collectDeviceInfo() {
    const ua = navigator.userAgent;
    return {
      deviceType: /Mobile|Android|iPhone/i.test(ua) ? 'mobile'
                : /Tablet|iPad/i.test(ua) ? 'tablet' : 'desktop',
      browser: this._parseBrowser(ua),
      os: this._parseOS(ua),
      screenResolution: `${window.screen.width}x${window.screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    };
  }

  _parseBrowser(ua) {
    if (ua.includes('Edg')) return 'Edge';
    if (ua.includes('Chrome')) return 'Chrome';
    if (ua.includes('Firefox')) return 'Firefox';
    if (ua.includes('Safari')) return 'Safari';
    return 'Other';
  }

  _parseOS(ua) {
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Mac')) return 'macOS';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iOS')) return 'iOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Other';
  }

  _getTrafficSource() {
    const ref = document.referrer;
    if (!ref) return 'direct';
    if (/google|bing|yahoo|duckduckgo/i.test(ref)) return 'organic_search';
    if (/facebook|instagram|twitter|linkedin|youtube/i.test(ref)) return 'social';
    if (/email|mail/i.test(ref)) return 'email';
    return 'referral';
  }

  // ─── Scroll tracking ───────────────────────────────────────────────────────
  _attachScrollTracker() {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const scrolled = window.scrollY + window.innerHeight;
          const total = document.documentElement.scrollHeight || 1;
          this._scrollDepth = Math.min(100, Math.round((scrolled / total) * 100));
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  // ─── Click tracking ────────────────────────────────────────────────────────
  _attachClickTracker() {
    document.addEventListener('click', (e) => {
      this._clickCount++;
      this._lastActivityTime = Date.now();

      // Track elements with data-track attribute
      const tracked = e.target.closest('[data-track]');
      if (tracked) {
        this.track('button_click', {
          elementId: tracked.id || null,
          elementText: (tracked.innerText || '').slice(0, 80),
          trackingLabel: tracked.dataset.track,
        });
      }

      // Track banner clicks
      const banner = e.target.closest('[data-banner-id]');
      if (banner) {
        this.track('banner_click', {
          bannerId: banner.dataset.bannerId,
          bannerName: banner.dataset.bannerName || null,
        });
      }
    });
  }

  // ─── Idle detection ────────────────────────────────────────────────────────
  _attachIdleTracker() {
    const IDLE_MS = 30000;
    const reset = () => {
      this._lastActivityTime = Date.now();
      clearTimeout(this._idleTimer);
      this._idleTimer = setTimeout(() => {
        this.track('user_idle', {
          idleSince: new Date(this._lastActivityTime).toISOString(),
        });
      }, IDLE_MS);
    };
    ['mousemove', 'keydown', 'scroll', 'touchstart'].forEach(evt =>
      document.addEventListener(evt, reset, { passive: true })
    );
  }

  // ─── Tab visibility ────────────────────────────────────────────────────────
  _attachVisibilityTracker() {
    document.addEventListener('visibilitychange', () => {
      this.track(document.hidden ? 'tab_hidden' : 'tab_visible', {
        pageUrl: window.location.pathname,
      });
    });
  }

  // ─── User ID helpers ───────────────────────────────────────────────────────
  _readUserId() {
    return localStorage.getItem('customerId') ||
           localStorage.getItem('userId') ||
           null;
  }

  setUserId(userId) {
    this._userId = userId;
  }

  // ─── Utility ───────────────────────────────────────────────────────────────
  _uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }

  // ─── Public tracking API ───────────────────────────────────────────────────

  trackLogin(userId, method = 'email') {
    this.setUserId(userId);
    this.track('login', { userId, loginMethod: method, ...this._deviceInfo });
  }

  trackLogout() {
    this.track('logout', { userId: this._userId });
    this._trackSessionEnd();
    this._flush();
    // Reset session for next login
    sessionStorage.removeItem('_analytics_sid');
    this._sessionId = this._getOrCreateSession();
    this._userId = null;
  }

  trackPageView(pageUrl, pageName) {
    this._pageStartTime = Date.now();
    this._scrollDepth = 0;
    this._clickCount = 0;
    this.track('page_view', {
      pageUrl: pageUrl || window.location.pathname,
      pageName: pageName || document.title,
      ...this._deviceInfo,
      trafficSource: this._getTrafficSource(),
    });
  }

  trackProductView(product) {
    this.track('product_view', {
      productId: String(product.id || product.productId),
      productName: product.name,
      category: product.categoryName || product.category,
      price: product.price || product.sellingPrice,
      brand: product.brand || null,
    });
  }

  trackCategoryView(categoryId, categoryName) {
    this.track('category_view', { categoryId: String(categoryId), categoryName });
  }

  trackSearch(query, resultsCount = 0) {
    this.track('search', {
      searchQuery: query,
      resultsCount,
    });
  }

  trackAddToCart(product, quantity = 1) {
    this.track('add_to_cart', {
      productId: String(product.id || product.productId),
      productName: product.name,
      price: product.price || product.sellingPrice,
      quantity,
      category: product.categoryName || product.category,
    });
  }

  trackRemoveFromCart(productId) {
    this.track('remove_from_cart', { productId: String(productId) });
  }

  trackWishlistAdd(productId) {
    this.track('wishlist_add', { productId: String(productId) });
  }

  trackWishlistRemove(productId) {
    this.track('wishlist_remove', { productId: String(productId) });
  }

  trackCheckoutStart(cartValue, itemCount) {
    this.track('checkout_start', { cartValue, itemCount });
  }

  trackPaymentSuccess(orderId, amount, method) {
    this.track('payment_success', {
      orderId: String(orderId),
      amount,
      paymentMethod: method,
    });
  }

  trackPaymentFailure(orderId, amount, method, reason) {
    this.track('payment_failure', {
      orderId: String(orderId),
      amount,
      paymentMethod: method,
      failureReason: reason || null,
    });
  }

  trackOrderPlaced(orderId, amount, itemCount) {
    this.track('order_placed', {
      orderId: String(orderId),
      amount,
      itemCount,
    });
  }

  trackOrderCancellation(orderId, reason) {
    this.track('order_cancelled', { orderId: String(orderId), reason: reason || null });
  }

  trackReturnRequest(orderId, productId, reason) {
    this.track('return_request', {
      orderId: String(orderId),
      productId: String(productId),
      reason: reason || null,
    });
  }

  trackReviewSubmit(productId, rating) {
    this.track('review_submitted', { productId: String(productId), rating });
  }

  trackCouponUsed(couponCode, discountAmount) {
    this.track('coupon_used', { couponCode, discountAmount });
  }

  trackNotificationClick(notificationId, notificationType) {
    this.track('notification_click', { notificationId, notificationType });
  }

  trackTimeSpent(pageUrl, timeSpentSeconds) {
    this.track('time_spent', {
      pageUrl,
      timeSpentSeconds,
      scrollDepth: this._scrollDepth,
      clickCount: this._clickCount,
    });
  }

  // Destroy — call on app unmount
  destroy() {
    if (this._flushTimer) clearInterval(this._flushTimer);
    if (this._idleTimer) clearTimeout(this._idleTimer);
    this._flush();
  }
}

// Singleton instance
const tracker = new AnalyticsTracker();
export default tracker;
