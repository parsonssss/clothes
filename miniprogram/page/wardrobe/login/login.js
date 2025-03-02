// page/wardrobe/login/login.js
Page({
  data: {
    username: '',
    password: ''
  },
  
  // 输入用户名
  usernameInput: function(e) {
    this.setData({
      username: e.detail.value
    });
  },
  
  // 输入密码
  passwordInput: function(e) {
    this.setData({
      password: e.detail.value
    });
  },
  
  // 登录按钮点击事件
  login: function() {
    if (!this.data.username.trim() || !this.data.password.trim()) {
      wx.showToast({
        title: '用户名和密码不能为空',
        icon: 'none'
      });
      return;
    }
    
    // 实际应用中这里应该有登录接口调用
    // 这里简化为直接跳转到主页
    wx.switchTab({
      url: '../index/index'
    });
  },
  
  // 注册点击事件
  register: function() {
    wx.showToast({
      title: '注册功能正在开发中',
      icon: 'none'
    });
  },
  
  // 第三方登录
  thirdPartyLogin: function(e) {
    const type = e.currentTarget.dataset.type;
    wx.showToast({
      title: type + '登录正在开发中',
      icon: 'none'
    });
  }
})
