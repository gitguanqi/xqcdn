/*
 * @Author: fegq
 * @Date: 2020-12-13 19:27:05
 * @LastEditors: fegq
 * @LastEditTime: 2021-09-11 18:31:23
 * @Description: This is a check ie file!
 * @Version: 0.0.1
 */

function checkIe() {
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
  
  var isIe = checkIe();
  
  if (isIe == 'IE') {
    location.href = 'https://felab.guanqi.xyz/link/browser/';
  }