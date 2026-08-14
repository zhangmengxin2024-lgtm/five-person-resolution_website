
export enum SystemPhase {
  INTRODUCTION = 'INTRODUCTION',
  CAPTURE = 'CAPTURE',
  ANALYSIS = 'ANALYSIS',
  ASSEMBLY = 'ASSEMBLY',
  RESOLUTION = 'RESOLUTION'
}

export interface FaceLandmarks {
  leftEye: number; // Size coefficient
  rightEye: number;
  leftBrow: number;  // Eyebrow arch height
  rightBrow: number;
  noseWidth: number;
  mouthWidth: number;
  leftEar: number;   // Ear height ratio
  rightEar: number;
  faceShape: number; // Width/height ratio
  jawline: number;   // Jawline angle
  faceSymmetry: number;
  eyeDistance: number;
}

export type FaceMetricKey = keyof FaceLandmarks;

export type FacialFeatureKey =
  | 'leftBrow'
  | 'rightBrow'
  | 'leftEye'
  | 'rightEye'
  | 'nose'
  | 'mouth'
  | 'leftEar'
  | 'rightEar'
  | 'faceShape';

export interface CropBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FeatureCrop {
  featureKey: FacialFeatureKey;
  label: string;
  shortLabel: string;
  imageData: string;
  contextImageData: string;
  sourceFaceId: string;
  metricKey: FaceMetricKey;
  metricValue: number;
  cropBox: CropBox;
  contextBox: CropBox;
}

export interface CapturedFace {
  id: string;
  imageData: string;
  landmarks: FaceLandmarks;
  rawLandmarks?: { x: number; y: number; z: number }[];  // For duplicate detection
  cropLandmarks?: { x: number; y: number; z: number }[];
  featureCrops: Record<FacialFeatureKey, FeatureCrop>;
  timestamp: number;
}

// Animation phase for feature selection
export type AnimationPhase = 'FLASH' | 'CALCULATE' | 'SELECT' | 'DIM';

export interface SelectionState {
  featureKey: FacialFeatureKey;
  winningFaceId: string;
  meanValue: number;
  winningCrop: FeatureCrop;
  sourceFaceIndex: number;
  differenceFromMean: number;
}
