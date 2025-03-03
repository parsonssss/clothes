// page/wardrobe/index/index.js
Page({
  data: {
    weather: {
      city: '上海',
      day: '周日',
      temperature: '23°C',
      condition: '晴朗',
      icon: 'sun'
    },
    outfitRecommendation: {
      title: '春季自然风',
      description: '适合今日天气与活动',
      tags: ['休闲', '办公室'],
      imageUrl: ''
    },
    recentlyAdded: [],
    closetStats: {
      total: 0,
      tops: 0,
      bottoms: 0,
      coats: 0,
      mostColor: '',
      mostColorCount: 0
    },
    isLoading: true,
    lastUrlRefreshTime: 0 // 最后一次图片URL刷新时间
  },
  
  onLoad: function() {
    // 初始化云环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // env: 'your-env-id',
        env: 'cloud1-3gi97kso9ab01185',
        traceUser: true,
      });
    }
    
    // 加载页面数据
    this.loadPageData();
  },
  
  onShow: function() {
    // 每次页面显示时检查是否需要刷新数据
    this.checkAndRefreshData();
  },
  
  // 检查并刷新数据
  checkAndRefreshData: function() {
    const now = Date.now();
    const tenMinutesInMs = 10 * 60 * 1000; // 10分钟的毫秒数
    
    // 如果距离上次刷新超过10分钟，则重新加载数据
    if (now - this.data.lastUrlRefreshTime > tenMinutesInMs) {
      console.log('超过10分钟未刷新，重新加载数据');
      this.loadPageData();
    } else {
      console.log('距上次刷新不足10分钟，无需重新加载');
    }
  },
  
  // 加载页面数据
  loadPageData: function() {
    this.setData({
      isLoading: true
    });
    
    // 获取天气数据（实际中应使用API）
    this.getWeatherData();
    
    // 获取最近添加的衣物
    this.getRecentlyAdded();
    
    // 获取衣柜统计数据
    this.getClosetStats();
    
    // 获取穿搭推荐
    this.getOutfitRecommendation();
  },
  
  // 获取天气数据
  getWeatherData: function() {
    // 实际应用中这里应该调用天气API
    // 这里用模拟数据
    console.log('获取天气数据');
  },
  
  // 获取最近添加的衣物
  getRecentlyAdded: function() {
    const db = wx.cloud.database();
    
    // 从云数据库获取最近添加的4件衣物
    db.collection('clothes')
      .orderBy('createTime', 'desc')
      .limit(4)
      .get()
      .then(res => {
        console.log('获取最近添加的衣物成功', res);
        
        const clothes = res.data;
        // 设置刷新时间
        this.setData({
          lastUrlRefreshTime: Date.now()
        });
        
        // 下载所有图片的临时URL
        this.getClothesImages(clothes);
      })
      .catch(err => {
        console.error('获取最近添加的衣物失败', err);
        this.setData({
          isLoading: false
        });
      });
  },
  
  // 获取衣物图片的临时URL
  getClothesImages: function(clothes) {
    if (!clothes || clothes.length === 0) {
      this.setData({
        recentlyAdded: [],
        isLoading: false
      });
      return;
    }
    
    // 收集所有非空的fileID
    const fileIDs = clothes.map(item => item.fileID).filter(fileID => fileID);
    
    if (fileIDs.length === 0) {
      this.setData({
        recentlyAdded: clothes,
        isLoading: false
      });
      return;
    }
    
    console.log('开始获取临时URL...');

    // 获取临时URL而不是下载文件
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: res => {
        console.log('获取临时URL成功', res);
        
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
        
        this.setData({
          recentlyAdded: updatedClothes,
          isLoading: false
        });
      },
      fail: err => {
        console.error('获取临时URL失败', err);
        
        // 如果获取失败，仍然显示衣物，但不显示图片
        const updatedClothes = clothes.map(cloth => {
          return {...cloth, tempImageUrl: ''};
        });
        
        this.setData({
          recentlyAdded: updatedClothes,
          isLoading: false
        });
      }
    });
  },
  
  // 获取衣柜统计数据
  getClosetStats: function() {
    const db = wx.cloud.database();
    
    // 获取所有衣物
    db.collection('clothes').get().then(res => {
      const clothes = res.data;
      
      // 计算衣物总数
      const total = clothes.length;
      
      // 按类别分类
      const tops = clothes.filter(item => item.category === '上衣').length;
      const bottoms = clothes.filter(item => 
        item.category === '裤子' || item.category === '裙子'
      ).length;
      const coats = clothes.filter(item => item.category === '外套').length;
      
      // 统计颜色分布
      const colorStats = {};
      clothes.forEach(item => {
        if (item.color) {
          if (!colorStats[item.color]) {
            colorStats[item.color] = 0;
          }
          colorStats[item.color]++;
        }
      });
      
      // 查找最多的颜色
      let mostColor = '';
      let mostColorCount = 0;
      
      for (const color in colorStats) {
        if (colorStats[color] > mostColorCount) {
          mostColor = color;
          mostColorCount = colorStats[color];
        }
      }
      
      this.setData({
        'closetStats.total': total,
        'closetStats.tops': tops,
        'closetStats.bottoms': bottoms,
        'closetStats.coats': coats,
        'closetStats.mostColor': mostColor,
        'closetStats.mostColorCount': mostColorCount
      });
    }).catch(err => {
      console.error('获取衣柜统计数据失败', err);
    });
  },
  
  // 获取穿搭推荐
  getOutfitRecommendation: function() {
    // 实际应用中这里应该有推荐算法，根据天气、场合等因素
    // 此处简化为随机选择一件外套作为推荐
    const db = wx.cloud.database();
    
    db.collection('clothes')
      .where({category: '外套'})
      .get()
      .then(res => {
        if (res.data && res.data.length > 0) {
          // 随机选择一件外套
          const index = Math.floor(Math.random() * res.data.length);
          const coat = res.data[index];
          
          // 获取临时URL
          if (coat.fileID) {
            wx.cloud.getTempFileURL({
              fileList: [coat.fileID],
              success: result => {
                if (result.fileList && result.fileList.length > 0) {
                  const tempFileURL = result.fileList[0].tempFileURL;
                  
                  const recommendation = {
                    title: coat.name || (coat.color + coat.style + '外套'),
                    description: '适合今日天气与活动',
                    tags: coat.sceneApplicability || coat.scene_applicability || ['休闲'],
                    imageUrl: tempFileURL,
                    id: coat._id
                  };
                  
                  this.setData({
                    outfitRecommendation: recommendation
                  });
                }
              },
              fail: err => {
                console.error('获取推荐衣物图片URL失败', err);
              }
            });
          }
        }
      })
      .catch(err => {
        console.error('获取穿搭推荐失败', err);
      });
  },
  
  // 查看衣物详情
  viewClothesDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '../detail/detail?id=' + id
    });
  },
  
  // 查看天气详情
  viewWeatherDetail: function() {
    wx.showToast({
      title: '天气详情功能开发中',
      icon: 'none'
    });
  },
  
  // 查看穿搭推荐详情
  viewOutfitDetail: function() {
    if (this.data.outfitRecommendation.id) {
      wx.navigateTo({
        url: '../detail/detail?id=' + this.data.outfitRecommendation.id
      });
    } else {
      wx.showToast({
        title: '推荐详情暂未生成',
        icon: 'none'
      });
    }
  },
  
  // 查看所有衣物
  viewAllClothes: function() {
    wx.switchTab({
      url: '../closet/closet',
    });
  }
})
