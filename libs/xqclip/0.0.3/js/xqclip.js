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
        root.xqclip = factory();
    }
})(this, function factory () {
    // XqClip裁切插件
    function XqClip(options) {
        let globalOptions = {
            box: options.box || '.clip-box',
            boxWin: options.boxWin || 400,
            boxHei: options.boxHei || 400,
            areaWin: options.areaWin || 100,
            areaHei: options.areaHei || 100,
            pre: '' || options.pre,
            url: options.url || '',
            scale: options.scale || 1,
            showPos: options.showPos == undefined ? true : options.showPos,
            scaleImg: options.scaleImg == undefined ? true : options.scaleImg,
        };
        this.pre = null;
        if (globalOptions.box == '') {
            console.error('box class name is not null!');
            return;
        }
        if (globalOptions.box == '.clip-box') {
            console.error('box class name is not allow!');
            return;
        }
        if (globalOptions.url == '') {
            console.error('url is not null!');
            return;
        }
        if (globalOptions.pre) {
            globalOptions.pre = options.pre;
            this.pre = document.querySelector(globalOptions.pre);
        }
        if (this.pre.nodeName !== 'IMG') {
            console.error('pre must is image element!');
            return;
        }
        this.box = document.querySelector(globalOptions.box);
        this.box.style.width = globalOptions.boxWin + 'px';
        this.box.style.height = globalOptions.boxHei + 'px';
        this.boxWin = globalOptions.boxWin;
        this.boxHei = globalOptions.boxHei;
        this.areaWin = globalOptions.areaWin * globalOptions.scale;
        this.areaHei = globalOptions.areaHei;
        this.imgSrc = globalOptions.url;
        this.scale = globalOptions.scale;
        this.showPos = globalOptions.showPos;
        this.scaleImg = globalOptions.scaleImg;
        this.scaleMin = 64;
        this.scaleMinWin = this.scaleMin * this.scale;
        this.scaleMinHei = this.scaleMin;
        this.clipBoxInfo = {
            win: 0,
            hei: 0,
            left: 0,
            top: 0,
        }
        this.clipAreaInfo = {
            win: 0,
            hei: 0,
            left: 0,
            top: 0,
        }
        this.imgInfo = {
            elem: null,
            x: 0,
            y: 0,
            win: 0,
            hei: 0,
        };
        this.clipImg = null;
        this.clipCxt = null;
        this.tempCanvas = null;
        this.tempCxt = null;
        this.tempData = null;
        this.tempInfo = null;
        this.clipScale = 0;
        this.clipBox = null;
        this.clipScaleBtn = null;
        this.clipArea = null;
        this.clipShadowTop = null;
        this.clipShadowRight = null;
        this.clipShadowBottom = null;
        this.clipShadowLeft = null;
        this.isMobile = null;
        this.eventName = {
            start: '',
            move: '',
            end: '',
        };
        this.checkMobile();
        this.initElem();
    }

    // 是否手机端
    XqClip.prototype.checkMobile = function () {
        let checkRes = 'touchstart' in document || document.documentElement.clientWidth <= 768 ||
            document.body.clientWidth <= 768;
        this.isMobile = checkRes;
        this.eventName = this.isMobile ? {
            start: 'touchstart',
            move: 'touchmove',
            end: 'touchend',
        } : {
            start: 'mousedown',
            move: 'mousemove',
            end: 'mouseup',
        }
        window.onresize = this.checkMobile;
    }

    // 初始化元素
    XqClip.prototype.initElem = function () {
        this.box.innerHTML = `<div class="clip-box clip-bg">
            <canvas id="clip-img" class="clip-bg"></canvas>
            <div class="clip-img-shadow clip-img-shadow-top"></div>
            <div class="clip-img-shadow clip-img-shadow-right"></div>
            <div class="clip-img-shadow clip-img-shadow-bottom"></div>
            <div class="clip-img-shadow clip-img-shadow-left"></div>
            <div class="clip-img-area no-pos" data-pos="pos(0,0)"  data-size="wh(0,0)">
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <small class="clip-img-scale"></small>
            </div>
            <canvas id="clip-temp"></canvas>
        </div>`;
        this.getElem();
    }

    // 获取元素
    XqClip.prototype.getElem = function () {
        this.clipBox = document.querySelector('.clip-box');

        this.clipScaleBtn = document.querySelector('.clip-img-scale');
        this.clipArea = document.querySelector('.clip-img-area');
        this.clipShadowTop = document.querySelector('.clip-img-shadow-top');
        this.clipShadowRight = document.querySelector('.clip-img-shadow-right');
        this.clipShadowBottom = document.querySelector('.clip-img-shadow-bottom');
        this.clipShadowLeft = document.querySelector('.clip-img-shadow-left');

        // 创建画布
        this.clipImg = document.getElementById('clip-img');
        this.clipCxt = this.clipImg.getContext('2d');
        this.clipImg.width = this.boxWin;
        this.clipImg.height = this.boxHei;
        // 创建临时画布
        this.tempCanvas = document.getElementById('clip-temp');
        this.tempCxt = this.tempCanvas.getContext('2d');

        // 加载图片和框以及阴影
        this.loadImg();
        this.calcAreaElem();
    }

    // 加载图片
    XqClip.prototype.loadImg = function () {
        let that = this;
        let img = new Image();
        img.src = that.imgSrc;
        img.onload = function () {
            let imgWin = 0;
            let imgHei = 0;
            let imgX = 0;
            let imgY = 0;
            let imgScale = img.width / img.height;
            if (imgScale == 1) {
                imgWin = that.boxWin / 2;
                imgHei = that.boxHei / 2;
                imgX = (that.boxWin - imgWin) / 2;
            } else {
                imgWin = that.boxWin;
                imgHei = that.boxHei / imgScale;
                imgX = 0;
            }
            imgY = (that.boxHei - imgHei) / 2;
            that.imgInfo = {
                elem: img,
                x: imgX,
                y: imgY,
                win: imgWin,
                hei: imgHei,
            }
            that.drawImg(that.imgInfo);
        }

        if (this.scaleImg) {
            this.addWheel();
        }

    }

    // 鼠标滚轮计算
    XqClip.prototype.addWheel = function () {
        let that = this;
        let currentScale = 1;
        that.clipBox.addEventListener('wheel', function (e) {
            let isMouseUp = e.deltaY > 0 ? false : true;
            if (isMouseUp && currentScale < 3) {
                currentScale += 0.2;
            }
            if (!isMouseUp && currentScale > 0.4) {
                currentScale -= 0.2;
            }
            let imgScale = that.imgInfo.elem.width / that.imgInfo.elem.height;
            if (imgScale == 1) {
                imgWin = (that.boxWin / 2) * currentScale;
                imgHei = (that.boxHei / 2) * currentScale;
                imgX = ((that.boxWin - imgWin) / 2) * currentScale;
            } else {
                imgWin = (that.boxWin) * currentScale;
                imgHei = (that.boxHei / imgScale) * currentScale;
                imgX = 0;
            }
            imgY = (that.boxHei - imgHei) / 2;
            that.imgInfo = {
                elem: that.imgInfo.elem,
                x: imgX,
                y: imgY,
                win: imgWin,
                hei: imgHei,
            }
            that.drawImg(that.imgInfo);
        })
    }

    // 绘制图片
    XqClip.prototype.drawImg = function (obj) {
        this.clipImg.width = this.boxWin;
        this.clipImg.height = this.boxHei;
        this.clipCxt.drawImage(obj.elem, obj.x, obj.y, obj.win, obj.hei);
    }

    // 替换图片
    XqClip.prototype.replaceImg = function (url) {
        if (!url) {
            console.error('url is must!');
            return false;
        }
        if (url == '') {
            console.error('url is not null!');
            return false;
        }
        this.clipImg.width = this.boxWin;
        this.clipImg.height = this.boxHei;
        this.imgSrc = url;
        this.loadImg();
    }

    // 计算裁剪框
    XqClip.prototype.calcAreaElem = function () {
        // 裁剪框
        this.clipArea.style.width = this.areaWin + 'px';
        this.clipArea.style.height = this.areaHei + 'px';
        this.clipArea.style.left = ((this.boxWin - this.areaWin) / 2) + 'px';
        this.clipArea.style.top = ((this.boxHei - this.areaHei) / 2) + 'px';
        if (this.showPos) {
            this.clipArea.classList.remove('no-pos');
        }

        // 位置
        this.calcAreaPos();
        this.initShadowElem();
        // 添加事件
        this.clipBoxMove();
        this.clipAreaScale();
    }

    // 计算裁剪框位置
    XqClip.prototype.calcAreaPos = function () {
        // 位置
        this.clipBoxInfo = {
            win: this.clipBox.offsetWidth,
            hei: this.clipBox.offsetHeight,
            left: this.clipBox.offsetLeft,
            top: this.clipBox.offsetTop,
        }
        this.clipAreaInfo = {
            win: this.clipArea.offsetWidth,
            hei: this.clipArea.offsetHeight,
            left: this.clipArea.offsetLeft,
            top: this.clipArea.offsetTop,
        }
    }

    // 初始化阴影面积
    XqClip.prototype.initShadowElem = function () {
        // 阴影
        // 上面
        this.clipShadowTop.style.width = this.areaWin + 'px';
        this.clipShadowTop.style.height = this.clipAreaInfo.top + 'px';
        this.clipShadowTop.style.left = this.clipAreaInfo.left + 'px';
        this.clipShadowTop.style.top = 0;
        // 右面
        this.clipShadowRight.style.width = this.clipAreaInfo.left + 'px';
        this.clipShadowRight.style.height = this.clipBoxInfo.hei + 'px';
        this.clipShadowRight.style.right = 0;
        this.clipShadowRight.style.top = 0;
        // 下面
        this.clipShadowBottom.style.width = this.areaWin + 'px';
        this.clipShadowBottom.style.height = this.clipAreaInfo.top + 'px';
        this.clipShadowBottom.style.left = this.clipAreaInfo.left + 'px';
        this.clipShadowBottom.style.bottom = 0;
        // 左面
        this.clipShadowLeft.style.width = this.clipAreaInfo.left + 'px';
        this.clipShadowLeft.style.height = this.clipBoxInfo.hei + 'px';
        this.clipShadowLeft.style.left = 0;
        this.clipShadowLeft.style.top = 0;
    }

    // 画布操作
    XqClip.prototype.clipBoxMove = function () {

        let that = this;

        // 鼠标按下
        that.clipBox.addEventListener(that.eventName.start, function (e) {

            // 判断是否拉伸按钮
            let clsName = e.target.className;
            if (clsName == 'clip-img-scale') {
                return false;
            }

            // 鼠标移动
            that.clipBox[`on${that.eventName.move}`] = function (e) {

                // 移动坐标
                let movePos = {
                    x: e.clientX,
                    y: e.clientY,
                }

                that.calcAreaPos();

                // 限制范围
                let disX = movePos.x - that.clipBoxInfo.left;
                let disY = movePos.y - that.clipBoxInfo.top;
                let cLeft = disX - that.clipAreaInfo.win / 2;
                let cTop = disY - that.clipAreaInfo.win / 2;

                // 限制范围
                if (cLeft < 0) {
                    cLeft = 0;
                }

                if (cLeft > (that.clipBoxInfo.win - that.clipAreaInfo.win)) {
                    cLeft = that.clipBoxInfo.win - that.clipAreaInfo.win;
                }

                if (cTop < 0) {
                    cTop = 0;
                }

                if (cTop > (that.clipBoxInfo.hei - that.clipAreaInfo.hei)) {
                    cTop = that.clipBoxInfo.hei - that.clipAreaInfo.hei;
                }

                // 裁剪框位置
                that.clipArea.style.left = cLeft + 'px';
                that.clipArea.style.top = cTop + 'px';

                // 计算阴影面积
                that.calcShadowElem();

                // 实时保存选取图片
                that.getAreaData();
            }

        }, false);

        // 鼠标放开
        that.clipBox.addEventListener(that.eventName.end, function () {

            // 取消移动
            that.clipBox[`on${that.eventName.move}`] = null;

        }, false);
    }

    // 拉伸裁剪框
    XqClip.prototype.clipAreaScale = function () {

        let that = this;

        // 拉伸按钮按下
        that.clipScaleBtn.addEventListener(that.eventName.start, function (e) {

            // 拉伸坐标
            let scalePos = {
                x: e.clientX,
                y: e.clientY,
            }

            // 按钮移动
            that.clipBox[`on${that.eventName.move}`] = function (e) {

                // 拉伸后坐标
                let scaleMovePos = {
                    x: e.clientX,
                    y: e.clientY,
                }

                // 移动坐标信息
                let moveInfo = {
                    width: scaleMovePos.x - scalePos.x,
                    height: scaleMovePos.y - scalePos.y,
                }

                // 获取移动距离
                let areaMove = {
                    win: moveInfo.width + that.clipAreaInfo.win,
                    hei: moveInfo.height + that.clipAreaInfo.hei,
                }

                // 计算比例
                if (that.scale == 1) {
                    areaMove.win = areaMove.win;
                    areaMove.hei = areaMove.win;
                }
                if (that.scale > 1) {
                    areaMove.win = areaMove.win * that.scale;
                    areaMove.hei = areaMove.hei;
                }

                // 处理边界
                if (areaMove.win >= (that.clipBoxInfo.win - that.clipAreaInfo.left) * that.scale) {
                    areaMove.win = that.clipBoxInfo.win - that.clipAreaInfo.left;
                }

                if (areaMove.hei >= (that.clipBoxInfo.hei - that.clipAreaInfo.top) * that.scale) {
                    areaMove.hei = that.clipBoxInfo.hei - that.clipAreaInfo.top;
                }

                if (areaMove.win <= that.scaleMinWin) {
                    areaMove.win = that.scaleMinWin;
                }

                if (areaMove.hei <= that.scaleMinHei) {
                    areaMove.hei = that.scaleMinHei;
                }

                that.clipArea.style.width = areaMove.win + 'px';
                that.clipArea.style.height = areaMove.hei + 'px';

                that.calcAreaPos();
                that.changeShadowElem(areaMove.win);
                that.calcShadowElem();
                that.getAreaData();
            }

        }, false);

        // 裁切框鼠标放开
        that.clipScaleBtn.addEventListener(that.eventName.end, function () {
            // 取消移动
            that.clipBox[`on${that.eventName.move}`] = null;
        });
    }

    // 计算阴影面积
    XqClip.prototype.calcShadowElem = function () {
        // 上
        this.clipShadowTop.style.height = this.clipAreaInfo.top + 'px';
        this.clipShadowTop.style.left = this.clipAreaInfo.left + 'px';

        // 右
        this.clipShadowRight.style.width = (this.clipBoxInfo.win - this.clipAreaInfo.left - this.clipAreaInfo.win) + 'px';

        // 下
        this.clipShadowBottom.style.height = (this.clipBoxInfo.hei - this.clipAreaInfo.top - this.clipAreaInfo.hei) + 'px';
        this.clipShadowBottom.style.left = this.clipAreaInfo.left + 'px';

        // 左
        this.clipShadowLeft.style.width = this.clipAreaInfo.left + 'px';

    }

    // 计算改变裁切框后的阴影面积
    XqClip.prototype.changeShadowElem = function (areaMoveWin) {
        // 上
        this.clipShadowTop.style.width = areaMoveWin + 'px';
        this.clipShadowTop.style.height = this.clipAreaInfo.top + 'px';

        // 右
        this.clipShadowRight.style.width = (this.clipBoxInfo.win - areaMoveWin) + 'px';
        this.clipShadowRight.style.height = this.clipBoxInfo.hei + 'px';

        // 下
        this.clipShadowBottom.style.width = areaMoveWin + 'px';
        this.clipShadowBottom.style.height = (this.clipBoxInfo.hei - this.clipAreaInfo.top - areaMoveWin) + 'px';

        // 左
        this.clipShadowLeft.style.width = (this.clipBoxInfo.win - areaMoveWin) + 'px';
    }

    // 裁切图片
    XqClip.prototype.getAreaData = function () {

        // 实时临时画布宽高
        this.tempCanvas.width = this.clipAreaInfo.win;
        this.tempCanvas.height = this.clipAreaInfo.hei;
        this.tempCanvas.style.overflow = 'hidden';

        this.clipArea.setAttribute('data-pos', `pos(${this.clipAreaInfo.left},${this.clipAreaInfo.top})`);
        this.clipArea.setAttribute('data-size', `wh(${this.clipAreaInfo.win},${this.clipAreaInfo.hei})`);

        // 获取选区数据
        this.tempData = this.clipCxt.getImageData(this.clipAreaInfo.left, this.clipAreaInfo.top, this.clipAreaInfo.win, this.clipAreaInfo.hei);
        this.tempCxt.putImageData(this.tempData, 0, 0);
        this.saveImgData();
    }

    // 获取选取数据（base64）
    XqClip.prototype.saveImgData = function () {
        this.tempInfo = {
            base64: this.tempCanvas.toDataURL('image/jpg')
        }

        this.tempInfo.blob = window.URL.createObjectURL(this.dataToBlob(this.tempInfo.base64));
        this.tempInfo.file = this.dataToFile(this.tempInfo.base64);

        // 显示预览图
        this.pre.style.width = this.clipAreaInfo.win + 'px';
        this.pre.style.height = this.clipAreaInfo.hei + 'px';
        this.pre.style.overflow = 'hidden';
        this.pre.src = this.tempInfo.base64;
    }

    // 获取选取数据公开

    XqClip.prototype.getCanvasImgData = function () {
        return this.tempInfo;
    }

    //base64转化为blob
    XqClip.prototype.dataToBlob = function (base64Data) {
        var byteString;
        if (base64Data.split(',')[0].indexOf('base64') >= 0)
            byteString = atob(base64Data.split(',')[1]);
        else {
            byteString = unescape(base64Data.split(',')[1]);
        }
        var mimeString = base64Data.split(',')[0].split(':')[1].split(';')[0];
        var ia = new Uint8Array(byteString.length);
        for (var i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        var blob = new Blob([ia], {
            type: mimeString
        });
        return blob;
    }

    // base64转为文件
    XqClip.prototype.dataToFile = function (dataurl, filename) {
        let arr = dataurl.split(',')
        let mime = arr[0].match(/:(.*?);/)[1];
        if (!filename) { //若无文件名则取当前时间戳
            filename = Date.parse(new Date()) + '.jpg';
        }
        let bstr = atob(arr[1])
        let n = bstr.length
        let u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new File([u8arr], filename, {
            type: mime
        });
    }
    return XqClip;
});