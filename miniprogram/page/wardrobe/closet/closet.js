// page/wardrobe/closet/closet.js
Page({
  data: {
    // 定义颜色常量
    colors: {
      darkBrown: '#56513E',      // 深棕色（导航栏背景）
      darkOlive: '#3B3A30',      // 深橄榄绿（文字和图标）
      lightTaupe: '#BEB8A7',     // 浅灰褐色（页面背景和次要元素）
      mediumBrown: '#B38A63',    // 中棕色（卡片背景和强调元素）
      darkCoffee: '#473B29',     // 深咖啡色（分割线和次要文字）
    },
    // 分页相关
    currentPage: 1,             // 当前页码
    itemsPerPage: 12,           // 每页显示的衣物数量
    totalPages: 1,              // 总页数
    
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
    showAddOptions: false,       // 是否显示添加选项
    isUploading: false,          // 是否正在上传
    isLoading: true,             // 是否正在加载
    userOpenId: '',              // 存储用户的openid
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
    
    // 初始化卡片位置
    this.initCardPositions();
    
    // 获取用户OpenID
    this.getUserOpenId();
  },
  
  onShow: function() {
    // 如果已经有OpenID，刷新衣物列表
    if (this.data.userOpenId) {
      this.getClothes();
    }
  },
  
  // 初始化卡片位置和可见性
  initCardPositions: function() {
    const categories = this.data.categories;
    const cardCount = categories.length;
    const cards = [];
    
    for (let i = 0; i < cardCount; i++) {
      // 计算每张卡片相对于当前卡片的位置
      const relativePos = i - this.data.currentIndex;
      
      // 只显示当前卡片前后各2张卡片
      const visible = Math.abs(relativePos) <= 2;
      
      // 计算卡片的X轴偏移量
      const translateX = relativePos * 60;
      
      // 计算z-index，确保当前卡片在最上层
      const zIndex = 10 - Math.abs(relativePos);
      
      cards.push({
        visible: visible,
        translateX: translateX,
        zIndex: zIndex
      });
    }
    
    this.setData({ cards });
  },
  
  // 更新卡片位置
  updateCardPositions: function() {
    const categories = this.data.categories;
    const cardCount = categories.length;
    const cards = this.data.cards.slice(); // 创建cards数组的副本
    
    for (let i = 0; i < cardCount; i++) {
      // 计算每张卡片相对于当前卡片的位置
      const relativePos = i - this.data.currentIndex;
      
      // 只显示当前卡片前后各2张卡片
      const visible = Math.abs(relativePos) <= 2;
      
      // 计算卡片的X轴偏移量
      const translateX = relativePos * 60;
      
      // 计算z-index，确保当前卡片在最上层
      const zIndex = 10 - Math.abs(relativePos);
      
      cards[i] = {
        visible: visible,
        translateX: translateX,
        zIndex: zIndex
      };
    }
    
    this.setData({ cards });
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
      // 获取到OpenID后，获取衣物列表
      that.getClothes();
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
          
          // 获取到OpenID后，再获取衣物列表
          that.getClothes();
        } else {
          // 模拟数据以便测试
          that.simulateData();
        }
      },
      fail: err => {
        console.error('云函数调用失败:', err);
        // 模拟数据以便测试
        that.simulateData();
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },
  
  // 模拟数据用于测试
  simulateData: function() {
    console.log('使用模拟数据测试界面');
    
    const categories = this.data.categories.map(cat => {
      return { ...cat, count: Math.floor(Math.random() * 10) + 1 };
    });
    
    categories[0].count = categories.slice(1).reduce((sum, cat) => sum + cat.count, 0);
    
    const mockClothes = [];
    for (let i = 0; i < 20; i++) {
      const catIndex = Math.floor(Math.random() * 6) + 1;
      mockClothes.push({
        _id: 'mock_' + i,
        name: '模拟衣物 ' + i,
        category: categories[catIndex].category,
        color: ['红色', '蓝色', '黑色', '白色', '灰色'][Math.floor(Math.random() * 5)],
        style: ['休闲', '正式', '运动', '户外'][Math.floor(Math.random() * 4)]
      });
    }
    
    this.setData({
      categories: categories,
      clothes: mockClothes,
      isLoading: false
    });
    
    this.initCardPositions();
  },
  
  // 获取衣物列表
  getClothes: function() {
    // 如果没有获取到用户OpenID，不进行数据获取
    if (!this.data.userOpenId) {
      console.log('未获取到用户OpenID，无法获取衣物列表');
      return;
    }
    
    const db = wx.cloud.database();
    const clothesCollection = db.collection('clothes');
    
    this.setData({
      isLoading: true
    });
    
    console.log('开始获取衣物列表，用户OpenID:', this.data.userOpenId);
    
    // 从云数据库获取当前用户的衣物列表
    clothesCollection
      .where({}) // 先不加筛选条件，获取所有衣物
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        console.log('获取衣物列表成功', res);
        
        // 过滤当前用户的衣物
        let myClothes = res.data;
        console.log('衣物总数量:', myClothes.length);
        
        // 统计各类别的数量
        this.calculateCategoryCounts(myClothes);
        
        this.setData({
          clothes: myClothes,
          isLoading: false
        });
        
        // 下载所有衣物图片
        this.downloadClothesImages(myClothes);
      })
      .catch(err => {
        console.error('获取衣物列表失败', err);
        
        // 出错时使用模拟数据
        this.simulateData();
        
        wx.showToast({
          title: '加载失败，使用测试数据',
          icon: 'none'
        });
      });
  },
  
  // 统计各类别衣物数量
  calculateCategoryCounts: function(clothes) {
    // 复制一份类别数组，以便更新数量
    const categories = this.data.categories.map(cat => {
      return { ...cat, count: 0 };
    });
    
    // 设置总数
    categories[0].count = clothes.length;
    
    // 计算各个类别的数量
    clothes.forEach(item => {
      for (let i = 1; i < categories.length; i++) {
        if (item.category === categories[i].category) {
          categories[i].count++;
          break;
        }
      }
    });
    
    this.setData({ categories });
  },
  
  // 下载衣物图片
  downloadClothesImages: function(clothes) {
    if (!clothes || clothes.length === 0) {
      console.log('没有衣物数据，显示空状态');
      this.setData({
        clothes: [],
        filteredClothes: [],
        currentPageClothes: [],
        isLoading: false
      });
      return;
    }
    
    // 收集所有非空的fileID
    const fileIDs = clothes.map(item => item.fileID).filter(fileID => fileID);
    console.log('需要处理的图片数量:', fileIDs.length);
    
    if (fileIDs.length === 0) {
      console.log('没有图片需要加载，直接显示衣物');
      this.setData({
        clothes: clothes,
        isLoading: false
      });
      return;
    }
    
    // 获取临时URL
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: res => {
        console.log('获取临时链接成功', res);
        
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
        
        console.log('处理后的衣物数据:', updatedClothes.length);
        
        this.setData({
          clothes: updatedClothes,
          isLoading: false
        });
        
        // 初始化时，如果有选中的类别，重新应用过滤
        if (this.data.selectedCategory) {
          this.filterClothesByCategory(this.data.selectedCategory);
        }
      },
      fail: err => {
        console.error('获取临时链接失败', err);
        
        // 如果失败，仍然显示衣物，但不显示图片
        const updatedClothes = clothes.map(cloth => {
          return {...cloth, tempImageUrl: ''};
        });
        
        this.setData({
          clothes: updatedClothes,
          isLoading: false
        });
        
        // 初始化时，如果有选中的类别，重新应用过滤
        if (this.data.selectedCategory) {
          this.filterClothesByCategory(this.data.selectedCategory);
        }
      }
    });
  },
  
  // 滑动卡片到下一个
  slideNext: function() {
    let nextIndex = this.data.currentIndex + 1;
    if (nextIndex >= this.data.categories.length) {
      nextIndex = 0;
    }
    
    this.setData({
      currentIndex: nextIndex
    }, () => {
      this.updateCardPositions();
    });
  },

  // 滑动卡片到上一个
  slidePrev: function() {
    let prevIndex = this.data.currentIndex - 1;
    if (prevIndex < 0) {
      prevIndex = this.data.categories.length - 1;
    }
    
    this.setData({
      currentIndex: prevIndex
    }, () => {
      this.updateCardPositions();
    });
  },

  // 点击卡片，展示衣物详情
  onCardTap: function(e) {
    const index = e.currentTarget.dataset.index;
    if (index === this.data.currentIndex) {
      const selectedCategory = this.data.categories[index];
      // 根据类别筛选衣物
      this.filterClothesByCategory(selectedCategory);
      
      this.setData({
        selectedCategory: selectedCategory
      });
    } else {
      // 如果点击的不是当前卡片，则将其设为当前卡片
      this.setData({
        currentIndex: index
      }, () => {
        this.updateCardPositions();
      });
    }
  },
  
  // 关闭详情视图
  closeDetail: function() {
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
    // 阻止点击事件冒泡
  },
  
  // 根据类别筛选衣物
  filterClothesByCategory: function(category) {
    let filtered;
    if (category.id === 0) {
      // 全部衣物
      filtered = this.data.clothes;
    } else {
      // 按类别筛选
      filtered = this.data.clothes.filter(item => item.category === category.category);
    }
    
    // 计算总页数
    const totalPages = Math.ceil(filtered.length / this.data.itemsPerPage);
    
    this.setData({
      filteredClothes: filtered,
      totalPages: totalPages || 1,  // 确保至少有1页
      currentPage: 1                // 重置为第1页
    });
    
    // 应用分页
    this.applyPagination();
  },
  
  // 应用分页逻辑，获取当前页的衣物
  applyPagination: function() {
    const { filteredClothes, currentPage, itemsPerPage } = this.data;
    
    // 计算当前页的起始和结束索引
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    
    // 获取当前页的衣物
    const currentPageClothes = filteredClothes.slice(startIndex, endIndex);
    
    this.setData({
      currentPageClothes: currentPageClothes
    });
  },
  
  // 前往下一页
  goToNextPage: function() {
    if (this.data.currentPage < this.data.totalPages) {
      this.setData({
        currentPage: this.data.currentPage + 1
      }, () => {
        this.applyPagination();
      });
    }
  },
  
  // 前往上一页
  goToPrevPage: function() {
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
  
  // 查看衣物详情
  viewClothesDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    console.log('查看衣物详情:', id);
    
    // 由于当前环境可能无法跳转页面，所以先给出提示
    wx.showToast({
      title: '查看衣物详情: ' + id,
      icon: 'none'
    });
    
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
    
    wx.showToast({
      title: '拍照添加衣物功能',
      icon: 'none'
    });
    
    // 实际代码中应该调用chooseMedia API并处理上传
  },
  
  // 通过相册添加衣物
  addByAlbum: function() {
    this.hideAddOptions();
    
    wx.showToast({
      title: '从相册添加衣物功能',
      icon: 'none'
    });
    
    // 实际代码中应该调用chooseMedia API并处理上传
  },
  
  // 通过URL添加衣物
  addByUrl: function() {
    this.hideAddOptions();
    
    wx.showToast({
      title: '手动添加衣物功能',
      icon: 'none'
    });
    
    // 实际代码中应该跳转到添加页面
  }
})
