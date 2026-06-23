const util = require('../../utils/util.js')
const api = require('../../utils/api.js')
Page({
  data: { userInfo: null, bmi: '--', stats: {} },
  onShow() {
    const info = wx.getStorageSync('userInfo') || {}
    const b = util.calcBMI(info.weight, info.height)
    this.setData({ userInfo: info, bmi: b || '--' })
    api.getOverview().then(res => this.setData({ stats: res.data || {} })).catch(() => {})
  },
  goToBMI() { wx.navigateTo({ url: '/pages/bmi/bmi' }) },
  goToWeight() { wx.navigateTo({ url: '/pages/weight/list/list' }) },
  goToPlans() { wx.switchTab({ url: '/pages/training/list/list' }) },
  goToHistory() { wx.navigateTo({ url: '/pages/training/history/history' }) },
  goToDiet() { wx.switchTab({ url: '/pages/diet/record/record' }) },
  goToDietStats() { wx.navigateTo({ url: '/pages/diet/stats/stats' }) },
  handleLogout() {
    util.showConfirm('确认退出', '退出后需要重新登录').then(ok => {
      if (ok) {
        wx.removeStorageSync('token')
        wx.removeStorageSync('userInfo')
        wx.reLaunch({ url: '/pages/login/login' })
      }
    })
  }
})
