// pages/diet/stats/stats.js — 云开发版
// 原逻辑：api.getDietStats() 批量查询 7 天数据 + 营养素统计
// 改造后：cloudDB.getDietStats() → 云数据库实时查询
const cloudDB = require('../../../utils/cloud-db.js')
const util = require('../../../utils/util.js')

Page({
  data: {
    weekTotal: 0,
    weekAvg: 0,
    weekMax: 0,
    weekRecords: 0,         // 本周总记录条数
    weeklyData: [],         // 7 天柱状图数据
    macroProtein: 0,
    macroCarbs: 0,
    macroFat: 0,
    macroTotal: 0,          // 营养素总和
    dailyDetail: [],        // 每日明细
    loading: true,
    isEmpty: false
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  async loadData() {
    this.setData({ loading: true })
    const today = new Date()

    try {
      // 1. 获取最近 7 天数据
      const dayPromises = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today)
        d.setDate(d.getDate() - i)
        const ds = d.toISOString().split('T')[0]
        const label = ['日', '一', '二', '三', '四', '五', '六'][d.getDay()]
        dayPromises.push(
          cloudDB.getDietStats(ds).then(res => {
            const s = res.data || {}
            return {
              date: ds,
              dateLabel: label,
              calories: s.totalCalories || 0,
              recordCount: (s.records || []).length,
              barHeight: Math.max(4, Math.min(140, (s.totalCalories || 0) / 2000 * 140))
            }
          }).catch(() => ({
            date: ds, dateLabel: label,
            calories: 0, recordCount: 0, barHeight: 4
          }))
        )
      }
      const dailyDetail = await Promise.all(dayPromises)
      dailyDetail.sort((a, b) => a.date.localeCompare(b.date))

      // 汇总
      const totalC = dailyDetail.reduce((s, d) => s + d.calories, 0)
      const maxC = Math.max(...dailyDetail.map(d => d.calories))
      const totalRecords = dailyDetail.reduce((s, d) => s + d.recordCount, 0)
      const isEmpty = totalC === 0 && totalRecords === 0

      // 2. 获取今日营养素
      let macroProtein = 0, macroCarbs = 0, macroFat = 0
      try {
        const macroRes = await cloudDB.getDietStats(util.getToday())
        const records = (macroRes.data || {}).records || []
        macroProtein = records.reduce((s, r) => s + (r.protein || 0), 0)
        macroCarbs = records.reduce((s, r) => s + (r.carbs || 0), 0)
        macroFat = records.reduce((s, r) => s + (r.fat || 0), 0)
      } catch (e) { /* 忽略 */ }

      this.setData({
        weekTotal: totalC,
        weekAvg: Math.round(totalC / 7),
        weekMax: maxC,
        weekRecords: totalRecords,
        weeklyData: dailyDetail,
        dailyDetail,
        macroProtein,
        macroCarbs,
        macroFat,
        macroTotal: macroProtein + macroCarbs + macroFat,
        loading: false,
        isEmpty
      })
    } catch (e) {
      console.error('[DietStats] loadData 异常:', e)
      this.setData({ loading: false, isEmpty: true })
    }
  }
})
