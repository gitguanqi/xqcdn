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
        root.xqisie = factory();
    }
})(this, function factory () {
    function check (userAgent) {
        var ua = userAgent || navigator.userAgent;
        var browserName = '';
        if (ua.indexOf('Chrome') != -1) {
          browserName = 'Chrome';
        } else if (ua.indexOf('Trident') != -1 || navigator.appVersion.indexOf('MSIE') != -1) {
          browserName = 'IE';
        } else if (ua.indexOf('Firefox') != -1) {
          browserName = 'Firefox';
        } else if (ua.indexOf('Opera') != -1) {
          browserName = 'Opera';
        } else if (ua.indexOf('Safari') != -1) {
          browserName = 'Safari';
        }
        return browserName;
    }

    function goLink (url) {  
      var xqisie = check();
      if (xqisie == 'IE') {
          location.href = url || 'https://unpkg.com/xqisie/page/index.html';
      }
  }

    return {
        check: check,
        goLink: goLink,
    }
});
