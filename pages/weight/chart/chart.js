// pages/weight/chart/chart.js — 云开发版
// 原逻辑：api.getWeightRecords() 加载
// 改造后：cloudDB.getWeightRecords()
const cloudDB = require('../../../utils/cloud-db.js')
const util = require('../../../utils/util.js')

Page({
  data: {
    records: [],
    bars: [],               // CSS 柱状图数据
    yLabels: [],            // Y 轴刻度
    stats: { minWeight: '--', maxWeight: '--', avgWeight: '--', trend: '--' },
    loading: true,
    isEmpty: false
  },

  onShow() {
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  loadData() {
    this.setData({ loading: true })
    cloudDB.getWeightRecords(1, 200).then(res => {
      const data = res.data || {}
      // 按日期升序排列（用于图表）
      const records = (data.records || data || []).slice().reverse()

      if (records.length === 0) {
        return this.setData({
          loading: false, isEmpty: true,
          bars: [], yLabels: [],
          stats: { minWeight: '--', maxWeight: '--', avgWeight: '--', trend: '--' }
        })
      }

      const weights = records.map(r => r.weight)
      const minW = parseFloat(Math.min(...weights).toFixed(1))
      const maxW = parseFloat(Math.max(...weights).toFixed(1))
      const avgW = parseFloat((weights.reduce((s, w) => s + w, 0) / weights.length).toFixed(1))
      const range = maxW - minW || 1

      // 趋势判断
      const firstW = weights[0]
      const lastW = weights[weights.length - 1]
      const trend = lastW < firstW ? '⬇ 下降' : lastW > firstW ? '⬆ 上升' : '➕ 持平'

      // 生成 CSS 柱状图数据
      const maxBarH = 140
      const bars = records.map(r => ({
        date: r.recordDate.slice(5),     // MM-DD
        weight: r.weight,
        barHeight: Math.max(8, ((r.weight - minW) / range) * maxBarH),
        isMax: r.weight === maxW,
        isMin: r.weight === minW
      }))

      // Y 轴标签
      const midW = parseFloat(((maxW + minW) / 2).toFixed(1))
      const yLabels = [String(maxW), String(midW), String(minW)]

      this.setData({
        records, bars, yLabels,
        stats: { minWeight: minW, maxWeight: maxW, avgWeight: avgW, trend },
        loading: false, isEmpty: false
      })
    }).catch(() => {
      this.setData({ loading: false, isEmpty: true })
    })
  }
})
