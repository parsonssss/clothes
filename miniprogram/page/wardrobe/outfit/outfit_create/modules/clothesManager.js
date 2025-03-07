/**
 * 衣物管理模块
 * 负责衣物数据的加载、筛选和分类处理
 */

/**
 * 加载用户的衣物数据
 * @param {string} userOpenId - 用户OpenID
 * @returns {Promise<Object>} 包含衣物数据和分类计数的对象
 */
function loadClothes(userOpenId) {
  return new Promise((resolve, reject) => {
    if (!userOpenId) {
      console.error('未获取到用户OpenID，无法获取衣物列表');
      reject(new Error('未获取到用户OpenID，无法获取衣物列表'));
      return;
    }
    
    const db = wx.cloud.database();
    
    // 构建查询条件 - 使用精确的用户OpenID
    // 同时支持_openid和openid两种字段名
    let query = db.command.or([
      { _openid: userOpenId },
      { openid: userOpenId }
    ]);
    
    console.log('查询条件:', JSON.stringify(query));
    
    // 首先获取所有衣物的类别信息，用于更新类别计数
    db.collection('clothes')
      .where(query)
      .field({ category: true }) // 只获取category字段减小数据量
      .get()
      .then(totalRes => {
        const categoryData = totalRes.data;
        console.log('获取到用于类别统计的衣物数据，数量:', categoryData.length);
        
        if (categoryData.length === 0) {
          console.warn('未找到该用户的衣物数据，OpenID:', userOpenId);
        }
        
        // 获取完整的衣物数据
        return db.collection('clothes')
          .where(query)
          .orderBy('createTime', 'desc')
          .get()
          .then(res => {
            console.log('获取到的完整衣物数据:', res.data);
            
            // 处理衣物数据，确保字段一致性
            const clothes = normalizeClothesData(res.data);
            
            // 返回衣物数据和类别数据
            resolve({
              clothes,
              categoryData
            });
          });
      })
      .catch(err => {
        console.error('获取衣物失败:', err);
        reject(err);
      });
  });
}

/**
 * 生成测试衣物数据用于开发和测试
 * @returns {Array} 测试衣物数据数组
 */
function generateTestClothes() {
  return [
    {
      _id: 'test1',
      name: '白色T恤',
      category: '上衣',
      type: 'T恤',
      color: '白色',
      tempImageUrl: 'https://picsum.photos/200/200?random=1'
    },
    {
      _id: 'test2',
      name: '牛仔裤',
      category: '裤子',
      type: '牛仔裤',
      color: '蓝色',
      tempImageUrl: 'https://picsum.photos/200/200?random=2'
    },
    {
      _id: 'test3',
      name: '黑色外套',
      category: '外套',
      type: '夹克',
      color: '黑色',
      tempImageUrl: 'https://picsum.photos/200/200?random=3'
    },
    {
      _id: 'test4',
      name: '运动鞋',
      category: '鞋子',
      type: '运动鞋',
      color: '白色',
      tempImageUrl: 'https://picsum.photos/200/200?random=4'
    },
    {
      _id: 'test5',
      name: '花裙子',
      category: '裙子',
      type: '连衣裙',
      color: '花色',
      tempImageUrl: 'https://picsum.photos/200/200?random=5'
    }
  ];
}

/**
 * 标准化衣物数据，确保所有字段存在和一致
 * @param {Array} clothesData - 原始衣物数据
 * @returns {Array} 标准化后的衣物数据
 */
function normalizeClothesData(clothesData) {
  if (!clothesData || !Array.isArray(clothesData)) {
    console.error('无效的衣物数据:', clothesData);
    return [];
  }
  
  return clothesData.map(item => {
    // 确保item是有效对象
    if (!item || typeof item !== 'object') {
      console.warn('跳过无效的衣物数据项');
      return null;
    }
    
    // 尝试获取图片URL，支持多种可能的字段名
    const imageUrl = item.processedImageUrl || 
                    item.processedImageFileID || 
                    item.imageFileID || 
                    item.fileID ||
                    item.imageUrl ||
                    '';
    
    return {
      _id: item._id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: item.name || item.clothingName || '未命名',
      category: item.category || item.clothingCategory || '未分类',
      type: item.type || item.clothingType || '',
      color: item.color || '',
      style: item.style || '',
      processedImageUrl: imageUrl,
      imageFileID: item.imageFileID || '',
      tempImageUrl: item.tempImageUrl || '', // 临时URL，初始为空
      // 添加原始数据，以防有其他需要的字段
      originalData: item
    };
  }).filter(item => item !== null); // 过滤掉无效项
}

/**
 * 根据类别筛选衣物
 * @param {Array} clothes - 衣物数据数组
 * @param {string} category - 类别名称
 * @returns {Array} 筛选后的衣物数组
 */
function filterByCategory(clothes, category) {
  if (!clothes || !Array.isArray(clothes)) {
    console.warn('无效的衣物数据用于筛选');
    return [];
  }
  
  // 如果类别为null或undefined或空字符串，返回所有衣物
  if (category === null || category === undefined || category === '') {
    console.log('返回所有衣物，无筛选');
    return clothes;
  }
  
  console.log(`筛选类别: "${category}", 衣物总数: ${clothes.length}`);
  
  // 筛选匹配类别的衣物
  const filtered = clothes.filter(item => {
    // 确保item和item.category存在
    if (!item || !item.category) {
      return false;
    }
    
    // 忽略大小写比较
    return item.category.toLowerCase() === category.toLowerCase();
  });
  
  console.log(`筛选后衣物数量: ${filtered.length}`);
  return filtered;
}

/**
 * 更新类别的计数信息
 * @param {Array} clothes - 衣物数据数组
 * @param {Array} categories - 类别数组
 * @returns {Array} 更新计数后的类别数组
 */
function updateCategoryCounts(clothes, categories) {
  if (!clothes || !Array.isArray(clothes) || !categories || !Array.isArray(categories)) {
    console.warn('无效的数据用于更新类别计数');
    return categories || [];
  }
  
  const updatedCategories = [...categories];
  
  // 重置所有计数
  updatedCategories.forEach(cat => {
    cat.count = 0;
  });
  
  // 计算每个类别的衣物数量
  clothes.forEach(item => {
    if (!item || !item.category) return;
    
    const category = updatedCategories.find(cat => cat.category === item.category);
    if (category) {
      category.count++;
    }
    
    // 更新全部类别的计数
    const allCategory = updatedCategories.find(cat => cat.id === 0);
    if (allCategory) {
      allCategory.count++;
    }
  });
  
  return updatedCategories;
}

module.exports = {
  loadClothes,
  generateTestClothes,
  filterByCategory,
  updateCategoryCounts,
  normalizeClothesData
};
