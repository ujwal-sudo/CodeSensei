
import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
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
      }, 2000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, steps.length]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Player Controls */}
      <div className="glass-card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
          <button className="icon-btn" onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}>
            <SkipBack size={20} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--accent-indigo)', border: 'none', color: 'var(--text-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
              transition: 'box-shadow 200ms',
              boxShadow: '0 0 15px rgba(108,99,255,0.4)',
            }}
          >
            {isPlaying ? <Pause size={20} /> : <Play size={20} style={{ marginLeft: 2 }} />}
          </button>
          <button className="icon-btn" onClick={() => setCurrentStep(Math.min(steps.length - 1, currentStep + 1))}>
            <SkipForward size={20} />
          </button>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p className="exec-step-number">Execution Step {currentStep + 1} / {steps.length}</p>
          <p style={{ color: 'var(--text-secondary)', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
            {steps[currentStep]?.location}
          </p>
        </div>
      </div>

      {/* Timeline */}
      <div className="exec-timeline" style={{ flex: 1 }}>
        <div className="exec-timeline-line" />
        {steps.map((step, idx) => (
          <div
            key={idx}
            className="exec-step"
            style={{
              opacity: idx === currentStep ? 1 : 0.4,
              cursor: 'pointer',
              transition: 'opacity 500ms',
            }}
            onClick={() => { setCurrentStep(idx); setIsPlaying(false); }}
          >
            <div className={`exec-step-node ${idx === currentStep ? 'exec-step-node--active' : ''}`}
              style={{
                background: idx < currentStep ? 'var(--text-muted)' : idx === currentStep ? 'var(--accent-indigo)' : 'var(--bg-void)',
                border: idx > currentStep ? '2px solid var(--bg-border)' : 'none',
                boxShadow: idx === currentStep ? '0 0 10px var(--accent-indigo)' : 'none',
              }}
            />
            <div className={`exec-step-card ${idx === currentStep ? 'exec-step-card--active' : ''}`}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: 'var(--space-2)' }}>
                <span className="exec-step-number">{step.approxTimeMs}ms</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{step.location}</span>
              </div>
              <h4 className="exec-step-title">{step.action}</h4>
              <p className="exec-step-desc">{step.narrative}</p>
              {step.stateChanges && idx === currentStep && (
                <div className="exec-step-code">
                  <span style={{ color: 'var(--text-muted)' }}>$ state_mutation: </span>
                  <span style={{ color: 'var(--accent-cyan)' }}>{step.stateChanges}</span>
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
