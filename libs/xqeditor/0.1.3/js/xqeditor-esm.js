// src/template.ts
var EDITOR_TEMPLATE = `
<div class="xqeditor-editor">
    <div class="xqeditor-editor-set">
        <div class="xqeditor-editor-set-title">
            <i class="fa fa-edit"></i>
            <span>XQ Editor</span>
        </div>
        <div class="xqeditor-editor-set-btn">
            <button type="button" class="xqeditor-bold" data-xq-action="bold" title="粗体">
                <i class="fa fa-bold"></i>
            </button>
            <button type="button" class="xqeditor-italic" data-xq-action="italic" title="斜体">
                <i class="fa fa-italic"></i>
            </button>
            <button type="button" class="xqeditor-quote" data-xq-action="quote" title="引用">
                <i class="fa fa-quote-left"></i>
            </button>
            <button type="button" class="xqeditor-list" data-xq-action="list" title="列表">
                <i class="fa fa-list"></i>
            </button>
            <button type="button" class="xqeditor-link" data-xq-action="link" title="链接">
                <i class="fa fa-link"></i>
            </button>
            <button type="button" class="file" title="图片">
                <i class="fa fa-image"></i>
                <input type="file" class="xqeditor-editor-file" accept="image/*">
            </button>
            <button type="button" class="xqeditor-code" data-xq-action="code" title="代码块">
                <i class="fa fa-code"></i>
            </button>
            <button type="button" class="xqeditor-code-block" data-xq-action="codeBlock" title="代码段">
                <i class="fa fa-file-code"></i>
            </button>
            <button type="button" class="xqeditor-table" data-xq-action="table" title="表格">
                <i class="fa fa-table"></i>
            </button>
            <button type="button" class="xqeditor-show-editor" data-xq-mode="edit" title="只显示编辑框">
                <i class="fa fa-eye-slash"></i>
            </button>
            <button type="button" class="xqeditor-show-preview" data-xq-mode="preview" title="只显示预览">
                <i class="fa fa-desktop"></i>
            </button>
            <button type="button" class="xqeditor-scale-editor" data-xq-scale title="缩放">
                <i class="fa fa-arrows-alt"></i>
            </button>
            <button type="button" class="xqeditor-show-info" data-xq-info title="信息">
                <i class="fa fa-info-circle"></i>
            </button>
        </div>
    </div>
    <div class="xqeditor-editor-ipt">
        <div class="xqeditor-editor-code scroll-box">
            <div class="xqeditor-editor-md">
                <div class="xqeditor-editor-line-num"></div>
                <textarea class="xqeditor-editor-input scroll-box" wrap="soft" spellcheck="false"></textarea>
            </div>
        </div>
        <div class="xqeditor-editor-preview">
            <div class="xqeditor-editor-preview-body markdown-body scroll-box"></div>
        </div>
    </div>
    <div class="xqeditor-editor-status">
        <p>字数:<strong class="xqeditor-editor-words">0</strong>,行数:<strong class="xqeditor-editor-lines">0</strong></p>
        <p>
            <input type="checkbox" class="xqeditor-editor-scroll-toggle" checked><span>同步滚动</span>
            <span class="xqeditor-editor-gotop">到顶部</span>
        </p>
    </div>
    <div class="xqeditor-info hide">
        <div class="xqeditor-info-close"><i class="fa fa-times"></i></div>
        <h2><i class="fa fa-edit"></i> XQ Editor</h2>
        <div>
            <p>小奇编辑器是一款轻巧的 Markdown 编辑器，包含最常用的功能。</p>
            <p>作者：gitguanqi</p>
            <p>源码地址：<a href="https://github.com/gitguanqi/xqeditor/" target="_blank" rel="noopener">Github <i class="fa fa-share"></i></a></p>
        </div>
    </div>
</div>
`;

// src/core.ts
var SNIPPETS = {
  bold: "\n**加粗内容**\n",
  italic: "\n*斜体内容*\n",
  quote: "\n> 引用写这里\n",
  list: "\n+ 列表项目一\n",
  link: "\n[链接名称](链接地址)\n",
  image: (url) => `
![图片描述](${url})
`,
  code: "\n`code`\n",
  codeBlock: "\n```js\ncode block\n```\n",
  table: "\n |表头|表头| \n |----|----| \n |单元格|单元格| \n |单元格|单元格| \n"
};
function escapeHtml(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function readGlobal(name) {
  const value = globalThis[name];
  return typeof value === "undefined" || value === null ? null : value;
}
function resolveContainer(el) {
  if (typeof el === "string") {
    const found = document.querySelector(el);
    if (!found) {
      throw new Error(`XqEditor: cannot find mount element "${el}".`);
    }
    return found;
  }
  return el;
}
function createState() {
  return {
    value: "",
    code: "",
    preview: "",
    words: 0,
    lineNum: 0,
    isScroll: true,
    isScale: false,
    isPreview: false,
    isEdit: false,
    isInfo: false,
    files: null
  };
}
var XqEditor = class {
  constructor(options) {
    this.editor = createState();
    this.upload = { type: "image", url: "" };
    this.abort = new AbortController();
    this.renderer = null;
    this.rendererResolved = false;
    this.scrollSource = null;
    var _a, _b;
    if (!options || !options.el) {
      throw new Error('XqEditor: "el" is required and must be a selector or element.');
    }
    this.options = options;
    this.container = resolveContainer(options.el);
    this.hljs = (_a = options.hljs) != null ? _a : readGlobal("hljs");
    this.wrapper = document.createElement("div");
    this.wrapper.className = "xqeditor";
    this.wrapper.innerHTML = EDITOR_TEMPLATE;
    this.container.appendChild(this.wrapper);
    this.root = this.pick(".xqeditor-editor");
    this.input = this.pick(".xqeditor-editor-input");
    this.lineNumEl = this.pick(".xqeditor-editor-line-num");
    this.previewBody = this.pick(".xqeditor-editor-preview-body");
    this.wordsEl = this.pick(".xqeditor-editor-words");
    this.linesEl = this.pick(".xqeditor-editor-lines");
    this.scrollToggle = this.pick(".xqeditor-editor-scroll-toggle");
    this.fileInput = this.pick(".xqeditor-editor-file");
    this.infoEl = this.pick(".xqeditor-info");
    this.bind();
    this.showEditor((_b = options.value) != null ? _b : "");
  }
  /**
   * Always look nodes up inside this instance's wrapper: two editors on the
   * same page would otherwise fight over the same document-wide selector.
   */
  pick(selector) {
    const node = this.wrapper.querySelector(selector);
    if (!node) {
      throw new Error(`XqEditor: editor markup is missing "${selector}".`);
    }
    return node;
  }
  bind() {
    const { signal } = this.abort;
    const on = (target, type, handler) => {
      target.addEventListener(type, handler, { signal });
    };
    on(this.input, "input", () => {
      this.updateLineNumbers();
      this.showPreview();
      this.notifyChange();
    });
    on(this.input, "scroll", () => {
      this.syncScroll("editor");
    });
    on(this.previewBody, "scroll", () => {
      this.syncScroll("preview");
    });
    on(this.scrollToggle, "change", () => {
      this.editor.isScroll = this.scrollToggle.checked;
    });
    on(this.fileInput, "change", () => {
      this.handleFiles();
    });
    this.wrapper.querySelectorAll("[data-xq-action]").forEach((button) => {
      on(button, "click", () => {
        this.addEditor(button.dataset.xqAction);
      });
    });
    this.wrapper.querySelectorAll("[data-xq-mode]").forEach((button) => {
      on(button, "click", () => {
        this.toggleEditorMode(button.dataset.xqMode);
      });
    });
    on(this.pick("[data-xq-scale]"), "click", () => {
      this.scaleEditor();
    });
    on(this.pick("[data-xq-info]"), "click", () => {
      this.showEditorInfo(true);
    });
    on(this.pick(".xqeditor-info-close"), "click", () => {
      this.showEditorInfo(false);
    });
    on(this.pick(".xqeditor-editor-gotop"), "click", () => {
      this.goTop();
    });
  }
  /** markdown-it is instantiated once and reused for every keystroke. */
  getRenderer() {
    var _a;
    if (this.rendererResolved) {
      return this.renderer;
    }
    this.rendererResolved = true;
    const factory = (_a = this.options.markdown) != null ? _a : readGlobal("markdownit");
    if (typeof factory !== "function") {
      this.renderer = null;
      return null;
    }
    const highlighter = this.hljs;
    this.renderer = factory(
      highlighter ? {
        highlight: (code, lang) => this.highlight(code, lang)
      } : void 0
    );
    return this.renderer;
  }
  /**
   * Returns '' when highlight.js cannot handle the fence, which makes
   * markdown-it fall back to its own escaping instead of failing the render.
   */
  highlight(code, lang) {
    if (!this.hljs || !lang || !this.hljs.getLanguage(lang)) {
      return "";
    }
    try {
      return this.hljs.highlight(code, { language: lang }).value;
    } catch (e) {
      return "";
    }
  }
  render(source) {
    const renderer = this.getRenderer();
    if (!renderer) {
      return `<pre>${escapeHtml(source)}</pre>`;
    }
    return renderer.render(source);
  }
  notifyChange() {
    var _a, _b;
    (_b = (_a = this.options).onChange) == null ? void 0 : _b.call(_a, this.getVal());
  }
  handleFiles() {
    var _a, _b;
    const files = this.fileInput.files;
    this.editor.files = files;
    if (files && files.length > 0) {
      (_b = (_a = this.options).onUploadImage) == null ? void 0 : _b.call(_a, files);
    }
  }
  syncScroll(source) {
    if (this.scrollSource && this.scrollSource !== source) {
      return;
    }
    if (!this.editor.isScroll) {
      this.lineNumEl.scrollTop = this.input.scrollTop;
      return;
    }
    const from = source === "editor" ? this.input : this.previewBody;
    const to = source === "editor" ? this.previewBody : this.input;
    const fromRange = from.scrollHeight - from.clientHeight;
    const toRange = to.scrollHeight - to.clientHeight;
    if (fromRange <= 0 || toRange <= 0) {
      this.lineNumEl.scrollTop = this.input.scrollTop;
      return;
    }
    const next = from.scrollTop / fromRange * toRange;
    if (Math.abs(to.scrollTop - next) < 1) {
      return;
    }
    this.scrollSource = source;
    to.scrollTop = next;
    this.lineNumEl.scrollTop = this.input.scrollTop;
    const release = () => {
      this.scrollSource = null;
    };
    if (typeof globalThis.requestAnimationFrame === "function") {
      globalThis.requestAnimationFrame(release);
    } else {
      queueMicrotask(release);
    }
  }
  updateLineNumbers() {
    const lines = this.input.value.replace(/\r\n?/g, "\n").split("\n").length;
    let text = "";
    for (let i = 1; i <= lines; i++) {
      text += `${i}
`;
    }
    this.lineNumEl.textContent = text;
  }
  calcWordAndLine(value) {
    const words = value.length;
    const lineNum = value ? value.split("\n").length : 0;
    this.editor.words = words;
    this.editor.lineNum = lineNum;
    this.wordsEl.textContent = String(words);
    this.linesEl.textContent = String(lineNum);
  }
  /** Render the editor from `value`, replacing whatever is on screen. */
  showEditor(value = this.editor.value) {
    this.editor.value = value;
    this.input.value = value;
    this.updateLineNumbers();
    this.showPreview();
  }
  /** Re-render the preview from the textarea content. */
  showPreview() {
    const source = this.input.value;
    const html = this.render(source);
    this.previewBody.innerHTML = html;
    this.editor.value = source;
    this.editor.code = source;
    this.editor.preview = html;
    this.calcWordAndLine(source);
  }
  goTop() {
    this.input.scrollTop = 0;
    this.previewBody.scrollTop = 0;
  }
  getVal() {
    return {
      text: this.input.value,
      html: this.previewBody.innerHTML
    };
  }
  setVal(value) {
    this.showEditor(value != null ? value : "");
    this.notifyChange();
  }
  addEditor(type, url = "") {
    const snippet = SNIPPETS[type];
    if (!snippet) {
      return;
    }
    const addition = typeof snippet === "function" ? snippet(url) : snippet;
    const next = this.input.value + addition;
    this.showEditor(next);
    this.notifyChange();
  }
  toggleEditorMode(type) {
    if (type === "edit") {
      this.editor.isPreview = false;
      this.editor.isEdit = !this.editor.isEdit;
      this.root.classList.remove("xqeditor-mode-preview");
      this.root.classList.toggle("xqeditor-mode-edit");
      return;
    }
    this.editor.isEdit = false;
    this.editor.isPreview = !this.editor.isPreview;
    this.root.classList.remove("xqeditor-mode-edit");
    this.root.classList.toggle("xqeditor-mode-preview");
  }
  scaleEditor() {
    this.editor.isScale = !this.editor.isScale;
    this.root.classList.toggle("xqeditor-expanded", this.editor.isScale);
  }
  showEditorInfo(show = true) {
    this.editor.isInfo = show;
    this.infoEl.classList.toggle("hide", !show);
  }
  /** Detach every listener and remove the editor from the DOM. */
  destroy() {
    this.abort.abort();
    this.wrapper.remove();
  }
};

// src/index.ts
var index_default = XqEditor;
export {
  XqEditor,
  index_default as default
};
