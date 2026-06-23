// utils/api.js - API 请求封装 (支持 Mock / 真实后端双模式)
const { MockData, mockDelay, mockResponse } = require('./mock.js')

// 切换模式：true=Mock数据, false=真实后端
const USE_MOCK = true

// 后端 Base URL
const BASE_URL = 'http://localhost:8080/api'

// ==================== 基础请求 ====================
function request(options) {
  const { url, method = 'GET', data = {} } = options
  return new Promise((resolve, reject) => {
    if (USE_MOCK) {
      // 模拟 wx.request 成功回调：body = res.data
      handleMockRequest(url, method, data).then((body) => {
        if (body.code === 200) {
          resolve(body)
        } else {
          wx.showToast({ title: body.msg || '请求失败', icon: 'none', duration: 2000 })
          reject(body)
        }
      }).catch(reject)
      return
    }
    const token = wx.getStorageSync('token') || ''
    wx.request({
      url: `${BASE_URL}${url}`,
      method,
      data,
      timeout: 10000,
      header: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 401) {
          wx.removeStorageSync('token')
          wx.removeStorageSync('userInfo')
          wx.reLaunch({ url: '/pages/login/login' })
          reject({ code: 401, msg: '登录已过期，请重新登录' })
          return
        }
        if (res.data.code === 200) {
          resolve(res.data)
        } else {
          wx.showToast({ title: res.data.msg || '请求失败', icon: 'none', duration: 2000 })
          reject(res.data)
        }
      },
      fail: (err) => {
        const isTimeout = err.errMsg && err.errMsg.includes('timeout')
        const msg = isTimeout
          ? '请求超时，请检查后端服务是否已启动'
          : '网络错误，请检查连接'
        wx.showToast({ title: msg, icon: 'none', duration: 3000 })
        reject(err)
      }
    })
  })
}

// GET 请求（带 query 参数）
function get(url, params = {}) {
  const query = Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`)
    .join('&')
  const fullUrl = query ? `${url}?${query}` : url
  return request({ url: fullUrl, method: 'GET' })
}

// POST 请求
function post(url, data = {}) {
  return request({ url, method: 'POST', data })
}

// PUT 请求
function put(url, data = {}) {
  return request({ url, method: 'PUT', data })
}

// DELETE 请求
function del(url) {
  return request({ url, method: 'DELETE' })
}

// ==================== Mock 请求处理器 ====================
let mockWorkoutPlans = JSON.parse(JSON.stringify(MockData.workoutPlans))
let mockWorkoutRecords = JSON.parse(JSON.stringify(MockData.workoutRecords))
let mockDietRecords = JSON.parse(JSON.stringify(MockData.dietRecords))
let mockWeightRecords = JSON.parse(JSON.stringify(MockData.weightRecords))
let nextId = 100

function handleMockRequest(url, method, data) {
  let result = null
  // Strip query params for matching & parse them into data for GET requests
  const [cleanUrl, queryString] = url.split('?')
  if (queryString) {
    const queryParams = {}
    queryString.split('&').forEach(pair => {
      const [k, v] = pair.split('=')
      if (k) queryParams[decodeURIComponent(k)] = decodeURIComponent(v || '')
    })
    // Merge query params into data (GET requests pass params via URL, not body)
    data = Object.assign({}, queryParams, data)
  }

  // ===== 用户模块 =====
  if (cleanUrl === '/user/login') {
    result = { token: 'mock_token_v2_abc123', userInfo: MockData.userInfo }
  } else if (cleanUrl === '/user/info' && method === 'GET') {
    result = MockData.userInfo
  } else if (cleanUrl === '/user/info' && method === 'PUT') {
    Object.assign(MockData.userInfo, data)
    result = MockData.userInfo
  }

  // ===== 训练计划（分页） =====
  else if (cleanUrl === '/workout/plans' && method === 'GET') {
    const page = parseInt(data.page) || 1
    const pageSize = parseInt(data.pageSize) || 10
    const start = (page - 1) * pageSize
    result = {
      records: mockWorkoutPlans.slice(start, start + pageSize),
      total: mockWorkoutPlans.length,
      page, pageSize
    }
  } else if (cleanUrl === '/workout/plans' && method === 'POST') {
    const plan = { id: ++nextId, userId: 1, ...data, status: 1,
      createTime: new Date().toISOString().split('T')[0],
      updateTime: new Date().toISOString().split('T')[0] }
    mockWorkoutPlans.unshift(plan)
    result = plan
  } else if (cleanUrl.match(/\/workout\/plans\/\d+/) && method === 'PUT') {
    const id = parseInt(cleanUrl.split('/').pop())
    const idx = mockWorkoutPlans.findIndex(p => p.id === id)
    if (idx !== -1) { Object.assign(mockWorkoutPlans[idx], data, { updateTime: new Date().toISOString().split('T')[0] }); result = mockWorkoutPlans[idx] }
  } else if (cleanUrl.match(/\/workout\/plans\/\d+/) && method === 'DELETE') {
    const id = parseInt(cleanUrl.split('/').pop())
    const idx = mockWorkoutPlans.findIndex(p => p.id === id)
    if (idx !== -1) { mockWorkoutPlans.splice(idx, 1); result = { success: true } }
  }

  // ===== 训练记录（分页） =====
  else if (cleanUrl === '/workout/records' && method === 'GET') {
    const page = parseInt(data.page) || 1
    const pageSize = parseInt(data.pageSize) || 10
    const start = (page - 1) * pageSize
    result = {
      records: mockWorkoutRecords.slice(start, start + pageSize),
      total: mockWorkoutRecords.length,
      page, pageSize
    }
  } else if (cleanUrl === '/workout/records' && method === 'POST') {
    const record = { id: ++nextId, userId: 1, ...data, createTime: new Date().toISOString().replace('T', ' ').substring(0, 19) }
    mockWorkoutRecords.unshift(record)
    result = record
  } else if (cleanUrl.match(/\/workout\/records\/\d+/) && method === 'PUT') {
    const id = parseInt(cleanUrl.split('/').pop())
    const idx = mockWorkoutRecords.findIndex(r => r.id === id)
    if (idx !== -1) { Object.assign(mockWorkoutRecords[idx], data); result = mockWorkoutRecords[idx] }
  } else if (cleanUrl.match(/\/workout\/records\/\d+/) && method === 'DELETE') {
    const id = parseInt(cleanUrl.split('/').pop())
    const idx = mockWorkoutRecords.findIndex(r => r.id === id)
    if (idx !== -1) { mockWorkoutRecords.splice(idx, 1); result = { success: true } }
  }

  // ===== 饮食记录（分页） =====
  else if (cleanUrl === '/diet/records' && method === 'GET') {
    const page = parseInt(data.page) || 1
    const pageSize = parseInt(data.pageSize) || 10
    const start = (page - 1) * pageSize
    result = {
      records: mockDietRecords.slice(start, start + pageSize),
      total: mockDietRecords.length,
      page, pageSize
    }
  } else if (cleanUrl === '/diet/records' && method === 'POST') {
    const record = { id: ++nextId, userId: 1, ...data, createTime: new Date().toISOString().replace('T', ' ').substring(0, 19) }
    mockDietRecords.unshift(record)
    result = record
  } else if (cleanUrl.match(/\/diet\/records\/\d+/) && method === 'DELETE') {
    const id = parseInt(cleanUrl.split('/').pop())
    const idx = mockDietRecords.findIndex(r => r.id === id)
    if (idx !== -1) { mockDietRecords.splice(idx, 1); result = { success: true } }
  } else if (cleanUrl.match(/\/diet\/records\/\d+/) && method === 'PUT') {
    const id = parseInt(cleanUrl.split('/').pop())
    const idx = mockDietRecords.findIndex(r => r.id === id)
    if (idx !== -1) { Object.assign(mockDietRecords[idx], data); result = mockDietRecords[idx] }
  } else if (cleanUrl === '/diet/stats') {
    const date = data.date || new Date().toISOString().split('T')[0]
    const records = mockDietRecords.filter(r => r.recordDate === date)
    result = {
      totalCalories: records.reduce((s, r) => s + r.calories, 0),
      breakfast: (records.find(r => r.mealType === 'breakfast') || {}).calories || 0,
      lunch: (records.find(r => r.mealType === 'lunch') || {}).calories || 0,
      dinner: (records.find(r => r.mealType === 'dinner') || {}).calories || 0,
      records
    }
  }

  // ===== 体重管理（分页） =====
  else if (cleanUrl === '/weight/records' && method === 'GET') {
    const page = parseInt(data.page) || 1
    const pageSize = parseInt(data.pageSize) || 30
    const start = (page - 1) * pageSize
    result = {
      records: mockWeightRecords.slice(start, start + pageSize),
      total: mockWeightRecords.length,
      page, pageSize
    }
  } else if (cleanUrl === '/weight/records' && method === 'POST') {
    const record = { id: ++nextId, userId: 1, ...data, createTime: new Date().toISOString().replace('T', ' ').substring(0, 19) }
    mockWeightRecords.push(record)
    mockWeightRecords.sort((a, b) => new Date(b.recordDate) - new Date(a.recordDate))
    result = record
  } else if (cleanUrl.match(/\/weight\/records\/\d+/) && method === 'DELETE') {
    const id = parseInt(cleanUrl.split('/').pop())
    const idx = mockWeightRecords.findIndex(r => r.id === id)
    if (idx !== -1) { mockWeightRecords.splice(idx, 1); result = { success: true } }
  } else if (cleanUrl.match(/\/weight\/records\/\d+/) && method === 'PUT') {
    const id = parseInt(cleanUrl.split('/').pop())
    const idx = mockWeightRecords.findIndex(r => r.id === id)
    if (idx !== -1) { Object.assign(mockWeightRecords[idx], data); result = mockWeightRecords[idx] }
  }

  // ===== 数据统计 =====
  else if (cleanUrl === '/statistics/overview') {
    result = MockData.statistics
  } else if (cleanUrl === '/statistics/weekly') {
    result = {
      days: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      workouts: [1, 1, 0, 1, 0, 1, 0],
      calories: [320, 400, 0, 250, 0, 520, 0]
    }
  } else if (cleanUrl === '/statistics/monthly') {
    result = { weeks: ['第1周', '第2周', '第3周', '第4周'], workouts: [4, 3, 4, 4], calories: [1320, 1100, 1450, 1980] }
  }

return mockDelay().then(() => {
  return mockResponse(result)
})
}

// ==================== API 封装 ====================
const api = {
  // ---- 用户 ----
  login: (code) => post('/user/login', { code }),
  getUserInfo: () => get('/user/info'),
  updateUserInfo: (data) => put('/user/info', data),

  // ---- 训练计划 (分页) ----
  getWorkoutPlans: (page = 1, pageSize = 20) => get('/workout/plans', { page, pageSize }),
  createWorkoutPlan: (data) => post('/workout/plans', data),
  updateWorkoutPlan: (id, data) => put(`/workout/plans/${id}`, data),
  deleteWorkoutPlan: (id) => del(`/workout/plans/${id}`),

  // ---- 训练记录 (分页) ----
  getWorkoutRecords: (page = 1, pageSize = 50) => get('/workout/records', { page, pageSize }),
  createWorkoutRecord: (data) => post('/workout/records', data),
  updateWorkoutRecord: (id, data) => put(`/workout/records/${id}`, data),
  deleteWorkoutRecord: (id) => del(`/workout/records/${id}`),

  // ---- 饮食记录 (分页) ----
  getDietRecords: (page = 1, pageSize = 30) => get('/diet/records', { page, pageSize }),
  createDietRecord: (data) => post('/diet/records', data),
  updateDietRecord: (id, data) => put(`/diet/records/${id}`, data),
  deleteDietRecord: (id) => del(`/diet/records/${id}`),
  getDietStats: (date) => get('/diet/stats', { date }),

  // ---- 体重管理 (分页) ----
  getWeightRecords: (page = 1, pageSize = 30) => get('/weight/records', { page, pageSize }),
  createWeightRecord: (data) => post('/weight/records', data),
  updateWeightRecord: (id, data) => put(`/weight/records/${id}`, data),
  deleteWeightRecord: (id) => del(`/weight/records/${id}`),

  // ---- 数据统计 ----
  getOverview: () => get('/statistics/overview'),
  getWeeklyStats: () => get('/statistics/weekly'),
  getMonthlyStats: () => get('/statistics/monthly')
}

module.exports = api
