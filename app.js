// app.js — FitTrack 云开发版
// 迁移引擎：首次启动自动将 _local_* 旧数据复制到云数据库
App({
  onLaunch() {
    this.getSystemInfo()
    this.initCloud()
  },

  // ==================== 云开发初始化 ====================
  initCloud() {
    if (!wx.cloud) {
      console.error('[CloudInit] 请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }
    wx.cloud.init({
      env: 'cloud1-d9g8fibrj209ede3f',
      traceUser: true
    })
    console.log('[CloudInit] 云开发初始化完成, env: cloud1-d9g8fibrj209ede3f')
    this.getOpenid()
  },

  // ==================== 获取用户 openid ====================
  getOpenid() {
    const cachedOpenid = wx.getStorageSync('_openid')
    if (cachedOpenid) {
      console.log('[Openid] 使用缓存的 openid')
      this.globalData.openid = cachedOpenid
      this.loadUserProfile()
      return
    }
    console.log('[Openid] 调用 login 云函数...')
    wx.cloud.callFunction({
      name: 'login',
      success: (res) => {
        const openid = res.result.openid
        if (openid) {
          console.log('[Openid] 获取成功:', openid.substring(0, 10) + '...')
          this.globalData.openid = openid
          wx.setStorageSync('_openid', openid)
          this.loadUserProfile()
        } else {
          console.error('[Openid] login 云函数未返回 openid，请确认已部署')
        }
      },
      fail: (err) => {
        console.error('[Openid] 调用 login 云函数失败:', err)
        const fallback = wx.getStorageSync('_openid')
        if (fallback) {
          console.log('[Openid] 降级使用缓存的 openid')
          this.globalData.openid = fallback
        }
      }
    })
  },

  // ==================== 用户资料 ====================
  async loadUserProfile() {
    const db = wx.cloud.database()
    const openid = this.globalData.openid
    if (!openid) {
      console.warn('[UserProfile] openid 为空，跳过加载')
      return
    }
    try {
      const res = await db.collection('user').where({ _openid: openid }).get()
      if (res.data && res.data.length > 0) {
        this.globalData.userInfo = res.data[0]
        console.log('[UserProfile] 已加载用户资料')
      } else {
        console.log('[UserProfile] 新用户，创建默认资料')
        const defaultProfile = {
          nickname: '新用户',
          avatarUrl: '/images/avatar-default.png',
          gender: 0,
          age: 0,
          height: 0,
          weight: 0,
          createTime: new Date(),
          updateTime: new Date()
        }
        const addRes = await db.collection('user').add({ data: defaultProfile })
        defaultProfile._id = addRes._id
        this.globalData.userInfo = defaultProfile
        console.log('[UserProfile] 默认资料已创建, _id:', addRes._id)
      }
    } catch (e) {
      console.error('[UserProfile] 加载用户信息失败:', e)
    }
    // 加载完资料后检查是否需要迁移旧数据
    this.checkMigration()
  },

  // ==================== 旧数据自动迁移引擎 ====================
  async checkMigration() {
    const migrated = wx.getStorageSync('_migrated_v2')
    if (migrated === true) {
      console.log('[Migration] ✅ 数据已迁移，跳过 (_migrated_v2=true)')
      this.globalData.migrationDone = true
      return
    }
    console.log('[Migration] 🔄 检测到未迁移，检查旧数据...')
    this.globalData.migrationDone = false
    await this.migrateAllLocalData()
  },

  async migrateAllLocalData() {
    console.log('[Migration] ========== 开始自动迁移旧数据 ==========')
    const db = wx.cloud.database()
    let allSuccess = true
    let totalMigrated = 0

    // Step A: 迁移体重记录
    const weightResult = await this._migrateCollection({
      storageKey: '_local_weights',
      collectionName: 'weightRecord',
      label: '体重记录',
      mapFields: (item) => ({
        weight: item.weight,
        bodyFat: item.bodyFat || null,
        recordDate: item.recordDate,
        createTime: item.createTime ? new Date(item.createTime) : new Date()
      })
    })
    if (!weightResult.success) allSuccess = false
    totalMigrated += weightResult.count

    // Step B: 迁移饮食记录
    const dietResult = await this._migrateCollection({
      storageKey: '_local_diets',
      collectionName: 'dietRecord',
      label: '饮食记录',
      mapFields: (item) => ({
        mealType: item.mealType,
        foodName: item.foodName,
        calories: item.calories || 0,
        protein: item.protein || 0,
        carbs: item.carbs || 0,
        fat: item.fat || 0,
        recordDate: item.recordDate,
        createTime: item.createTime ? new Date(item.createTime) : new Date()
      })
    })
    if (!dietResult.success) allSuccess = false
    totalMigrated += dietResult.count

    // Step C: 迁移训练计划
    const planResult = await this._migrateCollection({
      storageKey: '_local_plans',
      collectionName: 'trainPlan',
      label: '训练计划',
      mapFields: (item) => ({
        name: item.name || '未命名计划',
        type: item.type || 'strength',
        duration: item.duration || 45,
        calories: item.calories || 0,
        description: item.description || '',
        exercises: typeof item.exercises === 'string'
          ? item.exercises
          : JSON.stringify(item.exercises || []),
        status: 1,
        createTime: item.createTime ? new Date(item.createTime) : new Date(),
        updateTime: new Date()
      })
    })
    if (!planResult.success) allSuccess = false
    totalMigrated += planResult.count

    // Step D: 迁移用户资料
    const userResult = await this._migrateUserInfo()
    if (!userResult.success) allSuccess = false
    if (userResult.updated) totalMigrated++

    console.log(`[Migration] 共计迁移 ${totalMigrated} 条记录`)

    if (allSuccess) {
      wx.setStorageSync('_migrated_v2', true)
      this.globalData.migrationDone = true
      console.log('[Migration] ✅ 全部迁移完成，已设置 _migrated_v2 = true')
      console.log('[Migration] ℹ️  旧版本地数据保留不动，未做任何删除')
    } else {
      console.warn('[Migration] ⚠️  部分数据迁移失败，下次启动将自动重试')
      console.warn('[Migration] ℹ️  旧版本地数据保留不动，未做任何删除')
    }
    console.log('[Migration] ========== 迁移流程结束 ==========')
  },

  // 通用集合迁移方法
  async _migrateCollection({ storageKey, collectionName, label, mapFields }) {
    try {
      const localData = wx.getStorageSync(storageKey)
      if (!localData || !Array.isArray(localData) || localData.length === 0) {
        console.log(`[Migration] ${label} (${storageKey}): 无数据，跳过`)
        return { success: true, count: 0 }
      }
      console.log(`[Migration] ${label}: 发现 ${localData.length} 条，开始迁移...`)
      const db = wx.cloud.database()
      let successCount = 0
      for (let i = 0; i < localData.length; i++) {
        try {
          await db.collection(collectionName).add({ data: mapFields(localData[i]) })
          successCount++
        } catch (e) {
          console.warn(`[Migration] ${label} 第 ${i + 1} 条写入失败:`, e.errMsg || e.message || e)
        }
      }
      console.log(`[Migration] ${label}: 完成 ${successCount}/${localData.length}`)
      return { success: successCount === localData.length, count: successCount }
    } catch (e) {
      console.error(`[Migration] ${label} 迁移异常:`, e)
      return { success: false, count: 0 }
    }
  },

  // 迁移用户资料（单条，非数组）
  async _migrateUserInfo() {
    try {
      const oldInfo = wx.getStorageSync('userInfo')
      if (!oldInfo || !oldInfo.nickname) {
        console.log('[Migration] userInfo: 无有效数据，跳过')
        return { success: true, updated: false }
      }
      // 仅在 user 集合资料为空或为默认值时覆盖
      const currentInfo = this.globalData.userInfo
      if (currentInfo && currentInfo.nickname && currentInfo.nickname !== '新用户') {
        console.log('[Migration] userInfo: 云端已有资料，跳过覆盖')
        return { success: true, updated: false }
      }
      console.log('[Migration] userInfo: 补充用户资料...')
      const db = wx.cloud.database()
      const updateData = {
        nickname: oldInfo.nickname || '新用户',
        avatarUrl: oldInfo.avatarUrl || '/images/avatar-default.png',
        gender: oldInfo.gender || 0,
        age: oldInfo.age || 0,
        height: oldInfo.height || 0,
        weight: oldInfo.weight || 0,
        updateTime: new Date()
      }
      if (currentInfo && currentInfo._id) {
        await db.collection('user').doc(currentInfo._id).update({ data: updateData })
      } else {
        await db.collection('user').add({ data: { ...updateData, createTime: new Date() } })
      }
      // 更新内存中的资料
      this.globalData.userInfo = { ...currentInfo, ...updateData }
      console.log('[Migration] userInfo: 迁移完成')
      return { success: true, updated: true }
    } catch (e) {
      console.error('[Migration] userInfo 迁移异常:', e)
      return { success: false, updated: false }
    }
  },

  // ==================== 系统信息（保持不变） ====================
  getSystemInfo() {
    try {
      const windowInfo = wx.getWindowInfo()
      const deviceInfo = wx.getDeviceInfo()
      this.globalData.systemInfo = { ...windowInfo, ...deviceInfo }
      this.globalData.statusBarHeight = windowInfo.statusBarHeight
      this.globalData.navBarHeight = deviceInfo.platform === 'android' ? 48 : 44
    } catch (e) {
      const info = wx.getSystemInfoSync()
      this.globalData.systemInfo = info
      this.globalData.statusBarHeight = info.statusBarHeight
      this.globalData.navBarHeight = info.platform === 'android' ? 48 : 44
    }
  },

  globalData: {
    userInfo: null,
    openid: null,            // 替代旧版 token
    migrationDone: false,    // 迁移是否完成
    systemInfo: null,
    statusBarHeight: 0,
    navBarHeight: 44,
    screenWidth: 375
  }
})
