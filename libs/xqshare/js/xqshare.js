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
        root.XqShare = factory();
    }
})(this, function factory () {

    function XqShare (options = {
        el: '#share',
        type: 'default',
        url: '',
    }) {
        this.options = {...options};
        if (!this.options.el) {
            throw new Error('XqShare Error: el is must a dom selector!');
        }
        if (!this.options.type) {
            throw new Error('XqShare Error: type is must a type string!');
        }
        if (['default', 'pop', 'slide'].indexOf(this.options.type)===-1) {
            throw new Error('XqShare Error: type is must a type "default" or "pop" or "slide"!');
        }
        this.url = this.options.url || location.origin+location.pathname;
        this.title = this.options.title || document.title;
        this.initElem(document.querySelector(this.options.el));
    }

    // 初始化页面
    XqShare.prototype.initElem = function (container) {  
        let shareElem = document.createElement('div');
        shareElem.className = 'xqshare';
        let baseUrl = 'https://xqgj.cc/xqcdn/libs/xqshare/';
        shareElem.innerHTML = `
        <div class="xqshare-box ${this.options.type}">
            <div class="xqshare-inner">
                <div class="xqshare-title"><span>分享预览页面</span><strong>X</strong></div>
                <span class="xqshare-tip">分享至</span>
                <ul class="xqshare-ls">
                    <li data-type="qq"><img data-type="qq" src="${baseUrl}img/share_qq.png" alt="qq"
                            title="qq"><span data-type="qq">qq</span></li>
                    <li data-type="qzone"><img data-type="qzone" src="${baseUrl}img/share_qzone.png" alt="qq空间"
                            title="qq空间"><span data-type="qzone">空间</span></li>
                    <li data-type="weibo"><img data-type="weibo" src="${baseUrl}img/share_weibo.png" alt="微博"
                            title="微博"><span data-type="weibo">微博</span></li>
                    <li data-type="douban"><img data-type="douban" src="${baseUrl}img/share_douban.png" alt="豆瓣"
                            title="豆瓣"><span data-type="douban">豆瓣</span></li>
                    <li data-type="tieba"><img data-type="tieba" src="${baseUrl}img/share_tieba.png" alt="贴吧"
                            title="贴吧"><span data-type="tieba">贴吧</span></li>
                </ul>
                <div class="xqshare-urls">
                    <p><span>预览地址</span><input id="previewUrl" type="text" disabled="true"><small id="copyUrl">复制</small></p>
                    <p><span>嵌入代码</span><input id="iframeUrl" type="text" disabled="true"><input type="hidden" id="iframe-url"
                            value=""><small  id="copyIframe">复制</small></p>
                </div>
            </div>
        </div>
        `;
        if (container) {
            container.appendChild(shareElem);
        } else {
            document.documentElement.appendChild(shareElem);
        }
        this.addEvent();
    }

    // 添加事件
    XqShare.prototype.addEvent = function () {
        let shareList = document.querySelectorAll(this.options.el+' .xqshare-ls li');
        // 列表点击
        for (const item of shareList) {
            item.addEventListener('click', () => {
                let e = window.event || event;
                let type = e.target.dataset.type;
                this.share(type, this.url, this.title);
            }, false);
        }

        if (this.options.type == 'pop') {
            // btn
            let closeBtn = document.querySelector(this.options.el+' .xqshare-title strong'),
            
            // pop
            previewUrl = document.querySelector(this.options.el+' #previewUrl'),
            iframeUrl = document.querySelector(this.options.el+' #iframeUrl'),

            // copy
            copyUrl = document.querySelector(this.options.el+' #copyUrl'),
            copyIframe = document.querySelector(this.options.el+' #copyIframe');

            previewUrl.value = this.url;
            iframeUrl.value = `<iframe src='${this.url}' frameborder=0></iframe>`;

            // 关闭
            closeBtn.addEventListener('click', () => {
                this.hide();
            });

            // 复制地址
            copyUrl.addEventListener('click', () => {
                this.copy(this.options.el+' #previewUrl');
            });
            copyIframe.addEventListener('click', () => {
                this.copy(this.options.el+' #iframeUrl');
            });
        }

        if (this.options.type == 'slide') {
            // btn
            let openBtn = document.querySelector(this.options.el+' .xqshare-tip'),
            slideBox = document.querySelector(this.options.el+' .slide');

            openBtn.addEventListener('click', () => {
                slideBox.classList.toggle('active');
            });

        }

    }

    // 显示分享
    XqShare.prototype.show = function () {
        if (this.options.type != 'pop') return;
        let shareBox = document.querySelector(this.options.el+' .xqshare-box');
        shareBox.classList.add('active');
    }

    // 隐藏分享
    XqShare.prototype.hide = function () {
        if (this.options.type != 'pop') return;
        let shareBox = document.querySelector(this.options.el+' .xqshare-box');
        shareBox.classList.remove('active');
    }


    XqShare.prototype.copy = function (id) {
        let txt = document.querySelector(id).value;
        if (!txt) return;
        let oIpt = document.createElement('input');
        oIpt.value = txt;
        document.body.appendChild(oIpt);
        oIpt.select();
        document.execCommand("Copy");
        document.body.removeChild(oIpt);
        alert('复制成功！');
        return true;
    }

    /* 
    author: fegq,
    name: 分享组件
    params: 
    type: 类型，
    url:网址
    title:标题
    */
    XqShare.prototype.share = function (type, url, title, des) {
        let types = {
        // qq
        qq: function (url, title) {
            return `https://connect.qq.com/widget/shareqq/iframe_index.html?url=${url}&title=${title}`;
        },
        // qq空间
        qzone: function (url, title) {
            return `http://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${url}&title=${title}&site=${url}&desc=${des}`;
        },
        // 微信
        wechat: function (url, title) {
            return "";
        },
        // 微博
        weibo: function (url, title) {
            return `http://service.weibo.com/share/share.php?url=${url}&title=${title}&language=zh_cn`;
        },
        // 豆瓣
        douban: function (url, title) {
            return `http://shuo.douban.com/!service/share?href=${url}&name=${title}`;
        },
        // 百度贴吧
        tieba: function (url, title) {
            return `http://tieba.baidu.com/f/commit/share/openShareApi?title=${title}&url=${url}`;
        },
        };
        let shareUrl = types[type](url, title);
        window.open(shareUrl, "_blank");
    }

    return XqShare;
});
