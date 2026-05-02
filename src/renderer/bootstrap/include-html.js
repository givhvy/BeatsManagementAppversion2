function loadHtmlIncludes() {
  const includeNodes = Array.from(document.querySelectorAll('[data-include]'));
  if (includeNodes.length === 0) return;

  const readInclude = (relativePath) => {
    if (typeof require !== 'undefined') {
      const fs = require('fs');
      const path = require('path');
      const baseDir = typeof __dirname !== 'undefined'
        ? __dirname
        : decodeURIComponent(new URL('.', window.location.href).pathname);
      return fs.readFileSync(path.join(baseDir, relativePath), 'utf8');
    }

    const request = new XMLHttpRequest();
    request.open('GET', relativePath, false);
    request.send(null);
    if (request.status >= 200 && request.status < 300) return request.responseText;
    throw new Error(`Failed to load HTML include: ${relativePath}`);
  };

  includeNodes.forEach((node) => {
    const includePath = node.getAttribute('data-include');
    node.outerHTML = readInclude(includePath);
  });
}
