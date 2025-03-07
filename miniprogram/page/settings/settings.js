// page/settings/settings.js
//const colors = require('../../../util/colors');

Page({
  data: {
    theme: 'light', // WeUI的主题，light或dark
    // 风格切换设置
    themeStyle: 'autumn', // 默认为秋季风格，可选值：'autumn'或'pinkBlue'
    // 使用秋季色系色彩配置
    colors: {
      cowhide_cocoa: '#442D1C',   // 深棕色 Cowhide Cocoa
      spiced_wine: '#74301C',     // 红棕色 Spiced Wine
      toasted_caramel: '#84592B', // 焦糖色 Toasted Caramel
      olive_harvest: '#9D9167',   // 橄榄色 Olive Harvest
      golden_batter: '#E8D1A7',   // 金黄色 Golden Batter
    },
    // 粉蓝色系配色
    pinkBlueColors: {
      pinkDark: '#D47C99',       // 深粉色
      pinkMedium: '#EEA0B2',     // 中粉色
      pinkLight: '#F9C9D6',      // 浅粉色
      blueLight: '#CBE0F9',      // 浅蓝色
      blueMedium: '#97C8E5',     // 中蓝色
      blueDark: '#5EA0D0',       // 深蓝色
    },
    // 页面样式
    pageStyle: {
      backgroundColor: '',
      backgroundImage: '',
      titleColor: '',
      cellBackgroundColor: '',
      footerColor: '',
      decorationColors: []
    }
  },
  
  onLoad: function() {
    // 设置导航栏标题
    wx.setNavigationBarTitle({
      title: '设置'
    });

    // 获取保存的主题设置
    const savedTheme = wx.getStorageSync('themeStyle');
    if (savedTheme) {
      this.setData({
        themeStyle: savedTheme
      });
      
      // 应用导航栏样式
      this.applyThemeStyle(savedTheme);
    } else {
      // 默认应用秋季主题
      this.applyThemeStyle('autumn');
    }
    
    // 检查系统暗黑模式
    wx.getSystemInfo({
      success: (res) => {
        if (res.theme === 'dark') {
          this.setData({
            theme: 'dark'
          });
        }
      }
    });
  },
  
  // 选择主题风格
  selectTheme: function(e) {
    const newTheme = e.currentTarget.dataset.theme;
    if (newTheme === this.data.themeStyle) return; // 如果已经是当前主题，不做操作
    
    this.setData({
      themeStyle: newTheme
    });
    
    // 保存设置到本地存储
    wx.setStorageSync('themeStyle', newTheme);
    
    // 设置当前页面的导航栏样式
    this.applyThemeStyle(newTheme);
    
    // 通知首页更新主题
    const pages = getCurrentPages();
    const homePage = pages.find(page => page.route && page.route.includes('wardrobe/index'));
    if (homePage) {
      homePage.setData({
        themeStyle: newTheme
      });
      // 确保首页立即应用新主题
      if (typeof homePage.applyThemeStyle === 'function') {
        homePage.applyThemeStyle(newTheme);
      }
    }
    
    // 通知衣柜页面更新主题
    const closetPage = pages.find(page => page.route && page.route.includes('wardrobe/closet'));
    if (closetPage) {
      closetPage.setData({
        themeStyle: newTheme
      });
      // 确保衣柜页面立即应用新主题
      if (typeof closetPage.applyThemeStyle === 'function') {
        closetPage.applyThemeStyle(newTheme);
      }
    }
    
    // 提示用户主题已切换
    wx.showToast({
      title: '主题已切换',
      icon: 'success',
      duration: 1000
    });
  },
  
  // 应用主题样式
  applyThemeStyle: function(themeName) {
    // 更新页面样式
    let pageStyle = {};
    
    if (themeName === 'autumn') {
      // 设置秋季主题样式
      pageStyle = {
        backgroundColor: this.data.colors.golden_batter,
        backgroundImage: 'none',
        titleColor: this.data.colors.cowhide_cocoa,
        cellBackgroundColor: 'rgba(255, 255, 255, 0.7)',
        footerColor: this.data.colors.cowhide_cocoa,
        decorationColors: [
          this.data.colors.olive_harvest,
          this.data.colors.spiced_wine,
          this.data.colors.toasted_caramel
        ]
      };
      
      // 设置秋季主题导航栏
      wx.setNavigationBarColor({
        frontColor: '#000000', // 黑色文字
        backgroundColor: this.data.colors.golden_batter, // 金黄色背景
        animation: {
          duration: 300,
          timingFunc: 'easeIn'
        }
      });
      
      // 设置秋季主题TabBar
      wx.setTabBarStyle({
        backgroundColor: this.data.colors.golden_batter,
        borderStyle: 'black',
        color: this.data.colors.cowhide_cocoa,
        selectedColor: this.data.colors.spiced_wine
      });
    } else if (themeName === 'pinkBlue') {
      // 设置粉蓝主题样式
      pageStyle = {
        backgroundColor: this.data.pinkBlueColors.pinkLight,
        backgroundImage: `linear-gradient(to bottom, white, ${this.data.pinkBlueColors.pinkLight})`,
        titleColor: this.data.pinkBlueColors.pinkDark,
        cellBackgroundColor: 'rgba(255, 255, 255, 0.9)',
        footerColor: this.data.pinkBlueColors.blueDark,
        decorationColors: [
          this.data.pinkBlueColors.blueMedium,
          this.data.pinkBlueColors.pinkMedium,
          this.data.pinkBlueColors.blueLight
        ]
      };
      
      // 设置粉蓝主题导航栏
      wx.setNavigationBarColor({
        frontColor: '#000000', // 黑色文字
        backgroundColor: this.data.pinkBlueColors.pinkLight, // 浅粉色背景
        animation: {
          duration: 300,
          timingFunc: 'easeIn'
        }
      });
      
      // 设置粉蓝主题TabBar
      wx.setTabBarStyle({
        backgroundColor: this.data.pinkBlueColors.pinkLight,
        borderStyle: 'black',
        color: this.data.pinkBlueColors.blueDark,
        selectedColor: this.data.pinkBlueColors.pinkDark
      });
    }
    
    // 更新页面样式
    this.setData({
      pageStyle: pageStyle
    });
  }
});