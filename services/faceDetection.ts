import {
  FaceLandmarker,
  FilesetResolver,
  DrawingUtils
} from '@mediapipe/tasks-vision';

let faceLandmarker: FaceLandmarker | null = null;
let isInitializing = false;

// MediaPipe model CDN paths
const WASM_PATH = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm';
const MODEL_PATH = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task';

export interface FaceDetectionResult {
  id: string;
  landmarks: NormalizedLandmark[];
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

/**
 * Initialize MediaPipe FaceLandmarker
 */
export async function initializeFaceLandmarker(): Promise<FaceLandmarker> {
  if (faceLandmarker) return faceLandmarker;
  if (isInitializing) {
    // Wait for initialization to complete
    while (isInitializing) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    return faceLandmarker!;
  }

  isInitializing = true;

  try {
    const vision = await FilesetResolver.forVisionTasks(WASM_PATH);

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_PATH,
        delegate: 'GPU'  // Use GPU acceleration
      },
      runningMode: 'VIDEO',
      numFaces: 10,  // Increase max faces for better group detection
      minFaceDetectionConfidence: 0.1,  // Minimum for max range
      minFacePresenceConfidence: 0.1,
      minTrackingConfidence: 0.1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false
    });

    console.log('✅ MediaPipe FaceLandmarker initialized successfully');
    return faceLandmarker;
  } catch (error) {
    console.error('❌ MediaPipe initialization failed:', error);
    throw error;
  } finally {
    isInitializing = false;
  }
}

/**
 * Detect faces in video frame
 */
export function detectFaces(video: HTMLVideoElement, timestamp: number): FaceDetectionResult[] {
  if (!faceLandmarker) {
    console.warn('FaceLandmarker not initialized');
    return [];
  }

  const result = faceLandmarker.detectForVideo(video, timestamp);

  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    return [];
  }

  return result.faceLandmarks.map((landmarks, index) => {
    // Calculate bounding box from all landmark points
    let minX = 1, maxX = 0, minY = 1, maxY = 0;
    landmarks.forEach(point => {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    });

    return {
      id: `face-${index}`,
      landmarks: landmarks as NormalizedLandmark[],
      boundingBox: {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
      }
    };
  });
}

/**
 * Extract key facial metrics from 478 landmark points
 * MediaPipe FaceLandmarker key point indices:
 * - Left eye center: 468
 * - Right eye center: 473
 * - Nose tip: 4
 * - Upper lip midpoint: 13
 * - Lower lip midpoint: 14
 * - Left mouth corner: 61
 * - Right mouth corner: 291
 */
export function extractFaceMetrics(landmarks: NormalizedLandmark[]) {
  if (landmarks.length < 478) {
    console.warn('Insufficient landmark count');
    return null;
  }

  // Eye-related points
  const leftEyeCenter = landmarks[468];
  const rightEyeCenter = landmarks[473];
  const leftEyeOuter = landmarks[33];
  const leftEyeInner = landmarks[133];
  const rightEyeOuter = landmarks[263];
  const rightEyeInner = landmarks[362];

  // Eyebrow points
  const leftBrowUpper = landmarks[70];   // Left eyebrow top
  const leftBrowLower = landmarks[107];  // Left eyebrow bottom
  const rightBrowUpper = landmarks[300]; // Right eyebrow top
  const rightBrowLower = landmarks[336]; // Right eyebrow bottom

  // Nose-related points
  const noseTip = landmarks[4];
  const noseLeft = landmarks[129];
  const noseRight = landmarks[358];

  // Mouth-related points
  const mouthLeft = landmarks[61];
  const mouthRight = landmarks[291];

  // Face shape points
  const forehead = landmarks[10];   // Top of forehead
  const chin = landmarks[152];      // Bottom of chin
  const leftCheek = landmarks[234]; // Left side of face
  const rightCheek = landmarks[454];// Right side of face

  // Jawline points
  const jawLeft = landmarks[172];   // Left jaw corner
  const jawRight = landmarks[397];  // Right jaw corner

  // Calculate eye width
  const leftEyeWidth = Math.sqrt(
    Math.pow(leftEyeOuter.x - leftEyeInner.x, 2) +
    Math.pow(leftEyeOuter.y - leftEyeInner.y, 2)
  );
  const rightEyeWidth = Math.sqrt(
    Math.pow(rightEyeOuter.x - rightEyeInner.x, 2) +
    Math.pow(rightEyeOuter.y - rightEyeInner.y, 2)
  );

  // Calculate eyebrow arch height
  const leftBrowHeight = Math.abs(leftBrowUpper.y - leftBrowLower.y);
  const rightBrowHeight = Math.abs(rightBrowUpper.y - rightBrowLower.y);

  // Calculate eye distance
  const eyeDistance = Math.sqrt(
    Math.pow(leftEyeCenter.x - rightEyeCenter.x, 2) +
    Math.pow(leftEyeCenter.y - rightEyeCenter.y, 2)
  );

  // Calculate nose width
  const noseWidth = Math.sqrt(
    Math.pow(noseLeft.x - noseRight.x, 2) +
    Math.pow(noseLeft.y - noseRight.y, 2)
  );

  // Calculate mouth width
  const mouthWidth = Math.sqrt(
    Math.pow(mouthLeft.x - mouthRight.x, 2) +
    Math.pow(mouthLeft.y - mouthRight.y, 2)
  );

  // Calculate face shape (width/height ratio)
  const faceHeight = Math.abs(forehead.y - chin.y);
  const faceWidth = Math.abs(leftCheek.x - rightCheek.x);
  const faceShapeRatio = faceWidth / faceHeight;

  // Calculate jawline angle (approximation using jaw corners and chin)
  const jawWidth = Math.sqrt(
    Math.pow(jawLeft.x - jawRight.x, 2) +
    Math.pow(jawLeft.y - jawRight.y, 2)
  );

  // Ear estimation (using side face landmarks)
  const leftEarHeight = Math.abs(landmarks[234].y - landmarks[93].y);
  const rightEarHeight = Math.abs(landmarks[454].y - landmarks[323].y);

  // Calculate facial symmetry (simplified: compare left/right eye size)
  const symmetry = 1 - Math.abs(leftEyeWidth - rightEyeWidth) / Math.max(leftEyeWidth, rightEyeWidth);

  return {
    leftEye: leftEyeWidth * 1000,  // Scale up for display
    rightEye: rightEyeWidth * 1000,
    leftBrow: leftBrowHeight * 1000,
    rightBrow: rightBrowHeight * 1000,
    noseWidth: noseWidth * 1000,
    mouthWidth: mouthWidth * 1000,
    leftEar: leftEarHeight * 1000,
    rightEar: rightEarHeight * 1000,
    faceShape: faceShapeRatio * 100,
    jawline: jawWidth * 1000,
    faceSymmetry: symmetry * 100,  // Percentage
    eyeDistance: eyeDistance * 1000,
  };
}

/**
 * Get FaceLandmarker instance (for drawing)
 */
export function getFaceLandmarker(): FaceLandmarker | null {
  return faceLandmarker;
}

/**
 * Calculate similarity between two faces based on landmark geometry
 * Returns a value between 0 (different) and 1 (identical)
 */
export function calculateFaceSimilarity(
  landmarks1: NormalizedLandmark[],
  landmarks2: NormalizedLandmark[]
): number {
  if (landmarks1.length < 478 || landmarks2.length < 478) {
    return 0;
  }

  // Key facial feature indices for comparison
  const keyIndices = [
    4,    // Nose tip
    468,  // Left eye center
    473,  // Right eye center
    61,   // Left mouth corner
    291,  // Right mouth corner
    33,   // Left eye outer
    263,  // Right eye outer
    129,  // Left nose
    358,  // Right nose
    10,   // Forehead center
    152,  // Chin
  ];

  // Calculate relative distances (scale-invariant)
  const getRelativeDistances = (landmarks: NormalizedLandmark[]) => {
    const eyeDistance = Math.sqrt(
      Math.pow(landmarks[468].x - landmarks[473].x, 2) +
      Math.pow(landmarks[468].y - landmarks[473].y, 2)
    );

    return keyIndices.map(idx => ({
      x: (landmarks[idx].x - landmarks[4].x) / eyeDistance,  // Normalize by eye distance
      y: (landmarks[idx].y - landmarks[4].y) / eyeDistance,
      z: landmarks[idx].z / eyeDistance
    }));
  };

  const rel1 = getRelativeDistances(landmarks1);
  const rel2 = getRelativeDistances(landmarks2);

  // Calculate mean squared error
  let totalError = 0;
  for (let i = 0; i < keyIndices.length; i++) {
    totalError += Math.pow(rel1[i].x - rel2[i].x, 2);
    totalError += Math.pow(rel1[i].y - rel2[i].y, 2);
    totalError += Math.pow(rel1[i].z - rel2[i].z, 2);
  }

  const avgError = totalError / (keyIndices.length * 3);

  // Convert to similarity score (lower error = higher similarity)
  // Threshold tuned so that same person gets > 0.8, different person < 0.6
  const similarity = Math.exp(-avgError * 50);

  return similarity;
}

/**
 * Check if a face is a duplicate of any already captured face
 */
export function isDuplicateFace(
  newLandmarks: NormalizedLandmark[],
  existingFaces: { landmarks: NormalizedLandmark[] }[],
  threshold: number = 0.7
): boolean {
  for (const face of existingFaces) {
    const similarity = calculateFaceSimilarity(newLandmarks, face.landmarks);
    if (similarity > threshold) {
      console.log(`Face duplicate detected (similarity: ${similarity.toFixed(2)})`);
      return true;
    }
  }
  return false;
}

/**
 * Cleanup resources
 */
export function disposeFaceLandmarker(): void {
  if (faceLandmarker) {
    faceLandmarker.close();
    faceLandmarker = null;
  }
}
