# fancyindex 主题

nginx 目录列表主题，用于把 `libs/`、`img/`、`soft/` 渲染成可浏览、可搜索的页面。

## 来源与许可

本目录基于 **[llorephie/ngx-fancyindex-theme-bootstrap](https://github.com/llorephie/ngx-fancyindex-theme-bootstrap)**
（作者 [Maxim Martyanov](https://llorephie.me/)，MIT 许可，见 `LICENSE`）。

- 上游版权声明与许可全文保留在 `fancyindex/LICENSE`，未做任何修改。
- 本目录在上游快照基础上由 **gitguanqi（2026）** 修改，修改点见下。
- 页脚的作者署名链接必须保留（MIT 义务之一）。

## 文件

| 文件 | 作用 |
| --- | --- |
| `header.html` | 页面头部；nginx 会把当前目录路径注入到最后一个未闭合标签 `h1#nginx-fancyindex-directory` |
| `footer.html` | 页脚与脚本；同时提供 `#previewModal` 之外的收尾标签 |
| `js/main.js` | 搜索、面包屑、页脚年份 |
| `js/jquery-3.3.1.slim.min.js`、`js/bootstrap.min.js` | Bootstrap 4 运行依赖 |
| `css/bootstrap.min.css`、`css/main.css` | 样式 |
| `img/bg_pattern.png` | 背景纹理 |

## 部署

```nginx
ssi on;                                      # 每目录模板（.directory_index.html）依赖它
fancyindex on;
fancyindex_localtime on;
fancyindex_exact_size off;
fancyindex_name_length 255;
fancyindex_header "/fancyindex/header.html";
fancyindex_footer "/fancyindex/footer.html";
```

主题资源用**站点绝对路径** `/fancyindex/...`。因此无论站点的目录列表挂在 `/` 还是挂在
`/cqcdn/` 这类二级目录，都需要保证 `/fancyindex/` 在站点根可访问：

```nginx
location /fancyindex/ { alias /data/www/fancyindex/; }
```

完整示例见 `deploy/nginx.conf.example`。

## 相对上游的修改

1. **搜索**：用户输入不再拼进 `RegExp`（输入 `(`、`[`、`*` 曾导致 `SyntaxError`，搜索整页失效）；
   改为多关键词字面量匹配，加 150ms 防抖、输入法组合期忽略、空结果提示、Esc 清空、阻止 Enter 提交刷新。
2. **面包屑**：不再用 `location.host + "/"` 拼路径（会丢掉二级目录前缀），改为由
   `#nginx-fancyindex-directory` 与 `location.pathname` 反推挂载前缀；目录名做编码，末段渲染为非链接。
3. **健壮性**：`#list` / `#search` / `#breadcrumbs` / `#year` 全部判空，初始化拆成三个独立函数并各自
   `try/catch`，单点失败不再中断整页脚本。
4. **移除** 上游没有的 `mourn.min.js`（会在每个目录页跨域 `fetch` 远程 JSON，并把整站强制灰度）。
5. **中文界面**：`lang="zh-CN"`、导航与文案中文化、补 `aria-label` / `role="status"`。
6. **样式**：背景图改为相对 CSS 的 `url('../img/bg_pattern.png')`；补 `.footer` 吸底样式；
   去掉重复的 `margin-bottom` 声明；字体栈补中文字体。
7. 页脚品牌链接与本仓库统一，署名链接保留并补 `rel="noopener noreferrer"`。

## 与仓库其他部分的关系

- `scripts/index.mjs` 会生成静态目录页（GitHub Pages 用），复用本目录的 `main.css` / `main.js`，
  因此两种渲染方式（nginx 动态、静态页）行为一致。
- 主题内不含 `layout` 数据，目录内容完全由 nginx / 静态构建提供。
