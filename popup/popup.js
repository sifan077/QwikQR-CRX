document.addEventListener('DOMContentLoaded', function() {
    const textInput = document.getElementById('text-input');
    const qrcodeDiv = document.getElementById('qrcode');
    const copyBtn = document.getElementById('copy-btn');
    const downloadBtn = document.getElementById('download-btn');
    const settingsBtn = document.getElementById('settings-btn');
    const historyBtn = document.getElementById('history-btn');
    const historySection = document.getElementById('history-section');
    const historyList = document.getElementById('history-list');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    let qrcode = null;
    let debounceTimer = null;
    let historyVisible = false;

    // 历史记录最大数量
    const MAX_HISTORY_SIZE = 50;

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

    // 历史记录按钮点击事件 - 切换历史记录显示
    historyBtn.addEventListener('click', function() {
        historyVisible = !historyVisible;
        if (historyVisible) {
            historySection.style.display = 'block';
            historyBtn.classList.add('active');
            loadHistory();
        } else {
            historySection.style.display = 'none';
            historyBtn.classList.remove('active');
        }
    });

    // 清除历史记录按钮点击事件
    clearHistoryBtn.addEventListener('click', function() {
        if (confirm('确定要清除所有历史记录吗？')) {
            chrome.storage.local.remove(['qrHistory'], function() {
                loadHistory();
            });
        }
    });

    // 关闭历史记录按钮点击事件
    const closeHistoryBtn = document.getElementById('close-history-btn');
    closeHistoryBtn.addEventListener('click', function() {
        historyVisible = false;
        historySection.style.display = 'none';
        historyBtn.classList.remove('active');
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

        // 保存到历史记录（仅在用户主动生成时，不是防抖触发时）
        if (text !== undefined) {
            saveToHistory(content);
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

    // 保存到历史记录
    function saveToHistory(content) {
        chrome.storage.local.get(['qrHistory'], function(result) {
            let history = result.qrHistory || [];
            
            // 检查是否已存在相同内容的历史记录
            const existingIndex = history.findIndex(item => item.content === content);
            if (existingIndex !== -1) {
                // 如果存在，移除旧记录
                history.splice(existingIndex, 1);
            }
            
            // 创建新的历史记录
            const newRecord = {
                id: Date.now(),
                content: content,
                timestamp: Date.now(),
                settings: {
                    qrSize: settings.qrSize,
                    qrColorDark: settings.qrColorDark,
                    qrColorLight: settings.qrColorLight,
                    qrCorrectLevel: settings.qrCorrectLevel,
                    logoImage: settings.logoImage,
                    logoSize: settings.logoSize
                }
            };
            
            // 添加到开头
            history.unshift(newRecord);
            
            // 限制历史记录数量
            if (history.length > MAX_HISTORY_SIZE) {
                history = history.slice(0, MAX_HISTORY_SIZE);
            }
            
            // 保存到存储
            chrome.storage.local.set({ qrHistory: history });
            
            // 如果历史记录区域可见，刷新列表
            if (historyVisible) {
                loadHistory();
            }
        });
    }

    // 加载历史记录
    function loadHistory() {
        chrome.storage.local.get(['qrHistory'], function(result) {
            const history = result.qrHistory || [];
            
            if (history.length === 0) {
                historyList.innerHTML = '<div class="history-empty">暂无历史记录</div>';
                return;
            }
            
            historyList.innerHTML = '';
            
            history.forEach(record => {
                const item = document.createElement('div');
                item.className = 'history-item';
                item.innerHTML = `
                    <div class="history-item-content">
                        <div class="history-item-text">${escapeHtml(record.content)}</div>
                        <div class="history-item-time">${formatTime(record.timestamp)}</div>
                    </div>
                    <button class="history-item-delete" data-id="${record.id}" title="删除此记录">×</button>
                `;
                
                // 点击历史记录项，重新生成二维码
                item.addEventListener('click', function(e) {
                    if (e.target.classList.contains('history-item-delete')) {
                        e.stopPropagation();
                        deleteHistoryRecord(record.id);
                    } else {
                        textInput.value = record.content;
                        generateQRCode(record.content);
                        // 关闭历史记录区域
                        historyVisible = false;
                        historySection.style.display = 'none';
                        historyBtn.classList.remove('active');
                    }
                });
                
                historyList.appendChild(item);
            });
        });
    }

    // 删除单条历史记录
    function deleteHistoryRecord(id) {
        chrome.storage.local.get(['qrHistory'], function(result) {
            let history = result.qrHistory || [];
            history = history.filter(record => record.id !== id);
            chrome.storage.local.set({ qrHistory: history });
            loadHistory();
        });
    }

    // 格式化时间
    function formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // 如果是今天，显示时间
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // 如果是昨天，显示"昨天"
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        if (date.toDateString() === yesterday.toDateString()) {
            return '昨天 ' + date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
        }
        
        // 否则显示日期
        return date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' }) + ' ' + 
               date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }

    // HTML 转义
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
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