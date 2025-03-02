// page/wardrobe/add/add.js
Page({
  data: {
    imageUrl: '',
    sourceType: '', // camera, album, url
    clothesInfo: {
      name: '',
      brand: '',
      category: '上衣',
      subCategory: '', 
      color: '',
      season: '',
      purchaseDate: '',
      price: '',
      tags: []
    },
    categories: ['上衣', '裤子', '裙子', '外套', '鞋子', '配饰'],
    subCategories: {
      '上衣': ['T恤', '衬衫', '卫衣', '针织衫', '背心'],
      '裤子': ['牛仔裤', '休闲裤', '运动裤', '西装裤', '短裤'],
      '裙子': ['短裙', '中长裙', '长裙', '半身裙', '连衣裙'],
      '外套': ['夹克', '大衣', '风衣', '西装', '羽绒服'],
      '鞋子': ['运动鞋', '皮鞋', '靴子', '凉鞋', '拖鞋'],
      '配饰': ['帽子', '围巾', '手套', '袜子', '首饰']
    },
    currentSubCategories: [],
    colors: ['黑色', '白色', '灰色', '米色', '棕色', '蓝色', '绿色', '红色', '粉色', '紫色', '黄色', '橙色'],
    seasons: ['春季', '夏季', '秋季', '冬季', '四季'],
    tagInput: '',
    showUrlInput: false,
    urlInput: ''
  },
  
  onLoad: function(options) {
    // 获取上一页传递的图片路径和来源
    if (options.imgPath) {
      this.setData({
        imageUrl: options.imgPath,
        sourceType: options.source || 'album'
      });
    } else if (options.source === 'url') {
      this.setData({
        sourceType: 'url',
        showUrlInput: true
      });
    }
    
    // 初始化子分类
    this.updateSubCategories('上衣');
  },
  
  // 更新子分类
  updateSubCategories: function(category) {
    this.setData({
      currentSubCategories: this.data.subCategories[category] || [],
      'clothesInfo.subCategory': this.data.subCategories[category] ? this.data.subCategories[category][0] : ''
    });
  },
  
  // 输入名称
  inputName: function(e) {
    this.setData({
      'clothesInfo.name': e.detail.value
    });
  },
  
  // 输入品牌
  inputBrand: function(e) {
    this.setData({
      'clothesInfo.brand': e.detail.value
    });
  },
  
  // 选择分类
  selectCategory: function(e) {
    const category = e.detail.value;
    this.setData({
      'clothesInfo.category': category
    });
    this.updateSubCategories(category);
  },
  
  // 选择子分类
  selectSubCategory: function(e) {
    this.setData({
      'clothesInfo.subCategory': e.detail.value
    });
  },
  
  // 选择颜色
  selectColor: function(e) {
    this.setData({
      'clothesInfo.color': e.detail.value
    });
  },
  
  // 选择季节
  selectSeason: function(e) {
    this.setData({
      'clothesInfo.season': e.detail.value
    });
  },
  
  // 输入购买日期
  inputPurchaseDate: function(e) {
    this.setData({
      'clothesInfo.purchaseDate': e.detail.value
    });
  },
  
  // 选择日期（日期选择器）
  bindDateChange: function(e) {
    this.setData({
      'clothesInfo.purchaseDate': e.detail.value
    });
  },
  
  // 输入价格
  inputPrice: function(e) {
    this.setData({
      'clothesInfo.price': e.detail.value
    });
  },
  
  // 输入标签
  inputTag: function(e) {
    this.setData({
      tagInput: e.detail.value
    });
  },
  
  // 添加标签
  addTag: function() {
    const tagInput = this.data.tagInput.trim();
    if (!tagInput) return;
    
    // 检查标签是否已存在
    if (this.data.clothesInfo.tags.includes(tagInput)) {
      wx.showToast({
        title: '标签已存在',
        icon: 'none'
      });
      return;
    }
    
    // 添加标签
    const tags = [...this.data.clothesInfo.tags, tagInput];
    this.setData({
      'clothesInfo.tags': tags,
      tagInput: ''
    });
  },
  
  // 删除标签
  removeTag: function(e) {
    const index = e.currentTarget.dataset.index;
    const tags = this.data.clothesInfo.tags.filter((_, i) => i !== index);
    this.setData({
      'clothesInfo.tags': tags
    });
  },
  
  // 输入URL
  inputUrl: function(e) {
    this.setData({
      urlInput: e.detail.value
    });
  },
  
  // 通过URL获取图片
  fetchImageByUrl: function() {
    const url = this.data.urlInput.trim();
    if (!url) {
      wx.showToast({
        title: '请输入有效的URL',
        icon: 'none'
      });
      return;
    }
    
    // 在实际应用中，这里应该有后端API支持远程图片下载
    // 这里简化处理，直接使用URL
    this.setData({
      imageUrl: url,
      showUrlInput: false
    });
    
    wx.showToast({
      title: '图片获取成功',
      icon: 'success'
    });
  },
  
  // 重新选择图片
  reChooseImage: function() {
    wx.showActionSheet({
      itemList: ['拍照', '从相册选择'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 拍照
          this.takePhoto();
        } else if (res.tapIndex === 1) {
          // 从相册选择
          this.chooseFromAlbum();
        }
      }
    });
  },
  
  // 拍照
  takePhoto: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera'],
      camera: 'back',
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          imageUrl: tempFilePath,
          sourceType: 'camera'
        });
      }
    });
  },
  
  // 从相册选择
  chooseFromAlbum: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        this.setData({
          imageUrl: tempFilePath,
          sourceType: 'album'
        });
      }
    });
  },
  
  // 保存衣物信息
  saveClothes: function() {
    // 验证必填字段
    if (!this.data.imageUrl) {
      wx.showToast({
        title: '请上传衣物图片',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.clothesInfo.name) {
      wx.showToast({
        title: '请输入衣物名称',
        icon: 'none'
      });
      return;
    }
    
    // 在实际应用中，这里应该将数据保存到后端数据库
    // 这里简化为显示保存成功的提示并返回上一页
    
    wx.showLoading({
      title: '保存中...',
    });
    
    // 模拟网络请求延迟
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({
        title: '保存成功',
        icon: 'success',
        duration: 1500,
        success: () => {
          // 延迟返回，让用户看到成功提示
          setTimeout(() => {
            wx.navigateBack();
          }, 1500);
        }
      });
    }, 1000);
  },
  
  // 取消添加，返回上一页
  cancelAdd: function() {
    wx.navigateBack();
  }
})
