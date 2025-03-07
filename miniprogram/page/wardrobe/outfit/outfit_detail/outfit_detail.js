Page({
  data: {
    // 定义颜色常量 - 秋季色彩方案
    colors: {
      cowhide_cocoa: '#442D1C',   // 深棕色 Cowhide Cocoa
      spiced_wine: '#74301C',     // 红棕色 Spiced Wine
      toasted_caramel: '#84592B', // 焦糖色 Toasted Caramel
      olive_harvest: '#9D9167',   // 橄榄色 Olive Harvest
      golden_batter: '#E8D1A7',   // 金黄色 Golden Batter
    },
    // 粉蓝色系配色
    pinkBlueColors: {
      pinkDark: '#D47C99',      // 深粉色
      pinkMedium: '#EEA0B2',    // 中粉色
      pinkLight: '#F9C9D6',     // 浅粉色
      blueLight: '#CBE0F9',     // 浅蓝色
      blueMedium: '#97C8E5',    // 中蓝色
      blueDark: '#5EA0D0',      // 深蓝色
    },
    // 主题风格
    themeStyle: 'autumn', // 默认秋季风格
    isLoading: true,
    userOpenId: '',
    
    // 搭配详情数据
    outfitId: '',
    outfitData: null,
    
    // 相似搭配推荐
    similarOutfits: []
  },

  onLoad: function(options) {
    // 初始化云环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-3gi97kso9ab01185',
        traceUser: true,
      });
    }
    
    // 获取保存的主题设置
    const savedTheme = wx.getStorageSync('themeStyle');
    if (savedTheme) {
      this.setData({
        themeStyle: savedTheme
      });
    }
    
    // 获取搭配ID
    if (options.id) {
      this.setData({
        outfitId: options.id
      });
      
      // 获取用户OpenID
      this.getUserOpenId();
    } else {
      wx.showToast({
        title: '搭配ID不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  // 获取当前用户的OpenID
  getUserOpenId: function() {
    const that = this;
    wx.showLoading({
      title: '加载中...',
    });
    
    // 尝试从本地缓存获取OpenID
    const openid = wx.getStorageSync('openid');
    if (openid) {
      console.log('从本地缓存获取到OpenID:', openid);
      that.setData({
        userOpenId: openid
      });
      
      // 获取搭配详情
      that.getOutfitDetail();
      return;
    }
    
    // 如果本地没有，则调用云函数获取
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('获取用户OpenID成功:', res.result);
        const openid = res.result.openid;
        
        // 成功获取到openid
        if (openid) {
          // 存入本地缓存
          wx.setStorageSync('openid', openid);
          
          that.setData({
            userOpenId: openid
          });
          
          // 获取搭配详情
          that.getOutfitDetail();
        } else {
          // 获取失败，使用模拟数据
          that.useSimulatedData();
        }
      },
      fail: err => {
        console.error('云函数调用失败:', err);
        that.useSimulatedData();
      }
    });
  },
  
  // 获取搭配详情
  getOutfitDetail: function() {
    const that = this;
    const db = wx.cloud.database();
    
    db.collection('outfits')
      .doc(that.data.outfitId)
      .get()
      .then(res => {
        console.log('获取搭配详情成功:', res.data);
        
        if (res.data) {
          that.setData({
            outfitData: res.data,
            isLoading: false
          });
          
          // 获取相似搭配推荐
          that.getSimilarOutfits(res.data.category);
        } else {
          wx.showToast({
            title: '搭配不存在',
            icon: 'error'
          });
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      })
      .catch(err => {
        console.error('获取搭配详情失败:', err);
        that.useSimulatedData();
      });
  },
  
  // 获取相似搭配推荐
  getSimilarOutfits: function(category) {
    const that = this;
    const db = wx.cloud.database();
    const _ = db.command;
    
    db.collection('outfits')
      .where({
        _openid: that.data.userOpenId,
        category: category,
        _id: _.neq(that.data.outfitId) // 排除当前搭配
      })
      .limit(3) // 最多获取3个相似搭配
      .get()
      .then(res => {
        console.log('获取相似搭配成功:', res.data);
        
        that.setData({
          similarOutfits: res.data || []
        });
      })
      .catch(err => {
        console.error('获取相似搭配失败:', err);
      });
  },
  
  // 使用模拟数据（当无法获取真实数据时）
  useSimulatedData: function() {
    console.log('使用模拟数据');
    
    // 生成模拟搭配数据
    const mockOutfit = this.generateMockOutfit();
    const mockSimilarOutfits = this.generateMockSimilarOutfits();
    
    this.setData({
      outfitData: mockOutfit,
      similarOutfits: mockSimilarOutfits,
      isLoading: false
    });
    
    console.log('模拟数据加载完成');
  },
  
  // 生成模拟搭配数据
  generateMockOutfit: function() {
    // 模拟衣物图片
    const mockImages = [
      'https://picsum.photos/200/300?random=1',
      'https://picsum.photos/200/300?random=2',
      'https://picsum.photos/200/300?random=3',
      'https://picsum.photos/200/300?random=4',
      'https://picsum.photos/200/300?random=5'
    ];
    
    // 根据不同类别生成不同的模拟数据
    const categories = ['daily', 'work', 'party', 'sport', 'seasonal'];
    const categoryNames = ['日常穿搭', '职业穿搭', '派对穿搭', '运动穿搭', '季节穿搭'];
    
    // 随机选择一个类别
    const randomIndex = Math.floor(Math.random() * categories.length);
    const category = categories[randomIndex];
    const categoryName = categoryNames[randomIndex];
    
    return {
      id: 'mock-outfit-1',
      name: `模拟${categoryName}`,
      category: category,
      previewImage: 'https://picsum.photos/400/600?random=10',
      description: `这是一套模拟的${categoryName}，适合各种场合穿着。`,
      items: [
        { id: 'item1', name: '上衣', type: 'top', imageUrl: mockImages[0] },
        { id: 'item2', name: '裤子', type: 'bottom', imageUrl: mockImages[1] },
        { id: 'item3', name: '外套', type: 'outerwear', imageUrl: mockImages[2] },
        { id: 'item4', name: '鞋子', type: 'shoes', imageUrl: mockImages[3] }
      ],
      createTime: new Date().getTime(),
      tags: ['舒适', '百搭', '时尚']
    };
  },
  
  // 生成模拟相似搭配数据
  generateMockSimilarOutfits: function() {
    // 模拟衣物图片
    const mockImages = [
      'https://picsum.photos/200/300?random=6',
      'https://picsum.photos/200/300?random=7',
      'https://picsum.photos/200/300?random=8',
      'https://picsum.photos/200/300?random=9',
      'https://picsum.photos/200/300?random=10'
    ];
    
    return [
      {
        id: 'similar-1',
        name: '相似搭配1',
        previewImage: 'https://picsum.photos/400/600?random=11',
        createTime: new Date().getTime() - 86400000 // 昨天
      },
      {
        id: 'similar-2',
        name: '相似搭配2',
        previewImage: 'https://picsum.photos/400/600?random=12',
        createTime: new Date().getTime() - 172800000 // 前天
      }
    ];
  },
  
  // 格式化日期
  formatDate: function(timestamp) {
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  },
  
  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  },
  
  // 查看相似搭配详情
  viewSimilarOutfit: function(e) {
    const outfitId = e.currentTarget.dataset.id;
    
    wx.redirectTo({
      url: `./outfit_detail?id=${outfitId}`
    });
  },
  
  // 编辑当前搭配
  editOutfit: function() {
    const outfitId = this.data.outfitId;
    
    wx.navigateTo({
      url: `../outfit_create/outfit_create?id=${outfitId}&mode=edit`
    });
  },
  
  // 删除当前搭配
  deleteOutfit: function() {
    const that = this;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这套搭配吗？删除后无法恢复。',
      confirmColor: '#E64340',
      success: res => {
        if (res.confirm) {
          // 用户点击确定，执行删除操作
          that.performDelete();
        }
      }
    });
  },
  
  // 执行删除操作
  performDelete: function() {
    const that = this;
    const db = wx.cloud.database();
    
    wx.showLoading({
      title: '删除中...',
    });
    
    db.collection('outfits')
      .doc(that.data.outfitId)
      .remove()
      .then(res => {
        console.log('删除搭配成功:', res);
        
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .catch(err => {
        console.error('删除搭配失败:', err);
        
        wx.showToast({
          title: '删除失败',
          icon: 'error'
        });
      })
      .finally(() => {
        wx.hideLoading();
      });
  }
}); 