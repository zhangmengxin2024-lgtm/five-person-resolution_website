# Face Detection Project Development Plan

## Project Overview
**"A Thing Like You and Me" (Five-Person Resolution)** - Exposing the "mean" logic of AI beautification through facial analysis.

## Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Face Detection**: MediaPipe FaceLandmarker (local)
- **Image Generation**: Alibaba Cloud DashScope API (Wanx)
- **Database**: Alibaba Cloud AnalyticDB for PostgreSQL (Supabase-compatible)
- **Deployment**: Vercel

## Environment Variables
`.env.local`:
```bash
DASHSCOPE_API_KEY=sk-xxx  # Alibaba Cloud DashScope API Key
```

---

## Development Iterations

### ✅ Completed
- [x] Base UI framework (cyberpunk style)
- [x] Camera integration
- [x] Gemini face detection/image generation (demo)

### ✅ Iteration 1: MediaPipe Integration [COMPLETE]
> Replace Gemini with local MediaPipe face detection

- [x] Install `@mediapipe/tasks-vision`
- [x] Create `services/faceDetection.ts`
- [x] Modify `CameraView.tsx`
- [x] Verify real landmark data extraction

### 🔄 Iteration 2: Real-time Data Visualization [COMPLETE]
> Overlay mesh and point cloud effects

- [x] Create `components/FaceOverlay.tsx` (integrated into CameraView)
- [x] Create `utils/faceMetrics.ts`
- [x] Display symmetry, eye size metrics
- [x] Add auto-capture toggle

### ✨ Iteration 3: Feature Selection Animation
> Complete animation flow for organ selection

- [ ] Flash → Calculate → Select → Dim
- [ ] Extend organ list (eyebrows, ears)

### 🗑️ Iteration 4: Trash Pool
> Display rejected organs

- [ ] Create `components/TrashPool.tsx`
- [ ] Fly-in animation for rejected organs

### 🎨 Iteration 5: Synthesis Optimization
> Preserve seams, emphasize "mean" effect

- [ ] Adjust prompt for visible seams
- [ ] Label organ sources

---

## File Structure
```
like-you-and-me/
├── App.tsx                    # Main app
├── components/
│   ├── CameraView.tsx         # Camera view
│   ├── AnalysisDisplay.tsx    # Analysis display
│   ├── AssemblyResult.tsx     # Result display
│   ├── Header.tsx             # Header
│   ├── FaceOverlay.tsx        # [TODO] Face mesh
│   └── TrashPool.tsx          # [TODO] Trash pool
├── services/
│   ├── faceDetection.ts       # MediaPipe service
│   └── imageGeneration.ts     # [TODO] DashScope API
├── utils/
│   └── faceMetrics.ts         # [TODO] Face metrics
├── types.ts                   # Type definitions
└── constants.tsx              # Constants
```
