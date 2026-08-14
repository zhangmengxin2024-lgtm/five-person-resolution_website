
import { CapturedFace, CropBox, FaceLandmarks, FacialFeatureKey, FeatureCrop, SelectionState } from '../types';
import { NormalizedLandmark } from '../services/faceDetection';
import { FEATURE_DEFINITIONS } from './featureDefinitions';

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function getCropBox(
    landmarks: NormalizedLandmark[],
    indices: number[],
    canvasWidth: number,
    canvasHeight: number,
    paddingScale: number
): CropBox {
    const points = indices
        .map(index => landmarks[index])
        .filter(Boolean)
        .map(point => ({
            x: point.x * canvasWidth,
            y: point.y * canvasHeight,
        }));

    if (points.length === 0) {
        return {
            x: canvasWidth * 0.2,
            y: canvasHeight * 0.2,
            width: canvasWidth * 0.6,
            height: canvasHeight * 0.6,
        };
    }

    const minX = Math.min(...points.map(point => point.x));
    const maxX = Math.max(...points.map(point => point.x));
    const minY = Math.min(...points.map(point => point.y));
    const maxY = Math.max(...points.map(point => point.y));

    const rawWidth = Math.max(maxX - minX, canvasWidth * 0.06);
    const rawHeight = Math.max(maxY - minY, canvasHeight * 0.04);
    const padX = rawWidth * paddingScale;
    const padY = rawHeight * paddingScale;

    const x = clamp(minX - padX, 0, canvasWidth);
    const y = clamp(minY - padY, 0, canvasHeight);
    const right = clamp(maxX + padX, 0, canvasWidth);
    const bottom = clamp(maxY + padY, 0, canvasHeight);

    return {
        x,
        y,
        width: Math.max(right - x, 1),
        height: Math.max(bottom - y, 1),
    };
}

function renderCrop(sourceCanvas: HTMLCanvasElement, box: CropBox): string {
    const maxWidth = 280;
    const maxHeight = 190;
    const aspect = box.width / box.height;
    const outputWidth = aspect >= 1 ? maxWidth : Math.max(120, Math.round(maxHeight * aspect));
    const outputHeight = aspect >= 1 ? Math.max(80, Math.round(maxWidth / aspect)) : maxHeight;

    const canvas = document.createElement('canvas');
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(sourceCanvas, box.x, box.y, box.width, box.height, 0, 0, outputWidth, outputHeight);

    return canvas.toDataURL('image/jpeg', 0.88);
}

/**
 * Extracts display-ready feature crops from the captured 400x400 face canvas.
 * Landmarks must already be transformed into the captured image coordinate space.
 */
export function createFeatureCropsFromCanvas(
    sourceCanvas: HTMLCanvasElement,
    landmarks: NormalizedLandmark[],
    metrics: FaceLandmarks,
    sourceFaceId: string
): Record<FacialFeatureKey, FeatureCrop> {
    return FEATURE_DEFINITIONS.reduce((acc, definition) => {
        const cropBox = getCropBox(
            landmarks,
            definition.landmarkIndices,
            sourceCanvas.width,
            sourceCanvas.height,
            definition.padding
        );
        const contextBox = getCropBox(
            landmarks,
            definition.landmarkIndices,
            sourceCanvas.width,
            sourceCanvas.height,
            definition.contextPadding
        );

        acc[definition.key] = {
            featureKey: definition.key,
            label: definition.label,
            shortLabel: definition.shortLabel,
            imageData: renderCrop(sourceCanvas, cropBox),
            contextImageData: renderCrop(sourceCanvas, contextBox),
            sourceFaceId,
            metricKey: definition.metricKey,
            metricValue: metrics[definition.metricKey],
            cropBox,
            contextBox,
        };
        return acc;
    }, {} as CapturedFace['featureCrops']);
}

function drawImageContained(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    width: number,
    height: number
) {
    const imageAspect = image.width / image.height;
    const targetAspect = width / height;
    const drawWidth = imageAspect > targetAspect ? width : height * imageAspect;
    const drawHeight = imageAspect > targetAspect ? width / imageAspect : height;
    const drawX = x + (width - drawWidth) / 2;
    const drawY = y + (height - drawHeight) / 2;
    ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
}

async function loadImage(src: string): Promise<HTMLImageElement> {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Could not load image'));
        image.src = src;
    });
    return image;
}

/**
 * Creates a composite image grid from multiple captured faces.
 * Arranges faces in a grid layout (e.g. 3x2 for 5 faces).
 * Returns a base64 DataURL string of the composite image.
 */
export async function createCompositeGrid(faces: CapturedFace[]): Promise<string> {
    if (faces.length === 0) return '';

    const faceCount = faces.length;
    // Calculate grid dimensions
    // For 5 faces, we use 3 columns, 2 rows (last slot empty)
    const cols = 3;
    const rows = Math.ceil(faceCount / cols);

    // Load first image to get dimensions
    const imgElement = new Image();
    await new Promise((resolve) => {
        imgElement.onload = resolve;
        imgElement.src = faces[0].imageData;
    });

    const width = imgElement.width;
    const height = imgElement.height;

    const canvas = document.createElement('canvas');
    canvas.width = width * cols;
    canvas.height = height * rows;
    const ctx = canvas.getContext('2d');

    if (!ctx) throw new Error('Could not get canvas context');

    // Fill background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw each face onto the grid
    const promises = faces.map((face, index) => {
        return new Promise<void>((resolve) => {
            const img = new Image();
            img.onload = () => {
                const col = index % cols;
                const row = Math.floor(index / cols);
                ctx.drawImage(img, col * width, row * height, width, height);
                resolve();
            };
            img.src = face.imageData;
        });
    });

    await Promise.all(promises);

    return canvas.toDataURL('image/jpeg', 0.9);
}

/**
 * Creates a board of the selected feature cutouts for image generation.
 * DashScope receives this in addition to the source-face grid.
 */
export async function createSelectedFeatureBoard(selections: SelectionState[]): Promise<string> {
    const selected = selections.filter(selection => selection.winningCrop);
    if (selected.length === 0) return '';

    const cols = 3;
    const cellWidth = 280;
    const cellHeight = 220;
    const headerHeight = 32;
    const rows = Math.ceil(selected.length / cols);

    const canvas = document.createElement('canvas');
    canvas.width = cols * cellWidth;
    canvas.height = rows * cellHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#00ffcc55';
    ctx.font = 'bold 16px monospace';

    const images = await Promise.all(selected.map(selection => loadImage(selection.winningCrop.imageData)));

    selected.forEach((selection, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);
        const x = col * cellWidth;
        const y = row * cellHeight;

        ctx.strokeStyle = '#00ffcc55';
        ctx.strokeRect(x + 8, y + 8, cellWidth - 16, cellHeight - 16);

        ctx.fillStyle = '#00ffcc';
        ctx.fillText(
            `${selection.winningCrop.shortLabel} / SUB_${selection.sourceFaceIndex + 1}`,
            x + 18,
            y + 26
        );

        drawImageContained(
            ctx,
            images[index],
            x + 14,
            y + headerHeight + 10,
            cellWidth - 28,
            cellHeight - headerHeight - 24
        );
    });

    return canvas.toDataURL('image/jpeg', 0.9);
}
