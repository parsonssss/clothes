Page({
  data: {
    // 定义颜色常量
    colors: {
      darkBrown: '#56513E',      // 深棕色（导航栏背景）
      darkOlive: '#3B3A30',      // 深橄榄绿（文字和图标）
      lightTaupe: '#BEB8A7',     // 浅灰褐色（页面背景和次要元素）
      mediumBrown: '#B38A63',    // 中棕色（卡片背景和强调元素）
      darkCoffee: '#473B29',     // 深咖啡色（分割线和次要文字）
    },
    // 定义衣物类别
    categories: [
      { id: 1, name: 'トップス', enName: 'Tops', icon: '上' },
      { id: 2, name: 'アウター', enName: 'Outerwear', icon: '外' },
      { id: 3, name: 'ボトムス', enName: 'Bottoms', icon: '下' },
      { id: 4, name: 'シューズ', enName: 'Shoes', icon: '靴' },
      { id: 5, name: 'アクセサリー', enName: 'Accessories', icon: '飾' },
    ],
    activeIndex: 2,
    selectedCategory: null,
    clothesItems: []
  },

  onLoad: function() {
    // 页面加载时的初始化逻辑
  },

  // 滑动卡片到下一个
  slideNext: function() {
    const totalCategories = this.data.categories.length;
    let nextIndex = this.data.activeIndex + 1;
    if (nextIndex >= totalCategories) {
      nextIndex = 0;
    }
    this.setData({
      activeIndex: nextIndex
    });
  },

  // 滑动卡片到上一个
  slidePrev: function() {
    const totalCategories = this.data.categories.length;
    let prevIndex = this.data.activeIndex - 1;
    if (prevIndex < 0) {
      prevIndex = totalCategories - 1;
    }
    this.setData({
      activeIndex: prevIndex
    });
  },

  // 点击卡片，展示详情
  onCardTap: function(e) {
    const index = e.currentTarget.dataset.index;
    if (index === this.data.activeIndex) {
      const selectedCategory = this.data.categories[index];
      const clothesItems = this.getClothesForCategory(selectedCategory.id);
      this.setData({
        selectedCategory: selectedCategory,
        clothesItems: clothesItems
      });
    }
  },

  // 关闭详情卡片
  closeDetail: function() {
    this.setData({
      selectedCategory: null
    });
  },

  // 点击详情卡片外部关闭
  onDetailBackgroundTap: function() {
    this.closeDetail();
  },

  // 阻止冒泡
  preventBubble: function() {
    // 阻止点击事件冒泡
  },

  // 获取某类别的衣物数据（模拟数据）
  getClothesForCategory: function(categoryId) {
    // 这里应该从数据库或缓存中获取真实数据
    // 现在使用模拟数据
    return Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `Item ${i + 1}`,
      image: `/images/placeholder-${categoryId}-${i + 1}.png`
    }));
  },

  // 计算卡片的X轴偏移量
  getTranslateX: function(index) {
    const activeIndex = this.data.activeIndex;
    const totalCategories = this.data.categories.length;
    
    // 计算相对于活动卡片的位置
    let relativePosition = index - activeIndex;
    if (relativePosition < -2) relativePosition += totalCategories;
    if (relativePosition > 2) relativePosition -= totalCategories;
    
    return relativePosition * 60;
  },

  // 计算卡片的缩放比例
  getScale: function(index) {
    const activeIndex = this.data.activeIndex;
    const totalCategories = this.data.categories.length;
    
    let relativePosition = index - activeIndex;
    if (relativePosition < -2) relativePosition += totalCategories;
    if (relativePosition > 2) relativePosition -= totalCategories;
    
    return 1 - Math.abs(relativePosition) * 0.1;
  },

  // 计算卡片的z-index
  getZIndex: function(index) {
    const activeIndex = this.data.activeIndex;
    const totalCategories = this.data.categories.length;
    
    let relativePosition = index - activeIndex;
    if (relativePosition < -2) relativePosition += totalCategories;
    if (relativePosition > 2) relativePosition -= totalCategories;
    
    return 10 - Math.abs(relativePosition);
  },

  // 计算卡片的透明度
  getOpacity: function(index) {
    const activeIndex = this.data.activeIndex;
    const totalCategories = this.data.categories.length;
    
    let relativePosition = index - activeIndex;
    if (relativePosition < -2) relativePosition += totalCategories;
    if (relativePosition > 2) relativePosition -= totalCategories;
    
    return 1 - Math.abs(relativePosition) * 0.2;
  },

  // 判断是否应该渲染该卡片
  shouldRenderCard: function(index) {
    const activeIndex = this.data.activeIndex;
    const totalCategories = this.data.categories.length;
    
    let relativePosition = index - activeIndex;
    if (relativePosition < -2) relativePosition += totalCategories;
    if (relativePosition > 2) relativePosition -= totalCategories;
    
    return Math.abs(relativePosition) <= 2;
  }
})
