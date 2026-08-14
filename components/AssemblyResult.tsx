import React, { useMemo } from 'react';
import { CapturedFace, SelectionState } from '../types';
import { FEATURE_DEFINITIONS } from '../utils/featureDefinitions';

interface AssemblyResultProps {
  faces: CapturedFace[];
  selections: SelectionState[];
  narration: string;
  generatedImage: string;
  isGenerating: boolean;
  onReset: () => void;
}

function formatMetric(value: number | undefined): string {
  if (typeof value !== 'number' || Number.isNaN(value)) return '---';
  return value.toFixed(2);
}

const AssemblyResult: React.FC<AssemblyResultProps> = ({
  faces,
  selections,
  narration,
  generatedImage,
  isGenerating,
  onReset
}) => {
  const orderedSelections = useMemo(() => {
    const selectionMap = new Map(selections.map(selection => [selection.featureKey, selection]));
    return FEATURE_DEFINITIONS
      .map(definition => selectionMap.get(definition.key))
      .filter((selection): selection is SelectionState => Boolean(selection));
  }, [selections]);

  const averageDelta = orderedSelections.length > 0
    ? orderedSelections.reduce((sum, selection) => sum + selection.differenceFromMean, 0) / orderedSelections.length
    : 0;

  return (
    <div className="flex-1 grid grid-cols-1 xl:grid-cols-[minmax(300px,0.78fr)_minmax(520px,1.22fr)] gap-4 overflow-hidden min-h-0">
      <section className="relative border-2 border-[#00ffcc]/80 bg-black p-1 shadow-[0_0_48px_rgba(0,255,204,0.12)] min-h-[320px] xl:min-h-0">
        <div className="w-full h-full relative overflow-hidden bg-black flex items-center justify-center">
          {isGenerating ? (
            <div className="text-center space-y-6 z-10 p-8">
              <div className="w-20 h-20 border-4 border-t-[#00ffcc] border-r-transparent border-b-[#ff0066] border-l-transparent rounded-full animate-spin mx-auto"></div>
              <div className="space-y-2">
                <p className="text-base font-bold tracking-widest text-[#00ffcc] animate-pulse uppercase">FUSING SELECTED COMPONENTS...</p>
                <p className="text-[10px] opacity-45 font-mono uppercase">REASSEMBLING EYEBROWS, EYES, NOSE, MOUTH, EARS, AND FACE STRUCTURE</p>
                <div className="flex justify-center gap-1">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className="w-1 h-3 bg-[#00ffcc] animate-pulse" style={{ animationDelay: `${i * 0.08}s` }}></div>
                  ))}
                </div>
              </div>
            </div>
          ) : generatedImage ? (
            <div className="relative w-full h-full group flex items-center justify-center bg-zinc-950">
              <img src={generatedImage} alt="Synthesized collective face" className="max-w-full max-h-full object-contain opacity-100 transition-opacity duration-1000" />
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-1/2 left-0 w-full h-px bg-[#00ffcc]/20"></div>
                <div className="absolute top-0 left-1/2 w-px h-full bg-[#00ffcc]/20"></div>
                <div className="absolute top-6 right-6 text-right">
                  <div className="text-[8px] text-[#00ffcc] font-mono uppercase">FEATURE_COUNT: {orderedSelections.length}</div>
                  <div className="text-[12px] font-bold tracking-widest uppercase">Entity Resolved</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-red-500 font-bold uppercase tracking-widest">DATA COLLAPSE: RECONSTRUCTION FAILED</div>
          )}

          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#00ffcc]/5 to-transparent pointer-events-none"></div>
        </div>

        <div className="absolute top-4 left-4 bg-black/85 border border-[#00ffcc] px-3 py-1 text-[10px] font-bold z-20 uppercase">
          Resolved_Entity: V_001_Hybrid
        </div>
      </section>

      <section className="min-h-0 flex flex-col gap-3 overflow-hidden">
        <div className="grid grid-cols-3 gap-2">
          <div className="border border-[#00ffcc]/25 bg-black/55 p-3">
            <div className="text-[8px] opacity-45 uppercase font-mono">Selected Parts</div>
            <div className="text-3xl font-black text-[#00ffcc]">{orderedSelections.length}</div>
          </div>
          <div className="border border-[#00ffcc]/25 bg-black/55 p-3">
            <div className="text-[8px] opacity-45 uppercase font-mono">Avg Delta</div>
            <div className="text-3xl font-black text-[#00ffcc]">{formatMetric(averageDelta)}</div>
          </div>
          <div className="border border-[#00ffcc]/25 bg-black/55 p-3">
            <div className="text-[8px] opacity-45 uppercase font-mono">Source Pool</div>
            <div className="text-3xl font-black text-[#00ffcc]">{faces.length}</div>
          </div>
        </div>

        <div className="border border-[#00ffcc]/30 bg-black/60 p-3">
          <div className="flex justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#00ffcc]">Entity Synthesis Report</h3>
              <p className="text-[10px] opacity-45 uppercase font-mono mt-1">Identity borders blurred through small-sample averaging</p>
            </div>
            <button
              onClick={onReset}
              disabled={isGenerating}
              className={`border-2 border-[#00ffcc] text-[#00ffcc] px-4 py-2 text-[10px] font-bold transition-all tracking-tighter uppercase ${isGenerating ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#00ffcc] hover:text-black'}`}
            >
              Purge & Restart
            </button>
          </div>
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30">
            <p className="text-[9px] text-red-500 font-bold mb-1 tracking-widest uppercase">Clinical Observation</p>
            <p className="text-xs leading-relaxed italic opacity-90 font-mono">
              {narration || (isGenerating ? "RESOLVING IDENTITY CONFLICTS..." : "AWAITING INSTRUCTION")}
            </p>
          </div>
        </div>

        <div className="border border-[#00ffcc]/30 bg-black/55 p-3 flex-1 min-h-0 flex flex-col">
          <div className="flex justify-between items-end border-b border-[#00ffcc]/20 pb-2 mb-3">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#00ffcc]">Component Comparison</h3>
              <p className="text-[9px] opacity-45 uppercase font-mono">Selected cutout vs source context</p>
            </div>
            <div className="text-[9px] opacity-45 font-mono uppercase">{orderedSelections.length} locked</div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {orderedSelections.map(selection => {
              const sourceFace = faces[selection.sourceFaceIndex];
              const crop = selection.winningCrop;

              return (
                <div
                  key={selection.featureKey}
                  className="grid grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)_7rem] gap-3 items-center border border-[#00ffcc]/15 bg-black/45 p-2"
                >
                  <div className="font-mono uppercase">
                    <div className="text-[9px] opacity-45">Part</div>
                    <div className="text-xs font-black text-[#00ffcc] leading-tight">{crop.shortLabel}</div>
                    <div className="text-[8px] opacity-40 mt-1">SUB_{selection.sourceFaceIndex + 1}</div>
                  </div>

                  <div className="min-w-0">
                    <div className="h-20 border border-[#00ffcc]/25 bg-black overflow-hidden">
                      <img src={crop.imageData} alt={`${crop.label} selected cutout`} className="w-full h-full object-cover" />
                    </div>
                    <div className="text-[8px] opacity-45 uppercase font-mono mt-1">Selected Cutout</div>
                  </div>

                  <div className="min-w-0">
                    <div className="h-20 border border-[#00ffcc]/15 bg-black overflow-hidden">
                      <img src={crop.contextImageData} alt={`${crop.label} source context`} className="w-full h-full object-cover grayscale contrast-110" />
                    </div>
                    <div className="text-[8px] opacity-45 uppercase font-mono mt-1">Source Original</div>
                  </div>

                  <div className="font-mono text-[9px] uppercase space-y-1">
                    <div className="flex justify-between gap-2">
                      <span className="opacity-45">Value</span>
                      <span>{formatMetric(crop.metricValue)}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="opacity-45">Mean</span>
                      <span>{formatMetric(selection.meanValue)}</span>
                    </div>
                    <div className="flex justify-between gap-2 text-[#00ffcc]">
                      <span>Delta</span>
                      <span>{formatMetric(selection.differenceFromMean)}</span>
                    </div>
                    <div className="text-[8px] opacity-40 truncate">ID {sourceFace?.id.slice(-6) || '---'}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border border-[#00ffcc]/10 p-2 bg-black/35">
          <h4 className="text-[8px] opacity-50 font-bold uppercase mb-2">Original Source Samples</h4>
          <div className="grid grid-cols-5 gap-1">
            {faces.map((face, index) => (
              <div key={face.id} className="aspect-square grayscale contrast-110 opacity-55 border border-white/5">
                <img src={face.imageData} className="w-full h-full object-cover" alt={`Source ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default AssemblyResult;
