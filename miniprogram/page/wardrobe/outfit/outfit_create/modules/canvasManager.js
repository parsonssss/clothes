/**
 * 画布管理模块
 * 负责画布项目操作、绘制和布局管理
 */

/**
 * 创建新的画布项
 * @param {Object} clothing - 衣物数据
 * @param {number} nextId - 下一个ID值
 * @param {number} zIndex - 层级
 * @param {number} canvasWidth - 画布宽度
 * @param {number} canvasHeight - 画布高度
 * @returns {Object} 新的画布项
 */
function createCanvasItem(clothing, nextId, zIndex, canvasWidth, canvasHeight) {
  if (!clothing) {
    console.error('缺少衣物数据，无法创建画布项');
    return null;
  }
  
  // 获取有效的图片URL，按优先级尝试不同字段
  let imageUrl = null;
  
  // 按优先级尝试不同的图片URL字段
  if (clothing.tempImageUrl && (clothing.tempImageUrl.startsWith('http') || clothing.tempImageUrl.startsWith('https'))) {
    imageUrl = clothing.tempImageUrl;
  } else if (clothing.processedImageUrl && (clothing.processedImageUrl.startsWith('http') || clothing.processedImageUrl.startsWith('https'))) {
    imageUrl = clothing.processedImageUrl;
  } else if (clothing.imageUrl && (clothing.imageUrl.startsWith('http') || clothing.imageUrl.startsWith('https'))) {
    imageUrl = clothing.imageUrl;
  } else if (clothing.originalData && clothing.originalData.imageUrl && 
            (clothing.originalData.imageUrl.startsWith('http') || clothing.originalData.imageUrl.startsWith('https'))) {
    imageUrl = clothing.originalData.imageUrl;
  }
  
  if (!imageUrl) {
    console.error('衣物缺少有效的图片URL:', clothing);
    return null;
  }
  
  console.log('创建画布项，使用图片URL:', imageUrl);
  
  // 计算初始位置 - 根据画布大小居中放置
  const initialWidth = 150;
  const initialHeight = 150;
  const initialX = (canvasWidth - initialWidth) / 2;
  const initialY = (canvasHeight - initialHeight) / 2;
  
  // 返回标准化的画布项
  return {
    id: nextId,
    clothingId: clothing._id,
    imageUrl: imageUrl,
    x: initialX,
    y: initialY,
    width: initialWidth,
    height: initialHeight,
    zIndex: zIndex,
    layer: zIndex,
    active: true,
    rotation: 0,
    // 保存原始衣物信息，以便后续使用
    originalClothing: {
      id: clothing._id,
      name: clothing.name || '',
      category: clothing.category || '',
      type: clothing.type || ''
    }
  };
}

/**
 * 更新画布项的激活状态
 * @param {Array} canvasItems - 画布项数组
 * @param {number} activeId - 活跃项ID
 * @returns {Array} 更新后的画布项数组
 */
function updateItemsActiveState(canvasItems, activeId) {
  return canvasItems.map(item => ({
    ...item,
    active: item.id === activeId
  }));
}

/**
 * 计算新位置，确保不超出画布边界
 * @param {number} startX - 起始X坐标
 * @param {number} startY - 起始Y坐标
 * @param {number} moveX - X方向移动距离
 * @param {number} moveY - Y方向移动距离
 * @param {number} width - 项目宽度
 * @param {number} height - 项目高度
 * @param {number} canvasWidth - 画布宽度
 * @param {number} canvasHeight - 画布高度
 * @returns {Object} 新位置 {x, y}
 */
function calculateNewPosition(startX, startY, moveX, moveY, width, height, canvasWidth, canvasHeight) {
  // 计算新位置
  let newX = startX + moveX;
  let newY = startY + moveY;
  
  // 限制在画布内
  newX = Math.max(0, Math.min(newX, canvasWidth - width));
  newY = Math.max(0, Math.min(newY, canvasHeight - height));
  
  return { x: newX, y: newY };
}

/**
 * 计算调整大小后的尺寸
 * @param {number} currentWidth - 当前宽度
 * @param {number} currentHeight - 当前高度
 * @param {string} direction - 调整方向 "increase" 或 "decrease"
 * @param {number} canvasWidth - 画布宽度
 * @param {number} canvasHeight - 画布高度
 * @returns {Object} 新尺寸 {width, height}
 */
function calculateNewSize(currentWidth, currentHeight, direction, canvasWidth, canvasHeight) {
  // 确保输入值有效
  currentWidth = Number(currentWidth) || 150;
  currentHeight = Number(currentHeight) || 150;
  
  // 保持宽高比
  const aspectRatio = currentWidth / currentHeight;
  
  // 调整比例
  const scaleFactorIncrease = 1.2;  // 放大20%
  const scaleFactorDecrease = 0.8;  // 缩小20%
  
  let newWidth = currentWidth;
  let newHeight = currentHeight;
  
  // 根据方向调整大小
  if (direction === 'increase') {
    newWidth = currentWidth * scaleFactorIncrease;
    newHeight = newHeight * scaleFactorIncrease;
  } else if (direction === 'decrease') {
    newWidth = currentWidth * scaleFactorDecrease;
    newHeight = currentHeight * scaleFactorDecrease;
  }
  
  // 限制最小尺寸
  const minSize = 60;
  if (newWidth < minSize) {
    newWidth = minSize;
    newHeight = minSize / aspectRatio;
  }
  if (newHeight < minSize) {
    newHeight = minSize;
    newWidth = minSize * aspectRatio;
  }
  
  // 限制最大尺寸
  const maxWidth = canvasWidth * 0.9;
  const maxHeight = canvasHeight * 0.9;
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = maxWidth / aspectRatio;
  }
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = maxHeight * aspectRatio;
  }
  
  console.log(`调整大小: ${Math.round(currentWidth)}x${Math.round(currentHeight)} -> ${Math.round(newWidth)}x${Math.round(newHeight)}`);
  
  return { 
    width: Math.round(newWidth), 
    height: Math.round(newHeight) 
  };
}

/**
 * 计算新的旋转角度
 * @param {number} currentRotation - 当前旋转角度
 * @param {string} direction - 旋转方向 "clockwise" 或 "counterclockwise"
 * @returns {number} 新的旋转角度
 */
function calculateNewRotation(currentRotation, direction) {
  // 确保当前旋转角度是有效数字
  let newRotation = Number(currentRotation) || 0;
  
  // 每次旋转的角度
  const rotationStep = 15;
  
  // 根据方向旋转
  if (direction === 'clockwise') {
    newRotation += rotationStep;
  } else if (direction === 'counterclockwise') {
    newRotation -= rotationStep;
  }
  
  // 限制旋转范围在0-360度
  newRotation = ((newRotation % 360) + 360) % 360;
  
  console.log(`旋转: ${currentRotation} -> ${newRotation} 度`);
  
  return newRotation;
}

/**
 * 绘制画布内容
 * @param {string} canvasId - 画布ID
 * @param {Array} canvasItems - 画布项数组
 * @param {number} canvasWidth - 画布宽度
 * @param {number} canvasHeight - 画布高度
 * @returns {Promise<void>} 完成绘制的Promise
 */
function drawCanvas(canvasId, canvasItems, canvasWidth, canvasHeight) {
  return new Promise((resolve, reject) => {
    const ctx = wx.createCanvasContext(canvasId);
    
    // 绘制白色背景
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 按z-index排序画布项
    const sortedItems = [...canvasItems].sort((a, b) => a.zIndex - b.zIndex);
    
    // 绘制每个项目
    const drawPromises = sortedItems.map((item, index) => {
      return new Promise((resolve) => {
        // 加载图片
        wx.getImageInfo({
          src: item.imageUrl,
          success: imgInfo => {
            // 保存当前状态
            ctx.save();
            
            // 移动到项目中心
            ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
            
            // 旋转
            if (item.rotation) {
              ctx.rotate(item.rotation * Math.PI / 180);
            }
            
            // 绘制图像
            ctx.drawImage(imgInfo.path, -item.width / 2, -item.height / 2, item.width, item.height);
            
            // 恢复状态
            ctx.restore();
            
            resolve();
          },
          fail: () => {
            // 图片加载失败时使用占位符
            ctx.save();
            ctx.translate(item.x + item.width / 2, item.y + item.height / 2);
            
            // 旋转
            if (item.rotation) {
              ctx.rotate(item.rotation * Math.PI / 180);
            }
            
            // 绘制占位符
            ctx.fillStyle = '#F0F0F0';
            ctx.fillRect(-item.width / 2, -item.height / 2, item.width, item.height);
            ctx.fillStyle = '#CCCCCC';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('图片加载失败', 0, 0);
            
            ctx.restore();
            resolve();
          }
        });
      });
    });
    
    // 等待所有图像绘制完成
    Promise.all(drawPromises)
      .then(() => {
        ctx.draw(false, () => {
          resolve();
        });
      })
      .catch(err => {
        console.error('绘制画布失败:', err);
        reject(err);
      });
  });
}

/**
 * 计算新的图层值
 * @param {number} currentLayer - 当前图层值
 * @param {string} direction - 调整方向 "up" 或 "down"
 * @returns {number} 新的图层值
 */
function calculateNewLayer(currentLayer, direction) {
  // 确保当前图层值是有效数字
  let newLayer = Number(currentLayer) || 0;
  
  // 图层调整步长
  const layerStep = 1;
  
  // 根据方向调整图层
  if (direction === 'up') {
    newLayer += layerStep;
  } else if (direction === 'down') {
    newLayer -= layerStep;
  }
  
  // 确保图层值不小于0
  newLayer = Math.max(0, newLayer);
  
  console.log(`调整图层: ${currentLayer} -> ${newLayer}`);
  
  return newLayer;
}

module.exports = {
  createCanvasItem,
  updateItemsActiveState,
  calculateNewPosition,
  calculateNewSize,
  calculateNewRotation,
  drawCanvas,
  calculateNewLayer
};
