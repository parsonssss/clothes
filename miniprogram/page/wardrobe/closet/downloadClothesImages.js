// 下载衣物图片，实现每10分钟获取一次临时链接的逻辑
module.exports = function(clothes) {
  if (!clothes || clothes.length === 0) {
    console.log('没有衣物数据，显示空状态');
    this.setData({
      clothes: [],
      filteredClothes: [],
      currentPageClothes: [],
      isLoading: false
    });
    return;
  }
  
  // 收集所有非空的fileID（优先使用抠图后的图片ID）
  const fileIDs = clothes.map(item => item.processedFileID || item.fileID).filter(fileID => fileID);
  console.log('需要处理的图片数量:', fileIDs.length);
  
  if (fileIDs.length === 0) {
    console.log('没有图片需要加载，直接显示衣物');
    this.setData({
      clothes: clothes,
      filteredClothes: clothes,
      currentPageClothes: clothes,
      isLoading: false
    });
    return;
  }
  
  // 检查上次更新临时URL的时间，求时间差
  const currentTime = Date.now();
  const timeDiff = currentTime - this.data.lastImageUrlUpdateTime; // 时间差毫秒
  const TEN_MINUTES = 10 * 60 * 1000; // 10分钟的毫秒数
  
  // 从本地缓存获取临时URL
  const cachedURLs = wx.getStorageSync('tempImageURLs') || {};
  
  // 检查是否有新上传的衣服（没有临时URL的衣服）
  const hasNewClothes = clothes.some(cloth => {
    const fileIDToUse = cloth.processedFileID || cloth.fileID;
    return fileIDToUse && !cachedURLs[fileIDToUse];
  });
  
  // 如果时间差小于10分钟且缓存中存在临时URL，且没有新上传的衣服，则直接使用缓存
  if (timeDiff < TEN_MINUTES && Object.keys(cachedURLs).length > 0 && !hasNewClothes) {
    console.log('使用缓存的临时URL，距离上次更新:', Math.floor(timeDiff / 1000), '秒');
    
    // 更新每个衣物对象的tempImageUrl
    const updatedClothes = clothes.map(cloth => {
      // 优先使用抠图后的图片
      const fileIDToUse = cloth.processedFileID || cloth.fileID;
      const tempUrl = fileIDToUse && cachedURLs[fileIDToUse] ? cachedURLs[fileIDToUse] : '';
      return {
        ...cloth, 
        tempImageUrl: tempUrl
      };
    });
    
    this.setData({
      clothes: updatedClothes,
      filteredClothes: updatedClothes,
      currentPageClothes: updatedClothes,
      isLoading: false
    });
    
    return;
  }
  
  // 如果时间差超过10分钟或无缓存或有新上传的衣服，重新获取临时URL
  console.log('重新获取临时URL，距离上次更新:', Math.floor(timeDiff / 1000), '秒', 
              '有新上传衣服:', hasNewClothes);
  
  // 获取临时URL
  wx.cloud.getTempFileURL({
    fileList: fileIDs,
    success: res => {
      console.log('获取临时链接成功', res);
      
      // 创建fileID到临时URL的映射
      const fileIDToPath = {};
      res.fileList.forEach(item => {
        if (item.fileID && item.tempFileURL) {
          fileIDToPath[item.fileID] = item.tempFileURL;
        }
      });
      
      // 更新每个衣物对象的tempImageUrl
      const updatedClothes = clothes.map(cloth => {
        let tempUrl = '';
        // 优先使用抠图后的图片
        const fileIDToUse = cloth.processedFileID || cloth.fileID;
        if (fileIDToUse) {
          tempUrl = fileIDToPath[fileIDToUse] || '';
        }
        return {
          ...cloth, 
          tempImageUrl: tempUrl
        };
      });
      
      console.log('处理后的衣物数据:', updatedClothes.length);
      
      // 保存到本地缓存
      wx.setStorageSync('tempImageURLs', fileIDToPath);
      
      // 更新最后获取时间戳
      this.setData({
        clothes: updatedClothes,
        filteredClothes: updatedClothes,
        currentPageClothes: updatedClothes,
        isLoading: false,
        lastImageUrlUpdateTime: currentTime
      });
    },
    fail: err => {
      console.error('获取临时链接失败', err);
      
      // 如果失败，尝试使用缓存中的临时URL
      if (Object.keys(cachedURLs).length > 0) {
        console.log('使用缓存的临时URL作为备用');
        
        const updatedClothes = clothes.map(cloth => {
          // 优先使用抠图后的图片
          const fileIDToUse = cloth.processedFileID || cloth.fileID;
          const tempUrl = fileIDToUse && cachedURLs[fileIDToUse] ? cachedURLs[fileIDToUse] : '';
          return {
            ...cloth, 
            tempImageUrl: tempUrl
          };
        });
        
        this.setData({
          clothes: updatedClothes,
          filteredClothes: updatedClothes,
          currentPageClothes: updatedClothes,
          isLoading: false
        });
      } else {
        // 如果没有缓存，使用备用方式获取临时链接
        this.getBackupTempUrls(clothes);
      }
    }
  });
};

// 备用方式获取临时链接（通过云函数）
function getBackupTempUrls(clothes) {
  // 收集所有非空的fileID（优先使用抠图后的图片ID）
  const fileIDs = clothes.map(item => item.processedFileID || item.fileID).filter(fileID => fileID);
  
  if (fileIDs.length === 0) {
    this.setData({
      clothes: clothes,
      filteredClothes: clothes,
      currentPageClothes: clothes,
      isLoading: false
    });
    return;
  }
  
  // 通过云函数获取临时链接
  wx.cloud.callFunction({
    name: 'getTempFileURL',
    data: {
      fileIdList: fileIDs
    },
    success: res => {
      console.log('备用方式获取临时链接成功', res);
      
      // 创建fileID到临时URL的映射
      const fileIDToPath = {};
      if (res.result && Array.isArray(res.result)) {
        res.result.forEach(item => {
          if (item.fileID && item.tempFileURL) {
            fileIDToPath[item.fileID] = item.tempFileURL;
          }
        });
      }
      
      // 更新每个衣物对象的tempImageUrl
      const updatedClothes = clothes.map(cloth => {
        let tempUrl = '';
        // 优先使用抠图后的图片
        const fileIDToUse = cloth.processedFileID || cloth.fileID;
        if (fileIDToUse && fileIDToPath[fileIDToUse]) {
          tempUrl = fileIDToPath[fileIDToUse];
        }
        return {
          ...cloth, 
          tempImageUrl: tempUrl
        };
      });
      
      // 保存到本地缓存
      if (Object.keys(fileIDToPath).length > 0) {
        wx.setStorageSync('tempImageURLs', fileIDToPath);
      }
      
      this.setData({
        clothes: updatedClothes,
        filteredClothes: updatedClothes,
        currentPageClothes: updatedClothes,
        isLoading: false,
        lastImageUrlUpdateTime: Date.now()
      });
    },
    fail: err => {
      console.error('备用方式获取临时链接失败', err);
      
      // 如果备用方式也失败，显示无图像的衣物列表
      const updatedClothes = clothes.map(cloth => {
        return {...cloth, tempImageUrl: ''};
      });
      
      this.setData({
        clothes: updatedClothes,
        filteredClothes: updatedClothes,
        currentPageClothes: updatedClothes,
        isLoading: false
      });
    }
  });
}