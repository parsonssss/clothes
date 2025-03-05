/**
 * 调试辅助模块
 * 提供调试信息记录和分析功能
 */

const DEBUG_ENABLED = true;

/**
 * 记录调试信息
 * @param {String} message - 调试信息
 * @param {Object} data - 附加数据对象（可选）
 */
function log(message, data = null) {
  if (!DEBUG_ENABLED) return;
  
  const timestamp = new Date().toISOString().split('T')[1].slice(0, -1);
  const prefix = `[DEBUG ${timestamp}]`;
  
  if (data) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}

/**
 * 记录触摸事件信息
 * @param {String} eventName - 事件名称
 * @param {Object} event - 触摸事件对象
 * @param {Object} state - 当前状态
 */
function logTouchEvent(eventName, event, state) {
  if (!DEBUG_ENABLED) return;
  
  const touchInfo = event.touches && event.touches[0] ? {
    clientX: event.touches[0].clientX,
    clientY: event.touches[0].clientY,
    pageX: event.touches[0].pageX,
    pageY: event.touches[0].pageY
  } : 'No touch info';
  
  const stateInfo = {
    isSliding: state.isSliding,
    slidingLocked: state.slidingLocked,
    touchMoved: state.touchMoved,
    moveDistance: state.moveDistance,
    touchStartX: state.touchStartX,
    touchStartY: state.touchStartY
  };
  
  log(`触摸事件: ${eventName}`, {
    touch: touchInfo,
    state: stateInfo
  });
}

/**
 * 记录滑动状态变化
 * @param {String} actionName - 动作名称
 * @param {Object} beforeState - 变化前状态
 * @param {Object} afterState - 变化后状态
 */
function logStateChange(actionName, beforeState, afterState) {
  if (!DEBUG_ENABLED) return;
  
  // 提取关键状态变化
  const changes = {};
  const keysToCompare = [
    'isSliding', 'slidingLocked', 'touchMoved', 
    'moveDistance', 'currentIndex'
  ];
  
  keysToCompare.forEach(key => {
    if (beforeState[key] !== afterState[key]) {
      changes[key] = {
        from: beforeState[key],
        to: afterState[key]
      };
    }
  });
  
  log(`状态变化: ${actionName}`, {
    changes: changes,
    hasChanges: Object.keys(changes).length > 0
  });
}

module.exports = {
  log,
  logTouchEvent,
  logStateChange
};