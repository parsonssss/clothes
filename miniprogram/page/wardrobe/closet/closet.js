// page/wardrobe/closet/closet.js
Page({
  data: {
    currentCategory: '全部',
    categories: ['全部', '上衣', '裤子', '裙子', '外套', '鞋子', '配饰'],
    clothes: [],
    filteredClothes: [],
    showAddOptions: false,
    isUploading: false,
    isLoading: true,
    scrollHeight: 0,
    categoriesHeight: 50, // 调整默认高度值
    lastUrlRefreshTime: 0, // 最后一次更新图片URL的时间
    leaveTime: null, // 记录页面离开时间
    userOpenId: '' // 存储用户的openid
  },
  
  onLoad: function() {
    // 初始化云环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        // env: 'your-env-id', // 默认环境，也可以在云开发控制台手动指定
        env: 'cloud1-3gi97kso9ab01185',
        traceUser: true,
      });
    }
    
    // 获取用户OpenID
    this.getUserOpenId();
    
    // 获取窗口高度，用于设置滚动区域高度
    this.setScrollHeight();
  },
  
  onShow: function() {
    // 如果已经有OpenID，刷新衣物列表
    if (this.data.userOpenId) {
      this.getClothes();
    }
    
    // 检查并更新临时URL
    this.checkAndRefreshUrls();
    
    // 如果有记录离开时间，并且离开超过10分钟，立即刷新
    if (this.data.leaveTime) {
      const now = Date.now();
      const tenMinutesInMs = 10 * 60 * 1000;
      
      if (now - this.data.leaveTime > tenMinutesInMs) {
        console.log('页面重新显示，已离开超过10分钟，立即刷新图片');
        this.checkAndRefreshUrls();
      }
      
      // 清除离开时间记录
      this.data.leaveTime = null;
    }
  },
  
  // 添加定时器，确保即使在后台也能定期刷新
  onHide: function() {
    // 记录离开时间
    this.data.leaveTime = Date.now();
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
          // 如果没有获取到openid，尝试使用数据库模拟访问方式获取openid
          that.getOpenIDbyDBAccess();
        }
      },
      fail: err => {
        console.error('云函数调用失败:', err);
        // 如果云函数失败，尝试数据库模拟访问方式
        that.getOpenIDbyDBAccess();
      },
      complete: () => {
        wx.hideLoading();
      }
    });
  },
  
  // 通过数据库模拟访问的方式获取openid
  getOpenIDbyDBAccess: function() {
    const that = this;
    const db = wx.cloud.database();
    
    // 创建一个临时集合，利用云开发自动为其添加_openid的特性
    const tempCollection = db.collection('userOpenID');
    
    // 添加一条记录，然后立即查询出来
    tempCollection.add({
      data: {
        timestamp: db.serverDate()
      }
    }).then(res => {
      // 添加成功后，查询该记录获取_openid
      return tempCollection.doc(res._id).get();
    }).then(res => {
      const openid = res.data._openid;
      console.log('通过数据库获取到OpenID:', openid);
      
      // 存入本地缓存
      wx.setStorageSync('openid', openid);
      
      that.setData({
        userOpenId: openid
      });
      
      // 获取到OpenID后，获取衣物列表
      that.getClothes();
      
      // 删除初创建的文档，避免留下多余记录
      tempCollection.doc(res._id).remove();
    }).catch(err => {
      console.error('通过数据库获取OpenID失败:', err);
      wx.showToast({
        title: '用户登录失败',
        icon: 'none'
      });
      
      // 如果所有尝试都失败，使用一个模拟的测试ID来测试功能
      const testOpenId = 'test_user_' + Date.now();
      console.log('使用测试OpenID:', testOpenId);
      
      that.setData({
        userOpenId: testOpenId
      });
      
      that.getClothes();
    });
  },
  
  // 设置滚动区域高度
  setScrollHeight: function() {
    const that = this;
    const query = wx.createSelectorQuery();
    
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    
    // 首先获取分类栏的高度
    query.select('.categories').boundingClientRect(function(categoriesRect) {
      if (!categoriesRect) {
        // 如果获取失败，使用默认值
        console.log('获取分类栏高度失败，使用默认值');
        return;
      }
      
      // 存储分类栏实际高度便于计算
      that.setData({
        categoriesHeight: Math.ceil(categoriesRect.height)
      });
      
      console.log('Categories actual height:', categoriesRect.height);
    }).exec();
  },
  
  // 检查是否需要更新临时URL
  checkAndRefreshUrls: function() {
    const now = Date.now();
    const tenMinutesInMs = 10 * 60 * 1000; // 10分钟的毫秒数
    
    // 如果距离上次更新超过10分钟或首次加载，则更新URL
    if (now - this.data.lastUrlRefreshTime > tenMinutesInMs) {
      console.log('更新临时URL，距离上次更新时间：', (now - this.data.lastUrlRefreshTime) / 1000, '秒');
      this.setData({
        lastUrlRefreshTime: now
      });
      
      // 如果有衣物数据，重新获取临时URL
      if (this.data.clothes && this.data.clothes.length > 0) {
        this.refreshClothesImages(this.data.clothes);
      }
    }
  },
  
  // 更新衣物图片的临时URL
  refreshClothesImages: function(clothes) {
    if (!clothes || clothes.length === 0) {
      return;
    }
    
    // 收集所有非空的fileID
    const fileIDs = clothes.map(item => item.fileID).filter(fileID => fileID);
    
    if (fileIDs.length === 0) {
      return;
    }
    
    // 显示加载状态
    wx.showLoading({
      title: '更新图片...',
      mask: false
    });
    
    // 批量获取临时链接
    wx.cloud.getTempFileURL({
      fileList: fileIDs,
      success: res => {
        console.log('更新临时链接成功', res);
        
        // 创建fileID到临时路径的映射
        const fileIDToPath = {};
        res.fileList.forEach(item => {
          if (item.fileID && item.tempFileURL) {
            fileIDToPath[item.fileID] = item.tempFileURL;
          }
        });
        
        // 更新每个衣物对象的tempImageUrl
        const updatedClothes = clothes.map(cloth => {
          const tempUrl = cloth.fileID ? fileIDToPath[cloth.fileID] || '' : '';
          return {
            ...cloth,
            tempImageUrl: tempUrl
          };
        });
        
        this.setData({
          clothes: updatedClothes
        });
        
        // 重新过滤当前分类的衣物
        this.filterClothes();
        
        wx.hideLoading();
      },
      fail: err => {
        console.error('获取临时链接失败', err);
        wx.hideLoading();
        wx.showToast({
          title: '图片更新失败',
          icon: 'none'
        });
      }
    });
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
        // 提示：因为已存在的衣物可能没有userOpenId字段，所以筛选
        // 后续新添加的会按userOpenId区分
        let myClothes = res.data;
        console.log('之前的衣物总数量:', myClothes.length);
        
        this.setData({
          clothes: myClothes,
          isLoading: false
        });
        
        // 下载所有衣物图片
        this.downloadClothesImages(myClothes);
      })
      .catch(err => {
        console.error('获取衣物列表失败', err);
        this.setData({
          isLoading: false
        });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
  },
  
  // 下载衣物图片
  downloadClothesImages: function(clothes) {
    if (!clothes || clothes.length === 0) {
      console.log('没有衣物数据，显示空状态');
      this.setData({
        clothes: [],
        filteredClothes: [],
        isLoading: false
      });
      return;
    }
    
    // 使用getTempFileURL替代downloadFile获取临时链接
    // 收集所有非空的fileID
    const fileIDs = clothes.map(item => item.fileID).filter(fileID => fileID);
    console.log('需要处理的图片数量:', fileIDs.length);
    
    if (fileIDs.length === 0) {
      console.log('没有图片需要加载，直接显示衣物');
      this.setData({
        clothes: clothes,
        isLoading: false
      });
      this.filterClothes();
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
        
        // 更新最后一次URL刷新时间
        this.setData({
          clothes: updatedClothes,
          isLoading: false,
          lastUrlRefreshTime: Date.now()
        });
        
        this.filterClothes();
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
        
        this.filterClothes();
      }
    });
  },
  
  // 切换分类
  changeCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    console.log('切换分类:', category);
    this.setData({
      currentCategory: category
    });
    
    this.filterClothes();
  },
  
  // 根据当前分类筛选衣物
  filterClothes: function() {
    if (this.data.currentCategory === '全部') {
      console.log('显示全部衣物:', this.data.clothes.length);
      this.setData({
        filteredClothes: this.data.clothes
      });
      return;
    }
    
    const filtered = this.data.clothes.filter(item => item.category === this.data.currentCategory);
    console.log('筛选后衣物:', filtered.length);
    this.setData({
      filteredClothes: filtered
    });
  },
  
  // 查看衣物详情
  viewClothesDetail: function(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: '../detail/detail?id=' + id
    });
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
    
    // 显示加载中
    this.setData({
      isUploading: true
    });
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'back',
      success: (res) => {
        // 获取照片临时路径
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.uploadImageAndAnalyze(tempFilePath);
      },
      fail: () => {
        this.setData({
          isUploading: false
        });
      }
    });
  },
  
  // 通过相册添加衣物
  addByAlbum: function() {
    this.hideAddOptions();
    
    // 显示加载中
    this.setData({
      isUploading: true
    });
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        // 获取照片临时路径
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.uploadImageAndAnalyze(tempFilePath);
      },
      fail: () => {
        this.setData({
          isUploading: false
        });
      }
    });
  },
  
  // 通过URL添加衣物
  addByUrl: function() {
    this.hideAddOptions();
    wx.navigateTo({
      url: '../add/add?source=url'
    });
  },
  
  // 上传图片到云存储并调用API分析
  uploadImageAndAnalyze: function(filePath) {
    wx.showLoading({
      title: '正在上传...',
    });
    
    const cloudPath = 'clothes/' + Date.now() + filePath.match(/\.[^.]+?$/)[0];
    
    // 上传图片到云存储
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: res => {
        // 获取文件ID
        const fileID = res.fileID;
        console.log('上传成功', fileID);
        
        // 获取图片临时访问链接
        wx.cloud.getTempFileURL({
          fileList: [fileID],
          success: result => {
            const imageUrl = result.fileList[0].tempFileURL;
            console.log('临时链接', imageUrl);
            
            // 调用达摩院API分析图片
            this.analyzeImageWithAPI(imageUrl, fileID);
          },
          fail: err => {
            console.error('获取临时链接失败', err);
            this.handleUploadError('获取链接失败');
          }
        });
      },
      fail: err => {
        console.error('上传失败', err);
        this.handleUploadError('上传失败');
      }
    });
  },
  
  // 调用达摩院API分析图片
  analyzeImageWithAPI: function(imageUrl, fileID) {
    wx.showLoading({
      title: '识别衣物中...',
    });
    
    // 调用云函数来发送请求
    wx.cloud.callFunction({
      name: 'analyzeClothing',
      data: {
        imageUrl: imageUrl
      },
      success: res => {
        console.log('图片分析成功', res);
        
        // 处理API返回的数据
        if (res.result && res.result.data) {
          // 保存到云数据库
          this.saveClothesToDB(fileID, imageUrl, res.result.data);
        } else {
          this.handleUploadError('识别失败');
        }
      },
      fail: err => {
        console.error('图片分析失败', err);
        this.handleUploadError('识别失败');
      }
    });
  },
  
  // 保存衣物信息到云数据库
  saveClothesToDB: function(fileID, imageUrl, apiResult) {
    wx.showLoading({
      title: '保存数据中...',
    });
    
    const db = wx.cloud.database();
    
    // 构建要保存的数据 - 根据新的JSON格式
    const clothesData = {
      fileID: fileID,
      imageUrl: imageUrl,
      name: apiResult.name || (apiResult.color + ' ' + apiResult.style),
      category: apiResult.category || this.mapClothingTypeToCategory(apiResult.clothing_type),
      clothingType: apiResult.clothing_type || '未知',
      color: apiResult.color || '未知',
      style: apiResult.style || '未知',
      warmthLevel: apiResult.warmth_level || 3,
      sceneApplicability: apiResult.scene_applicability || ['休闲'],
      createTime: db.serverDate(),
      // 保存完整API返回结果
      apiResult: apiResult,
      // 添加用户OpenID字段
      userOpenId: this.data.userOpenId
    };
    
    console.log('正在保存衣物数据:', clothesData);
    
    // 添加到云数据库
    db.collection('clothes').add({
      data: clothesData
    }).then(res => {
      console.log('保存成功', res);
      
      wx.hideLoading();
      this.setData({
        isUploading: false
      });
      
      wx.showToast({
        title: '添加成功',
        icon: 'success',
        duration: 2000
      });
      
      // 刷新衣物列表
      setTimeout(() => {
        this.getClothes();
      }, 1000);
      
    }).catch(err => {
      console.error('保存失败', err);
      this.handleUploadError('保存失败');
    });
  },
  
  // 将API返回的clothing_type映射到我们的分类
  mapClothingTypeToCategory: function(clothingType) {
    if (!clothingType) return '未分类';
    
    // 标准化类别
    if (clothingType.includes('上衣') || clothingType.includes('衬衫') || 
        clothingType.includes('T恤') || clothingType.includes('卫衣')) {
      return '上衣';
    } else if (clothingType.includes('裤') || clothingType.includes('下衣')) {
      return '裤子';
    } else if (clothingType.includes('裙')) {
      return '裙子';
    } else if (clothingType.includes('外套') || clothingType.includes('夹克') || 
              clothingType.includes('大衣')) {
      return '外套';
    } else if (clothingType.includes('鞋')) {
      return '鞋子';
    } else if (clothingType.includes('饰品') || clothingType.includes('帽') || 
              clothingType.includes('围巾') || clothingType.includes('手套')) {
      return '配饰';
    }
    
    return '未分类';
  },
  
  // 处理上传错误
  handleUploadError: function(errorMsg) {
    wx.hideLoading();
    this.setData({
      isUploading: false
    });
    
    wx.showToast({
      title: errorMsg,
      icon: 'none',
      duration: 2000
    });
  }
})
