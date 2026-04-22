(function() {
  if (window.__ccInspectorInitialized) return;
  window.__ccInspectorInitialized = true;

  let enabled = true;
  let selectedElement = null;
  let hoverOverlay = null;
  let selectOverlay = null;

  function createOverlay(color, id) {
    const div = document.createElement('div');
    div.id = id;
    div.style.cssText = [
      'position: fixed',
      'pointer-events: none',
      'z-index: 2147483647',
      'display: none',
      'border: 2px solid ' + color,
      'background: ' + color + '22',
      'transition: all 0.1s ease',
    ].join(';');
    document.body.appendChild(div);
    return div;
  }

  function positionOverlay(overlay, el) {
    if (!el) { overlay.style.display = 'none'; return; }
    var rect = el.getBoundingClientRect();
    overlay.style.left = rect.left + 'px';
    overlay.style.top = rect.top + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';
    overlay.style.display = 'block';
  }

  function getReactFiber(el) {
    if (!el) return null;
    var key = Object.keys(el).find(function(k) {
      return k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$');
    });
    return key ? el[key] : null;
  }

  function getSourceInfo(el) {
    var fiber = getReactFiber(el);
    if (!fiber) return null;

    var source = null;
    var componentName = null;
    var componentStack = [];

    var current = fiber;
    while (current) {
      if (current.type && typeof current.type === 'function') {
        var name = current.type.displayName || current.type.name;
        if (name && name !== '_c') {
          if (!componentName) componentName = name;
          componentStack.push(name);
        }
      }
      if (!source && current._debugSource) {
        source = {
          fileName: current._debugSource.fileName,
          lineNumber: current._debugSource.lineNumber,
          columnNumber: current._debugSource.columnNumber || 0,
        };
      }
      if (source && componentName) break;
      current = current.return;
    }

    if (!source && !componentName) return null;

    return {
      fileName: source ? source.fileName : null,
      lineNumber: source ? source.lineNumber : null,
      columnNumber: source ? source.columnNumber : 0,
      componentName: componentName,
      componentStack: componentStack.slice(0, 10),
    };
  }

  function getElementInfo(el) {
    if (!el) return null;
    var rect = el.getBoundingClientRect();
    var computed = window.getComputedStyle(el);
    var selector = el.tagName.toLowerCase();
    if (el.id) selector += '#' + el.id;
    else if (el.className && typeof el.className === 'string') {
      var classes = el.className.trim().split(/\s+/).slice(0, 3).join('.');
      if (classes) selector += '.' + classes;
    }

    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || '',
      className: (typeof el.className === 'string') ? el.className : '',
      text: (el.innerText || '').slice(0, 100),
      rect: {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      selector: selector,
      computedStyle: {
        display: computed.display,
        position: computed.position,
        fontSize: computed.fontSize,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
      },
      sourceInfo: getSourceInfo(el),
    };
  }

  function sendToParent(type, data) {
    window.parent.postMessage({ source: 'cc-visual-inspector', type: type, data: data }, '*');
  }

  function onMouseOver(e) {
    if (!enabled) return;
    var target = e.target;
    if (target === hoverOverlay || target === selectOverlay) return;
    if (target === selectedElement) return;
    positionOverlay(hoverOverlay, target);
    sendToParent('hover', getElementInfo(target));
  }

  function onMouseOut() {
    if (!enabled) return;
    hoverOverlay.style.display = 'none';
  }

  function onClick(e) {
    if (!enabled) return;
    e.preventDefault();
    e.stopPropagation();
    selectedElement = e.target;
    positionOverlay(selectOverlay, selectedElement);
    hoverOverlay.style.display = 'none';
    sendToParent('select', getElementInfo(selectedElement));
  }

  function onKeyDown(e) {
    if (!enabled) return;
    if (e.key === 'Escape') {
      selectedElement = null;
      selectOverlay.style.display = 'none';
      sendToParent('deselect');
    }
    if (e.altKey && e.key === 'ArrowUp' && selectedElement && selectedElement.parentElement) {
      selectedElement = selectedElement.parentElement;
      positionOverlay(selectOverlay, selectedElement);
      sendToParent('select', getElementInfo(selectedElement));
    }
  }

  // 接收父窗口指令
  window.addEventListener('message', function(e) {
    if (!e.data || e.data.source !== 'cc-visual-parent') return;
    if (e.data.type === 'enable') { enabled = true; }
    if (e.data.type === 'disable') {
      enabled = false;
      hoverOverlay.style.display = 'none';
      selectOverlay.style.display = 'none';
      selectedElement = null;
    }
  });

  // 初始化
  hoverOverlay = createOverlay('#1668dc', '__cc_hover_overlay');
  selectOverlay = createOverlay('#ff6b35', '__cc_select_overlay');

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout', onMouseOut, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeyDown, true);

  sendToParent('ready');
})();
