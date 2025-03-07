// page/wardrobe/outfit/outfit_create/outfit_create.js
const colors = require('../../../../util/colors');

// 导入模块
const userManager = require('./modules/userManager');
const clothesManager = require('./modules/clothesManager');
const imageManager = require('./modules/imageManager');
const canvasManager = require('./modules/canvasManager');
const outfitManager = require('./modules/outfitManager');

Page({
  data: {
    // 风格切换设置
    themeStyle: 'autumn', // 默认为秋季风格，可选值：'autumn'或'pinkBlue'
    
    // 使用全局颜色配置
    colors: {
      darkBrown: "#442D1C",     // 深棕色 Cowhide Cocoa
      spicedWine: "#74301C",    // 红棕色 Spiced Wine
      toastedCaramel: "#84592B", // 焦糖色 Toasted Caramel
      oliveHarvest: "#9D9167",   // 橄榄色 Olive Harvest
      goldenBatter: "#E8D1A7",   // 金黄色 Golden Batter
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
    
    // 衣物数据
    clothes: [],                // 所有衣物
    filteredClothes: [],        // 按类别筛选后的衣物
    currentCategory: null,      // 当前选中的类别
    userOpenId: '',             // 用户openid
    
    // 画布相关
    canvasItems: [],            // 画布上的衣物项
    canvasWidth: 600,           // 画布宽度
    canvasHeight: 800,          // 画布高度
    activeItemId: null,         // 当前选中的画布项目ID
    
    // 触摸状态
    touchStartX: 0,             // 触摸开始的X坐标
    touchStartY: 0,             // 触摸开始的Y坐标
    itemStartX: 0,              // 项目触摸开始时的X位置
    itemStartY: 0,              // 项目触摸开始时的Y位置
    isMoving: false,            // 是否正在移动
    nextId: 1,                  // 下一个画布项的ID
    
    // 页面状态
    isLoading: true,            // 是否正在加载
    isSaving: false,            // 是否正在保存
    outfitName: "我的搭配",      // 搭配名称
    
    // 穿搭类型选择
    outfitCategory: 'daily',    // 默认为日常穿搭
    outfitCategoryOptions: [    // 穿搭类型选项
      { value: 'daily', name: '日常穿搭', icon: '👕' },
      { value: 'work', name: '职业穿搭', icon: '👔' },
      { value: 'party', name: '派对穿搭', icon: '👗' },
      { value: 'sport', name: '运动穿搭', icon: '🏃' },
      { value: 'seasonal', name: '季节穿搭', icon: '🍂' }
    ],
    showCategoryPicker: false,  // 是否显示类型选择器
    currentCategoryIcon: '👕',   // 当前选中的类型图标
    currentCategoryName: '日常穿搭', // 当前选中的类型名称
    
    // 定义衣物类别
    categories: [
      { id: 0, name: '全部', icon: '全', count: 0 },
      { id: 1, name: '上衣', icon: '上', count: 0, category: '上衣' },
      { id: 2, name: '裤子', icon: '裤', count: 0, category: '裤子' },
      { id: 3, name: '裙子', icon: '裙', count: 0, category: '裙子' },
      { id: 4, name: '外套', icon: '外', count: 0, category: '外套' },
      { id: 5, name: '鞋子', icon: '鞋', count: 0, category: '鞋子' },
      { id: 6, name: '配饰', icon: '饰', count: 0, category: '配饰' }
    ],
    
    // 左侧面板相关
    closetPanelWidth: 0,         // 左侧面板宽度
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
    
    // 检查是否有传入的穿搭类型
    if (options && options.category) {
      // 检查传入的类型是否有效
      const validCategory = this.data.outfitCategoryOptions.some(option => option.value === options.category);
      if (validCategory) {
        this.setData({
          outfitCategory: options.category
        });
        
        // 根据类型设置默认搭配名称
        const categoryOption = this.data.outfitCategoryOptions.find(option => option.value === options.category);
        if (categoryOption) {
          this.setData({
            outfitName: `我的${categoryOption.name}`
          });
        }
      }
    }
    
    // 获取屏幕尺寸来设置画布大小
    const systemInfo = wx.getSystemInfoSync();
    const canvasWidth = systemInfo.windowWidth * 0.9; // 90%屏幕宽度
    const canvasHeight = systemInfo.windowHeight * 0.6; // 60%屏幕高度
    
    // 计算左侧面板宽度，用于优化分类布局
    const closetPanelWidth = systemInfo.windowWidth * 0.4; // 40%屏幕宽度
    
    this.setData({
      canvasWidth,
      canvasHeight,
      closetPanelWidth,
      // 默认不选择任何类别，显示全部衣物
      currentCategory: null
    });
    
    console.log('页面初始化完成，屏幕宽度:', systemInfo.windowWidth, '左侧面板宽度:', closetPanelWidth);
    
    // 获取用户OpenID并加载衣物
    this.getUserOpenIdAndLoadClothes();
    
    // 更新当前类型信息
    this.updateCurrentCategoryInfo();
  },
  
  // 获取用户OpenID并加载衣物数据
  getUserOpenIdAndLoadClothes: function() {
    wx.showLoading({
      title: '加载中...',
    });
    
    userManager.getUserOpenId()
      .then(openid => {
        console.log('成功获取用户OpenID:', openid);
        this.setData({
          userOpenId: openid
        });
        
        // 加载衣物数据
        return this.loadUserClothes(openid);
      })
      .catch(err => {
        console.error('获取OpenID失败:', err);
        this.useTestData();
        wx.hideLoading();
      });
  },
  
  // 加载用户衣物数据
  loadUserClothes: function(openid) {
    clothesManager.loadClothes(openid)
      .then(result => {
        console.log('成功获取衣物数据:', result);
        const { clothes, categoryData } = result;
        
        // 更新类别数量
        const updatedCategories = clothesManager.updateCategoryCounts(
          categoryData, 
          this.data.categories
        );
        
        this.setData({
          clothes,
          filteredClothes: clothes,
          categories: updatedCategories,
          isLoading: false
        });
        
        // 获取临时图片URL
        return imageManager.getClothesImageUrls(clothes);
      })
      .then(updatedClothes => {
        console.log('成功获取临时URL');
        
        this.setData({
          clothes: updatedClothes,
          filteredClothes: clothesManager.filterByCategory(
            updatedClothes,
            this.data.currentCategory
          )
        });
        
        wx.hideLoading();
      })
      .catch(err => {
        console.error('加载衣物失败:', err);
        this.useTestData();
        wx.hideLoading();
      });
  },
  
  // 使用测试数据
  useTestData: function() {
    const testClothes = clothesManager.generateTestClothes();
    
    // 更新类别数量
    const updatedCategories = clothesManager.updateCategoryCounts(
      testClothes, 
      this.data.categories
    );
    
    this.setData({
      clothes: testClothes,
      filteredClothes: testClothes,
      categories: updatedCategories,
      isLoading: false
    });
    
    wx.showToast({
      title: '使用测试数据',
      icon: 'none'
    });
  },
  
  // 根据类别筛选衣物
  filterByCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    console.log('筛选类别:', category);
    
    // 如果点击的是当前已选中的类别，则取消选择（显示全部）
    if (this.data.currentCategory === category) {
      this.setData({
        currentCategory: null
      });
      
      const filteredClothes = clothesManager.filterByCategory(
        this.data.clothes, 
        null
      );
      
      this.setData({
        filteredClothes
      });
      
      console.log('取消类别筛选，显示全部衣物');
      return;
    }
    
    // 设置当前选中的类别
    this.setData({
      currentCategory: category
    });
    
    // 使用clothesManager筛选衣物
    const filteredClothes = clothesManager.filterByCategory(
      this.data.clothes, 
      category
    );
    
    // 更新筛选后的衣物列表
    this.setData({
      filteredClothes
    });
    
    // 如果筛选后没有衣物，显示提示
    if (filteredClothes.length === 0) {
      wx.showToast({
        title: '该类别暂无衣物',
        icon: 'none',
        duration: 1500
      });
    }
  },
  
  // 将衣物添加到画布
  addToCanvas: function(e) {
    const clothingId = e.currentTarget.dataset.id;
    const item = this.data.filteredClothes.find(item => item._id === clothingId);
    
    if (!item) {
      console.error('未找到ID为', clothingId, '的衣物');
      wx.showToast({
        title: '未找到该衣物',
        icon: 'none'
      });
      return;
    }
    
    console.log('添加衣物到画布:', item);
    
    // 验证图片URL
    let validImageUrl = item.tempImageUrl;
    
    // 如果没有tempImageUrl，尝试其他可能的图片URL字段
    if (!validImageUrl) {
      validImageUrl = item.processedImageUrl || item.imageUrl || 
                     (item.originalData && item.originalData.imageUrl);
      
      // 确保URL是http或https开头的
      if (validImageUrl && !(validImageUrl.startsWith('http') || validImageUrl.startsWith('https'))) {
        validImageUrl = null;
      }
    }
    
    if (!validImageUrl) {
      console.error('衣物缺少有效的图片URL:', item);
      wx.showToast({
        title: '衣物图片加载失败',
        icon: 'none'
      });
      
      // 尝试重新获取图片URL
      this.refreshImageUrl(item)
        .then(updatedItem => {
          if (updatedItem && updatedItem.tempImageUrl) {
            // 更新衣物列表中的项
            const updatedClothes = this.data.clothes.map(c => 
              c._id === updatedItem._id ? updatedItem : c
            );
            
            const updatedFilteredClothes = this.data.filteredClothes.map(c => 
              c._id === updatedItem._id ? updatedItem : c
            );
            
            this.setData({
              clothes: updatedClothes,
              filteredClothes: updatedFilteredClothes
            });
            
            // 重新尝试添加到画布
            wx.showToast({
              title: '已更新图片，请重试',
              icon: 'none'
            });
          }
        })
        .catch(err => {
          console.error('刷新图片URL失败:', err);
        });
      
      return;
    }
    
    // 创建画布项
    const canvasItem = canvasManager.createCanvasItem(
      item,
      this.data.nextId,
      this.data.canvasItems.length + 1,
      this.data.canvasWidth,
      this.data.canvasHeight
    );
    
    if (!canvasItem) {
      wx.showToast({
        title: '添加到画布失败',
        icon: 'none'
      });
      return;
    }
    
    // 取消其他项目的活跃状态
    const updatedCanvasItems = canvasManager.updateItemsActiveState(
      this.data.canvasItems,
      null
    );
    
    // 添加新项目并设置为活跃状态
    this.setData({
      canvasItems: [...updatedCanvasItems, canvasItem],
      nextId: this.data.nextId + 1,
      activeItemId: canvasItem.id
    });
    
    // 显示成功提示
    wx.showToast({
      title: '已添加到画布',
      icon: 'success',
      duration: 1000
    });
  },
  
  // 刷新单个衣物的图片URL
  refreshImageUrl: function(item) {
    return new Promise((resolve, reject) => {
      if (!item || !item._id) {
        reject(new Error('无效的衣物数据'));
        return;
      }
      
      // 收集所有可能的文件ID
      const fileIDs = [];
      if (item.processedImageUrl && item.processedImageUrl.startsWith('cloud://')) {
        fileIDs.push(item.processedImageUrl);
      }
      if (item.imageFileID && item.imageFileID.startsWith('cloud://')) {
        fileIDs.push(item.imageFileID);
      }
      if (item.fileID && item.fileID.startsWith('cloud://')) {
        fileIDs.push(item.fileID);
      }
      
      if (fileIDs.length === 0) {
        console.warn('衣物没有有效的云存储文件ID:', item._id);
        resolve(item);
        return;
      }
      
      wx.cloud.getTempFileURL({
        fileList: fileIDs,
        success: res => {
          const fileList = res.fileList || [];
          
          if (fileList.length > 0 && fileList[0].tempFileURL) {
            item.tempImageUrl = fileList[0].tempFileURL;
            console.log(`已刷新 ${item._id} 的临时URL:`, item.tempImageUrl);
            resolve(item);
          } else {
            console.warn(`未能获取到 ${item._id} 的临时URL`);
            resolve(item);
          }
        },
        fail: err => {
          console.error('获取临时文件URL失败:', err);
          resolve(item);
        }
      });
    });
  },
  
  // 画布点击事件
  canvasTap: function(e) {
    console.log('画布点击');
    
    // 检查是否点击的是控制按钮
    if (e.target && e.target.dataset && e.target.dataset.action) {
      console.log('点击的是控制按钮，不处理画布点击');
      return;
    }
    
    // 取消所有项目选中状态
    const updatedCanvasItems = canvasManager.updateItemsActiveState(
      this.data.canvasItems,
      null
    );
    
    this.setData({
      canvasItems: updatedCanvasItems,
      activeItemId: null
    });
  },
  
  // 项目点击事件
  itemTap: function(e) {
    // 阻止事件冒泡
    e.stopPropagation && e.stopPropagation();
    
    const id = parseInt(e.currentTarget.dataset.id);
    console.log('项目点击:', id);
    
    // 更新项目激活状态
    const updatedCanvasItems = canvasManager.updateItemsActiveState(
      this.data.canvasItems,
      id
    );
    
    this.setData({
      canvasItems: updatedCanvasItems,
      activeItemId: id
    });
    
    // 显示轻微振动反馈
    wx.vibrateShort && wx.vibrateShort({
      type: 'light'
    });
    
    // 返回false阻止事件冒泡
    return false;
  },
  
  // 项目触摸开始
  itemTouchStart: function(e) {
    // 阻止事件冒泡
    e.stopPropagation && e.stopPropagation();
    
    const id = parseInt(e.currentTarget.dataset.id);
    console.log('触摸开始:', id);
    
    const item = this.data.canvasItems.find(item => item.id === id);
    
    if (!item) {
      console.error('未找到ID为', id, '的项目');
      return;
    }
    
    // 将该项目设为活跃，其他项目设为非活跃
    const updatedCanvasItems = canvasManager.updateItemsActiveState(
      this.data.canvasItems,
      id
    );
    
    // 记录触摸起始位置和项目起始位置
    this.setData({
      canvasItems: updatedCanvasItems,
      activeItemId: id,
      touchStartX: e.touches[0].clientX,
      touchStartY: e.touches[0].clientY,
      itemStartX: item.x,
      itemStartY: item.y,
      isMoving: true
    });
    
    // 返回false阻止事件冒泡
    return false;
  },
  
  // 项目触摸移动
  itemTouchMove: function(e) {
    // 阻止事件冒泡
    e.stopPropagation && e.stopPropagation();
    
    // 如果不是移动状态或没有活跃项目，则不处理
    if (!this.data.isMoving || !this.data.activeItemId) {
      return;
    }
    
    // 计算移动距离
    const moveX = e.touches[0].clientX - this.data.touchStartX;
    const moveY = e.touches[0].clientY - this.data.touchStartY;
    
    // 获取活跃项目
    const activeItem = this.data.canvasItems.find(item => item.id === this.data.activeItemId);
    
    if (!activeItem) {
      console.error('未找到活跃项目');
      return;
    }
    
    // 计算新位置，确保不超出画布边界
    const newPosition = canvasManager.calculateNewPosition(
      this.data.itemStartX,
      this.data.itemStartY,
      moveX,
      moveY,
      activeItem.width,
      activeItem.height,
      this.data.canvasWidth,
      this.data.canvasHeight
    );
    
    // 更新项目位置
    const updatedCanvasItems = this.data.canvasItems.map(item => {
      if (item.id === this.data.activeItemId) {
        return {
          ...item,
          x: newPosition.x,
          y: newPosition.y
        };
      }
      return item;
    });
    
    this.setData({
      canvasItems: updatedCanvasItems
    });
    
    // 返回false阻止事件冒泡
    return false;
  },
  
  // 项目触摸结束
  itemTouchEnd: function(e) {
    // 阻止事件冒泡
    e.stopPropagation && e.stopPropagation();
    
    console.log('触摸结束');
    
    // 如果有移动，则结束移动状态
    if (this.data.isMoving) {
      this.setData({
        isMoving: false
      });
      
      // 记录当前画布状态，便于调试
      this.debugCanvasItems();
    }
    
    // 返回false阻止事件冒泡
    return false;
  },
  
  // 删除项目
  deleteItem: function(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    console.log('删除项目:', id);
    
    // 确认是否删除
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该衣物吗？',
      success: (res) => {
        if (res.confirm) {
          const updatedCanvasItems = this.data.canvasItems.filter(item => item.id !== id);
          
          this.setData({
            canvasItems: updatedCanvasItems,
            activeItemId: null
          });
          
          wx.showToast({
            title: '已删除',
            icon: 'success',
            duration: 1000
          });
        }
      }
    });
    
    // 阻止冒泡
    //e.stopPropagation();
  },
  
  // 调整项目大小
  resizeItem: function(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    const direction = e.currentTarget.dataset.direction;
    console.log('调整大小:', id, direction);
    
    const item = this.data.canvasItems.find(item => item.id === id);
    
    if (!item) {
      console.error('未找到ID为', id, '的项目');
      return;
    }
    
    // 计算新尺寸
    const newSize = canvasManager.calculateNewSize(
      item.width,
      item.height,
      direction,
      this.data.canvasWidth,
      this.data.canvasHeight
    );
    
    console.log('新尺寸:', newSize);
    
    // 更新项目尺寸
    const updatedCanvasItems = this.data.canvasItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          width: newSize.width,
          height: newSize.height
        };
      }
      return item;
    });
    
    this.setData({
      canvasItems: updatedCanvasItems
    });
    
    // 阻止冒泡
    //e.stopPropagation();
  },
  
  // 旋转项目
  rotateItem: function(e) {
    const id = parseInt(e.currentTarget.dataset.id);
    const direction = e.currentTarget.dataset.direction;
    console.log('旋转项目:', id, direction);
    
    const item = this.data.canvasItems.find(item => item.id === id);
    
    if (!item) {
      console.error('未找到ID为', id, '的项目');
      return;
    }
    
    // 计算新旋转角度
    const newRotation = canvasManager.calculateNewRotation(
      item.rotation || 0,
      direction
    );
    
    console.log('新旋转角度:', newRotation);
    
    // 更新项目旋转角度
    const updatedCanvasItems = this.data.canvasItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          rotation: newRotation
        };
      }
      return item;
    });
    
    this.setData({
      canvasItems: updatedCanvasItems
    });
    
    // 阻止冒泡
    //e.stopPropagation();
  },
  
  // 更新搭配名称
  updateOutfitName: function(e) {
    this.setData({
      outfitName: e.detail.value
    });
  },
  
  // 切换穿搭类型选择器显示状态
  toggleCategoryPicker: function() {
    this.setData({
      showCategoryPicker: !this.data.showCategoryPicker
    });
  },
  
  // 选择穿搭类型
  selectCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    
    // 获取类型名称
    const categoryOption = this.data.outfitCategoryOptions.find(option => option.value === category);
    let newOutfitName = this.data.outfitName;
    
    // 如果搭配名称是默认的或者包含其他类型名称，则更新为新类型
    if (this.data.outfitName === '我的搭配' || 
        this.data.outfitCategoryOptions.some(option => 
          this.data.outfitName === `我的${option.name}`)) {
      newOutfitName = `我的${categoryOption.name}`;
    }
    
    this.setData({
      outfitCategory: category,
      outfitName: newOutfitName,
      showCategoryPicker: false
    });
    
    // 更新当前类型信息
    this.updateCurrentCategoryInfo();
    
    // 提供触觉反馈
    wx.vibrateShort && wx.vibrateShort({
      type: 'light'
    });
  },
  
  // 更新当前类型信息
  updateCurrentCategoryInfo: function() {
    const categoryOption = this.data.outfitCategoryOptions.find(option => 
      option.value === this.data.outfitCategory
    );
    
    if (categoryOption) {
      this.setData({
        currentCategoryIcon: categoryOption.icon,
        currentCategoryName: categoryOption.name
      });
    }
  },
  
  // 清空画布
  clearCanvas: function() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空当前画布吗？',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            canvasItems: [],
            activeItemId: null
          });
        }
      }
    });
  },
  
  // 保存搭配
  saveOutfit: function() {
    if (this.data.canvasItems.length === 0) {
      wx.showToast({
        title: '画布为空，无法保存',
        icon: 'none'
      });
      return;
    }
    
    if (this.data.isSaving) {
      return;
    }
    
    this.setData({
      isSaving: true
    });
    
    wx.showLoading({
      title: '保存中...',
    });
    
    // 将画布转为图片
    outfitManager.generateOutfitImage(
      'outfitCanvas',
      this.data.canvasItems,
      this.data.canvasWidth,
      this.data.canvasHeight
    )
      .then(imageFileID => {
        console.log('搭配图片已保存:', imageFileID);
        
        // 保存搭配数据到数据库
        return outfitManager.saveOutfitToDatabase(
          this.data.outfitName,
          imageFileID,
          this.data.canvasItems,
          this.data.outfitCategory // 传递穿搭类型
        );
      })
      .then(() => {
        wx.hideLoading();
        this.setData({
          isSaving: false
        });
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        // 延迟后返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 1500);
      })
      .catch(err => {
        console.error('保存搭配失败:', err);
        wx.hideLoading();
        this.setData({
          isSaving: false
        });
        
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      });
  },
  
  // 返回上一页
  goBack: function() {
    // 如果有未保存的搭配，提示用户
    if (this.data.canvasItems.length > 0) {
      wx.showModal({
        title: '提示',
        content: '你有未保存的搭配，确定要返回吗？',
        success: (res) => {
          if (res.confirm) {
            wx.navigateBack();
          }
        }
      });
    } else {
      wx.navigateBack();
    }
  },
  
  // 调试画布项目状态
  debugCanvasItems: function() {
    console.group('画布项目状态');
    console.log('画布项目数量:', this.data.canvasItems.length);
    console.log('当前活跃项目ID:', this.data.activeItemId);
    
    this.data.canvasItems.forEach((item, index) => {
      console.log(`项目 ${index + 1}:`, {
        id: item.id,
        active: item.active,
        position: `(${Math.round(item.x)}, ${Math.round(item.y)})`,
        size: `${Math.round(item.width)} x ${Math.round(item.height)}`,
        rotation: item.rotation || 0,
        imageUrl: item.imageUrl ? (item.imageUrl.substring(0, 30) + '...') : 'null'
      });
    });
    
    console.groupEnd();
  },
  
  // 在页面显示时调试画布状态
  onShow: function() {
    // 延迟执行，确保数据已加载
    setTimeout(() => {
      this.debugCanvasItems();
    }, 1000);
  },
  
  // 处理控制按钮点击
  handleControlBtnTap: function(e) {
    // 阻止事件冒泡
    e.stopPropagation && e.stopPropagation();
    
    const id = parseInt(e.currentTarget.dataset.id);
    const action = e.currentTarget.dataset.action;
    
    console.log('控制按钮点击:', action, '项目ID:', id);
    
    // 根据action执行相应操作
    switch(action) {
      case 'delete':
        this.handleDeleteItem(id);
        break;
      case 'increase':
        this.handleResizeItem(id, 'increase');
        break;
      case 'decrease':
        this.handleResizeItem(id, 'decrease');
        break;
      case 'rotateCW':
        this.handleRotateItem(id, 'clockwise');
        break;
      case 'rotateCCW':
        this.handleRotateItem(id, 'counterclockwise');
        break;
      case 'layerUp':
        this.handleAdjustLayer(id, 'up');
        break;
      case 'layerDown':
        this.handleAdjustLayer(id, 'down');
        break;
      default:
        console.warn('未知的控制按钮操作:', action);
    }
    
    // 返回false阻止事件冒泡
    return false;
  },
  
  // 处理删除项目
  handleDeleteItem: function(id) {
    console.log('准备删除项目:', id);
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除该衣物吗？',
      success: (res) => {
        if (res.confirm) {
          console.log('用户确认删除');
          const updatedCanvasItems = this.data.canvasItems.filter(item => item.id !== id);
          
          this.setData({
            canvasItems: updatedCanvasItems,
            activeItemId: null
          });
          
          wx.showToast({
            title: '已删除',
            icon: 'success',
            duration: 1000
          });
          
          console.log('项目已删除:', id);
        } else {
          console.log('用户取消删除');
        }
      }
    });
  },
  
  // 处理调整项目大小
  handleResizeItem: function(id, direction) {
    console.log('准备调整大小:', id, direction);
    
    const item = this.data.canvasItems.find(item => item.id === id);
    
    if (!item) {
      console.error('未找到ID为', id, '的项目');
      return;
    }
    
    // 计算新尺寸
    const newSize = canvasManager.calculateNewSize(
      item.width,
      item.height,
      direction,
      this.data.canvasWidth,
      this.data.canvasHeight
    );
    
    console.log('调整大小:', direction, '新尺寸:', newSize);
    
    // 更新项目尺寸
    const updatedCanvasItems = this.data.canvasItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          width: newSize.width,
          height: newSize.height
        };
      }
      return item;
    });
    
    this.setData({
      canvasItems: updatedCanvasItems
    });
    
    // 显示提示
    wx.vibrateShort && wx.vibrateShort({
      type: 'medium'
    });
  },
  
  // 处理旋转项目
  handleRotateItem: function(id, direction) {
    console.log('准备旋转项目:', id, direction);
    
    const item = this.data.canvasItems.find(item => item.id === id);
    
    if (!item) {
      console.error('未找到ID为', id, '的项目');
      return;
    }
    
    // 计算新旋转角度
    const newRotation = canvasManager.calculateNewRotation(
      item.rotation || 0,
      direction
    );
    
    console.log('旋转:', direction, '新角度:', newRotation);
    
    // 更新项目旋转角度
    const updatedCanvasItems = this.data.canvasItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          rotation: newRotation
        };
      }
      return item;
    });
    
    this.setData({
      canvasItems: updatedCanvasItems
    });
    
    // 显示提示
    wx.vibrateShort && wx.vibrateShort({
      type: 'medium'
    });
  },
  
  // 处理图层调整
  handleAdjustLayer: function(id, direction) {
    console.log('准备调整图层:', id, direction);
    
    const item = this.data.canvasItems.find(item => item.id === id);
    
    if (!item) {
      console.error('未找到ID为', id, '的项目');
      return;
    }
    
    // 计算新图层
    const newLayer = canvasManager.calculateNewLayer(
      item.layer || 0,
      direction
    );
    
    console.log('调整图层:', direction, '新图层:', newLayer);
    
    // 更新项目图层
    const updatedCanvasItems = this.data.canvasItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          layer: newLayer
        };
      }
      return item;
    });
    
    this.setData({
      canvasItems: updatedCanvasItems
    });
    
    // 显示提示
    wx.vibrateShort && wx.vibrateShort({
      type: 'medium'
    });
  }
});
