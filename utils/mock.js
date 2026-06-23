// utils/mock.js - Mock 数据服务
const MockData = {
  // 用户信息
  userInfo: {
    id: 1,
    openid: 'mock_openid_001',
    nickname: '健身达人',
    avatarUrl: '/images/avatar-default.png',
    gender: 1,
    age: 28,
    height: 175,
    weight: 70,
    bmi: 22.9,
    createTime: '2025-06-01',
    updateTime: '2025-12-15'
  },

  // 训练计划
  workoutPlans: [
    {
      id: 1,
      userId: 1,
      name: '上肢力量训练',
      type: 'strength',
      duration: 45,
      calories: 320,
      description: '重点训练胸肌、背肌和手臂',
      exercises: ['俯卧撑 3x15', '引体向上 3x8', '哑铃弯举 3x12'],
      status: 1,
      createTime: '2025-12-01',
      updateTime: '2025-12-10'
    },
    {
      id: 2,
      userId: 1,
      name: '下肢训练日',
      type: 'strength',
      duration: 50,
      calories: 400,
      description: '深蹲、硬拉等复合动作',
      exercises: ['杠铃深蹲 4x10', '罗马尼亚硬拉 3x12', '腿举 3x15'],
      status: 1,
      createTime: '2025-12-02',
      updateTime: '2025-12-10'
    },
    {
      id: 3,
      userId: 1,
      name: '有氧跑步',
      type: 'cardio',
      duration: 30,
      calories: 250,
      description: '户外慢跑5公里',
      exercises: ['慢跑 5km', '拉伸 10min'],
      status: 1,
      createTime: '2025-12-05',
      updateTime: '2025-12-05'
    }
  ],

  // 训练记录
  workoutRecords: [
    { id: 1, planId: 1, userId: 1, planName: '上肢力量训练', duration: 45, calories: 320, completed: true, note: '感觉很好', recordDate: '2025-12-15', createTime: '2025-12-15 09:30' },
    { id: 2, planId: 1, userId: 1, planName: '上肢力量训练', duration: 40, calories: 300, completed: true, note: '', recordDate: '2025-12-13', createTime: '2025-12-13 10:00' },
    { id: 3, planId: 2, userId: 1, planName: '下肢训练日', duration: 50, calories: 400, completed: true, note: '突破个人纪录', recordDate: '2025-12-14', createTime: '2025-12-14 08:15' },
    { id: 4, planId: 3, userId: 1, planName: '有氧跑步', duration: 30, calories: 250, completed: true, note: '状态不错', recordDate: '2025-12-15', createTime: '2025-12-15 18:00' },
    { id: 5, planId: 1, userId: 1, planName: '上肢力量训练', duration: 45, calories: 330, completed: true, note: '加了重量', recordDate: '2025-12-11', createTime: '2025-12-11 09:00' },
    { id: 6, planId: 2, userId: 1, planName: '下肢训练日', duration: 45, calories: 380, completed: true, note: '', recordDate: '2025-12-10', createTime: '2025-12-10 08:30' }
  ],

  // 饮食记录
  dietRecords: [
    { id: 1, userId: 1, mealType: 'breakfast', foodName: '燕麦牛奶+香蕉', calories: 350, protein: 12, carbs: 55, fat: 8, recordDate: '2025-12-15', createTime: '2025-12-15 08:00' },
    { id: 2, userId: 1, mealType: 'lunch', foodName: '鸡胸肉沙拉+糙米饭', calories: 520, protein: 40, carbs: 50, fat: 12, recordDate: '2025-12-15', createTime: '2025-12-15 12:30' },
    { id: 3, userId: 1, mealType: 'dinner', foodName: '三文鱼+西兰花', calories: 450, protein: 35, carbs: 20, fat: 22, recordDate: '2025-12-15', createTime: '2025-12-15 19:00' },
    { id: 4, userId: 1, mealType: 'breakfast', foodName: '全麦面包+鸡蛋+牛奶', calories: 380, protein: 20, carbs: 40, fat: 12, recordDate: '2025-12-14', createTime: '2025-12-14 07:30' },
    { id: 5, userId: 1, mealType: 'lunch', foodName: '牛肉面', calories: 600, protein: 30, carbs: 65, fat: 18, recordDate: '2025-12-14', createTime: '2025-12-14 12:00' },
    { id: 6, userId: 1, mealType: 'dinner', foodName: '蔬菜沙拉+鸡胸肉', calories: 320, protein: 30, carbs: 15, fat: 10, recordDate: '2025-12-14', createTime: '2025-12-14 18:30' }
  ],

  // 体重记录
  weightRecords: [
    { id: 1, userId: 1, weight: 72.5, bodyFat: 18.5, recordDate: '2025-12-01', createTime: '2025-12-01 08:00' },
    { id: 2, userId: 1, weight: 72.0, bodyFat: 18.3, recordDate: '2025-12-04', createTime: '2025-12-04 08:00' },
    { id: 3, userId: 1, weight: 71.5, bodyFat: 18.0, recordDate: '2025-12-07', createTime: '2025-12-07 08:00' },
    { id: 4, userId: 1, weight: 71.2, bodyFat: 17.8, recordDate: '2025-12-10', createTime: '2025-12-10 08:00' },
    { id: 5, userId: 1, weight: 70.8, bodyFat: 17.5, recordDate: '2025-12-13', createTime: '2025-12-13 08:00' },
    { id: 6, userId: 1, weight: 70.0, bodyFat: 17.2, recordDate: '2025-12-15', createTime: '2025-12-15 08:00' }
  ],

  // 统计数据
  statistics: {
    weeklyWorkouts: 4,
    monthlyWorkouts: 15,
    totalCaloriesBurned: 1980,
    totalCaloriesIntake: 2620,
    avgWeight: 71.3
  }
}

// 模拟API延迟（ms: 延迟毫秒数，默认300ms）
function mockDelay(ms = 300) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(), ms)
  })
}

// 模拟API响应
function mockResponse(data, success = true, msg = 'ok') {
  return { code: success ? 200 : 500, data, msg }
}

module.exports = { MockData, mockDelay, mockResponse }
