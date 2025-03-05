/**
 * 分页管理模块
 * 负责处理分页相关的逻辑
 */

/**
 * 计算分页信息
 * @param {Number} total - 总数据条数
 * @param {Number} pageSize - 每页条数
 * @param {Number} currentPage - 当前页码
 * @return {Object} 分页信息
 */
function calculatePagination(total, pageSize, currentPage) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const validCurrentPage = Math.min(Math.max(1, currentPage), totalPages);
  
  return {
    totalPages: totalPages,
    currentPage: validCurrentPage,
    pageSize: pageSize,
    hasPrev: validCurrentPage > 1,
    hasNext: validCurrentPage < totalPages,
    skip: (validCurrentPage - 1) * pageSize,
    limit: pageSize
  };
}

/**
 * 获取分页器数据
 * @param {Number} currentPage - 当前页码
 * @param {Number} totalPages - 总页数
 * @param {Number} visiblePagesCount - 可见页码数量
 * @return {Array} 分页器数据
 */
function getPaginationData(currentPage, totalPages, visiblePagesCount = 5) {
  const pages = [];
  
  if (totalPages <= 1) {
    return [];
  }
  
  if (totalPages <= visiblePagesCount) {
    // 总页数小于可见页数，显示所有页码
    for (let i = 1; i <= totalPages; i++) {
      pages.push({
        page: i,
        current: i === currentPage
      });
    }
  } else {
    // 总页数大于可见页数，需要显示部分页码
    const halfVisible = Math.floor(visiblePagesCount / 2);
    let startPage = Math.max(1, currentPage - halfVisible);
    let endPage = startPage + visiblePagesCount - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(1, endPage - visiblePagesCount + 1);
    }
    
    // 添加第一页
    if (startPage > 1) {
      pages.push({
        page: 1,
        current: false
      });
      
      // 如果不是紧挨着第一页，添加省略号
      if (startPage > 2) {
        pages.push({
          page: '...',
          current: false,
          disabled: true
        });
      }
    }
    
    // 添加可见页码
    for (let i = startPage; i <= endPage; i++) {
      pages.push({
        page: i,
        current: i === currentPage
      });
    }
    
    // 添加最后一页
    if (endPage < totalPages) {
      // 如果不是紧挨着最后一页，添加省略号
      if (endPage < totalPages - 1) {
        pages.push({
          page: '...',
          current: false,
          disabled: true
        });
      }
      
      pages.push({
        page: totalPages,
        current: false
      });
    }
  }
  
  return pages;
}

module.exports = {
  calculatePagination,
  getPaginationData
};