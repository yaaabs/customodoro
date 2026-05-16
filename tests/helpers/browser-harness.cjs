const fs = require("fs");
const path = require("path");
const vm = require("vm");

class FakeEventTarget {
  constructor() {
    this.listeners = new Map();
  }

  addEventListener(type, listener) {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type).add(listener);
  }

  removeEventListener(type, listener) {
    if (this.listeners.has(type)) {
      this.listeners.get(type).delete(listener);
    }
  }

  dispatchEvent(event) {
    if (!event || !event.type) {
      throw new Error("dispatchEvent requires an event with a type");
    }

    event.target = event.target || this;
    const listeners = Array.from(this.listeners.get(event.type) || []);
    listeners.forEach((listener) => listener.call(this, event));
    return true;
  }
}

class FakeClassList {
  constructor(element) {
    this.element = element;
    this.classes = new Set();
  }

  _sync() {
    this.element.className = Array.from(this.classes).join(" ");
  }

  setFromString(value) {
    this.classes = new Set(
      String(value || "")
        .split(/\s+/)
        .map((item) => item.trim())
        .filter(Boolean),
    );
    this._sync();
  }

  add(...classes) {
    classes.forEach((item) => this.classes.add(item));
    this._sync();
  }

  remove(...classes) {
    classes.forEach((item) => this.classes.delete(item));
    this._sync();
  }

  contains(value) {
    return this.classes.has(value);
  }

  toggle(value, force) {
    if (force === true) {
      this.classes.add(value);
    } else if (force === false) {
      this.classes.delete(value);
    } else if (this.classes.has(value)) {
      this.classes.delete(value);
    } else {
      this.classes.add(value);
    }
    this._sync();
    return this.classes.has(value);
  }
}

class FakeElement extends FakeEventTarget {
  constructor(ownerDocument, tagName = "div", id = "") {
    super();
    this.ownerDocument = ownerDocument;
    this.tagName = String(tagName).toUpperCase();
    this.id = id;
    this.children = [];
    this.parentNode = null;
    this.style = {};
    this.dataset = {};
    this.attributes = new Map();
    this.textContent = "";
    this.value = "";
    this.checked = false;
    this.disabled = false;
    this.href = "";
    this.title = "";
    this.loading = "";
    this.currentTime = 0;
    this.volume = 1;
    this.loop = false;
    this.scrollLeft = 0;
    this.scrollTop = 0;
    this.scrollWidth = 320;
    this.clientWidth = 320;
    this.clientHeight = 32;
    this.offsetWidth = 320;
    this.offsetHeight = 32;
    this._innerHTML = "";
    this.className = "";
    this.classList = new FakeClassList(this);
  }

  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];

    const elementPattern = /<([a-zA-Z0-9-]+)([^>]*)>/g;
    let match;
    while ((match = elementPattern.exec(this._innerHTML))) {
      const [, tagName, attrs] = match;
      const idMatch = attrs.match(/\sid="([^"]+)"/);
      const classMatch = attrs.match(/\sclass="([^"]+)"/);
      const child = new FakeElement(
        this.ownerDocument,
        tagName,
        idMatch ? idMatch[1] : "",
      );
      if (classMatch) {
        child.classList.setFromString(classMatch[1]);
      }
      this.appendChild(child);
    }
  }

  get innerHTML() {
    return this._innerHTML;
  }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    this.ownerDocument._registerElement(child);
    return child;
  }

  insertBefore(child, referenceNode) {
    child.parentNode = this;
    this.ownerDocument._registerElement(child);
    const index = this.children.indexOf(referenceNode);
    if (index === -1) {
      this.children.push(child);
    } else {
      this.children.splice(index, 0, child);
    }
    return child;
  }

  replaceWith(newNode) {
    if (this.parentNode) {
      const index = this.parentNode.children.indexOf(this);
      if (index !== -1) {
        this.parentNode.children.splice(index, 1, newNode);
        newNode.parentNode = this.parentNode;
      }
    }
    this.ownerDocument._replaceElement(this, newNode);
  }

  cloneNode() {
    const clone = new FakeElement(this.ownerDocument, this.tagName, this.id);
    clone.classList.setFromString(this.className);
    clone.textContent = this.textContent;
    clone.value = this.value;
    clone.checked = this.checked;
    clone.disabled = this.disabled;
    clone.href = this.href;
    clone.title = this.title;
    clone.clientWidth = this.clientWidth;
    clone.scrollWidth = this.scrollWidth;
    clone.style = { ...this.style };
    return clone;
  }

  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === "id") {
      this.id = String(value);
      this.ownerDocument._registerElement(this);
    }
    if (name === "class") {
      this.classList.setFromString(value);
    }
  }

  getAttribute(name) {
    return this.attributes.get(name);
  }

  removeAttribute(name) {
    this.attributes.delete(name);
  }

  querySelector(selector) {
    return this.ownerDocument._query(selector, this.children);
  }

  querySelectorAll(selector) {
    return this.ownerDocument._queryAll(selector, this.children);
  }

  getBoundingClientRect() {
    return {
      left: 0,
      top: 0,
      right: this.clientWidth,
      bottom: this.clientHeight,
      width: this.clientWidth,
      height: this.clientHeight,
    };
  }

  focus() {}

  play() {
    return Promise.resolve();
  }

  pause() {}
}

class FakeDocument extends FakeEventTarget {
  constructor() {
    super();
    this._elementsById = new Map();
    this._allElements = new Set();
    this.hidden = false;
    this.title = "Customodoro";
    this.body = new FakeElement(this, "body", "body");
    this.documentElement = new FakeElement(this, "html", "html");
    this._registerElement(this.body);
    this._registerElement(this.documentElement);
  }

  _registerElement(element) {
    this._allElements.add(element);
    if (element.id) {
      this._elementsById.set(element.id, element);
    }
  }

  _replaceElement(oldElement, newElement) {
    this._allElements.delete(oldElement);
    if (oldElement.id) {
      this._elementsById.set(oldElement.id, newElement);
    }
    this._allElements.add(newElement);
  }

  _matchesSelector(element, selector) {
    if (!element) return false;
    if (selector.startsWith("#")) {
      return element.id === selector.slice(1);
    }
    if (selector.startsWith(".")) {
      const classes = selector
        .slice(1)
        .split(".")
        .filter(Boolean);
      const appliedClasses = new Set(
        String(element.className || "")
          .split(/\s+/)
          .map((item) => item.trim())
          .filter(Boolean),
      );
      return classes.every(
        (item) => element.classList.contains(item) || appliedClasses.has(item),
      );
    }
    return element.tagName.toLowerCase() === selector.toLowerCase();
  }

  _flatten(scopeChildren) {
    const result = [];
    const stack = [...scopeChildren];
    while (stack.length > 0) {
      const item = stack.shift();
      result.push(item);
      if (item.children.length > 0) {
        stack.push(...item.children);
      }
    }
    return result;
  }

  _query(selector, scopeChildren = null) {
    if (selector.startsWith("#")) {
      return this.getElementById(selector.slice(1));
    }

    const candidates = scopeChildren
      ? this._flatten(scopeChildren)
      : Array.from(this._allElements);
    return candidates.find((element) => this._matchesSelector(element, selector)) || null;
  }

  _queryAll(selector, scopeChildren = null) {
    if (selector.includes(",")) {
      return [];
    }
    if (selector.startsWith("#")) {
      const element = this.getElementById(selector.slice(1));
      return element ? [element] : [];
    }
    const candidates = scopeChildren
      ? this._flatten(scopeChildren)
      : Array.from(this._allElements);
    return candidates.filter((element) => this._matchesSelector(element, selector));
  }

  createElement(tagName) {
    const element = new FakeElement(this, tagName);
    this._registerElement(element);
    return element;
  }

  getElementById(id) {
    if (!this._elementsById.has(id)) {
      const element = new FakeElement(this, "div", id);
      this._registerElement(element);
    }
    return this._elementsById.get(id);
  }

  querySelector(selector) {
    return this._query(selector);
  }

  querySelectorAll(selector) {
    return this._queryAll(selector);
  }
}

function createStorage(backingStore = {}) {
  const store = backingStore;
  return {
    getItem(key) {
      return Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null;
    },
    setItem(key, value) {
      store[key] = String(value);
    },
    removeItem(key) {
      delete store[key];
    },
    clear() {
      Object.keys(store).forEach((key) => delete store[key]);
    },
    key(index) {
      return Object.keys(store)[index] || null;
    },
    get length() {
      return Object.keys(store).length;
    },
    _store: store,
  };
}

class FakeAudio {
  constructor(src = "") {
    this.src = src;
    this.currentTime = 0;
    this.volume = 1;
    this.loop = false;
  }

  play() {
    return Promise.resolve();
  }

  pause() {}

  cloneNode() {
    return new FakeAudio(this.src);
  }
}

class FakeNotification {
  constructor(title, options = {}) {
    this.title = title;
    this.options = options;
    FakeNotification.instances.push({ title, options });
  }

  static requestPermission() {
    return Promise.resolve(FakeNotification.permission);
  }
}

FakeNotification.permission = "granted";
FakeNotification.instances = [];

class FakeMutationObserver {
  constructor(callback) {
    this.callback = callback;
  }

  observe() {}

  disconnect() {}
}

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createHarness(options = {}) {
  const repoRoot = options.repoRoot || path.resolve(__dirname, "..", "..");
  const storageBacking = options.storageBacking || { ...(options.initialStorage || {}) };
  const consoleLike = options.verbose
    ? console
    : {
        log() {},
        warn() {},
        error() {},
        debug() {},
        info() {},
      };
  const document = new FakeDocument();
  const localStorage = createStorage(storageBacking);
  const sessionStorage = createStorage({});
  const windowTarget = new FakeEventTarget();

  const windowObject = {
    window: null,
    self: null,
    globalThis: null,
    document,
    localStorage,
    sessionStorage,
    navigator: {
      onLine: true,
      serviceWorker: {
        controller: {
          postMessage() {},
        },
      },
    },
    location: {
      href: "http://localhost",
      search: "",
      reload() {},
    },
    history: {
      pushState() {},
      replaceState() {},
    },
    console: consoleLike,
    performance: {
      now: () => Date.now(),
    },
    MutationObserver: FakeMutationObserver,
    Notification: FakeNotification,
    Audio: FakeAudio,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    JSON,
    URLSearchParams,
    Promise,
    requestAnimationFrame(callback) {
      return setTimeout(() => callback(Date.now()), 16);
    },
    cancelAnimationFrame(handle) {
      clearTimeout(handle);
    },
    fetch: async () => {
      throw new Error("fetch not mocked in browser harness");
    },
    confirm: () => true,
    alert() {},
    matchMedia() {
      return {
        matches: false,
        addEventListener() {},
        removeEventListener() {},
      };
    },
    timeZoneManager: null,
    timezoneManager: {
      addCustomodoroSession(type, minutes) {
        windowObject.__sessions.push({ type, minutes });
        return { type, minutes };
      },
      getStats() {
        return {};
      },
      getUserToday() {
        return new Date();
      },
      formatDateKey,
    },
    syncManager: {
      queueSync() {},
      getCurrentLocalData() {
        return {};
      },
      addEventListener() {},
    },
    authService: {
      addEventListener() {},
      isLoggedIn() {
        return false;
      },
      getCurrentUser() {
        return null;
      },
    },
    trackerDesignManager: null,
    startMidnightTracking() {},
    resetMidnightTracking() {},
    __sessions: [],
  };

  windowObject.addEventListener =
    windowTarget.addEventListener.bind(windowTarget);
  windowObject.removeEventListener =
    windowTarget.removeEventListener.bind(windowTarget);
  windowObject.dispatchEvent = windowTarget.dispatchEvent.bind(windowTarget);
  windowObject.window = windowObject;
  windowObject.self = windowObject;
  windowObject.globalThis = windowObject;
  document.defaultView = windowObject;

  const context = vm.createContext(windowObject);

  function loadScript(relativePath) {
    const absolutePath = path.resolve(repoRoot, relativePath);
    const source = fs.readFileSync(absolutePath, "utf8");
    vm.runInContext(source, context, { filename: absolutePath });
  }

  function dispatch(target, type, extra = {}) {
    const event = { type, ...extra };
    if (target === "document") {
      document.dispatchEvent(event);
    } else if (target === "window") {
      windowObject.dispatchEvent(event);
    } else {
      document.getElementById(target).dispatchEvent(event);
    }
  }

  function fireDOMContentLoaded() {
    dispatch("document", "DOMContentLoaded");
  }

  return {
    context,
    window: windowObject,
    document,
    localStorage,
    storageBacking,
    loadScript,
    fireDOMContentLoaded,
    dispatch,
    evaluate(expression) {
      return vm.runInContext(expression, context);
    },
    getElement(id) {
      return document.getElementById(id);
    },
  };
}

module.exports = {
  createHarness,
};
