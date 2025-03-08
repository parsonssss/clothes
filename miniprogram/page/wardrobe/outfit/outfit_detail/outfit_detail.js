// 导入模块
const outfitDetailManager = require('./modules/outfitDetailManager');
const userManager = require('./modules/userManager');
const imageManager = require('./modules/imageManager');

Page({
  data: {
    // 定义颜色常量 - 秋季色彩方案
    colors: {
      cowhide_cocoa: '#442D1C',   // 深棕色 Cowhide Cocoa
      spiced_wine: '#74301C',     // 红棕色 Spiced Wine
      toasted_caramel: '#84592B', // 焦糖色 Toasted Caramel
      olive_harvest: '#9D9167',   // 橄榄色 Olive Harvest
      golden_batter: '#E8D1A7',   // 金黄色 Golden Batter
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
    // 主题风格
    themeStyle: 'autumn', // 默认秋季风格
    isLoading: true,
    userOpenId: '',
    
    // 搭配详情数据
    outfitId: '',
    outfitData: null,
    
    // 相似搭配推荐
    similarOutfits: []
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
    
    // 获取搭配ID
    if (options.id) {
      this.setData({
        outfitId: options.id
      });
      
      // 获取用户OpenID并加载搭配详情
      this.getUserOpenIdAndLoadOutfitDetail();
    } else {
      wx.showToast({
        title: '搭配ID不存在',
        icon: 'error'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  // 获取用户OpenID并加载搭配详情
  getUserOpenIdAndLoadOutfitDetail: function() {
    const that = this;
    
    wx.showLoading({
      title: '加载中...',
    });
    
    // 设置超时处理，确保不会一直显示加载中
    const timeoutId = setTimeout(() => {
      console.log('获取搭配详情超时');
      wx.hideLoading();
      
      if (that.data.isLoading) {
        // 如果仍在加载中，显示错误提示并使用模拟数据
        wx.showToast({
          title: '加载超时，使用示例数据',
          icon: 'none',
          duration: 2000
        });
        that.useSimulatedData();
      }
    }, 15000); // 15秒超时
    
    // 获取用户OpenID
    userManager.getUserOpenId()
      .then(openid => {
        console.log('获取用户OpenID成功:', openid);
        
        that.setData({
          userOpenId: openid
        });
        
        // 获取搭配详情
        return outfitDetailManager.getOutfitDetail(that.data.outfitId);
      })
      .then(outfitData => {
        console.log('获取搭配详情成功:', outfitData);
        
        // 清除超时定时器
        clearTimeout(timeoutId);
        
        // 更新数据
        that.setData({
          outfitData: outfitData,
          isLoading: false
        });
        
        // 隐藏加载提示
        wx.hideLoading();
        
        // 获取相似搭配推荐
        return outfitDetailManager.getSimilarOutfits(
          outfitData.category,
          that.data.outfitId,
          that.data.userOpenId
        );
      })
      .then(similarOutfits => {
        console.log('获取相似搭配成功:', similarOutfits);
        
        that.setData({
          similarOutfits: similarOutfits
        });
      })
      .catch(err => {
        // 清除超时定时器
        clearTimeout(timeoutId);
        
        console.error('获取搭配详情失败:', err);
        wx.hideLoading();
        
        // 判断错误类型，决定是否使用模拟数据
        if (err && err.message) {
          if (err.message.includes('数据不存在') || err.message.includes('搭配数据为空') || err.message.includes('not found')) {
            // 如果是数据不存在的错误，不使用模拟数据
            that.useSimulatedData(true);
          } else {
            // 其他错误，使用模拟数据
            that.useSimulatedData();
          }
        } else {
          // 未知错误，使用模拟数据
          that.useSimulatedData();
        }
      });
  },
  
  // 使用模拟数据（当无法获取真实数据时）
  useSimulatedData: function(useEmptyData = false) {
    console.log('使用模拟数据，useEmptyData:', useEmptyData);
    
    if (useEmptyData) {
      // 如果指定使用空数据，则不显示模拟数据
      wx.showToast({
        title: '没有搭配数据',
        icon: 'none',
        duration: 2000
      });
      
      this.setData({
        outfitData: null,
        similarOutfits: [],
        isLoading: false
      });
      
      // 确保隐藏加载提示
      wx.hideLoading();
      
      console.log('已设置为空数据');
      return;
    }
    
    // 提示用户正在使用模拟数据
    wx.showToast({
      title: '使用示例数据',
      icon: 'none',
      duration: 2000
    });
    
    // 生成模拟搭配数据
    const mockOutfit = outfitDetailManager.generateMockOutfit(useEmptyData);
    const mockSimilarOutfits = outfitDetailManager.generateMockSimilarOutfits(useEmptyData);
    
    this.setData({
      outfitData: mockOutfit,
      similarOutfits: mockSimilarOutfits,
      isLoading: false
    });
    
    // 确保隐藏加载提示
    wx.hideLoading();
    
    console.log('模拟数据加载完成');
  },
  
  // 处理图片加载错误
  handleImageError: function(e) {
    console.log('图片加载错误:', e);
    
    const type = e.currentTarget.dataset.type;
    const index = e.currentTarget.dataset.index;
    const defaultImageUrl = imageManager.getDefaultImageUrl();
    
    if (type === 'preview') {
      // 更新搭配预览图
      const outfitData = this.data.outfitData;
      if (outfitData) {
        outfitData.previewImage = defaultImageUrl;
        this.setData({
          outfitData: outfitData
        });
        console.log('已更新搭配预览图');
      }
    } else if (type === 'item' && index !== undefined) {
      // 更新衣物图片
      const outfitData = this.data.outfitData;
      if (outfitData && outfitData.items && outfitData.items[index]) {
        console.log(`更新衣物项 ${index} 的图片`);
        outfitData.items[index].imageUrl = defaultImageUrl;
        this.setData({
          outfitData: outfitData
        });
      }
    } else if (type === 'similar' && index !== undefined) {
      // 更新相似搭配图片
      const similarOutfits = this.data.similarOutfits;
      if (similarOutfits && similarOutfits[index]) {
        similarOutfits[index].previewImage = defaultImageUrl;
        this.setData({
          similarOutfits: similarOutfits
        });
      }
    }
  },
  
  // 格式化日期
  formatDate: function(timestamp) {
    return outfitDetailManager.formatDate(timestamp);
  },
  
  // 返回上一页
  goBack: function() {
    wx.navigateBack();
  },
  
  // 查看相似搭配
  viewSimilarOutfit: function(e) {
    const id = e.currentTarget.dataset.id;
    console.log('查看相似搭配:', id);
    
    if (!id) {
      console.error('搭配ID不存在');
      return;
    }
    
    // 跳转到搭配详情页面
    wx.navigateTo({
      url: `../outfit_detail/outfit_detail?id=${id}`
    });
  },
  
  // 编辑搭配
  editOutfit: function() {
    const outfitId = this.data.outfitId;
    console.log('编辑搭配:', outfitId);
    
    wx.navigateTo({
      url: `../outfit_edit/outfit_edit?id=${outfitId}`
    });
  },
  
  // 删除搭配
  deleteOutfit: function() {
    const that = this;
    const outfitId = this.data.outfitId;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个搭配吗？此操作不可恢复。',
      success: function(res) {
        if (res.confirm) {
          console.log('用户确认删除');
          
          wx.showLoading({
            title: '删除中...',
          });
          
          const db = wx.cloud.database();
          
          // 先获取搭配信息
          db.collection('outfits')
            .doc(outfitId)
            .get()
            .then(res => {
              const outfit = res.data;
              const imageFileID = outfit.imageFileID || outfit.previewImage;
              
              // 删除数据库记录
              return db.collection('outfits')
                .doc(outfitId)
                .remove()
                .then(() => {
                  // 如果有图片文件，也删除图片
                  if (imageFileID && imageFileID.includes('cloud://')) {
                    return wx.cloud.deleteFile({
                      fileList: [imageFileID]
                    });
                  }
                  return { fileList: [] };
                });
            })
            .then(() => {
              wx.hideLoading();
              
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              });
              
              // 延迟返回上一页
              setTimeout(() => {
                wx.navigateBack();
              }, 1500);
            })
            .catch(err => {
              console.error('删除搭配失败:', err);
              
              wx.hideLoading();
              
              wx.showToast({
                title: '删除失败',
                icon: 'none'
              });
            });
        }
      }
    });
  },
  
  // 分享搭配
  shareOutfit: function() {
    // 在小程序中，分享功能通常通过onShareAppMessage实现
    wx.showToast({
      title: '请点击右上角分享',
      icon: 'none'
    });
  },
  
  // 分享到朋友圈
  shareToMoments: function() {
    wx.showToast({
      title: '暂不支持分享到朋友圈',
      icon: 'none'
    });
  },
  
  // 用于分享的函数
  onShareAppMessage: function() {
    const outfitData = this.data.outfitData;
    
    return {
      title: outfitData ? `${outfitData.name || '我的搭配'} - 穿搭分享` : '穿搭分享',
      path: `/page/wardrobe/outfit/outfit_detail/outfit_detail?id=${this.data.outfitId}`,
      imageUrl: outfitData ? outfitData.previewImage : ''
    };
  }
}); 