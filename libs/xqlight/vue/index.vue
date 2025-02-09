<template>
    <div class="lightbox" v-show="showLightBox">
        <div class="lightbox-title">
            <span class="lightbox-title-tip">
                {{ lightTitle || '图片预览' }}
            </span>
            <span class="lightbox-title-num">({{ currentImgIndex+1 || 0 }}/{{ lightImgs.length || 0 }})【{{currentTitle||'IMG'+currentImgIndex+1}}】</span>
            <p>
                <i class="lightbox-download plugin plugin-download" @click="downloadImg"></i>
                <i v-show="isScale" @click="scaleImg" class="plugin plugin-fullscreen-exit"></i>
                <i v-show="!isScale" @click="scaleImg" class="plugin plugin-fullscreen"></i>
                <i @click="closeLightBox" class="plugin plugin-times"></i>
            </p>
        </div>
        <div class="lightbox-content">
            <div class="lightbox-ls">
                <div class="lightbox-arrow la-left" @click="prevImg">
                    <i class="plugin plugin-arrow-left"></i>
                </div>
                <ul>
                    <li @click="scaleMouseImg" :style="{'cursor': `${currentScale > 0.4 ? 'zoom-out' : 'zoom-in'}`}">
                        <a :href="currentSrc || ''" target="_blank">
                            <img :style="{'transform': `scale(${currentScale})`, 'cursor': `${currentScale > 0.4 ? 'zoom-out' : 'zoom-in'}`}" :src="currentSrc || ''" alt="">
                        </a>
                    </li>
                </ul>
                <div class="lightbox-arrow la-right" @click="nextImg">
                    <i class="plugin plugin-arrow-right"></i>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    props: {
        lightTitle: {
            type: String
        },
        showLightBox: {
            type: Boolean,
            defalut: false
        },
        lightImgs: {
            type: Array,
            defalut: []
        },
        currentUrl: {
            type: String,
            defalut: ''
        },
        currentIndex: {
            type: Number,
            defalut: 0
        },
        currentText: {
            type: String,
            defalut: 'IMG'
        },
    },
    data() {
        return {
            isMouseUp: '',
            currentImgIndex: 0,
            currentScale: 1,
            currentSrc: '',
            isScale: false,
            currentTitle: '',
        }
    },
    watch: {
        'currentUrl': function (val) {
            this.currentSrc = val;
            this.scrollBar(false);
        },
        'currentIndex': function (val) {
            this.currentImgIndex = val;
            this.scrollBar(false);
        },
        'currentText': function (val) {
            this.currentTitle = val;
            this.scrollBar(false);
        },
    },
    mounted() {
        window.addEventListener('mousewheel',this.handleScroll);
        if (this.currentIndex) {
            this.currentImgIndex = this.currentIndex;
        }
        if (this.currentText) {
            this.currentTitle = this.currentText;
        }
        if (this.lightImgs.length) {
            this.currentSrc = this.lightImgs[this.currentImgIndex].src || 
            this.lightImgs[this.currentImgIndex].url;
        }
        this.scrollBar(true);
    },
    methods: {
        handleScroll (e) {
            this.isMouseUp = e.deltaY > 0 ? false : true;
            if (this.isMouseUp && this.currentScale < 3) {
                this.currentScale += 0.2;
            }
            if (!this.isMouseUp && this.currentScale > 0.4) {
                this.currentScale -= 0.2;
            }
        },
        scaleImg () {
            this.isScale = !this.isScale;
            if (!this.isScale) {
                this.fullScreenCancel();
            } else {
                this.fullScreenOpen();
            }
        },
        scaleMouseImg () {
            if (this.currentScale < 3) {
                this.currentScale += 0.2;
            }
            if (this.currentScale > 0.4) {
                this.currentScale -= 0.2;
            }
        },
        async downloadImg () {
            let url = this.currentSrc;
            let extName = this.currentSrc.split('/');
            extName = extName[extName.length-1];
            extName = extName.indexOf('?') > -1 ? extName.split('?')[0] : extName;
            let data = await fetch(url);
            let blob = await data.blob();
            let donwBtn = document.createElement('a');
            donwBtn.download = 'xqlight-'+extName;
            donwBtn.href = URL.createObjectURL(blob);
            document.body.appendChild(donwBtn);
            donwBtn.click();
            URL.revokeObjectURL(blob);
            document.body.removeChild(donwBtn);
        },
        closeLightBox () {
            this.scrollBar(true);
            this.$emit('hideLightBox');
        },
        prevImg () {
            if (this.currentImgIndex == 0) {
                this.currentImgIndex = this.lightImgs.length;
            }
            if (this.currentImgIndex > 0 && this.currentImgIndex <= this.lightImgs.length) {
                this.currentImgIndex -=1;
            }
            this.currentScale = 1;
            this.currentSrc = this.lightImgs[this.currentImgIndex].src ||
            this.lightImgs[this.currentImgIndex].url;
            this.currentTitle = this.lightImgs[this.currentImgIndex].title ||
            this.lightImgs[this.currentImgIndex].name;
        },
        nextImg () {
            if (this.currentImgIndex == this.lightImgs.length - 1) {
                this.currentImgIndex = 0;
            } else {
                this.currentImgIndex +=1;
            }
            this.currentScale = 1;
            this.currentSrc = this.lightImgs[this.currentImgIndex].src ||
            this.lightImgs[this.currentImgIndex].url;
            this.currentTitle = this.lightImgs[this.currentImgIndex].title ||
            this.lightImgs[this.currentImgIndex].name;
        },
        fullScreenOpen () {
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
        },

        fullScreenCancel () {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            } else if (document.msExitFullscreen) {
                document.msExitFullscreen();
            } else if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitCancelFullScreen) {
                document.webkitCancelFullScreen();
            }
        },
        scrollBar (flag) {
            if (flag) {
                document.body.style.overflow = '';
            } else {
                document.body.style.overflow = 'hidden';
            }
        }
    },
}
</script>

<style scoped>
@font-face {
  font-family: "plugin"; /* Project id 3684399 */
  src: url('../fonts/iconfont.eot?t=1664700514597'); /* IE9 */
  src: url('../fonts/iconfont.eot?t=1664700514597#iefix') format('embedded-opentype'), /* IE6-IE8 */
       url('../fonts/iconfont.woff2?t=1664700514597') format('woff2'),
       url('../fonts/iconfont.woff?t=1664700514597') format('woff'),
       url('../fonts/iconfont.ttf?t=1664700514597') format('truetype'),
       url('../fonts/iconfont.svg?t=1664700514597#plugin') format('svg');
}

.plugin {
  font-family: "plugin" !important;
  font-size: 16px;
  font-style: normal;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

.plugin-search-minus:before {
  content: "\e82c";
}

.plugin-search-plus:before {
  content: "\e82d";
}

.plugin-times:before {
  content: "\e65c";
}

.plugin-fullscreen-exit:before {
  content: "\e7ec";
}

.plugin-download:before {
  content: "\e66c";
}

.plugin-arrow-left:before {
  content: "\e685";
}

.plugin-arrow-right:before {
  content: "\e687";
}

.plugin-fullscreen:before {
  content: "\e641";
}
</style>

<style lang="scss" scoped>
    $white: #fff;
    .lightbox {
        position: fixed;
        top: 0;
        left: 0;
        bottom: 0;
        right: 0;
        width: 100%;
        height: 100vh;
        background: rgba($color: #000000, $alpha: .7);
        overflow: hidden;
        z-index: 9999;
        .lightbox-title {
            display: flex;
            justify-content: space-between;
            padding: 0 20px;
            width: 100%;
            height: 60px;
            line-height: 60px;
            color: $white;
            font-size: 18px;
            overflow: hidden;
            span {
                display: inline-block;
                font-size: 16px;
                overflow: hidden;
                text-overflow: ellipsis;
                white-space: nowrap;
                &.lightbox-title-tip {
                    width: 65px;
                }
                &.lightbox-title-num {
                    width: 600px;
                    text-align: center;
                }
            }
            p {
                position: relative;
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-right: 20px;
                width: 120px;
                height: 60px;
                i {
                    display: inline-block;
                    width: 60px;
                    height: 60px;
                    line-height: 60px;
                    text-align: center;
                    font-size: 20px;
                    color: $white;
                    cursor: pointer;
                }
            }
        }
        .lightbox-content {
            flex: 1;
            position: relative;
            display: flex;
            justify-content: center;
            align-items: center;
            box-sizing: border-box;
            padding: 20px;
            width: 100%;
            height: 100%;
            .lightbox-ls {
                box-sizing: border-box;
                padding: 0 50px;
                width: 100%;
                height: 100%;
                overflow: hidden;
                ul {
                    flex: 1;
                    width: 100%;
                    height: 90%;
                    overflow: hidden;
                    li {
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        flex-shrink: 0;
                        width: 100%;
                        height: 100%;
                        text-align: center;
                        img {
                            display: inline-block;
                            max-width: 700px;
                            width: auto;
                            height: auto;
                        }
                    }
                }
                .lightbox-arrow {
                    position: absolute;
                    top: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    width: 50px;
                    height: 100%;
                    cursor: pointer;
                    i {
                        font-size: 35px;
                        color: $white;
                    }
                    &.la-left {
                        left: 0;
                    }
                    &.la-right {
                        right: 0;
                    }
                }
            }
        }
    }
    
    @media all and (max-width:768px) and (min-width: 319px) {
        .lightbox {
            .lightbox-title {
                span {
                    &.lightbox-title-num {
                        flex: 1;
                    }
                }
            }
            .lightbox-content {
                .lightbox-ls {
                    width: 95%;
                    height: 60%;
                }
            }
        }
    }
</style>