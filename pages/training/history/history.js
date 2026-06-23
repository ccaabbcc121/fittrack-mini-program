const api = require('../../../utils/api.js')
const util = require('../../../utils/util.js')
Page({
  data: {
    records: [],
    groupedRecords: [],
    stats: { totalWorkouts: 0, totalDuration: 0, totalCalories: 0 },
    loading: true,

    // 编辑弹窗
    showEdit: false,
    editRecord: null,
    editForm: { planName: '', duration: '', calories: '', note: '', recordDate: '' }
  },

  onShow() {
    this.loadRecords()
  },

  onPullDownRefresh() {
    this.loadRecords().then(() => wx.stopPullDownRefresh())
  },

  async loadRecords() {
    this.setData({ loading: true })
    try {
      const res = await api.getWorkoutRecords(1, 200).catch(() => ({ data: { records: [] } }))
      const data = res.data || {}
      const records = data.records || data || []

      // 汇总统计
      const stats = {
        totalWorkouts: records.length,
        totalDuration: records.reduce((s, r) => s + (r.duration || 0), 0),
        totalCalories: records.reduce((s, r) => s + (r.calories || 0), 0)
      }

      // 按日期分组
      const groups = {}
      records.forEach(r => {
        const date = r.recordDate || '未知日期'
        if (!groups[date]) groups[date] = []
        groups[date].push(r)
      })
      const groupedRecords = Object.keys(groups)
        .sort((a, b) => b.localeCompare(a))
        .map(date => ({
          date,
          records: groups[date],
          dayTotal: groups[date].reduce((s, r) => s + (r.calories || 0), 0)
        }))

      this.setData({ records, groupedRecords, stats, loading: false })
    } catch (e) {
      this.setData({ loading: false })
    }
  },

  // 删除记录
  handleDelete(e) {
    const id = e.currentTarget.dataset.id
    util.showConfirm('删除记录', '确定要删除这条训练记录吗？').then(ok => {
      if (!ok) return
      api.deleteWorkoutRecord(id).then(() => {
        util.showToast('已删除')
        this.loadRecords()
      }).catch(() => {
        util.showToast('删除失败')
      })
    })
  },

  // 打开编辑弹窗
  handleEdit(e) {
    const id = e.currentTarget.dataset.id
    const record = this.data.records.find(r => r.id === id)
    if (!record) return
    this.setData({
      showEdit: true,
      editRecord: record,
      editForm: {
        planName: record.planName || '',
        duration: String(record.duration || ''),
        calories: String(record.calories || ''),
        note: record.note || '',
        recordDate: record.recordDate || ''
      }
    })
  },

  // 关闭编辑弹窗
  closeEdit() {
    this.setData({ showEdit: false })
  },

  // 阻止冒泡
  noop() {},

  // 编辑表单输入
  onEditInput(e) {
    const f = e.currentTarget.dataset.field
    this.setData({ ['editForm.' + f]: e.detail.value })
  },

  // 保存编辑
  handleSaveEdit() {
    const { editRecord, editForm } = this.data
    if (!editForm.planName.trim()) {
      return util.showToast('请输入计划名称')
    }
    const data = {
      planName: editForm.planName.trim(),
      duration: parseInt(editForm.duration) || 0,
      calories: parseInt(editForm.calories) || 0,
      note: editForm.note.trim(),
      recordDate: editForm.recordDate
    }
    api.updateWorkoutRecord(editRecord.id, data).then(() => {
      util.showToast('修改成功', 'success')
      this.closeEdit()
      this.loadRecords()
    }).catch(() => {
      util.showToast('修改失败')
    })
  }
})
