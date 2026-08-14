/**
 * Face metrics calculation utilities
 * Computes symmetry, golden ratio deviations, and other facial measurements
 */

import { NormalizedLandmark } from '../services/faceDetection';

export interface FaceAnalysis {
    symmetry: number;           // 0-100%
    goldenRatioDeviation: number; // Deviation from golden ratio (1.618)
    eyeRatio: number;           // Eye width to face width ratio
    noseRatio: number;          // Nose width to face width ratio
    mouthRatio: number;         // Mouth width to face width ratio
    faceWidth: number;          // Normalized face width
    faceHeight: number;         // Normalized face height
}

// Key landmark indices for MediaPipe FaceLandmarker (478 points)
const LANDMARKS = {
    // Eyes
    LEFT_EYE_OUTER: 33,
    LEFT_EYE_INNER: 133,
    RIGHT_EYE_OUTER: 263,
    RIGHT_EYE_INNER: 362,
    LEFT_EYE_CENTER: 468,
    RIGHT_EYE_CENTER: 473,

    // Nose
    NOSE_TIP: 4,
    NOSE_LEFT: 129,
    NOSE_RIGHT: 358,

    // Mouth
    MOUTH_LEFT: 61,
    MOUTH_RIGHT: 291,
    UPPER_LIP: 13,
    LOWER_LIP: 14,

    // Face contour
    FACE_LEFT: 234,
    FACE_RIGHT: 454,
    FOREHEAD: 10,
    CHIN: 152,

    // Eyebrows
    LEFT_BROW_OUTER: 70,
    LEFT_BROW_INNER: 107,
    RIGHT_BROW_OUTER: 300,
    RIGHT_BROW_INNER: 336,
};

/**
 * Calculate distance between two landmarks
 */
function distance(p1: NormalizedLandmark, p2: NormalizedLandmark): number {
    return Math.sqrt(
        Math.pow(p1.x - p2.x, 2) +
        Math.pow(p1.y - p2.y, 2)
    );
}

/**
 * Calculate comprehensive face analysis metrics
 */
export function analyzeFace(landmarks: NormalizedLandmark[]): FaceAnalysis | null {
    if (!landmarks || landmarks.length < 478) {
        return null;
    }

    // Get key points
    const leftEyeOuter = landmarks[LANDMARKS.LEFT_EYE_OUTER];
    const leftEyeInner = landmarks[LANDMARKS.LEFT_EYE_INNER];
    const rightEyeOuter = landmarks[LANDMARKS.RIGHT_EYE_OUTER];
    const rightEyeInner = landmarks[LANDMARKS.RIGHT_EYE_INNER];
    const leftEyeCenter = landmarks[LANDMARKS.LEFT_EYE_CENTER];
    const rightEyeCenter = landmarks[LANDMARKS.RIGHT_EYE_CENTER];

    const noseLeft = landmarks[LANDMARKS.NOSE_LEFT];
    const noseRight = landmarks[LANDMARKS.NOSE_RIGHT];

    const mouthLeft = landmarks[LANDMARKS.MOUTH_LEFT];
    const mouthRight = landmarks[LANDMARKS.MOUTH_RIGHT];

    const faceLeft = landmarks[LANDMARKS.FACE_LEFT];
    const faceRight = landmarks[LANDMARKS.FACE_RIGHT];
    const forehead = landmarks[LANDMARKS.FOREHEAD];
    const chin = landmarks[LANDMARKS.CHIN];

    // Calculate measurements
    const leftEyeWidth = distance(leftEyeOuter, leftEyeInner);
    const rightEyeWidth = distance(rightEyeOuter, rightEyeInner);
    const eyeDistance = distance(leftEyeCenter, rightEyeCenter);
    const noseWidth = distance(noseLeft, noseRight);
    const mouthWidth = distance(mouthLeft, mouthRight);
    const faceWidth = distance(faceLeft, faceRight);
    const faceHeight = distance(forehead, chin);

    // Calculate symmetry (compare left and right features)
    const eyeSymmetry = 1 - Math.abs(leftEyeWidth - rightEyeWidth) / Math.max(leftEyeWidth, rightEyeWidth);

    // Golden ratio: ideal face width to height is approximately 1:1.618
    const goldenRatio = 1.618;
    const actualRatio = faceHeight / faceWidth;
    const goldenRatioDeviation = Math.abs(actualRatio - goldenRatio) / goldenRatio * 100;

    // Feature ratios
    const eyeRatio = eyeDistance / faceWidth * 100;
    const noseRatio = noseWidth / faceWidth * 100;
    const mouthRatio = mouthWidth / faceWidth * 100;

    return {
        symmetry: Math.round(eyeSymmetry * 100),
        goldenRatioDeviation: Math.round(goldenRatioDeviation * 10) / 10,
        eyeRatio: Math.round(eyeRatio * 10) / 10,
        noseRatio: Math.round(noseRatio * 10) / 10,
        mouthRatio: Math.round(mouthRatio * 10) / 10,
        faceWidth: Math.round(faceWidth * 1000),
        faceHeight: Math.round(faceHeight * 1000),
    };
}

/**
 * Get mesh triangulation indices for face mesh rendering
 * These are the standard MediaPipe face mesh triangulation connections
 */
export const FACE_MESH_TESSELATION = [
    // Simplified subset for performance - key facial contours
    // Jaw line
    [234, 93, 132], [132, 58, 172], [172, 136, 150], [150, 149, 176],
    [176, 148, 152], [152, 377, 400], [400, 378, 379], [379, 365, 397],
    [397, 288, 361], [361, 323, 454],

    // Left eye
    [33, 7, 163], [163, 144, 145], [145, 153, 154], [154, 155, 133],
    [133, 173, 157], [157, 158, 159], [159, 160, 161], [161, 246, 33],

    // Right eye
    [263, 249, 390], [390, 373, 374], [374, 380, 381], [381, 382, 362],
    [362, 398, 384], [384, 385, 386], [386, 387, 388], [388, 466, 263],

    // Nose
    [1, 2, 98], [98, 97, 2], [2, 326, 327], [327, 326, 2],

    // Mouth outer
    [61, 185, 40], [40, 39, 37], [37, 0, 267], [267, 269, 270],
    [270, 409, 291], [291, 375, 321], [321, 405, 314], [314, 17, 84],
    [84, 181, 91], [91, 146, 61],
];

/**
 * Get key landmark connections for drawing face wireframe
 */
export const FACE_CONNECTIONS = {
    leftEye: [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246, 33],
    rightEye: [263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466, 263],
    leftBrow: [70, 63, 105, 66, 107, 55, 65, 52, 53, 46],
    rightBrow: [300, 293, 334, 296, 336, 285, 295, 282, 283, 276],
    nose: [168, 6, 197, 195, 5, 4, 1, 19, 94, 2],
    outerLips: [61, 185, 40, 39, 37, 0, 267, 269, 270, 409, 291, 375, 321, 405, 314, 17, 84, 181, 91, 146, 61],
    innerLips: [78, 191, 80, 81, 82, 13, 312, 311, 310, 415, 308, 324, 318, 402, 317, 14, 87, 178, 88, 95, 78],
    faceOval: [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109, 10],
};
