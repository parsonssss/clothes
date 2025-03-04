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
    // 使用绝对路径，确保在所有环境下可用
    const templatePath = `${wx.env.USER_DATA_PATH}/koutu.json`;
    
    console.log('正在获取抠图模板...');
    
    // 获取最新的云端模板
    downloadKoutuTemplate(templatePath)
      .then(() => {
        console.log('成功从云端获取最新模板');
        resolve(templatePath);
      })
      .catch(err => {
        console.error('从云端获取模板失败，尝试使用本地已有模板', err);
        
        // 如果云端获取失败，检查本地是否有缓存
        fs.access({
          path: templatePath,
          success: () => {
            console.log('使用本地已缓存的抠图模板');
            resolve(templatePath);
          },
          fail: () => {
            console.error('本地也没有可用的抠图模板，尝试使用包内模板');
            
            // 尝试读取内置的模板文件
            // 使用相对路径 - 这里读取的是小程序包内的文件
            const packagePath = '/templates/koutu.json';
            console.log('尝试读取小程序包内模板:', packagePath);
            
            try {
              // 同步读取小程序包内的模板文件
              const fileContent = fs.readFileSync(packagePath, 'utf-8');
              
              // 写入到用户目录
              fs.writeFile({
                filePath: templatePath,
                data: fileContent,
                encoding: 'utf-8',
                success: () => {
                  console.log('成功从包内复制模板到用户目录');
                  resolve(templatePath);
                },
                fail: (writeErr) => {
                  console.error('写入模板到用户目录失败:', writeErr);
                  reject(writeErr);
                }
              });
            } catch (readErr) {
              console.error('读取包内模板失败，无法获取抠图模板:', readErr);
              reject(readErr);
            }
          }
        });
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
    
    console.log('尝试从云存储下载抠图模板...');
    // 从云存储获取模板
    wx.cloud.downloadFile({
      fileID: 'cloud://cloud1-3gi97kso9ab01185.636c-cloud1-3gi97kso9ab01185-1303166775/templates/koutu.json',
      success: (res) => {
        if (res.tempFilePath) {
          console.log('云端模板下载成功，临时路径:', res.tempFilePath);
          
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
                  console.log('抠图模板从云端复制成功');
                  resolve(templatePath);
                },
                fail: (writeErr) => {
                  console.error('写入从云端下载的抠图模板失败:', writeErr);
                  reject(writeErr);
                }
              });
            },
            fail: (readErr) => {
              console.error('读取从云端下载的抠图模板失败:', readErr);
              reject(readErr);
            }
          });
        } else {
          const error = new Error('云存储下载的临时文件路径为空');
          console.error(error);
          reject(error);
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