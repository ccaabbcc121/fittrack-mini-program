const api = require('../../../utils/api.js')
const util = require('../../../utils/util.js')
Page({
  data: {
    isEdit: false,
    editId: null,
    form: {
      name: '',
      type: 'strength',
      duration: '45',
      calories: '300',
      description: ''
    },
    exercisesText: '',
    submitting: false,
    canSubmit: false          // JS 侧计算按钮可用态，避免 WXML 模板内调用 .trim()
  },

  onLoad(options) {
    if (options.id) {
      const id = parseInt(options.id)
      this.setData({ isEdit: true, editId: id })
      this.loadPlan(id)
    }
    // 初始状态：表单为空，按钮不可用
    this._updateCanSubmit()
  },

  // 编辑模式：加载计划数据
  loadPlan(id) {
    api.getWorkoutPlans(1, 50).then(res => {
      const data = res.data || {}
      const plans = data.records || data || []
      const plan = plans.find(p => p.id === id)
      if (!plan) {
        util.showToast('计划不存在')
        return
      }
      let exercises = plan.exercises
      if (typeof exercises === 'string') {
        try { exercises = JSON.parse(exercises) } catch (e) { exercises = [] }
      }
      if (!Array.isArray(exercises)) exercises = []

      this.setData({
        form: {
          name: plan.name || '',
          type: plan.type || 'strength',
          duration: String(plan.duration || '45'),
          calories: String(plan.calories || '300'),
          description: plan.description || ''
        },
        exercisesText: exercises.join('\n')
      })
      // 编辑模式加载完数据后刷新按钮态
      this._updateCanSubmit()
    }).catch(() => {
      util.showToast('加载计划失败')
    })
  },

  // 训练类型选择
  selectType(e) {
    this.setData({ 'form.type': e.currentTarget.dataset.type })
  },

  // 表单字段输入（统一更新 + 刷新按钮态）
  onFieldInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
    this._updateCanSubmit()
  },

  // 训练动作输入
  onExercisesInput(e) {
    this.setData({ exercisesText: e.detail.value })
  },

  // ============ 核心：JS 侧计算按钮可用态 ============
  _updateCanSubmit() {
    const name = (this.data.form.name || '').trim()
    const canSubmit = name.length > 0 && !this.data.submitting
    if (this.data.canSubmit !== canSubmit) {
      this.setData({ canSubmit })
    }
  },

  // 提交表单
  handleSubmit() {
    console.log('[handleSubmit] 入口触发')

    const { form, exercisesText, isEdit, editId, submitting } = this.data
    if (submitting) {
      console.log('[handleSubmit] submitting 锁未释放，拦截')
      return
    }

    // 验证
    if (!form.name || !form.name.trim()) {
      console.log('[handleSubmit] 计划名称为空，拦截')
      return util.showToast('请输入计划名称')
    }
    const duration = parseInt(form.duration) || 30
    const calories = parseInt(form.calories) || 0
    if (duration <= 0 || duration > 480) {
      console.log('[handleSubmit] 时长非法:', duration)
      return util.showToast('训练时长需在 1-480 分钟之间')
    }

    // 处理训练动作
    const exercises = exercisesText
      .split('\n')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    const payload = {
      name: form.name.trim(),
      type: form.type,
      duration: duration,
      calories: calories,
      description: (form.description || '').trim(),
      exercises: JSON.stringify(exercises)
    }

    console.log('[handleSubmit] payload:', JSON.stringify(payload))

    this.setData({ submitting: true, canSubmit: false })

    const finish = (isSuccess) => {
      console.log('[handleSubmit] API ' + (isSuccess ? '成功' : '失败'))
      this.setData({ submitting: false })
      this._updateCanSubmit()
      this.saveToLocalCache(payload)
      util.showToast(
        isSuccess ? (isEdit ? '修改成功' : '创建成功') : '网络异常，已保存到本地',
        isSuccess ? 'success' : 'none'
      )
      setTimeout(() => {
        wx.navigateBack({
          fail: () => wx.switchTab({ url: '/pages/training/list/list' })
        })
      }, 600)
    }

    const apiCall = isEdit
      ? api.updateWorkoutPlan(editId, payload)
      : api.createWorkoutPlan(payload)

    console.log('[handleSubmit] 发起 API 请求, isEdit:', isEdit)
    apiCall.then(() => finish(true)).catch((err) => {
      console.error('[handleSubmit] API 异常:', err)
      finish(false)
    })
  },

  // 本地缓存备份
  saveToLocalCache(payload) {
    try {
      const cache = wx.getStorageSync('_local_plans') || []
      cache.unshift({
        id: Date.now(),
        userId: 1,
        ...payload,
        exercises: payload.exercises,
        status: 1,
        _local: true,
        createTime: util.getToday(),
        updateTime: util.getToday()
      })
      wx.setStorageSync('_local_plans', cache)
      console.log('[handleSubmit] 本地缓存已保存')
    } catch (e) {
      console.error('[handleSubmit] 本地缓存失败:', e)
    }
  }
})
