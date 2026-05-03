document.addEventListener('DOMContentLoaded', function() {
    const textInput = document.getElementById('text-input');
    const qrcodeDiv = document.getElementById('qrcode');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const pasteHint = document.getElementById('paste-hint');
    const decodeResult = document.getElementById('decode-result');
    const decodeResultText = document.getElementById('decode-result-text');
    const decodeCopyBtn = document.getElementById('decode-copy-btn');
    const decodeOpenBtn = document.getElementById('decode-open-btn');
    let qrcode = null;
    let debounceTimer = null;
    let decodedUrl = null;

    // 默认设置
    const defaultSettings = {
        qrSize: 180,
        qrColorDark: '#000000',
        qrColorLight: '#ffffff',
        qrCorrectLevel: 'H',
        defaultAction: 'none',
        logoImage: null,
        logoSize: 20,
        darkMode: false
    };

    // 当前设置
    let settings = { ...defaultSettings };

    // 应用深色模式
    function applyDarkMode(enabled) {
        if (enabled) {
            document.body.classList.add('dark-mode');
        } else {
            document.body.classList.remove('dark-mode');
        }
    }

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

        // 应用深色模式
        applyDarkMode(settings.darkMode);

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
        // 隐藏解码结果区域
        hideDecodeResult();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            generateQRCode();
        }, 300); // 300ms防抖延迟
    });

    // 粘贴事件监听 - 识别剪贴板中的二维码图片
    document.addEventListener('paste', function(e) {
        const items = e.clipboardData.items;
        for (const item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const blob = item.getAsFile();
                decodeQRFromBlob(blob);
                break;
            }
        }
    });

    // 从 Blob 解码二维码
    function decodeQRFromBlob(blob) {
        const url = URL.createObjectURL(blob);
        const img = new Image();

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
                    showDecodeSuccess(code.data);
                } else {
                    showDecodeError('未检测到二维码');
                }
            } catch (err) {
                showDecodeError('识别失败: ' + err.message);
            } finally {
                URL.revokeObjectURL(url);
            }
        };

        img.onerror = function() {
            URL.revokeObjectURL(url);
            showDecodeError('无法加载图片');
        };

        img.src = url;
    }

    // 显示解码成功结果
    function showDecodeSuccess(text) {
        // 填入输入框并生成二维码
        textInput.value = text;
        generateQRCode(text);

        // 隐藏复制/下载二维码按钮
        document.querySelector('.button-section').style.display = 'none';

        // 检测是否为链接
        decodedUrl = null;
        let isValidUrl = false;
        try {
            new URL(text);
            isValidUrl = true;
        } catch (e) {
            const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;
            if (domainRegex.test(text)) {
                try {
                    new URL('http://' + text);
                    isValidUrl = true;
                    text = 'http://' + text;
                } catch (e2) {
                    isValidUrl = false;
                }
            }
        }

        if (isValidUrl) {
            decodedUrl = text;
            decodeOpenBtn.style.display = 'flex';
        } else {
            decodeOpenBtn.style.display = 'none';
        }

        // 显示结果区域
        decodeResultText.textContent = text;
        decodeResult.style.display = 'block';

        // 隐藏粘贴提示
        pasteHint.style.display = 'none';
    }

    // 显示解码失败
    function showDecodeError(message) {
        decodeResultText.textContent = message;
        decodeResultText.classList.add('error');
        decodeResult.style.display = 'block';
        decodeOpenBtn.style.display = 'none';
        decodedUrl = null;

        setTimeout(() => {
            decodeResultText.classList.remove('error');
        }, 3000);
    }

    // 隐藏解码结果
    function hideDecodeResult() {
        decodeResult.style.display = 'none';
        decodedUrl = null;
        // 恢复复制/下载二维码按钮
        document.querySelector('.button-section').style.display = 'flex';
    }

    // 复制解码结果
    decodeCopyBtn.addEventListener('click', function() {
        const text = decodeResultText.textContent;
        if (!text) return;

        navigator.clipboard.writeText(text).then(function() {
            const originalText = decodeCopyBtn.textContent;
            decodeCopyBtn.textContent = '✅ 已复制';
            decodeCopyBtn.classList.add('copied');
            setTimeout(() => {
                decodeCopyBtn.textContent = originalText;
                decodeCopyBtn.classList.remove('copied');
            }, 2000);
        }).catch(function(err) {
            alert('复制失败: ' + err.message);
        });
    });

    // 打开解码链接
    decodeOpenBtn.addEventListener('click', function() {
        if (decodedUrl) {
            window.open(decodedUrl, '_blank');
        }
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

        // 如果有 Logo 图片，添加到二维码中心
        if (settings.logoImage) {
            // 等待二维码生成完成
            setTimeout(() => {
                const qrImg = qrcodeDiv.querySelector('img');
                if (qrImg) {
                    addLogoToQRCode(qrImg, settings.logoImage, settings.logoSize);
                }
            }, 100);
        }

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

    // 在二维码中心添加 Logo
    function addLogoToQRCode(qrImg, logoData, logoSizePercent) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = qrImg.width;
        canvas.height = qrImg.height;

        // 绘制二维码
        ctx.drawImage(qrImg, 0, 0);

        // 计算 Logo 大小
        const logoSize = canvas.width * (logoSizePercent / 100);
        const logoX = (canvas.width - logoSize) / 2;
        const logoY = (canvas.height - logoSize) / 2;

        // 创建 Logo 图片
        const logoImg = new Image();
        logoImg.onload = function() {
            // 绘制白色背景（可选，为了让 Logo 更清晰）
            ctx.fillStyle = settings.qrColorLight;
            ctx.fillRect(logoX - 2, logoY - 2, logoSize + 4, logoSize + 4);

            // 绘制 Logo
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);

            // 替换原来的二维码图片
            const finalDataUrl = canvas.toDataURL('image/png');
            qrImg.src = finalDataUrl;
        };
        logoImg.src = logoData;
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
