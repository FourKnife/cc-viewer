(function() {
  if (window.__ccInspectorInitialized) return;
  window.__ccInspectorInitialized = true;

  let enabled = true;
  let recording = false;
  let recordingOverlay = null;
  let selectedElement = null;
  var nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value') &&
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
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
        width: computed.width,
        height: computed.height,
        fontSize: computed.fontSize,
        fontWeight: computed.fontWeight,
        fontFamily: computed.fontFamily,
        lineHeight: computed.lineHeight,
        letterSpacing: computed.letterSpacing,
        textAlign: computed.textAlign,
        color: computed.color,
        backgroundColor: computed.backgroundColor,
        backgroundImage: computed.backgroundImage,
        paddingTop: computed.paddingTop,
        paddingRight: computed.paddingRight,
        paddingBottom: computed.paddingBottom,
        paddingLeft: computed.paddingLeft,
        marginTop: computed.marginTop,
        marginRight: computed.marginRight,
        marginBottom: computed.marginBottom,
        marginLeft: computed.marginLeft,
        borderTopWidth: computed.borderTopWidth,
        borderTopColor: computed.borderTopColor,
        borderTopStyle: computed.borderTopStyle,
        borderRadius: computed.borderRadius,
        boxShadow: computed.boxShadow,
        opacity: computed.opacity,
      },
      sourceInfo: getSourceInfo(el),
    };
  }

  function generateSelector(el) {
    if (!el || el === document.body) return 'body';
    if (el.id) return '#' + el.id;
    var testId = el.getAttribute('data-testid');
    if (testId) return '[data-testid="' + testId + '"]';
    var ariaLabel = el.getAttribute('aria-label');
    if (ariaLabel) return '[aria-label="' + ariaLabel + '"]';
    // 尝试唯一 class 组合
    if (el.className && typeof el.className === 'string') {
      var classes = el.className.trim().split(/\s+/).filter(function(c) { return c && !c.match(/^[0-9]/) && c.length < 40; });
      for (var i = 0; i < classes.length; i++) {
        var sel = el.tagName.toLowerCase() + '.' + classes[i];
        if (document.querySelectorAll(sel).length === 1) return sel;
      }
      if (classes.length > 0) {
        var combined = el.tagName.toLowerCase() + '.' + classes.slice(0, 2).join('.');
        if (document.querySelectorAll(combined).length === 1) return combined;
      }
    }
    // nth-child 路径兜底
    var path = [];
    var cur = el;
    while (cur && cur !== document.body) {
      var tag = cur.tagName.toLowerCase();
      var siblings = cur.parentElement ? Array.from(cur.parentElement.children).filter(function(c) { return c.tagName === cur.tagName; }) : [];
      if (siblings.length > 1) {
        tag += ':nth-of-type(' + (siblings.indexOf(cur) + 1) + ')';
      }
      path.unshift(tag);
      cur = cur.parentElement;
    }
    return path.join(' > ');
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

  function onRecordClick(e) {
    if (!recording) return;
    var target = e.target;
    if (target === recordingOverlay) return;
    var selector = generateSelector(target);
    sendToParent('recorded-step', { type: 'click', selector: selector, tag: target.tagName.toLowerCase(), text: (target.innerText || '').slice(0, 50) });
  }

  function onRecordInput(e) {
    if (!recording) return;
    var target = e.target;
    if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && target.tagName !== 'SELECT') return;
    var selector = generateSelector(target);
    sendToParent('recorded-step', { type: 'fill', selector: selector, value: target.value });
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
    if (e.data.type === 'start-recording') {
      recording = true;
      enabled = false;
      if (hoverOverlay) hoverOverlay.style.display = 'none';
      if (selectOverlay) selectOverlay.style.display = 'none';
      // 录制指示器
      if (!recordingOverlay) {
        recordingOverlay = document.createElement('div');
        recordingOverlay.style.cssText = 'position:fixed;top:8px;right:8px;z-index:2147483647;background:#ff4d4f;color:#fff;padding:4px 10px;border-radius:4px;font-size:12px;pointer-events:none;';
        recordingOverlay.textContent = '● REC';
        document.body.appendChild(recordingOverlay);
      }
      recordingOverlay.style.display = 'block';
    }
    if (e.data.type === 'stop-recording') {
      recording = false;
      if (recordingOverlay) recordingOverlay.style.display = 'none';
    }
    if (e.data.type === 'run-step') {
      var step = e.data.step;
      var stepIndex = e.data.stepIndex;
      try {
        if (step.type === 'click') {
          var clickEl = document.querySelector(step.selector);
          if (!clickEl) { sendToParent('step-error', { stepIndex: stepIndex, reason: 'selector not found: ' + step.selector }); return; }
          clickEl.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
          sendToParent('step-done', { stepIndex: stepIndex });
        } else if (step.type === 'wait') {
          setTimeout(function() { sendToParent('step-done', { stepIndex: stepIndex }); }, step.ms || 0);
        } else if (step.type === 'fill') {
          var fillEl = document.querySelector(step.selector);
          if (!fillEl) { sendToParent('step-error', { stepIndex: stepIndex, reason: 'selector not found: ' + step.selector }); return; }
          if (nativeInputValueSetter) {
            nativeInputValueSetter.call(fillEl, step.value || '');
          } else {
            fillEl.value = step.value || '';
          }
          fillEl.dispatchEvent(new Event('input', { bubbles: true }));
          fillEl.dispatchEvent(new Event('change', { bubbles: true }));
          sendToParent('step-done', { stepIndex: stepIndex });
        } else if (step.type === 'scroll') {
          var scrollTarget = step.selector ? document.querySelector(step.selector) : window;
          if (step.selector && !scrollTarget) { sendToParent('step-error', { stepIndex: stepIndex, reason: 'selector not found: ' + step.selector }); return; }
          scrollTarget.scrollBy(step.x || 0, step.y || 0);
          sendToParent('step-done', { stepIndex: stepIndex });
        } else if (step.type === 'hover') {
          var hoverEl2 = document.querySelector(step.selector);
          if (!hoverEl2) { sendToParent('step-error', { stepIndex: stepIndex, reason: 'selector not found: ' + step.selector }); return; }
          hoverEl2.dispatchEvent(new MouseEvent('mouseover', { bubbles: true }));
          hoverEl2.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
          sendToParent('step-done', { stepIndex: stepIndex });
        } else if (step.type === 'keyboard') {
          var keyTarget = step.selector ? document.querySelector(step.selector) : document.activeElement;
          ['keydown', 'keypress', 'keyup'].forEach(function(t) {
            var evt = new KeyboardEvent(t, { key: step.key || '', code: step.key || '', bubbles: true, cancelable: true });
            (keyTarget || document.body).dispatchEvent(evt);
          });
          sendToParent('step-done', { stepIndex: stepIndex });
        } else if (step.type === 'select') {
          var selectEl = document.querySelector(step.selector);
          if (!selectEl) { sendToParent('step-error', { stepIndex: stepIndex, reason: 'selector not found: ' + step.selector }); return; }
          selectEl.value = step.value || '';
          selectEl.dispatchEvent(new Event('change', { bubbles: true }));
          sendToParent('step-done', { stepIndex: stepIndex });
        } else if (step.type === 'assert') {
          var assertEl = document.querySelector(step.selector);
          if (!assertEl) { sendToParent('step-error', { stepIndex: stepIndex, reason: 'selector not found: ' + step.selector }); return; }
          var actual = assertEl.textContent.trim();
          var expected = step.expected || '';
          if (actual.includes(expected)) {
            sendToParent('step-done', { stepIndex: stepIndex });
          } else {
            sendToParent('step-error', { stepIndex: stepIndex, reason: 'assert failed: expected "' + expected + '" in "' + actual + '"' });
          }
        } else {
          sendToParent('step-done', { stepIndex: stepIndex });
        }
      } catch (err) {
        sendToParent('step-error', { stepIndex: stepIndex, reason: String(err) });
      }
    }
    if (e.data.type === 'start-pick-element') {
      var pickHandler = function(evt) {
        evt.preventDefault();
        evt.stopPropagation();
        var t = evt.target;
        if (t === hoverOverlay || t === selectOverlay) return;
        sendToParent('picked-element', { selector: generateSelector(t) });
        document.removeEventListener('click', pickHandler, true);
      };
      document.addEventListener('click', pickHandler, true);
    }
  });

  // 初始化
  hoverOverlay = createOverlay('#1668dc', '__cc_hover_overlay');
  selectOverlay = createOverlay('#ff6b35', '__cc_select_overlay');

  document.addEventListener('mouseover', onMouseOver, true);
  document.addEventListener('mouseout', onMouseOut, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('click', onRecordClick, true);
  document.addEventListener('change', onRecordInput, true);
  document.addEventListener('keydown', onKeyDown, true);

  sendToParent('ready');
})();
