// pages/login/login.js
const api = require('../../utils/api.js')
const util = require('../../utils/util.js')

Page({
  data: { loading: false },

  onLoad() {
    // 已是登录状态则直接跳转首页，避免登录页闪现
    const token = wx.getStorageSync('token')
    if (token) {
      wx.reLaunch({ url: '/pages/index/index' })
    }
  },

  handleWechatLogin() {
    this.setData({ loading: true })
    // wx.getUserProfile 已于 2022年4月 被微信废弃（基础库 2.24.0+），直接使用 wx.login
    wx.login({
      success: (loginRes) => {
        api.login(loginRes.code).then((result) => {
          wx.setStorageSync('token', result.data.token)
          wx.setStorageSync('userInfo', result.data.userInfo)
          wx.reLaunch({ url: '/pages/index/index' })
        }).catch(() => {
          util.showToast('登录失败，请重试')
        }).finally(() => {
          this.setData({ loading: false })
        })
      },
      fail: () => {
        this.setData({ loading: false })
        util.showToast('获取登录凭证失败，请重试')
      }
    })
  },

  handleMockLogin() {
    this.setData({ loading: true })
    api.login('mock_code').then((result) => {
      wx.setStorageSync('token', result.data.token)
      wx.setStorageSync('userInfo', result.data.userInfo)
      wx.reLaunch({ url: '/pages/index/index' })
    }).catch(() => {
      util.showToast('登录失败')
    }).finally(() => {
      this.setData({ loading: false })
    })
  }
})
