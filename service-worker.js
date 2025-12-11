// This is the service worker script, which executes in its own context
// when the extension is installed or refreshed (or when you access its console).
// It would correspond to the background script in chrome extensions v2.

console.log("This prints to the console of the service worker (background script)")

// Importing and using functionality from external files is also possible.
importScripts('service-worker-utils.js')

// If you want to import a file that is deeper in the file hierarchy of your
// extension, simply do `importScripts('path/to/file.js')`.
// The path should be relative to the file `manifest.json`.

// 创建右键菜单项
chrome.runtime.onInstalled.addListener(() => {
  // 创建右键菜单项 - 用于选中的文本
  chrome.contextMenus.create({
    id: 'generateQRFromSelection',
    title: '生成二维码',
    contexts: ['selection', 'link']
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'generateQRFromSelection') {
    let content = '';
    if (info.selectionText) {
      content = info.selectionText;
    } else if (info.linkUrl) {
      content = info.linkUrl;
    }
    
    if (content) {
      // 存储选中的文本或链接URL，以便在popup中使用
      chrome.storage.local.set({ contextMenuContent: content }, () => {
        // 打开popup
        chrome.action.openPopup();
      });
    }
  }
});
