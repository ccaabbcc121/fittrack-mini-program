const api = require('../../../utils/api.js')
const util = require('../../../utils/util.js')
Page({
  data: {
    currentDate: '',
    mealTypes: [],
    totalCalories: 0,
    calPercent: 0,
    totalRecords: 0,

    // 弹窗
    showDialog: false,
    isEdit: false,
    editId: null,
    currentMeal: '',
    currentMealLabel: '',
    form: { foodName: '', calories: '', protein: '', carbs: '', fat: '' },
    submitting: false,
    canSubmit: false          // JS 侧计算按钮可用态
  },

  onShow() {
    this.setData({ currentDate: util.getToday() })
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh())
  },

  loadData() {
    const date = this.data.currentDate
    api.getDietStats(date).then(res => {
      const stats = res.data || {}
      const records = stats.records || []

      const mealTypes = [
        { key: 'breakfast', icon: '🌅', label: '早餐',
          records: records.filter(r => r.mealType === 'breakfast'),
          calories: stats.breakfast || 0 },
        { key: 'lunch', icon: '☀️', label: '午餐',
          records: records.filter(r => r.mealType === 'lunch'),
          calories: stats.lunch || 0 },
        { key: 'dinner', icon: '🌙', label: '晚餐',
          records: records.filter(r => r.mealType === 'dinner'),
          calories: stats.dinner || 0 }
      ]

      this.setData({
        mealTypes,
        totalCalories: stats.totalCalories || 0,
        calPercent: Math.min(100, Math.round((stats.totalCalories || 0) / 2000 * 100)),
        totalRecords: records.length
      })
    }).catch(() => {})
  },

  // 日期导航
  goToday() {
    this.setData({ currentDate: util.getToday() })
    this.loadData()
  },
  prevDay() { this.shiftDay(-1) },
  nextDay() { this.shiftDay(1) },
  shiftDay(n) {
    const d = new Date(this.data.currentDate)
    d.setDate(d.getDate() + n)
    this.setData({ currentDate: d.toISOString().split('T')[0] })
    this.loadData()
  },

  // ============ 按钮可用态计算（JS 侧，避免 WXML 表达式求值不稳定） ============
  _updateCanSubmit() {
    const { form, submitting } = this.data
    const nameOk = (form.foodName || '').trim().length > 0
    const calOk = !!(form.calories) && parseInt(form.calories) > 0
    const canSubmit = nameOk && calOk && !submitting
    if (this.data.canSubmit !== canSubmit) {
      this.setData({ canSubmit })
    }
  },

  // 打开添加弹窗
  showAddDialog(e) {
    const meal = e.currentTarget.dataset.meal
    const mt = util.getMealType(meal)
    this.setData({
      showDialog: true,
      isEdit: false,
      editId: null,
      currentMeal: meal,
      currentMealLabel: mt.label,
      form: { foodName: '', calories: '', protein: '', carbs: '', fat: '' },
      submitting: false,
      canSubmit: false
    })
  },

  // 打开编辑弹窗
  handleEdit(e) {
    const id = e.currentTarget.dataset.id
    let record = null
    for (const meal of this.data.mealTypes) {
      const found = meal.records.find(r => r.id === id)
      if (found) { record = found; break }
    }
    if (!record) return
    const mt = util.getMealType(record.mealType)
    this.setData({
      showDialog: true,
      isEdit: true,
      editId: id,
      currentMeal: record.mealType,
      currentMealLabel: mt.label,
      form: {
        foodName: record.foodName || '',
        calories: String(record.calories || ''),
        protein: String(record.protein || ''),
        carbs: String(record.carbs || ''),
        fat: String(record.fat || '')
      },
      submitting: false
    })
    this._updateCanSubmit()
  },

  // 关闭弹窗
  closeDialog() {
    this.setData({
      showDialog: false, isEdit: false, editId: null,
      submitting: false, canSubmit: false
    })
  },

  // 阻止弹窗背景点击冒泡
  noop() {},

  // 表单输入（更新 + 同步按钮态）
  onFormInput(e) {
    const f = e.currentTarget.dataset.field
    this.setData({ ['form.' + f]: e.detail.value })
    this._updateCanSubmit()
  },

  // 提交添加 / 保存编辑
  handleAdd() {
    console.log('[diet.handleAdd] 入口触发')

    const { form, currentMeal, currentDate, isEdit, editId, submitting } = this.data
    if (submitting) {
      console.log('[diet.handleAdd] submitting 锁未释放，拦截')
      return
    }

    // 验证
    if (!form.foodName || !form.foodName.trim()) {
      console.log('[diet.handleAdd] 食物名称为空，拦截')
      return util.showToast('请输入食物名称')
    }
    if (!form.calories || parseInt(form.calories) <= 0) {
      console.log('[diet.handleAdd] 热量无效，拦截')
      return util.showToast('请输入有效的热量值')
    }

    this.setData({ submitting: true, canSubmit: false })

    const payload = {
      mealType: currentMeal,
      foodName: form.foodName.trim(),
      calories: parseInt(form.calories) || 0,
      protein: parseInt(form.protein) || 0,
      carbs: parseInt(form.carbs) || 0,
      fat: parseInt(form.fat) || 0,
      recordDate: currentDate
    }

    console.log('[diet.handleAdd] payload:', JSON.stringify(payload))

    const apiCall = isEdit
      ? api.updateDietRecord(editId, payload)
      : api.createDietRecord(payload)

    const successMsg = isEdit ? '修改成功' : '添加成功'
    console.log('[diet.handleAdd] 发起 API 请求, isEdit:', isEdit)

    apiCall.then(() => {
      console.log('[diet.handleAdd] API 成功')
      util.showToast(successMsg, 'success')
      this.closeDialog()
      this.loadData()
    }).catch((err) => {
      console.error('[diet.handleAdd] API 失败:', err)
      this.saveLocalRecord(payload)
      util.showToast('已保存到本地', 'success')
      this.closeDialog()
      this.loadData()
    }).finally(() => {
      if (this.data.submitting) {
        this.setData({ submitting: false })
      }
    })
  },

  // 本地备份
  saveLocalRecord(payload) {
    try {
      const cache = wx.getStorageSync('_local_diets') || []
      cache.unshift({ id: Date.now(), userId: 1, ...payload, _local: true,
        createTime: new Date().toISOString() })
      wx.setStorageSync('_local_diets', cache)
      console.log('[diet.handleAdd] 本地缓存已保存')
    } catch (e) { /* 静默 */ }
  },

  // 删除记录
  handleDelete(e) {
    const id = e.currentTarget.dataset.id
    util.showConfirm('删除记录', '确定要删除这条饮食记录吗？').then(ok => {
      if (!ok) return
      api.deleteDietRecord(id).then(() => {
        util.showToast('已删除')
        this.loadData()
      }).catch(() => {
        util.showToast('删除失败')
      })
    })
  }
})
