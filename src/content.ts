// Tell the side panel when the page selection changes. The panel pulls the actual text itself.
let t: ReturnType<typeof setTimeout>;
document.addEventListener('selectionchange', () => {
  clearTimeout(t);
  t = setTimeout(() => chrome.runtime.sendMessage({ type: 'slashy:selection' }).catch(() => {}), 250);
});
