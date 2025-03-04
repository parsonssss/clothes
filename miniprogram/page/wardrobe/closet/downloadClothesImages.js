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
  
  // 收集所有非空的fileID
  const fileIDs = clothes.map(item => item.fileID).filter(fileID => fileID);
  console.log('需要处理的图片数量:', fileIDs.length);
  
  if (fileIDs.length === 0) {
    console.log('没有图片需要加载，直接显示衣物');
    this.setData({
      clothes: clothes,
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
  
  // 如果时间差小于10分钟且缓存中存在临时URL，则直接使用缓存
  if (timeDiff < TEN_MINUTES && Object.keys(cachedURLs).length > 0) {
    console.log('使用缓存的临时URL，距离上次更新:', Math.floor(timeDiff / 1000), '秒');
    
    // 更新每个衣物对象的tempImageUrl
    const updatedClothes = clothes.map(cloth => {
      return {
        ...cloth, 
        tempImageUrl: cloth.fileID && cachedURLs[cloth.fileID] ? cachedURLs[cloth.fileID] : ''
      };
    });
    
    this.setData({
      clothes: updatedClothes,
      isLoading: false
    });
    
    // 初始化时，如果有选中的类别，重新应用过滤
    if (this.data.selectedCategory) {
      this.filterClothesByCategory(this.data.selectedCategory);
    }
    return;
  }
  
  // 如果时间差超过10分钟或无缓存，重新获取临时URL
  console.log('重新获取临时URL，距离上次更新:', Math.floor(timeDiff / 1000), '秒');
  
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
        return {
          ...cloth, 
          tempImageUrl: cloth.fileID ? fileIDToPath[cloth.fileID] || '' : ''
        };
      });
      
      console.log('处理后的衣物数据:', updatedClothes.length);
      
      // 保存到本地缓存
      wx.setStorageSync('tempImageURLs', fileIDToPath);
      
      // 更新最后获取时间戳
      this.setData({
        clothes: updatedClothes,
        isLoading: false,
        lastImageUrlUpdateTime: currentTime
      });
      
      // 初始化时，如果有选中的类别，重新应用过滤
      if (this.data.selectedCategory) {
        this.filterClothesByCategory(this.data.selectedCategory);
      }
    },
    fail: err => {
      console.error('获取临时链接失败', err);
      
      // 如果失败，尝试使用缓存中的临时URL
      if (Object.keys(cachedURLs).length > 0) {
        console.log('使用缓存的临时URL作为备用');
        const updatedClothes = clothes.map(cloth => {
          return {
            ...cloth, 
            tempImageUrl: cloth.fileID && cachedURLs[cloth.fileID] ? cachedURLs[cloth.fileID] : ''
          };
        });
        
        this.setData({
          clothes: updatedClothes,
          isLoading: false
        });
      } else {
        // 如果没有缓存，仍然显示衣物，但不显示图片
        const updatedClothes = clothes.map(cloth => {
          return {...cloth, tempImageUrl: ''};
        });
        
        this.setData({
          clothes: updatedClothes,
          isLoading: false
        });
      }
      
      // 初始化时，如果有选中的类别，重新应用过滤
      if (this.data.selectedCategory) {
        this.filterClothesByCategory(this.data.selectedCategory);
      }
    }
  });
};