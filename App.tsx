
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Layers, Activity, Brain, GitBranch, MessageSquare, AlertTriangle,
  ArrowUp, Github, UploadCloud, CheckCircle, Loader2, Settings,
  Shield, Zap, Terminal, Tag, Play, Sparkles, FolderOpen
} from 'lucide-react';
import BrainMap from './components/BrainMap';
import ImpactSimulator from './components/ImpactSimulator';
import ExecutionCinematic from './components/ExecutionCinematic';
import { GlassPanel, NeonButton, SeverityPill, CardHeader } from './components/ui';
import GitHubImporter from './components/GitHubImporter';
import { chatWithContext } from './services/geminiService';
import { orchestrateAgentsStreaming } from './src/agentOrchestrator';
import { FileNode, CodeAnalysisResult, ViewState, ChatMessage, PartialCodeAnalysisResult, AgentStage } from './types';
import StitchBackground from './StitchBackground';

type StarDot = { xPct: number; yPct: number; sizePx: number; opacity: number };

// ── Simple markdown renderer ──
function renderMarkdown(text: string): React.ReactNode {
  const codeRegex = new RegExp('`([^`]+)`');
  const lines = text.split('\n');
  return lines.map((line, lineIdx) => {
    const parts: React.ReactNode[] = [];
    let remaining = line;
    let keyIdx = 0;
    while (remaining.length > 0) {
      const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
      const codeMatch = remaining.match(codeRegex);
      const matches = [
        boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
        codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
      ].filter(Boolean).sort((a, b) => a!.index - b!.index);
      if (matches.length === 0) { parts.push(remaining); break; }
      const first = matches[0]!;
      if (first.index > 0) parts.push(remaining.substring(0, first.index));
      if (first.type === 'bold') {
        parts.push(<strong key={`b-${lineIdx}-${keyIdx++}`} style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{first.match[1]}</strong>);
      } else if (first.type === 'code') {
        parts.push(<code key={`c-${lineIdx}-${keyIdx++}`} className="highlighted-term">{first.match[1]}</code>);
      }
      remaining = remaining.substring(first.index + first.match[0].length);
    }
    return (
      <React.Fragment key={`line-${lineIdx}`}>
        {parts}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

// ── Hexagon SVG for agent pipeline ──
const HexSvg: React.FC<{ fill: string; stroke: string }> = ({ fill, stroke }) => (
  <svg viewBox="0 0 52 52" width="52" height="52" style={{ position: 'absolute', inset: 0 }}>
    <polygon
      points="26,2 49,14 49,38 26,50 3,38 3,14"
      fill={fill}
      stroke={stroke}
      strokeWidth="1.5"
    />
  </svg>
);

// ── NavBar Hex Glyph ──
const HexGlyph: React.FC = () => (
  <svg className="navbar-glyph" viewBox="0 0 28 28" fill="none">
    <polygon points="14,1 26,7.5 26,20.5 14,27 2,20.5 2,7.5" stroke="#6C63FF" strokeWidth="1.5" fill="transparent" />
    <circle cx="14" cy="14" r="3" fill="#6C63FF" opacity="0.6" />
    <line x1="14" y1="7" x2="14" y2="11" stroke="#6C63FF" strokeWidth="1" opacity="0.4" />
    <line x1="14" y1="17" x2="14" y2="21" stroke="#6C63FF" strokeWidth="1" opacity="0.4" />
    <line x1="8" y1="14" x2="11" y2="14" stroke="#6C63FF" strokeWidth="1" opacity="0.4" />
    <line x1="17" y1="14" x2="20" y2="14" stroke="#6C63FF" strokeWidth="1" opacity="0.4" />
  </svg>
);

// ── Agent icons map ──
const AGENT_ICONS: Record<string, React.ElementType> = {
  structure: Layers,
  behavior: Activity,
  semantic: Tag,
  risk: Shield,
  execution: Play,
  synthesizer: Sparkles,
};

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [analysis, setAnalysis] = useState<CodeAnalysisResult | null>(null);
  const [partialAnalysis, setPartialAnalysis] = useState<PartialCodeAnalysisResult | null>(null);
  const [importSource, setImportSource] = useState<'local' | 'github'>('local');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStage, setCurrentStage] = useState<AgentStage>('init');
  const [stageMessage, setStageMessage] = useState('');
  const [completedAgents, setCompletedAgents] = useState<string[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [stars, setStars] = useState<StarDot[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, chatLoading]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList: File[] = Array.from(e.target.files);
      const codeFiles = fileList.filter((f: File) =>
        !f.name.startsWith('.') &&
        !(f as any).webkitRelativePath.includes('node_modules') &&
        !(f as any).webkitRelativePath.includes('dist') &&
        !f.name.endsWith('.png') && !f.name.endsWith('.jpg')
      );
      const processedFiles = await Promise.all(
        codeFiles.map(async (file: File) => ({
          path: (file as any).webkitRelativePath,
          content: await file.text(),
          language: file.name.split('.').pop() || 'text',
          size: file.size
        }))
      );
      handleFilesLoaded(processedFiles);
    }
  };

  const handleFilesLoaded = (loadedFiles: FileNode[]) => {
    if (!loadedFiles || loadedFiles.length === 0) {
      console.error('[Import] No files returned from GitHub import.');
      setStageMessage('Import failed: no files were fetched from this repository. Check your GitHub token or repo visibility.');
      setCurrentStage('error');
      return;
    }

    if (loadedFiles.length < 5) {
      console.warn(`[Import] Only ${loadedFiles.length} files fetched — analysis may be incomplete.`);
    }

    console.log('[Import] Files being analyzed:', loadedFiles.map(f => f.path));

    setFiles(loadedFiles);
    setAnalysis(null);
    setPartialAnalysis(null);
    setChatHistory([]);
    startStreamingAnalysis(loadedFiles);
  };

  const startStreamingAnalysis = async (filesToAnalyze: FileNode[]) => {
    if (filesToAnalyze.length === 0) return;
    setIsAnalyzing(true);
    setPartialAnalysis(null);
    setAnalysis(null);
    setCompletedAgents([]);
    setCurrentStage('init');
    setStageMessage('Initializing analysis...');

    try {
      const generator = orchestrateAgentsStreaming(filesToAnalyze);
      for await (const update of generator) {
        setCurrentStage(update.stage);
        setStageMessage(update.message);
        setCompletedAgents(update.partialResult.completedAgents || []);
        if (update.partialResult.graphData || update.partialResult.summary || update.partialResult.architecture) {
          setPartialAnalysis(update.partialResult);
        }
        if (update.partialResult.graphData && update.stage === 'structure') {
          setView('dashboard');
        }
        if (update.partialResult.isComplete) {
          setAnalysis(update.partialResult as CodeAnalysisResult);
        }
      }
    } catch (error: any) {
      console.error('[Streaming Analysis] Error:', error);
      setStageMessage(`Error: ${error.message}`);
      setCurrentStage('error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !analysis) return;
    const userMsg: ChatMessage = { role: 'user', text: chatInput, timestamp: Date.now() };
    setChatHistory(prev => [...prev, userMsg]);
    setChatInput('');
    setChatLoading(true);
    try {
      const response = await chatWithContext(chatHistory, chatInput, analysis);
      setChatHistory(prev => [...prev, { role: 'model', text: response, timestamp: Date.now() }]);
    } catch (e) { console.error(e); }
    finally { setChatLoading(false); }
  };

  const handleImportError = (msg: string) => {
    console.warn(`[Import Error] ${msg}`);
    setStageMessage(msg);
    setCurrentStage('error');
  };

  const handleReset = () => {
    setAnalysis(null);
    setPartialAnalysis(null);
    setFiles([]);
    setImportSource('local');
    setCompletedAgents([]);
    setChatHistory([]);
    setView('dashboard');
  };

  const effectiveAnalysis = analysis || partialAnalysis;
  const riskList = effectiveAnalysis?.risks || [];
  const highCount = riskList.filter(r => {
    const sev = (r.severity ?? '').toString().toLowerCase();
    return sev === 'high' || sev === 'critical';
  }).length;
  const mediumCount = riskList.filter(r => (r.severity ?? '').toString().toLowerCase() === 'medium').length;
  const lowCount = riskList.filter(r => (r.severity ?? '').toString().toLowerCase() === 'low').length;
  const totalRisks = riskList.length;
  const maxRiskCount = Math.max(highCount, mediumCount, lowCount, 1);

  const hasGraphData = (effectiveAnalysis?.graphData?.nodes?.length || 0) > 0;
  const hasRisks = riskList.length > 0;
  const hasSummary = !!effectiveAnalysis?.summary;
  const hasArchitecture = !!effectiveAnalysis?.architecture;
  const hasAnyData = hasGraphData || hasSummary || hasArchitecture || hasRisks;
  const showAgentProgress = isAnalyzing && !hasAnyData;
  const showLanding = !effectiveAnalysis && !isAnalyzing;

  useEffect(() => {
    if (!showLanding) return;
    const dots: StarDot[] = Array.from({ length: 90 }).map(() => ({
      xPct: Math.random() * 100,
      yPct: Math.random() * 100,
      sizePx: 0.5 + Math.random() * 1.5,
      opacity: 0.1 + Math.random() * 0.5,
    }));
    setStars(dots);
  }, [showLanding]);

  const NAV_TABS = [
    { id: 'dashboard', label: 'Overview', ready: hasAnyData },
    { id: 'brainMap', label: 'Brain Map', ready: hasGraphData },
    { id: 'riskCenter', label: 'Risk Center', ready: hasRisks || isAnalyzing },
    { id: 'chat', label: 'Chat', ready: hasAnyData },
  ];

  const AGENTS = [
    { id: 'structure', label: 'Structure' },
    { id: 'behavior', label: 'Behavior' },
    { id: 'semantic', label: 'Semantic' },
    { id: 'risk', label: 'Risk' },
    { id: 'execution', label: 'Execution' },
    { id: 'synthesizer', label: 'Synthesizer' },
  ];

  return (
    <div className="app-layout">
      <StitchBackground />
      {/* ── Navigation Bar ── */}
      <nav className="cs-nav">
        <div className="cs-nav-inner">
          <div className="cs-nav-left" onClick={handleReset} role="button" aria-label="Reset to landing">
            <div className="cs-logo">C&gt;</div>
            <div className="cs-wordmark">
              <div className="cs-wordmark-top">CODESENSEI</div>
              <div className="cs-wordmark-sub">AI ARCHITECT OS</div>
            </div>
          </div>

          <div className="cs-nav-center">
            {effectiveAnalysis ? (
              NAV_TABS.map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  className={`cs-nav-link ${view === tab.id ? 'cs-nav-link--active' : ''}`}
                  onClick={() => tab.ready && setView(tab.id as ViewState)}
                  disabled={!tab.ready}
                >
                  {tab.label}
                  {!tab.ready && isAnalyzing && <Loader2 size={12} className="spinner" style={{ marginLeft: 8, color: 'var(--text-muted)' }} />}
                </button>
              ))
            ) : (
              <>
                <button className="cs-nav-link" type="button">Dashboard</button>
                <button className="cs-nav-link" type="button">Projects</button>
                <button className="cs-nav-link" type="button">Docs</button>
              </>
            )}
          </div>

          <div className="cs-nav-right">
            <div className="cs-status-pill">
              <span className="cs-pulse-dot" />
              {isAnalyzing ? 'Analyzing · Live' : 'Nemotron / GPT-OSS · Live'}
            </div>
            <button className="cs-new-project" onClick={handleReset} type="button">
              New Project
            </button>
          </div>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <main className="main-content">

        {/* ══ Landing / Import ══ */}
        {showLanding && (
          <div className="cs-landing">
            <section className="cs-landing-hero">
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '0 16px',
                  textAlign: 'center',
                }}
              >
                {/* Status chip */}
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 14px',
                    borderRadius: 20,
                    background: 'rgba(124,58,237,0.12)',
                    border: '1px solid rgba(124,58,237,0.3)',
                    fontSize: 11,
                    color: 'var(--purple-mid)',
                    marginBottom: 28,
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: 9999, background: 'var(--purple-strong)' }} />
                  Multi-agent analysis · v2.4 · Production ready
                </div>

                {/* Headline */}
                <h1
                  style={{
                    fontSize: 'clamp(28px, 8vw, 52px)',
                    fontWeight: 700,
                    textAlign: 'center',
                    lineHeight: 1.1,
                    letterSpacing: '-0.02em',
                    marginBottom: 16,
                    color: 'var(--text-primary)',
                  }}
                >
                  <span style={{ display: 'block', color: 'var(--text-primary)' }}>Understand any</span>
                  <span
                    style={{
                      display: 'block',
                      background: 'linear-gradient(135deg, #a78bfa 0%, #06b6d4 50%, #7c3aed 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    codebase instantly.
                  </span>
                </h1>

                {/* Subheading */}
                <p
                  style={{
                    fontSize: 16,
                    color: 'var(--text-muted)',
                    textAlign: 'center',
                    maxWidth: 480,
                    lineHeight: 1.6,
                    marginBottom: 36,
                  }}
                >
                  Feed it a repo. Get a complete architectural brain map, risk assessment, and AI-powered execution simulation.
                </p>

                {/* Feature chips */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 48 }}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 11, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)', color: 'var(--purple-mid)' }}>⬡ Brain Map</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 11, background: 'rgba(6,182,212,0.07)', border: '1px solid rgba(6,182,212,0.3)', color: '#67e8f9' }}>⚡ Risk Scoring</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 11, background: 'rgba(62,207,142,0.07)', border: '1px solid rgba(62,207,142,0.3)', color: '#6ee7b7' }}>✦ AI Chat</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 20, fontSize: 11, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', color: 'var(--text-secondary)' }}>↻ Execution Flow</span>
                </div>

                {/* Input section */}
                <div style={{ width: '100%', maxWidth: 620 }}>
                  {/* Tab switcher */}
                  <div style={{ display: 'flex', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: 3, border: '1px solid rgba(255,255,255,0.07)', marginBottom: 12 }}>
                    <button
                      type="button"
                      onClick={() => setImportSource('github')}
                      style={{
                        flex: 1,
                        padding: '7px 16px',
                        borderRadius: 6,
                        fontSize: 12,
                        textAlign: 'center',
                        color: importSource === 'github' ? 'var(--purple-mid)' : 'var(--text-muted)',
                        background: importSource === 'github' ? 'rgba(124,58,237,0.25)' : 'transparent',
                        border: importSource === 'github' ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <Github size={14} />
                      GitHub Import
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportSource('local')}
                      style={{
                        flex: 1,
                        padding: '7px 16px',
                        borderRadius: 6,
                        fontSize: 12,
                        textAlign: 'center',
                        color: importSource === 'local' ? 'var(--purple-mid)' : 'var(--text-muted)',
                        background: importSource === 'local' ? 'rgba(124,58,237,0.25)' : 'transparent',
                        border: importSource === 'local' ? '1px solid rgba(124,58,237,0.3)' : '1px solid transparent',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 8,
                      }}
                    >
                      <UploadCloud size={14} />
                      Local Upload
                    </button>
                  </div>

                  {/* Panels */}
                  {importSource === 'github' ? (
                    <div>
                      <GitHubImporter onImportComplete={handleFilesLoaded} onError={handleImportError} />
                    </div>
                  ) : (
                    <div>
                      <div
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); }}
                        role="button"
                        style={{
                          border: '1.5px dashed rgba(124,58,237,0.3)',
                          borderRadius: 12,
                          padding: '32px 20px',
                          textAlign: 'center',
                          cursor: 'pointer',
                          background: dragOver ? 'rgba(124,58,237,0.08)' : 'rgba(124,58,237,0.04)',
                          transition: 'all 0.2s ease',
                        }}
                      >
                        <div style={{ fontSize: 28, opacity: 0.6, marginBottom: 10 }}>⬡</div>
                        <div style={{ fontSize: 14, fontWeight: 500, color: '#c4b5fd', marginBottom: 4 }}>
                          Drop your project folder here
                        </div>
                        <div style={{ fontSize: 12, color: '#4a4460' }}>
                          Supports any language · Scans recursively · Stays local
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            marginTop: 16,
                            padding: '9px 24px',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 600,
                            background: 'linear-gradient(135deg, #7c3aed, #06b6d4)',
                            color: '#fff',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          Select Folder
                        </button>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        {...{ webkitdirectory: "" } as any}
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                      />
                    </div>
                  )}

                  {/* No account line */}
                  <div style={{ textAlign: 'center', marginTop: 16, fontSize: 12, color: '#4a4460' }}>
                    No account needed ·{' '}
                    <a
                      href="#"
                      onClick={(e) => e.preventDefault()}
                      style={{ color: 'var(--purple-strong)', textDecoration: 'none' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--purple-mid)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--purple-strong)'; }}
                    >
                      Try the live demo →
                    </a>
                  </div>
                </div>

                {/* Stats row */}
                <div
                  className="cs-stats-row"
                  style={{
                    display: 'flex',
                    gap: 32,
                    alignItems: 'center',
                    marginTop: 52,
                    justifyContent: 'center',
                  }}
                >
                  {[
                    { number: '142+', plusPurple: true, label: 'Repos analyzed' },
                    { number: '4', label: 'AI agents' },
                    { number: '<30s', label: 'Full analysis' },
                    { number: 'Nemotron', label: 'Powered by' },
                  ].map((s, i) => (
                    <React.Fragment key={s.label}>
                      <div style={{ textAlign: 'center', minWidth: 110 }}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text-primary)' }}>
                          {s.plusPurple ? (
                            <>
                              <span>142</span><span style={{ color: 'var(--purple-strong)' }}>+</span>
                            </>
                          ) : (
                            s.number
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: '#4a4460', marginTop: 2 }}>{s.label}</div>
                      </div>
                      {i < 3 && (
                        <div
                          style={{
                            width: 1,
                            height: 28,
                            background: 'rgba(255,255,255,0.06)',
                          }}
                          className="cs-stat-divider"
                        />
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* ══ Analyzing Progress ══ */}
        {showAgentProgress && (
          <div className="landing-container">
            <div className="glass-card" style={{ maxWidth: 500, width: '100%', textAlign: 'center' }}>
              <h3 className="text-heading" style={{ marginBottom: 'var(--space-2)' }}>Analyzing Architecture</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 'var(--space-6)' }}>{stageMessage}</p>
              <div className="agent-progress">
                {AGENTS.map(agent => {
                  const isComplete = completedAgents.includes(agent.id);
                  const isActive = currentStage === agent.id ||
                    (currentStage === 'parallel_reasoning' && ['behavior', 'semantic'].includes(agent.id)) ||
                    (currentStage === 'execution_simulation' && ['risk', 'execution'].includes(agent.id)) ||
                    (currentStage === 'synthesis' && agent.id === 'synthesizer');
                  const Icon = AGENT_ICONS[agent.id] || Layers;
                  return (
                    <div key={agent.id} className={`agent-progress-item ${isComplete ? 'agent-progress-item--complete' : isActive ? 'agent-progress-item--active' : ''}`}>
                      <Icon size={16} style={{ color: isComplete ? 'var(--risk-low)' : isActive ? 'var(--accent-indigo)' : 'var(--text-muted)' }} />
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 500, color: isComplete ? 'var(--risk-low)' : isActive ? 'var(--accent-indigo)' : 'var(--text-muted)' }}>
                        {agent.label}
                      </span>
                      {isComplete && <CheckCircle size={14} style={{ color: 'var(--risk-low)' }} />}
                      {isActive && !isComplete && <Loader2 size={14} className="spinner" style={{ color: 'var(--accent-indigo)' }} />}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══ Dashboard / Overview ══ */}
        {effectiveAnalysis && view === 'dashboard' && hasAnyData && (
          <div className="bento-grid">
            {/* Agent Pipeline — full width */}
            <div className="glass-card bento-full">
              <CardHeader title="Agent Pipeline" />
              <div className="agent-pipeline">
                {AGENTS.map((agent, i) => {
                  const isComplete = completedAgents.includes(agent.id);
                  const isActive = currentStage === agent.id ||
                    (currentStage === 'parallel_reasoning' && ['behavior', 'semantic'].includes(agent.id)) ||
                    (currentStage === 'execution_simulation' && ['risk', 'execution'].includes(agent.id)) ||
                    (currentStage === 'synthesis' && agent.id === 'synthesizer');
                  const Icon = AGENT_ICONS[agent.id] || Layers;

                  return (
                    <React.Fragment key={agent.id}>
                      <div className="agent-node">
                        <div className={`agent-hex ${isActive && !isComplete ? 'agent-hex--running' : ''}`}>
                          <HexSvg
                            fill={isComplete ? '#6C63FF' : isActive ? 'rgba(108,99,255,0.12)' : '#13131F'}
                            stroke={isComplete || isActive ? '#6C63FF' : '#1E1E35'}
                          />
                          <Icon
                            size={18}
                            className="agent-hex__icon"
                            style={{ color: isComplete ? '#F0EFFF' : isActive ? '#6C63FF' : '#8B8BA0' }}
                          />
                        </div>
                        <span className="agent-name">{agent.label}</span>
                      </div>
                      {i < AGENTS.length - 1 && (
                        <div className={`agent-connector ${isComplete ? 'agent-connector--complete' : ''}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* Architecture Summary — 2 cols */}
            <div className="glass-card bento-2col" style={{ height: 'fit-content' }}>
              <CardHeader title="Architecture Summary" />
              <div
                style={{
                  maxHeight: 600,
                  overflowY: 'auto',
                  paddingRight: 4,
                  scrollbarWidth: 'thin',
                  scrollbarColor: 'rgba(124,58,237,0.3) transparent',
                }}
              >
                {hasSummary ? (
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8, fontSize: 15 }}>
                    {effectiveAnalysis.summary}
                  </p>
                ) : (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Generating summary…</p>
                )}
                {hasArchitecture && (
                  <p style={{ color: 'var(--text-secondary)', fontSize: 14, whiteSpace: 'pre-line', marginTop: 'var(--space-4)', lineHeight: 1.7, borderTop: '1px solid var(--bg-border)', paddingTop: 'var(--space-4)' }}>
                    {effectiveAnalysis.architecture}
                  </p>
                )}
              </div>
              {/* Tech stack tags */}
              {(effectiveAnalysis.techStack || []).length > 0 && (
                <div style={{ marginTop: 'var(--space-4)', display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                  {effectiveAnalysis.techStack!.map(t => (
                    <span key={t} className="tech-tag">{t}</span>
                  ))}
                </div>
              )}
            </div>

            {/* Key Metrics — compact grid */}
            <div className="glass-card" style={{ alignSelf: 'flex-start', height: 'fit-content' }}>
              <CardHeader title="Key Metrics" cyan />
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 12,
                  padding: 16,
                }}
              >
                {/* Files analyzed */}
                <div
                  style={{
                    background: 'rgba(124,58,237,0.08)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    borderRadius: 10,
                    padding: '14px 16px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: '#e2e8f0',
                      lineHeight: 1,
                      marginBottom: 6,
                    }}
                  >
                    {files.length || '—'}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: '#64748b',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Files Analyzed
                  </div>
                </div>

                {/* Graph nodes */}
                <div
                  style={{
                    background: 'rgba(124,58,237,0.08)',
                    border: '1px solid rgba(124,58,237,0.2)',
                    borderRadius: 10,
                    padding: '14px 16px',
                  }}
                >
                  <div
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: '#e2e8f0',
                      lineHeight: 1,
                      marginBottom: 6,
                    }}
                  >
                    {effectiveAnalysis.graphData?.nodes?.length || '—'}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: '#64748b',
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Graph Nodes
                  </div>
                </div>

                {/* Risks found */}
                {(() => {
                  const riskCount = effectiveAnalysis.risks?.length || 0;
                  const hasRisksAny = riskCount > 0;
                  return (
                    <div
                      style={{
                        background: hasRisksAny ? 'rgba(226,75,74,0.08)' : 'rgba(124,58,237,0.08)',
                        border: hasRisksAny
                          ? '1px solid rgba(226,75,74,0.3)'
                          : '1px solid rgba(124,58,237,0.2)',
                        borderRadius: 10,
                        padding: '14px 16px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: 28,
                          fontWeight: 700,
                          color: hasRisksAny ? '#e24b4a' : '#e2e8f0',
                          lineHeight: 1,
                          marginBottom: 6,
                        }}
                      >
                        {riskCount || '—'}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          fontWeight: 500,
                          color: '#64748b',
                          letterSpacing: '0.08em',
                          textTransform: 'uppercase',
                        }}
                      >
                        Risks Found
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Risk Snapshot — 2 cols */}
            {hasRisks && (
              <div className="glass-card bento-2col">
                <CardHeader title="Risk Snapshot" />
                <div style={{ padding: 16 }}>
                  {totalRisks === 0 ? (
                    <div style={{
                      textAlign: 'center',
                      padding: '24px',
                      color: '#4a4460',
                      fontSize: '13px',
                    }}>
                      No risks detected
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                      {[
                        {
                          label: 'Critical / High',
                          count: highCount,
                          color: '#e24b4a',
                          bgColor: 'rgba(226,75,74,0.15)',
                          badgeColor: 'rgba(226,75,74,0.2)',
                          badgeText: '#e24b4a',
                        },
                        {
                          label: 'Medium',
                          count: mediumCount,
                          color: '#f59e0b',
                          bgColor: 'rgba(245,158,11,0.15)',
                          badgeColor: 'rgba(245,158,11,0.2)',
                          badgeText: '#f59e0b',
                        },
                        {
                          label: 'Low',
                          count: lowCount,
                          color: '#3ecf8e',
                          bgColor: 'rgba(62,207,142,0.15)',
                          badgeColor: 'rgba(62,207,142,0.2)',
                          badgeText: '#3ecf8e',
                        },
                      ].map(bar => (
                        <div key={bar.label}>
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            marginBottom: '6px',
                          }}>
                            <span style={{
                              fontSize: '11px',
                              fontWeight: '600',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: bar.badgeColor,
                              color: bar.badgeText,
                              minWidth: '60px',
                              textAlign: 'center',
                            }}>
                              {bar.label}
                            </span>
                            <div style={{
                              flex: 1,
                              height: '6px',
                              borderRadius: '3px',
                              background: 'rgba(255,255,255,0.06)',
                              overflow: 'hidden',
                            }}>
                              <div style={{
                                height: '100%',
                                borderRadius: '3px',
                                background: bar.color,
                                width: `${(bar.count / maxRiskCount) * 100}%`,
                                transition: 'width 0.6s ease',
                                minWidth: bar.count > 0 ? '6px' : '0',
                              }} />
                            </div>
                            <span style={{
                              fontSize: '13px',
                              fontWeight: '700',
                              color: bar.count > 0 ? bar.badgeText : '#4a4460',
                              minWidth: '16px',
                              textAlign: 'right',
                            }}>
                              {bar.count}
                            </span>
                          </div>
                        </div>
                      ))}

                      <div style={{
                        marginTop: '4px',
                        paddingTop: '12px',
                        borderTop: '1px solid rgba(255,255,255,0.06)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '11px',
                        color: '#64748b',
                      }}>
                        <span>Total risks identified</span>
                        <span style={{
                          color: '#e2e8f0',
                          fontWeight: '600',
                        }}>
                          {totalRisks}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Critical Risks Preview — 1 col */}
            {hasRisks && (
              <div className="glass-card">
                <CardHeader title="Top Risks" />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                  {effectiveAnalysis.risks!.slice(0, 3).map(risk => (
                    <div key={risk.id} style={{
                      padding: 'var(--space-3)',
                      borderRadius: 'var(--radius-sm)',
                      borderLeft: `3px solid ${risk.severity === 'critical' ? 'var(--risk-critical)' : risk.severity === 'high' ? 'var(--risk-high)' : 'var(--risk-medium)'}`,
                      background: 'var(--bg-elevated)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{risk.title}</span>
                        <SeverityPill severity={risk.severity} />
                      </div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{risk.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══ Brain Map ══ */}
        {effectiveAnalysis && view === 'brainMap' && hasGraphData && (
          <div style={{ height: '100%', position: 'relative', borderRadius: 'var(--radius-lg)', overflow: 'hidden', border: '1px solid var(--bg-border)' }}>
            <BrainMap
              data={effectiveAnalysis.graphData!}
              onNodeClick={(node) => console.log(node)}
            />
            <div style={{ position: 'absolute', top: 'var(--space-4)', left: 'var(--space-4)', pointerEvents: 'none' }}>
              <div className="glass-card" style={{ padding: 'var(--space-2) var(--space-4)' }}>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--accent-indigo)', textTransform: 'uppercase' }}>
                  Interactive Topology
                  {isAnalyzing && <Loader2 size={12} className="spinner" style={{ marginLeft: 8, display: 'inline' }} />}
                </p>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                  {effectiveAnalysis.graphData?.nodes?.length ?? 0} Modules · {effectiveAnalysis.graphData?.links?.length ?? 0} Edges
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ══ Risk Center ══ */}
        {effectiveAnalysis && view === 'riskCenter' && (
          hasRisks ? (
            <div style={{ animation: 'fade-up 400ms ease-out', height: '100%', maxHeight: 'calc(100vh - 52px)', overflowY: 'auto' }}>
            <div
              style={{
                position: 'sticky',
                top: 0,
                zIndex: 10,
                background: '#09090f',
                paddingBottom: '12px',
              }}
            >
              <h2 className="text-title" style={{ marginBottom: 'var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                Risk Assessment Report
                {isAnalyzing && <Loader2 size={20} className="spinner" style={{ color: 'var(--accent-indigo)' }} />}
              </h2>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {riskList.length} risks across critical, high, medium, and low severity.
              </span>
            </div>
            <div className="risk-grid">
              {riskList.map(risk => (
                <div key={risk.id} className={`risk-card risk-card--${risk.severity}`}>
                  <div className="risk-card__top">
                    <SeverityPill severity={risk.severity} />
                    <span className="risk-card__file">{risk.location}</span>
                  </div>
                  <div className="risk-card__title">{risk.title}</div>
                  <div className="risk-card__desc">{risk.description}</div>
                  <hr className="risk-card__divider" />
                  <div className="risk-card__mitigation-label">Mitigation</div>
                  {risk.mitigation.map((m, i) => (
                    <p key={i} className="risk-card__mitigation-text" style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                      <CheckCircle size={13} style={{ color: 'var(--risk-low)', marginTop: 2, flexShrink: 0 }} />
                      {m}
                    </p>
                  ))}
                </div>
              ))}
            </div>
          </div>
          ) : isAnalyzing ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Loader2 className="spinner" size={24} style={{ marginRight: 12, color: 'var(--accent-indigo)' }} />
              Analysis in progress... Finding security risks.
            </div>
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              No risks found.
            </div>
          )
        )}

        {/* ══ Chat ══ */}
        {effectiveAnalysis && view === 'chat' && (
          hasSummary ? (
            <div className="chat-panel">
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                padding: '6px 12px',
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.2)',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#a78bfa',
                marginBottom: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7c3aed' }} />
                Aware of {files.length} files · {(effectiveAnalysis.risks || []).length} risks · full repo context
              </div>
              {chatHistory.filter(m => m.role !== 'system').length > 0 && (
                <span style={{ fontSize: '10px', color: '#4a4460' }}>
                  {Math.floor(chatHistory.length / 2)} exchanges in memory
                </span>
              )}
            </div>
            <div className="glass-card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginBottom: 'var(--space-4)' }}>
              <div className="chat-messages">
                {chatHistory.length === 0 && (
                  <div className="chat-empty">
                    <MessageSquare size={48} style={{ opacity: 0.3 }} />
                    <p>Ask me anything about the codebase…</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                  <div key={i} className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-ai'}>
                    {msg.role === 'model' ? renderMarkdown(msg.text) : msg.text}
                  </div>
                ))}
                {chatLoading && (
                  <div className="chat-bubble-ai">
                    <div className="loading-dots">
                      <div className="loading-dot" />
                      <div className="loading-dot" />
                      <div className="loading-dot" />
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
            </div>
            <div className="chat-input-area">
              <input
                className="chat-input"
                placeholder="Type your query..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button className="chat-send-btn" onClick={handleSendMessage} disabled={chatLoading}>
                <ArrowUp size={18} />
              </button>
            </div>
          </div>
          ) : isAnalyzing ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              <Loader2 className="spinner" size={24} style={{ marginRight: 12, color: 'var(--accent-indigo)' }} />
              Analysis in progress... Building codebase context.
            </div>
          ) : (
             <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Chat is currently unavailable.
            </div>
          )
        )}

      </main>
    </div>
  );
}
