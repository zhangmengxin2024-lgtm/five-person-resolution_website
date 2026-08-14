# Like You and Me / Face Detection 项目交接文档

最后更新：2026-07-04
项目目录名：`like-you-and-me`
线上项目：`https://face-detection-swart.vercel.app/`
GitHub 仓库：`https://github.com/Liu-Zhihang/face-detection`

## 1. 项目一句话说明

这是一个交互式人脸采集、五官数据化拆解、群体平均值比较、五官征用与 AI 融合生成的前端艺术项目。

用户通过摄像头录入 5 张不同人脸，系统使用 MediaPipe 在浏览器本地检测人脸关键点，按左眉、右眉、左眼、右眼、鼻、嘴、左耳、右耳、脸型/下颌拆解五官；每个五官根据 5 人样本的群体平均值选择最接近平均值的来源，最后把选中组件交给 DashScope 的 `qwen-image-edit-plus` 生成一张融合脸。

## 2. 技术栈

- 前端框架：React 19
- 构建工具：Vite 6
- 语言：TypeScript
- 样式：Tailwind CDN + `index.html` 内联 CSS
- 人脸检测：`@mediapipe/tasks-vision` 的 FaceLandmarker
- AI 图像生成：阿里云 DashScope，模型 `qwen-image-edit-plus`
- 云端部署：Vercel
- 包管理器：npm，使用 `package-lock.json`

## 3. 重要目录和文件

```text
like-you-and-me/
├── App.tsx                         # 应用状态机：INTRODUCTION/CAPTURE/ANALYSIS/ASSEMBLY
├── index.html                      # HTML 入口、Tailwind CDN、全局动画样式
├── index.tsx                       # React mount 入口
├── constants.tsx                   # 标题、人数、颜色等常量
├── types.ts                        # 全局类型：人脸、五官裁片、选择结果等
├── vite.config.ts                  # Vite 配置，本地 DashScope 代理、环境变量注入
├── vercel.json                     # Vercel rewrites，云端 DashScope 代理
├── components/
│   ├── CameraView.tsx              # 摄像头、MediaPipe 实时检测、录入五官裁片
│   ├── AnalysisDisplay.tsx         # 五官拆解、均值计算、逐项比较、垃圾池
│   ├── AssemblyResult.tsx          # 最终融合结果和五官来源对比
│   ├── Header.tsx                  # 顶部标题栏
│   └── TrashPool.tsx               # 未选中五官裁片池
├── services/
│   ├── faceDetection.ts            # MediaPipe 初始化、检测、人脸指标计算、重复脸判断
│   └── dashscope.ts                # DashScope API 调用
├── utils/
│   ├── featureDefinitions.ts       # 五官定义：key、label、metricKey、MediaPipe landmark 点位
│   ├── imageUtils.ts               # 裁切五官、生成 5 人网格、生成已选五官拼板
│   └── faceMetrics.ts              # 人脸辅助分析指标和绘制点位
├── README.md                       # 原始简要说明
├── COLLABORATOR_HANDOFF.md         # 本文档
├── .env.example                    # 环境变量模板，不包含真实密钥
└── test-api.example.js             # 脱敏版 DashScope 测试脚本
```

## 4. 交互流程

### 4.1 INTRODUCTION

首屏显示项目标题和进入按钮。点击后进入摄像头采集阶段。

### 4.2 CAPTURE

文件：`components/CameraView.tsx`

功能：

- 请求浏览器摄像头权限。
- 初始化 MediaPipe FaceLandmarker。
- 每约 100ms 进行一次人脸检测。
- 支持顺序录入和多人 ensemble 录入。
- 最多采集 `REQUIRED_FACES = 5` 张不同人脸。
- 使用 landmark 相似度避免重复采集同一个人。
- 每次采集会裁切 400x400 人脸图，并立即生成该人脸的五官裁片。

注意：

- 浏览器摄像头只在 `localhost` 或 HTTPS 域名下可用。
- 本地 `http://localhost:3000` 可以使用摄像头。
- 局域网 HTTP 地址可能无法使用摄像头，除非浏览器允许 insecure origin。

### 4.3 ANALYSIS

文件：`components/AnalysisDisplay.tsx`

功能：

- 按 `utils/featureDefinitions.ts` 中的顺序逐个处理五官：
  - 左眉
  - 右眉
  - 左眼
  - 右眼
  - 鼻
  - 嘴
  - 左耳
  - 右耳
  - 脸型/下颌
- 对每个五官取对应 metric，例如鼻子使用 `noseWidth`，嘴使用 `mouthWidth`。
- 计算 5 人该指标的平均值。
- 选择与平均值差距最小的人脸来源。
- 展示每个人的五官裁片、数值、平均との差、选中/丢弃状态。
- 未选中五官进入右侧垃圾池。

### 4.4 ASSEMBLY

文件：`components/AssemblyResult.tsx`

功能：

- 生成一个 5 人来源脸网格。
- 生成一个已选五官拼板。
- 把这两张图连同 prompt 发给 DashScope。
- 展示生成后的融合脸。
- 展示每个已选五官的“最终采用裁片 vs 来源原始五官上下文”对比。

## 5. 本地开发部署

### 5.1 必需软件

建议环境：

- Node.js 20 LTS 或更新的 LTS 版本
- npm 10 或随 Node 自带版本
- Chrome / Edge 最新版，方便摄像头和 MediaPipe GPU delegate

检查命令：

```bash
node -v
npm -v
```

### 5.2 安装依赖

进入项目根目录：

```bash
cd like-you-and-me
npm install
```

不要手动提交或打包 `node_modules/`。

### 5.3 配置本地环境变量

复制模板：

```bash
cp .env.example .env.local
```

编辑 `.env.local`：

```bash
DASHSCOPE_API_KEY=填入你的阿里云 DashScope API Key
# GEMINI_API_KEY=当前主流程未使用，可留空
```

关键说明：

- `DASHSCOPE_API_KEY` 是必须的，否则最终融合阶段会报错：`DASHSCOPE_API_KEY is not configured`。
- `.env.local` 已被 `.gitignore` 忽略，不能提交，也不要发给无关人员。
- 本交接 zip 不包含真实 API Key。

### 5.4 启动本地开发服务器

```bash
npm run dev
```

默认地址：

```text
http://localhost:3000/
```

打开后：

1. 允许摄像头权限。
2. 等待 MediaPipe 模型加载。
3. 录入 5 张不同人脸。
4. 等待分析过程完成。
5. 等待 DashScope 返回融合图。

### 5.5 本地构建检查

```bash
npm run build
```

构建成功后会生成：

```text
dist/
```

`dist/` 是构建产物，不需要提交。

### 5.6 本地预览生产构建

```bash
npm run preview
```

Vite 会输出一个本地预览地址。

## 6. API 和密钥说明

### 6.1 DashScope

当前必须提供：

```bash
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxx
```

调用位置：

```text
services/dashscope.ts
```

当前模型：

```text
qwen-image-edit-plus
```

当前请求路径：

```text
/api/aliyun/services/aigc/multimodal-generation/generation
```

本地代理配置在：

```text
vite.config.ts
```

云端代理配置在：

```text
vercel.json
```

### 6.2 MediaPipe

MediaPipe 不需要 API Key，但需要能访问以下 CDN/model URL：

```text
https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm
https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task
```

如果网络环境无法访问 Google Storage 或 jsDelivr，摄像头页面会卡在 MediaPipe 加载阶段。解决方式：

- 切换可访问这些 CDN 的网络；或
- 将 wasm 和 `.task` 模型文件自托管到项目 `public/` 目录，然后修改 `services/faceDetection.ts` 的 `WASM_PATH` 和 `MODEL_PATH`。

### 6.3 Gemini

项目依赖里仍有 `@google/genai`，`vite.config.ts` 也保留 `GEMINI_API_KEY` 注入，但当前主流程已经不依赖 Gemini。

协作者可以先不配置 `GEMINI_API_KEY`。

## 7. 非常重要的安全说明

当前代码为了快速部署，把 `process.env.DASHSCOPE_API_KEY` 通过 Vite `define` 注入到了浏览器端 bundle 中，并由浏览器请求 `/api/aliyun/...` 时带上 `Authorization: Bearer ...`。

这可以工作，但不适合公开生产环境长期使用，因为前端 bundle 中可能暴露 API Key。

更安全的生产方案：

1. 在 Vercel 增加 serverless function，例如 `/api/generate-image`。
2. 前端只把 prompt 和图片发给 `/api/generate-image`。
3. serverless function 从服务端环境变量读取 `DASHSCOPE_API_KEY`。
4. 服务端再调用 DashScope，并把结果返回前端。
5. 删除前端对 `process.env.DASHSCOPE_API_KEY` 的直接引用。

如果项目只用于短期展览或内部测试，当前方案可以先用，但必须限制 key 权限、设置预算，并在交付后轮换密钥。

## 8. 云端部署到 Vercel

### 8.1 从 GitHub 导入

1. 把代码推送到 GitHub 仓库。
2. 登录 Vercel。
3. 点击 `Add New Project`。
4. 选择 GitHub 仓库。
5. Framework Preset 选择 `Vite`。
6. Build Command：

```bash
npm run build
```

7. Output Directory：

```text
dist
```

8. Install Command 通常保持默认：

```bash
npm install
```

### 8.2 配置 Vercel 环境变量

在 Vercel 项目页面：

```text
Settings -> Environment Variables
```

添加：

```text
DASHSCOPE_API_KEY = 你的 DashScope API Key
```

建议环境都勾选：

- Production
- Preview
- Development

如果后续仍使用 Gemini，再添加：

```text
GEMINI_API_KEY = 你的 Gemini API Key
```

但当前主流程不需要 Gemini。

### 8.3 Vercel 代理配置

项目根目录已有：

```json
{
  "rewrites": [
    {
      "source": "/api/aliyun/:match*",
      "destination": "https://dashscope.aliyuncs.com/api/v1/:match*"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

作用：

- `/api/aliyun/...` 转发到 DashScope，避免浏览器 CORS 问题。
- `/(.*)` 回退到 `index.html`，支持前端单页应用。

### 8.4 部署验证

部署完成后打开 Vercel 域名，检查：

1. 页面能打开。
2. 摄像头权限能申请。
3. MediaPipe 能加载。
4. 录入 5 张脸后能进入分析页。
5. 最终 DashScope 能生成图片。

如果最终生成失败，先查看浏览器 Console 和 Network：

- 是否缺少 `DASHSCOPE_API_KEY`。
- `/api/aliyun/services/aigc/multimodal-generation/generation` 是否返回 401/403/429/5xx。
- DashScope 账号是否开通模型权限和额度。

## 9. 常见问题排查

### 9.1 摄像头打不开

可能原因：

- 浏览器没有授予权限。
- 页面不在 HTTPS 或 localhost 下。
- 摄像头被其他软件占用。
- Windows 隐私设置禁用了浏览器摄像头。

解决：

- 使用 `http://localhost:3000/` 本地测试。
- 云端必须使用 `https://`。
- 关闭占用摄像头的软件。
- 在浏览器地址栏左侧重新允许摄像头权限。

### 9.2 卡在 Loading MediaPipe Model

可能原因：

- 无法访问 MediaPipe wasm/model CDN。
- 网络屏蔽 Google Storage。
- 浏览器 WebGL/GPU delegate 异常。

解决：

- 换网络。
- 在 Console 查看具体 URL 报错。
- 必要时把模型文件自托管。

### 9.3 最终生成报 `DASHSCOPE_API_KEY is not configured`

说明 `.env.local` 或 Vercel 环境变量未配置。

本地：检查项目根目录是否有 `.env.local`，并重启 `npm run dev`。

Vercel：检查 Project Settings 里的 Environment Variables，然后重新部署。

### 9.4 DashScope 返回 401/403

可能原因：

- API Key 错误或过期。
- 账号未开通相关模型。
- Key 没有对应权限。

解决：

- 在阿里云控制台重新创建 Key。
- 确认 DashScope 服务和模型权限。
- 不要把 Key 写进源码。

### 9.5 DashScope 返回 429

可能原因：

- 调用频率超限。
- 额度不足。

解决：

- 降低测试频率。
- 检查阿里云用量和额度。

### 9.6 线上更新后看不到最新版本

可能原因：

- Vercel 部署还没完成。
- 浏览器缓存旧 bundle。
- 访问的不是 Production 域名。

解决：

- 查看 Vercel Deployments。
- 强制刷新浏览器缓存。
- 检查线上 HTML 加载的 `/assets/index-xxxxx.js` 是否为最新构建。

## 10. 协作者开发建议

### 10.1 修改五官顺序或点位

修改：

```text
utils/featureDefinitions.ts
```

这里定义：

- `key`：五官唯一标识。
- `label`：展示名。
- `shortLabel`：短标签。
- `metricKey`：用于均值比较的人脸指标。
- `landmarkIndices`：裁切使用的 MediaPipe 点位。
- `padding`：裁片边距。
- `contextPadding`：来源对比图边距。

### 10.2 修改选择逻辑

当前逻辑在：

```text
App.tsx
```

核心规则：

```text
选出 metric 与 5 人平均值差距最小的人脸来源。
```

如需改为最大值、最小值、随机、权重平均，需要改 `SystemPhase.ANALYSIS` 的 selection loop。

### 10.3 修改生成提示词

位置：

```text
App.tsx
```

搜索：

```text
COMMAND: Generate a SINGLE, CENTERED portrait face
```

可以调整融合风格、缝合痕迹、写实程度、是否保留肤色差异等。

### 10.4 修改视觉风格

主要位置：

- `index.html`：全局动画和 CSS。
- 各 `components/*.tsx`：Tailwind class。
- `constants.tsx`：标题、颜色、人数。

### 10.5 修改采集人数

位置：

```text
constants.tsx
```

修改：

```ts
export const REQUIRED_FACES = 5;
```

注意：如果改人数，分析文案、网格布局、prompt 里的 “5 source faces” 也要同步改。

## 11. 交接 zip 内容说明

本 zip 包已排除：

- `.git/`
- `node_modules/`
- `dist/`
- `.env.local`
- 真实 API Key
- 原始 `test-api.js` 中的硬编码测试密钥

本 zip 包包含：

- 项目源码
- `package.json` 和 `package-lock.json`
- `.env.example`
- `COLLABORATOR_HANDOFF.md`
- `test-api.example.js`

协作者收到后第一步：

```bash
npm install
cp .env.example .env.local
# 填入 DASHSCOPE_API_KEY
npm run dev
```

## 12. 建议交付给协作者的信息

除了 zip 包，还建议单独发送：

1. DashScope API Key，最好用单独渠道发送，不要放 zip。
2. Vercel 项目权限或邀请链接。
3. GitHub 仓库协作权限。
4. 当前线上域名：`https://face-detection-swart.vercel.app/`
5. 是否允许协作者更换成安全的 serverless API 方案。

## 13. 发布流程建议

普通开发：

```bash
git checkout -b feature/your-change
npm install
npm run dev
npm run build
git add .
git commit -m "描述改动"
git push origin feature/your-change
```

如果直接部署到当前 Vercel Production，通常需要合并到 `main` 分支，Vercel 会自动触发部署。

## 14. 密钥轮换提醒

如果任何 API Key 曾经出现在聊天、截图、源码、测试脚本或 zip 之外的地方，应立即在对应平台撤销并重新生成。

交接给协作者时，建议创建一个权限受限、额度可控的新 DashScope Key。
