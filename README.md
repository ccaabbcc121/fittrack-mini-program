## 📌 项目简介

**FitTrack** 是一个独立开发的个人健身数据管理工具，最初基于小程序本地存储实现单机使用，**目前已完整接入微信云开发**，具备用户登录鉴权、云端数据库同步、云函数调用等能力，可在真机体验版中共享使用。

- 完整覆盖「体重记录 → 饮食录入 → 训练计划 → BMI 计算」的业务闭环
- 手动排查并修复了灰度基础库线程阻塞 `WAServiceMainContext timeout` 等底层兼容性缺陷
- 解决云函数部署报错 `-501000 FunctionName not found` 等典型云开发问题，保证线上稳定

## ✨ 核心功能

| 模块 | 功能 |
|------|------|
| 📊 首页总览 | 展示体重、BMI、本周训练次数、当日摄入/消耗热量 |
| ⚖️ 体重管理 | 新增、编辑、删除体重记录，自动计算变化幅度 |
| 🍽️ 饮食记录 | 早/午/晚餐录入，统计热量、蛋白质、碳水、脂肪 |
| 🏃 训练计划 | 自定义训练方案，增删改训练动作、时长与消耗热量 |
| 🧮 BMI 计算器 | 快速计算身体质量指数并评估健康区间 |

## 🛠 技术环境

| 分类 | 技术 |
|------|------|
| 小程序框架 | 微信原生 WXML + WXSS + JavaScript |
| 云服务 | 微信云开发 (CloudBase) |
| 云函数运行时 | Node.js |
| 数据存储 | 云数据库（JSON 文档型） + 云存储 |
| 开发工具 | 微信开发者工具 Stable 2.01，基础库 3.5.8 |
| 版本控制 | Git + GitHub，.gitignore 规范管理 |

## 📁 项目结构
├── cloudfunctions/ # 云函数
│ ├── login/ # 获取用户 OpenID
│ └── getOpenid/ # 备用 OpenID 调用
├── miniprogram/
│ ├── pages/
│ │ ├── index/ # 首页总览
│ │ ├── weight/ # 体重管理
│ │ ├── diet/ # 饮食记录
│ │ ├── training/ # 训练计划
│ │ └── bmi/ # BMI 计算器
│ ├── utils/
│ │ └── cloud-db.js # 云数据库操作封装
│ ├── app.js # 云环境初始化、登录云函数调用
│ ├── app.json
│ └── app.wxss
├── project.config.json # 含 cloudfunctionRoot 配置
├── .gitignore # 忽略 node_modules、个人配置等
└── README.md


📈 未来计划

饮食热量自动计算（对接食物库 API）

训练视频指导与打卡记录

身体围度变化图表（使用 ECharts 小程序版）

多设备历史数据对比分析

转为正式版发布上线
text

## 🚀 快速开始（本地运行 / 体验版）

### 1. 克隆仓库
```bash
git clone https://github.com/ccaabbcc121/fittrack-mini-program.git
2. 导入微信开发者工具
打开微信开发者工具 → 导入项目，选择克隆下来的目录

填入你的 AppID（可使用测试号）

3. 配置云开发环境
在开发者工具顶部点击「云开发」开通云环境，获取 环境 ID

修改 miniprogram/app.js 中的 env 字段：

javascript
wx.cloud.init({
  env: '你的环境ID',   // 例如 cloud1-xxxx
  traceUser: true,
})
4. 部署云函数
右键 cloudfunctions 下的 login 文件夹 → 上传并部署：云端安装依赖

若有 getOpenid 云函数，同样部署

5. 初始化云数据库
在云开发控制台 → 数据库，创建集合（如 weights、diets、trainings）

集合权限建议设为「所有用户可读，仅创建者可读写」

6. 编译运行
点击“编译”即可在模拟器中看到效果；也可通过真机扫码体验。
