// pages/statistics/statistics.js — 云开发版
// 原逻辑：api.getOverview/getWeeklyStats/getMonthlyStats → Mock 数据
// 改造后：cloudDB.getOverview/getWeeklyStats/getMonthlyStats → 云数据库实时聚合
const cloudDB = require('../../utils/cloud-db.js')

Page({
  data: { overview: {}, weeklyBars: [], monthlyRows: [] },

  onShow() { this.loadData() },

  loadData() {
    cloudDB.getOverview().then(res => {
      this.setData({ overview: res.data || {} })
    }).catch(() => {})

    cloudDB.getWeeklyStats().then(res => {
      const data = res.data || { days: [], workouts: [], calories: [] }
      const weeklyBars = data.days.map((day, i) => ({
        day,
        workouts: data.workouts[i] || 0,
        calories: data.calories[i] || 0,
        barHeight: Math.max(4, (data.workouts[i] || 0) * 28),
        active: (data.workouts[i] || 0) > 0
      }))
      this.setData({ weeklyBars })
    }).catch(() => {})

    cloudDB.getMonthlyStats().then(res => {
      const data = res.data || { weeks: [], workouts: [], calories: [] }
      const maxW = Math.max(1, ...(data.workouts || []))
      const monthlyRows = data.weeks.map((week, i) => ({
        week,
        workouts: data.workouts[i] || 0,
        calories: data.calories[i] || 0,
        barPercent: Math.max(5, ((data.workouts[i] || 0) / maxW) * 100)
      }))
      this.setData({ monthlyRows })
    }).catch(() => {})
  }
})
