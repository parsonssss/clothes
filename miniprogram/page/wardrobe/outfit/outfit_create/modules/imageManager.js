/**
 * 图片管理模块
 * 负责图片URL获取、临时URL管理和图片上传
 */

/**
 * 获取衣物图片的临时访问URL
 * @param {Array} clothes - 衣物数据数组
 * @returns {Promise<Array>} 含有更新临时URL的衣物数据
 */
function getClothesImageUrls(clothes) {
  return new Promise((resolve, reject) => {
    // 验证输入
    if (!clothes || !Array.isArray(clothes) || clothes.length === 0) {
      console.warn('无效的衣物数据或空数组，无法获取图片URL');
      resolve(clothes || []);
      return;
    }
    
    // 复制衣物数组，避免直接修改原始数据
    const updatedClothes = [...clothes];
    
    // 收集所有需要获取临时URL的文件ID
    const fileIDs = [];
    const fileIDMap = {}; // 用于映射fileID到衣物索引
    
    updatedClothes.forEach((item, index) => {
      // 如果已经有有效的临时URL，跳过
      if (item.tempImageUrl && (
          item.tempImageUrl.startsWith('http') || 
          item.tempImageUrl.startsWith('wxfile://') ||
          item.tempImageUrl.startsWith('https'))) {
        console.log(`衣物 ${item._id} 已有有效的临时URL`);
        return;
      }
      
      // 检查是否有有效的云存储文件ID
      let fileID = null;
      
      // 按优先级尝试不同的字段
      if (item.processedImageUrl && item.processedImageUrl.startsWith('cloud://')) {
        fileID = item.processedImageUrl;
      } else if (item.imageFileID && item.imageFileID.startsWith('cloud://')) {
        fileID = item.imageFileID;
      } else if (item.fileID && item.fileID.startsWith('cloud://')) {
        fileID = item.fileID;
      } else if (item.imageUrl && item.imageUrl.startsWith('cloud://')) {
        fileID = item.imageUrl;
      }
      
      if (fileID) {
        fileIDs.push(fileID);
        fileIDMap[fileID] = index;
        console.log(`添加文件ID: ${fileID} 用于衣物 ${item._id}`);
      } else {
        console.warn(`衣物 ${item._id} 没有有效的云存储文件ID`);
      }
    });
    
    if (fileIDs.length === 0) {
      console.log('没有需要获取临时URL的有效文件ID');
      resolve(updatedClothes);
      return;
    }
    
    console.log('开始获取临时URL，文件数量:', fileIDs.length);
    
    // 分批处理，每批最多20个文件ID
    const batchSize = 20;
    const batches = [];
    
    for (let i = 0; i < fileIDs.length; i += batchSize) {
      batches.push(fileIDs.slice(i, i + batchSize));
    }
    
    console.log(`将 ${fileIDs.length} 个文件分为 ${batches.length} 批处理`);
    
    // 处理所有批次
    Promise.all(batches.map(batch => {
      return new Promise((batchResolve) => {
        wx.cloud.getTempFileURL({
          fileList: batch,
          success: res => {
            const fileList = res.fileList || [];
            
            if (fileList.length === 0) {
              console.warn('获取临时URL成功但列表为空');
              batchResolve();
              return;
            }
            
            // 更新衣物列表，添加临时URL
            fileList.forEach(fileInfo => {
              if (fileInfo.fileID && fileInfo.tempFileURL) {
                const index = fileIDMap[fileInfo.fileID];
                
                if (index !== undefined && updatedClothes[index]) {
                  updatedClothes[index].tempImageUrl = fileInfo.tempFileURL;
                  console.log(`已更新索引 ${index} 的临时URL: ${fileInfo.tempFileURL.substring(0, 50)}...`);
                }
              }
            });
            
            batchResolve();
          },
          fail: err => {
            console.error('获取临时文件URL失败:', err);
            batchResolve(); // 即使失败，也继续处理
          }
        });
      });
    }))
    .then(() => {
      // 检查是否有衣物没有获取到临时URL
      let missingUrlCount = 0;
      
      updatedClothes.forEach(item => {
        if (!item.tempImageUrl) {
          missingUrlCount++;
          
          // 尝试使用备用URL
          if (item.imageUrl && (item.imageUrl.startsWith('http') || item.imageUrl.startsWith('https'))) {
            item.tempImageUrl = item.imageUrl;
            console.log(`使用备用imageUrl作为临时URL: ${item._id}`);
          } else if (item.originalData && item.originalData.imageUrl && 
                    (item.originalData.imageUrl.startsWith('http') || item.originalData.imageUrl.startsWith('https'))) {
            item.tempImageUrl = item.originalData.imageUrl;
            console.log(`使用originalData中的imageUrl作为临时URL: ${item._id}`);
          }
        }
      });
      
      if (missingUrlCount > 0) {
        console.warn(`有 ${missingUrlCount} 件衣物未能获取到临时URL`);
      }
      
      resolve(updatedClothes);
    })
    .catch(err => {
      console.error('处理临时URL时发生错误:', err);
      resolve(updatedClothes); // 即使出错，也返回已处理的数据
    });
  });
}

/**
 * 上传搭配图片到云存储
 * @param {string} tempFilePath - 临时文件路径
 * @returns {Promise<string>} 包含上传后文件ID的Promise
 */
function uploadOutfitImage(tempFilePath) {
  return new Promise((resolve, reject) => {
    if (!tempFilePath) {
      reject(new Error('无效的临时文件路径'));
      return;
    }
    
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substr(2, 6);
    
    wx.cloud.uploadFile({
      cloudPath: `outfits/${timestamp}_${randomStr}.jpg`,
      filePath: tempFilePath,
      success: res => {
        // 返回文件ID
        resolve(res.fileID);
      },
      fail: err => {
        console.error('上传文件失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 验证图像URL是否有效
 * @param {string} url - 图像URL
 * @returns {Promise<boolean>} 包含URL是否有效的Promise
 */
function validateImageUrl(url) {
  return new Promise((resolve) => {
    if (!url) {
      resolve(false);
      return;
    }
    
    // 如果是本地路径或有效URL格式，认为是有效的
    if (url.startsWith('/') || url.startsWith('http') || url.startsWith('wxfile://')) {
      resolve(true);
      return;
    }
    
    // 其他情况，认为是无效的
    resolve(false);
  });
}

/**
 * 从临时文件生成图片
 * @param {string} canvasId - 画布ID
 * @returns {Promise<string>} 包含临时文件路径的Promise
 */
function generateImageFromCanvas(canvasId) {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvasId: canvasId,
      success: res => {
        resolve(res.tempFilePath);
      },
      fail: err => {
        console.error('画布生成图片失败:', err);
        reject(err);
      }
    });
  });
}

module.exports = {
  getClothesImageUrls,
  uploadOutfitImage,
  validateImageUrl,
  generateImageFromCanvas
};
