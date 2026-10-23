# 第三方组件声明

本仓库再分发的第三方前端资源，版权归各自作者所有，按其原始许可证分发。
每个版本目录下的 `LICENSE` / `NOTICE` 是从上游取得、或按上游要求补充的许可文本。

## npm 自动同步

由 `node scripts/sync.mjs --apply` 从 registry.npmjs.org 拉取；许可证取自包元数据。

| 本地目录 | npm 包 | 版本 | 许可证 |
| --- | --- | --- | --- |
| `axios` | `axios` | 0.19.2, 1.20.0 | MIT |
| `bootstrap` | `bootstrap` | 3.4.1, 4.6.0, 5.0.2, 5.3.8 | MIT |
| `codemirror` | `codemirror` | 5.63.3 | MIT |
| `dashjs` | `dashjs` | 3.2.2 | BSD-3-Clause |
| `dplayer` | `dplayer` | 1.26.0 | MIT |
| `echarts` | `echarts` | 5.1.2 | Apache-2.0 |
| `fingerprintjs` | `@fingerprintjs/fingerprintjs` | 3.3.0 | MIT |
| `flv.js` | `flv.js` | 1.5.0, 1.6.1 | Apache-2.0 |
| `font-awesome` | `@fortawesome/fontawesome-free` | 5.15.3 | (CC-BY-4.0 AND OFL-1.1 AND MIT) |
| `highlight` | `@highlightjs/cdn-assets` | 11.0.1 | BSD-3-Clause |
| `hls.js` | `hls.js` | 1.0.4, 1.0.8 | Apache-2.0 |
| `html5shiv` | `html5shiv` | 3.7.3 | see LICENSE |
| `jquery` | `jquery` | 1.11.3, 1.12.4, 2.2.4, 3.6.0 | MIT |
| `jsrsasign` | `jsrsasign` | 10.4.1, 10.5.27 | MIT |
| `lodash.js` | `lodash` | 4.17.21 | MIT |
| `markdown-it` | `markdown-it` | 12.2.0 | MIT |
| `moment.js` | `moment` | 2.29.1 | MIT |
| `mux.js` | `mux.js` | 5.11.0 | Apache-2.0 |
| `redux` | `redux` | 4.1.2 | MIT |
| `respond` | `respond.js` | 1.4.2 | see LICENSE |
| `shaka-player` | `shaka-player` | 3.2.0 | Apache-2.0 |
| `socket.io` | `socket.io-client` | 4.1.3 | MIT |
| `vue` | `vue` | 2.6.14 | MIT |
| `vue-router` | `vue-router` | 3.0.2 | MIT |
| `vuex` | `vuex` | 3.0.1 | MIT |
| `webtorrent` | `webtorrent` | 1.0.1 | MIT |
| `xlsxjs` | `xlsx` | 0.17.4 | Apache-2.0 |
| `xqclip` | `xqclip` | 0.0.1, 0.0.3, 0.1.3 | MIT |
| `xqeditor` | `xqeditor` | 0.0.1, 0.1.3 | MIT |
| `xqgjs` | `xqgjs` | 1.0.3, 1.0.4, 1.0.5, 1.1.1, 2.1.0 | MIT |
| `xqi18n` | `xqi18n` | 0.0.3, 0.2.0 | MIT |
| `xqisIe` | `xqisie` | 0.0.6, 0.2.0 | MIT |
| `xqlib-cli` | `xqlib-cli` | 1.1.3, 1.2.0 | MIT |
| `xqlight` | `xqlight` | 0.2.0, 0.3.1, 0.3.4, 0.3.5, 0.3.6, 0.6.0 | MIT |
| `xqmsg` | `xqmsg` | 0.0.1, 0.0.2, 0.2.0 | MIT |
| `xqmusic-player` | `xqmusic-player` | 1.0.5, 1.4.1 | MIT |
| `xqshare` | `xqshare` | 0.0.1, 0.0.3, 0.0.5, 0.1.3 | MIT |
| `xqtime` | `xqtime` | 0.0.4, 0.0.9, 0.2.1 | GPL-3.0 / MIT |
| `xquuid` | `xquuid` | 0.0.6, 0.1.1 | MIT |

## 官方 CDN 直取

npm 上没有对应版本，改从项目官方 CDN 按文件直取。首次拉取即把 sha512 写进清单，之后每次校验。

| 本地目录 | 版本 | 来源 | 许可证 |
| --- | --- | --- | --- |
| `jquery` | 1.10.0 | code.jquery.com · `jquery.js`, `jquery.min.js` | MIT |

## 第三方副本 · 无上游

这些目录是历史副本，上游没有可校验的同版本产物，因此不做自动同步。
版权归原作者；本仓库仅按原样镜像，权利人如有异议可随时移除。

| 本地目录 | 版本 | 许可证 | 版权 / 说明 |
| --- | --- | --- | --- |
| `fireworks` | 0.0.1 | 未标注 | 未标注（存档副本，版权归原作者）；来源不明、无许可头，仅作历史副本保留；新版请用 fireworks-js |
| `jquery-qrcode` | 1.0 | 未标注 | 未标注（存档副本，版权归原作者）；文件内未声明许可，按上游 lrsjng/jquery-qrcode 的 MIT 对待；目录名非 semver，npm 仅有 1.0.0 且内容不同 |
| `jquery-running` | 1.0.0 | MIT | Copyright (c) 2007-2015 Qietu inc；qietu 私有分发（文件头声明 MIT），无公开上游 |
| `opensans` | 0.0.1 | Apache-2.0 | Digitized data copyright (c) 2010-2011, Google Corporation. Open Sans is a trademark of Google.；字体为 Open Sans 1.10（Apache-2.0，版权归 Google，Ascender 设计）；npm 无 opensans 包，最接近的 open-sans-fontface@1.4.0 虽同为 1.10 但 16 个文件中 13 个哈希不同、且没有本套 CSS，故不作自动同步源 |
| `xlsxjs` | 0.0.1 | Apache-2.0 | 未标注（存档副本，版权归原作者）；SheetJS 早期全量构建，npm xlsx 无 0.0.1；同目录 0.17.4 带 Apache-2.0 LICENSE |

### Open Sans 说明

`opensans/0.0.1` 里的字体是 **Open Sans 1.10**（2011 年版），字体内嵌 name 表声明：
`Digitized data copyright (c) 2010-2011, Google Corporation.`、
`Licensed under the Apache License, Version 2.0`，设计方 Ascender Corp.（Steve Matteson），
`Open Sans` 是 Google 的商标。因此按 **Apache-2.0** 分发，许可全文见 `libs/opensans/0.0.1/LICENSE`，
署名见同目录 `NOTICE`。目录里的 `css/opensans*.css` 是二次改写的 `@font-face` 包装（字体族名改为
`opensans*` / `opensansBold`），不是上游文件，按本仓库 MIT 授权。

## 本仓库自有

`xq*` 系列由本仓库作者维护，随根目录 `LICENSE`（MIT）分发。已发布到 npm 的版本见上表自动同步，
以下版本 npm 上尚未发布，仍为手工维护：

- `xqisIe` 0.0.1：npm 未发布该版本，保持手工维护
- `xqlight` 0.0.6：npm 未发布该版本，保持手工维护
- `xqlight` 0.0.7：npm 未发布该版本，保持手工维护
- `xqmusic-player` 0.0.1：npm 未发布该版本，保持手工维护
- `xqonline` 0.0.1
- `xqsql` 1.0.2：npm 未发布该版本，保持手工维护
- `xqvideo` 0.0.1

## 主题

`fancyindex/` 基于 [llorephie/ngx-fancyindex-theme-bootstrap](https://github.com/llorephie/ngx-fancyindex-theme-bootstrap)，
MIT License, Copyright (c) 2017 Maxim Martyanov。原始许可全文见 `fancyindex/LICENSE`。

## 其它

- `soft/nginx/ngx-fancyindex.zip`：ngx-fancyindex 模块，BSD-2-Clause（Aperez 等作者）。
- `soft/nginx/Nginx-Fancyindex-Theme*.zip`：主题包，MIT（Lilian Besson / 上游作者）。
