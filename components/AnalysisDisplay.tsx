import React, { useMemo } from 'react';
import { CapturedFace, SelectionState, AnimationPhase } from '../types';
import TrashPool from './TrashPool';
import FrameShell from './FrameShell';
import { FEATURE_DEFINITIONS, FEATURE_DEFINITION_MAP } from '../utils/featureDefinitions';

interface AnalysisDisplayProps {
  faces: CapturedFace[];
  selections: SelectionState[];
  activeIdx: number;
  animationPhase: AnimationPhase;
}

const STATUS_LABELS: Record<AnimationPhase, string> = {
  FLASH: 'DECOMPOSING_COMPONENT',
  CALCULATE: 'CALCULATING_GROUP_MEAN',
  SELECT: 'OPTIMAL_COMPONENT_LOCKED',
  DIM: 'REJECTED_COMPONENTS_TRANSFERRED',
};

function formatMetric(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '---';
  return value.toFixed(2);
}

const AnalysisDisplay: React.FC<AnalysisDisplayProps> = ({
  faces,
  selections,
  activeIdx,
  animationPhase
}) => {
  const currentDefinition = activeIdx >= 0 ? FEATURE_DEFINITIONS[activeIdx] : null;
  const selectionByFeature = useMemo(
    () => new Map(selections.map(selection => [selection.featureKey, selection])),
    [selections]
  );
  const currentSelection = currentDefinition ? selectionByFeature.get(currentDefinition.key) : undefined;

  const activeValues = useMemo(() => {
    if (!currentDefinition) return [];
    return faces.map(face => face.landmarks[currentDefinition.metricKey]);
  }, [currentDefinition, faces]);

  const activeMean = activeValues.length > 0
    ? activeValues.reduce((sum, value) => sum + value, 0) / activeValues.length
    : 0;

  const closestFaceId = useMemo(() => {
    if (!currentDefinition || faces.length === 0) return '';
    let minDiff = Infinity;
    let winnerId = faces[0].id;
    faces.forEach(face => {
      const diff = Math.abs(face.landmarks[currentDefinition.metricKey] - activeMean);
      if (diff < minDiff) {
        minDiff = diff;
        winnerId = face.id;
      }
    });
    return winnerId;
  }, [activeMean, currentDefinition, faces]);

  const rejectedItems = useMemo(() => {
    const items: { id: string; faceId: string; feature: string; featureName: string; imageData: string }[] = [];

    selections.forEach(selection => {
      faces.forEach(face => {
        if (face.id !== selection.winningFaceId) {
          const crop = face.featureCrops?.[selection.featureKey];
          const definition = FEATURE_DEFINITION_MAP[selection.featureKey];
          items.push({
            id: `${face.id}-${selection.featureKey}`,
            faceId: face.id,
            feature: selection.featureKey,
            featureName: definition.label,
            imageData: crop?.imageData || face.imageData
          });
        }
      });
    });

    return items;
  }, [selections, faces]);

  const getFaceClass = (faceId: string) => {
    if (animationPhase === 'FLASH') return 'phase-flash';
    if (animationPhase === 'CALCULATE') return 'phase-calculate';
    if (!currentSelection) return '';
    if (animationPhase === 'SELECT') return currentSelection.winningFaceId === faceId ? 'phase-select feature-winner' : 'phase-dim';
    if (animationPhase === 'DIM') return currentSelection.winningFaceId === faceId ? 'feature-winner' : 'phase-dim';
    return '';
  };

  return (
    <FrameShell status="ANALYSIS" storageMb={faces.length * 2.4}>
      <div className="h-full min-h-0 grid grid-cols-[minmax(0,1fr)_9rem] md:grid-cols-[minmax(0,1fr)_10rem] gap-3 overflow-hidden p-2 md:p-3">
      <div className="min-h-0 flex flex-col gap-3">
        <section className="border border-[#00ffcc]/30 bg-black/50 p-3">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div>
              <div className="text-[9px] opacity-40 font-mono uppercase tracking-widest">Component Extraction Sequence</div>
              <h3 className={`text-sm md:text-lg font-bold tracking-[0.24em] text-[#00ffcc] uppercase ${animationPhase === 'CALCULATE' ? 'animate-pulse' : ''}`}>
                {STATUS_LABELS[animationPhase]}
              </h3>
            </div>
            <div className="text-right font-mono uppercase">
              <div className="text-[9px] opacity-40">Target</div>
              <div className="text-xl font-black tracking-tight text-[#00ffcc]">{currentDefinition?.label || '---'}</div>
              <div className="text-[9px] opacity-50">{activeIdx + 1} / {FEATURE_DEFINITIONS.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-2 h-20 md:h-24">
            {faces.map((face, index) => {
              const phaseClass = getFaceClass(face.id);
              const selectedFeatures = selections.filter(selection => selection.winningFaceId === face.id);

              return (
                <div
                  key={face.id}
                  className={`relative overflow-hidden border border-[#00ffcc]/25 transition-all duration-200 ${phaseClass}`}
                >
                  <img src={face.imageData} alt={`Subject ${index + 1}`} className="w-full h-full object-cover grayscale brightness-75" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80"></div>
                  <div className="absolute bottom-1 left-1 right-1">
                    <div className="flex justify-between items-end text-[7px] font-mono">
                      <span className="opacity-60">SUB_{index + 1}</span>
                      <span className="text-[#00ffcc]">{selectedFeatures.length}</span>
                    </div>
                    {selectedFeatures.length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-0.5">
                        {selectedFeatures.slice(-3).map(selection => (
                          <span
                            key={selection.featureKey}
                            className="bg-[#00ffcc]/85 text-black text-[5px] font-bold px-0.5 uppercase"
                          >
                            {FEATURE_DEFINITION_MAP[selection.featureKey].shortLabel}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-4 flex-1 min-h-0">
          <section className="border border-[#00ffcc]/35 bg-black/55 p-4 min-h-0 flex flex-col">
            <div className="flex justify-between items-start gap-4 border-b border-[#00ffcc]/20 pb-3 mb-3">
              <div>
                <div className="text-[9px] opacity-40 font-mono uppercase tracking-widest">Mean Comparator</div>
                <div className="text-3xl font-black text-[#00ffcc] tracking-tight">
                  {formatMetric(activeMean)}
                </div>
              </div>
              <div className="text-right font-mono text-[9px] uppercase opacity-70">
                <div>Metric: {currentDefinition?.metricKey || '---'}</div>
                <div>Closest: {currentSelection ? `SUB_${currentSelection.sourceFaceIndex + 1}` : closestFaceId ? 'PENDING' : '---'}</div>
                <div>Locked: {selections.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-[3rem_1fr_5rem_5rem_5.5rem] gap-2 text-[9px] uppercase opacity-50 font-mono mb-2">
              <div>Sub</div>
              <div>Component</div>
              <div>Value</div>
              <div>Delta</div>
              <div>Status</div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {faces.map((face, index) => {
                const value = currentDefinition ? face.landmarks[currentDefinition.metricKey] : undefined;
                const diff = typeof value === 'number' ? Math.abs(value - activeMean) : undefined;
                const crop = currentDefinition ? face.featureCrops?.[currentDefinition.key] : undefined;
                const isWinner = currentSelection?.winningFaceId === face.id;
                const isPredictedClosest = !currentSelection && closestFaceId === face.id && animationPhase === 'CALCULATE';

                return (
                  <div
                    key={face.id}
                    className={`grid grid-cols-[3rem_1fr_5rem_5rem_5.5rem] gap-2 items-center border px-2 py-2 bg-black/40 transition-all ${isWinner
                      ? 'border-[#00ffcc] shadow-[0_0_20px_rgba(0,255,204,0.25)]'
                      : isPredictedClosest
                        ? 'border-[#00ffcc]/60'
                        : 'border-[#00ffcc]/15'
                      }`}
                  >
                    <div className="text-xs font-bold text-[#00ffcc]">SUB_{index + 1}</div>
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-16 h-10 border border-[#00ffcc]/20 bg-black overflow-hidden shrink-0">
                        {crop && <img src={crop.imageData} alt={crop.label} className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold uppercase truncate">{currentDefinition?.label || '---'}</div>
                        <div className="text-[8px] opacity-40 font-mono truncate">ID {face.id.slice(-6)}</div>
                      </div>
                    </div>
                    <div className="font-mono text-xs">{formatMetric(value)}</div>
                    <div className="font-mono text-xs">{formatMetric(diff)}</div>
                    <div className={`text-[9px] font-bold uppercase ${isWinner ? 'text-[#00ffcc]' : isPredictedClosest ? 'text-white' : 'opacity-40'}`}>
                      {isWinner ? 'SELECTED' : isPredictedClosest ? 'CLOSEST' : currentSelection ? 'REJECTED' : 'SCANNING'}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="border border-[#00ffcc]/25 bg-black/45 p-4 min-h-0 flex flex-col">
            <div className="flex items-start justify-between border-b border-[#00ffcc]/15 pb-3 mb-3">
              <div>
                <div className="text-[9px] opacity-40 font-mono uppercase tracking-widest">Decomposed Cutouts</div>
                <div className="text-xl font-black text-[#00ffcc] uppercase">{currentDefinition?.shortLabel || '---'}</div>
              </div>
              <div className="text-right text-[9px] font-mono opacity-50 uppercase">
                <div>Mean {formatMetric(activeMean)}</div>
                <div>Rejected {rejectedItems.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-5 xl:grid-cols-1 gap-2 overflow-y-auto pr-1">
              {faces.map((face, index) => {
                const crop = currentDefinition ? face.featureCrops?.[currentDefinition.key] : undefined;
                const isWinner = currentSelection?.winningFaceId === face.id;

                return (
                  <div
                    key={face.id}
                    className={`relative border bg-black overflow-hidden min-h-20 ${isWinner ? 'border-[#00ffcc]' : currentSelection ? 'border-[#ff3366]/45 opacity-55 grayscale' : 'border-[#00ffcc]/20'
                      }`}
                  >
                    {crop && <img src={crop.contextImageData} alt={crop.label} className="w-full h-full object-cover" />}
                    <div className="absolute inset-x-0 bottom-0 bg-black/80 px-2 py-1 flex justify-between text-[8px] font-mono uppercase">
                      <span>SUB_{index + 1}</span>
                      <span className={isWinner ? 'text-[#00ffcc]' : 'text-[#ff3366]'}>
                        {isWinner ? 'KEEP' : currentSelection ? 'DROP' : 'READ'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex flex-wrap gap-1">
              {FEATURE_DEFINITIONS.map((definition, index) => (
                <div
                  key={definition.key}
                  className={`h-2 flex-1 min-w-4 transition-all ${selectionByFeature.has(definition.key)
                    ? 'bg-[#00ffcc]'
                    : index === activeIdx
                      ? 'bg-[#00ffcc] animate-pulse'
                      : 'bg-[#1a2e2a]'
                    }`}
                  title={definition.label}
                />
              ))}
            </div>
          </section>
        </div>
      </div>

      <TrashPool items={rejectedItems} />
      </div>
    </FrameShell>
  );
};

export default AnalysisDisplay;
