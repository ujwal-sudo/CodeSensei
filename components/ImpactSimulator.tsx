
import React, { useState } from 'react';
import { runImpactAnalysis } from '../services/geminiService';
import { CodeAnalysisResult, FileNode, ImpactPrediction } from '../types';
import { AlertTriangle, ArrowRight, Activity, CheckCircle, Shield } from 'lucide-react';

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

  return (
    <div className="h-full flex flex-col gap-6 animate-fade-in">
      <div className="glass-panel p-6 rounded-xl border border-white/5">
        <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
          <Activity className="text-neon-red" /> Impact Simulator
        </h3>
        <p className="text-slate-400 text-sm mb-4">
          Describe a code change to predict downstream breakage, affected tests, and architectural violations.
        </p>
        <div className="relative">
          <textarea
            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl p-4 text-slate-200 focus:border-neon-red focus:outline-none font-mono text-sm h-32 resize-none"
            placeholder="e.g. Refactor the AuthProvider to use a new JWT secret management service..."
            value={proposal}
            onChange={(e) => setProposal(e.target.value)}
          />
          <button
            onClick={handleSimulate}
            disabled={loading || !proposal}
            className="absolute bottom-4 right-4 bg-neon-red text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wide hover:bg-red-600 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? 'Simulating...' : 'Predict Impact'} <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {result && (
        <div className="flex-1 overflow-y-auto space-y-4">
          <div className={`p-4 rounded-xl border flex justify-between items-center ${
            result.severityEstimate === 'critical' ? 'bg-red-950/30 border-red-500/50' : 
            result.severityEstimate === 'high' ? 'bg-orange-950/30 border-orange-500/50' : 
            'bg-green-950/30 border-green-500/50'
          }`}>
             <div>
               <p className="text-xs uppercase text-slate-400 font-bold">Predicted Severity</p>
               <p className="text-2xl font-bold text-white capitalize">{result.severityEstimate}</p>
             </div>
             <Shield size={32} className={
               result.severityEstimate === 'critical' ? 'text-red-500' : 
               result.severityEstimate === 'high' ? 'text-orange-500' : 'text-green-500'
             } />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="glass-panel p-5 rounded-xl">
              <h4 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
                <AlertTriangle size={16} className="text-neon-red" /> Affected Components
              </h4>
              <div className="space-y-2">
                {result.affected.map((aff, i) => (
                  <div key={i} className="p-3 bg-slate-800/50 rounded border border-white/5">
                    <div className="flex justify-between">
                      <span className="text-neon-blue font-mono text-xs">{aff.file}</span>
                      <span className="text-xs text-slate-500">{(aff.confidence * 100).toFixed(0)}% Conf</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">{aff.why}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div className="glass-panel p-5 rounded-xl">
                 <h4 className="font-bold text-slate-200 mb-2 text-sm">Recommended Mitigations</h4>
                 <ul className="space-y-2">
                   {result.recommendedMitigations.map((m, i) => (
                     <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                       <CheckCircle size={14} className="text-neon-green mt-0.5 shrink-0" />
                       {m}
                     </li>
                   ))}
                 </ul>
              </div>
              <div className="glass-panel p-5 rounded-xl">
                 <h4 className="font-bold text-slate-200 mb-2 text-sm">Tests Likely to Break</h4>
                 <div className="flex flex-wrap gap-2">
                   {result.testsLikelyToBreak.map((t, i) => (
                     <span key={i} className="px-2 py-1 bg-slate-800 rounded text-xs font-mono text-slate-400 border border-slate-700">
                       {t}
                     </span>
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
