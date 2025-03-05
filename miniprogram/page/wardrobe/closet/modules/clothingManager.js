/**
 * 衣物管理模块
 * 负责衣物的添加、处理、分析等功能
 */

const closetUtils = require('./closetUtils');
const imageProcessor = require('./imageProcessor');
const dataManager = require('./dataManager');

/**
 * 通过拍照添加衣物
 * @param {Function} onSuccess - 成功回调
 * @param {Function} onError - 错误回调 
 */
function addByCamera(onSuccess, onError) {
  wx.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['camera'],
    success: (res) => {
      closetUtils.showLoading('处理中...');
      
      const tempFilePath = res.tempFiles[0].tempFilePath;
      console.log('拍摄的图片:', tempFilePath);
      
      // 上传图片到云存储
      onSuccess(tempFilePath);
    },
    fail: (err) => {
      console.error('拍照失败:', err);
      closetUtils.showErrorToast('拍照失败');
      if (onError) onError(err);
    }
  });
}

/**
 * 通过相册添加衣物
 * @param {Function} onSuccess - 成功回调
 * @param {Function} onError - 错误回调
 */
function addByAlbum(onSuccess, onError) {
  wx.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album'],
    success: (res) => {
      closetUtils.showLoading('处理中...');
      
      const tempFilePath = res.tempFiles[0].tempFilePath;
      console.log('选择的图片:', tempFilePath);
      
      // 上传图片到云存储
      onSuccess(tempFilePath);
    },
    fail: (err) => {
      console.error('选择图片失败:', err);
      closetUtils.showErrorToast('选择图片失败');
      if (onError) onError(err);
    }
  });
}

/**
 * 通过URL添加衣物
 * @param {Function} onSuccess - 成功回调
 */
function addByUrl(onSuccess) {
  wx.showModal({
    title: '输入图片URL',
    editable: true,
    placeholderText: '请输入有效的图片URL',
    success: (res) => {
      if (res.confirm && res.content) {
        closetUtils.showLoading('处理中...');
        
        const imageUrl = res.content.trim();
        onSuccess(imageUrl);
      }
    }
  });
}

/**
 * 上传并处理图片
 * @param {String} filePath - 图片路径
 * @param {String} templatePath - 抠图模板路径
 * @param {Function} onSuccess - 成功回调函数
 * @param {Function} onError - 错误回调函数
 */
function uploadAndProcessImage(filePath, templatePath, onSuccess, onError) {
  // 上传图片到云存储
  return imageProcessor.uploadImageToCloud(filePath)
    .then(fileID => {
      // 获取临时访问链接
      return imageProcessor.getTempFileURL(fileID)
        .then(tempFileURL => {
          // 处理图片
          return processImageWithKoutu(tempFileURL, fileID, templatePath, onSuccess, onError);
        });
    })
    .catch(err => {
      console.error('上传和处理失败:', err);
      closetUtils.hideLoading();
      closetUtils.showErrorToast('上传失败');
      if (onError) onError(err);
    });
}

/**
 * 处理图片与抠图
 * @param {String} imageUrl - 图片URL
 * @param {String} fileID - 文件ID，可选
 * @param {String} templatePath - 抠图模板路径
 * @param {Function} onSuccess - 成功回调
 * @param {Function} onError - 错误回调
 * @param {Function} onTemplateRequired - 需要模板时的回调
 */
function processImageWithKoutu(imageUrl, fileID = '', templatePath, onSuccess, onError, onTemplateRequired) {
  if (!templatePath) {
    console.error('抠图模板路径为空，尝试重新获取');
    if (onTemplateRequired) {
      return onTemplateRequired()
        .then(newTemplatePath => {
          console.log('重新获取抠图模板成功，继续处理图片');
          return processImageWithKoutu(imageUrl, fileID, newTemplatePath, onSuccess, onError);
        })
        .catch(err => {
          console.error('重新获取抠图模板失败:', err);
          closetUtils.hideLoading();
          closetUtils.showErrorToast('处理失败，请重试');
          if (onError) onError(err);
          return Promise.reject(err);
        });
    } else {
      closetUtils.hideLoading();
      closetUtils.showErrorToast('抠图模板不可用');
      if (onError) onError(new Error('抠图模板不可用'));
      return Promise.reject(new Error('抠图模板不可用'));
    }
  }
  
  return imageProcessor.processImageWithKoutu(imageUrl, templatePath)
    .then(processedImageUrl => {
      // 分析衣物
      return analyzeAndSaveClothing(processedImageUrl, imageUrl, fileID, onSuccess, onError);
    })
    .catch(err => {
      console.error('抠图处理失败:', err);
      closetUtils.hideLoading();
      closetUtils.showErrorToast('抠图处理失败');
      if (onError) onError(err);
      return Promise.reject(err);
    });
}

/**
 * 分析并保存衣物
 * @param {String} processedImageUrl - 处理后的图片URL
 * @param {String} originalImageUrl - 原始图片URL
 * @param {String} fileID - 文件ID
 * @param {Function} onSuccess - 成功回调
 * @param {Function} onError - 错误回调
 */
function analyzeAndSaveClothing(processedImageUrl, originalImageUrl, fileID, userOpenId, onSuccess, onError) {
  return imageProcessor.analyzeClothing(processedImageUrl)
    .then(analysisData => {
      // 保存到数据库
      return dataManager.saveClothingToDatabase(
        fileID,
        originalImageUrl,
        analysisData,
        userOpenId
      );
    })
    .then(res => {
      console.log('保存衣物成功:', res);
      closetUtils.hideLoading();
      closetUtils.showSuccessToast('添加衣物成功');
      
      if (onSuccess) onSuccess(res);
    })
    .catch(err => {
      console.error('分析或保存失败:', err);
      closetUtils.hideLoading();
      closetUtils.showErrorToast('分析衣物失败');
      if (onError) onError(err);
    });
}

/**
 * 删除衣物
 * @param {String} id - 衣物ID
 * @param {Function} onSuccess - 成功回调
 * @param {Function} onError - 错误回调
 */
function deleteClothing(id, onSuccess, onError) {
  wx.showModal({
    title: '确认删除',
    content: '确定要删除这件衣物吗？',
    success: res => {
      if (res.confirm) {
        wx.cloud.callFunction({
          name: 'deleteClothing',
          data: {
            clothingId: id
          }
        })
        .then(res => {
          console.log('删除衣物成功:', res);
          closetUtils.showSuccessToast('删除成功');
          
          if (onSuccess) onSuccess(res);
        })
        .catch(err => {
          console.error('删除衣物失败:', err);
          closetUtils.showErrorToast('删除失败');
          
          if (onError) onError(err);
        });
      }
    }
  });
}

module.exports = {
  addByCamera,
  addByAlbum,
  addByUrl,
  uploadAndProcessImage,
  processImageWithKoutu,
  analyzeAndSaveClothing,
  deleteClothing
};