document.addEventListener('DOMContentLoaded', function() {
    const textInput = document.getElementById('text-input');
    const qrcodeDiv = document.getElementById('qrcode');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const settingsBtn = document.getElementById('settings-btn');
    let qrcode = null;
    let debounceTimer = null;

    // 默认设置
    const defaultSettings = {
        qrSize: 180,
        qrColorDark: '#000000',
        qrColorLight: '#ffffff',
        qrCorrectLevel: 'H',
        defaultAction: 'none'
    };

    // 当前设置
    let settings = { ...defaultSettings };

    // 初始化显示占位符
    showPlaceholder();

    // 设置按钮点击事件 - 打开设置页面
    settingsBtn.addEventListener('click', function() {
        chrome.runtime.openOptionsPage();
    });

    // 加载用户设置
    chrome.storage.local.get(['qrSettings'], function(result) {
        if (result.qrSettings) {
            settings = { ...defaultSettings, ...result.qrSettings };
        }
        
        // 首先检查是否有从右键菜单传递的内容
        chrome.storage.local.get(['contextMenuContent'], function(result) {
            if (result.contextMenuContent) {
                // 如果有右键菜单传递的内容，使用它
                const content = result.contextMenuContent;
                textInput.value = content;
                // 生成二维码
                generateQRCode(content);
                // 立即清除存储的右键菜单内容，确保下次打开popup时获取当前标签页URL
                chrome.storage.local.remove(['contextMenuContent']);
            } else {
                // 否则获取当前标签页的URL并填充到输入框
                chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                    if (tabs && tabs[0] && tabs[0].url) {
                        const currentUrl = tabs[0].url;
                        textInput.value = currentUrl;
                        // 生成当前URL的二维码
                        generateQRCode(currentUrl);
                    }
                });
            }
        });
    });

    // 实现实时生成二维码（带防抖）
    textInput.addEventListener('input', function() {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            generateQRCode();
        }, 300); // 300ms防抖延迟
    });

    // 复制二维码图片到剪贴板
    copyBtn.addEventListener('click', async function() {
        const qrImg = qrcodeDiv.querySelector('img');
        if (!qrImg) {
            alert('请先生成二维码');
            return;
        }

        try {
            // 将图片转换为blob
            const response = await fetch(qrImg.src);
            const blob = await response.blob();
            
            // 复制到剪贴板
            await navigator.clipboard.write([
                new ClipboardItem({ [blob.type]: blob })
            ]);
            
            // 更新按钮状态
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ 已复制';
            copyBtn.classList.add('copied');
            
            // 重置按钮状态
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
            
        } catch (err) {
            console.error('复制二维码失败:', err);
            alert('复制失败: ' + err.message);
        }
    });

    // 下载二维码图片
    downloadBtn.addEventListener('click', function() {
        const qrImg = qrcodeDiv.querySelector('img');
        if (!qrImg) {
            alert('请先生成二维码');
            return;
        }

        // 创建一个临时的a标签来下载图片
        const link = document.createElement('a');
        link.href = qrImg.src;
        link.download = `qrcode-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    function generateQRCode(text) {
        const content = text !== undefined ? text : textInput.value.trim();
        
        if (!content) {
            showPlaceholder();
            return;
        }

        // 清除之前的二维码或占位符
        qrcodeDiv.innerHTML = '';
        
        // 获取纠错等级
        const correctLevelMap = {
            'L': QRCode.CorrectLevel.L,
            'M': QRCode.CorrectLevel.M,
            'Q': QRCode.CorrectLevel.Q,
            'H': QRCode.CorrectLevel.H
        };
        
        // 生成新的二维码，使用用户自定义的设置
        qrcode = new QRCode(qrcodeDiv, {
            text: content,
            width: settings.qrSize,
            height: settings.qrSize,
            colorDark: settings.qrColorDark,
            colorLight: settings.qrColorLight,
            correctLevel: correctLevelMap[settings.qrCorrectLevel] || QRCode.CorrectLevel.H
        });

        // 执行默认操作
        if (text !== undefined && settings.defaultAction !== 'none') {
            setTimeout(() => {
                if (settings.defaultAction === 'copy') {
                    copyBtn.click();
                } else if (settings.defaultAction === 'download') {
                    downloadBtn.click();
                }
            }, 500);
        }
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