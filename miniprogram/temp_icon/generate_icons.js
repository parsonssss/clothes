const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// 定义颜色
const NORMAL_COLOR = "#D2C8B6";
const HIGHLIGHT_COLOR = "#C69C6D";

// 创建输出目录
const outputDir = path.join(__dirname, '..', 'image');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 创建画布
function createIconCanvas(width = 64, height = 64) {
  return createCanvas(width, height);
}

// 绘制衣柜图标
function drawWardrobeIcon(canvas, color) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 设置线条样式
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // 绘制衣柜轮廓
  ctx.beginPath();
  // 衣柜外框
  ctx.rect(14, 12, 36, 40);
  
  // 衣柜门
  ctx.moveTo(32, 12);
  ctx.lineTo(32, 52);
  
  // 左侧门把手
  ctx.moveTo(28, 32);
  ctx.lineTo(24, 32);
  
  // 右侧门把手
  ctx.moveTo(36, 32);
  ctx.lineTo(40, 32);
  
  // 绘制线条
  ctx.stroke();
  
  // 添加衣架效果
  ctx.beginPath();
  // 左侧衣架
  ctx.moveTo(20, 20);
  ctx.lineTo(26, 24);
  ctx.lineTo(26, 28);
  
  // 右侧衣架
  ctx.moveTo(44, 20);
  ctx.lineTo(38, 24);
  ctx.lineTo(38, 28);
  
  ctx.stroke();
}

// 绘制连衣裙图标
function drawDressIcon(canvas, color) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // 设置线条样式
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  
  // 衣领部分
  ctx.beginPath();
  ctx.moveTo(24, 12);
  ctx.lineTo(32, 18);
  ctx.lineTo(40, 12);
  ctx.stroke();
  
  // 连衣裙身体部分
  ctx.beginPath();
  // 左侧
  ctx.moveTo(24, 12);
  ctx.lineTo(20, 24);
  ctx.lineTo(22, 52);
  
  // 下摆
  ctx.lineTo(42, 52);
  
  // 右侧
  ctx.lineTo(44, 24);
  ctx.lineTo(40, 12);
  
  // 腰部设计
  ctx.moveTo(20, 24);
  ctx.lineTo(44, 24);
  
  // 绘制线条
  ctx.stroke();
  
  // 添加装饰细节
  ctx.beginPath();
  ctx.moveTo(28, 32);
  ctx.lineTo(36, 32);
  ctx.stroke();
}

// 保存图标文件
function saveIcon(canvas, filename) {
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(outputDir, filename);
  fs.writeFileSync(outputPath, buffer);
  console.log(`已生成图标: ${outputPath}`);
}

// 生成所有图标
function generateAllIcons() {
  console.log('开始生成日式简约风格图标...');
  
  // 生成普通状态衣柜图标
  const wardrobeCanvas = createIconCanvas();
  drawWardrobeIcon(wardrobeCanvas, NORMAL_COLOR);
  saveIcon(wardrobeCanvas, 'wardrobe-icon.png');
  
  // 生成高亮状态衣柜图标
  const wardrobeHLCanvas = createIconCanvas();
  drawWardrobeIcon(wardrobeHLCanvas, HIGHLIGHT_COLOR);
  saveIcon(wardrobeHLCanvas, 'wardrobe-icon-HL.png');
  
  // 生成普通状态连衣裙图标
  const dressCanvas = createIconCanvas();
  drawDressIcon(dressCanvas, NORMAL_COLOR);
  saveIcon(dressCanvas, 'short-dress.png');
  
  // 生成高亮状态连衣裙图标
  const dressHLCanvas = createIconCanvas();
  drawDressIcon(dressHLCanvas, HIGHLIGHT_COLOR);
  saveIcon(dressHLCanvas, 'short-dress-HL.png');
  
  console.log('所有图标生成完成!');
}

// 执行生成
generateAllIcons(); 