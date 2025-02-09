(function (root, factory) {
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    define(factory());
  } else if (typeof define === 'function' && define.cmd) {
    define(function (require, exports, module) {
      module.exports = factory();
    });
  } else {
    window.gjs = $g = factory();
  }
})(this, function factory() {
  // common var
  var $w = window;
  var $d = document;

  // defined Gjs Object
  var Gjs = {};

  // gjs constructor
  Gjs = function (selector) {
    return new Gjs.fn.init(selector);
  }

  // gjs info
  Gjs.info = {
    name: 'gjs',
    date: '2022-09-29',
    version: 'v1.0.2'
  }

  // Gjs fn instanceof
  Gjs.fn = Gjs.prototype = {
    constructor: Gjs,
    init: function (selector) {
      var elem, selector;
      elem = $d.querySelector(selector);
      this[0] = elem;
      return this;
    },
    // attribute set
    setAttr: function (name, val) {
      this[0].setAttribute(name, val);
      return this;
    },
    // get attribute
    getAttr: function (name) {
      return this[0].getAttribute(name);
    },
    // delete attribute
    delAttr: function (name) {
      this[0].removeAttribute(name);
      return this;
    },
    // add content
    text: function (val) {
      this[0].innerText = val;
      return this;
    },
    html: function (val) {
      this[0].innerHTML = val;
      return this;
    },
    css: function (styleRules) {
      if (typeof styleRules != 'object') {
        console.error('TypeError: styleRules not a object!');
      }
      for (var key in styleRules) {
        this[0].style[key] = styleRules[key];
        return this;
      }
    }
  }

  // bind to prototype
  Gjs.fn.init.prototype = Gjs.fn;

  // extend
  Gjs.extend = Gjs.fn.extend = function (options) {
    var target = this;
    var copy;
    for (name in options) {
      copy = options[name];
      target[name] = copy;
    }
    return target;
  }

  // exten methods
  // gjs instanceof methods
  Gjs.fn.extend();

  // self methods
  Gjs.extend();

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
  }
  Gjs.cText = function (name) {
    return $d.createTextNode(name);
  }
  // get element
  Gjs.gId = function (name) {
    return $d.getElementById(name);
  }
  Gjs.gCls = function (name) {
    return $d.getElementsByClassName(name);
  }
  Gjs.gTag = function (name) {
    return $d.getElementsByTagName(name);
  }
  Gjs.gName = function (name) {
    return $d.getElementsByName(name);
  }
  Gjs.dom = function (name) {
    return $d.querySelector(name);
  }
  Gjs.domAll = function (name) {
    return $d.querySelectorAll(name);
  }
  // add element
  Gjs.addElem = function (parent, child) {
    parent.appendChild(child);
    return this;
  }
  // replace element
  Gjs.replaceElem = function (parent, newElem, oldElem) {
    console.log(parent, newElem, oldElem);
    parent.replaceChild(newElem, oldElem);
    return this;
  }
  // insert element
  Gjs.insertElem = function (parent, newElem, refElem) {
    parent.insertBefore(newElem, refElem);
    return this;
  }
  // clone element
  // true eleme and content; false: only elem
  Gjs.cloneElem = function (elem, isDeep) {
    return elem.cloneNode(isDeep);
  }
  // delete element
  Gjs.delElem = function (parent, child) {
    parent.removeChild(child);
    return this;
  }
  // edit content
  Gjs.text = function (elem, val) {
      elem.innerText = val;
      return this;
    },
    Gjs.html = function (elem, val) {
      elem.innerHTML = val;
      return this;
    }
  // attribute set
  // set attribute
  Gjs.setAttr = function (elem, name, val) {
    elem.setAttribute(name, val);
  }
  // get attribute
  Gjs.getAttr = function (elem, name) {
    return elem.getAttribute(name);
  }
  // delete attribute
  Gjs.delAttr = function (elem, name) {
    elem.removeAttribute(name);
  }

  // element node set
  Gjs.parent = function (elem) {
    return elem.parentNode;
  }
  Gjs.parentElem = function (elem) {
    return elem.parentElement;
  }
  Gjs.child = function (elem) {
    return elem.childNodes;
  }
  Gjs.childElem = function (elem) {
    return elem.children;
  }
  Gjs.first = function (elem) {
    return elem.firstChild;
  }
  Gjs.firstElem = function (elem) {
    return elem.firstElementChild;
  }
  Gjs.last = function (elem) {
    return elem.lastChild;
  }
  Gjs.lastElem = function (elem) {
    return elem.lastElementChild;
  }
  Gjs.next = function (elem) {
    return elem.nextSibling;
  }
  Gjs.nextElem = function (elem) {
    return elem.nextElementSibling;
  }
  Gjs.prev = function (elem) {
    return elem.previousSibling;
  }
  Gjs.prevElem = function (elem) {
    return elem.previousElementSibling;
  }
  // style set
  Gjs.css = function (elem, styleRules) {
    if (typeof styleRules != 'object') {
      console.error('TypeError: styleRules not a object!');
    }
    for (var key in styleRules) {
      elem.style[key] = styleRules[key];
    }
  }

  Gjs.class = function (elem, clsName) {
    elem.className = clsName;
  }

  Gjs.classList = function (elem, classLs) {
    elem.classList = classLs;
  }

  Gjs.addCls = function (elem, clsName) {
    elem.classList.add(clsName);
  }

  Gjs.hasCls = function (elem, clsName) {
    return elem.classList.contains(clsName);
  }

  Gjs.indexCls = function (elem, index) {
    return elem.classList.item(index);
  }

  Gjs.delCls = function (elem, clsName) {
    elem.classList.remove(clsName);
  }

  Gjs.toggleCls = function (elem, clsName, isAdd) {
    elem.classList.toggle(clsName, isAdd);
  }

  // regexp rules
  Gjs.regAll = {
    usernameReg: /^[a-zA-z]\w{4,15}$/,
    nameReg: /^[a-zA-Z0-9_-]{4,16}$/,
    pwdReg: /^.*(?=.{6,})(?=.*\d)(?=.*[A-Z])(?=.*[a-z])(?=.*[!@#$%^&*? ]).*$/,
    zhEnReg: /^([\u4E00-\uFA29]|[\uE7C7-\uE7F3]|[a-zA-Z0-9])*$/,
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
  }

  // regexp methods
  Gjs.checkName = function (name) {
    return zhEnReg.test(name);
  }
  Gjs.checkUserName = function (name) {
    return usernameReg.test(name);
  }
  Gjs.checkNameTwo = function (name) {
    return nameReg.test(name);
  }
  Gjs.checkpassWord = function (name) {
    return pwdReg.test(name);
  }
  Gjs.checkMobile = function (name) {
    return mobileReg.test(name);
  }
  Gjs.checkPost = function (name) {
    return postReg.test(name);
  }
  Gjs.checkEmail = function (name) {
    return emailReg.test(name);
  }
  Gjs.checkCardId = function (name) {
    return idReg.test(name);
  }

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
  }
  Gjs.confirm = function (val) {
    return $w.confirm(val);
  }
  Gjs.prompt = function (val, tip) {
    return $w.prompt(val, tip);
  }
  // time methods
  Gjs.setTimeout = function (fn, time) {
    $w.setTimeout(fn, time);
  }
  Gjs.clearTimeout = function (name) {
    $w.clearTimeout(name);
  }
  Gjs.setInterval = function (fn, time) {
    $w.setInterval(fn, time);
  }
  Gjs.clearInterval = function (name) {
    $w.clearInterval(name);
  }
  // open new window
  Gjs.open = function (url, target, feature, replaceRecord) {
    $w.open(url, target, feature, replaceRecord);
  }
  Gjs.close = function () {
    $w.close();
  }
  // location methods
  Gjs.reload = function () {
    $w.location.reload();
  }

  Gjs.toUrl = function (url) {
    $w.location.href = url;
  }
  // history methods
  Gjs.forward = function () {
    history.forward();
  }

  Gjs.back = function () {
    history.back();
  }

  Gjs.go = function (num) {
    history.go(num);
  }
  // navigator methods
  // navigator
  Gjs.getnNavInfo = function () {
    var obj = {};
    var proArr = ['appName', 'appVersion', 'appCodeName', 'platform', 'userAgent'];
    for (var key in navigator) {
      for (var i = 0; i < proArr.length; i++) {
        if (key == proArr[i]) {
          obj[key] = navigator[key];
        }
      }
    }
    return obj;
  }
  Gjs.checkBrowserName = function () {
    let browserName = '';
    if (navigator.userAgent.indexOf('Chrome') != -1) {
      browserName = 'Chrome';
    } else if (navigator.userAgent.indexOf('Trident') != -1 || navigator.appVersion.indexOf('MSIE') != -1) {
      browserName = 'IE';
    } else if (navigator.userAgent.indexOf('Firefox') != -1) {
      browserName = 'Firefox';
    } else if (navigator.userAgent.indexOf('Opera') != -1) {
      browserName = 'Opera';
    } else if (navigator.userAgent.indexOf('Safari') != -1) {
      browserName = 'Safari';
    }
    return browserName;
  }
  Gjs.checkIeVersion = function () {
    var ie = navigator.userAgent.indexOf('Trident') == -1 ? false : true;
    var version = navigator.appVersion;
    var versionName = '';
    if (ie && version) {
      if (version.indexOf('rv:11.0') != -1) {
        versionName = 'ie11'
      } else if (version.indexOf('MSIE 10.0') != -1) {
        versionName = 'ie10'
      } else if (version.indexOf('MSIE 9.0') != -1) {
        versionName = 'ie9'
      } else if (version.indexOf('MSIE 8.0') != -1) {
        versionName = 'ie8'
      } else if (version.indexOf('MSIE 7.0') != -1) {
        versionName = 'ie7'
      }
    }
    versionName = versionName == '' ? 'NoIe' : versionName;
    return versionName;
  }

  /** 
   * title： js event methos
   * support ie,chrome, firefox, opera browser.
   */
  if (document.addEventListener) {
    Gjs.addEvent = function (elem, eventType, handleEvent, isCapture) {
      elem.addEventListener(eventType, handleEvent, isCapture);
    }
    Gjs.removeEvent = function (elem, eventType, handleEvent, isCapture) {
      elem.removeEventListener(eventType, handleEvent, isCapture);
    }
    Gjs.stop = function (e) {
      e.stopPropagation();
    }
    Gjs.prevent = function (e) {
      e.preventDefault();
    }
  } else if (document.attachEvent) {
    Gjs.addEvent = function (elem, eventType, handleEvent) {
      elem.attachEvent('on' + eventType, handleEvent);
    }
    Gjs.removeEvent = function (elem, eventType, handleEvent) {
      elem.detachEvent('on' + eventType, handleEvent);
    }
    Gjs.stop = function (e) {
      e.cancelBubble = true;
    }
    Gjs.prevent = function (e) {
      e.returnValue = false;
    }
  } else {
    Gjs.unevent = function (elemName, eventType, handleEvent) {
      elemName.eventType = handleEvent;
    }
  }

  // storage
  Gjs.setLocal = function (name, value) {
    localStorage.setItem(name, encodeURIComponent(value));
  }

  Gjs.getLocal = function (name) {
    return encodeURIComponent(localStorage.getItem(name));
  }

  Gjs.rmLocal = function (name) {
    localStorage.removeItem(name);
  }

  Gjs.clearLocal = function () {
    localStorage.clear();
  }

  Gjs.setSession = function (name, value) {
    sessionStorage.setItem(name, encodeURIComponent(value));
  }

  Gjs.getSession = function (name) {
    return encodeURIComponent(sessionStorage.getItem(name));
  }

  Gjs.rmSession = function (name) {
    sessionStorage.removeItem(name);
  }

  Gjs.clearSession = function () {
    sessionStorage.clear();
  }

  /** 
   * title: self work summary methods,
   * content:
   *  common methods
   *  ect.
   */
  // cookie set
  //cookie set
  //set cookie
  Gjs.setCookie = function (name, value, maxAge) {

    if (!name) {
      console.error('Error: name not an null!');
    }
    if (!value) {
      console.error('Error: value not an null!');
    }
    if (!(maxAge && typeof maxAge == 'number')) {
      console.error('Error: maxAge not an number!');
    }

    document.cookie = name + '=' + encodeURIComponent(value) + ';max-age=' + maxAge;
  }

  //get cookie
  Gjs.getCookie = function (name, isAll) {

    if (!name && typeof name != 'string') {
      console.error('Error: name not an null!');
    }

    if (!isAll && typeof isAll != 'boolean') {
      console.error('Error: isAll not an boolean!');
    }

    var isAll = isAll || false;
    var cookie = document.cookie;
    var cookies = cookie.split(';');
    var value = '';
    var allObj = {};
    for (var i = 0; i < cookies.length; i++) {
      var vals = cookies[i].split('=');
      var allKey = vals[0].trim();
      var allVal = decodeURIComponent(vals[1]);
      if (allKey == '' && allVal == '') {
        continue;
      } else {
        if (isAll) {
          allObj[allKey] = allVal;
        } else {
          if (name == allKey) {
            value = allVal;
          }
        }
      }
    }

    var res = isAll ? allObj : value;

    return res;
  }

  // 移除cookie
  Gjs.rmCookie = function (name) {
    if (!name && typeof name != 'string') {
      console.error('Error: name not an null!');
    }

    var cookie = document.cookie;
    var cookies = cookie.split(';');
    var res;
    for (var i = 0; i < cookies.length; i++) {
      var vals = cookies[i].split('=');
      var allKey = vals[0].trim();
      if (name == allKey) {
        res = true;
      }
    }
    if (!res) {
      console.error('Error:' + name + ' not found!');
    }

    document.cookie = name + '=' + '' + ';max-age=0';
  }

  //ajax methods
  Gjs.http = function (type, url, data) {
    //new ajax
    var data = data || null;
    let ajax = new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest() || new ActiveXObject('Microsoft.XMLHTTP');
      //open request
      xhr.open(type, url, true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            //success
            let result = {
              code: this.status,
              msg: 'get_succ',
              data: {
                info: '获取成功!',
                data: JSON.parse(this.response),
              }
            }
            resolve(result);
          } else {
            // failed
            let result = {
              code: this.status,
              msg: 'get_fail',
              data: {
                info: '获取失败!',
              }
            }
            reject(result);
          }
        }
      }
      xhr.send(data);
    })
    return ajax;
  }

  Gjs.httpSimple = function (type, url, data, cb) {
    //new ajax
    var data = data || null;
    var xhr = new XMLHttpRequest() || new ActiveXObject('Microsoft.XMLHTTP');
    let result;
    //open request
    xhr.open(type, url, true);
    xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    xhr.onreadystatechange = function () {
      if (xhr.readyState === 4) {
        if (xhr.status === 200) {
          //success
          result = {
            code: 200,
            msg: 'get_succ',
            data: JSON.parse(this.response),
          }
          cb(result);
        } else {
          // failed
          result = {
            code: 101,
            msg: 'get_fail',
            data: {
              info: '获取失败!',
            }
          }
          cb(result);
        }
      }
    }
    xhr.send(data);
  }

  // cross origin methods
  Gjs.jsonp = function (url, callback) {
    let script = document.createElement('script');
    script.src = url + '&callback=' + callback;
    document.head.appendChild(script);
  }

  // get time
  Gjs.getTime = function (elem) {
    setInterval(function () {
      var now = new Date();
      var year = now.getFullYear();
      var month = now.getMonth() + 1;
      var day = now.getDay();
      var hour = now.getHours();
      var minute = now.getMinutes();
      var second = now.getSeconds();
      month = month >= 10 ? month : '0' + month;
      day = day >= 10 ? day : '0' + day;
      hour = hour >= 10 ? hour : '0' + hour;
      minute = minute >= 10 ? minute : '0' + minute;
      second = second >= 10 ? second : '0' + second;
      elem.innerHTML = year + '-' + month + '-' + day + ' ' + hour + ':' + minute + ':' + second;
    }, 1000);
  }

  // second to time formdata
  Gjs.secondToTime = function (time) {
    let s = 0;
    let m = 0;
    let h = 0;
    let sNum = time % 60;
    let res = '';
    if (time < 3600) {
      s = sNum;
      m = parseInt(time / 60);
      h = 0;
    } else {
      let mNum = time % 3600;
      if (mNum % 60 < 60) {
        s = mNum % 60;
        m = parseInt(mNum / 60)
      }
      m = parseInt(mNum / 60);
      h = parseInt(time / 3600);
    }
    s = s > 10 ? parseInt(s) : '0' + parseInt(s);
    m = m > 10 ? m : '0' + m;
    h = h > 10 ? h : '0' + h;
    res = h + ':' + m + ':' + s;
    return res;
  }

  // fullscreen
  Gjs.fullScreen = function (elem, eventType) {
    this.addEvent(elem, eventType, function () {
      elem.webkitRequestFullScreen();
    })
  }

  // get url args
  Gjs.getUrlArgs = function (url) {
    let args = {};
    let parseUrl = url || window.location.search;
    let query = url ? url.split('?')[1] : window.location.search.split('?')[1];
    let pairs = query.split('&');
    for (var i = 0; i < pairs.length; i++) {
      var pos = pairs[i].indexOf('=');
      if (pos == -1) {
        continue;
      }
      var argname = pairs[i].substring(0, pos);
      var value = pairs[i].substring(pos + 1);
      value = decodeURIComponent(value);
      args[argname] = value;
    }
    return args;
  }

  // support dom rules
  Gjs.supportDom = function (name, version) {
    if (document.implementation &&
      document.implementation.hasFeature &&
      document.implementation.hasFeature(name, version)
    ) {
      return true;
    } else {
      return false;
    }
  }

  // is ie browser
  Gjs.isIE = function () {
    if (!!window.ActiveXObject || "ActiveXObject" in window) {
      return true;
    } else {
      return false;
    }
  }

  // get device type, pc and wap
  Gjs.deviceType = function () {
    return 'ontouchstart' in document ? 'wap' : 'pc';
  }

  // copy text
  Gjs.copyText = function (id) {
    let txt = this.gId(id).innerText;
    let oIpt = this.cElem('input');
    oIpt.value = txt;
    this.addElem(document.body, oIpt);
    oIpt.select(); // 选择对象
    document.execCommand("Copy"); // 执行浏览器复制命令
    this.delElem(document.body, oIpt);
    alert('复制成功！');
    return true;
  }

  // export excel file
  Gjs.exportExcel = function (id, fileName) {
    var lHtml = this.gId(id).innerHTML;
    var tableHtml = '<html><head><meta charset="UTF-8"></head><body>';
    tableHtml += lHtml;
    tableHtml += '</body></html>';
    var excelBlob = new Blob([tableHtml], {
      type: 'application/vnd.ms-excel'
    });
    if (this.isIE()) {
      window.navigator.msSaveOrOpenBlob(excelBlob, fileName);
    } else {
      var exportLink = this.cElem('a');
      exportLink.href = URL.createObjectURL(excelBlob);
      exportLink.download = fileName;
      this.addElem(document.body, exportLink);
      exportLink.click();
      this.delElem(document.body, exportLink);
    }
  }

  /*
  FileReader共有4种读取方法：
    1.readAsArrayBuffer(file)：将文件读取为ArrayBuffer。
    2.readAsBinaryString(file)：将文件读取为二进制字符串
    3.readAsDataURL(file)：将文件读取为Data URL
    4.readAsText(file, [encoding])：将文件读取为文本，encoding缺省值为'UTF-8'
  */
  Gjs.importFile = function (obj) {//导入
      var wb;//读取完成的数据
      var rABS = false; //是否将文件读取为二进制字符串
      if(!obj.files) {
          return;
      }
      var f = obj.files[0];
      var reader = new FileReader();
      reader.onload = function(e) {
          var data = e.target.result;
          if(rABS) {
              wb = XLSX.read(btoa(this.fixdata(data)), {//手动转化
                  type: 'base64'
              });
          } else {
              wb = XLSX.read(data, {
                  type: 'binary'
              });
          }
          //wb.SheetNames[0]是获取Sheets中第一个Sheet的名字
          //wb.Sheets[Sheet名]获取第一个Sheet的数据
          document.getElementById("demo").innerHTML= JSON.stringify( XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) );
      };
      if(rABS) {
          reader.readAsArrayBuffer(f);
      } else {
          reader.readAsBinaryString(f);
      }
  }

  //文件流转BinaryString
  Gjs.fixdata = function (data) { 
      var o = "",
          l = 0,
          w = 10240;
      for(; l < data.byteLength / w; ++l) o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w, l * w + w)));
      o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w)));
      return o;
  }

  // downloadFile
  Gjs.downloadFile = async function (url, name) {
    let extName = url.split('/');
    extName = extName[extName.length-1];
    extName = extName.indexOf('?') > -1 ? extName.split('?')[0] : extName;
    let data = await fetch(url);
    let blob = await data.blob();
    let donwBtn = document.createElement('a');
    donwBtn.download = name || 'xqgjs-'+extName;
    donwBtn.href = URL.createObjectURL(blob);
    document.body.appendChild(donwBtn);
    donwBtn.click();
    URL.revokeObjectURL(blob);
    document.body.removeChild(donwBtn);
  }

  /**
   *drag
   * @param {*} elem: element
   */
  function Drag(elem) {
    this.elem = elem;
    var _this = this;
    _this.winWidth = document.documentElement.clientWidth;
    _this.winHeight = document.documentElement.clientHeight;
    window.onresize = function () {
      _this.winWidth = document.documentElement.clientWidth;
      _this.winHeight = document.documentElement.clientHeight;
    }
    this.elem.onmousedown = function (e) {
      var e = e || window.event;
      var disX = e.clientX - this.offsetLeft;
      var disY = e.clientY - this.offsetTop;
      document.onmousemove = function (e) {
        var e = e || window.event;
        var l, t;
        l = e.clientX - disX;
        t = e.clientY - disY;
        _this.move(_this, l, t);
      }
      document.onmouseup = function () {
        _this.cancel();
      }
    }
  }
  // move element
  Drag.prototype.move = function (_this, l, t) {
    var elem = _this.elem;
    if ((l + elem.offsetWidth) > _this.winWidth) {
      l = _this.winWidth - elem.offsetWidth;
    }
    if (l < 0) {
      l = 0;
    }
    if ((t + elem.offsetHeight) > _this.winHeight) {
      t = _this.winHeight - elem.offsetHeight;
    }
    if (t < 0) {
      t = 0;
    }
    elem.style.left = l + 'px';
    elem.style.top = t + 'px';
  }
  // cancel set
  Drag.prototype.cancel = function () {
    document.onmousemove = null;
    document.onmouseup = null;
  }

  /**
   *tab toggle
   *
   * @param {*} navs: click element
   * @param {*} contents: toggle element
   * @param {*} clsName: className
   * @param {*} eventType: event name
   */
  function Tab(navs, contents, clsName, eventType) {
    this.navs = navs;
    this.contents = contents;
    this.clsName = clsName;
    this.len = this.navs.length;
    let that = this;
    for (let i = 0; i < this.len; i++) {
      this.navs[i].addEventListener(eventType, function () {
        for (let j = 0; j < that.len; j++) {
          that.navs[j].className = '';
          that.contents[j].className = '';
        }
        this.className = clsName;
        that.contents[i].className = clsName;
      })
    }
  }

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
    this.contentLis = contentLis;
    this.imgWidth = contentLis[0].clientWidth;
    this.imgHeight = contentLis[0].clientHeight;
    this.len = contentLis.length;
    this.arrowLeft = arrowLeft;
    this.arrowRight = arrowRight;
    this.btns = btns;
    this.active = active;
    this.type = type || 'left';
    this.num = 0;
    this.dealy = dealy || 3000;
    this.isAuto = isAuto || true;
    this.timer = null;
    this.init();
  }

  Carousels.prototype.init = function () {
    this.arrowClick();
    this.toggleBtns();
    this.contentsOut();
    if (this.isAuto) {
      this.autoPlay();
    } else {
      clearInterval(this.timer);
    }
  }

  Carousels.prototype.arrowClick = function () {
    let that = this;
    this.arrowLeft.addEventListener('click', function () {
      clearInterval(that.timer);
      if (that.num > 0 && that.num <= that.len - 1) {
        that.num--;
        that.move();
      } else {
        that.num = that.len;
        that.num--;
        that.move();
      }
    }, false);
    this.arrowRight.addEventListener('click', function () {
      clearInterval(that.timer);
      if (that.num < that.len - 1) {
        that.num++;
        that.move();
      } else {
        that.num = -1;
        that.num++;
        that.move();
      }
    }, false);
  }

  Carousels.prototype.toggleBtns = function () {
    let that = this;
    for (let i = 0; i < this.len; i++) {
      this.btns[i].addEventListener('mouseover', function () {
        clearInterval(that.timer);
        that.num = i;
        that.move();
      }, false);
    }
  }

  Carousels.prototype.toggleBtnsStyle = function () {
    for (let j = 0; j < this.len; j++) {
      this.btns[j].className = '';
    }
    this.btns[this.num].className = this.active;
  }

  Carousels.prototype.move = function () {
    if (this.type == 'left') {
      let moveWidth = -this.imgWidth * this.num;
      this.contents.style.left = moveWidth + 'px';
    } else {
      let moveWidth = -this.imgHeight * this.num;
      this.contents.style.top = moveWidth + 'px';
    }
    this.toggleBtnsStyle(this.num);
  }

  Carousels.prototype.autoPlay = function () {
    let that = this;
    that.timer = setInterval(function () {
      if (that.num < that.len - 1) {
        that.num++;
        that.move();
      } else {
        that.num = -1;
        that.num++;
        that.move();
      }
    }, that.dealy);
  }

  Carousels.prototype.contentsOut = function () {
    let that = this;
    this.contents.addEventListener('mouseover', function () {
      clearInterval(that.timer);
    }, true);
    this.contents.addEventListener('mouseout', function () {
      that.autoPlay();
    }, true);
  }

  Gjs.prototype.getIeVersion = function () {
    var ie = navigator.userAgent.indexOf('Trident') == -1 ? false : true;
    var version = navigator.appVersion;
    var versionName = '';
    if (ie && version) {
      if (version.indexOf('rv:11.0') != -1) {
        return versionName = 'ie11'
      } else if (version.indexOf('MSIE 10.0') != -1) {
        return versionName = 'ie10'
      } else if (version.indexOf('MSIE 9.0') != -1) {
        return versionName = 'ie9'
      } else if (version.indexOf('MSIE 8.0') != -1) {
        return versionName = 'ie8'
      } else if (version.indexOf('MSIE 7.0') != -1) {
        return versionName = 'ie7'
      }
    }
    return -1;
  }

  Gjs.prototype.checkBrowserName = function () {
    var browserName = '';
    if (navigator.userAgent.indexOf('Chrome') != -1) {
      browserName = 'Chrome';
    } else if (navigator.userAgent.indexOf('Trident') != -1 || navigator.appVersion.indexOf('MSIE') != -1) {
      browserName = 'IE';
    } else if (navigator.userAgent.indexOf('Firefox') != -1) {
      browserName = 'Firefox';
    } else if (navigator.userAgent.indexOf('Opera') != -1) {
      browserName = 'Opera';
    } else if (navigator.userAgent.indexOf('Safari') != -1) {
      browserName = 'Safari';
    }
    return browserName;
  }

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

  xqRecord.prototype.createMedia = async function (type, option) {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia(option);
      this.media = document.querySelector(type);
      if (type === "video") {
        this.media.srcObject = this.stream;
      }

      let options = {
        audioBitsPerSecond: 128000,
        videoBitsPerSecond: 2500000,
      };
      this.mediaRecorder = new MediaRecorder(this.stream, options);

      this.mediaRecorder.ondataavailable = (e) => {
        this.chunks.push(e.data);
      };

      this.mediaRecorder.start();

      this.mediaRecorder.onstop = () => {
        let blob = new Blob(this.chunks, { type: this.mediaRecorder.mimeType });
        let url = window.URL.createObjectURL(blob);
        if (type === "video") {
          this.media.srcObject = null;
        }
        this.media.src = url;
        this.stopSet(type);
      };
    } catch (error) {
      console.log("getUserMedia： ", error);
    }
  };

  xqRecord.prototype.start = function (type) {
    let option =
      type == "audio"
        ? {
            audio: true,
          }
        : {
            video: true,
          };
    this.createMedia(type, option);
  };

  xqRecord.prototype.stop = function () {
    this.mediaRecorder.stop();
  };

  xqRecord.prototype.stopSet = function (type) {
    if (type == "audio") {
      this.stream.getAudioTracks()[0].stop();
      this.stream = null;
    } else {
      this.stream.getVideoTracks()[0].stop();
    }
    this.stream = null;
    this.mediaRecorder = null;
    this.chunks = [];
    meida = null;
  };

  // register to gjs extend object
  Gjs.extend({
    Drag: Drag,
    Tab: Tab,
    Carousels,
    xqRecord,
  });

  // welcome statement.
  console.info('Hi,You. Welcome to Gjs World! If you want to get more content, please visited our site: https://github.com/gitguanqi/xqgjs !');

  return Gjs;
});