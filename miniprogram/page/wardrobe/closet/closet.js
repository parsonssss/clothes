// page/wardrobe/closet/closet.js
const colors = require('../../../util/colors');

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
  preventClose: function(e) {
    // 阻止事件冒泡
    return;
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
    const totalPages = Math.ceil(filtered.length / this.data.pageSize);
    
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
    const { filteredClothes, currentPage, pageSize } = this.data;
    
    // 计算当前页的起始和结束索引
    const startIndex = (currentPage - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
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
    
    // 调用相机API拍照
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      success: (res) => {
        wx.showLoading({
          title: '处理中...',
        });
        
        const tempFilePath = res.tempFiles[0].tempFilePath;
        console.log('拍摄的图片:', tempFilePath);
        
        // 上传图片到云存储
        this.uploadImageToCloud(tempFilePath);
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
          title: '处理中...',
        });
        
        const tempFilePath = res.tempFiles[0].tempFilePath;
        console.log('选择的图片:', tempFilePath);
        
        // 上传图片到云存储
        this.uploadImageToCloud(tempFilePath);
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
            title: '处理中...',
          });
          
          const imageUrl = res.content.trim();
          // 直接使用URL进行抠图处理
          this.processImageWithKoutu(imageUrl);
        }
      }
    });
  },
  
  // 上传图片到云存储
  uploadImageToCloud: function(filePath) {
    const cloudPath = `clothing_images/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: (res) => {
        console.log('上传成功:', res);
        const fileID = res.fileID;
        
        // 获取临时访问链接
        this.getTempFileURL(fileID);
      },
      fail: (err) => {
        console.error('上传失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '上传失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 获取文件临时URL
  getTempFileURL: function(fileID) {
    wx.cloud.callFunction({
      name: 'getTempFileURL',
      data: {
        fileIdList: [fileID]
      },
      success: (res) => {
        console.log('获取临时URL成功:', res);
        if (res.result && res.result.length > 0) {
          const tempFileURL = res.result[0].tempFileURL;
          
          // 使用临时URL进行抠图处理
          this.processImageWithKoutu(tempFileURL);
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '获取图片链接失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        console.error('获取临时URL失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '获取图片链接失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 调用抠图API处理图片
  processImageWithKoutu: function(imageUrl) {
    // 获取抠图API请求模板
    const fs = wx.getFileSystemManager();
    
    fs.readFile({
      filePath: `${wx.env.USER_DATA_PATH}/koutu.json`,
      encoding: 'utf-8',
      success: (res) => {
        try {
          // 解析模板
          const koutuTemplate = JSON.parse(res.data);
          
          // 替换URL
          koutuTemplate.prompt["27"].inputs.image = imageUrl;
          
          // 向抠图API发送请求
          this.sendKoutuRequest(koutuTemplate, imageUrl);
        } catch (error) {
          console.error('解析koutu.json失败:', error);
          this.handleKoutuError();
        }
      },
      fail: (err) => {
        console.error('读取koutu.json失败:', err);
        
        // 尝试从网络资源加载模板
        wx.request({
          url: 'https://raw.githubusercontent.com/user/repo/main/koutu.json',
          success: (res) => {
            try {
              const koutuTemplate = res.data;
              koutuTemplate.prompt["27"].inputs.image = imageUrl;
              this.sendKoutuRequest(koutuTemplate, imageUrl);
            } catch (error) {
              console.error('解析网络模板失败:', error);
              this.handleKoutuError();
            }
          },
          fail: () => {
            this.handleKoutuError();
          }
        });
      }
    });
  },
  
  // 发送抠图请求
  sendKoutuRequest: function(requestBody, originalImageUrl) {
    wx.request({
      url: 'https://wp05.unicorn.org.cn:14427/api/prompt',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: requestBody,
      success: (res) => {
        console.log('抠图请求成功:', res);
        if (res.data && res.data.prompt_id) {
          // 获取抠图结果
          this.getKoutuResult(res.data.prompt_id, originalImageUrl);
        } else {
          this.handleKoutuError();
        }
      },
      fail: (err) => {
        console.error('抠图请求失败:', err);
        this.handleKoutuError();
      }
    });
  },
  
  // 获取抠图结果
  getKoutuResult: function(promptId, originalImageUrl) {
    // 轮询获取结果，实际项目中可能需要更复杂的处理
    const checkResult = () => {
      wx.request({
        url: `https://wp05.unicorn.org.cn:14427/history/${promptId}`,
        method: 'GET',
        header: {
        },
        success: (res) => {
          console.log('获取抠图结果:', res);
          // 确保res.data存在且不为空
          if (res.data && Object.keys(res.data).length > 0) {
            // 从输出数据中获取图片信息
            if (res.data.outputs && Array.isArray(res.data.outputs)) {
              const outputData = res.data.outputs.find(item => item.type === 'output');
              if (outputData && outputData.filename && outputData.subfolder !== undefined) {
                // 构建图片URL
                const imageUrl = `https://wp05.unicorn.org.cn:14427/view?filename=${outputData.filename}&subfolder=${outputData.subfolder}&type=${outputData.type || 'output'}`;
                console.log('构建的图片URL:', imageUrl);
                // 直接使用构建的URL下载图片
                this.downloadKoutuResult(imageUrl, originalImageUrl);
              } else {
                console.error('输出数据格式不正确:', res.data.outputs);
                this.handleKoutuError();
              }
            } else {
              console.error('无效的输出数据:', res.data.outputs);
              this.handleKoutuError();
            }
          } else if (res.data && res.data.status === 'failed') {
            this.handleKoutuError();
          } else {
            // 继续轮询
            setTimeout(checkResult, 2000);
          }
        },
        fail: (err) => {
          console.error('获取抠图结果失败:', err);
          this.handleKoutuError();
        }
      });
    };
    
    checkResult();
  },
  
  // 下载抠图结果
  downloadKoutuResult: function(outputUrl, originalImageUrl) {
    
    wx.downloadFile({
      url: outputUrl,
      success: (res) => {
        if (res.statusCode === 200) {
          const tempFilePath = res.tempFilePath;
          
          // 上传抠图结果到云存储
          const cloudPath = `clothing_processed/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
          
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath,
            success: (uploadRes) => {
              const fileID = uploadRes.fileID;
              
              // 分析衣物
              this.analyzeClothing(fileID, originalImageUrl);
            },
            fail: (err) => {
              console.error('上传抠图结果失败:', err);
              this.handleKoutuError();
            }
          });
        } else {
          this.handleKoutuError();
        }
      },
      fail: (err) => {
        console.error('下载抠图结果失败:', err);
        this.handleKoutuError();
      }
    });
  },
  
  // 分析衣物
  analyzeClothing: function(fileID, originalImageUrl) {
    // 获取临时URL用于分析
    wx.cloud.getTempFileURL({
      fileList: [fileID],
      success: (res) => {
        if (res.fileList && res.fileList[0] && res.fileList[0].tempFileURL) {
          const imageUrl = res.fileList[0].tempFileURL;
          
          // 调用云函数分析衣物
          wx.cloud.callFunction({
            name: 'analyzeClothing',
            data: {
              imageUrl: imageUrl
            },
            success: (analysisRes) => {
              console.log('分析结果:', analysisRes);
              
              if (analysisRes.result && analysisRes.result.success) {
                // 保存到数据库
                this.saveClothingToDatabase(fileID, originalImageUrl, analysisRes.result.data);
              } else {
                this.handleAnalysisError();
              }
            },
            fail: (err) => {
              console.error('分析衣物失败:', err);
              this.handleAnalysisError();
            }
          });
        } else {
          this.handleAnalysisError();
        }
      },
      fail: (err) => {
        console.error('获取分析图片URL失败:', err);
        this.handleAnalysisError();
      }
    });
  },
  
  // 保存衣物到数据库
  saveClothingToDatabase: function(fileID, originalImageUrl, analysisData) {
    const db = wx.cloud.database();
    
    // 创建新衣物记录
    const clothingData = {
      name: analysisData.name || '新衣物',
      imageFileID: fileID,
      originalImageUrl: originalImageUrl,
      category: analysisData.category || '未分类',
      type: analysisData.clothing_type || '未知',
      color: analysisData.color || '未知',
      style: analysisData.style || '未知',
      warmthLevel: analysisData.warmth_level || 3,
      scenes: analysisData.scene_applicability || ['休闲'],
      createTime: db.serverDate()
    };
    
    db.collection('clothes').add({
      data: clothingData,
      success: (res) => {
        console.log('保存衣物成功:', res);
        wx.hideLoading();
        wx.showToast({
          title: '添加衣物成功',
          icon: 'success'
        });
        
        // 重新加载衣物列表
        this.loadClothes();
      },
      fail: (err) => {
        console.error('保存衣物失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '保存失败',
          icon: 'none'
        });
      }
    });
  },
  
  // 处理抠图错误
  handleKoutuError: function() {
    wx.hideLoading();
    wx.showToast({
      title: '抠图处理失败',
      icon: 'none'
    });
  },
  
  // 处理分析错误
  handleAnalysisError: function() {
    wx.hideLoading();
    wx.showToast({
      title: '分析衣物失败',
      icon: 'none'
    });
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
    let query = {};
    
    // 按类别筛选
    if (this.data.selectedCategory !== '全部') {
      query.category = this.data.selectedCategory;
    }
    
    // 分页查询
    const skip = (this.data.currentPage - 1) * this.data.pageSize;
    
    // 首先获取符合条件的总数
    db.collection('clothes')
      .where(query)
      .count()
      .then(countRes => {
        const totalClothes = countRes.total;
        
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
                id: item._id,
                name: item.name,
                imageUrl: item.imageFileID,
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
              totalClothes: totalClothes
            });
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
})
