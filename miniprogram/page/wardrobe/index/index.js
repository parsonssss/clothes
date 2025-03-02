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
      tags: ['休闲', '办公室']
    },
    recentlyAdded: [
      { id: 1, type: 'tshirt', name: 'T恤' },
      { id: 2, type: 'socks', name: '袜子' },
      { id: 3, type: 'hat', name: '帽子' },
      { id: 4, type: 'shoes', name: '鞋子' }
    ],
    closetStats: {
      total: 128,
      tops: 45,
      bottoms: 32,
      mostColor: '米色',
      mostColorCount: 23
    }
  },
  
  onLoad: function() {
    // 实际应用中可以在这里获取天气数据和衣物推荐
    this.getWeatherData();
    this.getOutfitRecommendation();
    this.getRecentlyAdded();
    this.getClosetStats();
  },
  
  // 获取天气数据
  getWeatherData: function() {
    // 实际应用中这里应该调用天气API
    // 这里仅做示例，使用模拟数据
    console.log('获取天气数据');
  },
  
  // 获取穿搭推荐
  getOutfitRecommendation: function() {
    // 实际应用中这里应该有推荐算法
    // 这里仅做示例，使用模拟数据
    console.log('获取穿搭推荐');
  },
  
  // 获取最近添加的衣物
  getRecentlyAdded: function() {
    // 实际应用中这里应该从数据库获取最近添加的衣物
    // 这里仅做示例，使用模拟数据
    console.log('获取最近添加的衣物');
  },
  
  // 获取衣柜统计数据
  getClosetStats: function() {
    // 实际应用中这里应该从数据库获取衣柜统计数据
    // 这里仅做示例，使用模拟数据
    console.log('获取衣柜统计数据');
  },
  
  // 查看穿搭推荐详情
  viewOutfitDetail: function() {
    wx.navigateTo({
      url: '../outfit/outfit'
    });
  },
  
  // 查看天气详情
  viewWeatherDetail: function() {
    wx.showToast({
      title: '天气详情功能开发中',
      icon: 'none'
    });
  }
})
