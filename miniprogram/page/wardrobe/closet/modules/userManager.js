/**
 * 用户管理模块
 * 负责处理用户OpenID和模板文件相关功能
 */

/**
 * 获取当前用户的OpenID
 * @return {Promise<String>} 包含用户OpenID的Promise
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
          resolve(openid);
        } else {
          reject(new Error('未获取到有效的OpenID'));
        }
      },
      fail: err => {
        console.error('云函数调用失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 确保抠图模板文件在用户目录中可用
 * @return {Promise<String>} 包含模板路径的Promise
 */
function ensureKoutuTemplate() {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    const templatePath = `../koutu.json`;
    
    // 检查文件是否已存在
    fs.access({
      path: templatePath,
      success: () => {
        console.log('抠图模板已存在');
        resolve(templatePath);
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
                resolve(templatePath);
              },
              fail: (writeErr) => {
                console.error('写入抠图模板失败:', writeErr);
                // 尝试从网络获取模板
                downloadKoutuTemplate(templatePath)
                  .then(() => {
                    resolve(templatePath);
                  })
                  .catch(err => {
                    reject(err);
                  });
              }
            });
          },
          fail: (readErr) => {
            console.error('读取项目抠图模板失败:', readErr);
            
            // 尝试从网络获取模板
            downloadKoutuTemplate(templatePath)
              .then(() => {
                resolve(templatePath);
              })
              .catch(err => {
                reject(err);
              });
          }
        });
      }
    });
  });
}

/**
 * 从网络下载抠图模板
 * @param {String} templatePath - 保存模板的路径
 * @return {Promise} 下载结果
 */
function downloadKoutuTemplate(templatePath) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    
    // 从云存储获取模板
    wx.cloud.downloadFile({
      fileID: 'cloud://cloud1-3gi97kso9ab01185.636c-cloud1-3gi97kso9ab01185-1308332131/templates/koutu.json',
      success: (res) => {
        if (res.tempFilePath) {
          // 读取临时文件内容
          fs.readFile({
            filePath: res.tempFilePath,
            encoding: 'utf-8',
            success: (readRes) => {
              // 写入到用户目录
              fs.writeFile({
                filePath: templatePath,
                data: readRes.data,
                encoding: 'utf-8',
                success: () => {
                  console.log('从云存储下载抠图模板成功');
                  resolve();
                },
                fail: (writeErr) => {
                  console.error('写入从云存储下载的抠图模板失败:', writeErr);
                  reject(writeErr);
                }
              });
            },
            fail: (readErr) => {
              console.error('读取从云存储下载的抠图模板失败:', readErr);
              reject(readErr);
            }
          });
        } else {
          reject(new Error('下载抠图模板失败，未获取到临时文件路径'));
        }
      },
      fail: (err) => {
        console.error('从云存储下载抠图模板失败:', err);
        reject(err);
      }
    });
  });
}

module.exports = {
  getUserOpenId,
  ensureKoutuTemplate
}; 