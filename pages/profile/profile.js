// pages/profile/profile.js — 云开发版
// 原逻辑：wx.getStorageSync('userInfo') 读取 + wx.removeStorageSync('token', 'userInfo') 退出
// 改造后：app.globalData.userInfo 读取 + 清空 openid/userInfo + 清除 _openid 缓存
const util = require('../../utils/util.js')
const cloudDB = require('../../utils/cloud-db.js')

Page({
  data: { userInfo: null, bmi: '--', stats: {} },

  onShow() {
    const info = getApp().globalData.userInfo || {}
    const b = util.calcBMI(info.weight, info.height)
    this.setData({ userInfo: info, bmi: b || '--' })
    cloudDB.getOverview().then(res => this.setData({ stats: res.data || {} })).catch(() => {})
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
        const app = getApp()
        // 清空全局状态
        app.globalData.openid = null
        app.globalData.userInfo = null
        // 清除 openid 缓存（下次启动重新获取）
        wx.removeStorageSync('_openid')
        console.log('[Profile] 已退出，清空 openid 和 userInfo')
        wx.reLaunch({ url: '/pages/login/login' })
      }
    })
  }
})
