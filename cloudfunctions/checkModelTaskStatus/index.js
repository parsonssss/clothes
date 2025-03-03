// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

// 云函数入口函数
exports.main = async (event, context) => {
  try {
    // 获取任务ID
    const { taskId } = event
    
    // 验证必要参数
    if (!taskId) {
      return {
        success: false,
        error: '缺少任务ID参数'
      }
    }
    
    // 从环境变量或云环境变量获取API密钥
    const apiKey = process.env.DASHSCOPE_API_KEY || 'your_api_key_here'
    
    // 检查任务状态
    const response = await axios({
      method: 'GET',
      url: `https://dashscope.aliyuncs.com/api/v1/tasks/${taskId}`,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    })
    
    // 返回结果
    if (response.data) {
      return {
        success: true,
        status: response.data.task_status,
        output: response.data.output || null
      }
    } else {
      return {
        success: false,
        error: '请求失败：API未返回任务状态',
        apiResponse: response.data
      }
    }
  } catch (error) {
    console.error('检查任务状态失败:', error)
    return {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }
}
