# SVG支持修复说明

## 问题描述
原始的网页右键扫码功能不支持SVG格式的图片进行二维码识别。

## 原因分析
1. 原始代码对所有图片类型使用相同处理方式：fetch → blob → canvas
2. SVG作为矢量图形，在转换为canvas时可能遇到跨域和尺寸问题
3. jsQR库需要位图数据进行识别，SVG需要正确渲染到canvas上

## 解决方案
在`foreground.js`的`decodeQRFromImage`函数中添加了SVG文件的特殊处理：

### 1. SVG检测
```javascript
const isSVG = imageUrl.toLowerCase().includes('.svg') || 
              imageUrl.toLowerCase().includes('image/svg+xml');
```

### 2. SVG特殊处理
- 直接使用URL而不转换为blob，避免跨域问题
- 设置`crossOrigin = 'anonymous'`属性
- 使用Promise确保SVG完全加载
- 设置明确尺寸（使用naturalWidth/naturalHeight或默认值300x300）
- 添加白色背景填充（SVG可能是透明的）
- 使用`drawImage`正确渲染SVG到canvas

### 3. 兼容性保持
- 非SVG图片仍然使用原来的fetch + blob方式处理
- 保持所有原有功能和错误处理逻辑

## 修改的文件
- `foreground.js` - 主要的二维码识别内容脚本

## 测试
创建了测试文件`test-qr.svg`来验证SVG支持功能。

## 预期效果
现在用户可以右键点击SVG图片并成功识别其中的二维码数据。