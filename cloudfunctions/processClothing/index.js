// 云函数入口文件
const cloud = require('wx-server-sdk')


cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境
const db = cloud.database()
const _ = db.command
// 云函数入口函数
exports.main = async (event, context) => {
  console.log('收到请求:', event)
  const { fileID } = event
  const wxContext = cloud.getWXContext()
  
  try {
    // 1. 获取临时访问链接
    const { fileList } = await cloud.getTempFileURL({
      fileList: [fileID]
    })
    
    if (!fileList?.[0]?.tempFileURL) {
      throw new Error('获取临时链接失败')
    }
    
    const imageUrl = fileList[0].tempFileURL
    
    // 2. 更新处理状态为processing
    await updateStatus(fileID, {
      status: 'processing',
      processingSteps: {
        upload: 'completed',
        koutu: 'pending',
        analysis: 'pending'
      }
    })
    
    // 3. 调用抠图API并处理结果
    const koutuResult = await processKoutu(imageUrl)
    if (!koutuResult.success) {
      throw new Error(koutuResult.error || '抠图处理失败')
    }
    
    // 4. 更新抠图状态
    await updateStatus(fileID, {
      'processingSteps.koutu': 'completed'
    })
    
    // 5. 分析衣物
    const analysisResult = await analyzeClothing(koutuResult.processedImageUrl)
    if (!analysisResult.success) {
      throw new Error(analysisResult.error || '衣物分析失败')
    }
    
    // 6. 更新分析状态
    await updateStatus(fileID, {
      'processingSteps.analysis': 'completed'
    })
    
    // 7. 保存到clothes集合并更新最终状态
    await Promise.all([
      saveToClothes({
        fileID,
        imageUrl,
        processedImageUrl: koutuResult.processedImageUrl,
        analysis: analysisResult.data,
        openid: wxContext.OPENID
      }),
      updateStatus(fileID, {
        status: 'completed'
      })
    ])
    
    return {
      success: true,
      message: '处理完成'
    }
    
  } catch (error) {
    console.error('处理失败:', error)
    
    // 更新失败状态
    await updateStatus(fileID, {
      status: 'failed',
      error: error.message
    }).catch(console.error)
    
    return {
      success: false,
      error: error.message
    }
  }
}

// 统一的状态更新函数
async function updateStatus(fileID, updateData) {
  try {
    cloud.init({
      env: 'cloud1-3gi97kso9ab01185'
    })
    const db = cloud.database()
    return await db.collection('pending_clothes')
      .where({
        fileID: fileID
      })
      .update({
        data: {
          ...updateData,
          updateTime: db.serverDate()
        }
      })
  } catch (error) {
    console.error('更新状态失败:', error)
    throw error
  }
}

// 处理抠图
async function processKoutu(imageUrl) {
  try {
    // 读取抠图模板
    const { fileContent } = await cloud.downloadFile({
      fileID: 'cloud://cloud1-3gi97kso9ab01185.636c-cloud1-3gi97kso9ab01185-1303166775/koutu.json'
    })
    
    const template = JSON.parse(fileContent.toString('utf8'))
    template.prompt["27"].inputs.image = imageUrl
    
    // 调用抠图API
    const response = await cloud.callContainer({
      path: 'https://wp05.unicorn.org.cn:12753/api/prompt',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: template
    })
    
    if (!response.data?.prompt_id) {
      throw new Error('抠图API返回数据格式错误')
    }
    
    // 轮询获取结果
    const processedImageUrl = await pollKoutuResult(response.data.prompt_id)
    
    // 处理结果图片
    const { fileID } = await processResultImage(processedImageUrl)
    
    return {
      success: true,
      processedImageUrl: fileID
    }
    
  } catch (error) {
    console.error('抠图处理失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 轮询抠图结果
async function pollKoutuResult(promptId) {
  const maxRetries = 30
  const retryInterval = 2000
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await cloud.callContainer({
        path: `https://wp05.unicorn.org.cn:12753/history/${promptId}`,
        method: 'GET'
      })
      
      if (!result.data || Object.keys(result.data).length === 0) {
        await new Promise(resolve => setTimeout(resolve, retryInterval))
        continue
      }
      
      const firstKey = Object.keys(result.data)[0]
      const outputs = result.data[firstKey].outputs
      
      if (result.data[firstKey].status === 'failed') {
        throw new Error('抠图处理失败')
      }
      
      if (!outputs) {
        await new Promise(resolve => setTimeout(resolve, retryInterval))
        continue
      }
      
      const outputKey = Object.keys(outputs).find(key => 
        outputs[key]?.images?.length > 0
      )
      
      if (outputKey && outputs[outputKey]?.images?.[0]) {
        const imageInfo = outputs[outputKey].images[0]
        return `https://wp05.unicorn.org.cn:12753/view?filename=${imageInfo.filename}&subfolder=${imageInfo.subfolder || ""}&type=${imageInfo.type || "output"}`
      }
      
      await new Promise(resolve => setTimeout(resolve, retryInterval))
    } catch (error) {
      console.error('轮询失败:', error)
      await new Promise(resolve => setTimeout(resolve, retryInterval))
    }
  }
  
  throw new Error('获取抠图结果超时')
}

// 处理结果图片
async function processResultImage(imageUrl) {
  try {
    const { fileContent } = await cloud.downloadFile({
      fileID: imageUrl
    })
    
    return await cloud.uploadFile({
      cloudPath: `clothing_processed/${Date.now()}-${Math.random().toString(36).substr(2)}.png`,
      fileContent
    })
  } catch (error) {
    console.error('处理结果图片失败:', error)
    throw error
  }
}

// 分析衣物
async function analyzeClothing(imageUrl) {
  try {
    const { fileList } = await cloud.getTempFileURL({
      fileList: [imageUrl]
    })
    
    if (!fileList?.[0]?.tempFileURL) {
      throw new Error('获取图片临时链接失败')
    }
    
    const response = await cloud.callContainer({
      path: '/api/analyze',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: {
        image_url: fileList[0].tempFileURL
      }
    })
    
    if (!response.data?.success) {
      throw new Error('分析API返回错误')
    }
    
    return {
      success: true,
      data: formatAnalysisResult(response.data.result)
    }
    
  } catch (error) {
    console.error('分析衣物失败:', error)
    return {
      success: false,
      error: error.message
    }
  }
}

// 格式化分析结果
function formatAnalysisResult(result) {
  const categoryMap = {
    'top': '上衣',
    'bottom': '裤子',
    'dress': '裙子',
    'outerwear': '外套',
    'shoes': '鞋子',
    'accessory': '配饰'
  }
  
  return {
    name: result?.name || '新衣物',
    category: categoryMap[result?.category] || '未分类',
    type: result?.type || '未知',
    color: result?.color || '未知',
    style: result?.style || '休闲',
    warmthLevel: result?.warmth_level || 3,
    scenes: result?.scenes || ['休闲']
  }
}

// 保存到clothes集合
async function saveToClothes(data) {
  try {
    return await db.collection('clothes').add({
      data: {
        name: data.analysis.name,
        imageFileID: data.fileID,
        originalImageUrl: data.imageUrl,
        processedImageUrl: data.processedImageUrl,
        category: data.analysis.category,
        type: data.analysis.type,
        color: data.analysis.color,
        style: data.analysis.style,
        warmthLevel: data.analysis.warmthLevel,
        scenes: data.analysis.scenes,
        _openid: data.openid,
        createTime: db.serverDate()
      }
    })
  } catch (error) {
    console.error('保存衣物失败:', error)
    throw error
  }
} 