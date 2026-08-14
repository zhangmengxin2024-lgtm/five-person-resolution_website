import { FaceMetricKey, FacialFeatureKey } from '../types';

export interface FeatureDefinition {
  key: FacialFeatureKey;
  label: string;
  shortLabel: string;
  metricKey: FaceMetricKey;
  landmarkIndices: number[];
  padding: number;
  contextPadding: number;
}

export const FEATURE_DEFINITIONS: FeatureDefinition[] = [
  {
    key: 'leftBrow',
    label: 'LEFT BROW',
    shortLabel: 'L_BROW',
    metricKey: 'leftBrow',
    landmarkIndices: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
    padding: 1.2,
    contextPadding: 2.4,
  },
  {
    key: 'rightBrow',
    label: 'RIGHT BROW',
    shortLabel: 'R_BROW',
    metricKey: 'rightBrow',
    landmarkIndices: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
    padding: 1.2,
    contextPadding: 2.4,
  },
  {
    key: 'leftEye',
    label: 'LEFT EYE',
    shortLabel: 'L_EYE',
    metricKey: 'leftEye',
    landmarkIndices: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246],
    padding: 0.85,
    contextPadding: 1.9,
  },
  {
    key: 'rightEye',
    label: 'RIGHT EYE',
    shortLabel: 'R_EYE',
    metricKey: 'rightEye',
    landmarkIndices: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466],
    padding: 0.85,
    contextPadding: 1.9,
  },
  {
    key: 'nose',
    label: 'NOSE',
    shortLabel: 'NOSE',
    metricKey: 'noseWidth',
    landmarkIndices: [168, 6, 197, 195, 5, 4, 1, 19, 94, 2, 98, 97, 129, 358, 326, 327, 331],
    padding: 0.9,
    contextPadding: 1.8,
  },
  {
    key: 'mouth',
    label: 'MOUTH',
    shortLabel: 'MOUTH',
    metricKey: 'mouthWidth',
    landmarkIndices: [
      61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146,
      78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95,
    ],
    padding: 0.75,
    contextPadding: 1.6,
  },
  {
    key: 'leftEar',
    label: 'LEFT EAR',
    shortLabel: 'L_EAR',
    metricKey: 'leftEar',
    landmarkIndices: [127, 162, 21, 54, 103, 67, 109, 234, 93, 132, 58, 172],
    padding: 0.65,
    contextPadding: 1.5,
  },
  {
    key: 'rightEar',
    label: 'RIGHT EAR',
    shortLabel: 'R_EAR',
    metricKey: 'rightEar',
    landmarkIndices: [356, 389, 251, 284, 332, 297, 338, 454, 323, 361, 288, 397],
    padding: 0.65,
    contextPadding: 1.5,
  },
  {
    key: 'faceShape',
    label: 'FACE / JAW',
    shortLabel: 'FACE',
    metricKey: 'faceShape',
    landmarkIndices: [
      10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377,
      152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
    ],
    padding: 0.18,
    contextPadding: 0.35,
  },
];

export const FEATURE_KEYS = FEATURE_DEFINITIONS.map(definition => definition.key);

export const FEATURE_DEFINITION_MAP = FEATURE_DEFINITIONS.reduce(
  (acc, definition) => {
    acc[definition.key] = definition;
    return acc;
  },
  {} as Record<FacialFeatureKey, FeatureDefinition>
);
