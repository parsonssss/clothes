/**
 * 图片管理模块
 * 负责图片处理和错误处理
 */

/**
 * 获取默认图片URL
 * @returns {string} 默认图片URL
 */
function getDefaultImageUrl() {
  return 'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYJCibdIkjPtymh5xicSMN2u5yZlmIbp3icicVicYqA1CnNgwjcEJYJJhZmw/0?wx_fmt=jpeg';
}

/**
 * 处理图片加载错误
 * @param {Object} outfitData - 搭配数据
 * @param {string} type - 错误类型，'preview'或'item'
 * @param {number} index - 项目索引
 * @returns {Object} 更新后的搭配数据
 */
function handleImageError(outfitData, type, index) {
  if (!outfitData) return outfitData;
  
  const defaultImageUrl = getDefaultImageUrl();
  
  if (type === 'preview') {
    // 更新搭配预览图
    outfitData.previewImage = defaultImageUrl;
  } else if (type === 'item' && index !== undefined && outfitData.items && outfitData.items[index]) {
    // 更新衣物图片
    outfitData.items[index].imageUrl = defaultImageUrl;
  } else if (type === 'similar' && index !== undefined && outfitData.similarOutfits && outfitData.similarOutfits[index]) {
    // 更新相似搭配图片
    outfitData.similarOutfits[index].previewImage = defaultImageUrl;
  }
  
  return outfitData;
}

/**
 * 验证图像URL是否有效
 * @param {string} url - 图像URL
 * @returns {boolean} URL是否有效
 */
function isValidImageUrl(url) {
  if (!url) return false;
  
  // 如果是本地路径或有效URL格式，认为是有效的
  if (url.startsWith('/') || 
      url.startsWith('http') || 
      url.startsWith('https') || 
      url.startsWith('wxfile://')) {
    return true;
  }
  
  return false;
}

/**
 * 获取临时文件URL
 * @param {Array} fileIDs - 文件ID数组
 * @returns {Promise<Object>} 包含fileID到临时URL映射的Promise
 */
function getTempFileURLs(fileIDs) {
  return new Promise((resolve, reject) => {
    if (!fileIDs || !Array.isArray(fileIDs) || fileIDs.length === 0) {
      resolve({});
      return;
    }
    
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: result => {
        const fileIDToURL = {};
        
        if (result && result.fileList) {
          result.fileList.forEach(file => {
            if (file.fileID && file.tempFileURL) {
              fileIDToURL[file.fileID] = file.tempFileURL;
            }
          });
        }
        
        resolve(fileIDToURL);
      },
      fail: err => {
        console.error('获取临时URL失败:', err);
        resolve({});
      }
    });
  });
}

module.exports = {
  getDefaultImageUrl,
  handleImageError,
  isValidImageUrl,
  getTempFileURLs
}; 