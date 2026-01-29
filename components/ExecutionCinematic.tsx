
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Circle } from 'lucide-react';
import { ExecutionStep } from '../types';

interface Props {
  steps: ExecutionStep[];
  onStepChange: (stepIndex: number, files: string[]) => void;
}

const ExecutionCinematic: React.FC<Props> = ({ steps, onStepChange }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    onStepChange(currentStep, steps[currentStep]?.filesInvolved || []);
  }, [currentStep]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setCurrentStep(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 2000); // 2 seconds per step for cinematic feel
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, steps.length]);

  const togglePlay = () => setIsPlaying(!isPlaying);

  return (
    <div className="h-full flex flex-col">
      {/* Player Controls */}
      <div className="glass-panel p-4 mb-4 rounded-xl flex items-center justify-between border border-neon-green/20">
        <div className="flex items-center gap-4">
          <button onClick={() => setCurrentStep(Math.max(0, currentStep - 1))} className="text-slate-400 hover:text-white transition-colors">
            <SkipBack size={20} />
          </button>
          <button 
            onClick={togglePlay} 
            className="w-12 h-12 rounded-full bg-neon-green text-black flex items-center justify-center hover:shadow-[0_0_15px_rgba(0,255,157,0.5)] transition-all"
          >
            {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
          </button>
          <button onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))} className="text-slate-400 hover:text-white transition-colors">
            <SkipForward size={20} />
          </button>
        </div>
        
        <div className="text-right">
          <p className="text-xs text-neon-green font-mono uppercase font-bold">Execution Step {currentStep + 1} / {steps.length}</p>
          <p className="text-slate-400 text-xs">{steps[currentStep]?.location}</p>
        </div>
      </div>

      {/* Timeline Visualization */}
      <div className="flex-1 overflow-y-auto relative pr-2 space-y-0">
        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-slate-800" />
        
        {steps.map((step, idx) => (
          <div 
            key={idx} 
            className={`relative pl-14 py-4 cursor-pointer group transition-all duration-500 ${
              idx === currentStep ? 'opacity-100 scale-100' : 'opacity-40 scale-95 grayscale'
            }`}
            onClick={() => {
              setCurrentStep(idx);
              setIsPlaying(false);
            }}
          >
            {/* Timeline Node */}
            <div className={`absolute left-[20px] top-6 w-3 h-3 rounded-full border-2 transition-all duration-300 z-10 ${
              idx === currentStep ? 'bg-neon-green border-neon-green shadow-[0_0_10px_#00ff9d]' : 
              idx < currentStep ? 'bg-slate-700 border-slate-700' : 'bg-space-950 border-slate-700'
            }`} />

            <div className={`glass-panel p-5 rounded-xl border transition-colors ${
              idx === currentStep ? 'border-neon-green/50 bg-slate-900/80' : 'border-white/5'
            }`}>
              <div className="flex justify-between items-start mb-2">
                <span className={`font-mono text-xs font-bold ${idx === currentStep ? 'text-neon-green' : 'text-slate-500'}`}>
                  {step.approxTimeMs}ms
                </span>
                <span className="text-xs text-slate-500 font-mono">{step.location}</span>
              </div>
              
              <h4 className="text-lg font-bold text-slate-200 mb-1">{step.action}</h4>
              <p className="text-slate-400 text-sm">{step.narrative}</p>
              
              {step.stateChanges && idx === currentStep && (
                <div className="mt-3 p-3 bg-black/50 rounded border-l-2 border-neon-green font-mono text-xs text-neon-blue animate-pulse-slow">
                  <span className="text-slate-500">$ state_mutation: </span>{step.stateChanges}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ExecutionCinematic;
