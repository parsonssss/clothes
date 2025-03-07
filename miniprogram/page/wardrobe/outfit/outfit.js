// page/wardrobe/outfit/outfit.js
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
    
    // 各类别搭配数据
    dailyOutfits: [],    // 日常穿搭
    workOutfits: [],     // 职业穿搭
    partyOutfits: [],    // 派对穿搭
    sportOutfits: [],    // 运动穿搭
    seasonalOutfits: [], // 季节穿搭
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
    
    // 获取用户OpenID
    this.getUserOpenId();
  },
  
  onShow: function() {
    // 如果已经有OpenID，获取衣物和搭配数据
    if (this.data.userOpenId) {
      this.getOutfitsByCategory();
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
      
      // 获取搭配数据
      that.getOutfitsByCategory();
      wx.hideLoading();
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
          
          // 获取搭配数据
          that.getOutfitsByCategory();
        } else {
          // 获取失败，使用模拟数据
          that.useSimulatedData();
        }
      },
      fail: err => {
        console.error('云函数调用失败:', err);
        that.useSimulatedData();
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },
  
  // 按类别获取搭配数据
  getOutfitsByCategory: function() {
    const that = this;
    wx.showLoading({
      title: '加载搭配...',
    });
    
    const db = wx.cloud.database();
    const _ = db.command;
    
    // 查询条件：用户的搭配
    const query = {
      _openid: that.data.userOpenId
    };
    
    // 获取所有搭配
    db.collection('outfits')
      .where(query)
      .get()
      .then(res => {
        console.log('获取搭配成功:', res.data);
        
        // 按类别分类搭配
        const outfits = res.data || [];
        
        // 初始化各类别搭配数组
        const dailyOutfits = outfits.filter(outfit => outfit.category === 'daily');
        const workOutfits = outfits.filter(outfit => outfit.category === 'work');
        const partyOutfits = outfits.filter(outfit => outfit.category === 'party');
        const sportOutfits = outfits.filter(outfit => outfit.category === 'sport');
        const seasonalOutfits = outfits.filter(outfit => outfit.category === 'seasonal');
        
        // 更新数据
        that.setData({
          dailyOutfits,
          workOutfits,
          partyOutfits,
          sportOutfits,
          seasonalOutfits,
          isLoading: false
        });
        
        console.log('搭配数据已分类完成');
      })
      .catch(err => {
        console.error('获取搭配失败:', err);
        that.useSimulatedData();
      })
      .finally(() => {
        wx.hideLoading();
      });
  },
  
  // 使用模拟数据（当无法获取真实数据时）
  useSimulatedData: function() {
    console.log('使用模拟数据');
    
    // 生成模拟搭配数据
    const simulatedOutfits = this.generateSimulatedOutfits();
    
    // 按类别分类搭配
    const dailyOutfits = simulatedOutfits.filter(outfit => outfit.category === 'daily');
    const workOutfits = simulatedOutfits.filter(outfit => outfit.category === 'work');
    const partyOutfits = simulatedOutfits.filter(outfit => outfit.category === 'party');
    const sportOutfits = simulatedOutfits.filter(outfit => outfit.category === 'sport');
    const seasonalOutfits = simulatedOutfits.filter(outfit => outfit.category === 'seasonal');
    
    // 更新数据
    this.setData({
      dailyOutfits,
      workOutfits,
      partyOutfits,
      sportOutfits,
      seasonalOutfits,
      isLoading: false
    });
    
    console.log('模拟数据加载完成');
  },
  
  // 生成模拟搭配数据
  generateSimulatedOutfits: function() {
    // 模拟衣物图片
    const mockImages = [
      'https://picsum.photos/200/300?random=1',
      'https://picsum.photos/200/300?random=2',
      'https://picsum.photos/200/300?random=3',
      'https://picsum.photos/200/300?random=4',
      'https://picsum.photos/200/300?random=5'
    ];
    
    // 生成模拟搭配
    return [
      {
        id: 'daily-1',
        name: '休闲日常搭配',
        category: 'daily',
        previewImage: 'https://picsum.photos/400/600?random=10',
        items: [
          { id: 'd1', name: '白色T恤', imageUrl: mockImages[0] },
          { id: 'd2', name: '牛仔裤', imageUrl: mockImages[1] },
          { id: 'd3', name: '运动鞋', imageUrl: mockImages[2] }
        ],
        createTime: new Date('2023-03-01').getTime()
      },
      {
        id: 'daily-2',
        name: '舒适居家搭配',
        category: 'daily',
        previewImage: 'https://picsum.photos/400/600?random=11',
        items: [
          { id: 'd4', name: '卫衣', imageUrl: mockImages[3] },
          { id: 'd5', name: '休闲裤', imageUrl: mockImages[4] },
          { id: 'd6', name: '拖鞋', imageUrl: mockImages[0] }
        ],
        createTime: new Date('2023-03-02').getTime()
      },
      {
        id: 'work-1',
        name: '商务正装',
        category: 'work',
        previewImage: 'https://picsum.photos/400/600?random=12',
        items: [
          { id: 'w1', name: '西装外套', imageUrl: mockImages[1] },
          { id: 'w2', name: '衬衫', imageUrl: mockImages[2] },
          { id: 'w3', name: '西裤', imageUrl: mockImages[3] },
          { id: 'w4', name: '皮鞋', imageUrl: mockImages[4] }
        ],
        createTime: new Date('2023-03-03').getTime()
      },
      {
        id: 'party-1',
        name: '派对时尚',
        category: 'party',
        previewImage: 'https://picsum.photos/400/600?random=13',
        items: [
          { id: 'p1', name: '亮片上衣', imageUrl: mockImages[0] },
          { id: 'p2', name: '紧身裤', imageUrl: mockImages[1] },
          { id: 'p3', name: '高跟鞋', imageUrl: mockImages[2] }
        ],
        createTime: new Date('2023-03-04').getTime()
      },
      {
        id: 'sport-1',
        name: '运动健身',
        category: 'sport',
        previewImage: 'https://picsum.photos/400/600?random=14',
        items: [
          { id: 's1', name: '运动T恤', imageUrl: mockImages[3] },
          { id: 's2', name: '运动短裤', imageUrl: mockImages[4] },
          { id: 's3', name: '运动鞋', imageUrl: mockImages[0] }
        ],
        createTime: new Date('2023-03-05').getTime()
      },
      {
        id: 'seasonal-1',
        name: '春季出行',
        category: 'seasonal',
        previewImage: 'https://picsum.photos/400/600?random=15',
        items: [
          { id: 'se1', name: '轻薄外套', imageUrl: mockImages[1] },
          { id: 'se2', name: '长袖T恤', imageUrl: mockImages[2] },
          { id: 'se3', name: '休闲裤', imageUrl: mockImages[3] },
          { id: 'se4', name: '帆布鞋', imageUrl: mockImages[4] }
        ],
        createTime: new Date('2023-03-06').getTime()
      }
    ];
  },
  
  // 跳转到创建搭配页面
  goToCreateOutfit: function() {
    wx.navigateTo({
      url: './outfit_create/outfit_create'
    });
  },
  
  // 跳转到类别详情页面
  navigateToCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    console.log('跳转到类别:', category);
    
    // 跳转到类别详情页面
    wx.navigateTo({
      url: `./outfit_category/outfit_category?category=${category}`
    });
  },
  
  // 查看搭配详情
  viewOutfitDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    console.log('查看搭配详情:', id);
    
    // 跳转到搭配详情页面
    wx.navigateTo({
      url: `./outfit_detail/outfit_detail?id=${id}`
    });
  },
  
  // 阻止事件冒泡
  stopPropagation: function(e) {
    // 阻止事件冒泡
    return;
  }
});