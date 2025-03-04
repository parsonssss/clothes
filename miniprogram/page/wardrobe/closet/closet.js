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
  
  // 下载衣物图片 - 使用优化后的模块化函数
  downloadClothesImages: function(clothes) {
    // 调用模块化的下载函数，并绑定this上下文
    downloadClothesImages.call(this, clothes);
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
    console.log('开始处理图片:', imageUrl);
    // 获取抠图API请求模板
    const fs = wx.getFileSystemManager();
    
    // 使用用户目录下的模板
    const templatePath = `${wx.env.USER_DATA_PATH}/koutu.json`;
    console.log('模板文件路径:', templatePath);
    
    fs.readFile({
      filePath: templatePath,
      encoding: 'utf-8',
      success: (res) => {
        try {
          // 解析模板
          const koutuTemplate = JSON.parse(res.data);
          console.log('模板读取成功');
          
          // 替换URL
          if (koutuTemplate.prompt && koutuTemplate.prompt["27"] && koutuTemplate.prompt["27"].inputs) {
            koutuTemplate.prompt["27"].inputs.image = imageUrl;
            console.log('替换图片URL成功');
            
            // 向抠图API发送请求
            this.sendKoutuRequest(koutuTemplate, imageUrl);
          } else {
            console.error('模板结构不正确, 找不到节点27:', JSON.stringify(koutuTemplate.prompt, null, 2));
            this.handleKoutuError();
          }
        } catch (error) {
          console.error('解析koutu.json失败:', error);
          this.handleKoutuError();
        }
      },
      fail: (err) => {
        console.error('读取koutu.json失败:', err);
        
        // 尝试读取项目内的模板文件
        fs.readFile({
          filePath: 'miniprogram/page/wardrobe/closet/koutu.json',
          encoding: 'utf-8',
          success: (innerRes) => {
            try {
              const koutuTemplate = JSON.parse(innerRes.data);
              koutuTemplate.prompt["27"].inputs.image = imageUrl;
              
              // 保存到用户目录便于下次使用
              fs.writeFile({
                filePath: templatePath,
                data: innerRes.data,
                encoding: 'utf-8',
                success: () => {
                  console.log('保存模板到用户目录成功');
                }
              });
              
              this.sendKoutuRequest(koutuTemplate, imageUrl);
            } catch (error) {
              console.error('解析内置模板失败:', error);
              this.handleKoutuError();
            }
          },
          fail: (innerErr) => {
            console.error('读取内置模板失败，尝试使用硬编码模板:', innerErr);
            
            // 如果内置模板也读取失败，则使用硬编码的模板
            this.useHardcodedTemplate(imageUrl, templatePath);
          }
        });
      }
    });
  },
  
  // 使用硬编码的抠图模板
  useHardcodedTemplate: function(imageUrl, savePath) {
    // 硬编码的抠图模板
    const hardcodedTemplate = {
      "prompt": {
        "14": {
          "inputs": {
            "aspect_ratio": "original",
            "proportional_width": 1,
            "proportional_height": 1,
            "fit": "letterbox",
            "method": "lanczos",
            "round_to_multiple": "8",
            "scale_to_longest_side": true,
            "longest_side": 1024,
            "image": [
              "27",
              0
            ]
          },
          "class_type": "LayerUtility: ImageScaleByAspectRatio",
          "_meta": {
            "title": "LayerUtility: ImageScaleByAspectRatio"
          }
        },
        "17": {
          "inputs": {
            "invert_mask": false,
            "blend_mode": "normal",
            "opacity": 100,
            "x_percent": 50,
            "y_percent": 50,
            "mirror": "None",
            "scale": 1,
            "aspect_ratio": 1,
            "rotate": 0,
            "transform_method": "lanczos",
            "anti_aliasing": 0,
            "background_image": [
              "18",
              0
            ],
            "layer_image": [
              "14",
              0
            ],
            "layer_mask": [
              "24",
              1
            ]
          },
          "class_type": "LayerUtility: ImageBlendAdvance V2",
          "_meta": {
            "title": "LayerUtility: ImageBlendAdvance V2"
          }
        },
        "18": {
          "inputs": {
            "panel_width": [
              "20",
              0
            ],
            "panel_height": [
              "20",
              1
            ],
            "fill_color": "white",
            "fill_color_hex": "#000000"
          },
          "class_type": "CR Color Panel",
          "_meta": {
            "title": "🌁 CR Color Panel"
          }
        },
        "20": {
          "inputs": {
            "image": [
              "14",
              0
            ]
          },
          "class_type": "easy imageSize",
          "_meta": {
            "title": "ImageSize"
          }
        },
        "21": {
          "inputs": {
            "filename_prefix": "ComfyUI",
            "images": [
              "17",
              0
            ]
          },
          "class_type": "SaveImage",
          "_meta": {
            "title": "Save Image"
          }
        },
        "24": {
          "inputs": {
            "sam_model": "sam_hq_vit_h (2.57GB)",
            "grounding_dino_model": "GroundingDINO_SwinT_OGC (694MB)",
            "threshold": 0.3,
            "detail_method": "VITMatte(local)",
            "detail_erode": 6,
            "detail_dilate": 6,
            "black_point": 0.15,
            "white_point": 0.99,
            "process_detail": false,
            "prompt": "clothes",
            "device": "cuda",
            "max_megapixels": 2,
            "cache_model": false,
            "image": [
              "14",
              0
            ]
          },
          "class_type": "LayerMask: SegmentAnythingUltra V2",
          "_meta": {
            "title": "LayerMask: SegmentAnythingUltra V2"
          }
        },
        "27": {
          "inputs": {
            "image": imageUrl,
            "keep_alpha_channel": false,
            "output_mode": false
          },
          "class_type": "LoadImageFromUrl",
          "_meta": {
            "title": "Load Image From URL"
          }
        }
      }
    };
      
    // 保存到用户目录便于下次使用
    const fs = wx.getFileSystemManager();
    fs.writeFile({
      filePath: savePath,
      data: JSON.stringify(hardcodedTemplate),
      encoding: 'utf-8',
      success: () => {
        console.log('保存硬编码模板到用户目录成功');
      }
    });
    
    // 发送硬编码模板
    this.sendKoutuRequest(hardcodedTemplate, imageUrl);
  },
  
  // 发送抠图请求
  sendKoutuRequest: function(requestBody, originalImageUrl) {
    console.log('发送抠图请求:',JSON.stringify(requestBody, null, 2));
    wx.request({
      url: 'https://wp05.unicorn.org.cn:12753/api/prompt',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: requestBody,
      success: (res) => {
        console.log('抠图请求成功:', res.data);
        // 检查是否返回prompt_id
        if (res.data && res.data.prompt_id) {
          const promptId = res.data.prompt_id;
          console.log('获取到promptId:', promptId);
          // 将promptId存储到storage中，方便调试
          wx.setStorageSync('lastPromptId', promptId);
          // 获取抠图结果
          this.getKoutuResult(promptId, originalImageUrl);
        } else if (res.data && res.data.error) {
          // 如果有错误信息
          console.error('抠图请求返回错误:', res.data.error);
          wx.showToast({
            title: '抠图失败: ' + res.data.error,
            icon: 'none'
          });
          this.handleKoutuError();
        } else {
          console.error('抠图请求响应不符合预期:', res.data);
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
        url: `https://wp05.unicorn.org.cn:12753/history/${promptId}`,
        method: 'GET',
        header: {
        },
        success: (res) => {
          console.log('获取抠图结果:', res);
          // 确保res.data存在且不为空
          if (res.data && Object.keys(res.data).length > 0) {
            // 检查是否存在输出节点
            const firstKey = Object.keys(res.data)[0];
            // 获取第一个key对应的对象中的outputs
            if (res.data[firstKey].outputs && Object.keys(res.data[firstKey].outputs).length > 0) {
              // 查找包含SaveImage节点的输出
              const outputKey = Object.keys(res.data[firstKey].outputs).find(key => {
                return res.data[firstKey].outputs[key]?.images && res.data[firstKey].outputs[key].images.length > 0;
              });
              
              if (outputKey && res.data[firstKey].outputs[outputKey]?.images && res.data[firstKey].outputs[outputKey].images.length > 0) {
                // 获取第一张输出图片的信息
                const imageInfo = res.data[firstKey].outputs[outputKey].images[0];
                const filename = imageInfo.filename; // 例如 "ComfyUI_00052_.png"
                const subfolder = imageInfo.subfolder || ""; // 子文件夹，可能为空字符串
                const type = imageInfo.type || "output"; // 类型，默认为output
                
                // 构建图片URL
                const imageUrl = `https://wp05.unicorn.org.cn:12753/view?filename=${filename}&subfolder=${subfolder}&type=${type}`;
                console.log('构建的图片URL:', imageUrl);
                
                // 直接使用构建的URL下载图片
                this.downloadKoutuResult(imageUrl, originalImageUrl);
              } else {
                console.error('未找到SaveImage节点输出:', res.data[firstKey].outputs);
                
                // 检查是否处理中，如果是则继续轮询
                if (res.data[firstKey].status === 'processing' || res.data[firstKey].status === 'pending') {
                  setTimeout(checkResult, 2000);
                } else {
                  this.handleKoutuError();
                }
              }
            } else if (res.data[firstKey].status === 'processing' || res.data[firstKey].status === 'pending') {
              // 如果还在处理中，继续轮询
              setTimeout(checkResult, 2000);
            } else {
              console.error('无效的输出数据:', res.data[firstKey]);
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
    console.log('开始下载抠图结果:', outputUrl);
    
    // 处理URL，确保所有参数都正确编码
    const encodedUrl = outputUrl.replace(/([^:]\/\/[^\/]+\/)(.*)/, function(match, prefix, suffix) {
      return prefix + encodeURIComponent(suffix).replace(/%2F/g, '/').replace(/%3F/g, '?').replace(/%3D/g, '=').replace(/%26/g, '&');
    });
    
    wx.downloadFile({
      url: outputUrl,
      success: (res) => {
        console.log('下载结果:', res);
        if (res.statusCode === 200) {
          const tempFilePath = res.tempFilePath;
          
          // 上传抠图结果到云存储
          const cloudPath = `clothing_processed/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
          
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath,
            success: (uploadRes) => {
              const fileID = uploadRes.fileID;
              console.log('抠图结果上传成功:', fileID);
              
              // 分析衣物
              this.analyzeClothing(fileID, originalImageUrl);
            },
            fail: (err) => {
              console.error('上传抠图结果失败:', err);
              this.handleKoutuError();
            }
          });
        } else {
          console.error('下载抠图结果失败，状态码:', res.statusCode);
          // 尝试直接使用原始图片
          wx.showModal({
            title: '抠图失败',
            content: '图片处理失败，是否使用原始图片？',
            success: (modalRes) => {
              if (modalRes.confirm) {
                // 使用原始图片
                this.analyzeClothing(originalImageUrl, originalImageUrl);
              } else {
                this.handleKoutuError();
              }
            }
          });
        }
      },
      fail: (err) => {
        console.error('下载抠图结果失败:', err);
        // 尝试直接使用原始图片
        wx.showModal({
          title: '抠图失败',
          content: '抠图结果下载失败，是否使用原始图片？',
          success: (modalRes) => {
            if (modalRes.confirm) {
              // 使用原始图片
              this.analyzeClothing(originalImageUrl, originalImageUrl);
            } else {
              this.handleKoutuError();
            }
          }
        });
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
      userOpenid: this.data.userOpenId, // 手动添加用户OpenID关联，确保账号与数据关联
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
})
