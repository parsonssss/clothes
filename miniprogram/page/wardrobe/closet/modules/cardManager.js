/**
 * 类别卡片管理模块
 * 负责处理类别卡片的位置、显示和交互逻辑
 */

/**
 * 初始化卡片位置和可见性
 * @param {Number} currentIndex - 当前选中的卡片索引
 * @param {Number} categoriesLength - 类别总数
 * @return {Array} 卡片位置和显示状态数组
 */
function initCardPositions(currentIndex, categoriesLength) {
  const cards = [];
  
  for (let i = 0; i < categoriesLength; i++) {
    // 计算每张卡片相对于当前卡片的位置
    const relativePos = i - currentIndex;
    
    // 全部卡片都应该可见，只是通过transform移出可视区域
    const visible = Math.abs(relativePos) <= 3; // 显示当前卡片及前后各3张
    
    // 计算卡片的X轴偏移量 - 增加偏移量使卡片间距更合适
    const translateX = relativePos * 150; 
    
    // 计算z-index，确保当前卡片在最上层
    const zIndex = 10 - Math.abs(relativePos);
    
    // 计算缩放值，当前卡片为1，相邻卡片逐渐缩小
    const scale = relativePos === 0 ? 1 : Math.max(0.85, 1 - Math.abs(relativePos) * 0.1);
    
    // 计算透明度，当前卡片为1，相邻卡片稍微透明
    const opacity = relativePos === 0 ? 1 : Math.max(0.7, 1 - Math.abs(relativePos) * 0.15);
    
    cards.push({
      visible: visible,
      translateX: translateX,
      zIndex: zIndex,
      scale: scale,
      opacity: opacity
    });
  }
  
  return cards;
}

/**
 * 更新卡片位置
 * @param {Number} currentIndex - 当前选中的卡片索引
 * @param {Array} cards - 当前卡片状态数组
 * @param {Number} categoriesLength - 类别总数
 * @return {Array} 更新后的卡片位置和显示状态数组
 */
function updateCardPositions(currentIndex, cards, categoriesLength) {
  const updatedCards = cards.slice(); // 创建cards数组的副本
  
  for (let i = 0; i < categoriesLength; i++) {
    // 计算每张卡片相对于当前卡片的位置
    const relativePos = i - currentIndex;
    
    // 优化：当滑动到边缘时，调整可见范围，确保边缘卡片也能显示
    const visibleRange = currentIndex <= 1 || currentIndex >= categoriesLength - 2 ? 4 : 3;
    
    // 只显示当前卡片前后各visibleRange张卡片
    const visible = Math.abs(relativePos) <= visibleRange;
    
    // 提高边缘卡片的可见度
    const translateX = relativePos * 150;
    
    // 计算z-index，确保当前卡片在最上层
    const zIndex = 10 - Math.abs(relativePos);
    
    // 计算缩放值，使当前卡片稍大一些，相邻卡片逐渐缩小
    const scale = relativePos === 0 ? 1 : Math.max(0.85, 1 - Math.abs(relativePos) * 0.1);
    
    // 计算透明度，当前卡片为1，相邻卡片轻微透明
    const opacity = relativePos === 0 ? 1 : Math.max(0.7, 1 - Math.abs(relativePos) * 0.15);
    
    updatedCards[i] = {
      visible: visible,
      translateX: translateX,
      zIndex: zIndex,
      scale: scale,
      opacity: opacity
    };
  }
  
  return updatedCards;
}

/**
 * 统计各类别衣物数量
 * @param {Array} clothes - 衣物数据数组
 * @param {Array} categories - 类别数据数组
 * @return {Array} 更新后的类别数组，包含各类别的衣物数量
 */
function calculateCategoryCounts(clothes, categories) {
  // 复制一份类别数组，以便更新数量
  const updatedCategories = categories.map(cat => {
    return { ...cat, count: 0 };
  });
  
  // 设置总数
  updatedCategories[0].count = clothes.length;
  
  // 计算各个类别的数量
  clothes.forEach(item => {
    for (let i = 1; i < updatedCategories.length; i++) {
      if (item.category === updatedCategories[i].category) {
        updatedCategories[i].count++;
        break;
      }
    }
  });
  
  return updatedCategories;
}

module.exports = {
  initCardPositions,
  updateCardPositions,
  calculateCategoryCounts
}; 