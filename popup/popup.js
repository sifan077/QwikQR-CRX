const QR_CODE_SIZE = 180;
const DEBOUNCE_DELAY = 300;
const BUTTON_RESET_DELAY = 2000;

const QR_CONFIG = {
  width: QR_CODE_SIZE,
  height: QR_CODE_SIZE,
  colorDark: '#000000',
  colorLight: '#ffffff',
  correctLevel: QRCode.CorrectLevel.H
};

function showPlaceholder() {
  const qrcodeDiv = document.getElementById('qrcode');
  qrcodeDiv.innerHTML = `
    <div class="placeholder-container">
      <div class="placeholder-icon">📱</div>
      <p class="placeholder-text">输入内容生成二维码</p>
    </div>
  `;
}

function generateQRCode(text, qrcodeDiv) {
  if (!text) {
    showPlaceholder();
    return null;
  }

  qrcodeDiv.innerHTML = '';

  return new QRCode(qrcodeDiv, {
    text: text,
    ...QR_CONFIG
  });
}

function showNotification(message, isError = false) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    padding: 10px 20px;
    background: ${isError ? '#dc3545' : '#28a745'};
    color: white;
    border-radius: 5px;
    z-index: 10000;
  `;
  document.body.appendChild(notification);
  setTimeout(() => {
    document.body.removeChild(notification);
  }, BUTTON_RESET_DELAY);
}

document.addEventListener('DOMContentLoaded', function() {
  const textInput = document.getElementById('text-input');
  const qrcodeDiv = document.getElementById('qrcode');
  const copyBtn = document.getElementById('copy-btn');
  const downloadBtn = document.getElementById('download-btn');
  let qrcode = null;
  let debounceTimer = null;

  showPlaceholder();

  chrome.storage.local.get(['contextMenuContent'], function(result) {
    if (result.contextMenuContent) {
      const content = result.contextMenuContent;
      textInput.value = content;
      qrcode = generateQRCode(content, qrcodeDiv);
    } else {
      chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        if (tabs && tabs[0] && tabs[0].url) {
          const currentUrl = tabs[0].url;
          textInput.value = currentUrl;
          qrcode = generateQRCode(currentUrl, qrcodeDiv);
        }
      });
    }
  });

  textInput.addEventListener('input', function() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const text = textInput.value.trim();
      qrcode = generateQRCode(text, qrcodeDiv);
    }, DEBOUNCE_DELAY);
  });

  copyBtn.addEventListener('click', async function() {
    const qrImg = qrcodeDiv.querySelector('img');
    if (!qrImg) {
      showNotification('请先生成二维码', true);
      return;
    }

    try {
      const response = await fetch(qrImg.src);
      const blob = await response.blob();

      await navigator.clipboard.write([
        new ClipboardItem({ [blob.type]: blob })
      ]);

      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✅ 已复制';
      copyBtn.classList.add('copied');

      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('copied');
      }, BUTTON_RESET_DELAY);

    } catch (err) {
      console.error('复制二维码失败:', err);
      showNotification('复制失败: ' + err.message, true);
    }
  });

  downloadBtn.addEventListener('click', function() {
    const qrImg = qrcodeDiv.querySelector('img');
    if (!qrImg) {
      showNotification('请先生成二维码', true);
      return;
    }

    const link = document.createElement('a');
    link.href = qrImg.src;
    link.download = `qrcode-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  });

  textInput.focus();
});