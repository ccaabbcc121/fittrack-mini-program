// app.js
App({
  onLaunch() {
    this.getSystemInfo()
  },

  getSystemInfo() {
    // wx.getSystemInfo 已废弃，改用新的拆分 API
    try {
      const windowInfo = wx.getWindowInfo()
      const deviceInfo = wx.getDeviceInfo()
      this.globalData.systemInfo = { ...windowInfo, ...deviceInfo }
      this.globalData.statusBarHeight = windowInfo.statusBarHeight
      this.globalData.navBarHeight = deviceInfo.platform === 'android' ? 48 : 44
    } catch (e) {
      // 降级：旧版基础库回退到同步 getSystemInfoSync
      const info = wx.getSystemInfoSync()
      this.globalData.systemInfo = info
      this.globalData.statusBarHeight = info.statusBarHeight
      this.globalData.navBarHeight = info.platform === 'android' ? 48 : 44
    }
  },

  globalData: {
    userInfo: null,
    token: null,
    systemInfo: null,
    statusBarHeight: 0,
    navBarHeight: 44,
    screenWidth: 375
  }
})
