document.addEventListener('DOMContentLoaded', function() {
    const textInput = document.getElementById('text-input');
    const generateBtn = document.getElementById('generate-btn');
    const qrcodeDiv = document.getElementById('qrcode');
    let qrcode = null;

    // 初始化显示占位符
    showPlaceholder();

    // 首先检查是否有从右键菜单传递的内容
    chrome.storage.local.get(['contextMenuContent'], function(result) {
        if (result.contextMenuContent) {
            // 如果有右键菜单传递的内容，使用它
            const content = result.contextMenuContent;
            textInput.value = content;
            // 清除之前的二维码或占位符
            qrcodeDiv.innerHTML = '';
            // 生成二维码
            qrcode = new QRCode(qrcodeDiv, {
                text: content,
                width: 180,
                height: 180,
                colorDark: '#000000',
                colorLight: '#ffffff',
                correctLevel: QRCode.CorrectLevel.H
            });
            // 清除已使用的存储内容
            chrome.storage.local.remove('contextMenuContent');
        } else {
            // 否则获取当前标签页的URL并填充到输入框
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                if (tabs && tabs[0] && tabs[0].url) {
                    const currentUrl = tabs[0].url;
                    textInput.value = currentUrl;
                    // 清除之前的二维码或占位符
                    qrcodeDiv.innerHTML = '';
                    // 生成当前URL的二维码
                    qrcode = new QRCode(qrcodeDiv, {
                        text: currentUrl,
                        width: 180,
                        height: 180,
                        colorDark: '#000000',
                        colorLight: '#ffffff',
                        correctLevel: QRCode.CorrectLevel.H
                    });
                }
            });
        }
    });

    generateBtn.addEventListener('click', generateQRCode);
    textInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            generateQRCode();
        }
    });

    function generateQRCode() {
        const text = textInput.value.trim();
        
        if (!text) {
            showPlaceholder();
            return;
        }

        // 清除之前的二维码或占位符
        qrcodeDiv.innerHTML = '';
        
        // 生成新的二维码
        qrcode = new QRCode(qrcodeDiv, {
            text: text,
            width: 180,
            height: 180,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.H
        });
    }

    function showPlaceholder() {
        qrcodeDiv.innerHTML = `
            <div class="placeholder-container">
                <div class="placeholder-icon">📱</div>
                <p class="placeholder-text">输入内容生成二维码</p>
            </div>
        `;
    }

    // 页面加载时自动聚焦输入框
    textInput.focus();
});