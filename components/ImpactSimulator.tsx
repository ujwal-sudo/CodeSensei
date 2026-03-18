
import React, { useState } from 'react';
import { runImpactAnalysis } from '../services/geminiService';
import { CodeAnalysisResult, FileNode, ImpactPrediction } from '../types';
import { AlertTriangle, ArrowRight, Activity, CheckCircle, Shield } from 'lucide-react';
import { SeverityPill } from './ui';

interface Props {
  analysis: CodeAnalysisResult;
  files: FileNode[];
}

const ImpactSimulator: React.FC<Props> = ({ analysis, files }) => {
  const [proposal, setProposal] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImpactPrediction | null>(null);

  const handleSimulate = async () => {
    if (!proposal.trim()) return;
    setLoading(true);
    try {
      const prediction = await runImpactAnalysis(proposal, analysis, files);
      setResult(prediction);
    } catch (e) {
      console.error(e);
      alert('Simulation failed.');
    } finally {
      setLoading(false);
    }
  };

  const getSevColor = (s: string) =>
    s === 'critical' ? 'var(--risk-critical)' : s === 'high' ? 'var(--risk-high)' : s === 'medium' ? 'var(--risk-medium)' : 'var(--risk-low)';

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 'var(--space-6)', animation: 'fade-up 400ms ease-out' }}>
      <div className="glass-card">
        <h3 className="text-heading" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
          <Activity size={20} style={{ color: 'var(--risk-critical)' }} /> Impact Simulator
        </h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 'var(--space-4)' }}>
          Describe a code change to predict downstream breakage, affected tests, and architectural violations.
        </p>
        <div style={{ position: 'relative' }}>
          <textarea
            className="input-field"
            style={{ height: 128, resize: 'none', padding: 'var(--space-4)', fontFamily: 'var(--font-mono)', lineHeight: 1.7 }}
            placeholder="e.g. Refactor the AuthProvider to use a new JWT secret management service..."
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
          />
          <button
            className="btn-primary"
            onClick={handleSimulate}
            disabled={loading || !proposal}
            style={{ position: 'absolute', bottom: 16, right: 16, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.06em' }}
          >
            {loading ? 'Simulating...' : 'Predict Impact'} <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {result && (
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
          {/* Severity Banner */}
          <div className="glass-card" style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            borderLeftColor: getSevColor(result.severityEstimate), borderLeftWidth: 3,
          }}>
            <div>
              <p className="text-label" style={{ fontSize: 11 }}>Predicted Severity</p>
              <p className="text-title" style={{ textTransform: 'capitalize' }}>{result.severityEstimate}</p>
            </div>
            <Shield size={32} style={{ color: getSevColor(result.severityEstimate) }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
            {/* Affected Components */}
            <div className="glass-card">
              <div className="card-header">
                <div className="card-accent-bar" style={{ background: 'var(--risk-critical)' }} />
                <span className="card-title">Affected Components</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {result.affected.map((aff, i) => (
                  <div key={i} style={{ padding: 'var(--space-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--bg-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span className="text-code" style={{ color: 'var(--accent-cyan)' }}>{aff.file}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(aff.confidence * 100).toFixed(0)}% Conf</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 'var(--space-1)' }}>{aff.why}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              {/* Mitigations */}
              <div className="glass-card">
                <div className="card-header">
                  <div className="card-accent-bar card-accent-bar--cyan" />
                  <span className="card-title">Recommended Mitigations</span>
                </div>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {result.recommendedMitigations.map((m, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-2)', fontSize: 13, color: 'var(--text-secondary)' }}>
                      <CheckCircle size={14} style={{ color: 'var(--risk-low)', marginTop: 2, flexShrink: 0 }} />
                      {m}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tests */}
              <div className="glass-card">
                <div className="card-header">
                  <div className="card-accent-bar" />
                  <span className="card-title">Tests Likely to Break</span>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {result.testsLikelyToBreak.map((t, i) => (
                    <span key={i} className="tech-tag">{t}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImpactSimulator;
