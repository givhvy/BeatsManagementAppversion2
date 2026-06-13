// Easy DOM Grabber: injectable devtool that lets you hover/click elements in
// the renderer and copy their cleaned outerHTML to the clipboard (Ctrl+Shift+G).
function getGrabberCode() {
  return `
  (() => {
    if (window.__edgCleanup) window.__edgCleanup();

    let isActive = false;
    let hoveredElement = null;
    let captureMode = "subtree";
    let selectedElements = [];
    let selectionHighlights = new Map();

    const overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;pointer-events:none;border:2px solid #00d4ff;background:rgba(0,212,255,0.08);border-radius:3px;z-index:2147483646;transition:all 0.05s ease;display:none;";
    document.documentElement.appendChild(overlay);

    const tooltip = document.createElement("div");
    tooltip.style.cssText = "position:fixed;pointer-events:none;z-index:2147483647;background:#1a1a2e;color:#e0e0e0;font-family:Consolas,Monaco,monospace;font-size:12px;padding:6px 10px;border-radius:6px;border:1px solid #00d4ff;box-shadow:0 4px 12px rgba(0,0,0,0.4);white-space:nowrap;display:none;max-width:500px;overflow:hidden;text-overflow:ellipsis;";
    document.documentElement.appendChild(tooltip);

    const toast = document.createElement("div");
    toast.style.cssText = "position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(20px);background:#1a1a2e;color:#00d4ff;font-family:Consolas,Monaco,monospace;font-size:14px;padding:12px 24px;border-radius:8px;border:1px solid #00d4ff;box-shadow:0 4px 20px rgba(0,212,255,0.3);z-index:2147483647;opacity:0;transition:all 0.3s ease;pointer-events:none;";
    document.documentElement.appendChild(toast);

    const badge = document.createElement("div");
    badge.style.cssText = "position:fixed;top:12px;right:12px;background:#50fa7b;color:#0d0d1a;font-family:Consolas,Monaco,monospace;font-size:13px;font-weight:700;padding:6px 14px;border-radius:20px;z-index:2147483647;display:none;box-shadow:0 2px 10px rgba(80,250,123,0.4);";
    document.documentElement.appendChild(badge);

    function showToast(msg) {
      toast.textContent = msg;
      toast.style.opacity = "1";
      toast.style.transform = "translateX(-50%) translateY(0)";
      setTimeout(() => { toast.style.opacity = "0"; toast.style.transform = "translateX(-50%) translateY(20px)"; }, 2000);
    }

    function updateBadge() {
      if (selectedElements.length > 0) {
        badge.textContent = selectedElements.length + " selected · Enter to copy · Shift+Esc to clear";
        badge.style.display = "block";
      } else { badge.style.display = "none"; }
    }

    function toggleSelection(el) {
      if (selectionHighlights.has(el)) {
        selectionHighlights.get(el).remove();
        selectionHighlights.delete(el);
        selectedElements = selectedElements.filter(i => i.element !== el);
      } else {
        const hl = document.createElement("div");
        hl.style.cssText = "position:fixed;pointer-events:none;border:2px solid #50fa7b;background:rgba(80,250,123,0.1);border-radius:3px;z-index:2147483645;transition:all 0.05s ease;";
        const r = el.getBoundingClientRect();
        hl.style.top = r.top + "px"; hl.style.left = r.left + "px";
        hl.style.width = r.width + "px"; hl.style.height = r.height + "px";
        document.documentElement.appendChild(hl);
        selectionHighlights.set(el, hl);
        selectedElements.push({ element: el, highlight: hl });
      }
      updateBadge();
    }

    function clearSelection() {
      selectionHighlights.forEach(hl => hl.remove());
      selectionHighlights.clear();
      selectedElements = [];
      updateBadge();
    }

    function updatePositions() {
      selectedElements = selectedElements.filter(({ element, highlight }) => {
        if (!document.contains(element)) { highlight.remove(); selectionHighlights.delete(element); return false; }
        const r = element.getBoundingClientRect();
        highlight.style.top = r.top + "px"; highlight.style.left = r.left + "px";
        highlight.style.width = r.width + "px"; highlight.style.height = r.height + "px";
        return true;
      });
      updateBadge();
    }

    async function copyAllSelected() {
      if (selectedElements.length === 0) return;
      const allDOM = selectedElements.map(({ element }, i) => {
        return "<!-- Element " + (i+1) + " -->\\n" + cleanDOM(element, captureMode);
      }).join("\\n\\n");
      try {
        const { ipcRenderer } = require('electron');
        await ipcRenderer.invoke('edg-copy-to-clipboard', allDOM);
      } catch {
        try { await navigator.clipboard.writeText(allDOM); } catch {}
      }
      showToast(selectedElements.length + " elements copied! (" + allDOM.length + " chars)");
      clearSelection();
    }

    function getElementInfo(el) {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? "#" + el.id : "";
      const cls = el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\\s+/).join(".") : "";
      const size = Math.round(el.getBoundingClientRect().width) + "x" + Math.round(el.getBoundingClientRect().height);
      return "<" + tag + id + cls + "> [" + size + "]";
    }

    function positionOverlay(el) {
      const r = el.getBoundingClientRect();
      overlay.style.top = r.top + "px"; overlay.style.left = r.left + "px";
      overlay.style.width = r.width + "px"; overlay.style.height = r.height + "px";
      overlay.style.display = "block";
    }

    function positionTooltip(el) {
      const r = el.getBoundingClientRect();
      tooltip.textContent = getElementInfo(el);
      let top = r.top - 36, left = r.left;
      if (top < 4) top = r.bottom + 6;
      if (left + 300 > window.innerWidth) left = window.innerWidth - 310;
      if (left < 4) left = 4;
      tooltip.style.top = top + "px"; tooltip.style.left = left + "px"; tooltip.style.display = "block";
    }

    function cleanDOM(el, mode) {
      const clone = mode === "subtree" ? el.cloneNode(true) : el.cloneNode(false);
      if (mode === "subtree") {
        ["script","style","noscript"].forEach(s => clone.querySelectorAll(s).forEach(n => n.remove()));
      }
      const els = mode === "subtree" ? clone.querySelectorAll("*") : [clone];
      els.forEach(n => {
        if (!n.attributes) return;
        const rm = [];
        for (const a of n.attributes) { if (a.name.startsWith("on")) rm.push(a.name); }
        rm.forEach(name => n.removeAttribute(name));
      });
      let html = clone.outerHTML;
      html = html.replace(/ class=""/g, "").replace(/ id=""/g, "");
      return html.trim();
    }

    function onMouseMove(e) {
      if (!isActive) return;
      const t = e.target;
      if (t === overlay || t === tooltip || t === toast || t === badge) return;
      if (t.className === "edg-selection") return;
      if (t !== hoveredElement) { hoveredElement = t; positionOverlay(t); positionTooltip(t); }
    }

    async function onClick(e) {
      if (!isActive) return;
      const t = e.target;
      if (t === overlay || t === tooltip || t === toast || t === badge) return;
      if (t.className === "edg-selection") return;
      e.preventDefault(); e.stopPropagation();
      if (e.shiftKey) { toggleSelection(t); return; }
      const dom = cleanDOM(t, captureMode);
      try {
        const { ipcRenderer } = require('electron');
        await ipcRenderer.invoke('edg-copy-to-clipboard', dom);
      } catch {
        try { await navigator.clipboard.writeText(dom); } catch {}
      }
      showToast("DOM Copied! (" + dom.length + " chars)");
      overlay.style.borderColor = "#50fa7b"; overlay.style.background = "rgba(80,250,123,0.15)";
      setTimeout(() => { overlay.style.borderColor = "#00d4ff"; overlay.style.background = "rgba(0,212,255,0.08)"; }, 300);
    }

    function onKeyDown(e) {
      if (e.key === "Enter" && isActive && selectedElements.length > 0) { e.preventDefault(); copyAllSelected(); return; }
      if (e.key === "Escape" && e.shiftKey && isActive) { e.preventDefault(); clearSelection(); showToast("Selection cleared"); return; }
      if (e.key === "Escape" && isActive) toggle();
    }

    function toggle() {
      isActive = !isActive;
      if (isActive) {
        document.body.style.cursor = "crosshair";
        document.addEventListener("mousemove", onMouseMove, true);
        document.addEventListener("click", onClick, true);
        document.addEventListener("keydown", onKeyDown, true);
        document.addEventListener("scroll", updatePositions, true);
        window.addEventListener("resize", updatePositions);
        showToast("Grabber Active - Click to copy · Shift+Click to multi-select");
      } else {
        overlay.style.display = "none"; tooltip.style.display = "none";
        clearSelection(); badge.style.display = "none";
        document.body.style.cursor = "";
        document.removeEventListener("mousemove", onMouseMove, true);
        document.removeEventListener("click", onClick, true);
        document.removeEventListener("keydown", onKeyDown, true);
        document.removeEventListener("scroll", updatePositions, true);
        window.removeEventListener("resize", updatePositions);
        hoveredElement = null;
        showToast("DOM Grabber Off");
      }
    }

    window.__edgCleanup = () => {
      if (isActive) toggle();
      overlay.remove(); tooltip.remove(); toast.remove(); badge.remove();
      clearSelection();
      delete window.__edgCleanup; delete window.__edgToggle;
    };

    window.__edgToggle = toggle;

    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === "G") { e.preventDefault(); toggle(); }
    });

    showToast("DOM Grabber ready - Press Ctrl+Shift+G to activate");
  })();
  `;
}

module.exports = { getGrabberCode };
