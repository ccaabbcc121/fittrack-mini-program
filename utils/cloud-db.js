// utils/cloud-db.js — 云数据库操作封装
// 替换原 api.js，所有函数签名与原版兼容
// 显式 _openid 过滤 + 云数据库权限规则 = 双重数据隔离
// 支持迁移未完成时的本地 Storage 降级读取

const util = require('./util.js')
const db = wx.cloud.database()
const _ = db.command

// ==================== 内部工具 ====================

function getOpenid() {
  const app = getApp()
  return app.globalData.openid || wx.getStorageSync('_openid') || ''
}

function isMigrationDone() {
  const app = getApp()
  return app.globalData.migrationDone === true
}

// 包装返回值为 { data: ... } 格式，与原 api.js 兼容
function wrapData(data) {
  return { data }
}

// ==================== 用户资料 ====================

function getUserInfo() {
  const openid = getOpenid()
  return db.collection('user')
    .where({ _openid: openid })
    .get()
    .then(res => {
      if (res.data && res.data.length > 0) {
        const info = res.data[0]
        // 同步到 globalData
        const app = getApp()
        app.globalData.userInfo = info
        return wrapData(info)
      }
      return wrapData(null)
    })
    .catch(err => {
      console.error('[cloudDB] getUserInfo 失败:', err)
      // 降级：读旧 userInfo
      if (!isMigrationDone()) {
        const oldInfo = wx.getStorageSync('userInfo')
        if (oldInfo) return wrapData(oldInfo)
      }
      return wrapData(null)
    })
}

function updateUserInfo(data) {
  const openid = getOpenid()
  return db.collection('user')
    .where({ _openid: openid })
    .get()
    .then(res => {
      const updateData = { ...data, updateTime: new Date() }
      if (res.data.length > 0) {
        return db.collection('user').doc(res.data[0]._id).update({ data: updateData })
      } else {
        return db.collection('user').add({ data: { ...updateData, createTime: new Date() } })
      }
    })
    .then(result => {
      // 同步到 globalData
      const app = getApp()
      app.globalData.userInfo = { ...app.globalData.userInfo, ...data }
      return wrapData(result)
    })
    .catch(err => {
      console.error('[cloudDB] updateUserInfo 失败:', err)
      return wrapData(null)
    })
}

// ==================== 体重记录 ====================

function getWeightRecords(page = 1, pageSize = 100) {
  const openid = getOpenid()
  return db.collection('weightRecord')
    .where({ _openid: openid })
    .orderBy('recordDate', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
    .then(res => {
      const records = res.data || []
      return wrapData({ records, total: records.length, page, pageSize })
    })
    .catch(err => {
      console.error('[cloudDB] getWeightRecords 失败:', err)
      // 降级：仅在迁移未完成时读本地
      if (!isMigrationDone()) {
        const local = wx.getStorageSync('_local_weights') || []
        return wrapData({ records: local, total: local.length, page, pageSize })
      }
      return wrapData({ records: [], total: 0, page, pageSize })
    })
}

function createWeightRecord(data) {
  return db.collection('weightRecord').add({
    data: {
      weight: data.weight,
      bodyFat: data.bodyFat || null,
      recordDate: data.recordDate,
      createTime: new Date()
    }
  }).then(res => wrapData(res))
}

function updateWeightRecord(id, data) {
  return db.collection('weightRecord').doc(id).update({
    data: {
      weight: data.weight,
      bodyFat: data.bodyFat,
      recordDate: data.recordDate,
      updateTime: new Date()
    }
  }).then(res => wrapData(res))
}

function deleteWeightRecord(id) {
  return db.collection('weightRecord').doc(id).remove()
    .then(res => wrapData(res))
}

// ==================== 饮食记录 ====================

function getDietRecords(date) {
  const openid = getOpenid()
  return db.collection('dietRecord')
    .where({ _openid: openid, recordDate: date })
    .orderBy('createTime', 'desc')
    .get()
    .then(res => res.data || [])
    .catch(err => {
      console.error('[cloudDB] getDietRecords 失败:', err)
      if (!isMigrationDone()) {
        const local = wx.getStorageSync('_local_diets') || []
        return local.filter(r => r.recordDate === date)
      }
      return []
    })
}

function getDietStats(date) {
  return getDietRecords(date).then(records => {
    const breakfast = records.filter(r => r.mealType === 'breakfast')
    const lunch = records.filter(r => r.mealType === 'lunch')
    const dinner = records.filter(r => r.mealType === 'dinner')
    const totalCalories = records.reduce((s, r) => s + (r.calories || 0), 0)
    return wrapData({
      totalCalories,
      breakfast: breakfast.reduce((s, r) => s + (r.calories || 0), 0),
      lunch: lunch.reduce((s, r) => s + (r.calories || 0), 0),
      dinner: dinner.reduce((s, r) => s + (r.calories || 0), 0),
      records
    })
  })
}

function createDietRecord(data) {
  return db.collection('dietRecord').add({
    data: {
      mealType: data.mealType,
      foodName: data.foodName,
      calories: data.calories || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0,
      recordDate: data.recordDate,
      createTime: new Date()
    }
  }).then(res => wrapData(res))
}

function updateDietRecord(id, data) {
  return db.collection('dietRecord').doc(id).update({
    data: {
      mealType: data.mealType,
      foodName: data.foodName,
      calories: data.calories || 0,
      protein: data.protein || 0,
      carbs: data.carbs || 0,
      fat: data.fat || 0,
      recordDate: data.recordDate,
      updateTime: new Date()
    }
  }).then(res => wrapData(res))
}

function deleteDietRecord(id) {
  return db.collection('dietRecord').doc(id).remove()
    .then(res => wrapData(res))
}

// ==================== 训练计划（trainPlan 集合） ====================

function getWorkoutPlans(page = 1, pageSize = 50) {
  const openid = getOpenid()
  return db.collection('trainPlan')
    .where({ _openid: openid })
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
    .then(res => {
      const records = res.data || []
      return wrapData({ records, total: records.length, page, pageSize })
    })
    .catch(err => {
      console.error('[cloudDB] getWorkoutPlans 失败:', err)
      if (!isMigrationDone()) {
        const local = wx.getStorageSync('_local_plans') || []
        return wrapData({ records: local, total: local.length, page, pageSize })
      }
      return wrapData({ records: [], total: 0, page, pageSize })
    })
}

function createWorkoutPlan(data) {
  return db.collection('trainPlan').add({
    data: {
      name: data.name,
      type: data.type || 'strength',
      duration: data.duration || 45,
      calories: data.calories || 0,
      description: data.description || '',
      exercises: data.exercises || '[]',
      status: 1,
      createTime: new Date(),
      updateTime: new Date()
    }
  }).then(res => wrapData(res))
}

function updateWorkoutPlan(id, data) {
  return db.collection('trainPlan').doc(id).update({
    data: {
      name: data.name,
      type: data.type,
      duration: data.duration,
      calories: data.calories,
      description: data.description || '',
      exercises: data.exercises || '[]',
      updateTime: new Date()
    }
  }).then(res => wrapData(res))
}

function deleteWorkoutPlan(id) {
  return db.collection('trainPlan').doc(id).remove()
    .then(res => wrapData(res))
}

// ==================== 训练打卡记录（trainRecord 集合） ====================

function getWorkoutRecords(page = 1, pageSize = 200) {
  const openid = getOpenid()
  return db.collection('trainRecord')
    .where({ _openid: openid })
    .orderBy('createTime', 'desc')
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .get()
    .then(res => {
      const records = res.data || []
      return wrapData({ records, total: records.length, page, pageSize })
    })
    .catch(err => {
      console.error('[cloudDB] getWorkoutRecords 失败:', err)
      return wrapData({ records: [], total: 0, page, pageSize })
    })
}

function createWorkoutRecord(data) {
  return db.collection('trainRecord').add({
    data: {
      planId: data.planId || '',
      planName: data.planName || '',
      duration: data.duration || 0,
      calories: data.calories || 0,
      completed: data.completed !== false,
      note: data.note || '',
      recordDate: data.recordDate || util.getToday(),
      createTime: new Date()
    }
  }).then(res => wrapData(res))
}

function updateWorkoutRecord(id, data) {
  return db.collection('trainRecord').doc(id).update({
    data: {
      planName: data.planName,
      duration: data.duration,
      calories: data.calories,
      note: data.note || '',
      recordDate: data.recordDate,
      updateTime: new Date()
    }
  }).then(res => wrapData(res))
}

function deleteWorkoutRecord(id) {
  return db.collection('trainRecord').doc(id).remove()
    .then(res => wrapData(res))
}

// ==================== 数据统计 ====================

function _getWeekBounds() {
  const now = new Date()
  const dayOfWeek = now.getDay() || 7
  const monday = new Date(now)
  monday.setDate(now.getDate() - dayOfWeek + 1)
  return monday.toISOString().split('T')[0]
}

function _getMonthBounds() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function getOverview() {
  const openid = getOpenid()
  const today = util.getToday()
  const weekStart = _getWeekBounds()
  const monthStart = _getMonthBounds()

  return Promise.all([
    db.collection('trainRecord').where({ _openid: openid }).get().catch(() => ({ data: [] })),
    db.collection('dietRecord').where({ _openid: openid, recordDate: today }).get().catch(() => ({ data: [] })),
    db.collection('weightRecord').where({ _openid: openid }).orderBy('recordDate', 'desc').limit(1).get().catch(() => ({ data: [] }))
  ]).then(([trainRes, dietRes, weightRes]) => {
    const allTrain = trainRes.data || []
    const weeklyWorkouts = allTrain.filter(r => r.recordDate >= weekStart).length
    const monthlyWorkouts = allTrain.filter(r => r.recordDate >= monthStart).length
    const totalCaloriesBurned = allTrain.reduce((s, r) => s + (r.calories || 0), 0)
    const totalCaloriesIntake = (dietRes.data || []).reduce((s, r) => s + (r.calories || 0), 0)
    const avgWeight = (weightRes.data && weightRes.data.length > 0) ? weightRes.data[0].weight : 0

    return wrapData({
      weeklyWorkouts,
      monthlyWorkouts,
      totalCaloriesBurned,
      totalCaloriesIntake,
      avgWeight
    })
  }).catch(err => {
    console.error('[cloudDB] getOverview 失败:', err)
    return wrapData({ weeklyWorkouts: 0, monthlyWorkouts: 0, totalCaloriesBurned: 0, totalCaloriesIntake: 0, avgWeight: 0 })
  })
}

function getWeeklyStats() {
  const openid = getOpenid()
  const today = util.getToday()
  const days = []
  const dayLabels = []

  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().split('T')[0]
    days.push(dateStr)
    dayLabels.push(['日', '一', '二', '三', '四', '五', '六'][d.getDay()])
  }

  return Promise.all(
    days.map(date =>
      Promise.all([
        db.collection('trainRecord')
          .where({ _openid: openid, recordDate: date })
          .get()
          .then(res => (res.data || []).length)
          .catch(() => 0),
        db.collection('dietRecord')
          .where({ _openid: openid, recordDate: date })
          .get()
          .then(res => (res.data || []).reduce((s, r) => s + (r.calories || 0), 0))
          .catch(() => 0)
      ])
    )
  ).then(results => {
    const workouts = results.map(r => r[0])
    const calories = results.map(r => r[1])
    return wrapData({ days: dayLabels, workouts, calories })
  }).catch(err => {
    console.error('[cloudDB] getWeeklyStats 失败:', err)
    return wrapData({ days: dayLabels, workouts: [0,0,0,0,0,0,0], calories: [0,0,0,0,0,0,0] })
  })
}

function getMonthlyStats() {
  const openid = getOpenid()
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()

  // 计算本月各周范围
  const weeks = []
  for (let w = 0; w < 5; w++) {
    const start = new Date(year, month, w * 7 + 1)
    if (start.getMonth() !== month) break
    const end = new Date(year, month, Math.min((w + 1) * 7, new Date(year, month + 1, 0).getDate()))
    weeks.push({
      label: `第${w + 1}周`,
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    })
  }

  return db.collection('trainRecord')
    .where({ _openid: openid })
    .get()
    .then(res => {
      const allTrain = res.data || []
      const weekLabels = weeks.map(w => w.label)
      const workouts = weeks.map(w =>
        allTrain.filter(r => r.recordDate >= w.start && r.recordDate <= w.end).length
      )
      const calories = weeks.map(w =>
        allTrain.filter(r => r.recordDate >= w.start && r.recordDate <= w.end)
          .reduce((s, r) => s + (r.calories || 0), 0)
      )
      return wrapData({ weeks: weekLabels, workouts, calories })
    })
    .catch(err => {
      console.error('[cloudDB] getMonthlyStats 失败:', err)
      const weekLabels = weeks.map(w => w.label)
      return wrapData({ weeks: weekLabels, workouts: weekLabels.map(() => 0), calories: weekLabels.map(() => 0) })
    })
}

// ==================== 导出 ====================
// 函数名与原 api.js 保持一致，实现无缝替换
module.exports = {
  // 用户
  getUserInfo,
  updateUserInfo,

  // 体重
  getWeightRecords,
  createWeightRecord,
  updateWeightRecord,
  deleteWeightRecord,

  // 饮食
  getDietRecords,
  getDietStats,
  createDietRecord,
  updateDietRecord,
  deleteDietRecord,

  // 训练计划
  getWorkoutPlans,
  createWorkoutPlan,
  updateWorkoutPlan,
  deleteWorkoutPlan,

  // 训练打卡
  getWorkoutRecords,
  createWorkoutRecord,
  updateWorkoutRecord,
  deleteWorkoutRecord,

  // 统计
  getOverview,
  getWeeklyStats,
  getMonthlyStats
}
