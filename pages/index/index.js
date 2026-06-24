// pages/index/index.js — 云开发版
// 原逻辑：读取 token 守卫 + 读取 userInfo 本地缓存 + 调用 api.xxx() Mock API
// 改造后：检查 app.globalData.openid + 读取 app.globalData.userInfo + 调用 cloudDB.xxx()
const cloudDB = require('../../utils/cloud-db.js')
const util = require('../../utils/util.js')

Page({
  data: {
    greeting: '', userInfo: null, bmi: '--', stats: {}, today: '',
    todayWorkouts: 0, todayCalories: 0, todayIntake: 0, recentWorkouts: []
  },

  onShow() {
    const app = getApp()
    // 防御性检查：无 openid 时静默跳过（正常流程由 login 页保证）
    if (!app.globalData.openid) {
      console.log('[Index] openid 未就绪，跳过数据加载')
      return
    }

    const h = new Date().getHours()
    const g = h < 6 ? '夜深了' : h < 12 ? '早上好' : h < 18 ? '下午好' : '晚上好'
    const info = app.globalData.userInfo || {}

    this.setData({
      greeting: g,
      userInfo: info,
      today: util.getToday()
    })
    this.loadData()
  },

  loadData() {
    // 概览统计
    cloudDB.getOverview().then(res => {
      this.setData({ stats: res.data || {} })
    }).catch(() => {})

    // 用户资料（从云数据库同步到本地 globalData）
    cloudDB.getUserInfo().then(res => {
      const info = res.data || {}
      const bmi = util.calcBMI(info.weight, info.height)
      // globalData 已在 cloudDB.getUserInfo 中更新，此处同步页面展示
      this.setData({ userInfo: info, bmi: bmi || '--' })
    }).catch(() => {})

    // 最近训练记录
    cloudDB.getWorkoutRecords(1, 30).then(res => {
      const data = res.data || {}
      const records = data.records || data || []
      const today = util.getToday()
      const todayRecords = records.filter(r => r.recordDate === today)
      this.setData({
        recentWorkouts: records.slice(0, 5),
        todayWorkouts: todayRecords.length,
        todayCalories: todayRecords.reduce((s, r) => s + (r.calories || 0), 0)
      })
    }).catch(() => {})

    // 今日饮食
    cloudDB.getDietStats(util.getToday()).then(res => {
      const data = res.data || {}
      this.setData({ todayIntake: data.totalCalories || 0 })
    }).catch(() => {})
  },

  goToTraining() { wx.switchTab({ url: '/pages/training/list/list' }) },
  goToDiet() { wx.switchTab({ url: '/pages/diet/record/record' }) },
  goToWeight() { wx.navigateTo({ url: '/pages/weight/list/list' }) },
  goToBMI() { wx.navigateTo({ url: '/pages/bmi/bmi' }) },
  goToHistory() { wx.navigateTo({ url: '/pages/training/history/history' }) }
})
