// Constants
const MODAL_ID = 'qrModal';
const DOMAIN_REGEX = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
const BUTTON_RESET_DELAY = 2000;
const RESULT_RESET_DELAY = 3000;

function isValidUrl(urlString) {
  try {
    new URL(urlString);
    return true;
  } catch (e) {
    if (DOMAIN_REGEX.test(urlString)) {
      try {
        new URL('http://' + urlString);
        return true;
      } catch (e2) {
        return false;
      }
    }
    return false;
  }
}

function normalizeUrl(urlString) {
  try {
    return new URL(urlString);
  } catch (e) {
    if (DOMAIN_REGEX.test(urlString)) {
      return new URL('http://' + urlString);
    }
    throw new Error('Invalid URL format');
  }
}

function createModalHTML(imageUrl) {
  return `
    <div id="qrModalContent" style="text-align: center; padding: 30px; background: white; border-radius: 16px; max-width: 90vw; max-height: 90vh; overflow-y: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.3); position: relative;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee;">
        <h3 id="modalTitle" style="margin: 0; font-size: 18px; color: #333;">正在识别二维码...</h3>
        <button id="closeBtn" style="background: #f8f9fa; border: 1px solid #ddd; border-radius: 50%; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 18px; color: #666;">×</button>
      </div>
      <div id="qrContainer" style="margin: 15px 0; display: flex; justify-content: center;">
        <img id="qrImage" src="${imageUrl}" style="max-width: 100%; max-height: 40vh; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); object-fit: contain;">
      </div>
      <div id="result" style="margin: 20px 0; font-size: 16px; min-height: 50px; display: flex; flex-direction: column; align-items: center;"></div>
      <div id="actionButtons" style="display: none; gap: 12px; margin-top: 15px; justify-content: center; flex-wrap: wrap;">
        <button id="copyBtn" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 6px; min-width: 120px;">📋 复制内容</button>
        <button id="openLinkBtn" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; gap: 6px; min-width: 120px;">🔗 打开链接</button>
      </div>
    </div>
  `;
}

function createResultHTML(decodedText, bgColor = '#f8f9fa', borderColor = '#28a745') {
  return `
    <div style="width: 100%; padding: 15px; background: ${bgColor}; border-radius: 8px; border-left: 4px solid ${borderColor}; text-align: left; margin-bottom: 15px;">
      <div style="font-weight: 600; color: #555; margin-bottom: 8px;">识别结果:</div>
      <div id="decodedText" style="word-break: break-all; font-family: monospace; font-size: 14px; color: #333; line-height: 1.4;">${decodedText}</div>
    </div>
  `;
}

function removeExistingModal() {
  const existingModal = document.getElementById(MODAL_ID);
  if (existingModal) {
    document.body.removeChild(existingModal);
  }
}

function setupCopyButton(decodedText) {
  const copyBtn = document.getElementById('copyBtn');
  copyBtn.onclick = function() {
    const originalText = this.innerHTML;
    const originalBg = this.style.background;

    this.innerHTML = '✅ 已复制';
    this.style.background = '#20c997';

    navigator.clipboard.writeText(decodedText).then(() => {
      const resultDiv = document.getElementById('result');
      const originalResult = resultDiv.innerHTML;
      resultDiv.innerHTML = createResultHTML(decodedText, '#d4edda', '#28a745') +
        '<div style="color: #28a745; font-weight: 500; margin-top: 10px;">✅ 内容已复制到剪贴板</div>';

      setTimeout(() => {
        this.innerHTML = originalText;
        this.style.background = originalBg;
      }, BUTTON_RESET_DELAY);

      setTimeout(() => {
        resultDiv.innerHTML = originalResult;
      }, RESULT_RESET_DELAY);
    }).catch(err => {
      console.error('复制失败: ', err);
      this.innerHTML = originalText;
      this.style.background = originalBg;

      const resultDiv = document.getElementById('result');
      const originalResult = resultDiv.innerHTML;
      resultDiv.innerHTML = createResultHTML(decodedText, '#f8d7da', '#dc3545') +
        `<div style="color: #dc3545; font-weight: 500; margin-top: 10px;">❌ 复制失败: ${err.message}</div>`;

      setTimeout(() => {
        resultDiv.innerHTML = originalResult;
      }, RESULT_RESET_DELAY);
    });
  };
}

function setupOpenLinkButton(decodedText, isValidUrl) {
  const openLinkBtn = document.getElementById('openLinkBtn');
  if (isValidUrl) {
    openLinkBtn.onclick = function() {
      try {
        const url = normalizeUrl(decodedText);
        window.open(url.href, '_blank');
      } catch (e) {
        console.error('URL格式错误: ', e);
      }
    };
    openLinkBtn.disabled = false;
    openLinkBtn.style.opacity = '1';
    openLinkBtn.style.cursor = 'pointer';
    openLinkBtn.title = '打开链接';
  } else {
    openLinkBtn.disabled = true;
    openLinkBtn.style.opacity = '0.5';
    openLinkBtn.style.cursor = 'not-allowed';
    openLinkBtn.title = '识别结果不是有效的URL，无法打开';
  }
}

async function decodeQRFromImage(imageUrl) {
  removeExistingModal();

  const modal = document.createElement('div');
  modal.id = MODAL_ID;
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100%';
  modal.style.height = '100%';
  modal.style.backgroundColor = 'rgba(0,0,0,0.85)';
  modal.style.zIndex = '999999';
  modal.style.display = 'flex';
  modal.style.flexDirection = 'column';
  modal.style.justifyContent = 'center';
  modal.style.alignItems = 'center';
  modal.style.color = '#333';
  modal.style.fontFamily = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
  modal.innerHTML = createModalHTML(imageUrl);

  document.body.appendChild(modal);

  try {
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);

    const img = document.getElementById('qrImage');
    img.src = blobUrl;

    img.onload = function() {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          document.getElementById('modalTitle').textContent = '识别成功';
          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = createResultHTML(code.data);

          const urlValid = isValidUrl(code.data);

          document.getElementById('actionButtons').style.display = 'flex';
          setupCopyButton(code.data);
          setupOpenLinkButton(code.data, urlValid);
        } else {
          document.getElementById('modalTitle').textContent = '识别失败';
          document.getElementById('result').innerHTML = '<p style="color: #dc3545; font-weight: 500;">未能识别出二维码，请确保图片清晰且包含二维码</p>';
        }
      } catch (error) {
        document.getElementById('modalTitle').textContent = '识别失败';
        document.getElementById('result').innerHTML = '<p style="color: #dc3545; font-weight: 500;">识别失败: ' + error.message + '</p>';
      } finally {
        URL.revokeObjectURL(blobUrl);
      }
    };

    img.onerror = function() {
      document.getElementById('modalTitle').textContent = '加载失败';
      document.getElementById('result').innerHTML = '<p style="color: #dc3545; font-weight: 500;">无法加载图片</p>';
      URL.revokeObjectURL(blobUrl);
    };
  } catch (error) {
    document.getElementById('modalTitle').textContent = '加载失败';
    document.getElementById('result').innerHTML = '<p style="color: #dc3545; font-weight: 500;">加载图片失败: ' + error.message + '</p>';
  }

  // 关闭按钮事件
  document.getElementById('closeBtn').onclick = function() {
    if (modal.parentNode) {
      document.body.removeChild(modal);
    }
  };
  
  // 点击模态框外部关闭
  modal.onclick = function(e) {
    if (e.target === modal) {
      if (modal.parentNode) {
        document.body.removeChild(modal);
      }
    }
  };
}

// 监听来自扩展的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'decodeQR') {
    decodeQRFromImage(request.imageUrl);
    sendResponse({status: 'success'});
  }
});