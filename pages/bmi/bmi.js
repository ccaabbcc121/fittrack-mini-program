const util = require('../../utils/util.js')
Page({
  data: { height: '', weight: '', bmi: null, category: {}, advice: '' },
  onShow() {
    const info = wx.getStorageSync('userInfo')
    if (info) this.setData({ height: String(info.height || ''), weight: String(info.weight || '') })
  },
  onHeightInput(e) { this.setData({ height: e.detail.value }) },
  onWeightInput(e) { this.setData({ weight: e.detail.value }) },
  calcBMI() {
    const h = parseFloat(this.data.height)
    const w = parseFloat(this.data.weight)
    const bmi = util.calcBMI(w, h)
    const category = util.getBMICategory(bmi)
    let advice = ''
    if (bmi < 18.5) advice = '你的体重偏瘦，建议增加营养摄入，配合力量训练增肌。每日应保证充足的热量摄入。'
    else if (bmi < 24) advice = '你的体重在正常范围内，保持当前的健康饮食和运动习惯即可。建议每周至少运动3次。'
    else if (bmi < 28) advice = '你的体重偏重，建议控制饮食热量，增加有氧运动。每周至少进行150分钟中等强度运动。'
    else advice = '你的BMI指数较高，建议咨询专业医生或营养师，制定科学的减重计划。'
    this.setData({ bmi, category, advice })
  }
})
