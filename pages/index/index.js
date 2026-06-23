const api = require('../../utils/api.js')
const util = require('../../utils/util.js')
Page({
  data: {
    greeting: "", userInfo: null, bmi: "--", stats: {}, today: "",
    todayWorkouts: 0, todayCalories: 0, todayIntake: 0, recentWorkouts: []
  },
  onShow() {
    // 防御性检查：无 token 时静默跳过数据加载（正常流程由 login 页保证 token 存在）
    if (!wx.getStorageSync('token')) return

    const h = new Date().getHours()
    const g = h < 6 ? "夜深了" : h < 12 ? "早上好" : h < 18 ? "下午好" : "晚上好"
    const info = wx.getStorageSync("userInfo") || {}
    this.setData({
      greeting: g,
      userInfo: info,
      today: util.getToday()
    })
    this.loadData()
  },
  loadData() {
    api.getOverview().then(res => {
      this.setData({ stats: res.data || {} })
    }).catch(() => {})

    api.getUserInfo().then(res => {
      const info = res.data || {}
      const bmi = util.calcBMI(info.weight, info.height)
      wx.setStorageSync("userInfo", info)
      this.setData({ userInfo: info, bmi: bmi || "--" })
    }).catch(() => {})

    api.getWorkoutRecords(1, 30).then(res => {
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

    api.getDietStats(util.getToday()).then(res => {
      const data = res.data || {}
      this.setData({ todayIntake: data.totalCalories || 0 })
    }).catch(() => {})
  },
  goToTraining() { wx.switchTab({ url: "/pages/training/list/list" }) },
  goToDiet() { wx.switchTab({ url: "/pages/diet/record/record" }) },
  goToWeight() { wx.navigateTo({ url: "/pages/weight/list/list" }) },
  goToBMI() { wx.navigateTo({ url: "/pages/bmi/bmi" }) },
  goToHistory() { wx.navigateTo({ url: "/pages/training/history/history" }) }
})
