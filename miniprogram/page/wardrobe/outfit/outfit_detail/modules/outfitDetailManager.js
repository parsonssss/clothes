/**
 * 搭配详情管理模块
 * 负责搭配详情数据的获取和处理
 */

/**
 * 获取搭配详情
 * @param {string} outfitId - 搭配ID
 * @returns {Promise<Object>} 包含搭配详情的Promise
 */
function getOutfitDetail(outfitId) {
  return new Promise((resolve, reject) => {
    if (!outfitId) {
      reject(new Error('搭配ID不能为空'));
      return;
    }
    
    console.log('开始获取搭配详情，ID:', outfitId);
    
    const db = wx.cloud.database();
    
    db.collection('outfits')
      .doc(outfitId)
      .get()
      .then(res => {
        console.log('获取搭配详情成功:', res.data);
        
        if (!res.data) {
          reject(new Error('搭配数据为空'));
          return;
        }
        
        // 处理搭配数据
        const outfitData = res.data;
        
        // 添加格式化后的日期
        if (outfitData.createTime) {
          outfitData.createTimeFormatted = formatDate(outfitData.createTime);
        }
        
        // 确保outfitData有id字段
        if (!outfitData.id && outfitData._id) {
          outfitData.id = outfitData._id;
        }
        
        // 处理衣物项数据
        if (outfitData.items && Array.isArray(outfitData.items)) {
          console.log('搭配包含衣物项数量:', outfitData.items.length);
          
          // 如果衣物项只包含ID，需要获取完整的衣物数据
          const needFetchClothes = outfitData.items.some(item => 
            item.clothingId && (!item.name || !item.imageUrl)
          );
          
          if (needFetchClothes) {
            console.log('需要获取完整的衣物数据');
            
            // 收集所有需要获取的衣物ID
            const clothingIds = outfitData.items
              .filter(item => item.clothingId)
              .map(item => item.clothingId);
            
            if (clothingIds.length > 0) {
              // 获取衣物数据
              return getClothesData(clothingIds)
                .then(clothesData => {
                  // 更新衣物项数据
                  outfitData.items = outfitData.items.map(item => {
                    if (item.clothingId) {
                      const clothingData = clothesData.find(c => c._id === item.clothingId);
                      if (clothingData) {
                        // 合并衣物数据
                        return {
                          ...item,
                          name: item.name || clothingData.name,
                          type: item.type || clothingData.type || clothingData.category,
                          category: item.category || clothingData.category,
                          imageUrl: item.imageUrl || clothingData.imageUrl || clothingData.processedImageUrl || clothingData.imageFileID,
                          originalClothing: clothingData
                        };
                      }
                    }
                    return item;
                  });
                  
                  // 处理图片URL
                  return processImageUrls(outfitData);
                });
            }
          }
        }
        
        // 处理图片URL
        return processImageUrls(outfitData);
      })
      .then(processedData => {
        resolve(processedData);
      })
      .catch(err => {
        console.error('获取搭配详情失败:', err);
        
        // 检查错误类型
        if (err.errCode === -1 || err.errMsg && err.errMsg.includes('not found')) {
          // 数据不存在的错误
          reject(new Error('数据不存在'));
        } else {
          // 其他错误
          reject(err);
        }
      });
  });
}

/**
 * 获取衣物数据
 * @param {Array} clothingIds - 衣物ID数组
 * @returns {Promise<Array>} 包含衣物数据的Promise
 */
function getClothesData(clothingIds) {
  return new Promise((resolve, reject) => {
    if (!clothingIds || !Array.isArray(clothingIds) || clothingIds.length === 0) {
      resolve([]);
      return;
    }
    
    console.log('获取衣物数据，ID数量:', clothingIds.length);
    
    const db = wx.cloud.database();
    const _ = db.command;
    
    // 查询条件：衣物ID在指定数组中
    db.collection('clothes')
      .where({
        _id: _.in(clothingIds)
      })
      .get()
      .then(res => {
        console.log('获取衣物数据成功:', res.data);
        resolve(res.data || []);
      })
      .catch(err => {
        console.error('获取衣物数据失败:', err);
        resolve([]);
      });
  });
}

/**
 * 处理搭配数据中的图片URL
 * @param {Object} outfitData - 搭配数据
 * @returns {Promise<Object>} 处理后的搭配数据
 */
function processImageUrls(outfitData) {
  return new Promise((resolve, reject) => {
    // 收集所有需要获取临时URL的fileID
    const fileIDs = [];
    
    // 收集搭配预览图的fileID
    if (outfitData.imageFileID && outfitData.imageFileID.includes('cloud://')) {
      fileIDs.push(outfitData.imageFileID);
    } else if (outfitData.previewImage && outfitData.previewImage.includes('cloud://')) {
      fileIDs.push(outfitData.previewImage);
    }
    
    // 收集搭配中每个衣物图片的fileID
    if (outfitData.items && Array.isArray(outfitData.items)) {
      console.log('处理搭配中的衣物项，数量:', outfitData.items.length);
      outfitData.items.forEach((item, index) => {
        console.log(`衣物项 ${index}:`, item);
        
        // 检查多种可能的图片字段
        if (item.imageUrl && item.imageUrl.includes('cloud://')) {
          fileIDs.push(item.imageUrl);
        } else if (item.imageFileID && item.imageFileID.includes('cloud://')) {
          fileIDs.push(item.imageFileID);
        } else if (item.fileID && item.fileID.includes('cloud://')) {
          fileIDs.push(item.fileID);
        }
        
        // 确保每个衣物项都有名称
        if (!item.name && item.clothingName) {
          item.name = item.clothingName;
        } else if (!item.name && item.originalClothing && item.originalClothing.name) {
          item.name = item.originalClothing.name;
        } else if (!item.name) {
          item.name = `衣物 ${index + 1}`;
        }
        
        // 确保每个衣物项都有类型
        if (!item.type && item.clothingType) {
          item.type = item.clothingType;
        } else if (!item.type && item.originalClothing && item.originalClothing.type) {
          item.type = item.originalClothing.type;
        } else if (!item.type && item.category) {
          item.type = item.category;
        }
      });
    } else {
      console.warn('搭配数据中没有衣物项或衣物项不是数组');
      // 如果没有衣物项，创建一个空数组
      outfitData.items = [];
    }
    
    // 如果没有需要获取临时URL的fileID，直接返回原始数据
    if (fileIDs.length === 0) {
      console.log('没有需要获取临时URL的fileID');
      
      // 确保有预览图
      ensureDefaultImages(outfitData);
      
      resolve(outfitData);
      return;
    }
    
    console.log('需要获取临时URL的文件数量:', fileIDs.length);
    
    // 获取临时URL
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: result => {
        console.log('获取临时URL成功:', result);
        
        // 创建fileID到临时URL的映射
        const fileIDToURL = {};
        result.fileList.forEach(file => {
          if (file.fileID && file.tempFileURL) {
            fileIDToURL[file.fileID] = file.tempFileURL;
          }
        });
        
        // 更新搭配预览图URL
        if (outfitData.imageFileID && outfitData.imageFileID.includes('cloud://')) {
          outfitData.previewImage = fileIDToURL[outfitData.imageFileID] || outfitData.previewImage;
        } else if (outfitData.previewImage && outfitData.previewImage.includes('cloud://')) {
          outfitData.previewImage = fileIDToURL[outfitData.previewImage] || outfitData.previewImage;
        }
        
        // 更新搭配中每个衣物的图片URL
        if (outfitData.items && Array.isArray(outfitData.items)) {
          outfitData.items.forEach(item => {
            // 检查多种可能的图片字段
            if (item.imageUrl && item.imageUrl.includes('cloud://')) {
              item.imageUrl = fileIDToURL[item.imageUrl] || item.imageUrl;
            } else if (item.imageFileID && item.imageFileID.includes('cloud://')) {
              item.imageUrl = fileIDToURL[item.imageFileID] || item.imageUrl;
              // 保存原始fileID
              item.imageFileID = item.imageFileID;
            } else if (item.fileID && item.fileID.includes('cloud://')) {
              item.imageUrl = fileIDToURL[item.fileID] || item.imageUrl;
              // 保存原始fileID
              item.imageFileID = item.fileID;
            }
          });
        }
        
        // 确保有预览图
        ensureDefaultImages(outfitData);
        
        resolve(outfitData);
      },
      fail: err => {
        console.error('获取临时URL失败:', err);
        
        // 确保有预览图
        ensureDefaultImages(outfitData);
        
        // 即使获取临时URL失败，也返回处理后的数据
        resolve(outfitData);
      }
    });
  });
}

/**
 * 确保搭配数据中的图片都有默认值
 * @param {Object} outfitData - 搭配数据
 */
function ensureDefaultImages(outfitData) {
  // 默认图片URL
  const defaultImageUrl = 'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYJCibdIkjPtymh5xicSMN2u5yZlmIbp3icicVicYqA1CnNgwjcEJYJJhZmw/0?wx_fmt=jpeg';
  
  // 确保有预览图
  if (!outfitData.previewImage) {
    outfitData.previewImage = defaultImageUrl;
  }
  
  // 确保每个衣物都有图片URL和名称
  if (outfitData.items && Array.isArray(outfitData.items)) {
    outfitData.items.forEach((item, index) => {
      // 确保有图片URL
      if (!item.imageUrl) {
        item.imageUrl = defaultImageUrl;
      }
      
      // 确保有名称
      if (!item.name) {
        item.name = `衣物 ${index + 1}`;
      }
      
      // 确保有类型
      if (!item.type) {
        // 尝试从其他字段推断类型
        if (item.category) {
          item.type = item.category;
        } else if (item.clothingType) {
          item.type = item.clothingType;
        } else {
          item.type = '未分类';
        }
      }
      
      // 确保有ID
      if (!item.id) {
        if (item.clothingId) {
          item.id = item.clothingId;
        } else if (item._id) {
          item.id = item._id;
        } else {
          item.id = `item-${index}`;
        }
      }
    });
  } else {
    // 如果没有衣物项，创建一个空数组
    outfitData.items = [];
  }
}

/**
 * 获取相似搭配
 * @param {string} category - 搭配类别
 * @param {string} currentOutfitId - 当前搭配ID
 * @param {string} userOpenId - 用户OpenID
 * @returns {Promise<Array>} 包含相似搭配的Promise
 */
function getSimilarOutfits(category, currentOutfitId, userOpenId) {
  return new Promise((resolve, reject) => {
    if (!category) {
      console.log('没有提供搭配类别，无法获取相似搭配');
      resolve([]);
      return;
    }
    
    console.log('开始获取相似搭配，类别:', category);
    
    const db = wx.cloud.database();
    const _ = db.command;
    
    // 构建查询条件
    const query = {
      category: category
    };
    
    // 如果有用户OpenID，添加到查询条件
    if (userOpenId) {
      query._openid = userOpenId;
    }
    
    // 排除当前搭配
    if (currentOutfitId) {
      query._id = _.neq(currentOutfitId);
    }
    
    db.collection('outfits')
      .where(query)
      .limit(3) // 最多获取3个相似搭配
      .get()
      .then(res => {
        console.log('获取相似搭配成功:', res.data);
        
        let similarOutfits = res.data || [];
        
        // 如果没有相似搭配，直接返回空数组
        if (similarOutfits.length === 0) {
          console.log('没有找到相似搭配');
          resolve([]);
          return;
        }
        
        // 处理每个搭配的数据
        similarOutfits = similarOutfits.map(outfit => {
          // 添加格式化后的日期
          if (outfit.createTime) {
            outfit.createTimeFormatted = formatDate(outfit.createTime);
          }
          
          // 确保有id字段
          if (!outfit.id && outfit._id) {
            outfit.id = outfit._id;
          }
          
          return outfit;
        });
        
        // 处理图片URL
        processSimilarOutfitsImageUrls(similarOutfits)
          .then(processedOutfits => {
            resolve(processedOutfits);
          })
          .catch(err => {
            console.error('处理相似搭配图片URL失败:', err);
            // 即使处理图片URL失败，也返回原始数据
            resolve(similarOutfits);
          });
      })
      .catch(err => {
        console.error('获取相似搭配失败:', err);
        // 出错时返回空数组
        resolve([]);
      });
  });
}

/**
 * 处理相似搭配数据中的图片URL
 * @param {Array} similarOutfits - 相似搭配数据数组
 * @returns {Promise<Array>} 处理后的相似搭配数据数组
 */
function processSimilarOutfitsImageUrls(similarOutfits) {
  return new Promise((resolve, reject) => {
    // 收集所有需要获取临时URL的fileID
    const fileIDs = [];
    
    // 收集搭配预览图的fileID
    similarOutfits.forEach(outfit => {
      if (outfit.imageFileID && outfit.imageFileID.includes('cloud://')) {
        fileIDs.push(outfit.imageFileID);
      } else if (outfit.previewImage && outfit.previewImage.includes('cloud://')) {
        fileIDs.push(outfit.previewImage);
      }
    });
    
    // 如果没有需要获取临时URL的fileID，直接返回原始数据
    if (fileIDs.length === 0) {
      console.log('相似搭配没有需要获取临时URL的fileID');
      
      // 确保每个搭配都有预览图
      similarOutfits.forEach(outfit => {
        ensureDefaultImages(outfit);
      });
      
      resolve(similarOutfits);
      return;
    }
    
    console.log('相似搭配需要获取临时URL的文件数量:', fileIDs.length);
    
    // 获取临时URL
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: result => {
        console.log('获取相似搭配临时URL成功:', result);
        
        // 创建fileID到临时URL的映射
        const fileIDToURL = {};
        result.fileList.forEach(file => {
          if (file.fileID && file.tempFileURL) {
            fileIDToURL[file.fileID] = file.tempFileURL;
          }
        });
        
        // 更新搭配预览图URL
        similarOutfits.forEach(outfit => {
          if (outfit.imageFileID && outfit.imageFileID.includes('cloud://')) {
            outfit.previewImage = fileIDToURL[outfit.imageFileID] || outfit.previewImage;
          } else if (outfit.previewImage && outfit.previewImage.includes('cloud://')) {
            outfit.previewImage = fileIDToURL[outfit.previewImage] || outfit.previewImage;
          }
          
          // 确保有预览图
          ensureDefaultImages(outfit);
        });
        
        resolve(similarOutfits);
      },
      fail: err => {
        console.error('获取相似搭配临时URL失败:', err);
        
        // 确保每个搭配都有预览图
        similarOutfits.forEach(outfit => {
          ensureDefaultImages(outfit);
        });
        
        // 即使获取临时URL失败，也返回处理后的数据
        resolve(similarOutfits);
      }
    });
  });
}

/**
 * 格式化日期
 * @param {Date|number|string} date - 日期对象或时间戳
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  if (!date) return '未知日期';
  
  try {
    // 如果是时间戳或字符串，转为Date对象
    if (!(date instanceof Date)) {
      date = new Date(date);
    }
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      return '未知日期';
    }
    
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  } catch (error) {
    console.error('格式化日期出错:', error);
    return '未知日期';
  }
}

/**
 * 生成模拟搭配数据（仅用于开发测试）
 * @param {boolean} useEmptyData - 是否使用空数据
 * @returns {Object} 模拟搭配数据
 */
function generateMockOutfit(useEmptyData = false) {
  // 如果指定使用空数据，则返回null
  if (useEmptyData) {
    console.log('生成空的模拟搭配数据');
    return null;
  }
  
  // 默认图片URL
  const defaultImageUrl = 'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYJCibdIkjPtymh5xicSMN2u5yZlmIbp3icicVicYqA1CnNgwjcEJYJJhZmw/0?wx_fmt=jpeg';
  
  const mockOutfit = {
    id: 'mock-outfit-1',
    _id: 'mock-outfit-1',
    name: '模拟搭配',
    category: 'daily',
    previewImage: defaultImageUrl,
    description: '这是一套模拟的日常穿搭，适合各种场合穿着。',
    items: [
      { 
        id: 'item1', 
        clothingId: 'item1',
        name: '白色T恤', 
        type: 'top', 
        category: '上衣',
        imageUrl: defaultImageUrl,
        x: 100,
        y: 100,
        width: 150,
        height: 150,
        rotation: 0,
        zIndex: 1
      },
      { 
        id: 'item2', 
        clothingId: 'item2',
        name: '牛仔裤', 
        type: 'bottom', 
        category: '裤子',
        imageUrl: defaultImageUrl,
        x: 100,
        y: 250,
        width: 150,
        height: 200,
        rotation: 0,
        zIndex: 2
      },
      { 
        id: 'item3', 
        clothingId: 'item3',
        name: '黑色外套', 
        type: 'outerwear', 
        category: '外套',
        imageUrl: defaultImageUrl,
        x: 100,
        y: 50,
        width: 180,
        height: 180,
        rotation: 0,
        zIndex: 3
      },
      { 
        id: 'item4', 
        clothingId: 'item4',
        name: '运动鞋', 
        type: 'shoes', 
        category: '鞋子',
        imageUrl: defaultImageUrl,
        x: 100,
        y: 450,
        width: 120,
        height: 80,
        rotation: 0,
        zIndex: 4
      }
    ],
    createTime: new Date().getTime(),
    tags: ['舒适', '百搭', '时尚']
  };
  
  // 添加格式化后的日期
  mockOutfit.createTimeFormatted = formatDate(mockOutfit.createTime);
  
  return mockOutfit;
}

/**
 * 生成模拟相似搭配数据（仅用于开发测试）
 * @param {boolean} useEmptyData - 是否使用空数据
 * @returns {Array} 模拟相似搭配数据数组
 */
function generateMockSimilarOutfits(useEmptyData = false) {
  // 如果指定使用空数据，则返回空数组
  if (useEmptyData) {
    console.log('生成空的模拟相似搭配数据');
    return [];
  }
  
  const mockSimilarOutfits = [
    {
      id: 'similar-1',
      _id: 'similar-1',
      name: '相似搭配1',
      previewImage: 'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYJCibdIkjPtymh5xicSMN2u5yZlmIbp3icicVicYqA1CnNgwjcEJYJJhZmw/0?wx_fmt=jpeg',
      createTime: new Date().getTime() - 86400000 // 昨天
    },
    {
      id: 'similar-2',
      _id: 'similar-2',
      name: '相似搭配2',
      previewImage: 'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYJCibdIkjPtymh5xicSMN2u5yZlmIbp3icicVicYqA1CnNgwjcEJYJJhZmw/0?wx_fmt=jpeg',
      createTime: new Date().getTime() - 172800000 // 前天
    }
  ];
  
  // 添加格式化后的日期
  mockSimilarOutfits.forEach(outfit => {
    outfit.createTimeFormatted = formatDate(outfit.createTime);
  });
  
  return mockSimilarOutfits;
}

module.exports = {
  getOutfitDetail,
  getSimilarOutfits,
  generateMockOutfit,
  generateMockSimilarOutfits,
  formatDate,
  getClothesData,
  processImageUrls,
  ensureDefaultImages
}; 