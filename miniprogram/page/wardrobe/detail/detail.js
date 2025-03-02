// page/wardrobe/detail/detail.js
Page({
  data: {
    clothesId: '',
    clothesInfo: null,
    isLoading: true
  },
  
  onLoad: function(options) {
    if (options.id) {
      this.setData({
        clothesId: options.id
      });
      
      // 获取衣物详情
      this.getClothesDetail(options.id);
    } else {
      wx.showToast({
        title: '参数错误',
        icon: 'none'
      });
      setTimeout(() => {
        wx.navigateBack();
      }, 1500);
    }
  },
  
  // 获取衣物详情
  getClothesDetail: function(id) {
    const db = wx.cloud.database();
    
    wx.showLoading({
      title: '加载中...',
    });
    
    // 从云数据库获取衣物详情
    db.collection('clothes').doc(id).get().then(res => {
      console.log('获取衣物详情成功', res);
      
      this.setData({
        clothesInfo: res.data,
        isLoading: false
      });
      
      wx.hideLoading();
    }).catch(err => {
      console.error('获取衣物详情失败', err);
      
      this.setData({
        isLoading: false
      });
      
      wx.hideLoading();
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },
  
  // 编辑衣物信息
  editClothes: function() {
    wx.navigateTo({
      url: '../add/add?id=' + this.data.clothesId + '&mode=edit'
    });
  },
  
  // 删除衣物
  deleteClothes: function() {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这件衣物吗？',
      confirmColor: '#8d6e63',
      success: (res) => {
        if (res.confirm) {
          this.performDelete();
        }
      }
    });
  },
  
  // 执行删除操作
  performDelete: function() {
    const db = wx.cloud.database();
    const fileID = this.data.clothesInfo.fileID;
    
    wx.showLoading({
      title: '删除中...',
    });
    
    // 删除数据库记录
    db.collection('clothes').doc(this.data.clothesId).remove().then(res => {
      console.log('删除数据成功', res);
      
      // 删除云存储中的图片
      if (fileID) {
        wx.cloud.deleteFile({
          fileList: [fileID],
          success: res => {
            console.log('删除文件成功', res);
          },
          fail: err => {
            console.error('删除文件失败', err);
          },
          complete: () => {
            wx.hideLoading();
            wx.showToast({
              title: '删除成功',
              icon: 'success',
              duration: 1500,
              success: () => {
                setTimeout(() => {
                  wx.navigateBack();
                }, 1500);
              }
            });
          }
        });
      } else {
        wx.hideLoading();
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 1500,
          success: () => {
            setTimeout(() => {
              wx.navigateBack();
            }, 1500);
          }
        });
      }
    }).catch(err => {
      console.error('删除失败', err);
      wx.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    });
  },
  
  // 预览图片
  previewImage: function() {
    if (this.data.clothesInfo && this.data.clothesInfo.imageUrl) {
      wx.previewImage({
        urls: [this.data.clothesInfo.imageUrl],
        current: this.data.clothesInfo.imageUrl
      });
    }
  }
})
