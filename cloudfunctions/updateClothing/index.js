// 云函数入口文件
const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 云函数入口函数
exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  
  // 检查必要参数
  if (!event.clothingId) {
    return {
      success: false,
      message: '缺少衣物ID'
    }
  }
  
  try {
    // 构建更新数据对象
    const updateData = {}
    
    // 只更新提供的字段
    if (event.name !== undefined) updateData.name = event.name
    if (event.category !== undefined) updateData.category = event.category
    if (event.type !== undefined) updateData.type = event.type
    if (event.color !== undefined) updateData.color = event.color
    if (event.style !== undefined) updateData.style = event.style
    if (event.warmthLevel !== undefined) updateData.warmthLevel = event.warmthLevel
    if (event.scenes !== undefined) updateData.scenes = event.scenes
    if (event.price !== undefined) updateData.price = event.price
    
    // 添加更新时间
    updateData.updateTime = db.serverDate()
    
    // 执行更新操作
    const result = await db.collection('clothes').doc(event.clothingId).update({
      data: updateData
    })
    
    return {
      success: true,
      updated: result.stats.updated,
      message: '更新成功'
    }
  } catch (error) {
    console.error('更新衣物失败:', error)
    return {
      success: false,
      message: '更新失败: ' + error.message
    }
  }
} 