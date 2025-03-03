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
    const { 
      weatherData,  // 当前天气数据
      userClothes   // 用户的衣柜数据，可选
    } = event
    
    // 验证必要参数
    if (!weatherData) {
      return {
        success: false,
        error: '缺少天气数据参数'
      }
    }
    
    // DeepSeek API密钥
    const apiKey = 'sk-0f7c2bc1c86447268586c52a5ee3cde2'
    
    // 构建提示词
    let prompt = `
作为AI时尚顾问，请为用户根据以下天气情况推荐今日穿搭：
- 城市: ${weatherData.city || '未知'}
- 温度: ${weatherData.temperature || '未知'}
- 天气情况: ${weatherData.condition || '未知'}
- 湿度: ${weatherData.humidity || '未知'}
- 风速: ${weatherData.windSpeed || '未知'}

请以JSON格式返回推荐的穿搭（注意不要有任何其他文字说明，只返回JSON对象）：
- 推荐配合至少3件衣物，包括上衣、下装和外套（如果温度适合的话）
- 每件衣物的属性应包括：类别(category)、颜色(color)、风格(style)

推荐的格式如下：
{
  "recommendation": [
    {
      "category": "上衣",
      "type": "T恤",
      "color": "白色",
      "style": "简约"
    },
    {
      "category": "裤子",
      "type": "牛仔裤",
      "color": "蓝色",
      "style": "修身"
    },
    {
      "category": "外套",
      "type": "夹克",
      "color": "黑色",
      "style": "休闲"
    }
  ],
  "description": "今天天气适合穿简约风格的搭配，建议穿白色T恤搭配蓝色牛仔裤，外套选择黑色休闲夹克。"
}

如果用户提供了衣柜信息，请尽量从中选择合适的衣物进行推荐。
`

    // 如果有用户衣柜数据，添加到提示词中
    if (userClothes && userClothes.length > 0) {
      prompt += `\n用户的衣柜包含以下衣物：\n`
      
      userClothes.forEach((item, index) => {
        prompt += `${index + 1}. ID: ${item._id}, 类别: ${item.category}, 类型: ${item.clothingType || '未知'}, 颜色: ${item.color || '未知'}, 风格: ${item.style || '未知'}\n`
      })
      
      prompt += `\n请从这些衣物中选择合适的搭配，在推荐中添加衣物ID以便我们找到对应衣物。`
    }
    
    // 调用DeepSeek API
    const response = await axios({
      method: 'POST',
      url: 'https://api.deepseek.com/chat/completions',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      data: {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a fashion consultant AI. Respond only with JSON format as specified in the request. Do not include any other text outside the JSON object.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        stream: false
      }
    })
    
    // 解析响应
    if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
      const content = response.data.choices[0].message.content
      
      // 尝试从内容中提取JSON
      try {
        // 如果内容中包含了额外的描述文字，尝试只提取JSON部分
        const jsonMatch = content.match(/\{[\s\S]*\}/)
        const jsonStr = jsonMatch ? jsonMatch[0] : content
        
        const recommendationData = JSON.parse(jsonStr)
        
        // 如果有用户衣柜数据，尝试匹配推荐的衣物ID
        if (userClothes && userClothes.length > 0 && recommendationData.recommendation) {
          // 查找衣柜中匹配的衣物
          const matchedOutfit = []
          
          // 处理每个推荐的衣物
          for (const item of recommendationData.recommendation) {
            // 尝试找到匹配的衣物
            let match = null
            
            // 如果推荐中包含ID，直接通过ID匹配
            if (item._id) {
              match = userClothes.find(cloth => cloth._id === item._id)
            }
            
            // 如果没有通过ID匹配到，尝试通过属性匹配
            if (!match) {
              match = userClothes.find(cloth => 
                cloth.category === item.category && 
                (!item.color || cloth.color === item.color) &&
                (!item.style || cloth.style === item.style)
              )
            }
            
            // 如果找到匹配的衣物，添加到结果中
            if (match) {
              matchedOutfit.push(match)
            }
          }
          
          // 如果找到了匹配的衣物，返回这些衣物的信息
          if (matchedOutfit.length > 0) {
            return {
              success: true,
              recommendation: recommendationData,
              matchedOutfit: matchedOutfit
            }
          }
        }
        
        // 如果没有匹配到衣物或没有衣柜数据，只返回推荐信息
        return {
          success: true,
          recommendation: recommendationData,
          matchedOutfit: []
        }
      } catch (error) {
        console.error('解析DeepSeek返回的JSON失败:', error)
        return {
          success: false,
          error: '解析推荐数据失败',
          content: content
        }
      }
    } else {
      return {
        success: false,
        error: 'DeepSeek API返回异常',
        response: response.data
      }
    }
  } catch (error) {
    console.error('获取穿搭推荐失败:', error)
    return {
      success: false,
      error: error.message,
      stack: error.stack
    }
  }
}
