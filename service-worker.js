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
  
  // 创建右键菜单项 - 用于识别图片中的二维码
  chrome.contextMenus.create({
    id: 'decodeQRFromImage',
    title: '识别二维码',
    contexts: ['image']
  });
  
  // 创建右键菜单项 - 用于截图识别二维码
  chrome.contextMenus.create({
    id: 'captureAndDecodeQR',
    title: '截图识别二维码',
    contexts: ['all']
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
  } else if (info.menuItemId === 'decodeQRFromImage') {
    // 注入jsQR库和内容脚本
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['popup/jsQR.min.js', 'foreground.js']
    }).then(() => {
      // 延迟发送消息，确保脚本已加载
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'decodeQR',
          imageUrl: info.srcUrl
        });
      }, 500);
    }).catch(error => {
      console.error('注入脚本失败:', error);
      // 向内容脚本发送消息以执行二维码识别
      chrome.tabs.sendMessage(tab.id, {
        action: 'decodeQR',
        imageUrl: info.srcUrl
      }).catch(() => {
        // 如果失败，尝试重新注入
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['popup/jsQR.min.js', 'foreground.js']
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'decodeQR',
              imageUrl: info.srcUrl
            });
          }, 500);
        });
      });
    });
  } else if (info.menuItemId === 'captureAndDecodeQR') {
    // 注入jsQR库和内容脚本
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['popup/jsQR.min.js', 'foreground.js']
    }).then(() => {
      // 发送消息触发截图功能
      setTimeout(() => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'captureAndDecode'
        });
      }, 500);
    }).catch(error => {
      console.error('注入脚本失败:', error);
      chrome.tabs.sendMessage(tab.id, {
        action: 'captureAndDecode'
      }).catch(() => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['popup/jsQR.min.js', 'foreground.js']
        }).then(() => {
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, {
              action: 'captureAndDecode'
            });
          }, 500);
        });
      });
    });
  }
});

// 处理来自 content script 的截图请求
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureAndDecode' && request.selection) {
    const { left, top, width, height } = request.selection;
    const tabId = sender.tab ? sender.tab.id : null;
    
    // 获取当前活动标签页
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      try {
        if (!tabs || !tabs[0]) {
          sendResponse({ success: false, error: '无法获取当前标签页' });
          return;
        }
        
        // 使用 captureVisibleTab 获取截图
        const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
        
        // 获取标签页的缩放比例
        let zoom = 1;
        if (tabId) {
          try {
            zoom = await chrome.tabs.getZoom(tabId);
          } catch (e) {
            console.error('获取缩放比例失败:', e);
            zoom = 1;
          }
        }
        
        // 计算缩放后的坐标（只考虑标签页缩放，不考虑设备像素比）
        const scaledWidth = width * zoom;
        const scaledHeight = height * zoom;
        const scaledLeft = left * zoom;
        const scaledTop = top * zoom;
        
        // 将截图数据发送回 content script
        sendResponse({
          success: true,
          dataUrl: dataUrl,
          selection: {
            left: scaledLeft,
            top: scaledTop,
            width: scaledWidth,
            height: scaledHeight
          }
        });
      } catch (error) {
        console.error('截图失败:', error);
        sendResponse({ success: false, error: error.message });
      }
    });
    
    // 返回 true 表示异步响应
    return true;
  }
});
