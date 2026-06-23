const api = require('../../utils/api.js')
Page({
  data: { overview: {}, weeklyBars: [], monthlyRows: [] },
  onShow() { this.loadData() },
  loadData() {
    api.getOverview().then(res => this.setData({ overview: res.data || {} })).catch(() => {})
    api.getWeeklyStats().then(res => {
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
    api.getMonthlyStats().then(res => {
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
