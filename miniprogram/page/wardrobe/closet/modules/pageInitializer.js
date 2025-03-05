/**
 * 页面初始化模块
 * 负责页面的初始化逻辑
 */

/**
 * 初始化页面数据
 * @param {Object} colors - 全局颜色配置
 * @return {Object} 初始化的页面数据
 */
function initPageData(colors) {
  return {
    // 使用全局颜色配置
    colors: {
      darkBrown: colors.darkBrown,
      darkOlive: colors.deepOlive,
      lightTaupe: colors.lightTaupe,
      mediumBrown: colors.mediumBrown,
      darkCoffee: colors.darkCoffee,
    },
    // 分页相关
    currentPage: 1,
    pageSize: 12,
    totalPages: 1,
    lastImageUrlUpdateTime: 0,
    
    // 定义衣物类别
    categories: [
      { id: 0, name: '全て', enName: 'All', icon: '全', count: 0 },
      { id: 1, name: 'トップス', enName: 'Tops', icon: '上', count: 0, category: '上衣' },
      { id: 2, name: 'パンツ', enName: 'Pants', icon: '裤', count: 0, category: '裤子' },
      { id: 3, name: 'スカート', enName: 'Skirts', icon: '裙', count: 0, category: '裙子' },
      { id: 4, name: 'アウター', enName: 'Outerwear', icon: '外', count: 0, category: '外套' },
      { id: 5, name: 'シューズ', enName: 'Shoes', icon: '鞋', count: 0, category: '鞋子' },
      { id: 6, name: 'アクセサリー', enName: 'Accessories', icon: '饰', count: 0, category: '配饰' }
    ],
    
    currentIndex: 0,
    cards: [],
    selectedCategory: null,
    clothes: [],
    filteredClothes: [],
    currentPageClothes: [],
    showAddOptions: false,
    isUploading: false,
    isLoading: true,
    userOpenId: '',
    templatePath: '',
    currentCategoryFilter: null,
    categoriesInitialized: false,
  };
}

/**
 * 初始化云环境
 * @return {Boolean} 初始化是否成功
 */
function initCloudEnv() {
  if (!wx.cloud) {
    console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    return false;
  }
  
  wx.cloud.init({
    env: 'cloud1-3gi97kso9ab01185',
    traceUser: true,
  });
  
  return true;
}

/**
 * 设置模板更新定时器
 * @param {Function} updateCallback - 定时更新回调函数
 * @return {Number} 定时器ID
 */
function setTemplateUpdateInterval(updateCallback) {
  // 设置24小时更新一次（24小时 * 60分钟 * 60秒 * 1000毫秒）
  const UPDATE_INTERVAL = 24 * 60 * 60 * 1000;
  
  return setInterval(() => {
    console.log('定时任务：更新抠图模板');
    updateCallback();
  }, UPDATE_INTERVAL);
}

module.exports = {
  initPageData,
  initCloudEnv,
  setTemplateUpdateInterval
};