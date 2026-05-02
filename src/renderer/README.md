# Renderer

`index.html` is the current app shell. `partials/` holds the HTML body split by app area. `bootstrap/include-html.js` assembles those partials before application scripts run. `styles/app/` holds CSS split by app area. `app/` contains the browser-side application logic split by app area and loaded as ordered classic scripts for compatibility.

Next safe extraction targets:

1. Move each `.app-section` from `index.html` into renderer partials or web components.
2. Replace inline `onclick` handlers with event listeners so functions no longer need to live on the global window.
3. Convert the ordered classic scripts into ES modules once the inline handlers are removed.
