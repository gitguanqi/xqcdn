// @ts-check

export const THEME_STORAGE_KEY = 'fancy-index:theme';

/**
 * @typedef {'folder' | 'image' | 'document' | 'archive' | 'media' | 'code' | 'other'} Category
 * @typedef {'name-asc' | 'name-desc' | 'modified-desc' | 'modified-asc' | 'size-desc' | 'size-asc'} SortValue
 * @typedef {{
 *   name: string;
 *   href: string;
 *   isDirectory: boolean;
 *   isParent: boolean;
 *   category: Category;
 *   extension: string;
 *   modified: number | null;
 *   size: number | null;
 *   sourceIndex: number;
 * }} Entry
 * @typedef {{ query: string; category: Category | 'all'; sort: SortValue }} ViewState
 */

const CATEGORY_LABELS = Object.freeze({
  folder: '文件夹',
  image: '图片',
  document: '文档',
  archive: '压缩包',
  media: '音视频',
  code: '代码',
  other: '其他',
});

const EXTENSION_GROUPS = Object.freeze({
  image: [
    'avif',
    'bmp',
    'gif',
    'heic',
    'ico',
    'jpeg',
    'jpg',
    'png',
    'svg',
    'tif',
    'tiff',
    'webp',
  ],
  document: [
    'csv',
    'doc',
    'docx',
    'epub',
    'md',
    'odt',
    'pdf',
    'ppt',
    'pptx',
    'rtf',
    'txt',
    'xls',
    'xlsx',
  ],
  archive: ['7z', 'bz2', 'gz', 'rar', 'tar', 'tgz', 'xz', 'zip'],
  media: [
    'aac',
    'avi',
    'flac',
    'm4a',
    'mkv',
    'mov',
    'mp3',
    'mp4',
    'ogg',
    'opus',
    'wav',
    'webm',
  ],
  code: [
    'c',
    'cc',
    'cpp',
    'css',
    'go',
    'h',
    'html',
    'java',
    'js',
    'json',
    'jsx',
    'mdx',
    'php',
    'py',
    'rs',
    'scss',
    'sh',
    'sql',
    'svelte',
    'toml',
    'ts',
    'tsx',
    'vue',
    'xml',
    'yaml',
    'yml',
  ],
});

/** @type {Record<string, Category>} */
const EXTENSION_CATEGORIES = {};

for (const [category, extensions] of Object.entries(EXTENSION_GROUPS)) {
  for (const extension of extensions) {
    EXTENSION_CATEGORIES[extension] = /** @type {Category} */ (category);
  }
}

const VALID_CATEGORIES = new Set([
  'all',
  'folder',
  'image',
  'document',
  'archive',
  'media',
  'code',
  'other',
]);

const VALID_SORTS = new Set([
  'name-asc',
  'name-desc',
  'modified-desc',
  'modified-asc',
  'size-desc',
  'size-asc',
]);

const ICON_PATHS = Object.freeze({
  folder: [
    'M3.5 7.5A2.5 2.5 0 0 1 6 5h3.2l1.8 2h7A2.5 2.5 0 0 1 20.5 9.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z',
  ],
  parent: ['m9 6-6 6 6 6', 'M3 12h18'],
  image: [
    'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z',
    'm5 16 4-4 3 3 2-2 5 5',
    'M15.5 8.5h.01',
  ],
  document: [
    'M7 3.5h6l4 4v13H7v-17Z',
    'M13 3.5v4h4',
    'M9.5 12h5',
    'M9.5 15.5h5',
  ],
  archive: ['M5 8h14v11.5H5V8Z', 'M4 4.5h16V8H4V4.5Z', 'M10 11h4'],
  media: [
    'M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5v-13Z',
    'm10 9 5 3-5 3V9Z',
  ],
  code: ['m8 7-5 5 5 5', 'm16 7 5 5-5 5', 'm13.5 4-3 16'],
  other: ['M7 3.5h6l4 4v13H7v-17Z', 'M13 3.5v4h4'],
});

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

/**
 * Returns the lowercase extension without the leading dot.
 *
 * @param {string} name
 * @returns {string}
 */
export function getExtension(name) {
  const normalized = name.trim().replace(/\/+$/, '');
  const separator = normalized.lastIndexOf('.');

  if (separator <= 0 || separator === normalized.length - 1) {
    return '';
  }

  return normalized.slice(separator + 1).toLowerCase();
}

/**
 * @param {string} name
 * @param {boolean} [isDirectory]
 * @returns {Category}
 */
export function getCategory(name, isDirectory = false) {
  if (isDirectory) {
    return 'folder';
  }

  return EXTENSION_CATEGORIES[getExtension(name)] ?? 'other';
}

/**
 * @param {string} value
 * @returns {number | null}
 */
export function parseSize(value) {
  const normalized = value.trim().replace(/\s+/g, ' ');

  if (!normalized || /^[-—–]$/.test(normalized)) {
    return null;
  }

  const match = normalized.match(
    /^([\d.,]+)\s*(B|KB|KIB|MB|MIB|GB|GIB|TB|TIB)?$/i,
  );

  if (!match) {
    return null;
  }

  const amount = Number(match[1].replace(/,/g, ''));

  if (!Number.isFinite(amount)) {
    return null;
  }

  const unit = (match[2] ?? 'B').toUpperCase();
  /** @type {Record<string, number>} */
  const powers = {
    B: 0,
    KB: 1,
    KIB: 1,
    MB: 2,
    MIB: 2,
    GB: 3,
    GIB: 3,
    TB: 4,
    TIB: 4,
  };
  const multiplier = 1024 ** (powers[unit] ?? 0);

  return Math.round(amount * multiplier);
}

/**
 * @param {string} value
 * @returns {number | null}
 */
export function parseModified(value) {
  const normalized = value.trim();

  if (!normalized || /^[-—–]$/.test(normalized)) {
    return null;
  }

  const timestamp = Date.parse(normalized.replace(' ', 'T'));

  return Number.isNaN(timestamp) ? null : timestamp;
}

/**
 * @param {number | null} bytes
 * @returns {string}
 */
export function formatSize(bytes) {
  if (bytes === null) {
    return '—';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const units = ['KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes / 1024;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = value >= 10 ? 0 : 1;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

/**
 * @param {string | null | undefined} value
 * @returns {value is 'light' | 'dark'}
 */
export function isSavedTheme(value) {
  return value === 'light' || value === 'dark';
}

/**
 * @param {string | null | undefined} storedTheme
 * @param {boolean} prefersDark
 * @returns {'light' | 'dark'}
 */
export function resolveTheme(storedTheme, prefersDark) {
  if (isSavedTheme(storedTheme)) {
    return storedTheme;
  }

  return prefersDark ? 'dark' : 'light';
}

/**
 * @param {string | null | undefined} value
 * @returns {value is SortValue}
 */
export function isSortValue(value) {
  return typeof value === 'string' && VALID_SORTS.has(value);
}

/**
 * @param {string | null | undefined} value
 * @returns {value is Category | 'all'}
 */
export function isCategoryValue(value) {
  return typeof value === 'string' && VALID_CATEGORIES.has(value);
}

/**
 * @param {Entry} entry
 * @param {string} query
 * @param {Category | 'all'} category
 * @returns {boolean}
 */
export function matchesEntry(entry, query, category) {
  const normalizedQuery = query.trim().toLocaleLowerCase('zh-CN');
  const matchesQuery =
    !normalizedQuery ||
    entry.name.toLocaleLowerCase('zh-CN').includes(normalizedQuery);
  const matchesCategory = category === 'all' || entry.category === category;

  return matchesQuery && matchesCategory;
}

/**
 * Keeps directories first and uses source order as a stable tie breaker.
 *
 * @param {Entry} left
 * @param {Entry} right
 * @param {SortValue} sort
 * @returns {number}
 */
export function compareEntries(left, right, sort) {
  const directoryOrder = Number(right.isDirectory) - Number(left.isDirectory);

  if (directoryOrder !== 0) {
    return directoryOrder;
  }

  const descending = sort.endsWith('-desc');
  const direction = descending ? -1 : 1;
  let comparison = 0;

  if (sort.startsWith('name-')) {
    comparison =
      left.name.localeCompare(right.name, 'zh-CN', {
        numeric: true,
        sensitivity: 'base',
      }) * direction;
  } else if (sort.startsWith('modified-')) {
    comparison = compareNullableNumbers(
      left.modified,
      right.modified,
      direction,
    );
  } else {
    comparison = compareNullableNumbers(left.size, right.size, direction);
  }

  if (comparison !== 0) {
    return comparison;
  }

  return left.sourceIndex - right.sourceIndex;
}

/**
 * @param {number | null} left
 * @param {number | null} right
 * @param {number} direction
 * @returns {number}
 */
function compareNullableNumbers(left, right, direction) {
  if (left === null && right === null) {
    return 0;
  }

  if (left === null) {
    return 1;
  }

  if (right === null) {
    return -1;
  }

  return (left - right) * direction;
}

/**
 * @param {HTMLTableElement} table
 * @returns {Entry[]}
 */
export function extractEntries(table) {
  const headerCells = Array.from(table.tHead?.rows[0]?.cells ?? []);
  const headers = headerCells.map(
    (cell) => cell.textContent?.trim().toLocaleLowerCase('zh-CN') ?? '',
  );
  /**
   * @param {string[]} patterns
   * @returns {number}
   */
  const findColumn = (patterns) =>
    headers.findIndex((header) =>
      patterns.some((pattern) => header.includes(pattern)),
    );
  const sourceRows = Array.from(table.tBodies).flatMap((body) =>
    Array.from(body.rows),
  );

  /** @type {Entry[]} */
  const entries = [];
  let nextSourceIndex = 0;

  for (const row of sourceRows) {
    const cells = Array.from(row.cells);
    const nameColumn = findColumn(['name', '名称', '文件名']);
    const modifiedColumn = findColumn([
      'last modified',
      'modified',
      'date',
      'time',
      '修改',
      '日期',
      '时间',
    ]);
    const sizeColumn = findColumn(['size', '大小']);
    const resolvedNameColumn = nameColumn >= 0 ? nameColumn : 0;
    const resolvedModifiedColumn =
      modifiedColumn >= 0 ? modifiedColumn : Math.max(1, cells.length - 2);
    const resolvedSizeColumn =
      sizeColumn >= 0 ? sizeColumn : Math.max(0, cells.length - 1);
    const nameCell = cells[resolvedNameColumn];
    const anchor = nameCell?.querySelector('a');

    if (!anchor) {
      continue;
    }

    const rawName = anchor.textContent?.trim() ?? '';

    if (!rawName) {
      continue;
    }

    const href = anchor.getAttribute('href') ?? '#';
    const isParent =
      rawName === '../' ||
      rawName === '..' ||
      href === '../' ||
      href.endsWith('/../');
    const isDirectory =
      !isParent &&
      (row.classList.contains('directory') ||
        rawName.endsWith('/') ||
        href.endsWith('/'));
    const name = isParent ? '..' : rawName.replace(/\/+$/, '');
    const modifiedText = cells[resolvedModifiedColumn]?.textContent ?? '';
    const sizeText = cells[resolvedSizeColumn]?.textContent ?? '';

    entries.push({
      name,
      href,
      isDirectory,
      isParent,
      category: getCategory(name, isDirectory),
      extension: getExtension(name),
      modified: parseModified(modifiedText),
      size: isDirectory ? null : parseSize(sizeText),
      sourceIndex: nextSourceIndex,
    });
    nextSourceIndex += 1;
  }

  return entries;
}

/**
 * @param {Category} category
 * @param {boolean} isParent
 * @param {string} extension
 * @returns {SVGSVGElement}
 */
function createIcon(category, isParent, extension) {
  const svg = document.createElementNS(SVG_NAMESPACE, 'svg');
  const iconKey = isParent ? 'parent' : category;
  const paths =
    ICON_PATHS[iconKey] ??
    ICON_PATHS[extension === 'pdf' ? 'document' : 'other'];

  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');

  for (const pathData of paths) {
    const path = document.createElementNS(SVG_NAMESPACE, 'path');
    path.setAttribute('d', pathData);
    svg.appendChild(path);
  }

  return svg;
}

/**
 * @param {Entry} entry
 * @returns {HTMLTableRowElement}
 */
function createEntryRow(entry) {
  const row = document.createElement('tr');
  row.dataset.category = entry.category;
  row.dataset.entryIndex = String(entry.sourceIndex);

  const nameCell = document.createElement('td');
  nameCell.className = 'fi-cell fi-cell--name';
  nameCell.dataset.label = '名称';

  const anchor = document.createElement('a');
  anchor.className = 'fi-entry-link';
  anchor.href = entry.href;
  anchor.title = entry.isParent ? '返回上级目录' : entry.name;

  if (entry.isParent) {
    anchor.classList.add('fi-entry-link--parent');
  }

  const icon = document.createElement('span');
  icon.className = 'fi-file-icon';
  icon.dataset.category = entry.category;
  icon.appendChild(createIcon(entry.category, entry.isParent, entry.extension));

  const name = document.createElement('span');
  name.className = 'fi-entry-name';
  name.textContent = entry.isParent ? '返回上级目录' : entry.name;

  anchor.append(icon, name);
  nameCell.appendChild(anchor);

  const typeCell = document.createElement('td');
  typeCell.className = 'fi-cell fi-cell--type';
  typeCell.dataset.label = '类型';

  const type = document.createElement('span');
  type.className = 'fi-type-badge';
  type.textContent = entry.isParent
    ? '上级'
    : entry.isDirectory
      ? CATEGORY_LABELS.folder
      : entry.extension
        ? entry.extension.toUpperCase()
        : '文件';
  typeCell.appendChild(type);

  const dateCell = document.createElement('td');
  dateCell.className = 'fi-cell fi-cell--date';
  dateCell.dataset.label = '修改时间';
  dateCell.textContent =
    entry.modified === null
      ? '—'
      : new Intl.DateTimeFormat('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(entry.modified);

  const sizeCell = document.createElement('td');
  sizeCell.className = 'fi-cell fi-cell--size';
  sizeCell.dataset.label = '大小';
  sizeCell.textContent = entry.isDirectory ? '—' : formatSize(entry.size);

  row.append(nameCell, typeCell, dateCell, sizeCell);
  return row;
}

/**
 * @returns {HTMLTableElement}
 */
function createEnhancedTable() {
  const table = document.createElement('table');
  table.className = 'fi-list';
  table.setAttribute('aria-label', '文件目录');

  const caption = document.createElement('caption');
  caption.className = 'fi-sr-only';
  caption.textContent = '当前目录中的文件和文件夹';

  const head = document.createElement('thead');
  const headRow = document.createElement('tr');

  for (const label of ['名称', '类型', '修改时间', '大小']) {
    const cell = document.createElement('th');
    cell.scope = 'col';
    cell.textContent = label;
    headRow.appendChild(cell);
  }

  head.appendChild(headRow);
  table.append(caption, head);
  return table;
}

/**
 * @param {ParentNode} root
 * @param {string} selector
 * @returns {HTMLElement}
 */
function requireElement(root, selector) {
  for (const candidate of Array.from(root.querySelectorAll(selector))) {
    if (candidate instanceof HTMLElement) {
      return candidate;
    }
  }

  throw new Error(`Missing theme element: ${selector}`);
}

/**
 * @param {ParentNode} root
 * @returns {void}
 */
function renderBreadcrumb(root) {
  const breadcrumb = requireElement(root, '[data-fi-breadcrumb]');
  const titleNode = requireElement(root, '[data-fi-title]');
  const pathNode = requireElement(root, '[data-fi-path]');
  const currentPath = window.location.pathname || '/';
  const decodedPath = safelyDecodePath(currentPath);
  const segments = decodedPath.split('/').filter(Boolean);

  breadcrumb.replaceChildren();
  breadcrumb.appendChild(createBreadcrumbLink('根目录', '/'));

  for (let index = 0; index < segments.length; index += 1) {
    const separator = document.createElement('span');
    separator.className = 'fi-breadcrumb__separator';
    separator.textContent = '/';
    separator.setAttribute('aria-hidden', 'true');
    breadcrumb.appendChild(separator);

    const segment = segments[index] ?? '';
    const isCurrent = index === segments.length - 1;
    const href = `/${segments
      .slice(0, index + 1)
      .map((part) => encodeURIComponent(part))
      .join('/')}/`;

    if (isCurrent) {
      const current = document.createElement('span');
      current.className = 'fi-breadcrumb__current';
      current.setAttribute('aria-current', 'page');
      current.textContent = segment;
      breadcrumb.appendChild(current);
    } else {
      breadcrumb.appendChild(createBreadcrumbLink(segment, href));
    }
  }

  const pageTitle = segments.at(-1) ?? '文件浏览';
  titleNode.textContent = pageTitle;
  pathNode.textContent = decodedPath;
  document.title = `${pageTitle} · 文件目录`;
}

/**
 * @param {string} label
 * @param {string} href
 * @returns {HTMLAnchorElement}
 */
function createBreadcrumbLink(label, href) {
  const link = document.createElement('a');
  link.href = href;
  link.textContent = label;
  return link;
}

/**
 * @param {string} path
 * @returns {string}
 */
function safelyDecodePath(path) {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

/**
 * @param {ParentNode} root
 * @returns {void}
 */
function initThemeToggle(root) {
  const button = requireElement(root, '[data-fi-theme-toggle]');
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

  const syncButton = () => {
    const current = resolveTheme(
      document.documentElement.dataset.theme ?? readStoredTheme(),
      mediaQuery.matches,
    );
    const next = current === 'dark' ? '浅色' : '深色';
    button.setAttribute('aria-label', `切换至${next}主题`);
    button.setAttribute('title', `切换至${next}主题`);
  };

  button.addEventListener('click', () => {
    const current = resolveTheme(
      document.documentElement.dataset.theme ?? readStoredTheme(),
      mediaQuery.matches,
    );
    const nextTheme = current === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = nextTheme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The selected theme still applies for the current page.
    }

    syncButton();
  });

  mediaQuery.addEventListener('change', () => {
    if (!readStoredTheme()) {
      syncButton();
    }
  });

  syncButton();
}

/**
 * @returns {'light' | 'dark' | null}
 */
function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isSavedTheme(stored) ? stored : null;
  } catch {
    return null;
  }
}

/**
 * @param {HTMLElement} app
 * @returns {void}
 */
function setFallbackState(app) {
  app.dataset.fiState = 'fallback';
  const status = app.querySelector('[data-fi-status]');
  const count = app.querySelector('[data-fi-result-count]');

  if (status) {
    status.textContent = '增强视图不可用，已显示 Nginx 原生目录列表。';
  }

  if (count) {
    count.textContent = '原生目录模式';
  }

  for (const control of Array.from(
    app.querySelectorAll('input, select, [data-fi-category], [data-fi-clear]'),
  )) {
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement ||
      control instanceof HTMLButtonElement
    ) {
      control.disabled = true;
    }
  }
}

/**
 * Progressively enhances a native ngx-fancyindex table.
 *
 * @param {Document | HTMLElement} [root]
 * @returns {boolean}
 */
export function enhanceFancyIndex(root = document) {
  const app = root.querySelector('[data-fi-app]');
  const sourceTable =
    root.querySelector('#fi-content table') ?? root.querySelector('table');

  if (!(app instanceof HTMLElement)) {
    return false;
  }

  if (!(sourceTable instanceof HTMLTableElement)) {
    setFallbackState(app);
    return false;
  }

  try {
    const entries = extractEntries(sourceTable);
    const search = requireElement(app, '[data-fi-search]');
    const sort = requireElement(app, '[data-fi-sort]');
    const status = requireElement(app, '[data-fi-status]');
    const resultCount = requireElement(app, '[data-fi-result-count]');
    const empty = requireElement(app, '[data-fi-empty]');
    const emptyTitle = requireElement(empty, 'h2');
    const emptyDescription = requireElement(empty, 'p');
    const clearButton = requireElement(empty, '[data-fi-clear]');
    const content = requireElement(app, '#fi-content');
    const filters = Array.from(
      app.querySelectorAll('[data-fi-category]'),
    ).filter((element) => element instanceof HTMLButtonElement);

    if (
      !(search instanceof HTMLInputElement) ||
      !(sort instanceof HTMLSelectElement) ||
      !(clearButton instanceof HTMLButtonElement)
    ) {
      throw new Error('Theme controls have an unexpected element type.');
    }

    const enhancedTable = createEnhancedTable();
    const body = document.createElement('tbody');
    enhancedTable.appendChild(body);
    const rowsByEntry = new Map(
      entries.map((entry) => [entry, createEntryRow(entry)]),
    );
    const parentEntry = entries.find((entry) => entry.isParent);
    const directoryEntries = entries.filter((entry) => !entry.isParent);

    /** @type {ViewState} */
    const state = {
      query: '',
      category: 'all',
      sort: 'name-asc',
    };

    const render = () => {
      const visibleEntries = directoryEntries
        .filter((entry) => matchesEntry(entry, state.query, state.category))
        .sort((left, right) => compareEntries(left, right, state.sort));
      const visibleRows = visibleEntries
        .map((entry) => rowsByEntry.get(entry))
        .filter((row) => row instanceof HTMLTableRowElement);

      if (parentEntry && state.category === 'all' && !state.query) {
        const parentRow = rowsByEntry.get(parentEntry);

        if (parentRow) {
          visibleRows.unshift(parentRow);
        }
      }

      body.replaceChildren(...visibleRows);
      const isUnfilteredEmpty =
        directoryEntries.length === 0 &&
        !state.query &&
        state.category === 'all';
      const hasVisibleItems = visibleEntries.length > 0;

      empty.hidden = hasVisibleItems;
      emptyTitle.textContent = isUnfilteredEmpty
        ? '这个目录还是空的'
        : '没有找到匹配的文件';
      emptyDescription.textContent = isUnfilteredEmpty
        ? '目录中暂时没有可显示的文件或文件夹。'
        : '试试更短的关键词，或切换到其他文件类型。';
      clearButton.hidden = isUnfilteredEmpty;
      resultCount.textContent = `显示 ${visibleEntries.length} / ${directoryEntries.length} 项`;
      status.textContent = isUnfilteredEmpty
        ? '当前目录为空。'
        : `显示 ${visibleEntries.length} 项，共 ${directoryEntries.length} 项。`;
    };

    let searchTimer = 0;
    search.addEventListener('input', () => {
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(() => {
        state.query = search.value;
        render();
      }, 120);
    });

    search.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && search.value) {
        search.value = '';
        state.query = '';
        render();
      }
    });

    sort.addEventListener('change', () => {
      if (isSortValue(sort.value)) {
        state.sort = sort.value;
        render();
      }
    });

    for (const filter of filters) {
      filter.addEventListener('click', () => {
        const category = filter.dataset.fiCategory;

        if (!isCategoryValue(category)) {
          return;
        }

        state.category = category;

        for (const item of filters) {
          item.setAttribute('aria-pressed', String(item === filter));
        }

        render();
      });
    }

    const resetFilters = () => {
      state.query = '';
      state.category = 'all';
      state.sort = 'name-asc';
      search.value = '';
      sort.value = 'name-asc';

      for (const filter of filters) {
        filter.setAttribute(
          'aria-pressed',
          String(filter.dataset.fiCategory === 'all'),
        );
      }

      render();
      search.focus();
    };

    clearButton.addEventListener('click', resetFilters);

    content.appendChild(enhancedTable);
    renderBreadcrumb(app);
    initThemeToggle(app);
    sourceTable.hidden = true;

    const nativeHeading = content.querySelector('h1');
    if (nativeHeading instanceof HTMLElement) {
      nativeHeading.hidden = true;
    }

    document.addEventListener('keydown', (event) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

      if (
        event.key === '/' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !isTyping
      ) {
        event.preventDefault();
        search.focus();
      }
    });

    app.dataset.fiState = 'enhanced';
    render();
    return true;
  } catch {
    setFallbackState(app);
    sourceTable.hidden = false;
    return false;
  }
}

function autoBoot() {
  if (
    typeof document !== 'undefined' &&
    document.querySelector('[data-fi-app]')
  ) {
    enhanceFancyIndex(document);
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoBoot, { once: true });
  } else {
    queueMicrotask(autoBoot);
  }
}
