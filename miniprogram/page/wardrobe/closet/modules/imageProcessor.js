/**
 * 图片处理模块
 * 负责处理图片上传、抠图和AI分析
 */

// 上传图片到云存储
function uploadImageToCloud(filePath) {
  return new Promise((resolve, reject) => {
    const cloudPath = `clothing_images/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
    
    wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath,
      success: (res) => {
        console.log('上传成功:', res);
        resolve(res.fileID);
      },
      fail: (err) => {
        console.error('上传失败:', err);
        reject(err);
      }
    });
  });
}

// 获取文件临时URL
function getTempFileURL(fileID) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'getTempFileURL',
      data: {
        fileIdList: [fileID]
      },
      success: (res) => {
        console.log('获取临时URL成功:', res);
        if (res.result && res.result.length > 0) {
          resolve(res.result[0].tempFileURL);
        } else {
          reject(new Error('获取图片链接失败'));
        }
      },
      fail: (err) => {
        console.error('获取临时URL失败:', err);
        reject(err);
      }
    });
  });
}

// 调用抠图API处理图片
function processImageWithKoutu(imageUrl, templatePath) {
  return new Promise((resolve, reject) => {
    console.log('开始处理图片:', imageUrl);
    console.log('使用模板路径:', templatePath);
    
    if (!templatePath) {
      reject(new Error('抠图模板路径为空'));
      return;
    }
    
    // 获取抠图API请求模板
    const fs = wx.getFileSystemManager();
    
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
            sendKoutuRequest(koutuTemplate)
              .then(resolve)
              .catch(reject);
          } else {
            const error = new Error('模板结构不正确, 找不到节点27');
            console.error(error.message, JSON.stringify(koutuTemplate.prompt, null, 2));
            reject(error);
          }
        } catch (error) {
          console.error('解析koutu.json失败:', error);
          reject(error);
        }
      },
      fail: (err) => {
        console.error('读取koutu.json失败:', err, '路径:', templatePath);
        reject(err);
      }
    });
  });
}

// 发送抠图请求
function sendKoutuRequest(koutuTemplate) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: 'https://wp05.unicorn.org.cn:12753/api/prompt',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: koutuTemplate,
      success: (res) => {
        console.log('抠图API请求成功:', res);
        if (res.data && res.data.prompt_id) {
          // 获取抠图结果
          checkKoutuResult(res.data.prompt_id)
            .then(resolve)
            .catch(reject);
        } else {
          console.error('抠图API响应格式不正确:', res);
          reject(new Error('抠图API响应格式不正确'));
        }
      },
      fail: (err) => {
        console.error('抠图API请求失败:', err);
        reject(err);
      }
    });
  });
}

// 检查抠图结果
function checkKoutuResult(promptId) {
  return new Promise((resolve, reject) => {
    const MAX_RETRIES = 30;
    let retryCount = 0;
    
    const checkResult = () => {
      wx.request({
        url: `https://wp05.unicorn.org.cn:12753/history/${promptId}`,
        method: 'GET',
        success: (res) => {
          if (res.data && Object.keys(res.data).length > 0) {
            const firstKey = Object.keys(res.data)[0];
            const outputs = res.data[firstKey].outputs;
            
            if (res.data[firstKey].status === 'failed') {
              reject(new Error('抠图处理失败'));
              return;
            }
            
            if (outputs) {
              const outputKey = Object.keys(outputs).find(key => 
                outputs[key]?.images && outputs[key].images.length > 0
              );
              
              if (outputKey && outputs[outputKey]?.images?.[0]) {
                const imageInfo = outputs[outputKey].images[0];
                const filename = imageInfo.filename;
                const subfolder = imageInfo.subfolder || "";
                const type = imageInfo.type || "output";
                
                const imageUrl = `https://wp05.unicorn.org.cn:12753/view?filename=${filename}&subfolder=${subfolder}&type=${type}`;
                resolve(imageUrl);
                return;
              }
            }
            
            // 如果还没有结果，继续重试
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              setTimeout(checkResult, 2000);
            } else {
              reject(new Error('获取抠图结果超时'));
            }
          } else {
            // 如果还没有结果，继续重试
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              setTimeout(checkResult, 2000);
            } else {
              reject(new Error('获取抠图结果超时'));
            }
          }
        },
        fail: (err) => {
          console.error('检查抠图结果失败:', err);
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(checkResult, 2000);
          } else {
            reject(err);
          }
        }
      });
    };
    
    // 开始检查结果
    checkResult();
  });
}

// 分析衣物
function analyzeClothing(imageUrl) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name: 'analyzeClothing',
      data: {
        imageUrl: imageUrl
      },
      success: (res) => {
        console.log('分析结果:', res);
        
        if (res.result && res.result.success) {
          resolve(res.result.data);
        } else {
          reject(new Error('分析衣物失败'));
        }
      },
      fail: (err) => {
        console.error('分析衣物失败:', err);
        reject(err);
      }
    });
  });
}

module.exports = {
  uploadImageToCloud,
  getTempFileURL,
  processImageWithKoutu,
  sendKoutuRequest,
  checkKoutuResult,
  analyzeClothing
}; 