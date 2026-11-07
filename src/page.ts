import type { PageContext } from './types';

// Runs inside the page via chrome.scripting.executeScript, so it must be self-contained.
function grab() {
  const sel = (getSelection()?.toString() ?? '').trim();
  const text = (document.body?.innerText ?? '').replace(/\n{3,}/g, '\n\n').trim();
  return { title: document.title, url: location.href, selection: sel.slice(0, 20000), text: text.slice(0, 60000) };
}

/** Selection + text of the active tab, or null on pages Chrome won't let us read (chrome://, store). */
export async function readActivePage(): Promise<PageContext | null> {
  try {
    let [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
    // Panel opened as a regular tab (dev/testing): fall back to another window's active page.
    if (tab?.url?.startsWith('chrome-extension://'))
      tab = (await chrome.tabs.query({ active: true })).find(t => !t.url?.startsWith('chrome-extension://')) ?? tab;
    if (!tab?.id) return null;
    const [r] = await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: grab });
    return (r?.result as PageContext) ?? null;
  } catch {
    return null;
  }
}
