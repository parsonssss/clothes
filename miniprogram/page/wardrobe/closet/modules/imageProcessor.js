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
    const MAX_RETRIES = 15; // 减少重试次数，避免长时间等待
    let retryCount = 0;
    
    const checkResult = () => {
      console.log(`检查抠图结果，第${retryCount + 1}次尝试，promptId: ${promptId}`);
      
      wx.request({
        url: `https://wp05.unicorn.org.cn:12753/history/${promptId}`,
        method: 'GET',
        success: (res) => {
          // 检查响应是否有效
          if (!res.data) {
            console.error('抠图API返回空数据');
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              setTimeout(checkResult, 2000);
            } else {
              reject(new Error('抠图API返回空数据，已达最大重试次数'));
            }
            return;
          }
          
          if (Object.keys(res.data).length > 0) {
            const firstKey = Object.keys(res.data)[0];
            const outputs = res.data[firstKey].outputs;
            
            // 检查处理状态
            if (res.data[firstKey].status === 'failed') {
              console.error('抠图处理失败，API返回失败状态');
              reject(new Error('抠图处理失败'));
              return;
            }
            
            // 检查是否处理中
            if (res.data[firstKey].status === 'processing') {
              console.log('抠图处理中...');
              if (retryCount < MAX_RETRIES) {
                retryCount++;
                setTimeout(checkResult, 2000);
              } else {
                reject(new Error('抠图处理超时，已达最大重试次数'));
              }
              return;
            }
            
            // 检查输出结果
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
                console.log('抠图处理成功，获取到结果URL:', imageUrl);
                resolve(imageUrl);
                return;
              } else {
                console.error('抠图结果中没有找到图片');
              }
            } else {
              console.error('抠图结果中没有outputs字段');
            }
            
            // 如果还没有结果，继续重试
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              setTimeout(checkResult, 2000);
            } else {
              reject(new Error('获取抠图结果超时，已达最大重试次数'));
            }
          } else {
            console.log('抠图结果尚未准备好');
            // 如果还没有结果，继续重试
            if (retryCount < MAX_RETRIES) {
              retryCount++;
              setTimeout(checkResult, 2000);
            } else {
              reject(new Error('获取抠图结果超时，已达最大重试次数'));
            }
          }
        },
        fail: (err) => {
          console.error('检查抠图结果网络请求失败:', err);
          if (retryCount < MAX_RETRIES) {
            retryCount++;
            setTimeout(checkResult, 2000);
          } else {
            reject(new Error('检查抠图结果网络请求失败，已达最大重试次数'));
          }
        }
      });
    };
    
    // 开始检查结果
    checkResult();
  });
}

// 将抠图后的图片保存到云存储
function saveProcessedImageToCloud(imageUrl) {
  return new Promise((resolve, reject) => {
    if (!imageUrl) {
      console.error('保存抠图图片失败: URL为空');
      reject(new Error('抠图图片URL为空'));
      return;
    }
    
    console.log('开始保存抠图后图片:', imageUrl);
    
    // 添加下载超时
    const downloadTimeout = setTimeout(() => {
      console.error('下载抠图图片超时');
      // 返回原始URL，确保流程可以继续
      resolve({
        fileID: '',
        tempImageUrl: imageUrl,
        error: '下载超时'
      });
    }, 30000); // 30秒超时
    
    // 先下载抠图后的图片到本地临时文件
    wx.downloadFile({
      url: imageUrl,
      success: (res) => {
        clearTimeout(downloadTimeout);
        
        if (res.statusCode === 200) {
          const tempFilePath = res.tempFilePath;
          
          // 添加上传超时
          const uploadTimeout = setTimeout(() => {
            console.error('上传抠图图片到云存储超时');
            // 返回原始URL，确保流程可以继续
            resolve({
              fileID: '',
              tempImageUrl: imageUrl,
              error: '上传超时'
            });
          }, 30000); // 30秒超时
          
          // 上传到云存储
          const cloudPath = `processed_images/${Date.now()}-${Math.floor(Math.random() * 1000)}.png`;
          
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: tempFilePath,
            success: (uploadRes) => {
              clearTimeout(uploadTimeout);
              console.log('抠图后图片上传成功:', uploadRes);
              resolve({
                fileID: uploadRes.fileID,
                tempImageUrl: imageUrl
              });
            },
            fail: (err) => {
              clearTimeout(uploadTimeout);
              console.error('抠图后图片上传失败:', err);
              // 即使上传失败，也返回原始URL，确保流程可以继续
              resolve({
                fileID: '',
                tempImageUrl: imageUrl,
                error: err.message || '上传失败'
              });
            }
          });
        } else {
          console.error('下载抠图后图片失败, 状态码:', res.statusCode);
          // 返回原始URL，确保流程可以继续
          resolve({
            fileID: '',
            tempImageUrl: imageUrl,
            error: `下载失败，状态码: ${res.statusCode}`
          });
        }
      },
      fail: (err) => {
        clearTimeout(downloadTimeout);
        console.error('下载抠图后图片失败:', err);
        // 返回原始URL，确保流程可以继续
        resolve({
          fileID: '',
          tempImageUrl: imageUrl,
          error: err.message || '下载失败'
        });
      }
    });
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
  saveProcessedImageToCloud,
  analyzeClothing
}; 