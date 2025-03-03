// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取调用参数
    const { baseImageUrl, prompt, facePrompt } = event
    
    // 验证必要参数
    if (!baseImageUrl) {
      return {
        success: false,
        error: '缺少基础图片URL参数'
      }
    }
    
    // 构建请求体
    const requestData = {
      model: "wanx-virtualmodel",
      input: {
        base_image_url: baseImageUrl,
        mask_image_url: "https://huarong123.oss-cn-hangzhou.aliyuncs.com/image/image.jpg",
        prompt: prompt || "a beautiful chinese girl, she stands in front of a pure pink background, she is smiling",
        face_prompt: facePrompt || "good face, beautiful face, best quality."
      },
      parameters: {
        short_side_size: "512",
        n: 2
      }
    }
    
    // 从环境变量或云环境变量获取API密钥
    const apiKey = process.env.DASHSCOPE_API_KEY || 'your_api_key_here'
    
    // 发送请求到阿里云DashScope API
    const response = await axios({
      method: 'POST',
      url: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/virtualmodel/generation',
      headers: {
        'X-DashScope-Async': 'enable',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      data: requestData
    })
    
    // 返回结果
    if (response.data && response.data.task_id) {
      return {
        success: true,
        taskId: response.data.task_id
      }
    } else {
      return {
        success: false,
        error: '请求失败：API未返回任务ID',
        apiResponse: response.data
      }
    }
  } catch (error) {
    console.error('生成AI模特失败:', error)
    return {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }
}
