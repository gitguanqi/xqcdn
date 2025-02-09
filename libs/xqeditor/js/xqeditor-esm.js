function XqEditor(options = {
    el: '',
}) {
    this.options = options;
    if (!this.options.el) {
        throw new Error('XqEditor: el is must selector!');
    }
    this.editor = {
        value: '',
        preview: '',
        words: 0,
        lineNum: 0,
        isScroll: true,
        isScale: false,
        isPreview: false,
        isEdit: false,
        isInfo: false,
        files: null,
    }

    this.upload = {
        type: 'image',
        url: '',
    }

    this.initElem(document.querySelector(this.options.el));
}

XqEditor.prototype.initElem = function (container) {
    let xqeditor = document.createElement('div');
    xqeditor.className = 'xqeditor';
    xqeditor.innerHTML = `<div class="xqeditor-editor">
        <div class="xqeditor-editor-set">
            <div class="xqeditor-editor-set-title">
                <i class="fa fa-edit"></i>
                <span>XQ Editor</span>
            </div>
            <div class="xqeditor-editor-set-btn">
                <button title="粗体" class="xqeditor-bold">
                    <i title="粗体" class="fa fa-bold"></i>
                </button>
                <button title="斜体" class="xqeditor-italic">
                    <i title="斜体" class="fa fa-italic"></i>
                </button>
                <button title="引用" class="xqeditor-quote">
                    <i title="引用" class="fa fa-quote-left"></i>
                </button>
                <button title="列表" class="xqeditor-list">
                    <i title="列表" class="fa fa-list"></i>
                </button>
                <button title="链接" class="xqeditor-link">
                    <i title="链接" class="fa fa-link"></i>
                </button>
                <button class="file" title="图片">
                    <i title="图片" class="fa fa-image"></i>
                    <input type="file" name="file" id="file" accept="image/*">
                </button>
                <button title="代码块" class="xqeditor-code">
                    <i title="代码块" class="fa fa-code"></i>
                </button>
                <button title="代码段" class="xqeditor-code-block">
                    <i title="代码段" class="fa fa-file-code"></i>
                </button>
                <button title="表格" class="xqeditor-table">
                    <i title="表格" class="fa fa-table"></i>
                </button>
                <button title="只显示编辑框" class="xqeditor-show-editor">
                    <i title="只显示编辑框" class="fa fa-eye-slash"></i>
                </button>
                <button title="只显示预览" class="xqeditor-show-preview">
                    <i title="只显示预览" class="fa fa-desktop"></i>
                </button>
                <button title="缩放"  class="xqeditor-scale-editor">
                    <i title="缩放" class="fa fa-arrows-alt"></i>
                </button>
                <button title="信息" class="xqeditor-show-info">
                    <i title="信息" class="fa fa-info-circle"></i>
                </button>
            </div>
        </div>
        <div class="xqeditor-editor-ipt">
            <div class="xqeditor-editor-code scroll-box">
                <div id="markdown-code">
                    <div name="leftnum" id="leftnum" wrap="soft"></div>
                    <textarea name="code" class="scroll-box" id="code" wrap="soft"></textarea>
                </div>
            </div>
            <div class="xqeditor-editor-preview">
                <div id="xqeditor-preview" class="markdown-body scroll-box"></div>
            </div>
        </div>
        <div class="xqeditor-editor-status">
            <p>字数:<strong id="xqeditor-words">0</strong>,行数:<strong id="xqeditor-lineNum">0</strong>
            </p>
            <p>
                <input id="isScroll" checked type="checkbox"><span>同步滚动</span>
                <span class="xqeditor-editor-gotop">到顶部</span>
            </p>
        </div>
        <div class="xqeditor-info hide">
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
    `;
    container.appendChild(xqeditor);
    this.addEvent();
}

// 添加事件
XqEditor.prototype.addEvent = function () {
    let xqEditorScale = document.querySelector('.xqeditor-scale-editor'),
        xqEditorShowEditor = document.querySelector('.xqeditor-show-editor'),
        xqEditorBold = document.querySelector('.xqeditor-bold'),
        xqEditorItalic = document.querySelector('.xqeditor-italic'),
        xqEditorQuote = document.querySelector('.xqeditor-quote'),
        xqEditorList = document.querySelector('.xqeditor-list'),
        xqEditorLink = document.querySelector('.xqeditor-link'),
        xqEditorCode = document.querySelector('.xqeditor-code'),
        code = document.querySelector('#code'),
        file = document.querySelector('#file'),
        gotop = document.querySelector('.xqeditor-editor-gotop'),
        xqEditorCodeBlock = document.querySelector('.xqeditor-code-block'),
        xqEditorTable = document.querySelector('.xqeditor-table'),
        xqEditorShowPreview = document.querySelector('.xqeditor-show-preview'),
        xqEditorShowInfo = document.querySelector('.xqeditor-show-info'),
        xqEditorInfoClose = document.querySelector('.xqeditor-info-close');

    // go top
    gotop.addEventListener('click', () => {
        this.goTop();
    }, false);

    // scroll
    code.addEventListener('scroll', () => {
        this.changeScroll();
    }, false);
    code.addEventListener('keyup', (e) => {
        this.showLineNum(e);
    }, false);
    code.addEventListener('change', () => {
        this.showPreview();
    }, false);
    code.addEventListener('input', () => {
        this.showPreview();
    }, false);

    // add editor content
    xqEditorBold.addEventListener('click', () => {
        this.addEditor('bold');
    }, false);

    xqEditorItalic.addEventListener('click', () => {
        this.addEditor('italic');
    }, false);

    xqEditorQuote.addEventListener('click', () => {
        this.addEditor('quote');
    }, false);

    xqEditorList.addEventListener('click', () => {
        this.addEditor('list');
    }, false);

    xqEditorLink.addEventListener('click', () => {
        this.addEditor('link');
    }, false);

    xqEditorCode.addEventListener('click', () => {
        this.addEditor('code');
    }, false);

    xqEditorCodeBlock.addEventListener('click', () => {
        this.addEditor('codeBlock');
    }, false);

    xqEditorTable.addEventListener('click', () => {
        this.addEditor('table');
    }, false);

    file.addEventListener('change', (e) => {
        this.uploadImg(e);
    }, false);

    // show editor or preview
    xqEditorShowEditor.addEventListener('click', () => {
        this.toggleEditorMode('edit');
    }, false);

    xqEditorShowPreview.addEventListener('click', () => {
        this.toggleEditorMode('preview');
    }, false);

    // scale editor
    xqEditorScale.addEventListener('click', () => {
        this.scaleEditor();
    }, false);

    // show info
    xqEditorShowInfo.addEventListener('click', () => {
        this.showEditorInfo(true);
    }, false);

    // close info
    xqEditorInfoClose.addEventListener('click', () => {
        this.showEditorInfo(false);
    }, false);
}

// 显示编辑器
XqEditor.prototype.showEditor = function (value = '') {
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
}

// 计算左侧行数
XqEditor.prototype.showLineNum = function (e) {
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
}

// 监听滚动
XqEditor.prototype.changeScroll = function () {
    let preview = document.getElementById('xqeditor-preview');
    let leftnum = document.getElementById('leftnum');
    let code = document.getElementById('code');
    let isScroll = document.getElementById('isScroll');
    leftnum.scrollTop = code.scrollTop;
    if (isScroll.checked) {
        preview.scrollTop = code.scrollTop + 100;
    }
}

// 显示预览
XqEditor.prototype.showPreview = function () {
    let code = document.getElementById('code');
    let preview = document.getElementById('xqeditor-preview');
    let val = code.value;
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
    preview.innerHTML = result;
    this.editor.code = val;
    this.editor.preview = result;
    this.calcWordAndLine(val);
}

// 计算行数
XqEditor.prototype.calcWordAndLine = function (val) {
    let words = document.getElementById('xqeditor-words');
    let lineNum = document.getElementById('xqeditor-lineNum');
    if (val) {
        let word = val.length;
        let line = val.split('\n').length;
        words.innerText = word;
        lineNum.innerText = line;
    }
}

// 到顶部
XqEditor.prototype.goTop = function () {
    let preview = document.getElementById("xqeditor-preview");
    let code = document.querySelector("#code");
    preview.scrollTop = 0;
    code.scrollTop = 0;
}

// 获取值
XqEditor.prototype.getVal = function () {
    let preview = document.getElementById("xqeditor-preview");
    let code = document.querySelector("#code");
    return {
        text: code.value,
        html: preview.innerHTML,
    };
}

// 设置值
XqEditor.prototype.setVal = function (value) {
    let code = document.querySelector("#code");
    this.editor.value = value;
    code.value = value;
    this.showPreview();
}

// 操作按钮

// 添加内容
XqEditor.prototype.addEditor = function (type, url = '') {
    let code = document.getElementById('code');
    let val = code.value;
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
    code.value = val;
    this.showPreview();
    this.showLineNum({
        target: {
            value: val,
        }
    });
}

// 上传图片
XqEditor.prototype.uploadImg = async function (e) {
    let files = e.target.files;
    this.editor.files = files;
}

// 显示预览/编辑
XqEditor.prototype.toggleEditorMode = function (type) {
    let xqEditor = document.querySelector('.xqeditor-editor');
    if (type == 'edit') {
        this.editor.isPreview = false;
        this.editor.isEdit = !this.editor.isEdit;
        xqEditor.classList.remove('preview');
        xqEditor.classList.toggle('edit');
    } else {
        this.editor.isEdit = false;
        this.editor.isPreview = !this.editor.isPreview;
        xqEditor.classList.remove('edit');
        xqEditor.classList.toggle('preview');
    }
}

// 伸缩编辑器
XqEditor.prototype.scaleEditor = function () {
    let xqEditor = document.querySelector('.xqeditor-editor');
    this.editor.isScale = !this.editor.isScale;
    if (this.editor.isScale) {
        xqEditor.classList.add('scale');
    } else {
        xqEditor.classList.remove('scale');
    }
}

// 显示编辑器信息
XqEditor.prototype.showEditorInfo = function (show) {
    let infoBox = document.querySelector('.xqeditor-info');
    if (show) {
        infoBox.classList.remove('hide');
    } else {
        infoBox.classList.add('hide');
    }
}

export default XqEditor;
