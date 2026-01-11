// 默认设置
const defaultSettings = {
    qrSize: 180,
    qrColorDark: '#000000',
    qrColorLight: '#ffffff',
    qrCorrectLevel: 'H',
    defaultAction: 'none',
    autoDetectUrl: true,
    logoImage: null,
    logoSize: 20
};

// 当前设置
let currentSettings = { ...defaultSettings };

// DOM 元素
const elements = {
    qrSize: document.getElementById('qr-size'),
    qrSizeValue: document.getElementById('qr-size-value'),
    qrColorDark: document.getElementById('qr-color-dark'),
    qrColorDarkValue: document.getElementById('qr-color-dark-value'),
    qrColorLight: document.getElementById('qr-color-light'),
    qrColorLightValue: document.getElementById('qr-color-light-value'),
    qrCorrectLevel: document.getElementById('qr-correct-level'),
    defaultAction: document.getElementById('default-action'),
    autoDetectUrl: document.getElementById('auto-detect-url'),
    logoUpload: document.getElementById('logo-upload'),
    logoUploadBtn: document.getElementById('logo-upload-btn'),
    logoPreview: document.getElementById('logo-preview'),
    logoPreviewImg: document.getElementById('logo-preview-img'),
    logoRemoveBtn: document.getElementById('logo-remove-btn'),
    logoSize: document.getElementById('logo-size'),
    logoSizeValue: document.getElementById('logo-size-value'),
    logoSizeSetting: document.getElementById('logo-size-setting'),
    saveBtn: document.getElementById('save-btn'),
    resetBtn: document.getElementById('reset-btn'),
    toast: document.getElementById('toast'),
    historyCount: document.getElementById('history-count'),
    clearHistorySettingsBtn: document.getElementById('clear-history-settings-btn')
};

// 页面加载时初始化
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    loadHistoryCount();
    setupEventListeners();
});

// 加载历史记录数量
function loadHistoryCount() {
    chrome.storage.local.get(['qrHistory'], function(result) {
        const history = result.qrHistory || [];
        elements.historyCount.textContent = history.length;
    });
}

// 加载设置
function loadSettings() {
    chrome.storage.local.get(['qrSettings'], function(result) {
        if (result.qrSettings) {
            currentSettings = { ...defaultSettings, ...result.qrSettings };
        }
        updateUI();
    });
}

// 更新 UI 显示
function updateUI() {
    elements.qrSize.value = currentSettings.qrSize;
    elements.qrSizeValue.textContent = currentSettings.qrSize;
    
    elements.qrColorDark.value = currentSettings.qrColorDark;
    elements.qrColorDarkValue.textContent = currentSettings.qrColorDark;
    
    elements.qrColorLight.value = currentSettings.qrColorLight;
    elements.qrColorLightValue.textContent = currentSettings.qrColorLight;
    
    elements.qrCorrectLevel.value = currentSettings.qrCorrectLevel;
    
    elements.defaultAction.value = currentSettings.defaultAction;
    
    elements.autoDetectUrl.checked = currentSettings.autoDetectUrl;

    // Logo 图片
    if (currentSettings.logoImage) {
        elements.logoPreviewImg.src = currentSettings.logoImage;
        elements.logoPreview.style.display = 'inline-block';
        elements.logoUploadBtn.style.display = 'none';
        elements.logoSizeSetting.style.display = 'block';
        elements.logoSize.value = currentSettings.logoSize;
        elements.logoSizeValue.textContent = currentSettings.logoSize + '%';
    } else {
        elements.logoPreview.style.display = 'none';
        elements.logoUploadBtn.style.display = 'flex';
        elements.logoSizeSetting.style.display = 'none';
    }
}

// 设置事件监听器
function setupEventListeners() {
    // 二维码大小滑块
    elements.qrSize.addEventListener('input', function() {
        elements.qrSizeValue.textContent = this.value;
    });

    // 前景色选择器
    elements.qrColorDark.addEventListener('input', function() {
        elements.qrColorDarkValue.textContent = this.value;
    });

    // 背景色选择器
    elements.qrColorLight.addEventListener('input', function() {
        elements.qrColorLightValue.textContent = this.value;
    });

    // Logo 上传按钮点击
    elements.logoUploadBtn.addEventListener('click', function() {
        elements.logoUpload.click();
    });

    // Logo 文件选择
    elements.logoUpload.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            // 验证文件类型
            if (!file.type.startsWith('image/')) {
                alert('请选择图片文件');
                return;
            }

            // 验证文件大小（最大 500KB）
            if (file.size > 500 * 1024) {
                alert('图片大小不能超过 500KB');
                return;
            }

            // 读取文件
            const reader = new FileReader();
            reader.onload = function(e) {
                currentSettings.logoImage = e.target.result;
                updateUI();
            };
            reader.readAsDataURL(file);
        }
    });

    // Logo 删除按钮
    elements.logoRemoveBtn.addEventListener('click', function() {
        currentSettings.logoImage = null;
        elements.logoUpload.value = '';
        updateUI();
    });

    // Logo 大小滑块
    elements.logoSize.addEventListener('input', function() {
        elements.logoSizeValue.textContent = this.value + '%';
    });

    // 保存按钮
    elements.saveBtn.addEventListener('click', saveSettings);

    // 恢复默认按钮
    elements.resetBtn.addEventListener('click', resetSettings);

    // 清除历史记录按钮
    elements.clearHistorySettingsBtn.addEventListener('click', function() {
        if (confirm('确定要清除所有历史记录吗？此操作不可撤销。')) {
            chrome.storage.local.remove(['qrHistory'], function() {
                loadHistoryCount();
                showToast('历史记录已清除');
            });
        }
    });
}

// 保存设置
function saveSettings() {
    currentSettings = {
        qrSize: parseInt(elements.qrSize.value),
        qrColorDark: elements.qrColorDark.value,
        qrColorLight: elements.qrColorLight.value,
        qrCorrectLevel: elements.qrCorrectLevel.value,
        defaultAction: elements.defaultAction.value,
        autoDetectUrl: elements.autoDetectUrl.checked,
        logoImage: currentSettings.logoImage,
        logoSize: parseInt(elements.logoSize.value)
    };

    chrome.storage.local.set({ qrSettings: currentSettings }, function() {
        showToast('设置已保存');
    });
}

// 恢复默认设置
function resetSettings() {
    if (confirm('确定要恢复默认设置吗？')) {
        currentSettings = { ...defaultSettings };
        updateUI();
        
        chrome.storage.local.set({ qrSettings: currentSettings }, function() {
            showToast('已恢复默认设置');
        });
    }
}

// 显示提示消息
function showToast(message) {
    elements.toast.querySelector('.toast-message').textContent = message;
    elements.toast.classList.add('show');
    
    setTimeout(() => {
        elements.toast.classList.remove('show');
    }, 2000);
}