(function (root, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof define === 'function' && define.cmd) {
    define(function (require, exports, module) {
      module.exports = factory();
    });
  } else {
    root.gjs = factory();
    root.$g = root.gjs;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function factory() {
  // common var
  var $w = typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : {});
  var $d = typeof document !== 'undefined' ? document : {};

  // defined Gjs Object
  var Gjs = {};

  // gjs constructor
  Gjs = function (selector) {
    return new Gjs.fn.init(selector);
  };

  // gjs info
  Gjs.info = {
    name: 'gjs',
    date: '2026-10-22',
    version: 'v2.1.0'
  };

  // internal helpers
  var hasOwn = Object.prototype.hasOwnProperty;

  function isElement(node) {
    return !!(node && typeof node === 'object' && node.nodeType === 1);
  }

  // split "a b  c" or ['a', 'b'] into a clean class list
  function splitClass(clsName) {
    if (!clsName) return [];
    if (typeof clsName === 'string') {
      return clsName.split(/\s+/).filter(function (item) {
        return !!item;
      });
    }
    if (typeof clsName.length === 'number') {
      return Array.prototype.slice.call(clsName);
    }
    return [];
  }

  function applyStyle(elem, styleRules) {
    if (!elem) return;
    if (styleRules === null || typeof styleRules !== 'object') {
      console.error('TypeError: styleRules not a object!');
      return;
    }
    for (var key in styleRules) {
      if (hasOwn.call(styleRules, key)) {
        elem.style[key] = styleRules[key];
      }
    }
  }

  function pad(value) {
    value = parseInt(value, 10);
    return value < 10 ? '0' + value : String(value);
  }

  function decodeSafely(value) {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  }

  // Gjs fn instanceof
  Gjs.fn = Gjs.prototype = {
    constructor: Gjs,
    init: function (selector) {
      var elem = null;
      if (typeof selector === 'string') {
        elem = selector ? $d.querySelector(selector) : null;
      } else if (isElement(selector)) {
        elem = selector;
      }
      this[0] = elem;
      // length is what makes Gjs.each() usable on an instance.
      this.length = elem ? 1 : 0;
      this.selector = selector;
      return this;
    },
    // attribute set
    setAttr: function (name, val) {
      if (this[0]) this[0].setAttribute(name, val);
      return this;
    },
    // get attribute
    getAttr: function (name) {
      return this[0] ? this[0].getAttribute(name) : null;
    },
    // delete attribute
    delAttr: function (name) {
      if (this[0]) this[0].removeAttribute(name);
      return this;
    },
    // add content
    text: function (val) {
      if (this[0]) this[0].innerText = val;
      return this;
    },
    html: function (val) {
      if (this[0]) this[0].innerHTML = val;
      return this;
    },
    css: function (styleRules) {
      applyStyle(this[0], styleRules);
      return this;
    },
    // iterate the wrapped element
    each: function (fn) {
      return Gjs.each(this, fn);
    },
    // event binding
    on: function (eventTypes, handleEvent, isCapture) {
      var types = String(eventTypes || '').split(/\s+/);
      for (var i = 0; i < types.length; i++) {
        if (!types[i]) continue;
        Gjs.addEvent(this[0], types[i], handleEvent, isCapture);
      }
      return this;
    },
    off: function (eventTypes, handleEvent, isCapture) {
      var types = String(eventTypes || '').split(/\s+/);
      for (var i = 0; i < types.length; i++) {
        if (!types[i]) continue;
        Gjs.removeEvent(this[0], types[i], handleEvent, isCapture);
      }
      return this;
    },
    // class helpers
    addCls: function (clsName) {
      Gjs.addCls(this[0], clsName);
      return this;
    },
    delCls: function (clsName) {
      Gjs.delCls(this[0], clsName);
      return this;
    },
    toggleCls: function (clsName, isAdd) {
      if (arguments.length > 1) {
        Gjs.toggleCls(this[0], clsName, isAdd);
      } else {
        Gjs.toggleCls(this[0], clsName);
      }
      return this;
    },
    hasCls: function (clsName) {
      return Gjs.hasCls(this[0], clsName);
    }
  };

  // bind to prototype
  Gjs.fn.init.prototype = Gjs.fn;

  // extend
  Gjs.extend = Gjs.fn.extend = function (options) {
    var target = this || Gjs;
    if (options === null || options === undefined) return target;
    for (var name in options) {
      if (hasOwn.call(options, name)) {
        target[name] = options[name];
      }
    }
    return target;
  };

  // iterate an array-like or a plain object; return false from the callback to break
  Gjs.each = function (list, fn) {
    if (list === null || list === undefined || typeof fn !== 'function') return list;
    var i;
    if (typeof list.length === 'number' && typeof list !== 'function') {
      for (i = 0; i < list.length; i++) {
        if (fn(i, list[i]) === false) break;
      }
    } else {
      for (i in list) {
        if (hasOwn.call(list, i)) {
          if (fn(i, list[i]) === false) break;
        }
      }
    }
    return list;
  };

  // run when the document is parsed
  Gjs.ready = function (fn) {
    if (typeof fn !== 'function') return Gjs;
    if ($d.readyState === 'loading' && typeof $d.addEventListener === 'function') {
      var handler = function () {
        $d.removeEventListener('DOMContentLoaded', handler, false);
        fn(Gjs);
      };
      $d.addEventListener('DOMContentLoaded', handler, false);
    } else {
      fn(Gjs);
    }
    return Gjs;
  };

  /**
   * title: w3.org standards methods,
   * content:
   *  1.common attr
   *  2.base set
   *  3.dom Set
   *  4.bom Set
   *  ect.
   */

  /**
   * dom set area
   * include create/get/add/del/insert. ect element
   * @param {*} name: string;
   * @param {*} parent: element;
   * @param {*} child: element;
   * @param {*} newElem: element;
   * @param {*} oldElem: element;
   * @param {*} refElem: element;
   * @param {*} isDeep: boolean;
   * @param {*} val: string;
   */
  // create element
  Gjs.cElem = function (name) {
    return $d.createElement(name);
  };
  Gjs.cText = function (name) {
    return $d.createTextNode(name);
  };
  // get element
  Gjs.gId = function (name) {
    return $d.getElementById(name);
  };
  Gjs.gCls = function (name) {
    return $d.getElementsByClassName(name);
  };
  Gjs.gTag = function (name) {
    return $d.getElementsByTagName(name);
  };
  Gjs.gName = function (name) {
    return $d.getElementsByName(name);
  };
  Gjs.dom = function (name) {
    return $d.querySelector(name);
  };
  Gjs.domAll = function (name) {
    return $d.querySelectorAll(name);
  };
  // add element
  Gjs.addElem = function (parent, child) {
    if (parent && child) parent.appendChild(child);
    return this;
  };
  // replace element
  Gjs.replaceElem = function (parent, newElem, oldElem) {
    if (parent && newElem && oldElem) parent.replaceChild(newElem, oldElem);
    return this;
  };
  // insert element
  Gjs.insertElem = function (parent, newElem, refElem) {
    if (parent && newElem) parent.insertBefore(newElem, refElem || null);
    return this;
  };
  // clone element
  // true eleme and content; false: only elem
  Gjs.cloneElem = function (elem, isDeep) {
    return elem ? elem.cloneNode(isDeep) : null;
  };
  // delete element
  Gjs.delElem = function (parent, child) {
    if (parent && child) parent.removeChild(child);
    return this;
  };
  // edit content
  Gjs.text = function (elem, val) {
    if (elem) elem.innerText = val;
    return this;
  };
  Gjs.html = function (elem, val) {
    if (elem) elem.innerHTML = val;
    return this;
  };
  // attribute set
  // set attribute
  Gjs.setAttr = function (elem, name, val) {
    if (elem) elem.setAttribute(name, val);
    return this;
  };
  // get attribute
  Gjs.getAttr = function (elem, name) {
    return elem ? elem.getAttribute(name) : null;
  };
  // delete attribute
  Gjs.delAttr = function (elem, name) {
    if (elem) elem.removeAttribute(name);
    return this;
  };

  // element node set
  Gjs.parent = function (elem) {
    return elem ? elem.parentNode : null;
  };
  Gjs.parentElem = function (elem) {
    return elem ? elem.parentElement : null;
  };
  Gjs.child = function (elem) {
    return elem ? elem.childNodes : null;
  };
  Gjs.childElem = function (elem) {
    return elem ? elem.children : null;
  };
  Gjs.first = function (elem) {
    return elem ? elem.firstChild : null;
  };
  Gjs.firstElem = function (elem) {
    return elem ? elem.firstElementChild : null;
  };
  Gjs.last = function (elem) {
    return elem ? elem.lastChild : null;
  };
  Gjs.lastElem = function (elem) {
    return elem ? elem.lastElementChild : null;
  };
  Gjs.next = function (elem) {
    return elem ? elem.nextSibling : null;
  };
  Gjs.nextElem = function (elem) {
    return elem ? elem.nextElementSibling : null;
  };
  Gjs.prev = function (elem) {
    return elem ? elem.previousSibling : null;
  };
  Gjs.prevElem = function (elem) {
    return elem ? elem.previousElementSibling : null;
  };
  // style set
  Gjs.css = function (elem, styleRules) {
    applyStyle(elem, styleRules);
    return this;
  };

  Gjs.class = function (elem, clsName) {
    if (elem) elem.className = clsName;
    return this;
  };

  // classList is read-only; assigning it threw in strict mode and did nothing otherwise.
  Gjs.classList = function (elem, classLs) {
    if (elem) elem.className = splitClass(classLs).join(' ');
    return this;
  };

  Gjs.addCls = function (elem, clsName) {
    if (!elem || !elem.classList) return this;
    var list = splitClass(clsName);
    for (var i = 0; i < list.length; i++) {
      elem.classList.add(list[i]);
    }
    return this;
  };

  Gjs.hasCls = function (elem, clsName) {
    if (!elem || !elem.classList || !clsName) return false;
    return elem.classList.contains(clsName);
  };

  Gjs.indexCls = function (elem, index) {
    return elem && elem.classList ? elem.classList.item(index) : null;
  };

  Gjs.delCls = function (elem, clsName) {
    if (!elem || !elem.classList) return this;
    var list = splitClass(clsName);
    for (var i = 0; i < list.length; i++) {
      elem.classList.remove(list[i]);
    }
    return this;
  };

  Gjs.toggleCls = function (elem, clsName, isAdd) {
    if (!elem || !elem.classList || !clsName) return this;
    if (arguments.length > 2) {
      elem.classList.toggle(clsName, !!isAdd);
    } else {
      elem.classList.toggle(clsName);
    }
    return this;
  };

  // regexp rules
  Gjs.regAll = {
    usernameReg: /^[a-zA-Z]\w{4,15}$/,
    nameReg: /^[a-zA-Z0-9_-]{4,16}$/,
    pwdReg: /^.*(?=.{6,})(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*? ]).*$/,
    zhEnReg: /^([\u4E00-\uFA29]|[\uE7C7-\uE7F3]|[a-zA-Z0-9])+$/,
    passwordReg: /\w{5,20}/,
    mobileReg: /^[+]{0,1}(\d){1,3}[ ]?([-]?((\d)|[ ]){1,12})+$/,
    postReg: /^[a-zA-Z0-9]{3,12}$/,
    idReg: /^(([1][1-5])|([2][1-3])|([3][1-7])|([4][1-6])|([5][0-4])|([6][1-5])|([7][1])|([8][1-2]))\d{4}(([1][9]\d{2})|([2]\d{3}))(([0][1-9])|([1][0-2]))(([0][1-9])|([1-2][0-9])|([3][0-1]))\d{3}[0-9xX]$/,
    posReg: /^\d+$/,
    emailReg: /^([A-Za-z0-9_\-\.])+\@([A-Za-z0-9_\-\.])+\.([A-Za-z]{2,4})$/,
    phoneReg: /^1[34578]\d{9}$/,
    uidReg: /^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/,
    urlReg: /^((https?|ftp|file):\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/,
    ipvFourReg: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,
    qqReg: /^[1-9][0-9]{4,10}$/,
    wxReg: /^[a-zA-Z]([-_a-zA-Z0-9]{5,19})+$/,
    carCodeReg: /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-Z0-9]{4}[A-Z0-9挂学警港澳]{1}$/,
    hanReg: /[\u4E00-\u9FA5]/,
    ipPortReg: /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\:([0-9]|[1-9]\d{1,3}|[1-5]\d{4}|6[0-5]{2}[0-3][0-5])$/
  };

  // regexp methods
  // The rules live on Gjs.regAll; the old bare identifiers threw ReferenceError.
  function testReg(regName, value) {
    if (typeof value !== 'string') return false;
    var reg = Gjs.regAll[regName];
    if (!reg) return false;
    reg.lastIndex = 0;
    return reg.test(value);
  }

  Gjs.checkName = function (name) {
    return testReg('zhEnReg', name);
  };
  Gjs.checkUserName = function (name) {
    return testReg('usernameReg', name);
  };
  Gjs.checkNameTwo = function (name) {
    return testReg('nameReg', name);
  };
  Gjs.checkpassWord = function (name) {
    return testReg('pwdReg', name);
  };
  // spelling alias, the historical name stays available
  Gjs.checkPassword = Gjs.checkpassWord;
  Gjs.checkMobile = function (name) {
    return testReg('mobileReg', name);
  };
  Gjs.checkPost = function (name) {
    return testReg('postReg', name);
  };
  Gjs.checkEmail = function (name) {
    return testReg('emailReg', name);
  };
  Gjs.checkCardId = function (name) {
    return testReg('idReg', name);
  };

  /**
   * bom set area
   * include daily/location/history/navigator. ect set
   * @param {*} name: string;
   * @param {*} val: string;
   * @param {*} tip: string;
   * @param {*} fn: function;
   * @param {*} time: number;
   */
  // daily methods
  Gjs.alert = function (val) {
    $w.alert(val);
  };
  Gjs.confirm = function (val) {
    return $w.confirm(val);
  };
  Gjs.prompt = function (val, tip) {
    return $w.prompt(val, tip);
  };
  // time methods
  // the timer id is returned so the caller can actually clear it
  Gjs.setTimeout = function (fn, time) {
    return $w.setTimeout(fn, time);
  };
  Gjs.clearTimeout = function (name) {
    $w.clearTimeout(name);
  };
  Gjs.setInterval = function (fn, time) {
    return $w.setInterval(fn, time);
  };
  Gjs.clearInterval = function (name) {
    $w.clearInterval(name);
  };
  // open new window
  Gjs.open = function (url, target, feature, replaceRecord) {
    return $w.open(url, target, feature, replaceRecord);
  };
  Gjs.close = function () {
    $w.close();
  };
  // location methods
  Gjs.reload = function () {
    $w.location.reload();
  };

  Gjs.toUrl = function (url) {
    $w.location.href = url;
  };
  // history methods
  Gjs.forward = function () {
    $w.history.forward();
  };

  Gjs.back = function () {
    $w.history.back();
  };

  Gjs.go = function (num) {
    $w.history.go(num);
  };
  // navigator methods
  // navigator
  Gjs.getnNavInfo = function () {
    var obj = {};
    var proArr = ['appName', 'appVersion', 'appCodeName', 'platform', 'userAgent'];
    var nav = $w.navigator || {};
    for (var i = 0; i < proArr.length; i++) {
      obj[proArr[i]] = nav[proArr[i]];
    }
    return obj;
  };
  Gjs.checkBrowserName = function () {
    var nav = $w.navigator || {};
    var ua = nav.userAgent || '';
    var appVersion = nav.appVersion || '';
    var browserName = '';
    if (ua.indexOf('Chrome') != -1) {
      browserName = 'Chrome';
    } else if (ua.indexOf('Trident') != -1 || appVersion.indexOf('MSIE') != -1) {
      browserName = 'IE';
    } else if (ua.indexOf('Firefox') != -1) {
      browserName = 'Firefox';
    } else if (ua.indexOf('Opera') != -1) {
      browserName = 'Opera';
    } else if (ua.indexOf('Safari') != -1) {
      browserName = 'Safari';
    }
    return browserName;
  };
  Gjs.checkIeVersion = function () {
    var nav = $w.navigator || {};
    var ie = (nav.userAgent || '').indexOf('Trident') == -1 ? false : true;
    var version = nav.appVersion || '';
    var versionName = '';
    if (ie && version) {
      if (version.indexOf('rv:11.0') != -1) {
        versionName = 'ie11';
      } else if (version.indexOf('MSIE 10.0') != -1) {
        versionName = 'ie10';
      } else if (version.indexOf('MSIE 9.0') != -1) {
        versionName = 'ie9';
      } else if (version.indexOf('MSIE 8.0') != -1) {
        versionName = 'ie8';
      } else if (version.indexOf('MSIE 7.0') != -1) {
        versionName = 'ie7';
      }
    }
    versionName = versionName == '' ? 'NoIe' : versionName;
    return versionName;
  };

  /**
   * title： js event methos
   * support ie,chrome, firefox, opera browser.
   */
  if ($d.addEventListener) {
    Gjs.addEvent = function (elem, eventType, handleEvent, isCapture) {
      if (!elem || !eventType || typeof handleEvent !== 'function') return;
      elem.addEventListener(eventType, handleEvent, isCapture);
    };
    Gjs.removeEvent = function (elem, eventType, handleEvent, isCapture) {
      if (!elem || !eventType || typeof handleEvent !== 'function') return;
      elem.removeEventListener(eventType, handleEvent, isCapture);
    };
    Gjs.stop = function (e) {
      e.stopPropagation();
    };
    Gjs.prevent = function (e) {
      e.preventDefault();
    };
  } else if ($d.attachEvent) {
    Gjs.addEvent = function (elem, eventType, handleEvent) {
      if (!elem || !eventType || typeof handleEvent !== 'function') return;
      elem.attachEvent('on' + eventType, handleEvent);
    };
    Gjs.removeEvent = function (elem, eventType, handleEvent) {
      if (!elem || !eventType || typeof handleEvent !== 'function') return;
      elem.detachEvent('on' + eventType, handleEvent);
    };
    Gjs.stop = function (e) {
      e.cancelBubble = true;
    };
    Gjs.prevent = function (e) {
      e.returnValue = false;
    };
  } else {
    Gjs.addEvent = function () {};
    Gjs.removeEvent = function () {};
    Gjs.stop = function () {};
    Gjs.prevent = function () {};
    Gjs.unevent = function (elemName, eventType, handleEvent) {
      if (elemName) elemName[eventType] = handleEvent;
    };
  }

  // storage
  function getStorage(type) {
    try {
      return $w[type] || null;
    } catch (error) {
      return null;
    }
  }

  Gjs.setLocal = function (name, value) {
    var store = getStorage('localStorage');
    if (!store) return false;
    try {
      store.setItem(name, encodeURIComponent(value === null || value === undefined ? '' : value));
      return true;
    } catch (error) {
      return false;
    }
  };

  Gjs.getLocal = function (name) {
    var store = getStorage('localStorage');
    if (!store) return null;
    var raw;
    try {
      raw = store.getItem(name);
    } catch (error) {
      return null;
    }
    if (raw === null || raw === undefined) return null;
    return decodeSafely(raw);
  };

  Gjs.rmLocal = function (name) {
    var store = getStorage('localStorage');
    if (!store) return false;
    try {
      store.removeItem(name);
      return true;
    } catch (error) {
      return false;
    }
  };

  Gjs.clearLocal = function () {
    var store = getStorage('localStorage');
    if (!store) return false;
    try {
      store.clear();
      return true;
    } catch (error) {
      return false;
    }
  };

  Gjs.setSession = function (name, value) {
    var store = getStorage('sessionStorage');
    if (!store) return false;
    try {
      store.setItem(name, encodeURIComponent(value === null || value === undefined ? '' : value));
      return true;
    } catch (error) {
      return false;
    }
  };

  Gjs.getSession = function (name) {
    var store = getStorage('sessionStorage');
    if (!store) return null;
    var raw;
    try {
      raw = store.getItem(name);
    } catch (error) {
      return null;
    }
    if (raw === null || raw === undefined) return null;
    return decodeSafely(raw);
  };

  Gjs.rmSession = function (name) {
    var store = getStorage('sessionStorage');
    if (!store) return false;
    try {
      store.removeItem(name);
      return true;
    } catch (error) {
      return false;
    }
  };

  Gjs.clearSession = function () {
    var store = getStorage('sessionStorage');
    if (!store) return false;
    try {
      store.clear();
      return true;
    } catch (error) {
      return false;
    }
  };

  /**
   * title: self work summary methods,
   * content:
   *  common methods
   *  ect.
   */
  //cookie set
  //set cookie
  // Invalid arguments return false: a setter that already reports failure through its return
  // value should not also write to the console.
  Gjs.setCookie = function (name, value, maxAge) {
    if (!name || typeof name !== 'string') return false;
    if (value === null || value === undefined) return false;
    if (maxAge !== undefined && typeof maxAge !== 'number') return false;
    var cookie = name + '=' + encodeURIComponent(value);
    if (typeof maxAge === 'number') cookie += ';max-age=' + maxAge;
    cookie += ';path=/';
    $d.cookie = cookie;
    return true;
  };

  //get cookie
  Gjs.getCookie = function (name, isAll) {
    var all = isAll === true;
    var raw = $d.cookie || '';
    var cookies = raw ? raw.split(';') : [];
    var allObj = {};
    for (var i = 0; i < cookies.length; i++) {
      var item = cookies[i].replace(/^\s+/, '');
      if (!item) continue;
      var pos = item.indexOf('=');
      if (pos === -1) continue;
      var key = item.slice(0, pos);
      // a cookie value may legitimately contain '='
      var val = decodeSafely(item.slice(pos + 1));
      if (all) {
        allObj[key] = val;
      } else if (key === name) {
        return val;
      }
    }
    return all ? allObj : '';
  };

  // 移除cookie
  Gjs.rmCookie = function (name) {
    if (!name || typeof name !== 'string') return false;
    $d.cookie = name + '=;max-age=0;path=/';
    return true;
  };

  //ajax methods
  function createXhr() {
    if (typeof XMLHttpRequest !== 'undefined') return new XMLHttpRequest();
    if (typeof ActiveXObject !== 'undefined') return new ActiveXObject('Microsoft.XMLHTTP');
    return null;
  }

  function parseResponseText(text) {
    if (text === '' || text === null || text === undefined) return { ok: true, value: null };
    try {
      return { ok: true, value: JSON.parse(text) };
    } catch (error) {
      return { ok: false, value: text };
    }
  }

  function transport(method, url, data, onDone) {
    var xhr = createXhr();
    if (!xhr) {
      onDone({ ok: false, code: 0, msg: 'no_xhr', info: '当前环境不支持 XMLHttpRequest!' });
      return;
    }
    try {
      xhr.open(method, url, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    } catch (error) {
      onDone({ ok: false, code: 0, msg: 'open_fail', info: '请求初始化失败!' });
      return;
    }
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (!(xhr.status >= 200 && xhr.status < 300)) {
        onDone({ ok: false, code: xhr.status, msg: 'get_fail', info: '获取失败!' });
        return;
      }
      var parsed = parseResponseText(xhr.responseText);
      if (!parsed.ok) {
        onDone({ ok: false, code: xhr.status, msg: 'parse_fail', info: '响应不是合法的 JSON!', raw: parsed.value });
        return;
      }
      onDone({ ok: true, code: xhr.status, msg: 'get_succ', info: '获取成功!', data: parsed.value });
    };
    xhr.onerror = function () {
      onDone({ ok: false, code: 0, msg: 'network_error', info: '网络请求失败!' });
    };
    try {
      xhr.send(data === null || data === undefined ? null : data);
    } catch (error) {
      onDone({ ok: false, code: 0, msg: 'send_fail', info: '请求发送失败!' });
    }
  }

  Gjs.http = function (type, url, data) {
    return new Promise(function (resolve, reject) {
      transport(type, url, data, function (res) {
        if (res.ok) {
          resolve({
            code: res.code,
            msg: 'get_succ',
            data: {
              info: '获取成功!',
              data: res.data
            }
          });
          return;
        }
        var payload = {
          code: res.code,
          msg: res.msg,
          data: {
            info: res.info
          }
        };
        if (res.raw !== undefined) payload.data.raw = res.raw;
        reject(payload);
      });
    });
  };

  Gjs.httpSimple = function (type, url, data, cb) {
    transport(type, url, data, function (res) {
      var result;
      if (res.ok) {
        result = {
          code: 200,
          msg: 'get_succ',
          data: res.data
        };
      } else {
        result = {
          code: 101,
          msg: res.msg,
          data: {
            info: res.info
          }
        };
        if (res.raw !== undefined) result.data.raw = res.raw;
      }
      if (typeof cb === 'function') cb(result);
      return result;
    });
  };

  // cross origin methods
  Gjs.jsonp = function (url, callback, onError) {
    if (!url || typeof url !== 'string') return null;
    var script = $d.createElement('script');
    var separator = url.indexOf('?') === -1 ? '?' : (/[?&]$/.test(url) ? '' : '&');
    script.src = url + separator + 'callback=' + callback;
    script.onerror = function () {
      if (typeof onError === 'function') onError(new Error('jsonp failed: ' + url));
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    $d.head.appendChild(script);
    return script;
  };

  // get time
  Gjs.getTime = function (elem) {
    if (!elem) return null;
    function render() {
      var now = new Date();
      elem.innerHTML = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
        ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    }
    render();
    return $w.setInterval(render, 1000);
  };

  // stop the clock started by getTime
  Gjs.clearTime = function (timer) {
    $w.clearInterval(timer);
  };

  // second to time formdata
  Gjs.secondToTime = function (time) {
    var total = Number(time);
    if (!isFinite(total) || total < 0) total = 0;
    total = Math.floor(total);
    var h = Math.floor(total / 3600);
    var m = Math.floor((total % 3600) / 60);
    var s = total % 60;
    return pad(h) + ':' + pad(m) + ':' + pad(s);
  };

  // fullscreen
  Gjs.fullScreen = function (elem, eventType) {
    if (!elem) return;
    Gjs.addEvent(elem, eventType || 'click', function () {
      var request = elem.requestFullscreen || elem.webkitRequestFullScreen ||
        elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
      if (request) request.call(elem);
    });
  };

  // get url args
  Gjs.getUrlArgs = function (url) {
    var args = {};
    var source = '';
    if (typeof url === 'string' && url) {
      source = url.indexOf('?') === -1 ? '' : url.slice(url.indexOf('?') + 1);
    } else {
      source = ($w.location && $w.location.search) || '';
      if (source.charAt(0) === '?') source = source.slice(1);
    }
    source = source.split('#')[0];
    if (!source) return args;
    var pairs = source.split('&');
    for (var i = 0; i < pairs.length; i++) {
      if (!pairs[i]) continue;
      var pos = pairs[i].indexOf('=');
      var argname = pos === -1 ? pairs[i] : pairs[i].slice(0, pos);
      var value = pos === -1 ? '' : pairs[i].slice(pos + 1);
      args[argname] = decodeSafely(value.replace(/\+/g, ' '));
    }
    return args;
  };

  // support dom rules
  Gjs.supportDom = function (name, version) {
    if ($d.implementation &&
      $d.implementation.hasFeature &&
      $d.implementation.hasFeature(name, version)
    ) {
      return true;
    }
    return false;
  };

  // is ie browser
  Gjs.isIE = function () {
    return !!$w.ActiveXObject || 'ActiveXObject' in $w;
  };

  // get device type, pc and wap
  Gjs.deviceType = function () {
    return 'ontouchstart' in $d ? 'wap' : 'pc';
  };

  // copy text
  Gjs.copyText = function (id) {
    var elem = typeof id === 'string' ? $d.getElementById(id) : id;
    if (!elem) return Promise.resolve(false);
    var text = elem.innerText !== undefined ? elem.innerText : (elem.textContent || '');
    if (!text) return Promise.resolve(false);
    var nav = $w.navigator || {};
    if (nav.clipboard && typeof nav.clipboard.writeText === 'function') {
      return nav.clipboard.writeText(text).then(function () {
        return true;
      }, function () {
        return legacyCopy(text);
      });
    }
    return Promise.resolve(legacyCopy(text));
  };

  function legacyCopy(text) {
    var input = $d.createElement('textarea');
    input.value = text;
    input.setAttribute('readonly', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    $d.body.appendChild(input);
    var copied = false;
    try {
      input.select();
      copied = typeof $d.execCommand === 'function' ? $d.execCommand('Copy') : false;
    } catch (error) {
      copied = false;
    }
    $d.body.removeChild(input);
    return copied;
  }

  // export excel file
  Gjs.exportExcel = function (id, fileName) {
    var elem = typeof id === 'string' ? $d.getElementById(id) : id;
    // a missing target is reported through the return value, not the console
    if (!elem) return false;
    var tableHtml = '<html><head><meta charset="UTF-8"></head><body>' + elem.innerHTML + '</body></html>';
    var excelBlob = new Blob(['\ufeff' + tableHtml], {
      type: 'application/vnd.ms-excel;charset=utf-8'
    });
    if ($w.navigator && typeof $w.navigator.msSaveOrOpenBlob === 'function') {
      $w.navigator.msSaveOrOpenBlob(excelBlob, fileName);
      return true;
    }
    var objectUrl = $w.URL.createObjectURL(excelBlob);
    var exportLink = $d.createElement('a');
    exportLink.href = objectUrl;
    exportLink.download = fileName;
    exportLink.style.display = 'none';
    $d.body.appendChild(exportLink);
    exportLink.click();
    $d.body.removeChild(exportLink);
    $w.setTimeout(function () {
      $w.URL.revokeObjectURL(objectUrl);
    }, 0);
    return true;
  };

  /*
  FileReader共有4种读取方法：
    1.readAsArrayBuffer(file)：将文件读取为ArrayBuffer。
    2.readAsBinaryString(file)：将文件读取为二进制字符串
    3.readAsDataURL(file)：将文件读取为Data URL
    4.readAsText(file, [encoding])：将文件读取为文本，encoding缺省值为'UTF-8'
  */
  Gjs.importFile = function (obj, targetId) {
    return new Promise(function (resolve, reject) {
      var input = obj && obj.files ? obj : null;
      if (!input || !input.files || !input.files.length) {
        reject(new Error('importFile expects a file input with one selected file'));
        return;
      }
      if (typeof XLSX === 'undefined') {
        reject(new Error('importFile requires the XLSX global (SheetJS)'));
        return;
      }
      var f = input.files[0];
      var reader = new $w.FileReader();
      reader.onload = function (e) {
        try {
          var data = e.target.result;
          var wb = XLSX.read(data, { type: 'binary' });
          //wb.SheetNames[0]是获取Sheets中第一个Sheet的名字
          //wb.Sheets[Sheet名]获取第一个Sheet的数据
          var rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
          var target = null;
          if (typeof targetId === 'string') {
            target = $d.getElementById(targetId);
          } else if (targetId && targetId.nodeType) {
            target = targetId;
          } else {
            target = $d.getElementById('demo');
          }
          if (target) target.innerHTML = JSON.stringify(rows);
          resolve(rows);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = function () {
        reject(new Error('file read failed'));
      };
      if (typeof reader.readAsBinaryString === 'function') {
        reader.readAsBinaryString(f);
      } else {
        reader.readAsArrayBuffer(f);
      }
    });
  };

  //文件流转BinaryString
  Gjs.fixdata = function (data) {
    var o = '',
      l = 0,
      w = 10240;
    for (; l < data.byteLength / w; ++l) o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w, l * w + w)));
    o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w)));
    return o;
  };

  // downloadFile
  Gjs.downloadFile = function (url, name) {
    if (typeof fetch !== 'function') {
      return Promise.reject(new Error('downloadFile requires fetch'));
    }
    var extName = String(url).split('/').pop() || '';
    extName = extName.split('?')[0].split('#')[0] || 'download';
    return fetch(url).then(function (response) {
      if (response && response.ok === false) {
        throw new Error('下载失败: HTTP ' + response.status);
      }
      return response.blob();
    }).then(function (blob) {
      var objectUrl = $w.URL.createObjectURL(blob);
      var donwBtn = $d.createElement('a');
      donwBtn.download = name || 'xqgjs-' + extName;
      donwBtn.href = objectUrl;
      donwBtn.style.display = 'none';
      $d.body.appendChild(donwBtn);
      donwBtn.click();
      $d.body.removeChild(donwBtn);
      // revokeObjectURL needs the URL string, passing the Blob leaked the URL as well
      $w.setTimeout(function () {
        $w.URL.revokeObjectURL(objectUrl);
      }, 0);
      return objectUrl;
    });
  };

  /**
   *drag
   * @param {*} elem: element
   */
  function Drag(elem) {
    if (!elem) throw new Error('Drag requires an element');
    this.elem = elem;
    this.dragging = false;
    this.startX = 0;
    this.startY = 0;
    this.winWidth = $d.documentElement.clientWidth;
    this.winHeight = $d.documentElement.clientHeight;

    var _this = this;
    // a per-instance listener, so a second Drag instance no longer overwrites the first
    // one and an existing window.onresize handler survives
    this._onResize = function () {
      _this.winWidth = $d.documentElement.clientWidth;
      _this.winHeight = $d.documentElement.clientHeight;
    };
    this._onMove = function (e) {
      if (!_this.dragging) return;
      e = e || $w.event;
      _this.move(_this, e.clientX - _this.startX, e.clientY - _this.startY);
    };
    this._onUp = function () {
      _this.cancel();
    };
    this._onDown = function (e) {
      e = e || $w.event;
      _this.dragging = true;
      _this.startX = e.clientX - _this.elem.offsetLeft;
      _this.startY = e.clientY - _this.elem.offsetTop;
      Gjs.addEvent($d, 'mousemove', _this._onMove, false);
      Gjs.addEvent($d, 'mouseup', _this._onUp, false);
    };

    Gjs.addEvent($w, 'resize', this._onResize, false);
    Gjs.addEvent(elem, 'mousedown', this._onDown, false);
  }
  // move element
  // accepts both move(l, t) and the historical move(dragInstance, l, t)
  Drag.prototype.move = function (_this, l, t) {
    var self = this;
    var left;
    var top;
    if (_this && typeof _this === 'object' && _this.elem) {
      self = _this;
      left = l;
      top = t;
    } else {
      left = _this;
      top = l;
    }
    var elem = self.elem;
    if (!elem) return;
    if (typeof left !== 'number') left = elem.offsetLeft;
    if (typeof top !== 'number') top = elem.offsetTop;
    if ((left + elem.offsetWidth) > self.winWidth) {
      left = self.winWidth - elem.offsetWidth;
    }
    if (left < 0) {
      left = 0;
    }
    if ((top + elem.offsetHeight) > self.winHeight) {
      top = self.winHeight - elem.offsetHeight;
    }
    if (top < 0) {
      top = 0;
    }
    elem.style.left = left + 'px';
    elem.style.top = top + 'px';
  };
  // cancel set
  Drag.prototype.cancel = function () {
    this.dragging = false;
    Gjs.removeEvent($d, 'mousemove', this._onMove, false);
    Gjs.removeEvent($d, 'mouseup', this._onUp, false);
  };
  // release the listeners this instance owns
  Drag.prototype.destroy = function () {
    this.cancel();
    Gjs.removeEvent($w, 'resize', this._onResize, false);
    if (this.elem) Gjs.removeEvent(this.elem, 'mousedown', this._onDown, false);
    this.elem = null;
  };

  /**
   *tab toggle
   *
   * @param {*} navs: click element
   * @param {*} contents: toggle element
   * @param {*} clsName: className
   * @param {*} eventType: event name
   */
  function Tab(navs, contents, clsName, eventType) {
    this.navs = navs || [];
    this.contents = contents || [];
    this.clsName = clsName || 'active';
    this.eventType = eventType || 'click';
    this.len = this.navs.length;
    this._handlers = [];
    var that = this;
    for (var i = 0; i < this.len; i++) {
      (function (index) {
        var handler = function () {
          for (var j = 0; j < that.len; j++) {
            if (that.navs[j] && that.navs[j].classList) that.navs[j].classList.remove(that.clsName);
            if (that.contents[j] && that.contents[j].classList) that.contents[j].classList.remove(that.clsName);
          }
          // toggling the class keeps every unrelated class on the element alive
          if (this.classList) this.classList.add(that.clsName);
          if (that.contents[index] && that.contents[index].classList) {
            that.contents[index].classList.add(that.clsName);
          }
        };
        that._handlers.push({ el: that.navs[index], type: that.eventType, fn: handler });
        Gjs.addEvent(that.navs[index], that.eventType, handler, false);
      })(i);
    }
  }

  Tab.prototype.destroy = function () {
    for (var i = 0; i < this._handlers.length; i++) {
      var item = this._handlers[i];
      Gjs.removeEvent(item.el, item.type, item.fn, false);
    }
    this._handlers = [];
  };

  /**
   *Carousels banner toggle
   * @param {*} {
   *     contents,
   *     contentLis,
   *     arrowLeft,
   *     arrowRight,
   *     btns,
   *     active,
   *     dealy,
   *     isAuto,
   *     type,
   *   }
   */
  function Carousels(
    contents,
    contentLis,
    arrowLeft,
    arrowRight,
    btns,
    active,
    dealy,
    isAuto,
    type
  ) {
    this.contents = contents;
    this.contentLis = contentLis || [];
    this.imgWidth = this.contentLis[0] ? this.contentLis[0].clientWidth : 0;
    this.imgHeight = this.contentLis[0] ? this.contentLis[0].clientHeight : 0;
    this.len = this.contentLis.length;
    this.arrowLeft = arrowLeft || null;
    this.arrowRight = arrowRight || null;
    this.btns = btns || null;
    this.active = active || 'active';
    this.type = type || 'left';
    this.num = 0;
    this.dealy = dealy || 3000;
    // `isAuto || true` made false impossible; an omitted flag still means auto
    this.isAuto = isAuto === undefined ? true : !!isAuto;
    this.timer = null;
    this._handlers = [];
    this.init();
  }

  Carousels.prototype.init = function () {
    this.arrowClick();
    this.toggleBtns();
    this.contentsOut();
    if (this.isAuto) {
      this.autoPlay();
    } else {
      this.stop();
    }
  };

  Carousels.prototype.arrowClick = function () {
    var that = this;
    function step(delta) {
      that.stop();
      var next = that.num + delta;
      if (next < 0) next = that.len - 1;
      if (next > that.len - 1) next = 0;
      that.num = next;
      that.move();
    }
    if (this.arrowLeft) {
      var leftHandler = function () {
        step(-1);
      };
      this._handlers.push({ el: this.arrowLeft, type: 'click', fn: leftHandler });
      Gjs.addEvent(this.arrowLeft, 'click', leftHandler, false);
    }
    if (this.arrowRight) {
      var rightHandler = function () {
        step(1);
      };
      this._handlers.push({ el: this.arrowRight, type: 'click', fn: rightHandler });
      Gjs.addEvent(this.arrowRight, 'click', rightHandler, false);
    }
  };

  Carousels.prototype.toggleBtns = function () {
    var that = this;
    if (!this.btns) return;
    for (var i = 0; i < this.len; i++) {
      (function (index) {
        if (!that.btns[index]) return;
        var handler = function () {
          that.stop();
          that.num = index;
          that.move();
        };
        that._handlers.push({ el: that.btns[index], type: 'mouseover', fn: handler });
        Gjs.addEvent(that.btns[index], 'mouseover', handler, false);
      })(i);
    }
  };

  // takes no argument: it reads this.num, the old call passed a number that was ignored
  Carousels.prototype.toggleBtnsStyle = function () {
    if (!this.btns) return;
    for (var j = 0; j < this.len; j++) {
      if (this.btns[j] && this.btns[j].classList) this.btns[j].classList.remove(this.active);
    }
    if (this.btns[this.num] && this.btns[this.num].classList) {
      this.btns[this.num].classList.add(this.active);
    }
  };

  Carousels.prototype.move = function () {
    if (!this.contents) return;
    if (this.type == 'left') {
      this.contents.style.left = (-this.imgWidth * this.num) + 'px';
    } else {
      this.contents.style.top = (-this.imgHeight * this.num) + 'px';
    }
    this.toggleBtnsStyle();
  };

  Carousels.prototype.autoPlay = function () {
    var that = this;
    if (!this.isAuto || this.timer !== null) return;
    this.timer = $w.setInterval(function () {
      var next = that.num + 1;
      that.num = next > that.len - 1 ? 0 : next;
      that.move();
    }, this.dealy);
  };

  Carousels.prototype.stop = function () {
    if (this.timer !== null) {
      $w.clearInterval(this.timer);
      this.timer = null;
    }
  };

  Carousels.prototype.contentsOut = function () {
    if (!this.contents) return;
    var that = this;
    var over = function () {
      that.stop();
    };
    var out = function () {
      that.autoPlay();
    };
    Gjs.addEvent(this.contents, 'mouseover', over, true);
    Gjs.addEvent(this.contents, 'mouseout', out, true);
    this._handlers.push({ el: this.contents, type: 'mouseover', fn: over, capture: true });
    this._handlers.push({ el: this.contents, type: 'mouseout', fn: out, capture: true });
  };

  Carousels.prototype.destroy = function () {
    this.stop();
    for (var i = 0; i < this._handlers.length; i++) {
      var item = this._handlers[i];
      Gjs.removeEvent(item.el, item.type, item.fn, !!item.capture);
    }
    this._handlers = [];
    this.contents = null;
  };

  Gjs.prototype.getIeVersion = function () {
    var nav = $w.navigator || {};
    var ie = (nav.userAgent || '').indexOf('Trident') == -1 ? false : true;
    var version = nav.appVersion || '';
    var versionName = '';
    if (ie && version) {
      if (version.indexOf('rv:11.0') != -1) {
        return versionName = 'ie11';
      } else if (version.indexOf('MSIE 10.0') != -1) {
        return versionName = 'ie10';
      } else if (version.indexOf('MSIE 9.0') != -1) {
        return versionName = 'ie9';
      } else if (version.indexOf('MSIE 8.0') != -1) {
        return versionName = 'ie8';
      } else if (version.indexOf('MSIE 7.0') != -1) {
        return versionName = 'ie7';
      }
    }
    return -1;
  };

  Gjs.prototype.checkBrowserName = function () {
    return Gjs.checkBrowserName();
  };

  /**
   * author: gitguanqi
   * version: 0.0.1
   * date: 2021-12-2
   * name: record audio and video
   */
  function xqRecord() {
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.media = null;
  }

  xqRecord.prototype.createMedia = function (type, option, selector) {
    var self = this;
    var nav = $w.navigator || {};
    if (!nav.mediaDevices || typeof nav.mediaDevices.getUserMedia !== 'function') {
      return Promise.reject(new Error('getUserMedia is not supported'));
    }
    return nav.mediaDevices.getUserMedia(option).then(function (stream) {
      self.stream = stream;
      self.media = $d.querySelector(selector || type);
      if (self.media && type === 'video') {
        self.media.srcObject = stream;
      }

      var options = {
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000
      };
      self.mediaRecorder = new $w.MediaRecorder(stream, options);

      self.mediaRecorder.ondataavailable = function (e) {
        self.chunks.push(e.data);
      };

      self.mediaRecorder.start();

      self.mediaRecorder.onstop = function () {
        var blob = new Blob(self.chunks, { type: self.mediaRecorder ? self.mediaRecorder.mimeType : 'video/webm' });
        var url = $w.URL.createObjectURL(blob);
        if (self.media) {
          if (type === 'video') self.media.srcObject = null;
          self.media.src = url;
        }
        self.stopSet(type);
      };
      return self.mediaRecorder;
    }).catch(function (error) {
      console.log('getUserMedia： ', error);
      return null;
    });
  };

  xqRecord.prototype.start = function (type, selector) {
    var option =
      type == 'audio'
        ? { audio: true }
        : { video: true };
    return this.createMedia(type, option, selector);
  };

  xqRecord.prototype.stop = function () {
    if (!this.mediaRecorder) return;
    this.mediaRecorder.stop();
  };

  xqRecord.prototype.stopSet = function (type) {
    if (this.stream) {
      var tracks = type == 'audio' ? this.stream.getAudioTracks() : this.stream.getVideoTracks();
      if (tracks && tracks[0]) tracks[0].stop();
    }
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    // the old assignment named a misspelled variable: it threw in strict mode and left media alive
    this.media = null;
  };

  // register to gjs extend object
  Gjs.extend({
    Drag: Drag,
    Tab: Tab,
    Carousels: Carousels,
    xqRecord: xqRecord
  });

  // welcome statement.
  console.info('Hi,You. Welcome to Gjs World! If you want to get more content, please visited our site: https://github.com/gitguanqi/xqgjs !');

  return Gjs;
});
