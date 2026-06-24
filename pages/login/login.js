// pages/login/login.js — 云开发版
// 原逻辑：wx.login → api.login(code) → setStorageSync('token', 'userInfo')
// 改造后：wx.cloud.callFunction('login') → 获取 openid → 缓存 _openid → 加载/创建用户资料
// WXML 中 bindtap 名称保持 handleWechatLogin / handleMockLogin 不变，都走统一云开发登录
const util = require('../../utils/util.js')

Page({
  data: { loading: false },

  onLoad() {
    // 如果已经缓存了 openid，直接跳转首页（与原来 token 守卫等价）
    const app = getApp()
    if (app.globalData.openid) {
      console.log('[Login] 已有 openid，直接进入首页')
      wx.reLaunch({ url: '/pages/index/index' })
    }
  },

  // ============ 微信一键登录（云开发版） ============
  handleWechatLogin() {
    this.doLogin()
  },

  // ============ Mock 登录（开发模式，同样走云开发） ============
  handleMockLogin() {
    this.doLogin()
  },

  // ============ 统一登录逻辑 ============
  doLogin() {
    this.setData({ loading: true })
    const app = getApp()

    // Step 1: 微信登录获取 code
    wx.login({
      success: (loginRes) => {
        console.log('[Login] wx.login 成功')

        // Step 2: 调用云函数获取 openid
        wx.cloud.callFunction({
          name: 'login',
          success: (cloudRes) => {
            const openid = cloudRes.result.openid
            if (!openid) {
              util.showToast('获取用户信息失败，请重试')
              this.setData({ loading: false })
              return
            }
            console.log('[Login] openid 获取成功')

            // Step 3: 存储 openid
            app.globalData.openid = openid
            wx.setStorageSync('_openid', openid)

            // Step 4: 加载或创建用户资料
            this.loadOrCreateProfile(openid)
          },
          fail: (err) => {
            console.error('[Login] 云函数调用失败:', err)
            util.showToast('登录失败，请检查网络后重试')
            this.setData({ loading: false })
          }
        })
      },
      fail: () => {
        this.setData({ loading: false })
        util.showToast('获取登录凭证失败，请重试')
      }
    })
  },

  // ============ 加载/创建用户资料 ============
  async loadOrCreateProfile(openid) {
    const db = wx.cloud.database()
    try {
      const res = await db.collection('user').where({ _openid: openid }).get()

      if (res.data && res.data.length > 0) {
        getApp().globalData.userInfo = res.data[0]
        console.log('[Login] 已有用户资料，直接进入')
      } else {
        // 新用户：尝试用旧 userInfo 兜底
        const oldInfo = wx.getStorageSync('userInfo')
        const defaultProfile = oldInfo && oldInfo.nickname ? {
          nickname: oldInfo.nickname,
          avatarUrl: oldInfo.avatarUrl || '/images/avatar-default.png',
          gender: oldInfo.gender || 0,
          age: oldInfo.age || 0,
          height: oldInfo.height || 0,
          weight: oldInfo.weight || 0,
          createTime: new Date(),
          updateTime: new Date()
        } : {
          nickname: '新用户',
          avatarUrl: '/images/avatar-default.png',
          gender: 0, age: 0, height: 0, weight: 0,
          createTime: new Date(),
          updateTime: new Date()
        }
        const addRes = await db.collection('user').add({ data: defaultProfile })
        defaultProfile._id = addRes._id
        getApp().globalData.userInfo = defaultProfile
        console.log('[Login] 新用户资料已创建')
      }

      this.setData({ loading: false })
      wx.reLaunch({ url: '/pages/index/index' })

    } catch (err) {
      console.error('[Login] 加载用户资料失败:', err)
      this.setData({ loading: false })
      wx.reLaunch({ url: '/pages/index/index' })
    }
  }
})
