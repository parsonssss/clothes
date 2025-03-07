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
    // 风格切换设置
    themeStyle: 'autumn', // 默认为秋季风格，可选值：'autumn'或'pinkBlue'
    // 使用全局颜色配置
    colors: {
      darkBrown: colors.darkBrown,
      darkOlive: colors.deepOlive,
      lightTaupe: '#E8D1A7',
      mediumBrown: colors.mediumBrown,
      darkCoffee: colors.darkCoffee,
    },
    // 粉蓝色系配色
    pinkBlueColors: {
      pinkDark: '#D47C99',       // 深粉色
      pinkMedium: '#EEA0B2',     // 中粉色
      pinkLight: '#F9C9D6',      // 浅粉色
      blueLight: '#CBE0F9',      // 浅蓝色
      blueMedium: '#97C8E5',     // 中蓝色
      blueDark: '#5EA0D0',       // 深蓝色
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
    editingClothing: null,      // 当前编辑的衣物数据
    showEditModal: false,       // 是否显示编辑衣物弹窗
    originalClothing: null,     // 原始衣物数据用于比较
    validCategories: ['上衣', '裤子', '裙子', '外套', '鞋子', '配饰'], // 有效的衣物类别
    showCategoryPicker: false,  // 是否显示类别选择器
    tempSelectedCategory: '',   // 临时选中的类别
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
    
    // 获取保存的主题设置
    const savedTheme = wx.getStorageSync('themeStyle');
    if (savedTheme) {
      this.setData({
        themeStyle: savedTheme
      });
      // 应用主题样式
      if (typeof this.applyThemeStyle === 'function') {
        this.applyThemeStyle(savedTheme);
      }
    }
    
    // 初始化卡片位置
    this.initCardPositions();
    
    // 获取用户OpenID
    this.getUserOpenId();
    
    // 确保抠图模板文件在用户目录中可用
    this.ensureKoutuTemplate();
    
    // 每24小时更新一次模板（确保使用最新的云端模板）
    this.setTemplateUpdateInterval();
  },
  
  onShow: function() {
    // 如果已经有OpenID，刷新衣物列表
    if (this.data.userOpenId) {
      this.loadClothes(true, true); // 强制更新类别数量，显示加载提示
    }
    
    // 检查并应用主题设置
    const savedTheme = wx.getStorageSync('themeStyle');
    if (savedTheme && savedTheme !== this.data.themeStyle) {
      console.log('发现主题变化，从', this.data.themeStyle, '到', savedTheme);
      // 应用新主题
      if (typeof this.applyThemeStyle === 'function') {
        this.applyThemeStyle(savedTheme);
      } else {
        this.setData({ themeStyle: savedTheme });
      }
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
  preventBubble: function() {
    // 阻止事件冒泡
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
        
        // 检查是否有totalClothesData用于计算类别数量
        if (!result.totalClothesData || result.totalClothesData.length === 0) {
          console.warn('未获取到用于计算类别数量的数据，可能导致类别数量统计不准确');
        }
        
        // 更新类别数量
        let updatedCategories = this.data.categories;
        if (forceUpdateCounts || !this.data.categoriesInitialized) {
          console.log('更新类别数量，数据源长度:', (result.totalClothesData || []).length);
          updatedCategories = cardManager.calculateCategoryCounts(
            result.totalClothesData || result.clothes,
            this.data.categories
          );
          
          // 输出更新后的类别数量，便于调试
          updatedCategories.forEach(cat => {
            console.log(`类别 ${cat.name} (${cat.category || '全部'}) 数量: ${cat.count}`);
          });
        } else {
          console.log('跳过更新类别数量');
        }
        
        // 处理空数据情况
        const clothes = result.clothes || [];
        const filteredClothes = clothes;
        const currentPageClothes = clothes;
        
        this.setData({
          clothes: clothes,
          filteredClothes: filteredClothes,
          currentPageClothes: currentPageClothes,
          totalClothes: result.totalClothes || 0,
          totalPages: result.totalPages || 1,
          categories: updatedCategories,
          categoriesInitialized: true, // 标记类别数量已初始化
          isLoading: false
        });
        
        // 下载所有衣物图片
        if (clothes.length > 0) {
          this.downloadClothesImages(clothes);
        }
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
  
  // 更新当前页面显示的衣物列表
  updateCurrentPageClothes: function() {
    console.log('更新当前页面显示的衣物列表');
    
    // 计算当前页应该显示的衣物
    const startIndex = (this.data.currentPage - 1) * this.data.pageSize;
    const endIndex = Math.min(startIndex + this.data.pageSize, this.data.filteredClothes.length);
    const currentPageClothes = this.data.filteredClothes.slice(startIndex, endIndex);
    
    // 更新总页数
    const totalPages = Math.max(1, Math.ceil(this.data.filteredClothes.length / this.data.pageSize));
    
    // 如果当前页超出了总页数，调整到最后一页
    let currentPage = this.data.currentPage;
    if (currentPage > totalPages) {
      currentPage = totalPages;
    }
    
    console.log('分页信息 - 当前页:', currentPage, '总页数:', totalPages, '每页数量:', this.data.pageSize, '总衣物数:', this.data.filteredClothes.length);
    
    this.setData({
      currentPageClothes: currentPageClothes,
      totalPages: totalPages,
      currentPage: currentPage,
      totalClothes: this.data.filteredClothes.length
    });
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
    
    // 查找当前衣物数据
    const clothing = this.data.currentPageClothes.find(item => item._id === id);
    if (!clothing) {
      console.error('未找到衣物数据:', id);
      closetUtils.showErrorToast('未找到衣物数据');
      return;
    }
    
    console.log('找到衣物数据:', clothing);
    // 显示编辑弹窗
    this.showEditClothingModal(clothing);
  },
  
  // 显示编辑衣物弹窗
  showEditClothingModal: function(clothing) {
    console.log('显示编辑弹窗，衣物数据:', clothing);
    // 创建深拷贝，避免直接修改原始数据
    const editingClothing = JSON.parse(JSON.stringify(clothing));
    const originalClothing = JSON.parse(JSON.stringify(clothing));
    
    // 确保价格字段为字符串类型
    if (editingClothing.price !== undefined && editingClothing.price !== null) {
      editingClothing.price = String(editingClothing.price);
    }
    
    this.setData({
      editingClothing: editingClothing,
      originalClothing: originalClothing,
      showEditModal: true
    });
  },
  
  // 隐藏编辑衣物弹窗
  hideEditClothingModal: function() {
    console.log('尝试关闭编辑弹窗');
    // 如果数据已修改，显示确认提示
    if (this.hasDataChanged()) {
      console.log('数据已修改，显示确认提示');
      wx.showModal({
        title: '确认关闭',
        content: '您有未保存的修改，确定要关闭吗？',
        success: (res) => {
          if (res.confirm) {
            console.log('用户确认关闭');
            this.setData({
              showEditModal: false,
              editingClothing: null,
              originalClothing: null
            });
          } else {
            console.log('用户取消关闭');
          }
        }
      });
    } else {
      console.log('无修改，直接关闭');
      this.setData({
        showEditModal: false,
        editingClothing: null,
        originalClothing: null
      });
    }
  },
  
  // 检查数据是否已修改
  hasDataChanged: function() {
    const original = this.data.originalClothing;
    const current = this.data.editingClothing;
    if (!original || !current) return false;
    
    // 比较关键字段
    const fieldsToCompare = ['name', 'category', 'type', 'color', 'style', 'warmthLevel', 'scenes', 'price'];
    for (const field of fieldsToCompare) {
      // 特殊处理价格字段，转换为相同类型后比较
      if (field === 'price') {
        const originalPrice = original[field] !== undefined && original[field] !== null ? String(original[field]) : '';
        const currentPrice = current[field] !== undefined && current[field] !== null ? String(current[field]) : '';
        if (originalPrice !== currentPrice) {
          console.log(`字段 ${field} 已修改:`, originalPrice, '=>', currentPrice);
          return true;
        }
        continue;
      }
      
      // 其他字段直接比较
      if ((original[field] || '') !== (current[field] || '')) {
        console.log(`字段 ${field} 已修改:`, original[field], '=>', current[field]);
        return true;
      }
    }
    return false;
  },
  
  // 处理编辑表单输入变化
  handleEditInput: function(e) {
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    console.log('处理输入变化:', field, value);

    // 特殊处理价格字段
    if (field === 'price') {
      // 只允许输入数字和小数点
      const newValue = value.replace(/[^\d.]/g, '');
      // 确保只有一个小数点
      const parts = newValue.split('.');
      if (parts.length > 2) {
        console.log('价格格式无效：多个小数点');
        return;
      }
      // 限制小数位数为2位
      if (parts[1] && parts[1].length > 2) {
        console.log('价格格式无效：小数位数过多');
        return;
      }
      this.setData({
        [`editingClothing.${field}`]: newValue
      });
      return;
    }

    // 类别字段验证
    if (field === 'category' && value && !this.data.validCategories.includes(value)) {
      console.log('无效的类别:', value);
      closetUtils.showErrorToast('请选择有效的类别');
      return;
    }

    // 其他字段的处理
    this.setData({
      [`editingClothing.${field}`]: value
    }, () => {
      console.log('更新后的编辑数据:', this.data.editingClothing);
    });
  },
  
  // 显示类别选择器
  showCategoryPicker: function() {
    console.log('显示类别选择器');
    this.setData({
      showCategoryPicker: true,
      tempSelectedCategory: this.data.editingClothing.category || ''
    });
  },
  
  // 隐藏类别选择器
  hideCategoryPicker: function() {
    console.log('隐藏类别选择器');
    this.setData({
      showCategoryPicker: false
    });
  },
  
  // 选择类别
  selectCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    console.log('选择类别:', category);
    this.setData({
      tempSelectedCategory: category
    });
  },
  
  // 确认类别选择
  confirmCategoryPicker: function() {
    console.log('确认类别选择:', this.data.tempSelectedCategory);
    
    // 记录原始类别，用于判断是否发生变更
    const originalCategory = this.data.editingClothing.category;
    const newCategory = this.data.tempSelectedCategory;
    
    this.setData({
      'editingClothing.category': newCategory,
      showCategoryPicker: false
    });
    
    // 如果类别发生变更，在控制台输出提示
    if (originalCategory !== newCategory) {
      console.log('类别已变更:', originalCategory, '=>', newCategory);
    }
  },
  
  // 保存编辑后的衣物信息
  saveClothingEdit: function() {
    const clothing = this.data.editingClothing;
    console.log('准备保存衣物信息:', clothing);
    
    if (!clothing || !clothing._id) {
      console.error('无效的衣物数据');
      closetUtils.showErrorToast('无效的衣物数据');
      return;
    }

    // 数据验证
    if (!clothing.name?.trim()) {
      console.log('名称为空');
      closetUtils.showErrorToast('请输入衣物名称');
      return;
    }

    if (!clothing.category?.trim()) {
      console.log('类别为空');
      closetUtils.showErrorToast('请选择衣物类别');
      return;
    }

    if (!this.data.validCategories.includes(clothing.category)) {
      console.log('无效的类别:', clothing.category);
      closetUtils.showErrorToast('请选择有效的类别');
      return;
    }

    // 价格验证和转换
    let price = undefined;
    if (clothing.price) {
      if (isNaN(Number(clothing.price))) {
        console.log('无效的价格:', clothing.price);
        closetUtils.showErrorToast('请输入有效的价格');
        return;
      }
      price = Number(clothing.price);
    }

    console.log('开始调用云函数更新衣物信息');
    closetUtils.showLoading('保存中...');
    
    // 记录原始类别，用于判断是否需要更新类别数量
    const originalCategory = this.data.originalClothing.category;
    const newCategory = clothing.category;
    const categoryChanged = originalCategory !== newCategory;
    
    console.log('类别是否变更:', categoryChanged, '原类别:', originalCategory, '新类别:', newCategory);
    
    // 准备要更新的数据
    const updateData = {
      clothingId: clothing._id,
      name: clothing.name,
      category: clothing.category
    };
    
    // 只包含有值的字段
    if (clothing.type) updateData.type = clothing.type;
    if (clothing.color) updateData.color = clothing.color;
    if (clothing.style) updateData.style = clothing.style;
    if (clothing.warmthLevel) updateData.warmthLevel = clothing.warmthLevel;
    if (clothing.scenes) updateData.scenes = clothing.scenes;
    if (price !== undefined) updateData.price = price;
    
    console.log('发送到云函数的数据:', updateData);
    
    // 调用云函数更新衣物信息
    wx.cloud.callFunction({
      name: 'updateClothing',
      data: updateData
    })
    .then(res => {
      console.log('云函数调用结果:', res);
      if (res.result && res.result.success) {
        closetUtils.hideLoading();
        closetUtils.showSuccessToast('保存成功');
        
        // 更新本地数据
        this.updateLocalClothingData(clothing._id, updateData, categoryChanged);
        
        // 关闭编辑弹窗
        this.setData({
          showEditModal: false,
          editingClothing: null,
          originalClothing: null
        });
      } else {
        throw new Error(res.result?.message || '保存失败');
      }
    })
    .catch(err => {
      console.error('保存衣物信息失败:', err);
      closetUtils.hideLoading();
      closetUtils.showErrorToast('保存失败: ' + (err.message || '未知错误'));
    });
  },
  
  // 更新本地衣物数据，避免重新加载
  updateLocalClothingData: function(clothingId, updateData, categoryChanged = false) {
    // 更新当前页面的衣物数据
    const currentPageClothes = [...this.data.currentPageClothes];
    const index = currentPageClothes.findIndex(item => item._id === clothingId);
    
    if (index !== -1) {
      // 更新找到的衣物数据
      const updatedClothing = {...currentPageClothes[index]};
      
      // 更新各个字段
      if (updateData.name) updatedClothing.name = updateData.name;
      if (updateData.category) updatedClothing.category = updateData.category;
      if (updateData.type) updatedClothing.type = updateData.type;
      if (updateData.color) updatedClothing.color = updateData.color;
      if (updateData.style) updatedClothing.style = updateData.style;
      if (updateData.warmthLevel) updatedClothing.warmthLevel = updateData.warmthLevel;
      if (updateData.scenes) updatedClothing.scenes = updateData.scenes;
      if (updateData.price !== undefined) updatedClothing.price = updateData.price;
      
      // 更新时间
      updatedClothing.updateTime = new Date();
      
      // 更新数组
      currentPageClothes[index] = updatedClothing;
      
      // 更新页面数据
      this.setData({
        currentPageClothes: currentPageClothes
      });
      
      console.log('本地衣物数据已更新');
      
      // 如果类别发生变化，需要更新类别数量和重新过滤列表
      if (categoryChanged) {
        console.log('类别已变更，更新类别数量和过滤列表');
        
        // 强制更新类别数量
        this.loadClothes(true, true);
        
        // 如果当前显示的是"全部"类别，只需要更新列表，不需要切换类别
        if (this.data.currentCategoryFilter === 0) {
          console.log('当前显示全部类别，只需更新列表');
          this.filterClothesByCategory(0);
        } 
        // 如果当前显示的是衣物原来的类别，需要从列表中移除该衣物
        else if (this.data.selectedCategory && 
                 this.data.selectedCategory.category === this.data.originalClothing.category) {
          console.log('当前显示的是衣物原类别，从列表中移除该衣物');
          const filteredClothes = this.data.filteredClothes.filter(item => item._id !== clothingId);
          this.setData({
            filteredClothes: filteredClothes
          });
          this.updateCurrentPageClothes();
        }
        // 如果当前显示的是衣物新的类别，需要添加该衣物到列表中
        else if (this.data.selectedCategory && 
                 this.data.selectedCategory.category === updateData.category) {
          console.log('当前显示的是衣物新类别，添加该衣物到列表中');
          this.filterClothesByCategory(this.data.currentCategoryFilter);
        }
      }
    } else {
      console.log('未找到本地衣物数据，将重新加载');
      // 如果找不到，重新加载数据
      this.loadClothes(true, true);
    }
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
          // 设置上传状态
          this.setData({
            isUploading: true
          });
          
          // 添加全局超时处理
          const globalTimeout = setTimeout(() => {
            console.error('URL处理全局超时');
            closetUtils.hideLoading();
            this.setData({
              isUploading: false
            });
            closetUtils.showErrorToast('处理超时，请重试');
          }, 3600000); // 1小时全局超时
          
          // 使用异步方法处理图片，而不是旧的方法
          this.processImageWithKoutuAsync(imageUrl)
            .then(() => {
              // 成功完成，清除全局超时
              clearTimeout(globalTimeout);
            })
            .catch(err => {
              // 清除全局超时
              clearTimeout(globalTimeout);
              console.error('URL图片处理失败:', err);
              closetUtils.hideLoading();
              this.setData({
                isUploading: false
              });
              closetUtils.showErrorToast('处理失败，请检查URL');
            });
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
    
    // 添加全局超时处理
    const globalTimeout = setTimeout(() => {
      console.error('上传处理全局超时');
      closetUtils.hideLoading();
      this.setData({
        isUploading: false
      });
      closetUtils.showErrorToast('上传处理超时，请重试');
    }, 3600000); // 1小时全局超时
    
    // 上传图片到云存储
    imageProcessor.uploadImageToCloud(filePath)
      .then(fileID => {
        // 获取临时访问链接
        return imageProcessor.getTempFileURL(fileID)
          .then(tempFileURL => {
            // 处理图片 - 异步操作
            return {
              fileID: fileID,
              tempFileURL: tempFileURL
            };
          });
      })
      .then(imageData => {
        // 开始抠图处理
        console.log('开始抠图处理...');
        return this.processImageWithKoutuAsync(imageData.tempFileURL, imageData.fileID);
      })
      .then(() => {
        // 成功完成，清除全局超时
        clearTimeout(globalTimeout);
      })
      .catch(err => {
        // 清除全局超时
        clearTimeout(globalTimeout);
        console.error('上传和处理失败:', err);
        closetUtils.hideLoading();
        this.setData({
          isUploading: false
        });
        closetUtils.showErrorToast('上传失败');
      });
  },
  
  // 异步分析衣物
  analyzeClothingAsync: function(processedImageData, originalImageUrl, fileID) {
    console.log('开始分析衣物...');
    
    // 验证输入参数
    if (!processedImageData || !processedImageData.tempImageUrl) {
      console.error('分析衣物失败: 无效的图片数据');
      this.handleAnalysisError();
      return Promise.reject(new Error('无效的图片数据'));
    }
    
    // 添加超时处理
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('分析衣物超时'));
      }, 3600000); // 1小时超时
    });
    
    // 分析衣物，添加超时处理
    return Promise.race([
      imageProcessor.analyzeClothing(processedImageData.tempImageUrl)
        .then(analysisData => {
          if (!analysisData) {
            throw new Error('分析结果为空');
          }
          console.log('衣物分析成功:', analysisData);
          
          // 保存到数据库
          return dataManager.saveClothingToDatabase(
            fileID,
            originalImageUrl,
            analysisData,
            this.data.userOpenId,
            processedImageData
          );
        }),
      timeoutPromise
    ])
    .then(res => {
      if (!res) {
        throw new Error('保存到数据库失败');
      }
      console.log('保存衣物成功:', res);
      closetUtils.hideLoading();
      this.setData({
        isUploading: false
      });
      closetUtils.showSuccessToast('添加衣物成功');
      
      // 强制刷新临时URL缓存，确保能立即看到新上传的衣服
      this.forceRefreshImageURLs();
      
      // 更新衣物列表，并强制更新类别数量
      this.loadClothes(true, true);
      return res;
    })
    .catch(err => {
      console.error('分析或保存失败:', err);
      this.handleAnalysisError();
      return Promise.reject(err);
    });
  },
  
  // 强制刷新临时URL缓存
  forceRefreshImageURLs: function() {
    console.log('强制刷新临时URL缓存');
    
    // 清除本地缓存的临时URL
    wx.removeStorageSync('tempImageURLs');
    
    // 重置最后更新时间，确保下次加载时会重新获取临时URL
    this.setData({
      lastImageUrlUpdateTime: 0
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
  
  // 应用主题样式
  applyThemeStyle: function(themeName) {
    console.log('衣柜页面应用新主题：', themeName);
    
    // 更新页面样式变量
    this.setData({
      themeStyle: themeName
    });
    
    // 设置导航栏样式
    if (themeName === 'autumn') {
      // 设置秋季主题导航栏
      wx.setNavigationBarColor({
        frontColor: '#000000', // 黑色文字
        backgroundColor: '#E8D1A7', // 金黄色背景
        animation: {
          duration: 300,
          timingFunc: 'easeIn'
        }
      });
      
      // 设置秋季主题TabBar
      wx.setTabBarStyle({
        backgroundColor: '#E8D1A7',
        borderStyle: 'black',
        color: '#442D1C',
        selectedColor: '#74301C'
      });
    } else if (themeName === 'pinkBlue') {
      // 设置粉蓝主题导航栏
      wx.setNavigationBarColor({
        frontColor: '#000000', // 黑色文字
        backgroundColor: '#F9C9D6', // 浅粉色背景
        animation: {
          duration: 300,
          timingFunc: 'easeIn'
        }
      });
      
      // 设置粉蓝主题TabBar
      wx.setTabBarStyle({
        backgroundColor: '#F9C9D6',
        borderStyle: 'black',
        color: '#5EA0D0',
        selectedColor: '#D47C99'
      });
    }
    
    // 强制重新渲染卡片
    this.updateCardPositions();
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
            
            // 强制刷新临时URL缓存，确保衣柜显示正确
            this.forceRefreshImageURLs();
            
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
  
  // 设置模板更新定时器
  setTemplateUpdateInterval: function() {
    // 清除旧的定时器（如果存在）
    if (this.templateUpdateTimer) {
      clearInterval(this.templateUpdateTimer);
    }
    
    // 设置24小时更新一次（24小时 * 60分钟 * 60秒 * 1000毫秒）
    const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
    
    this.templateUpdateTimer = setInterval(() => {
      console.log('定时任务：更新抠图模板');
      this.ensureKoutuTemplate();
    }, UPDATE_INTERVAL);
  },
  
  // 页面卸载时清除定时器
  onUnload: function() {
    if (this.templateUpdateTimer) {
      clearInterval(this.templateUpdateTimer);
      this.templateUpdateTimer = null;
    }
  },
  
  // 异步调用抠图API处理图片
  processImageWithKoutuAsync: function(imageUrl, fileID = '') {
    if (!this.data.templatePath) {
      console.error('抠图模板路径为空，尝试重新获取');
      return userManager.ensureKoutuTemplate()
        .then(templatePath => {
          this.setData({
            templatePath: templatePath
          });
          console.log('重新获取抠图模板成功，继续处理图片');
          return this.processImageWithKoutuAsync(imageUrl, fileID);
        })
        .catch(err => {
          console.error('重新获取抠图模板失败:', err);
          closetUtils.hideLoading();
          this.setData({
            isUploading: false
          });
          closetUtils.showErrorToast('处理失败，请重试');
          return Promise.reject(err);
        });
    }
    
    console.log('开始抠图处理，使用模板:', this.data.templatePath);
    
    // 添加超时处理
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error('抠图处理超时'));
      }, 3600000); // 1小时超时
    });
    
    // 异步处理抠图，添加超时处理
    return Promise.race([
      imageProcessor.processImageWithKoutu(imageUrl, this.data.templatePath)
        .then(processedImageUrl => {
          if (!processedImageUrl) {
            throw new Error('抠图结果为空');
          }
          console.log('抠图处理成功，结果URL:', processedImageUrl);
          
          // 保存抠图后的图片到云存储
          return imageProcessor.saveProcessedImageToCloud(processedImageUrl)
            .then(processedImageData => {
              if (!processedImageData || !processedImageData.tempImageUrl) {
                throw new Error('保存抠图结果失败');
              }
              console.log('抠图后图片已保存到云存储:', processedImageData);
              
              // 分析衣物 - 异步操作
              return this.analyzeClothingAsync(processedImageData, imageUrl, fileID);
            });
        }),
      timeoutPromise
    ])
    .catch(err => {
      console.error('抠图处理失败:', err);
      this.handleKoutuError();
      return Promise.reject(err);
    });
  },
  
  // 调用抠图API处理图片 - 原始方法
  processImageWithKoutu: function(imageUrl, fileID = '') {
    if (!this.data.templatePath) {
      console.error('抠图模板路径为空，尝试重新获取');
      return userManager.ensureKoutuTemplate()
        .then(templatePath => {
          this.setData({
            templatePath: templatePath
          });
          console.log('重新获取抠图模板成功，继续处理图片');
          return this.processImageWithKoutu(imageUrl, fileID);
        })
        .catch(err => {
          console.error('重新获取抠图模板失败:', err);
          closetUtils.hideLoading();
          this.setData({
            isUploading: false
          });
          closetUtils.showErrorToast('处理失败，请重试');
          return Promise.reject(err);
        });
    }
    
    return imageProcessor.processImageWithKoutu(imageUrl, this.data.templatePath)
      .then(processedImageUrl => {
        // 分析衣物
        return this.analyzeClothing(processedImageUrl, imageUrl, fileID);
      })
      .catch(err => {
        console.error('抠图处理失败:', err);
        this.handleKoutuError();
        return Promise.reject(err);
      });
  },
  
  // 分析衣物 - 原始方法
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
        
        // 强制刷新临时URL缓存，确保能立即看到新上传的衣服
        this.forceRefreshImageURLs();
        
        // 更新衣物列表，并强制更新类别数量
        this.loadClothes(true, true);
      })
      .catch(err => {
        console.error('分析或保存失败:', err);
        this.handleAnalysisError();
      });
  },
});
