const api = require('../../../utils/api.js')
const util = require('../../../utils/util.js')

Page({
  data: {
    records: [],
    latestWeight: "--",
    weightChange: "--",
    changeColor: "#999",
    bmi: "--",
    totalRecords: 0,

    // 弹窗
    showDialog: false,
    isEdit: false,
    editId: null,
    form: { weight: "", bodyFat: "", recordDate: "" },
    submitting: false,
    canSubmit: false          // JS 侧计算按钮可用态
  },

  onShow() {
    this.setData({ "form.recordDate": util.getToday() })
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  loadData() {
    api.getWeightRecords(1, 100).then(res => {
      const data = res.data || {}
      const records = data.records || data || []

      const latest = records.length > 0 ? records[0].weight : "--"
      let change = "--"
      let changeColor = "#999"

      if (records.length >= 2) {
        const diff = (records[0].weight - records[records.length - 1].weight).toFixed(1)
        const sign = diff > 0 ? "+" : ""
        change = sign + diff
        changeColor = diff < 0 ? "#34c759" : diff > 0 ? "#e94560" : "#999"
      }

      const info = wx.getStorageSync("userInfo") || {}
      const bmi = util.calcBMI(latest !== "--" ? latest : info.weight, info.height)

      this.setData({
        records,
        latestWeight: latest,
        weightChange: change,
        changeColor,
        bmi: bmi || "--",
        totalRecords: records.length
      })
    }).catch(() => {})
  },

  goToChart() {
    wx.navigateTo({ url: "/pages/weight/chart/chart" })
  },

  // ============ 按钮可用态计算（JS 侧，避免 WXML 表达式求值不稳定） ============
  _updateCanSubmit() {
    const { form, submitting } = this.data
    const weight = parseFloat(form.weight)
    const canSubmit = !!form.weight && !isNaN(weight) && weight > 0 && !submitting
    if (this.data.canSubmit !== canSubmit) {
      this.setData({ canSubmit })
    }
  },

  // 打开添加弹窗
  showAddDialog() {
    this.setData({
      showDialog: true,
      isEdit: false,
      editId: null,
      form: { weight: "", bodyFat: "", recordDate: util.getToday() },
      submitting: false,
      canSubmit: false
    })
  },

  // 打开编辑弹窗
  handleEdit(e) {
    const id = e.currentTarget.dataset.id
    const record = this.data.records.find(r => r.id === id)
    if (!record) return
    this.setData({
      showDialog: true,
      isEdit: true,
      editId: id,
      form: {
        weight: String(record.weight || ''),
        bodyFat: record.bodyFat ? String(record.bodyFat) : '',
        recordDate: record.recordDate || ''
      },
      submitting: false
    })
    this._updateCanSubmit()
  },

  closeDialog() {
    this.setData({
      showDialog: false, isEdit: false, editId: null,
      submitting: false, canSubmit: false
    })
  },

  noop() {},

  onFormInput(e) {
    const f = e.currentTarget.dataset.field
    this.setData({ ["form." + f]: e.detail.value })
    this._updateCanSubmit()
  },

  // 添加 / 编辑记录
  handleAdd() {
    console.log('[weight.handleAdd] 入口触发')

    const { form, isEdit, editId, submitting } = this.data
    if (submitting) {
      console.log('[weight.handleAdd] submitting 锁未释放，拦截')
      return
    }

    const weight = parseFloat(form.weight)
    if (!form.weight || isNaN(weight) || weight <= 0) {
      console.log('[weight.handleAdd] 体重值无效，拦截')
      return util.showToast("请输入有效的体重值")
    }
    if (weight < 20 || weight > 300) {
      console.log('[weight.handleAdd] 体重超出范围:', weight)
      return util.showToast("体重需在 20-300 kg 之间")
    }

    this.setData({ submitting: true, canSubmit: false })

    const payload = {
      weight,
      bodyFat: form.bodyFat ? parseFloat(form.bodyFat) : null,
      recordDate: form.recordDate || util.getToday()
    }

    console.log('[weight.handleAdd] payload:', JSON.stringify(payload))

    const apiCall = isEdit
      ? api.updateWeightRecord(editId, payload)
      : api.createWeightRecord(payload)

    const successMsg = isEdit ? "修改成功" : "添加成功"
    console.log('[weight.handleAdd] 发起 API 请求, isEdit:', isEdit)

    apiCall.then(() => {
      console.log('[weight.handleAdd] API 成功')
      util.showToast(successMsg, "success")
      this.closeDialog()
      this.loadData()
    }).catch((err) => {
      console.error('[weight.handleAdd] API 失败:', err)
      this.saveLocalRecord(payload)
      util.showToast("已保存到本地", "success")
      this.closeDialog()
      this.loadData()
    }).finally(() => {
      if (this.data.submitting) {
        this.setData({ submitting: false })
      }
    })
  },

  saveLocalRecord(payload) {
    try {
      const cache = wx.getStorageSync('_local_weights') || []
      cache.unshift({
        id: Date.now(), userId: 1, ...payload, _local: true,
        createTime: new Date().toISOString()
      })
      wx.setStorageSync('_local_weights', cache)
      console.log('[weight.handleAdd] 本地缓存已保存')
    } catch (e) { /* 静默 */ }
  },

  // 删除记录
  handleDelete(e) {
    const id = e.currentTarget.dataset.id
    util.showConfirm("删除记录", "确定删除这条体重记录吗？").then(ok => {
      if (!ok) return
      api.deleteWeightRecord(id).then(() => {
        util.showToast("已删除")
        this.loadData()
      }).catch(() => {
        util.showToast("删除失败")
      })
    })
  }
})
