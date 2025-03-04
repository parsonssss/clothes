/**
 * 通用工具函数模块
 * 提供一些通用的辅助函数
 */

/**
 * 显示错误提示
 * @param {String} message - 错误信息
 */
function showErrorToast(message) {
  // 确保先隐藏加载提示
  wx.hideLoading();
  
  wx.showToast({
    title: message,
    icon: 'none',
    duration: 2000
  });
}

/**
 * 显示成功提示
 * @param {String} message - 成功信息
 */
function showSuccessToast(message) {
  // 确保先隐藏加载提示
  wx.hideLoading();
  
  wx.showToast({
    title: message,
    icon: 'success',
    duration: 2000
  });
}

/**
 * 显示加载提示
 * @param {String} message - 加载提示信息
 */
function showLoading(message) {
  wx.showLoading({
    title: message || '加载中...',
    mask: true // 添加遮罩防止用户多次点击
  });
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading();
}

/**
 * 硬编码的抠图模板，当无法读取模板文件时使用
 */
const hardcodedKoutuTemplate = {
  "prompt": {
    "14": {
      "inputs": {
        "aspect_ratio": "original",
        "proportional_width": 1,
        "proportional_height": 1,
        "fit": "letterbox",
        "method": "lanczos",
        "round_to_multiple": "8",
        "scale_to_longest_side": true,
        "longest_side": 1024,
        "image": [
          "27",
          0
        ]
      },
      "class_type": "LayerUtility: ImageScaleByAspectRatio",
      "_meta": {
        "title": "LayerUtility: ImageScaleByAspectRatio"
      }
    },
    "17": {
      "inputs": {
        "invert_mask": false,
        "blend_mode": "normal",
        "opacity": 100,
        "x_percent": 50,
        "y_percent": 50,
        "mirror": "None",
        "scale": 1,
        "aspect_ratio": 1,
        "rotate": 0,
        "transform_method": "lanczos",
        "anti_aliasing": 0,
        "background_image": [
          "18",
          0
        ],
        "layer_image": [
          "14",
          0
        ],
        "layer_mask": [
          "24",
          1
        ]
      },
      "class_type": "LayerUtility: ImageBlendAdvance V2",
      "_meta": {
        "title": "LayerUtility: ImageBlendAdvance V2"
      }
    },
    "18": {
      "inputs": {
        "panel_width": [
          "20",
          0
        ],
        "panel_height": [
          "20",
          1
        ],
        "fill_color": "white",
        "fill_color_hex": "#000000"
      },
      "class_type": "CR Color Panel",
      "_meta": {
        "title": "🌁 CR Color Panel"
      }
    },
    "20": {
      "inputs": {
        "image": [
          "14",
          0
        ]
      },
      "class_type": "easy imageSize",
      "_meta": {
        "title": "ImageSize"
      }
    },
    "21": {
      "inputs": {
        "filename_prefix": "ComfyUI",
        "images": [
          "17",
          0
        ]
      },
      "class_type": "SaveImage",
      "_meta": {
        "title": "Save Image"
      }
    },
    "24": {
      "inputs": {
        "sam_model": "sam_hq_vit_h (2.57GB)",
        "grounding_dino_model": "GroundingDINO_SwinT_OGC (694MB)",
        "threshold": 0.3,
        "detail_method": "VITMatte(local)",
        "detail_erode": 6,
        "detail_dilate": 6,
        "black_point": 0.15,
        "white_point": 0.99,
        "process_detail": false,
        "prompt": "clothes",
        "device": "cuda",
        "max_megapixels": 2,
        "cache_model": false,
        "image": [
          "14",
          0
        ]
      },
      "class_type": "LayerMask: SegmentAnythingUltra V2",
      "_meta": {
        "title": "LayerMask: SegmentAnythingUltra V2"
      }
    },
    "27": {
      "inputs": {
        "image": "", // 将在使用时替换为实际的图片URL
        "keep_alpha_channel": false,
        "output_mode": false
      },
      "class_type": "LoadImageFromUrl",
      "_meta": {
        "title": "Load Image From URL"
      }
    }
  }
};

module.exports = {
  showErrorToast,
  showSuccessToast,
  showLoading,
  hideLoading,
  hardcodedKoutuTemplate
}; 