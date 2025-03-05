/**
 * 触摸处理模块
 * 负责处理所有触摸相关的逻辑
 */

/**
 * 初始化触摸状态数据
 * @return {Object} 初始化的触摸状态对象
 */
function initTouchState() {
  return {
    isTouching: false,
    lastTouchEndTime: 0,
    touchMoved: false,
    touchStartX: 0,
    touchStartY: 0,
    touchTime: 0,
    isSliding: false,
    slidingLocked: false,
    moveDistance: 0,
    lastSlideTime: 0,
    preventTapCount: 0,
    tapCoolingEndTime: 0
  };
}

/**
 * 处理触摸开始事件
 * @param {Object} e - 触摸事件对象
 * @param {Object} currentState - 当前状态
 * @return {Object} 更新后的状态对象
 */
function handleTouchStart(e, currentState) {
  if (e.touches.length !== 1) return currentState;
  
  const touch = e.touches[0];
  console.log('触摸开始 X:', touch.clientX, 'Y:', touch.clientY);
  
  return {
    ...currentState,
    touchStartX: touch.clientX,
    touchStartY: touch.clientY,
    touchTime: Date.now(),
    isSliding: false,
    touchMoved: false,
    moveDistance: 0,
    isTouching: true
  };
}

/**
 * 处理触摸移动事件
 * @param {Object} e - 触摸事件对象
 * @param {Object} currentState - 当前状态
 * @return {Object} 更新后的状态
 */
function handleTouchMove(e, currentState) {
  if (e.touches.length !== 1 || !currentState.touchStartX) return currentState;
  
  const touch = e.touches[0];
  const moveX = touch.clientX - currentState.touchStartX;
  const moveY = touch.clientY - currentState.touchStartY;
  const absoluteMoveX = Math.abs(moveX);
  
  // 更新移动距离
  let newState = { ...currentState };
  
  if (absoluteMoveX > Math.abs(currentState.moveDistance)) {
    newState.moveDistance = moveX;
  }
  
  // 判断是否是水平滑动
  if (Math.abs(moveX) > Math.abs(moveY) * 1.2) {
    // 检测任何移动
    if (absoluteMoveX > 3) {
      newState.touchMoved = true;
    }
    
    // 如果水平移动距离超过滑动阈值，标记为滑动
    if (absoluteMoveX > 10) {
      if (!currentState.isSliding) {
        console.log('检测到滑动，距离:', absoluteMoveX);
        newState.isSliding = true;
        newState.preventTapCount = currentState.preventTapCount + 1;
      }
      
      // 防止在滑动时触发系统的下拉刷新
      if (e.cancelable) {
        e.preventDefault();
      }
    }
  }
  
  return newState;
}

/**
 * 处理触摸结束事件
 * @param {Object} e - 触摸事件对象
 * @param {Object} currentState - 当前状态
 * @param {Function} slidePrev - 滑动到上一张的回调
 * @param {Function} slideNext - 滑动到下一张的回调
 * @return {Object} 结果对象，包含更新后的状态和重置信息
 */
function handleTouchEnd(e, currentState, slidePrev, slideNext) {
  if (!currentState.touchStartX) {
    return { newState: currentState };
  }
  
  const endTime = Date.now();
  const moveTime = endTime - currentState.touchTime;
  
  const endX = e.changedTouches[0].clientX;
  const moveDistance = endX - currentState.touchStartX;
  const absoluteMoveDistance = Math.abs(moveDistance);
  
  console.log('触摸结束，移动距离:', moveDistance, '移动时间:', moveTime);
  
  let newState = {
    ...currentState,
    lastTouchEndTime: endTime,
    isTouching: false
  };
  
  // 判断是否需要切换卡片
  if (currentState.isSliding || currentState.touchMoved) {
    // 记录最后一次滑动的时间戳
    const slideCooldown = absoluteMoveDistance > 30 ? 800 : 500;
    
    newState.lastSlideTime = endTime;
    newState.slidingLocked = true;
    
    // 根据滑动距离和速度确定是否切换卡片
    if ((moveTime < 300 && absoluteMoveDistance > 30) || absoluteMoveDistance > 50) {
      if (moveDistance > 0) {
        // 向右滑，切换到上一张
        console.log("触发向右滑动，调用slidePrev");
        slidePrev();
      } else {
        // 向左滑，切换到下一张
        console.log("触发向左滑动，调用slideNext");
        slideNext();
      }
    }
    
    // 创建结果对象，包含新状态和重置信息
    return {
      newState: newState,
      resetTimeout: slideCooldown,
      resetState: {
        isSliding: false,
        slidingLocked: false,
        touchStartX: 0,
        touchStartY: 0
      }
    };
  } else {
    // 即使没有明显滑动，也重置触摸状态
    newState.touchStartX = 0;
    newState.touchStartY = 0;
    newState.isSliding = false;
    
    return { newState: newState };
  }
}

/**
 * 检查是否应该阻止卡片点击
 * @param {Object} currentState - 当前状态
 * @return {Boolean} 是否应该阻止点击
 */
function shouldPreventCardTap(currentState) {
  const now = Date.now();
  
  // 1. 检查是否当前正处于滑动状态或滑动锁定状态
  if (currentState.isSliding || currentState.slidingLocked) {
    console.log('滑动状态中，点击被阻止');
    return true;
  }
  
  // 2. 检查是否在滑动冷却期内（滑动后的800毫秒内不允许点击）
  if (now - currentState.lastSlideTime < 800) {
    console.log('滑动冷却期内，点击被阻止');
    return true;
  }
  
  // 3. 检查是否有足够的时间过去 - 防止意外的快速连续点击
  if (now - currentState.tapCoolingEndTime < 300) {
    console.log('点击冷却期内，点击被阻止');
    return true;
  }
  
  return false;
}

module.exports = {
  initTouchState,
  handleTouchStart,
  handleTouchMove,
  handleTouchEnd,
  shouldPreventCardTap
};