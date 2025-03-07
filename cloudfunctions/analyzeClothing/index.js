// 云函数入口文件
const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV }) // 使用当前云环境

// API配置
const API_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'
const API_KEY = 'sk-144cfa99383f4c29bfe781a7d74452aa' // 注意: 实际开发中应使用环境变量或云环境参数存储密钥

// 云函数入口函数
exports.main = async (event, context) => {
  // 获取图片URL
  const imageUrl = event.imageUrl
  
  if (!imageUrl) {
    return {
      success: false,
      error: '未提供图片URL'
    }
  }
  
  try {
    // 构建请求数据
    const requestData = {
      model: "qwen-vl-plus-latest",
      messages: [{
        role: "user",
        content: [
          {
            type: "text",
            text: "识别图片中的衣物，将衣服的信息以json格式返回(仅仅输出json结果即可，不要输出任何解释，key为clothing_type，color，style，warmth_level，sceneApplicability） 要求识别衣服的信息：\n** **\n1. 衣服类型（上衣，下衣，外套，饰品，鞋子）\n2. 衣服颜色\n3. 衣服风格\n4. 衣服的保暖程度（等级为1-5，根据衣服类型打分）\n5. 场景适用性（工作，休闲等）。当识别到不是衣服时，用诙谐的方式对其进行分类，比如上传的是狗，可以把名字（name）设置为狗皮大衣，猫皮包包等等，可以发挥你的想象力"
          },
          {
            type: "image_url",
            image_url: {
              url: imageUrl
            }
          }
        ]
      }]
    }
    
    // 发送API请求
    const response = await axios({
      method: 'post',
      url: API_URL,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      data: requestData,
      timeout: 30000 // 设置30秒超时
    })
    
    // 解析API响应
    if (response.data && response.data.choices && response.data.choices.length > 0) {
      const content = response.data.choices[0].message.content

      // 尝试从文本中提取JSON
      try {
        // 查找文本中的JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        let clothingData = null;
        
        if (jsonMatch) {
          // 尝试解析找到的JSON
          clothingData = JSON.parse(jsonMatch[0]);
        } else {
          // 如果没有找到JSON，使用正则匹配提取信息
          const typeMatch = content.match(/类型[：:]\s*([^,\n]+)/);
          const colorMatch = content.match(/颜色[：:]\s*([^,\n]+)/);
          const styleMatch = content.match(/风格[：:]\s*([^,\n]+)/);
          const warmthMatch = content.match(/保暖程度[：:]\s*(\d)/);
          const sceneMatch = content.match(/场景适用性[：:]\s*([^,\n]+)/);
          
          clothingData = {
            clothing_type: typeMatch ? typeMatch[1].trim() : '未知',
            color: colorMatch ? colorMatch[1].trim() : '未知',
            style: styleMatch ? styleMatch[1].trim() : '未知',
            warmth_level: warmthMatch ? parseInt(warmthMatch[1]) : 3,
            scene_applicability: sceneMatch ? sceneMatch[1].trim().split('，') : ['休闲']
          };
        }
        
        // 根据类型设置名称
        let name = '';
        if (clothingData.clothing_type.includes('上衣')) {
          name = clothingData.color + clothingData.style + '上衣';
        } else if (clothingData.clothing_type.includes('下衣') || clothingData.clothing_type.includes('裤')) {
          name = clothingData.color + clothingData.style + '裤子';
        } else if (clothingData.clothing_type.includes('外套')) {
          name = clothingData.color + clothingData.style + '外套';
        } else if (clothingData.clothing_type.includes('饰品')) {
          name = clothingData.color + clothingData.style + '饰品';
        } else {
          name = clothingData.color + clothingData.style + '衣物';
        }
        
        // 标准化类别
        let category = '未分类';
        if (clothingData.clothing_type.includes('上衣') || clothingData.clothing_type.includes('衬衫') || 
            clothingData.clothing_type.includes('T恤') || clothingData.clothing_type.includes('卫衣') || clothingData.clothing_type.includes('毛衣')) {
          category = '上衣';
        } else if (clothingData.clothing_type.includes('裤') || clothingData.clothing_type.includes('下衣')) {
          category = '裤子';
        } else if (clothingData.clothing_type.includes('裙')) {
          category = '裙子';
        } else if (clothingData.clothing_type.includes('外套') || clothingData.clothing_type.includes('夹克') || 
                  clothingData.clothing_type.includes('大衣')) {
          category = '外套';
        } else if (clothingData.clothing_type.includes('鞋')) {
          category = '鞋子';
        } else if (clothingData.clothing_type.includes('饰品') || clothingData.clothing_type.includes('帽') || 
                  clothingData.clothing_type.includes('围巾') || clothingData.clothing_type.includes('手套')) {
          category = '配饰';
        }
        
        // 将处理后的数据添加到完整数据中
        clothingData.name = name;
        clothingData.category = category;
        
        return {
          success: true,
          data: clothingData,
          rawResponse: content
        }
      } catch (jsonError) {
        return {
          success: false,
          error: '无法解析JSON响应',
          rawResponse: content
        }
      }
    }
    
    return {
      success: false,
      error: '无效的API响应',
      rawResponse: response.data
    }
  } catch (error) {
    console.error('API请求错误:', error)
    return {
      success: false,
      error: error.message || '请求失败',
      stack: error.stack
    }
  }
}
