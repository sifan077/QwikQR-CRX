// 二维码识别内容脚本
async function decodeQRFromImage(imageUrl) {
  // 检查是否已存在弹窗，如果存在则先移除
  const existingModal = document.getElementById('qrModal');
  if (existingModal) {
    document.body.removeChild(existingModal);
  }

  // 创建一个临时的容器来处理识别
  const modal = document.createElement('div');
  modal.id = 'qrModal';
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
  modal.innerHTML = `
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

  document.body.appendChild(modal);

  try {
    // 使用fetch获取图片blob，避免跨域问题
    const response = await fetch(imageUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    
    const img = document.getElementById('qrImage');
    img.src = blobUrl;
    
    img.onload = function() {
      try {
        // 创建canvas来处理图片
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // 获取图像数据并识别二维码
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          // 更新标题
          document.getElementById('modalTitle').textContent = '识别成功';
          
          const resultDiv = document.getElementById('result');
          resultDiv.innerHTML = `
            <div style="width: 100%; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #28a745; text-align: left; margin-bottom: 15px;">
              <div style="font-weight: 600; color: #555; margin-bottom: 8px;">识别结果:</div>
              <div id="decodedText" style="word-break: break-all; font-family: monospace; font-size: 14px; color: #333; line-height: 1.4;">${code.data}</div>
            </div>
          `;
          
          // 检查识别结果是否为有效URL（支持带协议和不带协议的URL）
          let isValidUrl = false;
          try {
            // 首先尝试直接解析原始URL
            new URL(code.data);
            isValidUrl = true;
          } catch (e) {
            // 如果原始URL解析失败，检查是否符合域名格式，然后尝试添加http://前缀
            // 域名格式检查：至少包含一个点（表示有顶级域名），且每个部分符合域名规则
            const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
            if (domainRegex.test(code.data)) {
              try {
                new URL('http://' + code.data);
                isValidUrl = true;
              } catch (e2) {
                isValidUrl = false;
              }
            } else {
              isValidUrl = false;
            }
          }
          
          // 显示操作按钮
          document.getElementById('actionButtons').style.display = 'flex';
          
          // 复制内容到剪贴板
          document.getElementById('copyBtn').onclick = function() {
            const button = this; // 保存对按钮的引用
            const originalText = button.innerHTML;
            const originalBg = button.style.background;
            
            // 临时改变按钮文本为"已复制"，并添加视觉反馈
            button.innerHTML = '✅ 已复制';
            button.style.background = '#20c997'; // 绿色反馈
            
            navigator.clipboard.writeText(code.data).then(function() {
              // 同时在结果区域显示复制成功的反馈
              const resultDiv = document.getElementById('result');
              const originalResult = resultDiv.innerHTML;
              resultDiv.innerHTML = `
                <div style="width: 100%; padding: 15px; background: #d4edda; border-radius: 8px; border-left: 4px solid #28a745; text-align: left; margin-bottom: 15px;">
                  <div style="font-weight: 600; color: #155724; margin-bottom: 8px;">识别结果:</div>
                  <div id="decodedText" style="word-break: break-all; font-family: monospace; font-size: 14px; color: #333; line-height: 1.4;">${code.data}</div>
                </div>
                <div style="color: #28a745; font-weight: 500; margin-top: 10px;">✅ 内容已复制到剪贴板</div>
              `;
              
              // 2秒后恢复按钮原始状态
              setTimeout(() => {
                button.innerHTML = originalText;
                button.style.background = originalBg;
              }, 2000);
              
              // 3秒后恢复原始显示
              setTimeout(() => {
                resultDiv.innerHTML = originalResult;
              }, 3000);
            }).catch(function(err) {
              console.error('复制失败: ', err);
              // 恢复按钮状态
              button.innerHTML = originalText;
              button.style.background = originalBg;
              
              // 在结果区域显示复制失败的反馈
              const resultDiv = document.getElementById('result');
              const originalResult = resultDiv.innerHTML;
              resultDiv.innerHTML = `
                <div style="width: 100%; padding: 15px; background: #f8d7da; border-radius: 8px; border-left: 4px solid #dc3545; text-align: left; margin-bottom: 15px;">
                  <div style="font-weight: 600; color: #721c24; margin-bottom: 8px;">识别结果:</div>
                  <div id="decodedText" style="word-break: break-all; font-family: monospace; font-size: 14px; color: #333; line-height: 1.4;">${code.data}</div>
                </div>
                <div style="color: #dc3545; font-weight: 500; margin-top: 10px;">❌ 复制失败: ${err.message}</div>
              `;
              
              // 3秒后恢复原始显示
              setTimeout(() => {
                resultDiv.innerHTML = originalResult;
              }, 3000);
            });
          };
          
          // 设置打开链接按钮状态（如果是有效URL则启用，否则禁用）
          const openLinkBtn = document.getElementById('openLinkBtn');
          if (isValidUrl) {
            openLinkBtn.onclick = function() {
              try {
                let url;
                // 尝试直接解析原始URL，如果失败则先检查域名格式再添加http://前缀
                try {
                  url = new URL(code.data);
                } catch (e) {
                  // 域名格式检查：至少包含一个点（表示有顶级域名），且每个部分符合域名规则
                  const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
                  if (domainRegex.test(code.data)) {
                    url = new URL('http://' + code.data);
                  } else {
                    throw new Error('Invalid URL format');
                  }
                }
                // 在新标签页中打开链接
                window.open(url.href, '_blank');
              } catch (e) {
                console.error('URL格式错误: ', e);
              }
            };
            // 启用按钮并设置正常样式
            openLinkBtn.disabled = false;
            openLinkBtn.style.opacity = '1';
            openLinkBtn.style.cursor = 'pointer';
            openLinkBtn.title = '打开链接';
          } else {
            // 禁用按钮并设置禁用样式
            openLinkBtn.disabled = true;
            openLinkBtn.style.opacity = '0.5';
            openLinkBtn.style.cursor = 'not-allowed';
            openLinkBtn.title = '识别结果不是有效的URL，无法打开';
          }
          
          // 为用户提供一个自动关闭选项，如果他们没有采取任何操作
          // 设定5秒后可选择自动关闭，但只在用户没有操作的情况下
        } else {
          document.getElementById('modalTitle').textContent = '识别失败';
          document.getElementById('result').innerHTML = '<p style="color: #dc3545; font-weight: 500;">未能识别出二维码，请确保图片清晰且包含二维码</p>';
        }
      } catch (error) {
        document.getElementById('modalTitle').textContent = '识别失败';
        document.getElementById('result').innerHTML = '<p style="color: #dc3545; font-weight: 500;">识别失败: ' + error.message + '</p>';
      } finally {
        // 释放blob URL
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
  } else if (request.action === 'captureAndDecode') {
    captureAndDecodeQR();
    sendResponse({status: 'success'});
  }
});

// 截图识别二维码功能
function captureAndDecodeQR() {
  // 创建覆盖层
  const overlay = document.createElement('div');
  overlay.id = 'qrCaptureOverlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.3);
    z-index: 2147483647;
    cursor: crosshair;
    user-select: none;
  `;

  // 创建选择框
  const selectionBox = document.createElement('div');
  selectionBox.id = 'qrSelectionBox';
  selectionBox.style.cssText = `
    position: absolute;
    border: 2px dashed #ff0000;
    background: rgba(255, 0, 0, 0.1);
    display: none;
    pointer-events: none;
  `;

  // 创建提示文本
  const hint = document.createElement('div');
  hint.id = 'qrCaptureHint';
  hint.textContent = '按住鼠标左键拖动选择二维码区域，按 ESC 取消';
  hint.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 14px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    z-index: 2147483648;
    pointer-events: none;
  `;

  document.body.appendChild(overlay);
  document.body.appendChild(selectionBox);
  document.body.appendChild(hint);

  let isSelecting = false;
  let startX, startY, endX, endY;

  // 鼠标按下事件
  overlay.addEventListener('mousedown', (e) => {
    isSelecting = true;
    startX = e.clientX;
    startY = e.clientY;
    
    selectionBox.style.left = startX + 'px';
    selectionBox.style.top = startY + 'px';
    selectionBox.style.width = '0px';
    selectionBox.style.height = '0px';
    selectionBox.style.display = 'block';
  });

  // 鼠标移动事件
  overlay.addEventListener('mousemove', (e) => {
    if (!isSelecting) return;
    
    endX = e.clientX;
    endY = e.clientY;
    
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
  });

  // 鼠标释放事件
  overlay.addEventListener('mouseup', async (e) => {
    if (!isSelecting) return;
    isSelecting = false;
    
    endX = e.clientX;
    endY = e.clientY;
    
    const width = Math.abs(endX - startX);
    const height = Math.abs(endY - startY);
    const left = Math.min(startX, endX);
    const top = Math.min(startY, endY);
    
    // 移除覆盖层
    overlay.remove();
    selectionBox.remove();
    hint.remove();
    
    // 如果选择区域太小，提示用户
    if (width < 50 || height < 50) {
      alert('选择区域太小，请重新选择');
      return;
    }
    
    // 发送消息给 service worker 进行截图
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'captureAndDecode',
        selection: { left, top, width, height }
      });
      
      if (response && response.success && response.dataUrl) {
        // 创建图片对象
        const img = new Image();
        img.onload = function() {
          // 创建canvas来裁剪选中的区域
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          
          const { left: scaledLeft, top: scaledTop, width: scaledWidth, height: scaledHeight } = response.selection;
          
          canvas.width = scaledWidth;
          canvas.height = scaledHeight;
          
          // 裁剪选中的区域
          ctx.drawImage(img, scaledLeft, scaledTop, scaledWidth, scaledHeight, 0, 0, scaledWidth, scaledHeight);
          
          // 获取图像数据
          const imageData = ctx.getImageData(0, 0, scaledWidth, scaledHeight);
          
          // 识别二维码
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          
          if (code && code.data) {
            // 移除覆盖层和选择框
            const existingOverlay = document.getElementById('qrCaptureOverlay');
            const existingSelectionBox = document.getElementById('qrSelectionBox');
            const existingHint = document.getElementById('qrCaptureHint');
            if (existingOverlay) existingOverlay.remove();
            if (existingSelectionBox) existingSelectionBox.remove();
            if (existingHint) existingHint.remove();
            
            // 显示识别结果
            showDecodeResult(code.data);
          } else {
            alert('未能识别出二维码，请确保选择区域包含清晰的二维码');
          }
        };
        
        img.onerror = function() {
          alert('加载截图失败');
        };
        
        img.src = response.dataUrl;
      } else if (response && response.error) {
        alert('截图识别失败: ' + response.error);
      } else {
        alert('未能识别出二维码，请确保选择区域包含清晰的二维码');
      }
    } catch (error) {
      console.error('截图识别失败:', error);
      alert('截图识别失败: ' + error.message);
    }
  });

  // ESC键取消选择
  const handleEscape = (e) => {
    if (e.key === 'Escape') {
      overlay.remove();
      selectionBox.remove();
      hint.remove();
      document.removeEventListener('keydown', handleEscape);
    }
  };
  
  document.addEventListener('keydown', handleEscape);
}

// 显示识别结果
function showDecodeResult(decodedText) {
  // 检查是否已存在结果弹窗，如果存在则先移除
  const existingModal = document.getElementById('qrResultModal');
  if (existingModal) {
    document.body.removeChild(existingModal);
  }

  // 创建结果弹窗
  const modal = document.createElement('div');
  modal.id = 'qrResultModal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.7);
    z-index: 2147483647;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  modal.innerHTML = `
    <div style="
      background: white;
      border-radius: 16px;
      padding: 30px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      position: relative;
    ">
      <div style="
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        padding-bottom: 15px;
        border-bottom: 1px solid #eee;
      ">
        <h3 style="margin: 0; font-size: 20px; color: #333;">✅ 识别成功</h3>
        <button id="closeResultBtn" style="
          background: #f8f9fa;
          border: 1px solid #ddd;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 18px;
          color: #666;
        ">×</button>
      </div>
      <div style="
        padding: 15px;
        background: #f8f9fa;
        border-radius: 8px;
        border-left: 4px solid #28a745;
        margin-bottom: 20px;
      ">
        <div style="font-weight: 600; color: #555; margin-bottom: 8px;">识别结果:</div>
        <div id="resultText" style="
          word-break: break-all;
          font-family: monospace;
          font-size: 14px;
          color: #333;
          line-height: 1.6;
        ">${decodedText}</div>
      </div>
      <div id="actionButtons" style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
        <button id="copyResultBtn" style="
          padding: 12px 24px;
          background: #28a745;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 140px;
          font-weight: 500;
        ">📋 复制内容</button>
        <button id="openResultBtn" style="
          padding: 12px 24px;
          background: #007bff;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 140px;
          font-weight: 500;
        ">🔗 打开链接</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // 检查识别结果是否为有效URL
  let isValidUrl = false;
  try {
    new URL(decodedText);
    isValidUrl = true;
  } catch (e) {
    const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
    if (domainRegex.test(decodedText)) {
      try {
        new URL('http://' + decodedText);
        isValidUrl = true;
      } catch (e2) {
        isValidUrl = false;
      }
    }
  }

  // 设置打开链接按钮状态
  const openResultBtn = document.getElementById('openResultBtn');
  if (isValidUrl) {
    openResultBtn.onclick = function() {
      try {
        let url;
        try {
          url = new URL(decodedText);
        } catch (e) {
          const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
          if (domainRegex.test(decodedText)) {
            url = new URL('http://' + decodedText);
          } else {
            throw new Error('Invalid URL format');
          }
        }
        window.open(url.href, '_blank');
      } catch (e) {
        console.error('URL格式错误: ', e);
      }
    };
    openResultBtn.disabled = false;
    openResultBtn.style.opacity = '1';
    openResultBtn.style.cursor = 'pointer';
  } else {
    openResultBtn.disabled = true;
    openResultBtn.style.opacity = '0.5';
    openResultBtn.style.cursor = 'not-allowed';
    openResultBtn.title = '识别结果不是有效的URL，无法打开';
  }

  // 复制内容
  document.getElementById('copyResultBtn').onclick = function() {
    const button = this;
    const originalText = button.innerHTML;
    const originalBg = button.style.background;
    
    button.innerHTML = '✅ 已复制';
    button.style.background = '#20c997';
    
    navigator.clipboard.writeText(decodedText).then(() => {
      setTimeout(() => {
        button.innerHTML = originalText;
        button.style.background = originalBg;
      }, 2000);
    }).catch(err => {
      console.error('复制失败: ', err);
      button.innerHTML = originalText;
      button.style.background = originalBg;
      alert('复制失败: ' + err.message);
    });
  };

  // 关闭按钮
  document.getElementById('closeResultBtn').onclick = function() {
    if (modal.parentNode) {
      document.body.removeChild(modal);
    }
  };

  // 点击外部关闭
  modal.onclick = function(e) {
    if (e.target === modal) {
      if (modal.parentNode) {
        document.body.removeChild(modal);
      }
    }
  };
}