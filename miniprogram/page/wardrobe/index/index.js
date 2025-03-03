// page/wardrobe/index/index.js
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
    weather: {
      city: '获取中...',
      day: '',
      temperature: '--°C',
      condition: '获取中...',
      icon: '',
      iconUrl: '',
      humidity: '',
      windSpeed: ''
    },
    modelImageUrl: '', // AI模特图片URL
    defaultModelUrl: '', // 默认模特图片URL
    isGeneratingModel: false, // 是否正在生成AI模特
    isGeneratingOutfit: false, // 是否正在生成搭配推荐
    recommendedOutfit: [], // 推荐的衣物列表
    isLoading: true,
    lastUrlRefreshTime: 0, // 最后一次图片URL刷新时间
    lastWeatherUpdateTime: 0 // 最后一次天气更新时间
  },
  
  // OpenWeather API配置
  weatherConfig: {
    API_KEY: "a69ee4d99f8a1c1c328106e992214ab5",
    BASE_URL: "https://api.openweathermap.org/data/2.5"
  },
  
  onLoad: function() {
    // 初始化云环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'cloud1-3gi97kso9ab01185',
        traceUser: true,
      });
    }
    
    // 获取默认模特图片
    this.getDefaultModelImage();
    
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
    const oneHourInMs = 60 * 60 * 1000; // 1小时的毫秒数
    
    // 如果距离上次刷新图片超过10分钟，则刷新
    if (now - this.data.lastUrlRefreshTime > tenMinutesInMs) {
      console.log('超过10分钟未刷新图片，重新加载图片');
      this.refreshModelImages();
    }
    
    // 如果距离上次刷新天气超过1小时，则刷新
    if (now - this.data.lastWeatherUpdateTime > oneHourInMs) {
      console.log('超过1小时未刷新天气，重新获取天气');
      this.getWeatherData();
    }
  },
  
  // 加载页面数据
  loadPageData: function() {
    this.setData({
      isLoading: true
    });
    
    // 获取天气数据
    this.getWeatherData();
    
    // 获取保存的AI模特图片（如果有）
    this.getModelImage();
  },
  
  // 获取默认模特图片
  getDefaultModelImage: function() {
    const fileID = 'cloud://cloud1-3gi97kso9ab01185.636c-cloud1-3gi97kso9ab01185-1303166775/ComfyUI_01403_.png';
    
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: res => {
        console.log('获取默认模特图片成功', res);
        if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
          this.setData({
            defaultModelUrl: res.fileList[0].tempFileURL
          });
        } else {
          console.error('获取默认模特图片返回格式异常', res);
          this.setData({
            defaultModelUrl: '/image/default-model.png'
          });
        }
      },
      fail: err => {
        console.error('获取默认模特图片失败', err);
        this.setData({
          defaultModelUrl: '/image/default-model.png'
        });
      }
    });
  },
  
  // 获取保存的AI模特图片
  getModelImage: function() {
    // 尝试从本地存储读取
    const modelImageUrl = wx.getStorageSync('modelImageUrl');
    if (modelImageUrl) {
      this.setData({
        modelImageUrl: modelImageUrl
      });
    }
  },
  
  // 刷新图片URL
  refreshModelImages: function() {
    this.setData({
      lastUrlRefreshTime: Date.now()
    });
    
    // 刷新模特图片URL可能会在以后实现
    // 这里可能需要重新获取云存储的临时URL
  },
  
  // 获取天气数据
  getWeatherData: function() {
    // 展示加载状态
    wx.showLoading({
      title: '获取天气中...',
      mask: false
    });
    
    // 获取用户位置
    wx.getLocation({
      type: 'gcj02', // 默认为 wgs84
      success: res => {
        const latitude = res.latitude;
        const longitude = res.longitude;
        
        // 使用OpenWeather API获取天气
        this.getWeatherByCoordinates(latitude, longitude);
      },
      fail: err => {
        console.error('获取位置失败:', err);
        wx.hideLoading();
        
        // 使用默认位置（上海）获取天气
        this.getWeatherByCity('Shanghai');
        
        // 提示用户
        wx.showToast({
          title: '无法获取位置，使用默认位置',
          icon: 'none'
        });
      }
    });
  },
  
  // 根据经纬度获取天气
  getWeatherByCoordinates: function(latitude, longitude) {
    // 构建API URL
    const url = `${this.weatherConfig.BASE_URL}/weather?lat=${latitude}&lon=${longitude}&appid=${this.weatherConfig.API_KEY}&units=metric&lang=zh_cn`;
    
    // 发起请求
    wx.request({
      url: url,
      success: res => {
        console.log('天气API返回:', res);
        
        if (res.statusCode === 200 && res.data) {
          this.processWeatherData(res.data);
        } else {
          console.error('天气API返回错误:', res);
          wx.hideLoading();
          wx.showToast({
            title: '获取天气失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('天气请求失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '获取天气失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 根据城市名获取天气
  getWeatherByCity: function(city) {
    // 构建API URL
    const url = `${this.weatherConfig.BASE_URL}/weather?q=${city}&appid=${this.weatherConfig.API_KEY}&units=metric&lang=zh_cn`;
    
    // 发起请求
    wx.request({
      url: url,
      success: res => {
        console.log('天气API返回:', res);
        
        if (res.statusCode === 200 && res.data) {
          this.processWeatherData(res.data);
        } else {
          console.error('天气API返回错误:', res);
          wx.hideLoading();
          wx.showToast({
            title: '获取天气失败',
            icon: 'none'
          });
        }
      },
      fail: err => {
        console.error('天气请求失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '获取天气失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 处理天气API返回的数据
  processWeatherData: function(data) {
    if (!data) return;
    
    // 获取星期几
    const days = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
    const today = new Date();
    const day = days[today.getDay()];
    
    // 处理温度（四舍五入到整数）
    const temperature = Math.round(data.main.temp) + '°C';
    
    // 处理天气状况
    const condition = data.weather[0].description;
    
    // 处理天气图标
    const iconCode = data.weather[0].icon;
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    
    // 处理天气图标类型
    let icon = 'cloud';
    if (iconCode.includes('01') || iconCode.includes('02')) {
      icon = 'sun';
    } else if (iconCode.includes('09') || iconCode.includes('10') || iconCode.includes('11')) {
      icon = 'rain';
    }
    
    // 更新天气数据
    this.setData({
      'weather.city': data.name,
      'weather.day': day,
      'weather.temperature': temperature,
      'weather.condition': condition,
      'weather.icon': icon,
      'weather.iconUrl': iconUrl,
      'weather.humidity': data.main.humidity + '%',
      'weather.windSpeed': data.wind.speed + ' m/s',
      lastWeatherUpdateTime: Date.now(),
      isLoading: false
    });
    
    wx.hideLoading();
  },
  
  // 获取穿搭推荐
  getOutfitRecommendation: function() {
    // 设置生成状态
    this.setData({
      isGeneratingOutfit: true
    });
    
    // 获取用户衣物列表
    this.getUserClothes()
      .then(clothes => {
        if (!clothes || clothes.length === 0) {
          // 没有衣物数据，压断处理
          wx.showToast({
            title: '您的衣柜还没有衣物，请先添加衣物',
            icon: 'none',
            duration: 2000
          });
          this.setData({
            isGeneratingOutfit: false
          });
          return Promise.reject(new Error('没有衣物数据'));
        }
        
        // 模拟生成推荐数据（如果云函数不可用）
        if (!wx.cloud || this.data.weather.condition.includes('获取中')) {
          return this.generateMockRecommendation(clothes);
        }
        
        // 调用云函数获取穿搭推荐
        return wx.cloud.callFunction({
          name: 'getOutfitRecommendation',
          data: {
            weatherData: this.data.weather,
            userClothes: clothes
          }
        });
      })
      .then(res => {
        // 支持模拟数据和云函数结果两种形式
        if (res.mockData) {
          // 直接使用模拟数据
          this.getOutfitImages(res.mockData);
          return;
        }
        
        console.log('获取穿搭推荐成功:', res);
        
        if (res.result && res.result.success) {
          // 推荐成功
          const recommendation = res.result.recommendation;
          const matchedOutfit = res.result.matchedOutfit;
          
          // 如果有匹配的衣物，展示这些衣物
          if (matchedOutfit && matchedOutfit.length > 0) {
            // 获取衣物图片的临时URL
            this.getOutfitImages(matchedOutfit);
          } else {
            // 如果没有匹配的衣物，根据推荐查找类似的衣物
            this.findSimilarClothes(recommendation);
          }
        } else {
          console.error('获取穿搭推荐失败:', res);
          this.setData({
            isGeneratingOutfit: false
          });
          wx.showToast({
            title: '推荐生成失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        console.error('获取穿搭推荐异常:', err);
        this.setData({
          isGeneratingOutfit: false
        });
        if (err.message !== '没有衣物数据') {
          wx.showToast({
            title: '推荐生成失败',
            icon: 'none'
          });
        }
      });
  },
  
  // 获取用户衣物列表
  getUserClothes: function() {
    return new Promise((resolve, reject) => {
      const db = wx.cloud.database();
      
      db.collection('clothes')
        .get()
        .then(res => {
          console.log('获取衣物列表成功:', res);
          resolve(res.data || []);
        })
        .catch(err => {
          console.error('获取衣物列表失败:', err);
          resolve([]); // 即使失败也返回空数组，不要中断流程
        });
    });
  },
  
  // 根据推荐查找类似的衣物
  findSimilarClothes: function(recommendation) {
    if (!recommendation || !recommendation.recommendation || recommendation.recommendation.length === 0) {
      this.setData({
        isGeneratingOutfit: false,
        recommendedOutfit: []
      });
      return;
    }
    
    const db = wx.cloud.database();
    const _ = db.command;
    const promises = [];
    
    // 为每个推荐的衣物类型查找匹配的衣物
    recommendation.recommendation.forEach(item => {
      const query = {
        category: item.category
      };
      
      // 如果有颜色，添加颜色条件
      if (item.color) {
        query.color = item.color;
      }
      
      // 如果有风格，添加风格条件
      if (item.style) {
        query.style = item.style;
      }
      
      // 查询数据库
      const promise = db.collection('clothes')
        .where(query)
        .limit(1)
        .get();
      
      promises.push(promise);
    });
    
    // 等待所有查询完成
    Promise.all(promises)
      .then(results => {
        // 收集找到的衣物
        const foundClothes = [];
        
        results.forEach(res => {
          if (res.data && res.data.length > 0) {
            foundClothes.push(res.data[0]);
          }
        });
        
        // 如果找到了衣物，获取图片URL
        if (foundClothes.length > 0) {
          this.getOutfitImages(foundClothes);
        } else {
          // 如果没有找到匹配的衣物，清空推荐
          this.setData({
            isGeneratingOutfit: false,
            recommendedOutfit: []
          });
        }
      })
      .catch(err => {
        console.error('查找类似衣物失败:', err);
        this.setData({
          isGeneratingOutfit: false,
          recommendedOutfit: []
        });
      });
  },
  
  // 获取衣物图片的临时URL
  getOutfitImages: function(clothes) {
    if (!clothes || clothes.length === 0) {
      this.setData({
        recommendedOutfit: [],
        isGeneratingOutfit: false
      });
      return;
    }
    
    // 收集所有非空的fileID
    const fileIDs = clothes.map(item => item.fileID).filter(fileID => fileID);
    
    if (fileIDs.length === 0) {
      // 如果没有图片，直接显示衣物
      this.setData({
        recommendedOutfit: clothes,
        isGeneratingOutfit: false
      });
      return;
    }
    
    // 获取临时URL
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: res => {
        console.log('获取衣物图片URL成功:', res);
        
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
        
        // 更新推荐列表
        this.setData({
          recommendedOutfit: updatedClothes,
          isGeneratingOutfit: false
        });
      },
      fail: err => {
        console.error('获取衣物图片URL失败:', err);
        
        // 如果获取失败，仍然显示衣物，但不显示图片
        const updatedClothes = clothes.map(cloth => {
          return {...cloth, tempImageUrl: ''};
        });
        
        this.setData({
          recommendedOutfit: updatedClothes,
          isGeneratingOutfit: false
        });
      }
    });
  },
  
  // 上传个人照片生成AI模特
  uploadPersonalPhoto: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        // 获取选择的图片路径
        const tempFilePath = res.tempFiles[0].tempFilePath;
        // 上传图片到云存储并生成AI模特
        this.uploadAndGenerateModel(tempFilePath);
      },
      fail: (err) => {
        console.error('选择图片失败', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 上传图片到云存储并生成AI模特
  uploadAndGenerateModel: function(filePath) {
    this.setData({
      isGeneratingModel: true
    });
    
    wx.showLoading({
      title: '上传中...',
    });
    
    // 上传到云存储
    const cloudPath = 'model-photos/' + Date.now() + filePath.match(/\.[^.]+?$/)[0];
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: res => {
        // 获取云存储文件ID
        const fileID = res.fileID;
        
        // 获取临时访问URL
        wx.cloud.getTempFileURL({
          fileList: [fileID],
          success: result => {
            const imageUrl = result.fileList[0].tempFileURL;
            console.log('上传成功，临时URL:', imageUrl);
            wx.hideLoading();
            wx.showLoading({
              title: '生成AI模特中...',
            });
            
            // 调用云函数生成AI模特
            this.generateAIModel(imageUrl, fileID);
          },
          fail: err => {
            console.error('获取临时URL失败', err);
            this.handleModelGenerationError('获取图片链接失败');
          }
        });
      },
      fail: err => {
        console.error('上传图片失败', err);
        this.handleModelGenerationError('上传图片失败');
      }
    });
  },
  
  // 调用DashScope API生成AI模特
  generateAIModel: function(imageUrl, fileID) {
    // 调用云函数发送请求到阿里DashScope API
    wx.cloud.callFunction({
      name: 'generateAIModel',
      data: {
        baseImageUrl: imageUrl,
        prompt: "一名年轻女子，身穿白色短裤，极简风格调色板，长镜头，双色效果（暗银色和浅粉色）",
        facePrompt: "年轻女子，面容姣好，最高品质"
      },
      success: res => {
        if (res.result && res.result.taskId) {
          console.log('AI模特生成任务已提交，任务ID:', res.result.taskId);
          
          // 轮询任务结果
          this.pollTaskResult(res.result.taskId);
        } else {
          console.error('生成AI模特失败', res);
          this.handleModelGenerationError('生成失败');
        }
      },
      fail: err => {
        console.error('调用生成函数失败', err);
        this.handleModelGenerationError('生成请求失败');
      }
    });
  },
  
  // 轮询任务结果
  pollTaskResult: function(taskId) {
    // 创建轮询间隔
    const pollInterval = setInterval(() => {
      wx.cloud.callFunction({
        name: 'checkModelTaskStatus',
        data: {
          taskId: taskId
        },
        success: res => {
          console.log('检查任务状态结果:', res);
          
          if (res.result && res.result.output) {
            // 任务完成，获取结果
            clearInterval(pollInterval);
            
            // 获取生成的图片URL
            const modelImageUrl = res.result.output.results[0].url;
            if (modelImageUrl) {
              // 保存结果并更新UI
              wx.setStorageSync('modelImageUrl', modelImageUrl);
              this.setData({
                modelImageUrl: modelImageUrl,
                isGeneratingModel: false
              });
              
              wx.hideLoading();
              wx.showToast({
                title: 'AI模特生成成功',
                icon: 'success'
              });
            } else {
              this.handleModelGenerationError('获取结果失败');
            }
          } else if (res.result && res.result.status === 'FAILED') {
            // 任务失败
            clearInterval(pollInterval);
            this.handleModelGenerationError('生成失败');
          }
          // 其他状态继续轮询
        },
        fail: err => {
          console.error('检查任务状态失败', err);
          clearInterval(pollInterval);
          this.handleModelGenerationError('检查状态失败');
        }
      });
    }, 5000); // 每5秒查询一次
    
    // 设置最大轮询次数（超时处理）
    setTimeout(() => {
      clearInterval(pollInterval);
      if (this.data.isGeneratingModel) {
        this.handleModelGenerationError('生成超时，请稍后再试');
      }
    }, 5 * 60 * 1000); // 5分钟超时
  },
  
  // 处理模特生成错误
  handleModelGenerationError: function(errorMsg) {
    wx.hideLoading();
    this.setData({
      isGeneratingModel: false
    });
    
    wx.showToast({
      title: errorMsg || 'AI模特生成失败',
      icon: 'none'
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
    // 显示更详细的天气信息
    wx.showModal({
      title: this.data.weather.city + '天气',
      content: `温度: ${this.data.weather.temperature}
天气: ${this.data.weather.condition}
湿度: ${this.data.weather.humidity}
风速: ${this.data.weather.windSpeed}`,
      showCancel: false
    });
  }
});