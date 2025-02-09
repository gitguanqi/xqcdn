/**
 * author: fegq
 * name: xqloading
 * version: 0.0.1
 * create: 2022-10-02
 * update: 2022-10-02
 * @param {*} img 图标图片
 * @param {*} color 图标颜色
 */
function xqLoading(img, color) {
    let loading = document.createElement("div");
    loading.className = "loading";
    let content =
        '<div class="loading-inner">' +
        '<span class="loading-circle" style="border-left-color: ' + color + ';"></span>' +
        '<img class="loading-img" src="'+ img + '"' +
        "</div>";
    loading.innerHTML = content;
    document.body.appendChild(loading);
}

let xqloading = document.getElementById('xqloading');
let params = xqloading.dataset;
xqLoading(params.img, params.color);

window.onload = function () {
    document.querySelector(".loading").classList.add('active');
};
