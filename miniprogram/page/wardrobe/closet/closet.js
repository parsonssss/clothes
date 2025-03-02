// page/wardrobe/closet/closet.js
Page({
  data: {
    currentCategory: '全部',
    categories: ['全部', '上衣', '裤子', '裙子', '外套', '鞋子', '配饰'],
    clothes: [],
    filteredClothes: [],
    showAddOptions: false,
    isUploading: false
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
      // 获取衣物列表
      this.getClothes();
    }
  },
  
  onShow: function() {
    // 页面显示时重新获取衣物列表，以便刷新数据
    this.getClothes();
  },
  
  // 获取衣物列表
  getClothes: function() {
    const db = wx.cloud.database();
    const clothesCollection = db.collection('clothes');
    
    wx.showLoading({
      title: '加载中...',
    });
    
    // 从云数据库获取衣物列表
    clothesCollection.orderBy('createTime', 'desc').get().then(res => {
      console.log('获取衣物列表成功', res);
      
      this.setData({
        clothes: res.data,
        filteredClothes: res.data
      });
      
      this.filterClothes();
      wx.hideLoading();
    }).catch(err => {
      console.error('获取衣物列表失败', err);
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },
  
  // 切换分类
  changeCategory: function(e) {
    const category = e.currentTarget.dataset.category;
    this.setData({
      currentCategory: category
    });
    
    this.filterClothes();
  },
  
  // 根据当前分类筛选衣物
  filterClothes: function() {
    if (this.data.currentCategory === '全部') {
      this.setData({
        filteredClothes: this.data.clothes
      });
      return;
    }
    
    const filtered = this.data.clothes.filter(item => item.category === this.data.currentCategory);
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
      name: apiResult.name || (apiResult.color + apiResult.style),
      category: apiResult.category || this.mapClothingTypeToCategory(apiResult.clothing_type),
      clothingType: apiResult.clothing_type || '未知',
      color: apiResult.color || '未知',
      style: apiResult.style || '未知',
      warmthLevel: apiResult.warmth_level || 3,
      sceneApplicability: apiResult.scene_applicability || ['休闲'],
      createTime: db.serverDate(),
      // 保存完整API返回结果
      apiResult: apiResult
    };
    
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
