> 中文 | [English](README.md)

# XQCDN

版本化的前端静态资源库。所有库按 `库名/版本/文件` 组织，可长期缓存；`libs/` 由脚本同步（npm 官方源为主，个别历史版本走上游 CDN 或手工维护），不再手工拷贝。

- 在线地址：<https://xqgj.cc/xqcdn/libs>
- 目录浏览：nginx + [fancyindex](https://github.com/llorephie/ngx-fancyindex-theme-bootstrap) 主题（`fancyindex/`）
- 静态镜像：GitHub Pages（`dist/` 构建产物，支持二级目录）

## 引用方式

```html
<!-- 版本化（推荐，可永久缓存） -->
<script src="https://xqgj.cc/xqcdn/libs/jquery/3.6.0/jquery.min.js"></script>
<script src="https://xqgj.cc/xqcdn/libs/axios/0.19.2/axios.min.js"></script>
<link rel="stylesheet" href="https://xqgj.cc/xqcdn/libs/bootstrap/5.3.8/css/bootstrap.min.css">
<script src="https://xqgj.cc/xqcdn/libs/bootstrap/5.3.8/js/bootstrap.bundle.min.js"></script>
<link rel="stylesheet" href="https://xqgj.cc/xqcdn/libs/font-awesome/5.15.3/css/all.min.css">

<!-- 浮动最新版（旧写法，仍可用；nginx 或构建产物负责指向最新版本） -->
<script src="https://xqgj.cc/xqcdn/libs/jquery/jquery.min.js"></script>
```

三种路径都合法：

| 形式 | 示例 | 说明 |
| --- | --- | --- |
| 版本目录 | `/libs/{库}/{版本}/{文件}` | 权威路径，内容不变，`Cache-Control: immutable` |
| 版本目录 + 布局 | `/libs/{库}/{版本}/css/x.css`、`/js/x.js` | 部分库保留了上游的 `css/`、`js/` 子目录 |
| 扁平最新版 | `/libs/{库}/{文件}` | 始终指向最新版本，短缓存 |

机器可读的清单：

| 文件 | 用途 |
| --- | --- |
| `/libs/index.json` | 全量清单：每个库的版本、文件、大小、sha256 |
| `/libs/{库}/latest.json` | 该库最新版指针 |
| `/libs/{库}/README.md` | 该库的引用示例 |
| `/libs/SHA256SUMS` | 全量校验和 |

## 源类型

清单里的每条 `库@版本` 都有明确的 `source`，决定它能不能自动同步（具体维护步骤见 [维护流程](#维护流程)）：

| `source` | 含义 | 例子 |
| --- | --- | --- |
| `npm` | 从 registry.npmjs.org 拉 tarball，校验 `integrity` | bootstrap 5.3.8、vue 2.6.14、xqclip 0.0.3 |
| `url` | npm 上没有该版本，按文件直链从上游 CDN 取，首次拉取把 sha512 钉进清单 | jquery 1.10.0（code.jquery.com） |
| `manual` | 没有可校验的上游，只登记不下载；`upstream: "none"` 表示第三方历史副本 | opensans 0.0.1、xqvideo 0.0.1 |

> bootstrap 只保留 3.4.1 / 4.6.0 / 5.0.2 / 5.3.8；2.3.2 上游已无可校验产物、且缺 glyphicons 图片，已移除。

## 目录结构

```
libs/            版本化静态库（由 scripts/sync.mjs 生成，勿手改）
libs.manifest.json   同步清单：哪个目录对应哪个 npm 包、哪个版本、取哪些文件
scripts/         同步 / 生成 / 校验 / 构建脚本（零依赖，Node >= 18）
deploy/          nginx 配置：fancyindex-app.conf、nginx.conf.example、latest/*.conf
fancyindex/      nginx 目录列表主题（基于上游 MIT 主题，见 fancyindex/LICENSE）
img/ fonts/      站点零散图片与字体
soft/            自用工具与 nginx 模块压缩包（附 SHA256SUMS）
404.html         自包含错误页（零外部依赖）
```

## 维护流程

前置：Node.js >= 18，无需 `npm install`（脚本零依赖）。

库的维护分两条路线，按清单里的 `source` 选择：**A. 自动拉取**（npm / url）或 **B. 手动维护**（manual）。

### A. 自动拉取（source = npm / url）

适用于能从 npm 官方源或上游 CDN 直接取产物的库：绝大多数第三方库，以及已发 npm 的自有库（xq\* 系列）。

**① 新增一个版本（只写清单，不下载）**

```bash
node scripts/sync.mjs --add axios@1.7.9   # 登记指定版本
node scripts/sync.mjs --add vue           # 不写版本号 = 登记 npm latest
```

新增后需补 `files` 规则：每条 `{"from": "tarball 内路径", "to": "libs/ 内路径"}`（url 源写 `{"url": "直链", "to": "..."}`），再落地。

**② 落地到磁盘**

```bash
node scripts/sync.mjs --apply                 # 全部 npm/url 源
node scripts/sync.mjs --apply --only axios    # 只同步一个库（支持「库」或「库@版本」）
node scripts/sync.mjs --apply --offline       # 仅用 .cache/tarballs 里已缓存的包
node scripts/sync.mjs --apply --force         # 覆盖被手工改过的条目
```

`--apply` 会：拉 tarball → 校验 integrity(sha512) → 按 `files` 抽取 dist 构建产物 → 写入 `libs/{库}/{版本}/` → 刷新指纹。

**③ 升级到最新版**

```bash
node scripts/sync.mjs --upgrade                 # 全量体检（dry-run，不写盘）
node scripts/sync.mjs --upgrade axios           # 单个库：先验证新版文件规则仍能命中
node scripts/sync.mjs --upgrade axios --apply   # 落地 + 回写清单 + 自动重建索引
node scripts/sync.mjs --upgrade axios,vue --force   # 越过 PIN_NOTES 主版本锁定
```

- 默认 **dry-run**；点名某个库时才下载并验证文件规则。
- `scripts/lib/sources.mjs` 的 `PIN_NOTES` 是保护名单（vue、jquery、echarts、codemirror…），不改主版本，除非 `--force`。
- 没点名的库若跨大版本（如 markdown-it 12 → 15）会跳过只提示；点名即视为确认跳变。
- 新版文件改名导致旧规则失效：`--upgrade` 写盘前会报错并列出缺失文件（目录不会被写坏）；按提示给 `files` 补正确的 `"from"` 再跑一次。
- npm 上没有目标版本时（如历史 bootstrap 2.3.2）：把该条改成 `source: "url"` 并给每条规则写 `url`（参考 jquery 1.10.0），或标 `source: "manual"` + `upstream: "none"` 说明原因。

**④ 重建派生文件**

```bash
node scripts/index.mjs    # 生成 index.json / 每库 README / SHA256SUMS / deploy/latest/*.conf / THIRD-PARTY-NOTICES.md
```

**⑤ 检查**

```bash
node scripts/sync.mjs --check     # 磁盘与记录指纹一致（CI 红线）
node scripts/sync.mjs --audit     # 清单声明与上游归档是否漂移
node scripts/validate.mjs         # 引用缺失 / 空文件 / 许可证覆盖 / 版本号 / 源声明
```

### B. 手动维护（source = manual）

适用于**没有可校验上游**的库：第三方历史副本（如 opensans 字体，Apache-2.0）、以及未发 npm 的自有库（xqvideo、xqonline）。这类库**不下载、只登记**，文件由你手工放进 `libs/`。

**① 手工放入文件**

```
libs/{库}/{版本}/
├── some.js
├── some.css
└── ...
```

例如 `libs/opensans/0.0.1/css/opensans.css`、`libs/opensans/0.0.1/fonts/OpenSans-Bold.woff2`。

**② 登记到清单**

在 `libs.manifest.json` 的 `packages` 数组里加一条（或先 `node scripts/sync.mjs --add opensans@0.0.2 --source manual` 生成骨架，再补 `files`）：

```json
{
  "name": "opensans",
  "version": "0.0.1",
  "source": "manual",
  "files": [
    { "to": "css/opensans.css" },
    { "to": "fonts/OpenSans-Bold.woff2" }
  ]
}
```

要点：

- `source: "manual"` 且**不带 `pkg`**：表示不下载、只登记。
- `files` 里只写 `to`（磁盘相对路径），列清该版本包含哪些文件即可；不像 npm 源那样需要 `from`。
- 第三方库请同时在 `THIRD-PARTY-NOTICES.md` 注明版权与许可（opensans 的 Apache-2.0 版权见该文件）。

**③ 刷新指纹**

```bash
node scripts/sync.mjs --adopt
```

`--adopt` 用磁盘现状重建 `.meta.json` 指纹；对已登记条目它**只刷指纹、从不改动 `source`**，所以手动条目不会被偷偷改成 npm。

**④ 重建 + 检查**

```bash
node scripts/index.mjs
node scripts/sync.mjs --check
node scripts/validate.mjs
```

**更新已有手动版本**：直接改 `libs/{库}/{版本}/` 下的文件 → 重新 `--adopt` 刷新指纹 → `--index` → `--check`。不要手改 `.meta.json`。

### 通用脚本要点

- **只读 tarball，不执行任何包脚本**，不跑 `postinstall`。
- 下载缓存放在 `.cache/tarballs/`，校验 `integrity`（sha512）后才解包；`url` 源复用同一缓存，`--offline` 同样可用。
- 写入前做 EOL 无关比较（`sha256Loose`），已一致的文件不会被重写，避免无意义 diff。
- 清单里标记 `source: "npm"` / `"url"` 的条目若被手工改过，`--apply` 会拒绝覆盖，需显式 `--force`。
- `--adopt` 只刷新指纹，不会把手工维护的条目偷偷改成 npm。
- 上游构建里指向 `unpkg.com` 之类的绝对地址，用条目的 `rewritePaths` 改回本 CDN（如 `xqshare`），这样自动化不会改变线上行为。

## 部署

### A. nginx（主站）

需要 `ngx_http_fancyindex_module` 与 `ssi on`，并把 `deploy/latest/*.conf` 纳入 include：

```nginx
server {
    root  /data/www;
    ssi   on;

    error_page 404 /404.html;
    location = /404.html { internal; }

    location /fancyindex/ { alias /data/www/fancyindex/; }

    # 扁平旧 URL -> 最新版本目录
    include /etc/nginx/xqcdn/latest/*.conf;

    # 挂在站点根
    location /      { include /etc/nginx/xqcdn/fancyindex-app.conf; }

    # 同时挂在二级目录
    location /cqcdn/ { alias /data/www/; include /etc/nginx/xqcdn/fancyindex-app.conf; }
}
```

完整示例（含两类 `Cache-Control`、双挂载、独立 document root 的写法）见 `deploy/nginx.conf.example`。
面包屑与首页链接的前缀由 `fancyindex/js/main.js` 依据 `#nginx-fancyindex-directory` 自动推导，所以 `/libs/` 与 `/cqcdn/libs/` 都不用改配置。

### B. GitHub Pages（静态镜像）

GitHub Pages 没有 fancyindex / SSI / rewrite，因此用构建产物替代：

```bash
node scripts/build.mjs --base /xqcdn/     # 项目站点 https://<user>.github.io/xqcdn/
node scripts/build.mjs --base /           # 用户站点 https://<user>.github.io/
```

构建会：为每个目录生成 `index.html`（复用同一套主题，搜索与面包屑行为一致）、把扁平最新版 URL 复制成真实文件、写入 `.nojekyll`。
推送到 `main` 后 `.github/workflows/pages.yml` 自动发布；`ci.yml` 负责 `sync --check`、派生文件是否已提交、`validate`、`build` 冒烟。

## 脚本一览

| 命令 | 作用 |
| --- | --- |
| `node scripts/sync.mjs --adopt` | 用磁盘现状重建清单（迁移/救急用） |
| `node scripts/sync.mjs --check` | 校验磁盘与记录指纹一致，CI 防线 |
| `node scripts/sync.mjs --apply` | 下载并落地（npm / url 两种源；`--only` 支持 `库` 或 `库@版本`、`--offline`、`--force`） |
| `node scripts/sync.mjs --add 包@版本` | 登记新版本 |
| `node scripts/sync.mjs --upgrade [库]` | 升级到最新版（默认 dry-run，`--apply` 落地） |
| `node scripts/sync.mjs --bump` | `--upgrade` 的别名（旧写法保留） |
| `node scripts/sync.mjs --audit` | 检查清单与上游归档漂移 |
| `node scripts/index.mjs` | 生成 `index.json`、每库 README、`SHA256SUMS`、`deploy/latest/*.conf`、`THIRD-PARTY-NOTICES.md`、`soft/SHA256SUMS` |
| `node scripts/validate.mjs` | 静态检查：HTML/CSS 引用、空文件、sourceMappingURL、许可证覆盖、版本号一致性、源声明合法性 |
| `node scripts/build.mjs` | 生成 GitHub Pages 产物（默认 `dist/`） |
| `node scripts/clean-duplicates.mjs` | 清理历史上手工复制到库根目录的重复文件（默认 dry-run） |

## 许可

- 本仓库脚本与自有内容：MIT（见 `LICENSE`）。
- `fancyindex/` 主题来自 [llorephie/ngx-fancyindex-theme-bootstrap](https://github.com/llorephie/ngx-fancyindex-theme-bootstrap)，MIT，`Copyright (c) 2017 Maxim Martyanov`；原始许可全文见 `fancyindex/LICENSE`，修改说明见 `fancyindex/README.md`。
- `libs/` 下各组件的版权与许可归其作者所有，逐版本随包附带 `LICENSE`，汇总见 `THIRD-PARTY-NOTICES.md`。

## 反馈

[提交 issue](https://github.com/gitguanqi/xqcdn/issues/new) · 作者 [@gitguanqi](https://github.com/gitguanqi)
