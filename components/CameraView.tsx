import React, { useRef, useEffect, useState, useCallback } from 'react';
import { CapturedFace } from '../types';
import { REQUIRED_FACES } from '../constants';
import {
  initializeFaceLandmarker,
  detectFaces,
  extractFaceMetrics,
  isDuplicateFace,
  FaceDetectionResult
} from '../services/faceDetection';
import { FACE_CONNECTIONS } from '../utils/faceMetrics';
import { createFeatureCropsFromCanvas } from '../utils/imageUtils';

interface CameraViewProps {
  onCapture: (captured: CapturedFace | CapturedFace[]) => void;
  faces: CapturedFace[];
}

function formatLocalTimestamp(date: Date): string {
  const pad = (n: number, len = 2) => String(n).padStart(len, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.` +
    `${pad(date.getMilliseconds(), 3)}`
  );
}

const CameraView: React.FC<CameraViewProps> = ({ onCapture, faces }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const [isReady, setIsReady] = useState(false);
  const [isMediaPipeReady, setIsMediaPipeReady] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [scanPulse, setScanPulse] = useState(0);
  const [detectedFaces, setDetectedFaces] = useState<FaceDetectionResult[]>([]);
  const detectedFacesRef = useRef<FaceDetectionResult[]>([]);
  const [faceCount, setFaceCount] = useState(0);
  const [autoCapture, setAutoCapture] = useState(false);
  const [localTime, setLocalTime] = useState(() => formatLocalTimestamp(new Date()));

  useEffect(() => {
    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: 1280, height: 720 }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadeddata = () => {
            setIsReady(true);
          };
        }
      } catch (err) {
        console.error('Camera access denied:', err);
      }
    }
    setupCamera();
  }, []);

  useEffect(() => {
    async function initMediaPipe() {
      try {
        await initializeFaceLandmarker();
        setIsMediaPipeReady(true);
        console.log('✅ MediaPipe ready');
      } catch (err) {
        console.error('MediaPipe initialization failed:', err);
      }
    }
    initMediaPipe();
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setLocalTime(formatLocalTimestamp(new Date()));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const drawFaceOverlay = useCallback((faces: FaceDetectionResult[]) => {
    if (!overlayCanvasRef.current || !videoRef.current) return;

    const canvas = overlayCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    faces.forEach((face, index) => {
      const { boundingBox, landmarks } = face;

      ctx.strokeStyle = '#8B084155';
      ctx.lineWidth = 1;

      if (landmarks.length >= 478) {
        ctx.beginPath();
        FACE_CONNECTIONS.faceOval.forEach((idx, i) => {
          if (landmarks[idx]) {
            const x = landmarks[idx].x * canvas.width;
            const y = landmarks[idx].y * canvas.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.closePath();
        ctx.stroke();

        [FACE_CONNECTIONS.leftEye, FACE_CONNECTIONS.rightEye].forEach(eyePoints => {
          ctx.beginPath();
          eyePoints.forEach((idx, i) => {
            if (landmarks[idx]) {
              const x = landmarks[idx].x * canvas.width;
              const y = landmarks[idx].y * canvas.height;
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            }
          });
          ctx.stroke();
        });

        ctx.strokeStyle = '#8B084188';
        ctx.beginPath();
        FACE_CONNECTIONS.outerLips.forEach((idx, i) => {
          if (landmarks[idx]) {
            const x = landmarks[idx].x * canvas.width;
            const y = landmarks[idx].y * canvas.height;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      }

      ctx.strokeStyle = '#8B0841';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        boundingBox.x * canvas.width,
        boundingBox.y * canvas.height,
        boundingBox.width * canvas.width,
        boundingBox.height * canvas.height
      );

      ctx.fillStyle = '#8B0841';
      const keyPoints = [468, 473, 4, 61, 291];
      keyPoints.forEach(pointIndex => {
        if (landmarks[pointIndex]) {
          const point = landmarks[pointIndex];
          ctx.beginPath();
          ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      ctx.fillStyle = '#8B0841';
      ctx.font = 'bold 14px JetBrains Mono';
      ctx.fillText(
        `FACE_${index + 1}`,
        boundingBox.x * canvas.width,
        boundingBox.y * canvas.height - 8
      );
    });
  }, []);

  useEffect(() => {
    if (!isReady || !isMediaPipeReady || !videoRef.current) return;

    let lastTime = 0;
    const detectLoop = () => {
      if (!videoRef.current) return;

      const now = performance.now();
      if (now - lastTime > 100) {
        const results = detectFaces(videoRef.current, now);
        setDetectedFaces(results);
        detectedFacesRef.current = results;
        setFaceCount(results.length);
        lastTime = now;
        drawFaceOverlay(results);
      }

      animationRef.current = requestAnimationFrame(detectLoop);
    };

    detectLoop();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isReady, isMediaPipeReady, drawFaceOverlay]);

  useEffect(() => {
    const anim = setInterval(() => setScanPulse(p => (p + 1) % 100), 50);
    return () => clearInterval(anim);
  }, []);

  const captureSingleFace = useCallback((faceResult: FaceDetectionResult) => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { boundingBox, landmarks } = faceResult;

    const existingFacesWithLandmarks = faces.filter(f => f.rawLandmarks).map(f => ({ landmarks: f.rawLandmarks! }));
    if (isDuplicateFace(landmarks, existingFacesWithLandmarks, 0.5)) {
      console.log('⚠️ Duplicate face detected, skipping capture');
      return;
    }

    const padding = 0.1;
    const cropX = Math.max(0, (boundingBox.x - padding) * video.videoWidth);
    const cropY = Math.max(0, (boundingBox.y - padding) * video.videoHeight);
    const cropW = Math.min(video.videoWidth - cropX, (boundingBox.width + padding * 2) * video.videoWidth);
    const cropH = Math.min(video.videoHeight - cropY, (boundingBox.height + padding * 2) * video.videoHeight);

    canvas.width = 400;
    canvas.height = 400;
    ctx.drawImage(video, cropX, cropY, cropW, cropH, 0, 0, 400, 400);

    const imageData = canvas.toDataURL('image/jpeg', 0.8);
    const metrics = extractFaceMetrics(landmarks);
    const safeMetrics = metrics || {
      leftEye: 50,
      rightEye: 50,
      leftBrow: 30,
      rightBrow: 30,
      noseWidth: 50,
      mouthWidth: 60,
      leftEar: 40,
      rightEar: 40,
      faceShape: 75,
      jawline: 120,
      faceSymmetry: 85,
      eyeDistance: 55,
    };
    const faceId = `face-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const cropLandmarks = landmarks.map(point => ({
      x: ((point.x * video.videoWidth) - cropX) / cropW,
      y: ((point.y * video.videoHeight) - cropY) / cropH,
      z: point.z,
    }));
    const featureCrops = createFeatureCropsFromCanvas(canvas, cropLandmarks, safeMetrics, faceId);

    const newFace: CapturedFace = {
      id: faceId,
      imageData,
      timestamp: Date.now(),
      rawLandmarks: landmarks,
      cropLandmarks,
      featureCrops,
      landmarks: safeMetrics,
    };

    console.log('📸 Face captured:', newFace.id, metrics);
    onCapture(newFace);
  }, [onCapture, faces]);

  useEffect(() => {
    if (!autoCapture || !isReady || !isMediaPipeReady || faces.length >= REQUIRED_FACES || isGroupMode) return;

    const interval = setInterval(() => {
      const currentFaces = detectedFacesRef.current;
      const remainingSlots = REQUIRED_FACES - faces.length;

      if (remainingSlots > 0 && currentFaces.length > 0) {
        console.log('🔄 Auto-capture attempt:', currentFaces.length, 'faces detected,', remainingSlots, 'slots remaining');
        setIsScanning(true);

        const facesToCapture = currentFaces.slice(0, remainingSlots);
        facesToCapture.forEach((face, index) => {
          setTimeout(() => captureSingleFace(face), index * 100);
        });

        setTimeout(() => setIsScanning(false), 500);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [autoCapture, isReady, isMediaPipeReady, faces.length, isGroupMode, captureSingleFace]);

  const triggerGroupScan = useCallback(() => {
    if (isDetecting || detectedFaces.length === 0) return;

    setIsDetecting(true);
    setIsScanning(true);

    setTimeout(() => {
      const facesToCapture = detectedFaces.slice(0, REQUIRED_FACES - faces.length);
      facesToCapture.forEach(face => captureSingleFace(face));

      setIsDetecting(false);
      setIsScanning(false);
    }, 1000);
  }, [isDetecting, detectedFaces, faces.length, captureSingleFace]);

  /** Manual single-shot capture for sequential entry. */
  const triggerManualCapture = useCallback(() => {
    if (
      isDetecting ||
      !isReady ||
      !isMediaPipeReady ||
      faces.length >= REQUIRED_FACES ||
      detectedFaces.length === 0
    ) {
      return;
    }

    setIsDetecting(true);
    setIsScanning(true);

    setTimeout(() => {
      captureSingleFace(detectedFaces[0]);
      setIsDetecting(false);
      setIsScanning(false);
    }, 350);
  }, [
    isDetecting,
    isReady,
    isMediaPipeReady,
    faces.length,
    detectedFaces,
    captureSingleFace,
  ]);

  return (
    <div className="flex-1 w-full h-full flex items-center justify-center bg-black">
      <div
        className="relative shrink-0"
        style={{
          width: 'min(100vw, calc(100vh * 2000 / 1125))',
          height: 'min(100vh, calc(100vw * 1125 / 2000))',
        }}
      >
        <img
          src="/recording.png?v=rec2"
          alt="Recording frame"
          className="absolute inset-0 w-full h-full object-fill select-none pointer-events-none"
          draggable={false}
        />

        {/* Top-right live feed */}
        <div className="absolute right-[7%] top-[5.2%] z-30 w-[18%] text-right pointer-events-none">
          <div className="text-[clamp(6px,0.85vw,10px)] font-bold tracking-widest text-[#04A99A]">
            LIVE_FEED
          </div>
          <div className="text-[clamp(5px,0.7vw,8px)] font-mono uppercase text-[#04A99A] opacity-90">
            {localTime}
          </div>
        </div>

        {/* Left sample column — sits in the narrow left strip */}
        <div
          className="absolute z-30 flex flex-col"
          style={{
            left: '5.8%',
            top: '15%',
            width: '10%',
            height: '64%',
          }}
        >
          <div className="shrink-0 pb-[4%] text-[clamp(5px,0.72vw,9px)] font-bold tracking-tighter text-[#8B0841] uppercase">
            Samples_Buffer
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-between gap-[3%]">
            {Array.from({ length: REQUIRED_FACES }).map((_, i) => {
              const face = faces[i];
              return (
                <div
                  key={face?.id ?? `slot-${i}`}
                  className="relative min-h-0 flex-1 overflow-hidden border border-[#8B0841] bg-black/70"
                >
                  {face ? (
                    <img
                      src={face.imageData}
                      alt={`Sample ${i + 1}`}
                      className="absolute inset-0 h-full w-full object-cover object-center"
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-[6%]">
                      <div className="h-[28%] aspect-square rounded-full border border-[#8B0841]/80" />
                      <span className="text-[clamp(5px,0.65vw,8px)] uppercase tracking-wide text-[#8B0841]/90">
                        Null
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/*
          Main camera viewport — clipped strictly inside the magenta rectangle
          of recording-2 (inset from decorative outer frame).
        */}
        <div
          className="absolute z-10 overflow-hidden"
          style={{
            left: '17.4%',
            top: '14.2%',
            width: '75.2%',
            height: '66.8%',
          }}
        >
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className={`absolute inset-0 h-full w-full object-cover ${
              isReady ? 'opacity-80' : 'opacity-0'
            }`}
          />
          <canvas ref={canvasRef} className="hidden" />
          <canvas
            ref={overlayCanvasRef}
            className="absolute inset-0 h-full w-full object-cover pointer-events-none"
          />

          {isReady && !isMediaPipeReady && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60">
              <p className="animate-pulse font-mono uppercase text-[clamp(10px,1.2vw,14px)] text-[#8B0841]">
                Loading_MediaPipe_Model...
              </p>
            </div>
          )}

          {!isReady && (
            <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none">
              <p className="animate-pulse font-mono uppercase text-[clamp(10px,1.4vw,16px)] text-[#8B0841]">
                Initializing_Optical_Array...
              </p>
            </div>
          )}

          <div className="absolute inset-0 z-10 pointer-events-none">
            <div
              className={`absolute border border-[#8B0841]/80 transition-all duration-700 ease-in-out ${
                isScanning ? 'opacity-100 scale-100' : 'opacity-25 scale-95'
              }`}
              style={{
                top: isScanning ? (isGroupMode ? '12%' : '18%') : '22%',
                left: isScanning ? (isGroupMode ? '8%' : '22%') : '28%',
                width: isScanning ? (isGroupMode ? '84%' : '56%') : '44%',
                height: isScanning ? (isGroupMode ? '72%' : '58%') : '48%',
              }}
            >
              <div className="absolute -top-1 -left-1 h-3 w-3 border-l-2 border-t-2 border-[#8B0841]" />
              <div className="absolute -bottom-1 -right-1 h-3 w-3 border-r-2 border-b-2 border-[#8B0841]" />
              <div className="absolute -top-5 left-0">
                <span className="bg-[#8B0841] px-1 text-[clamp(6px,0.7vw,9px)] font-bold uppercase text-white">
                  {isDetecting ? 'MEDIAPIPE_PROCESSING' : (isGroupMode ? 'ENSEMBLE_LOCK' : 'TRACKING')}
                </span>
              </div>
            </div>
            <div
              className="absolute left-0 h-px w-full bg-[#8B0841]/40"
              style={{ top: `${scanPulse}%` }}
            />
          </div>

          {/* Bottom controls inside camera rectangle */}
          <div className="absolute bottom-[2.5%] left-[1.2%] right-[1.2%] z-30 flex items-end justify-between gap-2">
            <div className="flex flex-wrap items-center gap-[0.6vw]">
              <button
                type="button"
                onClick={() => setAutoCapture(!autoCapture)}
                className={`min-w-[5.5vw] border border-[#8B0841] px-[0.9vw] py-[0.45vw] text-[clamp(7px,0.9vw,11px)] font-bold uppercase outline-none ${
                  autoCapture
                    ? 'bg-[#8B0841] text-white'
                    : 'bg-black/50 text-[#8B0841]'
                }`}
              >
                {autoCapture ? 'AUTO: ON' : 'AUTO: OFF'}
              </button>
              <button
                type="button"
                onClick={() => setIsGroupMode(!isGroupMode)}
                className={`min-w-[8vw] border border-[#8B0841] px-[0.9vw] py-[0.45vw] text-[clamp(7px,0.9vw,11px)] font-bold uppercase outline-none ${
                  isGroupMode
                    ? 'bg-[#8B0841] text-white'
                    : 'bg-black/50 text-[#8B0841]'
                }`}
              >
                {isGroupMode ? 'MODE: ENSEMBLE' : 'MODE: SEQUENTIAL'}
              </button>
              <button
                type="button"
                onClick={triggerManualCapture}
                disabled={
                  isDetecting ||
                  !isReady ||
                  !isMediaPipeReady ||
                  faces.length >= REQUIRED_FACES ||
                  detectedFaces.length === 0
                }
                className="min-w-[5.5vw] border border-[#8B0841] bg-[#8B0841] px-[0.9vw] py-[0.45vw] text-[clamp(7px,0.9vw,11px)] font-bold uppercase text-white outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isDetecting && !isGroupMode ? 'CAPTURING…' : 'CAPTURE'}
              </button>
              {isGroupMode && (
                <button
                  type="button"
                  onClick={triggerGroupScan}
                  disabled={isDetecting || detectedFaces.length === 0 || faces.length >= REQUIRED_FACES}
                  className="border border-[#8B0841] bg-[#8B0841] px-[1vw] py-[0.45vw] text-[clamp(7px,0.9vw,11px)] font-bold uppercase text-white outline-none disabled:opacity-50"
                >
                  {isDetecting
                    ? 'ANALYZING...'
                    : `CAPTURE ${Math.min(detectedFaces.length, REQUIRED_FACES - faces.length)} FACES`}
                </button>
              )}
            </div>

            <div className="text-right">
              <div className="font-mono text-[clamp(6px,0.8vw,10px)] uppercase tracking-widest text-[#8B0841]">
                DETECTED: {faceCount} / REQUIRED: {REQUIRED_FACES}
              </div>
              <div className="text-[clamp(16px,2.4vw,30px)] font-black italic uppercase leading-none tracking-tighter text-[#8B0841]">
                {isDetecting ? 'HARVESTING' : (faces.length >= REQUIRED_FACES ? 'BUFFER_FULL' : `BUF_0${faces.length + 1}`)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer status — right side */}
        <div className="absolute right-[7%] bottom-[6.2%] z-30 text-right pointer-events-none">
          <div className="font-mono text-[clamp(5px,0.72vw,8px)] leading-tight text-[#D19800]">
            STORAGE: {(faces.length * 2.4).toFixed(1)}MB / 12.0MB
            <br />
            STATUS: CAPTURE
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraView;
