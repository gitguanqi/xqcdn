/*
 * @Author: fegq
 * @Date: 2021-09-11 14:46:17
 * @LastEditors: fegq
 * @LastEditTime: 2021-09-11 18:44:34
 * @Description: This is a light plugin js!
 * @Version: 0.0.6
 */

// xqlight
function XqLightBox(option) {
    // 配置
    this.currentImgIndex = 0;
    this.currentScale = 1;
    this.currentSrc = '';
    this.currentImgName = '';
    this.isScale = false;
    this.isMouseUp = '';
    this.imgList = [];

    // 操作
    this.imgCls = option.imgCls;
    this.init();
}

// 初始化
XqLightBox.prototype.init = function () {
    this.getImgs();
    this.addLightBoxElem();
    this.addImgClick();
    this.addIconEvent();
}

// 获取图片列表
XqLightBox.prototype.getImgs = function () {
    let imgs = document.querySelectorAll(this.imgCls + ' img');
    let that = this;
    if (imgs && imgs.length) {
        imgs.forEach(function (k, i) {
            let url = k.getAttribute('src');
            let name = k.getAttribute('alt') || `img${i+1}`;
            that.imgList.push({
                id: i + 1,
                url,
                name,
            })
            k.setAttribute('data-index', i);
        });
    }
}

// 添加灯箱元素
XqLightBox.prototype.addLightBoxElem = function () {
    let htmlStr = `
    <div class="lightbox-title">
        <span>
        图片预览
        </span>
        <div>
            (<strong id="lightbox-current">0</strong>/<strong id="lightbox-total">${this.imgList.length}</strong>) 
            <span class="lightbox-name">【<span id="lightbox-name">图片名称</span>】</span> 
        </div>
        <p>
            <i class="lightbox-scale fa"></i>
            <i class="fa fa-times"></i>
        </p>
    </div>
    <div class="lightbox-content">
        <div class="lightbox-ls">
            <div class="lightbox-arrow lightbox-arrow-left">
                &lt;
            </div>
            <ul class="lightbox-list">
                <li>
                    <a class="lightbox-link" href="" target="_blank">
                        <img class="lightbox-img" src="" alt="">
                    </a>
                </li>
            </ul>
            <div class="lightbox-arrow lightbox-arrow-right">
                &gt;
            </div>
        </div>
    </div>`;
    let xqlightElem = document.createElement('div');
    xqlightElem.className = 'lightbox';
    xqlightElem.innerHTML = `
    <!-- lightbox start -->
    ${htmlStr}
    <!-- lightbox end -->
    `;
    document.body.appendChild(xqlightElem);
}

// 图片点击
XqLightBox.prototype.addImgClick = function () {
    let imgs = document.querySelectorAll(`${this.imgCls} img`);
    if (imgs.length === 0) return;
    for (const item of imgs) {
        let that = this;
        item.addEventListener('click', function (e) {
            let index = e.target.dataset.index;
            that.currentImgIndex = parseInt(index);
            that.showLightBox();
        }, false);
    }
}

// 显示灯箱
XqLightBox.prototype.showLightBox = function () {
    let lightbox = document.querySelector('.lightbox');
    lightbox.classList.add('active');
    document.body.className = 'hidden';
    this.currentScale = 1;
    this.showImg();
    this.addArrow();
}

// 显示图片信息
XqLightBox.prototype.addArrow = function () {
    let lightArrowLeft = document.querySelector('.lightbox-arrow-left');
    let lightArrowRight = document.querySelector('.lightbox-arrow-right');
    let that = this;
    window.addEventListener('mousewheel', function (e) {
        that.handleScroll(e);
    }, false);
    lightArrowLeft.addEventListener('click', function () {
        that.prevImg();
    }, false);
    lightArrowRight.addEventListener('click', function () {
        that.nextImg();
    }, false);
}

// 显示图片全部
XqLightBox.prototype.showImg = function () {
    let lightboxImg = document.querySelector('.lightbox-img');
    let lightboxCurrent = document.querySelector('#lightbox-current');
    let lightboxName = document.querySelector('#lightbox-name');
    let lightboxLink = document.querySelector('.lightbox-link');
    lightboxCurrent.innerText = this.currentImgIndex + 1;
    lightboxName.innerText = this.imgList[this.currentImgIndex].name;
    lightboxLink.href = this.imgList[this.currentImgIndex].url;
    lightboxImg.src = this.imgList[this.currentImgIndex].url;
    lightboxImg.style.transform = `scale(${this.currentScale})`;
    this.currentScale = 1;
}

// 添加按钮事件
XqLightBox.prototype.addIconEvent = function () {
    let faScale = document.querySelector('.lightbox-scale');
    let faClose = document.querySelector('.fa-times');
    faScale.className = this.isScale ? 'lightbox-scale fa fa-compress' : 'lightbox-scale fa fa-arrows-alt';
    let that = this;
    faScale.addEventListener('click', function () {
        that.scaleImg();
    }, false);
    faClose.addEventListener('click', this.closeLightBox, false);
}

// handle mousewheel
XqLightBox.prototype.handleScroll = function (e) {
    let lightboxImg = document.querySelector('.lightbox-img');
    this.isMouseUp = e.deltaY > 0 ? false : true;
    if (this.isMouseUp && this.currentScale < 3) {
        this.currentScale += 0.2;
    }
    if (!this.isMouseUp && this.currentScale > 0.4) {
        this.currentScale -= 0.2;
    }
    lightboxImg.style.transform = `scale(${this.currentScale})`;
}

// scale img
XqLightBox.prototype.scaleImg = function () {
    let faScale = document.querySelector('.lightbox-scale');
    this.isScale = !this.isScale;
    faScale.className = this.isScale ? 'lightbox-scale fa fa-compress' : 'lightbox-scale fa fa-arrows-alt';
    if (!this.isScale) {
        this.fullScreenCancel();
    } else {
        this.fullScreenOpen();
    }
}

XqLightBox.prototype.closeLightBox = function () {
    let lightbox = document.querySelector('.lightbox');
    document.body.className = '';
    lightbox.classList.remove('active');
}

// prev img
XqLightBox.prototype.prevImg = function () {
    if (this.currentImgIndex > 0 && this.currentImgIndex <= this.imgList.length) {
        this.currentImgIndex -= 1;
    } else {
        this.currentImgIndex = this.imgList.length - 1;
    }
    this.showImg();
}

// next img
XqLightBox.prototype.nextImg = function () {
    if (this.currentImgIndex == this.imgList.length - 1) {
        this.currentImgIndex = 0;
    } else {
        this.currentImgIndex += 1;
    }
    this.showImg();
}

// fullscreen set
XqLightBox.prototype.fullScreenOpen = function () {
    var docElm = document.documentElement;
    if (docElm.requestFullscreen) {
        docElm.requestFullscreen();
    } else if (docElm.msRequestFullscreen) {
        docElm.msRequestFullscreen();
    } else if (docElm.mozRequestFullScreen) {
        docElm.mozRequestFullScreen();
    } else if (docElm.webkitRequestFullScreen) {
        docElm.webkitRequestFullScreen();
    }
}

XqLightBox.prototype.fullScreenCancel = function () {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitCancelFullScreen) {
        document.webkitCancelFullScreen();
    }
}