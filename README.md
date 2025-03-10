# 衣柜助手 - 智能服装管理微信小程序

衣柜助手是一款基于微信小程序的智能服装管理应用，帮助用户轻松管理个人衣物、搭配穿着方案，并通过AI技术提供智能化服务。

## 🌟 核心功能

### 服装管理
- **智能分类**: 自动识别并分类上衣、裤子、裙子、外套、鞋子、配饰等不同类型的服装
- **衣物统计**: 自动计算并展示各类别衣物数量，帮助用户了解衣柜构成
- **时装详情**: 记录每件衣物的详细信息，包括类型、颜色、风格、保暖度等
- **分页浏览**: 支持按类别分页查看所有衣物，操作简单直观

### 智能处理
- **背景抠图**: 自动去除衣物照片背景，生成透明背景的衣物图像
- **AI分析**: 利用人工智能分析衣物特征，自动提取关键属性
- **云端存储**: 安全存储用户衣物信息和图片到云端，随时随地访问

### 交互体验
- **卡片滑动**: 流畅的卡片滑动交互，轻松切换不同衣物类别
- **防误触机制**: 智能区分滑动和点击操作，提升用户体验
- **加载优化**: 智能控制加载UI显示，提供流畅的用户体验

## 🧩 项目结构

```
miniprogram/
├── page/wardrobe/          // 主要功能模块
│   ├── closet/             // 衣柜管理功能
│   │   ├── modules/        // 功能模块
│   │   │   ├── cardManager.js     // 卡片UI管理
│   │   │   ├── dataManager.js     // 数据加载和管理
│   │   │   ├── imageProcessor.js  // 图像处理
│   │   │   ├── userManager.js     // 用户信息管理
│   │   │   └── closetUtils.js     // 通用工具函数
│   ├── profile/            // 用户信息
│   ├── calendar/           // 日历搭配
│   └── outfit/             // 穿搭推荐
│
cloudfunctions/               // 云函数
├── analyzeClothing/         // 衣物AI分析
├── processClothing/         // 衣物图像处理
├── login/                   // 用户登录
└── getTempFileURL/          // 获取临时文件URL
```

## 🔧 技术亮点

### 1. 智能衣物分析
- 使用阿里云Qwen-VL-Plus视觉大模型分析衣物图片
- 自动识别衣物类型、颜色、风格和适合场合
- 提取关键特征用于后续智能推荐

### 2. 背景抠图技术
- 使用云端API自动处理衣物照片
- 去除背景，生成专业透明背景图片
- 支持模板参数自定义，优化抠图效果

### 3. 用户体验优化
- 自适应加载策略：切换卡片时避免不必要的loading提示
- 类别计数缓存：仅在必要时更新类别数量统计
- 双层触摸保护：防止滑动误触，提升交互体验

### 4. 云端数据管理
- 基于云开发存储用户数据和图片
- 自动管理图片临时链接，确保链接有效
- 高效的数据查询和分页展示策略

## 🚀 性能优化

1. **延迟加载**：仅在需要时加载数据，减少不必要的网络请求
2. **条件渲染**：智能控制UI元素渲染，提高页面响应速度
3. **缓存策略**：合理利用本地缓存，减少重复数据请求
4. **图像优化**：优化图像加载和显示策略，提升用户体验

## 💡 后续开发计划

- [ ] 添加智能穿搭推荐功能
- [ ] 支持服装季节性标签管理
- [ ] 加入社区功能，支持穿搭分享
- [ ] 扩展服装管理属性，增加更多服装维度
- [ ] 优化小程序性能，提升加载速度

## 📝 使用说明

### 开发环境准备
1. 安装[微信开发者工具](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. 克隆代码仓库
3. 在项目根目录安装依赖：
```bash
npm install
cd miniprogram
npm install
```
4. 在微信开发者工具中使用"工具-构建npm"

### 云开发环境配置
1. 在微信开发者工具中开通云开发
2. 创建数据库集合：`clothes`、`users`
3. 部署云函数：
```bash
cd cloudfunctions/analyzeClothing
npm install
```
4. 上传并部署所有云函数

## 🤝 贡献

欢迎通过Issue和Pull Request的方式贡献代码，帮助我们改进项目。

## 📄 许可证

本项目基于MIT许可证开源，详见[LICENSE](LICENSE)文件。
