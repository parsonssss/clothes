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
    // 先获取衣物信息，以便删除相关的云存储文件
    const clothingRes = await db.collection('clothes').doc(event.clothingId).get()
    const clothing = clothingRes.data
    
    // 验证用户权限（只能删除自己的衣物）
    if (clothing._openid !== wxContext.OPENID) {
      return {
        success: false,
        message: '无权删除该衣物'
      }
    }
    
    // 准备要删除的文件ID列表
    const fileIDs = []
    
    // 添加原始图片文件ID（如果存在）
    if (clothing.imageFileID) {
      fileIDs.push(clothing.imageFileID)
    }
    
    // 添加处理后的图片文件ID（如果存在）
    if (clothing.processedImageFileID) {
      fileIDs.push(clothing.processedImageFileID)
    }
    
    // 删除云存储中的文件（如果有）
    if (fileIDs.length > 0) {
      try {
        await cloud.deleteFile({
          fileList: fileIDs
        })
        console.log('删除云存储文件成功:', fileIDs)
      } catch (fileErr) {
        // 即使删除文件失败，也继续删除数据库记录
        console.error('删除云存储文件失败:', fileErr)
      }
    }
    
    // 删除数据库中的衣物记录
    const result = await db.collection('clothes').doc(event.clothingId).remove()
    
    return {
      success: true,
      deleted: result.stats.removed,
      message: '删除成功'
    }
  } catch (error) {
    console.error('删除衣物失败:', error)
    return {
      success: false,
      message: '删除失败: ' + error.message
    }
  }
} 