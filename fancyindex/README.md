# fancyindex 主题（自定义）

本目录是 XQCDN 的目录列表主题，**由本仓库作者原创编写**，不再基于任何第三方 fancyindex 主题。

## 文件

| 文件 | 作用 |
| --- | --- |
| `header.html` | 页面头部片段：样式/脚本引用 + 顶部导航、面包屑、搜索与筛选 UI（`[data-fi-app]` 容器开头，含 `<main id="fi-content">` 开标签） |
| `footer.html` | 页面尾部片段：空状态、页脚，以及 `<main>` 闭标签与 `fancy-index.js` 模块脚本 |
| `fancy-index.css` | 主题样式（自包含，无外部字体/图片依赖，图标均为内联 SVG） |
| `fancy-index.js` | 渐进增强脚本（`type="module"`），读取原生 fancyindex 表格并加入搜索、排序、类型筛选、深浅色切换 |
| `fancy-index-bootstrap.js` | 轻量引导脚本：根据 `localStorage` 还原主题、补 `<meta viewport>`、设置 `<html lang>` |

## 设计要点

- **片段式（fragment）渲染**：`header.html` / `footer.html` 只提供 chrome 片段，由 nginx 的 `fancyindex_header` / `fancyindex_footer` 注入到原生目录列表两侧；`fancy-index.js` 再对原生表格做渐进增强。
- **无第三方框架**：不依赖 Bootstrap / jQuery，样式与脚本均为自写，体积更小、可控。
- **原生表格优先**：若 `fancy-index.js` 未能找到可增强的表格（例如禁用 JS 或部署环境差异），页面自动回退为 Nginx 原生目录列表，不会白屏。
- **客户端推导路径**：面包屑与标题由 `fancy-index.js` 依据 `window.location.pathname` 在浏览器端生成，因此一级目录（`/`）与二级目录（`/xqcdn/`）均无需单独配置。

## 资源路径

主题资源统一使用站点绝对路径 `/fancyindex/...`（构建时会按发布子路径自动改写为 `${base}fancyindex/...`）。需保证该路径在站点根可访问，nginx 侧配置见 `deploy/nginx.conf.example` 的 `location /fancyindex/`。

## 许可

本主题为本仓库原创内容，随仓库根目录 `LICENSE`（MIT）分发。
