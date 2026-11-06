(function () {
  'use strict';

  var STORAGE_KEY = 'fancy-index:theme';
  var theme = null;

  try {
    var savedTheme = window.localStorage.getItem(STORAGE_KEY);
    if (savedTheme === 'light' || savedTheme === 'dark') {
      theme = savedTheme;
    }
  } catch {
    // Storage can be unavailable in private or restricted browsing contexts.
  }

  if (theme) {
    document.documentElement.dataset.theme = theme;
  }

  if (!document.documentElement.lang) {
    document.documentElement.lang = 'zh-CN';
  }

  if (!document.querySelector('meta[name="viewport"]')) {
    var viewport = document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content =
      'width=device-width, initial-scale=1, viewport-fit=cover';
    document.head.appendChild(viewport);
  }

  document.documentElement.classList.add('fi-js');

  Object.defineProperty(window, 'FancyIndexBootstrap', {
    value: Object.freeze({
      storageKey: STORAGE_KEY,
    }),
  });
})();
