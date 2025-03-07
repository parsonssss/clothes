/**
 * 数据管理模块
 * 负责衣物数据的加载、筛选、分页和存储
 */

/**
 * 加载衣物数据
 * @param {String} userOpenId - 用户OpenID
 * @param {Object} selectedCategory - 当前选中的类别，null表示全部
 * @param {Number} currentPage - 当前页码
 * @param {Number} pageSize - 每页数量
 * @return {Promise} 包含衣物数据、总数和总页数的Promise
 */
function loadClothes(userOpenId, selectedCategory, currentPage, pageSize) {
  return new Promise((resolve, reject) => {
    // 如果没有获取到用户OpenID，不进行数据获取
    if (!userOpenId) {
      reject(new Error('未获取到用户OpenID，无法获取衣物列表'));
      return;
    }
    
    const db = wx.cloud.database();
    
    // 构建查询条件
    let query = {
      _openid: userOpenId
    };
    
    // 如果选择了特定类别（非"全部"）
    if (selectedCategory && selectedCategory.id !== 0) {
      query.category = selectedCategory.category;
    }
    
    const skip = (currentPage - 1) * pageSize;
    
    // 先查询总数
    db.collection('clothes')
      .where(query)
      .count()
      .then(res => {
        const totalClothes = res.total;
        console.log('符合条件的衣物总数:', totalClothes);
        
        const totalPages = Math.ceil(totalClothes / pageSize) || 1; // 计算总页数，确保至少有1页
        
        // 始终获取所有衣物用于计算分类数量，确保类别数量统计准确
        const totalClothesPromise = db.collection('clothes')
          .where({ _openid: userOpenId })
          .field({ category: true }) // 只获取category字段以减小数据量
          .get()
          .then(totalRes => {
            console.log('获取到所有衣物数据用于类别统计，数量:', totalRes.data.length);
            return totalRes.data;
          });
        
        // 获取当前页数据
        return db.collection('clothes')
          .where(query)
          .skip(skip)
          .limit(pageSize)
          .orderBy('createTime', 'desc')
          .get()
          .then(pageRes => {
            // 处理衣物数据
            const clothes = pageRes.data.map(item => {
              return {
                _id: item._id,
                name: item.name,
                fileID: item.imageFileID || '',  // 确保fileID有值，避免undefined
                processedFileID: item.processedImageFileID || '', // 抠图后的图片ID
                tempImageUrl: '', // 先设置为空，后面会获取临时URL
                category: item.category,
                type: item.type,
                color: item.color,
                style: item.style,
                warmthLevel: item.warmthLevel,
                scenes: item.scenes,
                price: item.price || '' // 添加价格字段，如果不存在则设为空字符串
              };
            });
            
            // 先获取总分类数据，再返回结果
            return totalClothesPromise.then(totalClothesData => {
              resolve({
                clothes: clothes,
                totalClothes: totalClothes,
                totalPages: totalPages,
                totalClothesData: totalClothesData // 为计算分类数量而返回所有衣物数据
              });
            });
          });
      })
      .catch(err => {
        console.error('获取衣物列表失败:', err);
        reject(err);
      });
  });
}

/**
 * 保存衣物到数据库
 * @param {String} fileID - 图片的云存储ID
 * @param {String} originalImageUrl - 原始图片URL
 * @param {Object} analysisData - 衣物分析数据
 * @param {String} userOpenId - 用户OpenID
 * @param {Object} processedImageData - 抠图后的图片数据，包含fileID和tempImageUrl
 * @return {Promise} 保存结果
 */
function saveClothingToDatabase(fileID, originalImageUrl, analysisData, userOpenId, processedImageData = {}) {
  return new Promise((resolve, reject) => {
    const db = wx.cloud.database();
    
    // 创建新衣物记录
    const clothingData = {
      name: analysisData.name || '新衣物',
      imageFileID: fileID,
      originalImageUrl: originalImageUrl,
      processedImageFileID: processedImageData.fileID || '', // 抠图后的图片ID
      processedImageUrl: processedImageData.tempImageUrl || '', // 抠图后的图片URL
      category: analysisData.category || '未分类',
      type: analysisData.clothing_type || '未知',
      color: analysisData.color || '未知',
      style: analysisData.style || '未知',
      warmthLevel: analysisData.warmth_level || 3,
      scenes: analysisData.scene_applicability || ['休闲'],
      price: analysisData.price || '', // 添加价格字段，默认为空
      userOpenId: userOpenId, // 手动添加用户OpenID关联，确保账号与数据关联
      createTime: db.serverDate()
    };
    
    db.collection('clothes').add({
      data: clothingData,
      success: (res) => {
        resolve(res);
      },
      fail: (err) => {
        console.error('保存衣物失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 模拟数据用于测试
 * @param {Array} categories - 类别数据数组
 * @return {Object} 包含模拟的类别和衣物数据
 */
function simulateData(categories) {
  console.log('使用模拟数据测试界面');
  
  const updatedCategories = categories.map(cat => {
    return { ...cat, count: Math.floor(Math.random() * 10) + 1 };
  });
  
  updatedCategories[0].count = updatedCategories.slice(1).reduce((sum, cat) => sum + cat.count, 0);
  
  const mockClothes = [];
  for (let i = 0; i < 20; i++) {
    const catIndex = Math.floor(Math.random() * 6) + 1;
    mockClothes.push({
      _id: 'mock_' + i,
      name: '模拟衣物 ' + i,
      category: updatedCategories[catIndex].category,
      color: ['红色', '蓝色', '黑色', '白色', '灰色'][Math.floor(Math.random() * 5)],
      style: ['休闲', '正式', '运动', '户外'][Math.floor(Math.random() * 4)]
    });
  }
  
  return {
    categories: updatedCategories,
    clothes: mockClothes
  };
}

module.exports = {
  loadClothes,
  saveClothingToDatabase,
  simulateData
}; 