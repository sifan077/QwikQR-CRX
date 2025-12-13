// Service worker script for QwikQR extension
// Handles context menu creation and QR code operations

importScripts('service-worker-utils.js');

const SCRIPT_INJECTION_DELAY = 500;

// 创建右键菜单项
chrome.runtime.onInstalled.addListener(() => {
  // 创建右键菜单项 - 用于选中的文本
  chrome.contextMenus.create({
    id: 'generateQRFromSelection',
    title: '生成二维码',
    contexts: ['selection', 'link']
  });
  
  // 创建右键菜单项 - 用于识别图片中的二维码
  chrome.contextMenus.create({
    id: 'decodeQRFromImage',
    title: '识别二维码',
    contexts: ['image']
  });
});

function injectScriptsAndSendMessage(tabId, imageUrl) {
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    files: ['popup/jsQR.min.js', 'foreground.js']
  }).then(() => {
    setTimeout(() => {
      chrome.tabs.sendMessage(tabId, {
        action: 'decodeQR',
        imageUrl: imageUrl
      });
    }, SCRIPT_INJECTION_DELAY);
  }).catch(error => {
    console.error('注入脚本失败:', error);
    chrome.tabs.sendMessage(tabId, {
      action: 'decodeQR',
      imageUrl: imageUrl
    }).catch(() => {
      console.error('发送消息失败，尝试重新注入脚本');
    });
  });
}

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
      chrome.storage.local.set({ contextMenuContent: content }, () => {
        chrome.action.openPopup();
      });
    }
  } else if (info.menuItemId === 'decodeQRFromImage') {
    injectScriptsAndSendMessage(tab.id, info.srcUrl);
  }
});
