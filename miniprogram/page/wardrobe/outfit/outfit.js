// page/wardrobe/outfit/outfit.js
Page({
  data: {
    // 定义颜色常量 - 与衣柜页面保持一致的颜色方案
    colors: {
      darkBrown: '#56513E',      // 深棕色（导航栏背景）
      darkOlive: '#3B3A30',      // 深橄榄绿（文字和图标）
      lightTaupe: '#BEB8A7',     // 浅灰褐色（页面背景和次要元素）
      mediumBrown: '#B38A63',    // 中棕色（卡片背景和强调元素）
      darkCoffee: '#473B29',     // 深咖啡色（分割线和次要文字）
    },
    isLoading: true,
    currentOutfit: null,
    savedOutfits: [],
    userOpenId: '',
    weatherInfo: {
      temperature: 0,
      weather: '晴',
      season: '春'
    }
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
    
    // 获取用户OpenID
    this.getUserOpenId();
    
    // 获取天气信息（实际项目中可以调用天气API）
    this.getWeatherInfo();
  },
  
  onShow: function() {
    // 如果已经有OpenID，获取衣物和搭配数据
    if (this.data.userOpenId) {
      this.getOutfitData();
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
      that.getOutfitData();
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
          that.getOutfitData();
        } else {
          // 获取失败，使用模拟数据
          that.useSimulatedData();
        }
      },
      fail: err => {
        console.error('云函数调用失败:', err);
        // 使用模拟数据
        that.useSimulatedData();
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },
  
  // 获取天气信息
  getWeatherInfo: function() {
    // 实际项目中，这里应该调用天气API获取数据
    // 这里使用模拟数据
    const seasons = ['春', '夏', '秋', '冬'];
    const weathers = ['晴', '多云', '小雨', '阴天'];
    
    const randomSeason = seasons[Math.floor(Math.random() * seasons.length)];
    const randomWeather = weathers[Math.floor(Math.random() * weathers.length)];
    const randomTemp = Math.floor(Math.random() * 30) + 5; // 5-35度
    
    this.setData({
      weatherInfo: {
        temperature: randomTemp,
        weather: randomWeather,
        season: randomSeason
      }
    });
  },
  
  // 获取搭配数据
  getOutfitData: function() {
    // 实际项目中，这里应该从数据库获取数据
    // 由于没有实际的数据库，使用模拟数据
    this.useSimulatedData();
  },
  
  // 使用模拟数据
  useSimulatedData: function() {
    // 模拟当前搭配
    const mockCurrentOutfit = {
      id: 'outfit1',
      previewImage: 'https://picsum.photos/400/600', // 使用随机图片
      items: [
        { id: 'item1', name: '米色针织衫', imageUrl: 'https://picsum.photos/200/200?random=1', category: '上衣' },
        { id: 'item2', name: '棕色休闲裤', imageUrl: 'https://picsum.photos/200/200?random=2', category: '裤子' },
        { id: 'item3', name: '米色休闲鞋', imageUrl: 'https://picsum.photos/200/200?random=3', category: '鞋子' }
      ],
      reason: `该搭配组合了柔和的中性色调，呈现出日式极简美学的和谐感。针织衫提供舒适质感，休闲裤增添自然流畅线条，整体呈现出平衡的比例和低调的优雅。适合${this.data.weatherInfo.season}季${this.data.weatherInfo.temperature}°C ${this.data.weatherInfo.weather}天气，搭配舒适又不失格调。`,
      date: this.formatDate(new Date())
    };
    
    // 模拟保存的搭配
    const mockSavedOutfits = [
      {
        id: 'saved1',
        previewImage: 'https://picsum.photos/200/300?random=4',
        date: this.formatDate(new Date(Date.now() - 86400000)) // 昨天
      },
      {
        id: 'saved2',
        previewImage: 'https://picsum.photos/200/300?random=5',
        date: this.formatDate(new Date(Date.now() - 2 * 86400000)) // 前天
      },
      {
        id: 'saved3',
        previewImage: 'https://picsum.photos/200/300?random=6',
        date: this.formatDate(new Date(Date.now() - 3 * 86400000))
      }
    ];
    
    this.setData({
      currentOutfit: mockCurrentOutfit,
      savedOutfits: mockSavedOutfits,
      isLoading: false
    });
  },
  
  // 格式化日期
  formatDate: function(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}.${month}.${day}`;
  },
  
  // 刷新搭配
  refreshOutfit: function() {
    this.setData({
      isLoading: true
    });
    
    // 在实际应用中，这里应该调用AI推荐接口获取新搭配
    // 为了演示，这里使用模拟数据
    
    // 模拟调用DeepSeek获取推荐
    this.getDeepSeekRecommendation();
  },
  
  // 模拟调用DeepSeek获取推荐
  getDeepSeekRecommendation: function() {
    wx.showLoading({
      title: '获取AI推荐中...',
    });
    
    setTimeout(() => {
      // 模拟AI推荐结果
      const styles = ['日式简约', '都市休闲', '学院风', '工作通勤', '周末休闲'];
      const randomStyle = styles[Math.floor(Math.random() * styles.length)];
      
      const colors = ['米色', '藏青', '卡其', '灰色', '棕色', '黑色', '白色'];
      const randomColors = [
        colors[Math.floor(Math.random() * colors.length)],
        colors[Math.floor(Math.random() * colors.length)],
        colors[Math.floor(Math.random() * colors.length)]
      ];
      
      const tops = ['衬衫', '毛衣', 'T恤', '针织衫', '卫衣'];
      const bottoms = ['牛仔裤', '休闲裤', '西裤', '短裤', '半身裙'];
      const shoes = ['运动鞋', '皮鞋', '帆布鞋', '休闲鞋', '靴子'];
      
      const randomTop = tops[Math.floor(Math.random() * tops.length)];
      const randomBottom = bottoms[Math.floor(Math.random() * bottoms.length)];
      const randomShoe = shoes[Math.floor(Math.random() * shoes.length)];
      
      // 创建新的搭配对象
      const newOutfit = {
        id: 'outfit' + Date.now(),
        previewImage: 'https://picsum.photos/400/600?random=' + Date.now(), // 随机图片
        items: [
          { 
            id: 'top' + Date.now(), 
            name: randomColors[0] + randomTop, 
            imageUrl: 'https://picsum.photos/200/200?random=' + (Date.now() + 1), 
            category: '上衣' 
          },
          { 
            id: 'bottom' + Date.now(), 
            name: randomColors[1] + randomBottom, 
            imageUrl: 'https://picsum.photos/200/200?random=' + (Date.now() + 2), 
            category: '裤子' 
          },
          { 
            id: 'shoe' + Date.now(), 
            name: randomColors[2] + randomShoe, 
            imageUrl: 'https://picsum.photos/200/200?random=' + (Date.now() + 3), 
            category: '鞋子' 
          }
        ],
        reason: `这套${randomStyle}风格搭配选用了${randomColors[0]}${randomTop}、${randomColors[1]}${randomBottom}和${randomColors[2]}${randomShoe}，色调和谐统一。考虑到${this.data.weatherInfo.season}季${this.data.weatherInfo.temperature}°C的${this.data.weatherInfo.weather}天气，既保证舒适度又不失格调。${randomColors[0]}与${randomColors[1]}的搭配呈现出平衡的视觉效果，符合日式极简主义的审美理念，强调简约、自然与内敛。`,
        date: this.formatDate(new Date())
      };
      
      this.setData({
        currentOutfit: newOutfit,
        isLoading: false
      });
      
      wx.hideLoading();
    }, 1500); // 模拟网络延迟
  },
  
  // 保存当前搭配
  saveOutfit: function() {
    if (!this.data.currentOutfit) {
      return;
    }
    
    // 实际应用中，这里应该将搭配保存到数据库
    // 为了演示，这里只是将搭配添加到本地数组
    
    const savedOutfits = [this.data.currentOutfit, ...this.data.savedOutfits];
    // 限制保存的搭配数量
    if (savedOutfits.length > 10) {
      savedOutfits.pop();
    }
    
    this.setData({
      savedOutfits: savedOutfits
    });
    
    wx.showToast({
      title: '搭配已保存',
      icon: 'success'
    });
  },
  
  // 选择保存的搭配
  selectSavedOutfit: function(e) {
    const outfitId = e.currentTarget.dataset.id;
    const outfit = this.data.savedOutfits.find(item => item.id === outfitId);
    
    if (outfit) {
      this.setData({
        currentOutfit: outfit
      });
    }
  }
});