import React, { useState, useEffect, useCallback } from 'react';
import { SystemPhase, CapturedFace, SelectionState, AnimationPhase } from './types';
import { REQUIRED_FACES } from './constants';
import CameraView from './components/CameraView';
import AnalysisDisplay from './components/AnalysisDisplay';
import AssemblyResult from './components/AssemblyResult';
import Header from './components/Header';
import { generateImageWithDashScope } from './services/dashscope';
import { createCompositeGrid, createSelectedFeatureBoard } from './utils/imageUtils';
import { FEATURE_DEFINITIONS } from './utils/featureDefinitions';

const App: React.FC = () => {
  const [phase, setPhase] = useState<SystemPhase>(SystemPhase.INTRODUCTION);
  const [faces, setFaces] = useState<CapturedFace[]>([]);
  const [currentSelections, setCurrentSelections] = useState<SelectionState[]>([]);
  const [processingFeatureIdx, setProcessingFeatureIdx] = useState<number>(-1);
  const [animationPhase, setAnimationPhase] = useState<AnimationPhase>('FLASH');
  const [aiNarration, setAiNarration] = useState<string>("");
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleCapture = useCallback((captured: CapturedFace | CapturedFace[]) => {
    setFaces(prev => {
      if (prev.length >= REQUIRED_FACES) return prev;

      let updated: CapturedFace[];
      if (Array.isArray(captured)) {
        updated = [...prev, ...captured].slice(0, REQUIRED_FACES);
      } else {
        updated = [...prev, captured];
      }

      if (updated.length >= REQUIRED_FACES) {
        setTimeout(() => setPhase(SystemPhase.ANALYSIS), 800);
      }
      return updated;
    });
  }, []);

  const resetSystem = useCallback(() => {
    setFaces([]);
    setCurrentSelections([]);
    setProcessingFeatureIdx(-1);
    setAiNarration("");
    setGeneratedImageUrl("");
    setIsGenerating(false);
    setPhase(SystemPhase.CAPTURE);
  }, []);

  useEffect(() => {
    if (phase === SystemPhase.ANALYSIS) {
      let idx = 0;
      const features: SelectionState[] = [];

      const runFeatureAnimation = () => {
        if (idx >= FEATURE_DEFINITIONS.length) {
          setTimeout(() => setPhase(SystemPhase.ASSEMBLY), 1000);
          return;
        }

        setProcessingFeatureIdx(idx);
        const definition = FEATURE_DEFINITIONS[idx];

        // Phase 1: FLASH (0.15s)
        setAnimationPhase('FLASH');

        setTimeout(() => {
          // Phase 2: CALCULATE (0.35s)
          setAnimationPhase('CALCULATE');

          const values = faces.map(face => face.landmarks[definition.metricKey]);
          const sum = values.reduce((a, b) => a + b, 0);
          const mean = sum / values.length;

          let minDiff = Infinity;
          let winnerId = faces[0].id;
          let sourceFaceIndex = 0;
          faces.forEach((face, faceIndex) => {
            const diff = Math.abs(face.landmarks[definition.metricKey] - mean);
            if (diff < minDiff) {
              minDiff = diff;
              winnerId = face.id;
              sourceFaceIndex = faceIndex;
            }
          });

          setTimeout(() => {
            // Phase 3: SELECT (0.2s)
            setAnimationPhase('SELECT');
            const winner = faces[sourceFaceIndex];
            features.push({
              featureKey: definition.key,
              winningFaceId: winnerId,
              meanValue: mean,
              winningCrop: winner.featureCrops[definition.key],
              sourceFaceIndex,
              differenceFromMean: minDiff,
            });
            setCurrentSelections([...features]);

            setTimeout(() => {
              // Phase 4: DIM (0.13s) then next feature
              setAnimationPhase('DIM');

              setTimeout(() => {
                idx++;
                runFeatureAnimation();
              }, 130);
            }, 200);
          }, 350);
        }, 150);
      };

      runFeatureAnimation();
    }
  }, [phase, faces]);

  useEffect(() => {
    if (phase === SystemPhase.ASSEMBLY && !generatedImageUrl && !isGenerating) {
      const generateResolution = async () => {
        setIsGenerating(true);
        try {
          // 1. Create source-face grid and selected-component board
          const gridImage = await createCompositeGrid(faces);
          const featureBoard = await createSelectedFeatureBoard(currentSelections);

          // 2. DashScope Prompt (Qwen Image Edit Plus)
          const prompt = `COMMAND: Generate a SINGLE, CENTERED portrait face by recombining the selected facial components.
          
          INPUTS:
          - Image 1 is a reference grid of the 5 captured source faces.
          - Image 2 is the approved component board. Use these selected cutouts as the primary source for eyebrows, eyes, nose, mouth, ears, and face/jaw structure.

          STRICT CONSTRAINTS:
          1. OUTPUT MUST BE ONE SINGLE FACE. Do NOT output a grid. Do NOT show multiple faces.
          2. IGNORE the grid layout of the input images. Treat the inputs strictly as a palette of harvested features.
          3. FUSION: Reassemble the selected component board into one new identity while preserving visible joins between parts.
          
          VISUAL STYLE:
          - Subject: A hyper-realistic human face, front-facing, passport style.
          - Detail: Visible seams, mismatched skin tones, and hard transition lines where features join, showing it is an artificial assembly.
          - Lighting: Clinical, cold, high contrast.
          
          The final image must be a single person looking at the camera.`;

          // 3. Generate Image
          const images = featureBoard ? [gridImage, featureBoard] : [gridImage];
          const imageUrl = await generateImageWithDashScope(prompt, images);
          setGeneratedImageUrl(imageUrl);

          setAiNarration("SYNTHESIS COMPLETE. SELECTED COMPONENTS HAVE BEEN FUSED INTO A SINGLE COLLECTIVE FACE.");

        } catch (e: any) {
          console.error("AI Generation Error:", e);
          setAiNarration(`SYSTEM ERROR: ${e.message || "SYNTHESIS_FAILURE"}`);
        } finally {
          setIsGenerating(false);
        }
      };
      generateResolution();
    }
  }, [phase, faces, currentSelections, generatedImageUrl, isGenerating]);

  return (
    <div className="h-screen relative overflow-hidden flex flex-col p-4 md:p-6 bg-black text-[#00ffcc]">
      <div className="crt-overlay fixed inset-0 z-50 pointer-events-none opacity-20"></div>
      <div className="scanline"></div>

      <Header />

      <main className="flex-1 mt-4 overflow-hidden flex flex-col">
        {phase === SystemPhase.INTRODUCTION && (
          <div className="flex-1 flex flex-col items-center justify-center space-y-8 animate-pulse text-center">
            <div className="max-w-2xl space-y-6">
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter uppercase mb-4 glitch-text">
                Optical_Inference_Required
              </h1>
              <p className="text-sm md:text-base opacity-70 leading-relaxed font-mono uppercase">
                THE SYSTEM WILL AUTOMATICALLY IDENTIFY AND HARVEST FACIAL DATA.<br />
                PLEASE ENTER THE OBSERVATION AREA TO INITIATE THE FIVE-PART IDENTITY RECOMBINATION.
              </p>
            </div>
            <button
              onClick={() => setPhase(SystemPhase.CAPTURE)}
              className="border border-[#00ffcc] px-16 py-4 text-sm hover:bg-[#00ffcc] hover:text-black transition-all font-bold tracking-[0.3em] uppercase"
            >
              ENTER OBSERVATION DECK
            </button>
          </div>
        )}

        {phase === SystemPhase.CAPTURE && (
          <CameraView onCapture={handleCapture} faces={faces} />
        )}

        {phase === SystemPhase.ANALYSIS && (
          <AnalysisDisplay
            faces={faces}
            selections={currentSelections}
            activeIdx={processingFeatureIdx}
            animationPhase={animationPhase}
          />
        )}

        {phase === SystemPhase.ASSEMBLY && (
          <AssemblyResult
            faces={faces}
            selections={currentSelections}
            narration={aiNarration}
            generatedImage={generatedImageUrl}
            isGenerating={isGenerating}
            onReset={resetSystem}
          />
        )}
      </main>

      <footer className="mt-4 flex justify-between items-end border-t border-[#00ffcc]/10 pt-2 text-[8px] opacity-40 font-mono">
        <div>SYS.AUTONOMOUS.FACIAL.HARVEST_V5.0</div>
        <div className="text-right">
          STORAGE: {faces.length * 2.4}MB / 12.0MB<br />
          STATUS: {phase}
        </div>
      </footer>
    </div>
  );
};

export default App;
