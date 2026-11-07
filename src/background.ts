// Clicking the toolbar icon (or Alt+S) opens the side panel.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

const KEY = 'slashy.settings';
const ROOT = 'slashy-root';

/** Right-click menu: "Run Slashy skill" with one entry per enabled skill. */
async function buildMenu() {
  const { [KEY]: s } = await chrome.storage.local.get(KEY);
  const skills = ((s?.skills ?? []) as { id: string; name: string; enabled: boolean }[]).filter(k => k.enabled);
  await chrome.contextMenus.removeAll();
  chrome.contextMenus.create({ id: ROOT, title: 'Slashy: run skill', contexts: ['selection', 'page'] });
  for (const k of skills) chrome.contextMenus.create({ id: `skill:${k.id}`, parentId: ROOT, title: k.name, contexts: ['selection', 'page'] });
}

chrome.runtime.onInstalled.addListener(buildMenu);
chrome.runtime.onStartup.addListener(buildMenu);
chrome.storage.onChanged.addListener((c, area) => area === 'local' && c[KEY] && void buildMenu());

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const id = String(info.menuItemId);
  if (!id.startsWith('skill:') || !tab?.id) return;
  // open() must run synchronously inside the click to keep the user gesture.
  void chrome.sidePanel.open({ tabId: tab.id });
  void chrome.storage.session.set({ 'slashy.pending': { skillId: id.slice(6), ts: Date.now() } });
});
