// page/wardrobe/outfit/outfit_category/outfit_category.js
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
    
    // 类别信息
    category: '',         // 类别ID
    categoryName: '',     // 类别名称
    outfits: [],          // 该类别的搭配列表
    
    // URL缓存标志
    urlCacheInitialized: false // 标记是否已初始化URL缓存
  },

  // URL检查定时器
  urlCheckTimer: null,

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
    
    // 获取类别参数
    if (options && options.category) {
      const category = options.category;
      
      // 设置类别名称
      const categoryNames = {
        'daily': '日常穿搭',
        'work': '职业穿搭',
        'party': '派对穿搭',
        'sport': '运动穿搭',
        'seasonal': '季节穿搭'
      };
      
      this.setData({
        category: category,
        categoryName: categoryNames[category] || '穿搭'
      });
      
      // 初始化URL缓存
      this.initURLCache();
      
      // 获取用户OpenID
      this.getUserOpenId();
    } else {
      wx.showToast({
        title: '缺少类别参数',
        icon: 'none'
      });
      
      // 延迟返回
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  onShow: function() {
    console.log('页面显示，尝试获取最新数据');
    
    // 如果已经有类别信息，尝试获取最新数据
    if (this.data.category) {
      // 获取用户OpenID并获取搭配数据
      this.getUserOpenId();
      
      // 启动定时器，定期检查临时URL是否需要刷新（每3分钟检查一次）
      this.startURLCheckTimer();
      
      // 立即检查一次图片URL
      this.onPageShow();
    }
  },
  
  // 页面显示时检查所有图片URL
  onPageShow: function() {
    // 如果页面正在加载或没有数据，则跳过
    if (this.data.isLoading || !this.data.outfits || this.data.outfits.length === 0) {
      return;
    }
    
    console.log('页面显示，检查所有图片URL');
    
    // 检查并刷新所有图片URL
    this.checkAndRefreshAllImages();
  },
  
  onHide: function() {
    // 页面隐藏时清除定时器
    this.clearURLCheckTimer();
  },
  
  onUnload: function() {
    // 页面卸载时清除定时器
    this.clearURLCheckTimer();
  },
  
  // 启动URL检查定时器
  startURLCheckTimer: function() {
    // 清除可能存在的旧定时器
    this.clearURLCheckTimer();
    
    // 创建新定时器，每3分钟检查一次
    this.urlCheckTimer = setInterval(() => {
      this.checkAndRefreshURLs();
    }, 180000); // 3分钟
    
    console.log('已启动临时URL检查定时器');
  },
  
  // 清除URL检查定时器
  clearURLCheckTimer: function() {
    if (this.urlCheckTimer) {
      clearInterval(this.urlCheckTimer);
      this.urlCheckTimer = null;
      console.log('已清除临时URL检查定时器');
    }
  },
  
  // 初始化URL缓存
  initURLCache: function() {
    // 检查全局缓存是否已初始化
    const app = getApp();
    if (!app.globalData) {
      app.globalData = {};
    }
    
    if (!app.globalData.urlCache) {
      app.globalData.urlCache = {};
      console.log('已初始化全局URL缓存');
    }
    
    this.setData({
      urlCacheInitialized: true
    });
  },
  
  // 从缓存获取URL
  getURLFromCache: function(fileID) {
    if (!fileID) return null;
    
    const app = getApp();
    if (!app.globalData || !app.globalData.urlCache) return null;
    
    const cachedData = app.globalData.urlCache[fileID];
    if (!cachedData) return null;
    
    // 检查URL是否已过期（9分钟为临界值）
    const now = Date.now();
    if (now - cachedData.timestamp > 540000) { // 9分钟
      console.log(`缓存的URL已过期: ${fileID}`);
      return null;
    }
    
    console.log(`从缓存获取URL: ${fileID}`);
    return cachedData.url;
  },
  
  // 更新URL缓存
  updateURLCache: function(fileID, url) {
    if (!fileID || !url) return;
    
    const app = getApp();
    if (!app.globalData) app.globalData = {};
    if (!app.globalData.urlCache) app.globalData.urlCache = {};
    
    app.globalData.urlCache[fileID] = {
      url: url,
      timestamp: Date.now()
    };
    
    console.log(`已更新URL缓存: ${fileID}`);
  },
  
  // 检查并刷新所有图片
  checkAndRefreshAllImages: function() {
    const outfits = this.data.outfits;
    if (!outfits || outfits.length === 0) return;
    
    // 检查所有搭配的预览图和衣物图片
    let needRefresh = false;
    const fileIDsToRefresh = [];
    const fileIDMap = {}; // 保存fileID与图片位置的映射
    
    // 收集所有需要刷新的fileID
    outfits.forEach((outfit, outfitIndex) => {
      // 检查预览图
      const previewFileID = outfit.imageFileID || 
                          (outfit.previewImage && outfit.previewImage.includes('cloud://') ? 
                           outfit.previewImage : null);
      
      if (previewFileID) {
        fileIDsToRefresh.push(previewFileID);
        fileIDMap[previewFileID] = { type: 'preview', outfitIndex };
      }
      
      // 检查衣物图片
      if (outfit.items && Array.isArray(outfit.items)) {
        outfit.items.forEach((item, itemIndex) => {
          const itemFileID = item.imageFileID || 
                           item.fileID || 
                           (item.imageUrl && item.imageUrl.includes('cloud://') ? 
                            item.imageUrl : null);
          
          if (itemFileID) {
            fileIDsToRefresh.push(itemFileID);
            fileIDMap[itemFileID] = { type: 'item', outfitIndex, itemIndex };
          }
        });
      }
    });
    
    // 如果没有需要刷新的图片，返回
    if (fileIDsToRefresh.length === 0) {
      console.log('没有需要刷新的图片');
      return;
    }
    
    console.log(`需要检查 ${fileIDsToRefresh.length} 个图片URL`);
    
    // 批量获取临时URL
    wx.cloud.getTempFileURL({
      fileList: fileIDsToRefresh,
      success: res => {
        console.log('批量获取临时URL成功:', res);
        let updateCount = 0;
        
        if (res.fileList && res.fileList.length > 0) {
          // 使用新获取的临时URL更新数据
          res.fileList.forEach(file => {
            if (!file.fileID || !file.tempFileURL) return;
            
            // 更新URL缓存
            this.updateURLCache(file.fileID, file.tempFileURL);
            
            // 根据fileID找到对应的图片并更新
            const fileInfo = fileIDMap[file.fileID];
            if (fileInfo) {
              if (fileInfo.type === 'preview') {
                // 更新搭配预览图
                const oldUrl = outfits[fileInfo.outfitIndex].previewImage;
                outfits[fileInfo.outfitIndex].previewImage = file.tempFileURL;
                
                if (oldUrl !== file.tempFileURL) {
                  updateCount++;
                  // 单独更新数据以提高效率
                  this.setData({
                    [`outfits[${fileInfo.outfitIndex}].previewImage`]: file.tempFileURL
                  });
                }
              } else if (fileInfo.type === 'item') {
                // 更新衣物图片
                const oldUrl = outfits[fileInfo.outfitIndex].items[fileInfo.itemIndex].imageUrl;
                outfits[fileInfo.outfitIndex].items[fileInfo.itemIndex].imageUrl = file.tempFileURL;
                
                if (oldUrl !== file.tempFileURL) {
                  updateCount++;
                  // 单独更新数据以提高效率
                  this.setData({
                    [`outfits[${fileInfo.outfitIndex}].items[${fileInfo.itemIndex}].imageUrl`]: file.tempFileURL
                  });
                }
              }
            }
          });
        }
        
        if (updateCount > 0) {
          console.log(`已更新 ${updateCount} 个图片URL`);
        } else {
          console.log('所有图片URL均为最新，无需更新');
        }
      },
      fail: err => {
        console.error('批量获取临时URL失败:', err);
      }
    });
  },
  
  // 检查并刷新临时URL
  checkAndRefreshURLs: function() {
    console.log('开始检查临时URL是否需要刷新');
    
    const outfits = this.data.outfits;
    if (!outfits || outfits.length === 0) return;
    
    const now = Date.now();
    const fileIDsToRefresh = []; // 保存需要刷新的fileID
    const fileIDMap = {}; // 保存fileID与图片位置的映射
    
    // 检查每个搭配
    outfits.forEach((outfit, outfitIndex) => {
      // 检查预览图
      const previewFileID = outfit.imageFileID || 
                          (outfit.previewImage && outfit.previewImage.includes('cloud://') ? 
                           outfit.previewImage : null);
      
      if (previewFileID) {
        // 获取缓存中的时间戳
        const app = getApp();
        const cachedData = app.globalData.urlCache && app.globalData.urlCache[previewFileID];
        
        // 如果URL快过期（8分钟）或没有缓存，需要刷新
        if (!cachedData || now - cachedData.timestamp > 480000) { // 8分钟
          console.log(`搭配预览图URL需要刷新: ${previewFileID}`);
          fileIDsToRefresh.push(previewFileID);
          fileIDMap[previewFileID] = { type: 'preview', outfitIndex };
        }
      }
      
      // 检查每个衣物图片
      if (outfit.items && Array.isArray(outfit.items)) {
        outfit.items.forEach((item, itemIndex) => {
          const itemFileID = item.imageFileID || 
                           item.fileID || 
                           (item.imageUrl && item.imageUrl.includes('cloud://') ? 
                            item.imageUrl : null);
          
          if (itemFileID) {
            // 获取缓存中的时间戳
            const app = getApp();
            const cachedData = app.globalData.urlCache && app.globalData.urlCache[itemFileID];
            
            // 如果URL快过期（8分钟）或没有缓存，需要刷新
            if (!cachedData || now - cachedData.timestamp > 480000) { // 8分钟
              console.log(`衣物图片URL需要刷新: ${itemFileID}`);
              fileIDsToRefresh.push(itemFileID);
              fileIDMap[itemFileID] = { type: 'item', outfitIndex, itemIndex };
            }
          }
        });
      }
    });
    
    // 如果有需要刷新的fileID，批量获取临时URL
    if (fileIDsToRefresh.length > 0) {
      console.log(`需要刷新 ${fileIDsToRefresh.length} 个临时URL`);
      
      // 批量获取临时URL
      wx.cloud.getTempFileURL({
        fileList: fileIDsToRefresh,
        success: res => {
          console.log('批量获取临时URL成功:', res);
          let updateCount = 0;
          
          if (res.fileList && res.fileList.length > 0) {
            // 使用新获取的临时URL更新数据
            res.fileList.forEach(file => {
              if (!file.fileID || !file.tempFileURL) return;
              
              // 更新URL缓存
              this.updateURLCache(file.fileID, file.tempFileURL);
              
              // 根据fileID找到对应的图片并更新
              const fileInfo = fileIDMap[file.fileID];
              if (fileInfo) {
                if (fileInfo.type === 'preview') {
                  // 更新搭配预览图
                  outfits[fileInfo.outfitIndex].previewImage = file.tempFileURL;
                  updateCount++;
                  // 单独更新数据以提高效率
                  this.setData({
                    [`outfits[${fileInfo.outfitIndex}].previewImage`]: file.tempFileURL
                  });
                } else if (fileInfo.type === 'item') {
                  // 更新衣物图片
                  outfits[fileInfo.outfitIndex].items[fileInfo.itemIndex].imageUrl = file.tempFileURL;
                  updateCount++;
                  // 单独更新数据以提高效率
                  this.setData({
                    [`outfits[${fileInfo.outfitIndex}].items[${fileInfo.itemIndex}].imageUrl`]: file.tempFileURL
                  });
                }
              }
            });
          }
          
          if (updateCount > 0) {
            console.log(`已更新 ${updateCount} 个临时URL`);
          }
        },
        fail: err => {
          console.error('批量获取临时URL失败:', err);
        }
      });
    } else {
      console.log('所有临时URL均在有效期内，无需刷新');
    }
  },
  
  // 获取用户OpenID
  getUserOpenId: function() {
    const that = this;
    
    console.log('开始获取用户OpenID');
    
    // 设置加载状态
    wx.showLoading({
      title: '加载中...',
    });
    
    // 尝试从本地缓存获取OpenID
    const openid = wx.getStorageSync('openid');
    if (openid) {
      console.log('从本地存储获取到OpenID:', openid);
      that.setData({
        userOpenId: openid
      });
      
      // 获取搭配数据
      that.getOutfitsByCategory();
      return;
    }
    
    
    // 如果本地没有，则调用云函数获取
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('云函数获取到的openid:', res.result.openid);
        const openid = res.result.openid;
        
        if (openid) {
          // 存储OpenID到本地
          wx.setStorageSync('openid', openid);
          
          that.setData({
            userOpenId: openid
          });
          
          // 获取搭配数据
          that.getOutfitsByCategory();
        } else {
          console.error('云函数返回的openid为空');
          // 即使没有openid，也尝试获取搭配数据（可能是公共数据）
          that.getOutfitsByCategory();
        }
      },
      fail: err => {
        console.error('获取OpenID失败:', err);
        
        // 即使获取OpenID失败，也尝试获取搭配数据（可能是公共数据）
        that.getOutfitsByCategory();
      },
      complete: () => {
        // 不在这里隐藏loading，而是在获取搭配数据完成后隐藏
      }
    });
  },
  
  // 获取指定类别的搭配数据
  getOutfitsByCategory: function() {
    const that = this;
    
    // 设置加载状态
    that.setData({
      isLoading: true
    });
    
    console.log('开始获取真实搭配数据，类别:', that.data.category);
    
    // 从数据库获取搭配列表
    const db = wx.cloud.database();
    
    // 查询条件：用户的指定类别搭配
    const query = {
      category: that.data.category
    };
    
    // 如果有用户OpenID，添加到查询条件
    if (that.data.userOpenId) {
      query._openid = that.data.userOpenId;
    }
    
    console.log('查询条件:', query);
    
    // 获取搭配
    db.collection('outfits')
      .where(query)
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        console.log('获取搭配成功:', res.data);
        
        // 处理搭配数据
        let outfits = res.data || [];
        
        // 确保每个搭配都有id字段（兼容旧数据）
        outfits = outfits.map(outfit => {
          // 如果没有id字段，使用_id作为id
          if (!outfit.id && outfit._id) {
            outfit.id = outfit._id;
          }
          return outfit;
        });
        
        // 如果没有搭配数据，使用模拟数据
        if (outfits.length === 0) {
          console.log('没有真实搭配数据，使用模拟数据');
          that.useSimulatedData();
          return;
        }
        
        console.log('使用真实搭配数据，数量:', outfits.length);
        
        // 处理每个搭配中的衣物项数据
        const outfitPromises = outfits.map(outfit => {
          return new Promise((resolve) => {
            // 如果搭配没有衣物项或衣物项不是数组，初始化为空数组
            if (!outfit.items || !Array.isArray(outfit.items)) {
              outfit.items = [];
              resolve(outfit);
              return;
            }
            
            // 检查是否需要获取完整的衣物数据
            const needFetchClothes = outfit.items.some(item => 
              item.clothingId && (!item.name || !item.imageUrl)
            );
            
            if (needFetchClothes) {
              console.log(`搭配 ${outfit.id || outfit._id} 需要获取完整的衣物数据`);
              
              // 收集所有需要获取的衣物ID
              const clothingIds = outfit.items
                .filter(item => item.clothingId)
                .map(item => item.clothingId);
              
              if (clothingIds.length > 0) {
                // 获取衣物数据
                that.getClothesData(clothingIds)
                  .then(clothesData => {
                    // 更新衣物项数据
                    outfit.items = outfit.items.map(item => {
                      if (item.clothingId) {
                        const clothingData = clothesData.find(c => c._id === item.clothingId);
                        if (clothingData) {
                          // 合并衣物数据
                          return {
                            ...item,
                            name: item.name || clothingData.name,
                            type: item.type || clothingData.type || clothingData.category,
                            category: item.category || clothingData.category,
                            imageUrl: item.imageUrl || clothingData.imageUrl || clothingData.processedImageUrl || clothingData.imageFileID,
                            // 保存原始fileID用于后续刷新
                            imageFileID: item.imageFileID || clothingData.imageFileID || clothingData.imageUrl || null,
                            originalClothing: clothingData
                          };
                        }
                      }
                      return item;
                    });
                    
                    resolve(outfit);
                  })
                  .catch(err => {
                    console.error('获取衣物数据失败:', err);
                    resolve(outfit);
                  });
              } else {
                resolve(outfit);
              }
            } else {
              // 确保每个衣物项都有imageFileID字段，用于后续刷新URL
              outfit.items = outfit.items.map(item => {
                if (!item.imageFileID && item.imageUrl && item.imageUrl.includes('cloud://')) {
                  item.imageFileID = item.imageUrl;
                }
                return item;
              });
              resolve(outfit);
            }
          });
        });
        
        // 等待所有搭配的衣物数据处理完成
        Promise.all(outfitPromises)
          .then(processedOutfits => {
            // 收集所有需要获取临时URL的fileID
            const fileIDs = [];
            const fileIDMap = {}; // 用于跟踪fileID对应的位置
            
            // 收集搭配预览图的fileID
            processedOutfits.forEach((outfit, outfitIndex) => {
              // 检查多种可能的图片字段
              if (outfit.imageFileID && outfit.imageFileID.includes('cloud://')) {
                fileIDs.push(outfit.imageFileID);
                fileIDMap[outfit.imageFileID] = {type: 'preview', outfitIndex};
              } else if (outfit.previewImage && outfit.previewImage.includes('cloud://')) {
                fileIDs.push(outfit.previewImage);
                fileIDMap[outfit.previewImage] = {type: 'preview', outfitIndex};
              }
              
              // 收集搭配中每个衣物图片的fileID
              if (outfit.items && Array.isArray(outfit.items)) {
                outfit.items.forEach((item, itemIndex) => {
                  // 检查多种可能的图片字段
                  if (item.imageUrl && item.imageUrl.includes('cloud://')) {
                    fileIDs.push(item.imageUrl);
                    fileIDMap[item.imageUrl] = {type: 'item', outfitIndex, itemIndex};
                  } else if (item.imageFileID && item.imageFileID.includes('cloud://')) {
                    fileIDs.push(item.imageFileID);
                    fileIDMap[item.imageFileID] = {type: 'item', outfitIndex, itemIndex};
                  } else if (item.fileID && item.fileID.includes('cloud://')) {
                    fileIDs.push(item.fileID);
                    fileIDMap[item.fileID] = {type: 'item', outfitIndex, itemIndex};
                  }
                });
              }
            });
            
            // 过滤掉已经有缓存的fileID
            const filteredFileIDs = fileIDs.filter(fileID => {
              const cachedUrl = that.getURLFromCache(fileID);
              return !cachedUrl; // 如果没有缓存才需要获取
            });
            
            // 如果有需要获取临时URL的fileID
            if (filteredFileIDs.length > 0) {
              console.log('需要获取临时URL的文件数量:', filteredFileIDs.length);
              
              // 获取临时URL
              wx.cloud.getTempFileURL({
                fileList: filteredFileIDs,
                success: result => {
                  console.log('获取临时URL成功:', result);
                  
                  // 创建fileID到临时URL的映射
                  const fileIDToURL = {};
                  result.fileList.forEach(file => {
                    if (file.fileID && file.tempFileURL) {
                      fileIDToURL[file.fileID] = file.tempFileURL;
                      // 更新缓存
                      that.updateURLCache(file.fileID, file.tempFileURL);
                      
                      // 直接更新对应的图片URL
                      const fileInfo = fileIDMap[file.fileID];
                      if (fileInfo) {
                        if (fileInfo.type === 'preview') {
                          processedOutfits[fileInfo.outfitIndex].previewImage = file.tempFileURL;
                        } else if (fileInfo.type === 'item') {
                          processedOutfits[fileInfo.outfitIndex].items[fileInfo.itemIndex].imageUrl = file.tempFileURL;
                        }
                      }
                    }
                  });
                  
                  // 确保所有搭配和衣物都有图片URL
                  processedOutfits.forEach(outfit => {
                    // 确保有预览图，如果没有则使用默认图片
                    if (!outfit.previewImage) {
                      outfit.previewImage = that.getDefaultImage();
                    }
                    
                    // 确保每个衣物都有图片URL和名称
                    if (outfit.items && Array.isArray(outfit.items)) {
                      outfit.items.forEach(item => {
                        if (!item.imageUrl) {
                          item.imageUrl = that.getDefaultImage();
                        }
                        
                        // 确保有名称
                        if (!item.name && item.clothingName) {
                          item.name = item.clothingName;
                        } else if (!item.name) {
                          item.name = '未命名衣物';
                        }
                      });
                    }
                  });
                  
                  // 更新数据
                  that.setData({
                    outfits: processedOutfits,
                    isLoading: false
                  });
                  
                  console.log('真实搭配数据加载完成，并更新了图片URL');
                  wx.hideLoading();
                },
                fail: err => {
                  console.error('获取临时URL失败:', err);
                  
                  // 确保每个搭配和衣物都有图片URL
                  processedOutfits.forEach(outfit => {
                    // 确保有预览图，如果没有则使用默认图片
                    if (!outfit.previewImage || outfit.previewImage.includes('cloud://')) {
                      outfit.previewImage = that.getDefaultImage();
                    }
                    
                    // 确保每个衣物都有图片URL
                    if (outfit.items && Array.isArray(outfit.items)) {
                      outfit.items.forEach(item => {
                        if (!item.imageUrl || item.imageUrl.includes('cloud://') || 
                            item.imageFileID && item.imageFileID.includes('cloud://') ||
                            item.fileID && item.fileID.includes('cloud://')) {
                          item.imageUrl = that.getDefaultImage();
                        }
                        
                        // 确保有名称
                        if (!item.name && item.clothingName) {
                          item.name = item.clothingName;
                        } else if (!item.name) {
                          item.name = '未命名衣物';
                        }
                      });
                    }
                  });
                  
                  // 即使获取临时URL失败，也尝试显示搭配数据
                  that.setData({
                    outfits: processedOutfits,
                    isLoading: false
                  });
                  
                  console.log('真实搭配数据加载完成，但未能更新图片URL');
                  wx.hideLoading();
                }
              });
            } else {
              // 使用缓存中的URL更新数据
              processedOutfits.forEach(outfit => {
                // 更新搭配预览图URL
                if (outfit.imageFileID && outfit.imageFileID.includes('cloud://')) {
                  const cachedUrl = that.getURLFromCache(outfit.imageFileID);
                  if (cachedUrl) outfit.previewImage = cachedUrl;
                } else if (outfit.previewImage && outfit.previewImage.includes('cloud://')) {
                  const cachedUrl = that.getURLFromCache(outfit.previewImage);
                  if (cachedUrl) outfit.previewImage = cachedUrl;
                }
                
                // 确保有预览图，如果没有则使用默认图片
                if (!outfit.previewImage) {
                  outfit.previewImage = that.getDefaultImage();
                }
                
                // 更新搭配中每个衣物的图片URL
                if (outfit.items && Array.isArray(outfit.items)) {
                  outfit.items.forEach(item => {
                    let updatedUrl = null;
                    
                    // 检查多种可能的图片字段
                    if (item.imageUrl && item.imageUrl.includes('cloud://')) {
                      const cachedUrl = that.getURLFromCache(item.imageUrl);
                      if (cachedUrl) updatedUrl = cachedUrl;
                    } else if (item.imageFileID && item.imageFileID.includes('cloud://')) {
                      const cachedUrl = that.getURLFromCache(item.imageFileID);
                      if (cachedUrl) updatedUrl = cachedUrl;
                    } else if (item.fileID && item.fileID.includes('cloud://')) {
                      const cachedUrl = that.getURLFromCache(item.fileID);
                      if (cachedUrl) updatedUrl = cachedUrl;
                    }
                    
                    // 如果从缓存获取到了有效URL，则更新
                    if (updatedUrl) {
                      item.imageUrl = updatedUrl;
                    }
                    
                    // 确保有图片URL，如果没有则使用默认图片
                    if (!item.imageUrl) {
                      item.imageUrl = that.getDefaultImage();
                    }
                    
                    // 确保有名称
                    if (!item.name && item.clothingName) {
                      item.name = item.clothingName;
                    } else if (!item.name) {
                      item.name = '未命名衣物';
                    }
                  });
                }
              });
              
              // 如果没有需要获取临时URL的fileID，直接更新数据
              that.setData({
                outfits: processedOutfits,
                isLoading: false
              });
              
              console.log('真实搭配数据加载完成，使用缓存URL');
              wx.hideLoading();
            }
          });
      })
      .catch(err => {
        console.error('获取搭配失败:', err);
        
        // 只有在真实数据获取失败时才使用模拟数据
        console.log('获取真实数据失败，使用模拟数据');
        that.useSimulatedData();
        
        wx.hideLoading();
      });
  },
  
  // 获取衣物数据
  getClothesData: function(clothingIds) {
    return new Promise((resolve, reject) => {
      if (!clothingIds || !Array.isArray(clothingIds) || clothingIds.length === 0) {
        resolve([]);
        return;
      }
      
      console.log('获取衣物数据，ID数量:', clothingIds.length);
      
      const db = wx.cloud.database();
      const _ = db.command;
      
      // 查询条件：衣物ID在指定数组中
      db.collection('clothes')
        .where({
          _id: _.in(clothingIds)
        })
        .get()
        .then(res => {
          console.log('获取衣物数据成功:', res.data);
          resolve(res.data || []);
        })
        .catch(err => {
          console.error('获取衣物数据失败:', err);
          resolve([]);
        });
    });
  },
  
  // 获取默认图片URL
  getDefaultImage: function() {
    return 'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYJCibdIkjPtymh5xicSMN2u5yZlmIbp3icicVicYqA1CnNgwjcEJYJJhZmw/0?wx_fmt=jpeg';
  },
  
  // 处理图片加载错误
  handleImageError: function(e) {
    const type = e.currentTarget.dataset.type;
    const index = e.currentTarget.dataset.index;
    const itemIndex = e.currentTarget.dataset.itemIndex;
    
    console.log('图片加载错误:', type, index, itemIndex);
    
    // 获取默认图片
    const defaultImage = this.getDefaultImage();
    
    if (type === 'preview') {
      // 更新搭配预览图
      const outfits = this.data.outfits;
      if (outfits && outfits[index]) {
        // 检查是否有原始的云存储fileID
        const originalFileID = outfits[index].imageFileID || 
                              (outfits[index].previewImage && outfits[index].previewImage.includes('cloud://') ? 
                               outfits[index].previewImage : null);
        
        if (originalFileID) {
          // 如果有原始fileID，尝试重新获取临时URL
          console.log(`尝试重新获取搭配预览图临时URL, fileID: ${originalFileID}`);
          this.refreshTempFileURL(originalFileID, (newUrl) => {
            if (newUrl) {
              // 更新成功
              outfits[index].previewImage = newUrl;
              this.setData({
                outfits: outfits
              });
              console.log('已更新搭配预览图URL');
            } else {
              // 更新失败，使用默认图片
              outfits[index].previewImage = defaultImage;
              this.setData({
                outfits: outfits
              });
              console.log('无法获取新的临时URL，已使用默认图片');
            }
          });
        } else {
          // 没有原始fileID，直接使用默认图片
          outfits[index].previewImage = defaultImage;
          this.setData({
            outfits: outfits
          });
          console.log('已更新搭配预览图为默认图片');
        }
      }
    } else if (type === 'item') {
      // 更新衣物图片
      const outfits = this.data.outfits;
      if (outfits && outfits[index] && outfits[index].items) {
        // 如果提供了itemIndex，直接使用
        if (itemIndex !== undefined && outfits[index].items[itemIndex]) {
          const item = outfits[index].items[itemIndex];
          // 检查是否有原始的云存储fileID
          const originalFileID = item.imageFileID || 
                                item.fileID || 
                                (item.imageUrl && item.imageUrl.includes('cloud://') ? 
                                 item.imageUrl : null);
          
          if (originalFileID) {
            // 如果有原始fileID，尝试重新获取临时URL
            console.log(`尝试重新获取衣物图片临时URL, fileID: ${originalFileID}`);
            this.refreshTempFileURL(originalFileID, (newUrl) => {
              if (newUrl) {
                // 更新成功
                outfits[index].items[itemIndex].imageUrl = newUrl;
                // 强制刷新页面数据，确保视图更新
                this.setData({
                  [`outfits[${index}].items[${itemIndex}].imageUrl`]: newUrl
                });
                console.log(`已更新搭配 ${index} 中的衣物项 ${itemIndex} 的图片URL`);
              } else {
                // 更新失败，使用默认图片
                outfits[index].items[itemIndex].imageUrl = defaultImage;
                // 强制刷新页面数据，确保视图更新
                this.setData({
                  [`outfits[${index}].items[${itemIndex}].imageUrl`]: defaultImage
                });
                console.log(`无法获取新的临时URL，已使用默认图片`);
              }
            });
          } else {
            // 没有原始fileID，直接使用默认图片
            outfits[index].items[itemIndex].imageUrl = defaultImage;
            // 强制刷新页面数据，确保视图更新
            this.setData({
              [`outfits[${index}].items[${itemIndex}].imageUrl`]: defaultImage
            });
            console.log(`已更新搭配 ${index} 中的衣物项 ${itemIndex} 的图片为默认图片`);
          }
        } else {
          // 尝试查找所有衣物项中可能的错误图片
          console.log(`尝试更新搭配 ${index} 中的所有衣物项图片`);
          let updated = false;
          
          outfits[index].items.forEach((item, idx) => {
            if (!item.imageUrl || item.imageUrl === '') {
              outfits[index].items[idx].imageUrl = defaultImage;
              updated = true;
            }
          });
          
          if (updated) {
            this.setData({
              outfits: outfits
            });
            console.log('已更新衣物图片');
          }
        }
      }
    }
  },
  
  // 刷新临时文件URL（优化版，支持重试和缓存）
  refreshTempFileURL: function(fileID, callback, retryCount = 0) {
    if (!fileID || !fileID.includes('cloud://')) {
      console.error('无效的fileID:', fileID);
      callback(null);
      return;
    }
    
    // 清除可能已过期的缓存
    const app = getApp();
    if (app.globalData && app.globalData.urlCache && app.globalData.urlCache[fileID]) {
      const cachedData = app.globalData.urlCache[fileID];
      const now = Date.now();
      // 如果缓存超过8分钟，则认为已过期
      if (now - cachedData.timestamp > 480000) { // 8分钟
        console.log(`缓存的URL已过期，强制刷新: ${fileID}`);
        delete app.globalData.urlCache[fileID]; // 删除已过期的缓存
      }
    }
    
    // 检查缓存（经过上一步处理，此处只会获取有效缓存）
    const cachedUrl = this.getURLFromCache(fileID);
    if (cachedUrl) {
      console.log(`使用缓存的临时URL: ${fileID}`);
      callback(cachedUrl);
      return;
    }
    
    console.log('正在刷新临时文件URL, fileID:', fileID);
    
    // 直接调用云函数获取最新临时URL
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: res => {
        console.log('刷新临时URL成功:', res);
        if (res.fileList && res.fileList.length > 0 && res.fileList[0].tempFileURL) {
          const newUrl = res.fileList[0].tempFileURL;
          
          // 更新缓存
          this.updateURLCache(fileID, newUrl);
          
          // 返回新的URL
          callback(newUrl);
        } else {
          console.error('获取临时URL成功，但返回结果无效');
          // 如果重试次数小于2，则进行重试
          if (retryCount < 2) {
            console.log(`尝试第${retryCount + 1}次重试获取临时URL`);
            setTimeout(() => {
              this.refreshTempFileURL(fileID, callback, retryCount + 1);
            }, 1000); // 延迟1秒后重试
          } else {
            callback(null);
          }
        }
      },
      fail: err => {
        console.error('刷新临时URL失败:', err);
        // 如果重试次数小于2，则进行重试
        if (retryCount < 2) {
          console.log(`尝试第${retryCount + 1}次重试获取临时URL`);
          setTimeout(() => {
            this.refreshTempFileURL(fileID, callback, retryCount + 1);
          }, 1000); // 延迟1秒后重试
        } else {
          callback(null);
        }
      }
    });
  },
  
  // 使用模拟数据（当无法获取真实数据时）
  useSimulatedData: function() {
    console.log('使用模拟数据');
    
    // 提示用户正在使用模拟数据
    wx.showToast({
      title: '使用示例数据',
      icon: 'none',
      duration: 2000
    });
    
    // 生成模拟搭配数据
    const simulatedOutfits = this.generateSimulatedOutfits();
    
    // 筛选当前类别的搭配
    const outfits = simulatedOutfits.filter(outfit => outfit.category === this.data.category);
    
    // 更新数据
    this.setData({
      outfits,
      isLoading: false
    });
    
    console.log('模拟数据加载完成，类别:', this.data.category, '数量:', outfits.length);
  },
  
  // 生成模拟搭配数据
  generateSimulatedOutfits: function() {
    // 模拟衣物图片 - 使用更可靠的图片源
    const mockImages = [
      'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYJCibdIkjPtymh5xicSMN2u5yZlmIbp3icicVicYqA1CnNgwjcEJYJJhZmw/0?wx_fmt=jpeg',
      'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYdpRPwIjnicia3ZKBGhTIGAcbYgNwIoLXBDKkNXMmkGNgGzOvMJyJH0A/0?wx_fmt=jpeg',
      'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYCDgTSCOJBUg5QgAIKpZBCBGcNH7yrM7NJnpLqMvWzPFTGDKqdZKSg/0?wx_fmt=jpeg',
      'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYCDgTSCOJBUg5QgAIKpZBCBGcNH7yrM7NJnpLqMvWzPFTGDKqdZKSg/0?wx_fmt=jpeg',
      'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYJCibdIkjPtymh5xicSMN2u5yZlmIbp3icicVicYqA1CnNgwjcEJYJJhZmw/0?wx_fmt=jpeg'
    ];
    
    // 模拟搭配预览图
    const mockPreviewImages = [
      'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYJCibdIkjPtymh5xicSMN2u5yZlmIbp3icicVicYqA1CnNgwjcEJYJJhZmw/0?wx_fmt=jpeg',
      'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYdpRPwIjnicia3ZKBGhTIGAcbYgNwIoLXBDKkNXMmkGNgGzOvMJyJH0A/0?wx_fmt=jpeg',
      'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYCDgTSCOJBUg5QgAIKpZBCBGcNH7yrM7NJnpLqMvWzPFTGDKqdZKSg/0?wx_fmt=jpeg',
      'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYJCibdIkjPtymh5xicSMN2u5yZlmIbp3icicVicYqA1CnNgwjcEJYJJhZmw/0?wx_fmt=jpeg',
      'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYdpRPwIjnicia3ZKBGhTIGAcbYgNwIoLXBDKkNXMmkGNgGzOvMJyJH0A/0?wx_fmt=jpeg',
      'https://mmbiz.qpic.cn/mmbiz_jpg/UicQ7HgWiaUb3Zib1Zia9PmHLpKhZKiaZhsGYCDgTSCOJBUg5QgAIKpZBCBGcNH7yrM7NJnpLqMvWzPFTGDKqdZKSg/0?wx_fmt=jpeg'
    ];
    
    // 生成模拟搭配
    return [
      {
        id: 'daily-1',
        _id: 'daily-1',
        name: '休闲日常搭配',
        category: 'daily',
        previewImage: mockPreviewImages[0],
        items: [
          { id: 'd1', name: '白色T恤', imageUrl: mockImages[0] },
          { id: 'd2', name: '牛仔裤', imageUrl: mockImages[1] },
          { id: 'd3', name: '运动鞋', imageUrl: mockImages[2] }
        ],
        createTime: new Date('2023-03-01').getTime()
      },
      {
        id: 'daily-2',
        _id: 'daily-2',
        name: '舒适居家搭配',
        category: 'daily',
        previewImage: mockPreviewImages[1],
        items: [
          { id: 'd4', name: '卫衣', imageUrl: mockImages[3] },
          { id: 'd5', name: '休闲裤', imageUrl: mockImages[4] },
          { id: 'd6', name: '拖鞋', imageUrl: mockImages[0] }
        ],
        createTime: new Date('2023-03-02').getTime()
      },
      {
        id: 'work-1',
        _id: 'work-1',
        name: '商务正装',
        category: 'work',
        previewImage: mockPreviewImages[2],
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
        _id: 'party-1',
        name: '派对时尚',
        category: 'party',
        previewImage: mockPreviewImages[3],
        items: [
          { id: 'p1', name: '亮片上衣', imageUrl: mockImages[0] },
          { id: 'p2', name: '紧身裤', imageUrl: mockImages[1] },
          { id: 'p3', name: '高跟鞋', imageUrl: mockImages[2] }
        ],
        createTime: new Date('2023-03-04').getTime()
      },
      {
        id: 'sport-1',
        _id: 'sport-1',
        name: '运动健身',
        category: 'sport',
        previewImage: mockPreviewImages[4],
        items: [
          { id: 's1', name: '运动T恤', imageUrl: mockImages[3] },
          { id: 's2', name: '运动短裤', imageUrl: mockImages[4] },
          { id: 's3', name: '运动鞋', imageUrl: mockImages[0] }
        ],
        createTime: new Date('2023-03-05').getTime()
      },
      {
        id: 'seasonal-1',
        _id: 'seasonal-1',
        name: '春季出行',
        category: 'seasonal',
        previewImage: mockPreviewImages[5],
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
  
  // 格式化日期
  formatDate: function(timestamp) {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    return `${year}.${month}.${day}`;
  },
  
  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  },
  
  // 跳转到创建搭配页面
  goToCreateOutfit: function() {
    wx.navigateTo({
      url: '../outfit_create/outfit_create?category=' + this.data.category
    });
  },
  
  // 查看搭配详情
  viewOutfitDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    console.log('查看搭配详情:', id);
    
    if (!id) {
      console.error('搭配ID不存在');
      wx.showToast({
        title: '无法查看搭配详情',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    // 显示加载提示
    wx.showLoading({
      title: '加载中...',
      mask: true // 使用mask防止用户触摸屏幕
    });
    
    // 跳转到搭配详情页面
    wx.navigateTo({
      url: `../outfit_detail/outfit_detail?id=${id}`,
      success: function() {
        console.log('导航到搭配详情页面成功');
        // 不在这里隐藏loading，而是在详情页面加载完成后隐藏
      },
      fail: function(error) {
        console.error('导航到搭配详情页面失败:', error);
        
        // 隐藏加载提示
        wx.hideLoading();
        
        // 尝试使用完整路径
        wx.navigateTo({
          url: `/miniprogram/page/wardrobe/outfit/outfit_detail/outfit_detail?id=${id}`,
          success: function() {
            console.log('使用完整路径导航成功');
            // 不在这里隐藏loading，而是在详情页面加载完成后隐藏
          },
          fail: function(err) {
            console.error('使用完整路径导航也失败:', err);
            
            // 隐藏加载提示
            wx.hideLoading();
            
            wx.showToast({
              title: '无法打开搭配详情',
              icon: 'none',
              duration: 2000
            });
          }
        });
      }
    });
  }
}); 

// 处理图片加载错误
