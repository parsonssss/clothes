/**
 * 用户管理模块
 * 负责用户身份验证、OpenID获取和管理
 */

/**
 * 获取用户OpenID
 * 首先尝试从本地缓存获取，如果没有则调用云函数
 * @returns {Promise<string>} 包含用户OpenID的Promise
 */
function getUserOpenId() {
  return new Promise((resolve, reject) => {
    // 尝试从本地缓存获取OpenID
    const openid = wx.getStorageSync('openid');
    if (openid) {
      console.log('从本地缓存获取到OpenID:', openid);
      resolve(openid);
      return;
    }
    
    console.log('本地缓存中没有OpenID，尝试调用云函数获取');
    
    // 确保云环境已初始化
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      reject(new Error('云环境未初始化'));
      return;
    }
    
    // 如果本地没有，则调用云函数获取
    wx.cloud.callFunction({
      name: 'login',
      data: {},
      success: res => {
        console.log('云函数login调用成功:', res);
        
        // 检查返回结果
        if (!res || !res.result) {
          console.error('云函数返回结果无效:', res);
          reject(new Error('云函数返回结果无效'));
          return;
        }
        
        const openid = res.result.openid || res.result.OPENID || (res.result.userInfo && res.result.userInfo.openId);
        
        // 成功获取到openid
        if (openid) {
          console.log('成功获取到OpenID:', openid);
          // 存入本地缓存
          wx.setStorageSync('openid', openid);
          resolve(openid);
        } else {
          // 获取失败
          console.error('未能从云函数返回结果中提取OpenID:', res.result);
          
          // 尝试从全局数据获取
          const app = getApp();
          if (app && app.globalData && app.globalData.openid) {
            console.log('从全局数据获取到OpenID:', app.globalData.openid);
            wx.setStorageSync('openid', app.globalData.openid);
            resolve(app.globalData.openid);
            return;
          }
          
          reject(new Error('未能获取有效的OpenID'));
        }
      },
      fail: err => {
        console.error('云函数调用失败:', err);
        
        // 尝试从全局数据获取
        const app = getApp();
        if (app && app.globalData && app.globalData.openid) {
          console.log('云函数失败，但从全局数据获取到OpenID:', app.globalData.openid);
          wx.setStorageSync('openid', app.globalData.openid);
          resolve(app.globalData.openid);
          return;
        }
        
        reject(err);
      }
    });
  });
}

/**
 * 检查用户登录状态
 * @returns {Promise<boolean>} 是否已登录
 */
function checkLoginStatus() {
  return new Promise((resolve) => {
    const openid = wx.getStorageSync('openid');
    resolve(!!openid);
  });
}

/**
 * 清除用户登录状态
 */
function clearLoginStatus() {
  wx.removeStorageSync('openid');
  console.log('已清除用户登录状态');
}

/**
 * 获取测试用户ID
 * 用于开发和测试环境
 * @returns {string} 测试用户ID
 */
function getTestUserId() {
  return 'test_user_' + Math.random().toString(36).substr(2, 9);
}

module.exports = {
  getUserOpenId,
  checkLoginStatus,
  clearLoginStatus,
  getTestUserId
};
