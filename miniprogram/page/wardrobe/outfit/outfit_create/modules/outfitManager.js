/**
 * 搭配管理模块
 * 负责搭配数据的保存和管理
 */

const canvasManager = require('./canvasManager');
const imageManager = require('./imageManager');

/**
 * 生成搭配图片
 * @param {string} canvasId - 画布ID
 * @param {Array} canvasItems - 画布项数组
 * @param {number} canvasWidth - 画布宽度
 * @param {number} canvasHeight - 画布高度
 * @returns {Promise<string>} 包含上传后文件ID的Promise
 */
function generateOutfitImage(canvasId, canvasItems, canvasWidth, canvasHeight) {
  return new Promise(async (resolve, reject) => {
    try {
      // 先绘制画布
      await canvasManager.drawCanvas(canvasId, canvasItems, canvasWidth, canvasHeight);
      
      // 延迟一下确保绘制完成
      setTimeout(async () => {
        try {
          // 将画布转为临时文件
          const tempFilePath = await imageManager.generateImageFromCanvas(canvasId);
          
          // 上传图片到云存储
          const fileID = await imageManager.uploadOutfitImage(tempFilePath);
          
          // 返回文件ID
          resolve(fileID);
        } catch (error) {
          console.error('生成或上传搭配图片失败:', error);
          reject(error);
        }
      }, 300);
    } catch (error) {
      console.error('绘制画布失败:', error);
      reject(error);
    }
  });
}

/**
 * 保存搭配数据到数据库
 * @param {string} outfitName - 搭配名称
 * @param {string} imageFileID - 搭配图片文件ID
 * @param {Array} canvasItems - 画布项数组
 * @param {string} category - 搭配类型
 * @returns {Promise<Object>} 包含保存结果的Promise
 */
function saveOutfitToDatabase(outfitName, imageFileID, canvasItems, category = 'daily') {
  return new Promise((resolve, reject) => {
    const db = wx.cloud.database();
    
    // 准备搭配数据
    const outfitData = {
      name: outfitName || '我的搭配',
      imageFileID: imageFileID,
      category: category,
      items: canvasItems.map(item => ({
        clothingId: item.clothingId,
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        rotation: item.rotation || 0,
        zIndex: item.zIndex
      })),
      createTime: db.serverDate()
    };
    
    // 添加到数据库
    db.collection('outfits').add({
      data: outfitData
    })
      .then(res => {
        console.log('搭配数据已保存:', res);
        resolve(res);
      })
      .catch(err => {
        console.error('保存搭配数据失败:', err);
        reject(err);
      });
  });
}

/**
 * 获取用户保存的搭配列表
 * @param {string} userOpenId - 用户OpenID
 * @returns {Promise<Array>} 包含搭配列表的Promise
 */
function getOutfitList(userOpenId) {
  return new Promise((resolve, reject) => {
    const db = wx.cloud.database();
    
    db.collection('outfits')
      .where({
        _openid: userOpenId
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        resolve(res.data);
      })
      .catch(err => {
        console.error('获取搭配列表失败:', err);
        reject(err);
      });
  });
}

/**
 * 删除搭配
 * @param {string} outfitId - 搭配ID
 * @returns {Promise<Object>} 包含删除结果的Promise
 */
function deleteOutfit(outfitId) {
  return new Promise((resolve, reject) => {
    const db = wx.cloud.database();
    
    // 先获取搭配信息
    db.collection('outfits')
      .doc(outfitId)
      .get()
      .then(res => {
        const outfit = res.data;
        const imageFileID = outfit.imageFileID;
        
        // 删除数据库记录
        return db.collection('outfits')
          .doc(outfitId)
          .remove()
          .then(() => {
            // 如果有图片文件，也删除图片
            if (imageFileID) {
              return wx.cloud.deleteFile({
                fileList: [imageFileID]
              });
            }
            return { fileList: [] };
          });
      })
      .then(() => {
        resolve({ success: true });
      })
      .catch(err => {
        console.error('删除搭配失败:', err);
        reject(err);
      });
  });
}

/**
 * 生成搭配预览数据
 * @param {Object} outfit - 搭配数据
 * @returns {Promise<Object>} 包含预览数据的Promise
 */
function generateOutfitPreview(outfit) {
  return new Promise((resolve, reject) => {
    if (!outfit || !outfit.imageFileID) {
      reject(new Error('无效的搭配数据'));
      return;
    }
    
    // 获取搭配图片的临时URL
    wx.cloud.getTempFileURL({
      fileList: [outfit.imageFileID],
      success: res => {
        const fileList = res.fileList;
        if (fileList && fileList.length > 0) {
          const tempFileURL = fileList[0].tempFileURL;
          
          // 构建预览数据
          const previewData = {
            ...outfit,
            tempImageUrl: tempFileURL,
            formatDate: formatDate(outfit.createTime)
          };
          
          resolve(previewData);
        } else {
          reject(new Error('获取图片临时URL失败'));
        }
      },
      fail: err => {
        console.error('获取搭配图片URL失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 格式化日期
 * @param {Date} date - 日期对象
 * @returns {string} 格式化后的日期字符串
 */
function formatDate(date) {
  if (!date) return '';
  
  // 如果是时间戳或字符串，转为Date对象
  if (!(date instanceof Date)) {
    date = new Date(date);
  }
  
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  
  return `${year}.${month}.${day}`;
}

module.exports = {
  generateOutfitImage,
  saveOutfitToDatabase,
  getOutfitList,
  deleteOutfit,
  generateOutfitPreview
};
