/*
 * @Author: fegq
 * @Date: 2021-09-25 12:06:33
 * @LastEditors: fegq
 * @LastEditTime: 2021-09-25 15:56:06
 * @Description: This is a check online status!
 * @Version: 0.0.1
 */

handleNetWork();
window.addEventListener('online', function (e) {
    handleNetWork(true);
}, false);
window.addEventListener('offline', function (e) {
    handleNetWork(false);
}, false);

function handleNetWork(status) {
    let onlineDiv = document.createElement('div');
    onlineDiv.className = 'online';
    onlineDiv.innerHTML = '<p><i class="fa fa-wifi"></i>网络连接不可用</p>';
    let bodyFirst = document.body.firstChild;
    let onlineElem = document.querySelector('.online');
    if (onlineElem == null) {
        document.body.insertBefore(onlineDiv, bodyFirst);
    }
    let onlineBox = document.querySelector('.online');
    let online = status ? status : navigator.onLine;
    onlineBox.className = online ? 'online' : 'online active';
}