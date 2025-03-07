const config = require('./config')
const themeListeners = []
global.isDemo = true
App({
  
  onLaunch(opts, data) {
    // const that = this;
    // const canIUseSetBackgroundFetchToken = wx.canIUse('setBackgroundFetchToken')
    // if (canIUseSetBackgroundFetchToken) {
    //   wx.setBackgroundFetchToken({
    //     token: 'getBackgroundFetchToken',
    //   })
    // }
    // if (wx.getBackgroundFetchData) {
    //   wx.getBackgroundFetchData({
    //     fetchType: 'pre',
    //     success(res) {
    //       that.globalData.backgroundFetchData  = res;
    //       console.log('读取预拉取数据成功')
    //     },
    //     fail() {
    //       console.log('读取预拉取数据失败')
    //       wx.showToast({
    //         title: '无缓存数据',
    //         icon: 'none'
    //       })
    //     },
    //     complete() {
    //       console.log('结束读取')
    //     }
    //   })
    // }
      // 云环境初始化增强版
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      wx.showToast({
        title: '请升级微信客户端',
        icon: 'none'
      })
      return
    }
  
    try {
      wx.cloud.init({
        env: config.envId,
        traceUser: true,
      })
      console.log('云环境初始化成功，当前环境：', config.envId)
      this.globalData.cloudInitialized = true // 添加全局状态标记
    } catch (e) {
      console.error('云初始化失败:', e)
      wx.showToast({
        title: '云服务初始化失败',
        icon: 'none'
      })
    }
    
    // 初始化主题样式
    this.initTheme();
    
    console.log('App Launch', opts)
    if (data && data.path) {
      wx.navigateTo({
        url: data.path,
      })
    }
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
        env: config.envId,
        traceUser: true,
      })
    }
  },
  
  
  onShow(opts) {
    console.log('App Show', opts)
    // console.log(wx.getSystemInfoSync())
    
    // 检查并应用主题样式
    const savedTheme = wx.getStorageSync('themeStyle');
    if (savedTheme && savedTheme !== this.globalData.themeStyle) {
      console.log('检测到主题变化，重新应用主题样式');
      this.globalData.themeStyle = savedTheme;
      this.initTheme();
    }
  },
  onHide() {
    console.log('App Hide')
  },
  onThemeChange({ theme }) {
    this.globalData.theme = theme
    themeListeners.forEach((listener) => {
        listener(theme)
    })
  },
  watchThemeChange(listener) {
      if (themeListeners.indexOf(listener) < 0) {
          themeListeners.push(listener)
      }
  },
  unWatchThemeChange(listener) {
      const index = themeListeners.indexOf(listener)
      if (index > -1) {
          themeListeners.splice(index, 1)
      }
  },
  globalData: {
    theme: wx.getSystemInfoSync().theme,
    themeStyle: 'autumn', // 默认主题风格
    hasLogin: false,
    openid: null,
    iconTabbar: '/page/weui/example/images/icon_tabbar.png',
    cloudInitialized: false, // 云环境初始化状态
  },
  // lazy loading openid
  getUserOpenId(callback) {
    const self = this

    if (self.globalData.openid) {
      callback(null, self.globalData.openid)
    } else {
      wx.login({
        success(data) {
          wx.cloud.callFunction({
            name: 'login',
            data: {
              action: 'openid'
            },
            success: res => {
              console.log('拉取openid成功', res)
              self.globalData.openid = res.result.openid
              callback(null, self.globalData.openid)
            },
            fail: err => {
              console.log('拉取用户openid失败，将无法正常使用开放接口等服务', res)
              callback(res)
            }
          })
        },
        fail(err) {
          console.log('wx.login 接口调用失败，将无法正常使用开放接口等服务', err)
          callback(err)
        }
      })
    }
  },
  // 通过云函数获取用户 openid，支持回调或 Promise
  getUserOpenIdViaCloud() {
    return wx.cloud.callFunction({
      name: 'wxContext',
      data: {}
    }).then(res => {
      this.globalData.openid = res.result.openid
      return res.result.openid
    })
  },
  // 初始化主题样式
  initTheme: function() {
    // 获取保存的主题设置
    const savedTheme = wx.getStorageSync('themeStyle') || 'autumn'; // 默认使用秋季主题
    
    console.log('初始化主题样式:', savedTheme);
    
    // 设置全局主题变量
    this.globalData.themeStyle = savedTheme;
    
    // 应用主题样式
    if (savedTheme === 'autumn') {
      // 设置秋季主题TabBar
      wx.setTabBarStyle({
        backgroundColor: '#E8D1A7',
        borderStyle: 'black',
        color: '#442D1C',
        selectedColor: '#74301C'
      });
    } else if (savedTheme === 'pinkBlue') {
      // 设置粉蓝主题TabBar
      wx.setTabBarStyle({
        backgroundColor: '#F9C9D6',
        borderStyle: 'black',
        color: '#5EA0D0',
        selectedColor: '#D47C99'
      });
    }
  }
})
