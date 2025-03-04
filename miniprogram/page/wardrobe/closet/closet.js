// page/wardrobe/closet/closet.js
const colors = require('../../../util/colors');
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
    pageSize: 12,           // 每页显示的衣物数量
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
    showAddOptions: false,       // 是否显示添加选项
    isUploading: false,          // 是否正在上传
    isLoading: true,             // 是否正在加载
    userOpenId: '',              // 存储用户的openid
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
    
    // 初始化卡片位置
    this.initCardPositions();
    
    // 获取用户OpenID
    this.getUserOpenId();
    
    // 初始化页面
    this.loadClothes();
    
    // 确保抠图模板文件在用户目录中可用
    this.ensureKoutuTemplate();
  },
  
  onShow: function() {
    // 如果已经有OpenID，刷新衣物列表
    if (this.data.userOpenId) {
      this.checkAndRefreshTempUrls();
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
      
      // 全部卡片都应该可见，只是通过transform移出可视区域
      const visible = true;
      
      // 计算卡片的X轴偏移量
      const translateX = relativePos * 120; // 增加偏移量，使卡片间距更大
      
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
      .where({
        _openid: this.data.userOpenId // 使用用户OpenID过滤，确保只获取当前用户的衣物
      })
      .orderBy('createTime', 'desc')
      .get()
      .then(res => {
        console.log('获取衣物列表成功', res);
        
        // 获取当前用户的衣物
        let myClothes = res.data;
        console.log('当前用户衣物总数量:', myClothes.length);
        
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
    // 过滤出需要获取临时链接的文件ID
    const fileList = clothes
      .filter(item => item.fileID && !item.tempImageUrl)
      .map(item => item.fileID);
    
    if (fileList.length === 0) {
      return;
    }
    
    // 获取临时链接
    wx.cloud.getTempFileURL({
      fileList: fileList,
      success: res => {
        if (res.fileList && res.fileList.length > 0) {
          // 更新衣物的临时链接
          const updatedClothes = clothes.map(item => {
            const fileInfo = res.fileList.find(file => file.fileID === item.fileID);
            if (fileInfo && fileInfo.tempFileURL) {
              item.tempImageUrl = fileInfo.tempFileURL;
              // 记录临时链接的获取时间
              item.tempUrlUpdateTime = Date.now();
            }
            return item;
          });
          
          // 更新所有相关的数据
          this.setData({
            clothes: updatedClothes,
            filteredClothes: updatedClothes,
            currentPageClothes: updatedClothes.slice(
              (this.data.currentPage - 1) * this.data.pageSize,
              this.data.currentPage * this.data.pageSize
            ),
            lastImageUrlUpdateTime: Date.now()
          });
        }
      },
      fail: err => {
        console.error('获取临时链接失败:', err);
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
  preventClose: function(e) {
    // 阻止事件冒泡
    return;
  },
  
  // 根据类别筛选衣物
  filterClothesByCategory: function(category) {
    // 设置选中类别并重置页码
    this.setData({
      selectedCategory: category,
      currentPage: 1  // 重置为第1页
    });
    
    // 重新加载服务器数据
    this.loadClothes();
  },
  
  // 应用分页逻辑，重新从服务器加载当前页数据
  applyPagination: function() {
    // 直接重新加载当前页的数据
    this.loadClothes();
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
    
    // 调用相机API拍照
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        wx.showLoading({
          title: '开始处理...',
        });
        
        const tempFilePath = res.tempFiles[0].tempFilePath;
        console.log('拍摄的图片:', tempFilePath);
        
        // 创建处理任务
        this.createClothingTask(tempFilePath, 'camera');
      },
      fail: (err) => {
        console.error('拍照失败:', err);
        wx.showToast({
          title: '拍照失败',
          icon: 'none'
        });
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
        wx.showLoading({
          title: '开始处理...',
        });
        
        const tempFilePath = res.tempFiles[0].tempFilePath;
        console.log('选择的图片:', tempFilePath);
        
        // 创建处理任务
        this.createClothingTask(tempFilePath, 'album');
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
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
          wx.showLoading({
            title: '开始处理...',
          });
          
          const imageUrl = res.content.trim();
          // 创建处理任务
          this.createClothingTask(imageUrl, 'url');
        }
      }
    });
  },
  
  // 创建衣物处理任务
  createClothingTask: function(imagePath, sourceType) {
    // 调用云函数创建任务
    wx.cloud.callFunction({
      name: 'createClothingTask',
      data: {
        imagePath: imagePath,
        sourceType: sourceType,
        userOpenId: this.data.userOpenId
      },
      success: (res) => {
        console.log('创建任务成功:', res);
        if (res.result && res.result.taskId) {
          // 开始轮询任务状态
          this.pollTaskStatus(res.result.taskId);
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '创建任务失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('创建任务失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '创建任务失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 轮询任务状态
  pollTaskStatus: function(taskId) {
    // 设置轮询间隔（3秒）
    const pollInterval = 3000;
    let pollCount = 0;
    const maxPolls = 20; // 最多轮询20次（1分钟）
    
    const checkStatus = () => {
      if (pollCount >= maxPolls) {
        wx.hideLoading();
        wx.showToast({
          title: '处理超时，请重试',
          icon: 'none'
        });
        return;
      }
      
      wx.cloud.callFunction({
        name: 'getClothingTaskStatus',
        data: {
          taskId: taskId
        },
        success: (res) => {
          console.log('任务状态:', res);
          if (res.result && res.result.status) {
            switch (res.result.status) {
              case 'completed':
                // 任务完成，刷新衣物列表
                wx.hideLoading();
                wx.showToast({
                  title: '添加成功',
                  icon: 'success'
                });
                this.loadClothes();
                break;
              
              case 'failed':
                // 任务失败
                wx.hideLoading();
                wx.showToast({
                  title: res.result.error || '处理失败',
                  icon: 'none'
                });
                break;
              
              case 'processing':
                // 更新加载提示
                wx.showLoading({
                  title: res.result.progress || '处理中...',
                });
                // 继续轮询
                pollCount++;
                setTimeout(checkStatus, pollInterval);
                break;
              
              default:
                wx.hideLoading();
                wx.showToast({
                  title: '未知状态',
                  icon: 'none'
                });
            }
          } else {
            wx.hideLoading();
            wx.showToast({
              title: '获取状态失败',
              icon: 'none'
            });
          }
        },
        fail: (err) => {
          console.error('获取任务状态失败:', err);
          wx.hideLoading();
          wx.showToast({
            title: '获取状态失败',
            icon: 'none'
          });
        }
      });
    };
    
    // 开始轮询
    checkStatus();
  },
  
  // 确保抠图模板文件可用
  ensureKoutuTemplate: function() {
    const fs = wx.getFileSystemManager();
    const templatePath = `${wx.env.USER_DATA_PATH}/koutu.json`;
    
    // 检查文件是否已存在
    fs.access({
      path: templatePath,
      success: () => {
        console.log('抠图模板已存在');
      },
      fail: () => {
        console.log('抠图模板不存在，从项目中复制');
        
        // 从项目文件中读取模板
        fs.readFile({
          filePath: 'miniprogram/page/wardrobe/closet/koutu.json',
          encoding: 'utf-8',
          success: (res) => {
            // 写入到用户目录
            fs.writeFile({
              filePath: templatePath,
              data: res.data,
              encoding: 'utf-8',
              success: () => {
                console.log('抠图模板复制成功');
              },
              fail: (writeErr) => {
                console.error('写入抠图模板失败:', writeErr);
              }
            });
          },
          fail: (readErr) => {
            console.error('读取项目抠图模板失败:', readErr);
            
            // 尝试从网络获取模板
            this.downloadKoutuTemplate();
          }
        });
      }
    });
  },
  
  // 从网络下载抠图模板
  downloadKoutuTemplate: function() {
    const fs = wx.getFileSystemManager();
    const templatePath = `${wx.env.USER_DATA_PATH}/koutu.json`;
    
    wx.request({
      url: 'https://raw.githubusercontent.com/user/repo/main/koutu.json',
      success: (res) => {
        if (res.data) {
          // 写入到用户目录
          fs.writeFile({
            filePath: templatePath,
            data: JSON.stringify(res.data),
            encoding: 'utf-8',
            success: () => {
              console.log('从网络下载抠图模板成功');
            },
            fail: (writeErr) => {
              console.error('写入网络抠图模板失败:', writeErr);
            }
          });
        }
      },
      fail: (err) => {
        console.error('从网络获取抠图模板失败:', err);
      }
    });
  },
  
  // 加载衣物列表
  loadClothes: function() {
    wx.showLoading({
      title: '加载中...',
    });
    
    const db = wx.cloud.database();
    const _ = db.command;
    
    // 构建查询条件
    let query = {
      _openid: this.data.userOpenId // 确保只获取当前用户的衣物
    };
    
    // 按类别筛选
    if (this.data.selectedCategory && this.data.selectedCategory.category && this.data.selectedCategory.id !== 0) {
      query.category = this.data.selectedCategory.category;
    }
    
    // 分页查询
    const skip = (this.data.currentPage - 1) * this.data.pageSize;
    
    // 首先获取符合条件的总数
    db.collection('clothes')
      .where(query)
      .count()
      .then(countRes => {
        const totalClothes = countRes.total;
        const totalPages = Math.ceil(totalClothes / this.data.pageSize) || 1; // 计算总页数，确保至少有1页
        
        // 然后获取当前页数据
        return db.collection('clothes')
          .where(query)
          .skip(skip)
          .limit(this.data.pageSize)
          .orderBy('createTime', 'desc')
          .get()
          .then(res => {
            wx.hideLoading();
            
            console.log('查询到的衣物:', res.data);
            
            // 处理衣物数据
            const clothes = res.data.map(item => {
              return {
                _id: item._id,
                name: item.name,
                fileID: item.imageFileID,
                tempImageUrl: '', // 先设置为空，后面会获取临时URL
                category: item.category,
                type: item.type,
                color: item.color,
                style: item.style,
                warmthLevel: item.warmthLevel,
                scenes: item.scenes
              };
            });
            
            this.setData({
              clothes: clothes,
              filteredClothes: clothes, // 同时更新过滤后的衣物列表
              currentPageClothes: clothes, // 直接使用服务器返回的当前页数据
              totalClothes: totalClothes,
              totalPages: totalPages
            });
            
            // 下载所有衣物图片
            this.downloadClothesImages(clothes);
          });
      })
      .catch(err => {
        wx.hideLoading();
        console.error('查询衣物失败:', err);
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
  },
  
  // 切换类别
  changeCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    
    this.setData({
      selectedCategory: category,
      currentPage: 1  // 切换类别时重置为第一页
    }, () => {
      this.loadClothes();
    });
  },
  
  // 应用分页
  applyPagination: function() {
    this.loadClothes();
  },
  
  // 下一页
  nextPage: function() {
    const totalPages = Math.ceil(this.data.totalClothes / this.data.pageSize);
    if (this.data.currentPage < totalPages) {
      this.setData({
        currentPage: this.data.currentPage + 1
      }, () => {
        this.applyPagination();
      });
    }
  },
  
  // 上一页
  prevPage: function() {
    if (this.data.currentPage > 1) {
      this.setData({
        currentPage: this.data.currentPage - 1
      }, () => {
        this.applyPagination();
      });
    }
  },
  
  // 处理图片加载错误
  handleImageError: function(e) {
    const index = e.currentTarget.dataset.index;
    const clothes = this.data.currentPageClothes;
    const item = clothes[index];
    
    console.log('图片加载失败:', item);
    
    // 如果是使用临时链接失败，尝试使用 fileID
    if (item.tempImageUrl && item.fileID) {
      console.log('尝试使用fileID');
      // 更新所有相关数据中的临时链接
      const updatedClothes = this.data.clothes.map(c => {
        if (c._id === item._id) {
          c.tempImageUrl = '';
        }
        return c;
      });
      
      this.setData({
        clothes: updatedClothes,
        filteredClothes: updatedClothes,
        currentPageClothes: updatedClothes.slice(
          (this.data.currentPage - 1) * this.data.pageSize,
          this.data.currentPage * this.data.pageSize
        )
      });
      return;
    }
    
    // 如果 fileID 也失败了，尝试重新获取临时链接
    if (item.fileID) {
      console.log('尝试刷新临时链接');
      wx.cloud.getTempFileURL({
        fileList: [item.fileID],
        success: res => {
          if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
            // 更新所有相关数据中的临时链接
            const updatedClothes = this.data.clothes.map(c => {
              if (c._id === item._id) {
                c.tempImageUrl = res.fileList[0].tempFileURL;
              }
              return c;
            });
            
            this.setData({
              clothes: updatedClothes,
              filteredClothes: updatedClothes,
              currentPageClothes: updatedClothes.slice(
                (this.data.currentPage - 1) * this.data.pageSize,
                this.data.currentPage * this.data.pageSize
              )
            });
          }
        }
      });
    }
  },
  
  // 检查并刷新临时链接
  checkAndRefreshTempUrls: function() {
    const now = Date.now();
    const TWO_HOURS = 2 * 60 * 60 * 1000; // 2小时的毫秒数
    
    // 如果距离上次更新未超过2小时，不进行刷新
    if (this.data.lastImageUrlUpdateTime && (now - this.data.lastImageUrlUpdateTime) < TWO_HOURS) {
      return;
    }
    
    // 重新获取当前页面衣物的临时链接
    this.downloadClothesImages(this.data.currentPageClothes);
  },
})
