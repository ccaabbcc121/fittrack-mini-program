// utils/util.js - 工具函数

// 格式化日期
function formatDate(date, fmt = 'YYYY-MM-DD') {
  if (typeof date === 'string') date = new Date(date)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hour = date.getHours()
  const minute = date.getMinutes()
  const second = date.getSeconds()
  return fmt
    .replace('YYYY', year)
    .replace('MM', String(month).padStart(2, '0'))
    .replace('DD', String(day).padStart(2, '0'))
    .replace('HH', String(hour).padStart(2, '0'))
    .replace('mm', String(minute).padStart(2, '0'))
    .replace('ss', String(second).padStart(2, '0'))
}

// 获取当前日期
function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}

// 计算BMI
function calcBMI(weight, height) {
  if (!weight || !height || height <= 0) return 0
  const h = height / 100
  return parseFloat((weight / (h * h)).toFixed(1))
}

// BMI评价
function getBMICategory(bmi) {
  if (bmi < 18.5) return { label: '偏瘦', color: '#ff9500' }
  if (bmi < 24) return { label: '正常', color: '#34c759' }
  if (bmi < 28) return { label: '偏重', color: '#ff9500' }
  return { label: '肥胖', color: '#ff3b30' }
}

// 训练类型映射
const workoutTypeMap = {
  'strength': { label: '力量训练', color: '#e94560' },
  'cardio': { label: '有氧运动', color: '#0f3460' },
  'hiit': { label: 'HIIT', color: '#ff9500' },
  'flexibility': { label: '柔韧性', color: '#34c759' },
  'other': { label: '其他', color: '#8e8e93' }
}

function getWorkoutType(type) {
  return workoutTypeMap[type] || { label: type, color: '#8e8e93' }
}

// 餐食类型映射
const mealTypeMap = {
  'breakfast': { label: '早餐', icon: '🌅' },
  'lunch': { label: '午餐', icon: '☀️' },
  'dinner': { label: '晚餐', icon: '🌙' }
}

function getMealType(type) {
  return mealTypeMap[type] || { label: type, icon: '🍽️' }
}

// Toast 消息
function showToast(title, icon = 'none') {
  wx.showToast({ title, icon, duration: 2000 })
}

// 确认对话框
function showConfirm(title, content) {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      success: (res) => { resolve(res.confirm) },
      fail: (err) => {
        console.warn('showModal 调用失败:', err)
        resolve(false)  // 弹窗失败时视为取消，避免 Promise 永不 settle
      }
    })
  })
}

// 数字格式化
function formatNumber(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

module.exports = {
  formatDate,
  getToday,
  calcBMI,
  getBMICategory,
  getWorkoutType,
  getMealType,
  showToast,
  showConfirm,
  formatNumber
}
