
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
  const detectedFacesRef = useRef<FaceDetectionResult[]>([]);  // Ref for interval access
  const [faceCount, setFaceCount] = useState(0);
  const [autoCapture, setAutoCapture] = useState(false);  // Auto capture toggle

  // Initialize Camera
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
        console.error("Camera access denied:", err);
      }
    }
    setupCamera();
  }, []);

  // Initialize MediaPipe
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

  // Real-time face detection loop
  useEffect(() => {
    if (!isReady || !isMediaPipeReady || !videoRef.current) return;

    let lastTime = 0;
    const detectLoop = () => {
      if (!videoRef.current) return;

      const now = performance.now();
      if (now - lastTime > 100) {  // 10 FPS
        const results = detectFaces(videoRef.current, now);
        setDetectedFaces(results);
        detectedFacesRef.current = results;  // Sync ref for interval
        setFaceCount(results.length);
        lastTime = now;

        // Draw detection results to overlay canvas
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
  }, [isReady, isMediaPipeReady]);

  // Draw face detection overlay
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

      // Draw face mesh connections
      ctx.strokeStyle = '#00ffcc33';
      ctx.lineWidth = 1;

      // Draw face oval
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

        // Draw eyes
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

        // Draw lips
        ctx.strokeStyle = '#ff006666';
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

      // Draw bounding box
      ctx.strokeStyle = '#00ffcc';
      ctx.lineWidth = 2;
      ctx.strokeRect(
        boundingBox.x * canvas.width,
        boundingBox.y * canvas.height,
        boundingBox.width * canvas.width,
        boundingBox.height * canvas.height
      );

      // Draw key landmarks
      ctx.fillStyle = '#00ffcc';
      const keyPoints = [468, 473, 4, 61, 291];  // Left eye, right eye, nose tip, mouth corners
      keyPoints.forEach(pointIndex => {
        if (landmarks[pointIndex]) {
          const point = landmarks[pointIndex];
          ctx.beginPath();
          ctx.arc(point.x * canvas.width, point.y * canvas.height, 4, 0, 2 * Math.PI);
          ctx.fill();
        }
      });

      // Draw face label
      ctx.fillStyle = '#00ffcc';
      ctx.font = 'bold 14px JetBrains Mono';
      ctx.fillText(
        `FACE_${index + 1}`,
        boundingBox.x * canvas.width,
        boundingBox.y * canvas.height - 8
      );
    });
  }, []);

  useEffect(() => {
    const anim = setInterval(() => setScanPulse(p => (p + 1) % 100), 50);
    return () => clearInterval(anim);
  }, []);

  // Capture single face
  const captureSingleFace = useCallback((faceResult: FaceDetectionResult) => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { boundingBox, landmarks } = faceResult;

    // Check if this face is a duplicate of already captured faces
    const existingFacesWithLandmarks = faces.filter(f => f.rawLandmarks).map(f => ({ landmarks: f.rawLandmarks! }));
    if (isDuplicateFace(landmarks, existingFacesWithLandmarks, 0.5)) {
      console.log('⚠️ Duplicate face detected, skipping capture');
      return;
    }

    // Expand crop region for better face capture
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
      rawLandmarks: landmarks,  // Store for duplicate detection
      cropLandmarks,
      featureCrops,
      landmarks: safeMetrics,
    };

    console.log('📸 Face captured:', newFace.id, metrics);
    onCapture(newFace);
  }, [onCapture, faces]);

  // Auto capture (sequential mode)
  useEffect(() => {
    if (!autoCapture || !isReady || !isMediaPipeReady || faces.length >= REQUIRED_FACES || isGroupMode) return;

    const interval = setInterval(() => {
      const currentFaces = detectedFacesRef.current;  // Use ref for fresh data
      const remainingSlots = REQUIRED_FACES - faces.length;

      if (remainingSlots > 0 && currentFaces.length > 0) {
        console.log('🔄 Auto-capture attempt:', currentFaces.length, 'faces detected,', remainingSlots, 'slots remaining');
        setIsScanning(true);

        // Capture ALL detected faces (up to remaining slots)
        const facesToCapture = currentFaces.slice(0, remainingSlots);
        facesToCapture.forEach((face, index) => {
          // Small delay between captures to avoid race conditions
          setTimeout(() => captureSingleFace(face), index * 100);
        });

        setTimeout(() => setIsScanning(false), 500);
      }
    }, 2000);  // Every 2 seconds

    return () => clearInterval(interval);
  }, [autoCapture, isReady, isMediaPipeReady, faces.length, isGroupMode, captureSingleFace]);

  // Group scan (capture multiple at once)
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

  return (
    <div className="flex-1 flex gap-4 py-4 h-full overflow-hidden">
      {/* LEFT SIDEBAR */}
      <div className="w-24 md:w-32 flex flex-col gap-2 overflow-y-auto pr-2 border-r border-[#00ffcc]/20">
        <div className="text-[10px] font-bold opacity-50 mb-2 uppercase tracking-tighter">Samples_Buffer</div>
        {Array.from({ length: REQUIRED_FACES }).map((_, i) => {
          const face = faces[i];
          return (
            <div
              key={i}
              className={`aspect-square border relative transition-all duration-500 overflow-hidden ${face ? 'border-[#00ffcc]' : 'border-dashed border-[#00ffcc]/30 bg-[#1a2e2a]/10'
                }`}
            >
              {face ? (
                <img src={face.imageData} className="w-full h-full object-cover grayscale brightness-75" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`w-4 h-4 border border-[#00ffcc]/20 rounded-full ${i === faces.length ? 'animate-ping bg-[#00ffcc]/10' : ''}`}></div>
                  <span className="text-[8px] opacity-20 mt-1 uppercase">Null</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MAIN VIEWFINDER */}
      <div className="flex-1 relative border-2 border-[#00ffcc]/50 bg-black overflow-hidden group">
        {!isReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black z-20">
            <p className="animate-pulse font-mono uppercase">Initializing_Optical_Array...</p>
          </div>
        )}

        {isReady && !isMediaPipeReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
            <p className="animate-pulse font-mono uppercase text-yellow-400">Loading_MediaPipe_Model...</p>
          </div>
        )}

        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="w-full h-full object-cover opacity-60"
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* MediaPipe Detection Overlay */}
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        />

        {/* HUD Elements */}
        <div className="absolute inset-0 pointer-events-none z-10">
          {/* Main Scanning Reticle */}
          <div
            className={`absolute border-2 border-[#00ffcc] transition-all duration-700 ease-in-out ${isScanning ? 'opacity-100 scale-100' : 'opacity-20 scale-95'
              }`}
            style={{
              top: isScanning ? (isGroupMode ? '15%' : '20%') : '25%',
              left: isScanning ? (isGroupMode ? '10%' : '25%') : '30%',
              width: isScanning ? (isGroupMode ? '80%' : '50%') : '40%',
              height: isScanning ? (isGroupMode ? '70%' : '60%') : '50%',
            }}
          >
            <div className="absolute -top-1 -left-1 w-4 h-4 border-l-2 border-t-2 border-[#ff0066]"></div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 border-r-2 border-b-2 border-[#ff0066]"></div>

            <div className="absolute -top-6 left-0 flex items-center gap-2">
              <span className="bg-[#00ffcc] text-black text-[9px] px-1 font-bold uppercase">
                {isDetecting ? 'MEDIAPIPE_PROCESSING' : (isGroupMode ? 'ENSEMBLE_LOCK' : 'TRACKING')}
              </span>
            </div>

            {/* Dynamic Multiple Reticles for Group Mode */}
            {isGroupMode && !isDetecting && (
              <>
                <div className="absolute top-1/4 left-1/4 w-10 h-10 border border-[#00ffcc]/40 animate-pulse"></div>
                <div className="absolute top-1/4 right-1/4 w-10 h-10 border border-[#00ffcc]/40 animate-pulse"></div>
                <div className="absolute bottom-1/4 left-1/4 w-10 h-10 border border-[#00ffcc]/40 animate-pulse"></div>
                <div className="absolute bottom-1/4 right-1/4 w-10 h-10 border border-[#00ffcc]/40 animate-pulse"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 border border-[#00ffcc]/40 animate-pulse"></div>
              </>
            )}
          </div>

          <div className="absolute left-0 w-full h-px bg-[#00ffcc]/40 shadow-[0_0_10px_#00ffcc]" style={{ top: `${scanPulse}%` }}></div>
        </div>

        {/* Interaction Bar */}
        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end z-20">
          <div className="flex gap-2">
            <button
              onClick={() => setAutoCapture(!autoCapture)}
              className={`px-4 py-2 text-[10px] font-bold border transition-all uppercase ${autoCapture ? 'bg-green-500 border-green-500 text-white' : 'bg-black/60 border-[#00ffcc]/30 text-[#00ffcc]'}`}
            >
              {autoCapture ? 'AUTO: ON' : 'AUTO: OFF'}
            </button>
            <button
              onClick={() => setIsGroupMode(!isGroupMode)}
              className={`px-4 py-2 text-[10px] font-bold border transition-all uppercase ${isGroupMode ? 'bg-[#ff0066] border-[#ff0066] text-white' : 'bg-black/60 border-[#00ffcc]/30 text-[#00ffcc]'}`}
            >
              {isGroupMode ? 'MODE: ENSEMBLE' : 'MODE: SEQUENTIAL'}
            </button>
            {isGroupMode && (
              <button
                onClick={triggerGroupScan}
                disabled={isDetecting || detectedFaces.length === 0}
                className="px-6 py-2 text-[10px] font-bold bg-[#00ffcc] text-black animate-pulse hover:bg-white transition-all uppercase disabled:opacity-50 disabled:animate-none"
              >
                {isDetecting ? 'ANALYZING...' : `CAPTURE ${Math.min(detectedFaces.length, REQUIRED_FACES - faces.length)} FACES`}
              </button>
            )}
          </div>

          <div className="text-right">
            <div className="text-[9px] opacity-50 font-mono uppercase tracking-widest">
              DETECTED: {faceCount} / REQUIRED: {REQUIRED_FACES}
            </div>
            <div className="text-3xl font-black text-[#00ffcc] italic tracking-tighter uppercase">
              {isDetecting ? 'HARVESTING' : (faces.length === 5 ? 'BUFFER_FULL' : `BUF_0${faces.length + 1}`)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraView;
