// pages/training/create/create.js — 云开发版
// 原逻辑：api.getWorkoutPlans() 加载 + api.createWorkoutPlan/updateWorkoutPlan 提交
//         失败时 saveToLocalCache() → wx.setStorageSync('_local_plans')
// 改造后：cloudDB.getWorkoutPlans() 加载 + cloudDB.createWorkoutPlan/updateWorkoutPlan 提交
//         移除：saveToLocalCache() 和 _local_plans 写入（云数据库为主存储）
const cloudDB = require('../../../utils/cloud-db.js')
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
    canSubmit: false  // JS 侧计算按钮可用态
  },

  onLoad(options) {
    if (options.id) {
      this.setData({ isEdit: true, editId: options.id })
      this.loadPlan(options.id)
    }
    this._updateCanSubmit()
  },

  // 编辑模式：从云数据库加载计划数据
  loadPlan(id) {
    cloudDB.getWorkoutPlans(1, 50).then(res => {
      const data = res.data || {}
      const plans = data.records || data || []
      const plan = plans.find(p => p._id === id || p.id === id)
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
      this._updateCanSubmit()
    }).catch(() => {
      util.showToast('加载计划失败')
    })
  },

  // 训练类型选择
  selectType(e) {
    this.setData({ 'form.type': e.currentTarget.dataset.type })
  },

  // 表单字段输入
  onFieldInput(e) {
    const field = e.currentTarget.dataset.field
    this.setData({ ['form.' + field]: e.detail.value })
    this._updateCanSubmit()
  },

  // 训练动作输入
  onExercisesInput(e) {
    this.setData({ exercisesText: e.detail.value })
  },

  // JS 侧计算按钮可用态
  _updateCanSubmit() {
    const name = (this.data.form.name || '').trim()
    const canSubmit = name.length > 0 && !this.data.submitting
    if (this.data.canSubmit !== canSubmit) {
      this.setData({ canSubmit })
    }
  },

  // 提交表单
  handleSubmit() {
    console.log('[TrainCreate] handleSubmit 触发')

    const { form, exercisesText, isEdit, editId, submitting } = this.data
    if (submitting) {
      console.log('[TrainCreate] submitting 锁未释放，拦截')
      return
    }

    // 验证
    if (!form.name || !form.name.trim()) {
      console.log('[TrainCreate] 计划名称为空，拦截')
      return util.showToast('请输入计划名称')
    }
    const duration = parseInt(form.duration) || 30
    const calories = parseInt(form.calories) || 0
    if (duration <= 0 || duration > 480) {
      console.log('[TrainCreate] 时长非法:', duration)
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

    console.log('[TrainCreate] payload:', JSON.stringify(payload))

    this.setData({ submitting: true, canSubmit: false })

    const apiCall = isEdit
      ? cloudDB.updateWorkoutPlan(editId, payload)
      : cloudDB.createWorkoutPlan(payload)

    console.log('[TrainCreate] 提交云数据库, isEdit:', isEdit)

    apiCall.then(() => {
      console.log('[TrainCreate] 提交成功')
      this.setData({ submitting: false })
      this._updateCanSubmit()
      util.showToast(isEdit ? '修改成功' : '创建成功', 'success')
      setTimeout(() => {
        wx.navigateBack({
          fail: () => wx.switchTab({ url: '/pages/training/list/list' })
        })
      }, 600)
    }).catch((err) => {
      console.error('[TrainCreate] 提交失败:', err)
      this.setData({ submitting: false })
      this._updateCanSubmit()
      util.showToast('网络异常，请重试')
    })
  }
})
