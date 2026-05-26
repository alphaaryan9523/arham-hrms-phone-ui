const RETRY_DELAY = 3000;

class WebSocketService {
  constructor() {
    this.ws = null;
    this.listeners = {};
    this.employeeCode = null;
    this.token = null;
    this.retryTimeout = null;
    this.shouldReconnect = false;
    this.connected = false;
  }

  connect(employeeCode, token) {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.employeeCode = employeeCode;
    this.token = token;
    this.shouldReconnect = true;
    this._open();
  }

  _open() {
    if (!this.employeeCode) return;
    const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000')
      .replace(/^http:\/\//, 'ws://')
      .replace(/^https:\/\//, 'wss://');

    const url = `${baseUrl}/ws/arham/employee/${this.employeeCode}/`;

    try {
      this.ws = new WebSocket(url);
    } catch {
      this._scheduleRetry();
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      this._emit('_connected', {});
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const type = data.type || data.event;
        if (type) this._emit(type, data);
        this._emit('*', data);
      } catch {
        // ignore malformed frames
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this._emit('_disconnected', {});
      if (this.shouldReconnect) this._scheduleRetry();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  _scheduleRetry() {
    clearTimeout(this.retryTimeout);
    this.retryTimeout = setTimeout(() => {
      if (this.shouldReconnect) this._open();
    }, RETRY_DELAY);
  }

  _emit(type, data) {
    (this.listeners[type] || []).forEach((cb) => {
      try { cb(data); } catch { /* listener errors must not crash the service */ }
    });
  }

  on(type, callback) {
    if (!this.listeners[type]) this.listeners[type] = [];
    this.listeners[type].push(callback);
    return () => this.off(type, callback);
  }

  off(type, callback) {
    if (!this.listeners[type]) return;
    this.listeners[type] = this.listeners[type].filter((cb) => cb !== callback);
  }

  disconnect() {
    this.shouldReconnect = false;
    clearTimeout(this.retryTimeout);
    this.ws?.close();
    this.ws = null;
    this.connected = false;
    this.listeners = {};
    this.employeeCode = null;
    this.token = null;
  }
}

export const wsService = new WebSocketService();
