<template>
    <div class="xqshare" v-show="pop.isHide">
        <div :class="{'xqshare-box': true, [type]: true, 'active': slide.isHide}">
            <div class="xqshare-inner">
                <div class="xqshare-title"><span>分享预览页面</span><strong @click="hideShare">X</strong></div>
                <span class="xqshare-tip" @click="toggleSlide">分享至</span>
                <ul class="xqshare-ls">
                    <li @click="shareAddr(item.val)" v-for="item in shares" :key="item.id" :data-type="item.val"><img :data-type="item.val" :src="`${baseUrl}img/share_${item.val}.png`" :alt="item.name"
                            :title="item.name"><span :data-type="item.val">{{item.name}}</span></li>
                </ul>
                <div class="xqshare-urls">
                    <p><span>预览地址</span><input id="previewUrl" type="text" disabled="true" :value="pop.url"><small id="copyUrl">复制</small></p>
                    <p><span>嵌入代码</span><input id="iframeUrl" type="text" disabled="true" :value="pop.iframeUrl"><input type="hidden" id="iframe-url"
                            value=""><small  id="copyIframe">复制</small></p>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        show: {
            type: Boolean,
            default: true,
        },
        type: {
            type: String,
            default: 'default',
        },
        url: {
            type: String,
            default: location.origin+location.pathname,
        },
        title: {
            type: String,
            default: document.title,
        },
    },
    name: 'xqshare',
    data() {
        return {
            baseUrl: 'https://unpkg.com/xqshare/lib/',
            shares: [{
                    id: 1,
                    name: 'qq',
                    val: 'qq',
                },
                {
                    id: 2,
                    name: '空间',
                    val: 'qzone',
                },
                {
                    id: 3,
                    name: '微博',
                    val: 'weibo',
                },
                {
                    id: 4,
                    name: '豆瓣',
                    val: 'douban',
                },
                {
                    id: 5,
                    name: '贴吧',
                    val: 'tieba',
                }
            ],
            pop: {
                isHide: false,
                url: '',
                iframeUrl: '',
            },
            slide: {
                isHide: false,
            }
        }
    },
    watch: {
        'show': function (val) {  
            this.pop.isHide = val;
        }
    },
    mounted() {
        this.pop.isHide = this.show;
        this.checkType();
    },
    methods: {
        // 检测类型
        checkType () {
            if (this.type === 'pop') {
                this.pop.url = this.url;
                this.pop.iframeUrl = `<iframe src='${this.url}' frameborder=0></iframe>`;
            }
        },
        // 隐藏分享
        hideShare () {
            this.pop.isHide = false;
        },
        // 切换悬浮
        toggleSlide () {
            this.slide.isHide = !this.slide.isHide;
        },
        // 分享文章
        shareAddr (val) {
            let params = {
                type: val,
                url: this.url,
                title: this.title,
            }
            this.xqShare(params.type, params.url, params.title);
        },
        /*
        author: fegq,
        name: 分享组件
        params: 
        type: 类型，
        url:网址
        title:标题
        */
        xqShare(type, url, title, des) {
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
    },
}
</script>

<style scoped>
@charset "UTF-8";

.xqshare-box ul,
.xqshare-box li {
    margin: 0;
    padding: 0;
}

.xqshare-box input {
    border: none;
}

.xqshare-box .xqshare-inner {
    height: auto
}

.xqshare-box .xqshare-inner ul {
    display: flex;
    justify-content: space-around;
    margin-bottom: 10px;
    width: 100%;
    height: 50px;
}

.xqshare-box .xqshare-inner ul li {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 30px;
    text-align: center;
    cursor: pointer;
}

.xqshare-box .xqshare-inner ul li img {
    margin: auto;
    display: inline-block;
    width: 25px;
    height: 25px;
}

.xqshare-box .xqshare-inner ul li span {
    margin-top: 10px;
    display: inline-block;
    font-size: 14px;
    text-align: center;
}

/* pop mode */
.pop {
    position: fixed;
    top: 0;
    left: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100vh;
    background: rgba(0, 0, 0, .5);
    overflow: hidden;
    z-index: 999;
}

.pop .xqshare-inner {
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    padding: 20px 10px;
    width: 90%;
    min-width: 300px;
    max-width: 360px;
    height: auto;
    border: 2px solid #fff;
    border-radius: 5px;
    background: #fff;
}

.pop .xqshare-inner .xqshare-title {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding-bottom: 10px;
    margin-bottom: 15px;
    height: 20px;
    color: #333;
    font-size: 16px;
    border-bottom: 1px solid rgba(0, 0, 0, .1);
}

.pop .xqshare-inner .xqshare-title strong {
    font-size: 16px;
    cursor: pointer
}

.pop .xqshare-inner .xqshare-tip {
    display: none;
}

.pop .xqshare-inner .xqshare-urls {
    display: block;
    margin-top: 20px;
}

.pop .xqshare-inner .xqshare-urls p {
    display: flex;
    justify-content: space-between;
    margin: 0 auto 15px;
    width: 90%;
    font-size: 14px;
    line-height: 2;
    text-align: center;
}

.pop .xqshare-inner .xqshare-urls p span {
    display: inline-block;
    width: 60px
}

.pop .xqshare-inner .xqshare-urls p input {
    flex: 1;
    background-color: #eee;
}

.pop .xqshare-inner .xqshare-urls p small {
    display: inline-block;
    padding: 0 5px;
    width: 30px;
    color: #fff;
    background: #e03e3e;
    font-size: 12px;
    line-height: 2.5;
    cursor: pointer;
}


/* default mode */
.default {
    box-sizing: border-box;
    padding: 10px;
    width: 100%;
    border-radius: 4px;
    border: 1px solid #ccc;
}
.default .xqshare-inner {
    display: flex;
    align-items: center;
}
.default .xqshare-inner .xqshare-tip,
.slide .xqshare-inner .xqshare-tip {
    display: inline-block;
    width: 50px;
    font-size: 14px;
}
.default .xqshare-inner .xqshare-title,
.slide .xqshare-inner .xqshare-title {
    display: none;
}

.default .xqshare-inner ul {
    flex: 1;
    align-items: center;
    margin-bottom: 0;
    max-width: 350px;
    height: 25px;
}
.default .xqshare-inner ul li {
    flex: none;
    flex-direction: row;
    align-items: center;
    margin-right: 5px;
    height: auto;
}
.default .xqshare-inner ul li span {
    margin-left: 5px;
    margin-top: 0;
}
.default .xqshare-inner .xqshare-urls,
.slide .xqshare-inner .xqshare-urls {
    display: none;
}

/* slide model */
.slide {
    position: fixed;
    top: 50%;
    right: -92px;
    margin-top: -162px;
    height: 300px;
    transition: all .5s;
}

.slide.active {
    right: 0;
}

.slide .xqshare-inner {
    display: flex;
    justify-content: space-between;
    align-items: center;
    height: 100%;
}

.slide .xqshare-inner .xqshare-tip {
    box-sizing: border-box;
    padding: 20px 15px;
    width: 40px;
    height: 100px;
    text-align: center;
    background-color: #d32d2d;
    color: #fff;
    border-radius: 10px 0 0 10px;
    font-size: 14px;
    cursor: pointer;
}

.slide .xqshare-inner .xqshare-ls {
    flex-direction: column;
    justify-content: center;
    align-items: center;
    margin-bottom: 0;
    padding: 10px 30px;
    width: auto;
    height: 100%;
    background: #fff;
    border: 2px solid #d32d2d;
    border-radius: 10px 0 0 10px;
}

.slide .xqshare-inner ul li img {
    margin: 0;
}

.slide .xqshare-inner ul li span {
    margin-top: 0;
}
</style>