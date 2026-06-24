// pages/training/list/list.js — 云开发版
// 原逻辑：api.getWorkoutPlans() + 合并 _local_plans + api.createWorkoutRecord() 打卡
// 改造后：cloudDB.getWorkoutPlans() + cloudDB.getWorkoutRecords() + cloudDB.createWorkoutRecord()
// 移除：getLocalPlans(), removeLocalPlan(), 本地缓存合并逻辑
const cloudDB = require('../../../utils/cloud-db.js')
const util = require('../../../utils/util.js')

Page({
  data: {
    plans: [],
    todayRecords: [],         // 今日已打卡的记录
    checkedInPlanIds: [],     // 今日已打卡的计划 ID 列表
    loading: true,
    page: 1,
    total: 0
  },

  onShow() {
    this.loadData()
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  async loadData() {
    this.setData({ loading: true })
    const today = util.getToday()

    try {
      // 并行加载计划 + 今日打卡记录
      const [plansRes, recordsRes] = await Promise.all([
        cloudDB.getWorkoutPlans(1, 50).catch(() => ({ data: { records: [], total: 0 } })),
        cloudDB.getWorkoutRecords(1, 50).catch(() => ({ data: { records: [] } }))
      ])

      // 解析训练计划
      const list = plansRes.data.records || plansRes.data || []
      const plans = list.map(p => {
        const wt = util.getWorkoutType(p.type)
        let exercises = p.exercises
        if (typeof exercises === 'string') {
          try { exercises = JSON.parse(exercises) } catch (e) { exercises = [] }
        }
        if (!Array.isArray(exercises)) exercises = []
        return {
          ...p,
          typeLabel: wt.label,
          typeColor: wt.color,
          exercises
        }
      })

      // 解析今日打卡
      const records = recordsRes.data.records || recordsRes.data || []
      const todayRecords = records.filter(r => r.recordDate === today)
      const checkedInPlanIds = todayRecords.map(r => r.planId)

      this.setData({
        plans,
        todayRecords,
        checkedInPlanIds,
        total: plans.length,
        loading: false
      })
    } catch (e) {
      console.error('[TrainingList] loadData 异常:', e)
      this.setData({
        plans: [],
        todayRecords: [],
        checkedInPlanIds: [],
        total: 0,
        loading: false
      })
    }
  },

  // 跳转创建页
  goToCreate() {
    wx.navigateTo({ url: '/pages/training/create/create' })
  },

  // 跳转编辑页
  goToEdit(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({ url: `/pages/training/create/create?id=${id}` })
  },

  // 删除计划
  handleDelete(e) {
    const id = e.currentTarget.dataset.id
    util.showConfirm('删除计划', '确定要删除这个训练计划吗？').then(ok => {
      if (!ok) return
      cloudDB.deleteWorkoutPlan(id).then(() => {
        util.showToast('已删除')
        this.loadData()
      }).catch(() => {
        util.showToast('删除失败')
      })
    })
  },

  // 今日打卡
  handleCheckin(e) {
    const { id, name, calories, duration } = e.currentTarget.dataset
    const data = {
      planId: id,
      planName: name,
      calories: parseInt(calories) || 0,
      duration: parseInt(duration) || 0,
      completed: true,
      note: '',
      recordDate: util.getToday()
    }
    cloudDB.createWorkoutRecord(data).then(() => {
      util.showToast('打卡成功！', 'success')
      // 立即更新 UI：将当前 planId 加入已打卡列表
      const checked = this.data.checkedInPlanIds
      checked.push(id)
      this.setData({ checkedInPlanIds: checked })
    }).catch(() => {
      util.showToast('打卡失败，请重试')
    })
  },

  // 跳转历史页
  goToHistory() {
    wx.navigateTo({ url: '/pages/training/history/history' })
  }
})
