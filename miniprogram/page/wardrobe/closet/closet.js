// page/wardrobe/closet/closet.js
const colors = require('../../../util/colors');

// 导入模块
const cardManager = require('./modules/cardManager');
const dataManager = require('./modules/dataManager');
const imageProcessor = require('./modules/imageProcessor');
const userManager = require('./modules/userManager');
const closetUtils = require('./modules/closetUtils');
const downloadClothesImages = require('./downloadClothesImages');

Page({
  data: {
    // 使用全局颜色配置
    colors: {
      darkBrown: colors.darkBrown,
      darkOlive: colors.deepOlive,
      lightTaupe: colors.lightTaupe,
      mediumBrown: colors.mediumBrown,
      darkCoffee: colors.darkCoffee,
    },
    // 分页相关
    currentPage: 1,             // 当前页码
    pageSize: 12,               // 每页显示的衣物数量
    totalPages: 1,              // 总页数
    lastImageUrlUpdateTime: 0,  // 上次更新临时链接的时间戳
    
    // 定义衣物类别 - 使用日式名称和英文名称
    categories: [
      { id: 0, name: '全て', enName: 'All', icon: '全', count: 0 },
      { id: 1, name: 'トップス', enName: 'Tops', icon: '上', count: 0, category: '上衣' },
      { id: 2, name: 'パンツ', enName: 'Pants', icon: '裤', count: 0, category: '裤子' },
      { id: 3, name: 'スカート', enName: 'Skirts', icon: '裙', count: 0, category: '裙子' },
      { id: 4, name: 'アウター', enName: 'Outerwear', icon: '外', count: 0, category: '外套' },
      { id: 5, name: 'シューズ', enName: 'Shoes', icon: '鞋', count: 0, category: '鞋子' },
      { id: 6, name: 'アクセサリー', enName: 'Accessories', icon: '饰', count: 0, category: '配饰' }
    ],
    
    currentIndex: 0,            // 当前卡片索引
    cards: [],                  // 卡片位置和显示状态
    selectedCategory: null,      // 选中的类别
    clothes: [],                 // 所有衣物数据
    filteredClothes: [],         // 按类别筛选后的衣物
    currentPageClothes: [],     // 当前页显示的衣物
    showAddOptions: false,       // 是否显示添加选项
    isUploading: false,          // 是否正在上传
    isLoading: true,             // 是否正在加载
    userOpenId: '',              // 存储用户的openid
    templatePath: '',           // 抠图模板文件路径
    isTouching: false,          // 是否正在触摸滑动中
    lastTouchEndTime: 0,        // 最后一次触摸结束的时间戳
    touchMoved: false,          // 跟踪是否有滑动移动发生
    touchStartX: 0,           // 触摸开始的X坐标
    touchStartY: 0,           // 触摸开始的Y坐标
    touchTime: 0,             // 触摸开始的时间戳
    isSliding: false,         // 是否正在滑动中
    slidingLocked: false,     // 滑动锁定状态，防止连续触发
    moveDistance: 0,             // 触摸移动的距离
    lastSlideTime: 0,         // 最后一次滑动的时间戳
    preventTapCount: 0,       // 阻止点击计数器，用于区分意外点击和真实点击
    tapCoolingEndTime: 0,     // 记录点击冷却结束时间
    currentCategoryFilter: null,  // 使用新的数据属性来记录当前类别过滤条件
    categoriesInitialized: false, // 标记类别数量已初始化
  },
  
  // 页面加载
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
    
    // 初始化卡片位置
    this.initCardPositions();
    
    // 获取用户OpenID
    this.getUserOpenId();
    
    // 确保抠图模板文件在用户目录中可用
    this.ensureKoutuTemplate();
  },
  
  onShow: function() {
    // 如果已经有OpenID，刷新衣物列表
    if (this.data.userOpenId) {
      this.loadClothes(true, true); // 强制更新类别数量，显示加载提示
    }
  },
  
  // ==========================
  // 卡片和UI管理相关函数
  // ==========================
  
  // 初始化卡片位置和可见性
  initCardPositions: function() {
    const cards = cardManager.initCardPositions(this.data.currentIndex, this.data.categories.length);
    this.setData({ cards });
  },
  
  // 更新卡片位置
  updateCardPositions: function() {
    this.setData({
      cards: cardManager.updateCardPositions(this.data.currentIndex, this.data.cards, this.data.categories.length)
    });
  },
  
  // 滑动到下一张卡片
  slideNext: function() {
    if (this.data.currentIndex < this.data.categories.length - 1) {
      this.setData({
        currentIndex: this.data.currentIndex + 1
      });
      this.updateCardPositions();
      console.log('滑动到下一张卡片:', this.data.categories[this.data.currentIndex].name);
      this.filterClothesByCategory(this.data.categories[this.data.currentIndex].id);
    }
  },
  
  // 滑动到上一张卡片
  slidePrev: function() {
    if (this.data.currentIndex > 0) {
      this.setData({
        currentIndex: this.data.currentIndex - 1
      });
      this.updateCardPositions();
      console.log('滑动到上一张卡片:', this.data.categories[this.data.currentIndex].name);
      this.filterClothesByCategory(this.data.categories[this.data.currentIndex].id);
    }
  },
  
  // 处理卡片点击事件
  onCardTap: function(e) {
    console.log('尝试点击卡片');
    
    // 多层保护：检查是否应该阻止点击
    const now = Date.now();
    
    // 1. 检查是否当前正处于滑动状态或滑动锁定状态
    if (this.data.isSliding || this.data.slidingLocked) {
      console.log('滑动状态中，点击被阻止');
      return;
    }
    
    // 2. 检查是否在滑动冷却期内（滑动后的800毫秒内不允许点击）
    if (now - this.data.lastSlideTime < 800) {
      console.log('滑动冷却期内，点击被阻止');
      return;
    }
    
    // 3. 检查是否有足够的时间过去 - 防止意外的快速连续点击
    if (now - this.data.tapCoolingEndTime < 300) {
      console.log('点击冷却期内，点击被阻止');
      return;
    }
    
    // 记录被允许的点击
    console.log('允许点击卡片，滑动时间差：', now - this.data.lastSlideTime);
    
    const index = e.currentTarget.dataset.index;
    console.log('点击卡片, 索引:', index);
    
    if (index !== this.data.currentIndex) {
      // 如果点击的不是当前卡片，则将其设为当前卡片
      this.setData({
        currentIndex: index,
        currentCategoryFilter: this.data.categories[index].id  // 更新类别过滤条件
      });
      this.updateCardPositions();
      this.filterClothesByCategory(this.data.categories[index].id);
    } else {
      // 如果点击的是当前卡片，则显示详情
      const selectedCategory = this.data.categories[index];
      
      this.setData({
        selectedCategory: selectedCategory,
        currentCategoryFilter: selectedCategory.id  // 同时更新类别过滤条件
      });
      console.log('显示类别详情:', selectedCategory.name);
    }
    
    // 设置点击冷却结束时间
    this.setData({
      tapCoolingEndTime: now
    });
  },
  
  // 处理触摸开始事件
  handleTouchStart: function(e) {
    if (e.touches.length !== 1) return;
    
    const touch = e.touches[0];
    
    // 记录初始触摸信息
    this.setData({
      touchStartX: touch.clientX,
      touchStartY: touch.clientY,
      touchTime: Date.now(),
      isSliding: false,
      touchMoved: false,        // 重置移动标记
      moveDistance: 0           // 重置移动距离
    });
    
    console.log('触摸开始 X:', touch.clientX, 'Y:', touch.clientY);
  },
  
  // 处理触摸移动事件
  handleTouchMove: function(e) {
    if (e.touches.length !== 1 || !this.data.touchStartX) return;
    
    const touch = e.touches[0];
    const moveX = touch.clientX - this.data.touchStartX;
    const moveY = touch.clientY - this.data.touchStartY;
    const absoluteMoveX = Math.abs(moveX);
    
    // 更新移动距离，记录最大移动
    if (absoluteMoveX > Math.abs(this.data.moveDistance)) {
      this.setData({
        moveDistance: moveX
      });
    }
    
    // 判断是否是水平滑动 (X方向移动明显大于Y方向)
    if (Math.abs(moveX) > Math.abs(moveY) * 1.2) {
      // 检测任何移动，即使很小
      if (absoluteMoveX > 3) {
        this.setData({
          touchMoved: true  // 标记发生了移动
        });
      }
      
      // 如果水平移动距离超过滑动阈值，标记为滑动
      if (absoluteMoveX > 10) {
        if (!this.data.isSliding) {
          console.log('检测到滑动，距离:', absoluteMoveX);
          this.setData({
            isSliding: true,
            preventTapCount: this.data.preventTapCount + 1  // 增加阻止点击计数
          });
        }
        
        // 防止在滑动时触发系统的下拉刷新
        if (e.cancelable) {
          e.preventDefault();
        }
      }
    }
  },
  
  // 处理触摸结束事件
  handleTouchEnd: function(e) {
    if (!this.data.touchStartX) return;
    
    const endTime = Date.now();
    const moveTime = endTime - this.data.touchTime;
    
    // 触摸结束时获取最终位置
    const endX = e.changedTouches[0].clientX;
    const moveDistance = endX - this.data.touchStartX;
    const absoluteMoveDistance = Math.abs(moveDistance);
    
    console.log('触摸结束，移动距离:', moveDistance, '移动时间:', moveTime);
    
    // 记录这次触摸结束的时间
    this.setData({
      lastTouchEndTime: endTime
    });
    
    // 判断是否需要切换卡片
    if (this.data.isSliding || this.data.touchMoved) {
      // 记录最后一次滑动的时间戳 - 这是关键，可用于阻止后续的点击
      const slideCooldown = absoluteMoveDistance > 30 ? 800 : 500;
      
      this.setData({
        lastSlideTime: endTime,
        slidingLocked: true
      });
      
      // 根据滑动距离和速度确定是否切换卡片
      if ((moveTime < 300 && absoluteMoveDistance > 30) || absoluteMoveDistance > 50) {
        if (moveDistance > 0) {
          // 向右滑，切换到上一张
          this.slidePrev();
        } else {
          // 向左滑，切换到下一张
          this.slideNext();
        }
      }
      
      // 延迟重置滑动状态 - 使用更长的时间来确保不会意外点击
      setTimeout(() => {
        this.setData({
          isSliding: false,
          slidingLocked: false,
          touchStartX: 0,
          touchStartY: 0
        });
        
        console.log('滑动状态重置');
      }, slideCooldown);
    } else {
      // 即使没有明显滑动，也重置触摸状态
      this.setData({
        touchStartX: 0,
        touchStartY: 0,
        isSliding: false
      });
    }
  },
  
  // 关闭详情视图
  closeDetail: function() {
    // 关闭详情视图，但保留当前的类别过滤
    this.setData({
      selectedCategory: null
    });
  },
  
  // 点击详情背景关闭
  onDetailBackgroundTap: function() {
    this.closeDetail();
  },
  
  // 阻止冒泡
  preventBubble: function(e) {
    // 阻止事件冒泡，防止点击详情卡片时关闭详情
    return;
  },
  
  // ==========================
  // 数据管理相关函数
  // ==========================
  
  // 获取当前用户的OpenID
  getUserOpenId: function() {
    closetUtils.showLoading('加载中...');
    
    userManager.getUserOpenId()
      .then(openid => {
        this.setData({
          userOpenId: openid
        });
        // 获取到OpenID后，获取衣物列表（首次加载，需要更新类别数量）
        this.loadClothes(true, true);
      })
      .catch(err => {
        console.error('获取用户OpenID失败:', err);
        this.simulateData();
      })
      .finally(() => {
        closetUtils.hideLoading();
      });
  },
  
  // 模拟数据用于测试
  simulateData: function() {
    const result = dataManager.simulateData(this.data.categories);
    
    this.setData({
      categories: result.categories,
      clothes: result.clothes,
      isLoading: false
    });
    
    this.initCardPositions();
  },
  
  // 获取衣物列表
  loadClothes: function(forceUpdateCounts = false, showLoading = true) {
    // 如果没有获取到用户OpenID，不进行数据获取
    if (!this.data.userOpenId) {
      console.log('未获取到用户OpenID，无法获取衣物列表');
      return;
    }
    
    console.log('加载衣物列表，是否强制更新类别数量:', forceUpdateCounts, '显示加载提示:', showLoading);
    
    // 仅在需要时显示加载提示
    if (showLoading) {
      closetUtils.showLoading('加载衣物...');
    }
    
    // 获取当前过滤的类别对象
    let filterCategory = null;
    if (this.data.currentCategoryFilter !== null) {
      filterCategory = this.data.categories.find(c => c.id === this.data.currentCategoryFilter);
    }
    // 如果有详情视图打开，则使用selectedCategory
    else if (this.data.selectedCategory) {
      filterCategory = this.data.selectedCategory;
    }
    
    dataManager.loadClothes(
      this.data.userOpenId,
      filterCategory,
      this.data.currentPage,
      this.data.pageSize
    )
      .then(result => {
        if (showLoading) {
          closetUtils.hideLoading();
        }
        
        // 仅在首次加载或添加衣物后更新类别数量
        let updatedCategories = this.data.categories;
        if (forceUpdateCounts || !this.data.categoriesInitialized) {
          console.log('更新类别数量');
          updatedCategories = cardManager.calculateCategoryCounts(
            result.totalClothesData || result.clothes,
            this.data.categories
          );
        } else {
          console.log('跳过更新类别数量');
        }
        
        this.setData({
          clothes: result.clothes,
          filteredClothes: result.clothes,
          currentPageClothes: result.clothes,
          totalClothes: result.totalClothes,
          totalPages: result.totalPages,
          categories: updatedCategories,
          categoriesInitialized: true, // 标记类别数量已初始化
          isLoading: false
        });
        
        // 下载所有衣物图片
        this.downloadClothesImages(result.clothes);
      })
      .catch(err => {
        if (showLoading) {
          closetUtils.hideLoading();
        }
        console.error('获取衣物列表失败', err);
        
        // 出错时使用模拟数据
        this.simulateData();
        
        closetUtils.showErrorToast('加载失败，使用测试数据');
      });
  },
  
  // 根据类别筛选衣物
  filterClothesByCategory: function(category) {
    // 获取类别ID（处理传入的可能是类别对象或类别ID）
    const categoryId = typeof category === 'object' ? category.id : category;
    
    // 查找对应的类别对象
    const categoryObj = this.data.categories.find(c => c.id === categoryId);
    
    if (!categoryObj) {
      console.error('未找到指定的类别:', categoryId);
      return;
    }
    
    console.log('切换到类别:', categoryObj.name, '(ID:', categoryId, ')');
    
    // 设置当前类别过滤条件，但不打开详情视图
    this.setData({
      currentCategoryFilter: categoryId,  // 使用新的数据属性来记录当前类别过滤条件
      currentPage: 1  // 重置为第1页
    });
    
    // 重新加载服务器数据，不更新类别数量，也不显示加载提示
    this.loadClothes(false, false);
  },
  
  // 下载衣物图片
  downloadClothesImages: function(clothes) {
    // 调用模块化的下载函数，并绑定this上下文
    downloadClothesImages.call(this, clothes);
  },
  
  // ==========================
  // 分页相关函数
  // ==========================
  
  // 应用分页逻辑
  applyPagination: function() {
    // 直接重新加载当前页的数据（不需要更新类别数量）
    this.loadClothes(false, true); // 分页操作要显示加载提示
  },
  
  // 前往下一页
  nextPage: function() {
    if (this.data.currentPage < this.data.totalPages) {
      this.setData({
        currentPage: this.data.currentPage + 1
      }, () => {
        this.applyPagination();
      });
    }
  },
  
  // 前往上一页
  prevPage: function() {
    if (this.data.currentPage > 1) {
      this.setData({
        currentPage: this.data.currentPage - 1
      }, () => {
        this.applyPagination();
      });
    }
  },
  
  // 前往指定页
  goToPage: function(e) {
    const page = parseInt(e.currentTarget.dataset.page);
    if (page >= 1 && page <= this.data.totalPages) {
      this.setData({
        currentPage: page
      }, () => {
        this.applyPagination();
      });
    }
  },
  
  // ==========================
  // 衣物添加相关函数
  // ==========================
  
  // 查看衣物详情
  viewClothesDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    console.log('查看衣物详情:', id);
    
    // 由于当前环境可能无法跳转页面，所以先给出提示
    closetUtils.showSuccessToast('查看衣物详情: ' + id);
    
    // 实际代码中应该跳转到详情页
    // wx.navigateTo({
    //   url: '../detail/detail?id=' + id
    // });
  },
  
  // 显示添加选项
  showAddOptions: function() {
    this.setData({
      showAddOptions: true
    });
  },
  
  // 隐藏添加选项
  hideAddOptions: function() {
    this.setData({
      showAddOptions: false
    });
  },
  
  // 通过拍照添加衣物
  addByCamera: function() {
    this.hideAddOptions();
    
    // 调用相机API拍照
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        closetUtils.showLoading('处理中...');
        
        const tempFilePath = res.tempFiles[0].tempFilePath;
        console.log('拍摄的图片:', tempFilePath);
        
        // 上传图片到云存储
        this.uploadAndProcessImage(tempFilePath);
      },
      fail: (err) => {
        console.error('拍照失败:', err);
        closetUtils.showErrorToast('拍照失败');
      }
    });
  },
  
  // 通过相册添加衣物
  addByAlbum: function() {
    this.hideAddOptions();
    
    // 从相册选择图片
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        closetUtils.showLoading('处理中...');
        
        const tempFilePath = res.tempFiles[0].tempFilePath;
        console.log('选择的图片:', tempFilePath);
        
        // 上传图片到云存储
        this.uploadAndProcessImage(tempFilePath);
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        closetUtils.showErrorToast('选择图片失败');
      }
    });
  },
  
  // 通过URL添加衣物
  addByUrl: function() {
    this.hideAddOptions();
    
    wx.showModal({
      title: '输入图片URL',
      editable: true,
      placeholderText: '请输入有效的图片URL',
      success: (res) => {
        if (res.confirm && res.content) {
          closetUtils.showLoading('处理中...');
          
          const imageUrl = res.content.trim();
          // 直接使用URL进行抠图处理
          this.processImageWithKoutu(imageUrl);
        }
      }
    });
  },
  
  // ==========================
  // 图片处理相关函数
  // ==========================
  
  // 确保抠图模板文件可用
  ensureKoutuTemplate: function() {
    userManager.ensureKoutuTemplate()
      .then(templatePath => {
        this.setData({
          templatePath: templatePath
        });
        console.log('抠图模板路径:', templatePath);
      })
      .catch(err => {
        console.error('准备抠图模板失败:', err);
      });
  },
  
  // 上传并处理图片
  uploadAndProcessImage: function(filePath) {
    this.setData({
      isUploading: true
    });
    
    // 上传图片到云存储
    imageProcessor.uploadImageToCloud(filePath)
      .then(fileID => {
        // 获取临时访问链接
        return imageProcessor.getTempFileURL(fileID)
          .then(tempFileURL => {
            // 处理图片
            return this.processImageWithKoutu(tempFileURL, fileID);
          });
      })
      .catch(err => {
        console.error('上传和处理失败:', err);
        closetUtils.hideLoading();
        this.setData({
          isUploading: false
        });
        closetUtils.showErrorToast('上传失败');
      });
  },
  
  // 调用抠图API处理图片
  processImageWithKoutu: function(imageUrl, fileID = '') {
    imageProcessor.processImageWithKoutu(imageUrl, this.data.templatePath)
      .then(processedImageUrl => {
        // 分析衣物
        return this.analyzeClothing(processedImageUrl, imageUrl, fileID);
      })
      .catch(err => {
        console.error('抠图处理失败:', err);
        this.handleKoutuError();
      });
  },
  
  // 分析衣物
  analyzeClothing: function(processedImageUrl, originalImageUrl, fileID) {
    imageProcessor.analyzeClothing(processedImageUrl)
      .then(analysisData => {
        // 保存到数据库
        return dataManager.saveClothingToDatabase(
          fileID,
          originalImageUrl,
          analysisData,
          this.data.userOpenId
        );
      })
      .then(res => {
        console.log('保存衣物成功:', res);
        closetUtils.hideLoading();
        this.setData({
          isUploading: false
        });
        closetUtils.showSuccessToast('添加衣物成功');
        
        // 更新衣物列表，并强制更新类别数量
        this.loadClothes(true, true);
      })
      .catch(err => {
        console.error('分析或保存失败:', err);
        this.handleAnalysisError();
      });
  },
  
  // 处理抠图错误
  handleKoutuError: function() {
    closetUtils.hideLoading();
    this.setData({
      isUploading: false
    });
    closetUtils.showErrorToast('抠图处理失败');
  },
  
  // 处理分析错误
  handleAnalysisError: function() {
    closetUtils.hideLoading();
    this.setData({
      isUploading: false
    });
    closetUtils.showErrorToast('分析衣物失败');
  },
  
  // 处理选择图片上传
  handleAddFromAlbum: function() {
    // ... existing code ...
  },
  
  // 处理拍照上传
  handleAddFromCamera: function() {
    // ... existing code ...
  },
  
  // 删除衣物
  deleteClothing: function(id) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这件衣物吗？',
      success: res => {
        if (res.confirm) {
          wx.cloud.callFunction({
            name: 'deleteClothing',
            data: {
              clothingId: id
            }
          })
          .then(res => {
            console.log('删除衣物成功:', res);
            closetUtils.showSuccessToast('删除成功');
            
            // 更新衣物列表，并强制更新类别数量
            this.loadClothes(true, true);
          })
          .catch(err => {
            console.error('删除衣物失败:', err);
            closetUtils.showErrorToast('删除失败');
          });
        }
      }
    });
  },
});
