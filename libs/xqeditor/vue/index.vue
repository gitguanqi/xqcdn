<template>
    <div
        :class="{'xqeditor-editor': true, 'scale': this.editor.isScale, 'preview': this.editor.isPreview, 'edit': this.editor.isEdit}">
        <div class="xqeditor-editor-set">
            <div class="xqeditor-editor-set-title">
                <i class="fa fa-edit"></i>
                <span>XQ Editor</span>
            </div>
            <div class="xqeditor-editor-set-btn">
                <button title="粗体" @click="addEditor('bold')">
                    <i title="粗体" class="fa fa-bold"></i>
                </button>
                <button title="斜体" @click="addEditor('italic')">
                    <i title="斜体" class="fa fa-italic"></i>
                </button>
                <button title="引用" @click="addEditor('quote')">
                    <i title="引用" class="fa fa-quote-left"></i>
                </button>
                <button title="列表" @click="addEditor('list')">
                    <i title="列表" class="fa fa-list"></i>
                </button>
                <button title="链接" @click="addEditor('link')">
                    <i title="链接" class="fa fa-link"></i>
                </button>
                <button class="file" title="图片">
                    <i title="图片" class="fa fa-image"></i>
                    <input type="file" name="file" id="file" accept="image/*" @change="uploadImg">
                </button>
                <button title="代码块" @click="addEditor('code')">
                    <i title="代码块" class="fa fa-code"></i>
                </button>
                <button title="代码段" @click="addEditor('codeBlock')">
                    <i title="代码段" class="fa fa-file-code"></i>
                </button>
                <button title="表格" @click="addEditor('table')">
                    <i title="表格" class="fa fa-table"></i>
                </button>
                <button title="只显示编辑框" @click="toggleEditorMode('edit')">
                    <i title="只显示编辑框" class="fa fa-eye-slash"></i>
                </button>
                <button title="只显示预览" @click="toggleEditorMode('preview')">
                    <i title="只显示预览" class="fa fa-desktop"></i>
                </button>
                <button title="缩放" @click="scaleEditor">
                    <i title="缩放" class="fa fa-arrows-alt"></i>
                </button>
                <button title="信息" @click="showEditorInfo">
                    <i title="信息" class="fa fa-info-circle"></i>
                </button>
            </div>
        </div>
        <div class="xqeditor-editor-ipt">
            <div class="xqeditor-editor-code scroll-box">
                <div id="markdown-code">
                    <div name="leftnum" id="leftnum" wrap="soft"></div>
                    <textarea name="code" class="scroll-box" id="code" wrap="soft" v-model="editor.value"
                        @scroll="changeScroll" @keyup="showLineNum($event)" @change="showPreview"
                        @input="showPreview"></textarea>
                </div>
            </div>
            <div class="xqeditor-editor-preview">
                <div id="xqeditor-preview" class="markdown-body scroll-box" v-html="editor.preview"></div>
            </div>
        </div>
        <div class="xqeditor-editor-status">
            <p>字数:<strong>{{editor.words}}</strong>,行数:<strong>{{editor.lineNum}}</strong>
            </p>
            <p>
                <input type="checkbox" v-model="editor.isScroll"><span>同步滚动</span>
                <span class="xqeditor-editor-gotop" @click="goTop">到顶部</span>
            </p>
        </div>
        <div class="xqeditor-info" v-show="editor.isInfo" @click="editor.isInfo = false;">
            <div class="xqeditor-info-close"><i class="fa fa-times"></i></div>
            <h2><i class="fa fa-edit"></i> XQ Editor</h2>
            <div>
                <p>小奇编辑器是一款轻巧的Markdown编辑器，包含最常用的功能。</p>
                <p>目前版本：V0.0.1</p>
                <p>作者：gitguanqi</p>
                <p>联系方式：<a href="mailto:contact@guanqi.xyz"><i class="fa fa-envelope"></i> contact@guanqi.xyz</a></p>
                <p>源码地址：<a href="https://github.com/gitguanqi/xqeditor/" target="_blank">Github <i
                            class="fa fa-share"></i></a></p>
            </div>
        </div>

    </div>
</template>

<script>
    export default {
        name: 'xqeditor',
        props: {
            content: {
                type: String,
                required: true,
            },
            url: {
                type: String,
            },
        },
        data() {
            return {
                editor: {
                    value: '',
                    preview: '',
                    words: 0,
                    lineNum: 0,
                    isScroll: true,
                    isScale: false,
                    isPreview: false,
                    isEdit: false,
                    isInfo: false,
                },
                upload: {
                    type: 'image',
                    url: '',
                }
            }
        },
        watch: {
            'content': function (val) {
                this.editor.value = val;
                this.showEditor(this.editor.value);
            },
            'url': function (val) {
                if (!val) {
                    document.querySelector('#file').value = '';
                    return false;
                };
                this.upload.url = val;
                this.addEditor(this.upload.type, this.upload.url);
            }
        },
        mounted() {
            this.editor.value = this.editor.value;
            this.showEditor(this.editor.value);
        },
        methods: {
            // 显示编辑器
            showEditor(value = '') {
                // 计算输入框行数
                this.showLineNum({
                    target: {
                        value: this.editor.value,
                    }
                });

                // 显示预览区
                this.showPreview();
                // 计算字数和行数
                this.calcWordAndLine(value);
            },

            // 计算左侧行数
            showLineNum(e) {
                let leftNum = document.getElementById('leftnum');
                let text = e.target.value;
                text = text.replace(/\r/gi, '');
                text = text.split('\n');
                let n = text.length;
                let num = '';
                for (let i = 1; i < n + 1; i++) {
                    num += i + '\n';
                }
                leftNum.innerText = num;
                num = '';
            },

            // 监听滚动
            changeScroll() {
                let preview = document.getElementById('xqeditor-preview');
                let leftnum = document.getElementById('leftnum');
                let code = document.getElementById('code');
                leftnum.scrollTop = code.scrollTop;
                if (this.editor.isScroll) {
                    preview.scrollTop = code.scrollTop + 100;
                }
            },

            // 显示预览
            showPreview() {
                let val = this.editor.value;
                let md = markdownit({
                    highlight: (str, lang) => {
                        if (lang && hljs.getLanguage(lang)) {
                            try {
                                return hljs.highlight(lang, str).value;
                            } catch (err) {
                                throw new Error(err);
                            }
                        }
                        return '';
                    }
                });
                var result = md.render(val);
                this.editor.preview = result;
                this.calcWordAndLine(val);
            },

            // 计算行数
            calcWordAndLine(val) {
                if (val) {
                    let word = val.length;
                    let line = val.split('\n').length;
                    this.editor.words = word;
                    this.editor.lineNum = line;
                }
            },

            // 到顶部
            goTop() {
                let preview = document.getElementById("xqeditor-preview");
                let code = document.querySelector("#code");
                preview.scrollTop = 0;
                code.scrollTop = 0;
            },

            // 获取值
            getVal () {
                return {
                    text: this.editor.value,
                    html: this.editor.preview,
                };
            },

            // 设置值
            setVal (value) {
                this.editor.value = value;
                this.showPreview();
            },

            // 操作按钮

            // 添加内容
            addEditor(type, url = '') {
                let val = this.editor.value;
                let contents = {
                    bold: '\n**加粗内容**\n',
                    italic: '\n*斜体内容*\n',
                    quote: '\n> 引用写这里\n',
                    image: (url) => {
                        return `\n![图片描述](${url})\n`;
                    },
                    list: '\n+ 列表项目一\n',
                    link: '\n[链接名称](链接地址)\n',
                    code: '\n`code`\n',
                    codeBlock: '\n```js\ncode block\n```\n',
                    table: `\n |表头|表头| \n |----|----| \n |单元格|单元格| \n |单元格|单元格| \n`,
                }
                let addVal = contents[type];
                if (type == 'image') {
                    addVal = contents.image(url);
                }
                val += addVal;
                this.editor.value = val;
                this.showPreview();
                this.showLineNum({
                    target: {
                        value: val,
                    }
                });
            },

            // 上传图片
            async uploadImg(e) {
                let files = e.target.files;
                this.$emit('uploadImg', files);
            },

            // 显示预览/编辑
            toggleEditorMode(type) {
                if (type == 'edit') {
                    this.editor.isPreview = false;
                    this.editor.isEdit = !this.editor.isEdit;
                } else {
                    this.editor.isEdit = false;
                    this.editor.isPreview = !this.editor.isPreview;
                }
            },

            // 伸缩编辑器
            scaleEditor() {
                this.editor.isScale = !this.editor.isScale;
            },

            // 显示编辑器信息
            showEditorInfo() {
                this.editor.isInfo = true;
            },
        },
    }
</script>

<style lang="less" scoped>
    .xqeditor-editor {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        border: 1px solid fadeout(@nine, 50);

        .xqeditor-editor-set {
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-sizing: border-box;
            padding: 0 10px;
            height: 50px;
            font-size: 14px;
            border-bottom: 1px solid fadeout(@nine, 50);

            .xqeditor-editor-set-title {
                color: @three;

                i {
                    margin-right: 10px;
                }
            }

            .xqeditor-editor-set-btn {
                button {
                    position: relative;
                    padding: 0 10px;
                    font-size: 16px;
                    color: @six;
                    border: none;
                    background: none;
                    cursor: pointer;

                    &:hover {
                        color: @three;
                    }

                    &.file {
                        input {
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100%;
                            height: 100%;
                            opacity: 0;
                            cursor: pointer;
                        }
                    }
                }
            }
        }

        .xqeditor-editor-ipt {
            display: flex;
            justify-content: space-between;
            width: 100%;
            height: 500px;
            overflow: hidden;

            .xqeditor-editor-code {
                flex: 1;
                box-sizing: border-box;
                width: 50%;
                height: 100%;
                border-right: 2px solid @f8;
                overflow: hidden;

                #markdown-code {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    background: fadeout(@f8, 50);

                    #leftnum {
                        position: absolute;
                        left: 0;
                        top: 0;
                        box-sizing: border-box;
                        padding: 10px 10px 10px 5px;
                        width: 45px;
                        height: 100%;
                        min-width: 45px;
                        max-width: 45px;
                        min-height: 100%;
                        max-height: 100%;
                        background: @f8;
                        border: none;
                        border-right: 1px solid fadeout(@nine, 50);
                        font-size: 16px;
                        line-height: 1.5;
                        text-align: right;
                        outline: none;
                        color: @three;
                        overflow: hidden;
                    }

                    #code {
                        box-sizing: border-box;
                        padding: 10px 85px 10px 55px;
                        width: 100%;
                        height: 100%;
                        max-width: 100%;
                        max-height: 100%;
                        min-width: 100%;
                        min-height: 100%;
                        font-size: 16px;
                        line-height: 1.5;
                        border: none;
                        outline: none;
                        color: @three;
                        background: @white;
                    }
                }
            }

            .xqeditor-editor-preview {
                flex: 1;
                width: 50%;
                box-sizing: border-box;
                height: 100%;
                overflow: hidden;

                .markdown-body {
                    box-sizing: border-box;
                    padding: 20px 10px;
                    height: 100%;
                    overflow-x: hidden;
                    overflow-y: auto;
                }
            }
        }

        .xqeditor-editor-status {
            box-sizing: border-box;
            padding: 0 10px;
            display: flex;
            justify-content: space-between;
            height: 35px;
            line-height: 35px;
            color: @six;
            font-size: 14px;
            background: @white;
            border-top: 1px solid fadeout(@nine, 80);

            .xqeditor-editor-gotop {
                margin-left: 8px;
                cursor: pointer;
            }
        }

        .xqeditor-info {
            position: absolute;
            left: 50%;
            top: 50%;
            margin-left: -160px;
            margin-top: -120px;
            box-sizing: border-box;
            padding: 20px;
            width: 320px;
            height: 240px;
            background: #fff;
            box-shadow: 0 0 5px #ccc;
            z-index: 3;

            h2 {
                margin-bottom: 10px;
                text-align: center;
                font-size: 16px;
                line-height: 2;
            }

            p {
                font-size: 14px;
                line-height: 1.8;
            }

            a {
                color: rgb(8, 70, 128);
            }

            .xqeditor-info-close {
                position: absolute;
                top: 10px;
                right: 0;
                width: 30px;
                height: 30px;
                cursor: pointer;
                i {
                    font-size: 18px;
                }
            }
        }

        &.scale {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100vh;
            background: @white;
            overflow: hidden;
            z-index: 99;

            .xqeditor-editor-ipt {
                height: calc(100vh - 50px);
            }
        }

        &.preview {
            .xqeditor-editor-code {
                display: none;
            }
        }

        &.edit {
            .xqeditor-editor-preview {
                display: none;
            }
        }
    }

    @media all and (max-width: 768px) {
        .xqeditor-editor {
            .xqeditor-editor-set {
                align-items: flex-start;
                flex-direction: column;
                padding: 10px;
                height: 110px;

                .xqeditor-editor-set-title {
                    margin-bottom: 20px;
                    padding-left: 10px;
                }

                .xqeditor-editor-set-btn {
                    display: flex;
                    flex-flow: row wrap;
                    justify-content: flex-start;

                    button {
                        margin-bottom: 5px;
                        padding: 0 10px;
                    }
                }
            }

            .xqeditor-editor-ipt {
                flex-direction: column;

                .xqeditor-editor-code,
                .xqeditor-editor-preview {
                    width: 100%;
                    height: 200px;
                }

                .xqeditor-editor-code {
                    #markdown-code {
                        #code {
                            padding-right: 10px;
                        }
                    }
                }

                .xqeditor-editor-code {
                    border-bottom: 1px solid fadeout(@nine, 50);
                }
            }
        }
    }
</style>