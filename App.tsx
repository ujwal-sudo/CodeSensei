
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Layers, Activity, Brain, GitBranch, MessageSquare, AlertTriangle,
  ArrowUp, Github, UploadCloud, CheckCircle, Loader2, Settings,
  Shield, Zap, Terminal, Tag, Play, Sparkles, FolderOpen
} from 'lucide-react';
import BrainMap from './components/BrainMap';
import ExecutionCinematic from './components/ExecutionCinematic';
import { GlassPanel, NeonButton, SeverityPill, CardHeader } from './components/ui';
import GitHubImporter from './components/GitHubImporter';
import NeuralGrid from './components/NeuralGrid';
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
    <>
      {/* SideNavBar */}
      <aside className="w-sidebar-width h-screen fixed left-0 top-0 bg-surface-container-lowest border-r border-outline-variant flex flex-col py-lg z-40 hidden md:flex">
        <div className="px-6 mb-8 flex items-center gap-3" onClick={handleReset} role="button" aria-label="Reset to landing" style={{cursor: 'pointer'}}>
          <div className="w-8 h-8 rounded bg-primary-container flex items-center justify-center text-on-primary font-bold">C</div>
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-on-surface">CodeSensei</h1>
            <span className="font-label-caps text-label-caps text-on-surface-variant">v1.0.4-alpha</span>
          </div>
        </div>
        <div className="px-4 mb-6">
          <button className="w-full bg-primary-container text-on-primary font-body-sm font-medium py-2 px-4 rounded-panel flex items-center justify-center gap-2 hover:opacity-90 transition-opacity" onClick={handleReset}>
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Repository
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 space-y-1">
          <div className="mb-4">
            <span className="px-4 font-label-caps text-label-caps text-on-surface-variant block mb-2">Analysis</span>
            <a className={`px-4 py-2 flex items-center gap-3 transition-colors cursor-pointer rounded ${view === 'dashboard' ? 'bg-secondary-container text-primary-fixed border-l-2 border-primary-fixed' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`} onClick={() => setView('dashboard')}>
              <span className="material-symbols-outlined text-[20px]" style={view === 'dashboard' ? {fontVariationSettings: "'FILL' 1"} : {}}>dashboard</span>
              <span className="font-body-md">Overview</span>
            </a>
            {AGENTS.map(agent => (
              <a key={agent.id} className="text-on-surface-variant px-4 py-2 flex items-center gap-3 hover:bg-surface-container-high hover:text-on-surface transition-colors cursor-pointer rounded">
                <span className="material-symbols-outlined text-[20px]">
                  {agent.id === 'structure' ? 'account_tree' : agent.id === 'behavior' ? 'psychology' : agent.id === 'semantic' ? 'database' : agent.id === 'risk' ? 'security' : agent.id === 'execution' ? 'terminal' : agent.id === 'synthesizer' ? 'auto_awesome' : 'circle'}
                </span>
                <span className="font-body-md">{agent.label} Agent</span>
              </a>
            ))}
          </div>
          <div className="mb-4">
            <span className="px-4 font-label-caps text-label-caps text-on-surface-variant block mb-2">Insights</span>
            <a className={`px-4 py-2 flex items-center gap-3 transition-colors cursor-pointer rounded ${view === 'brainMap' ? 'bg-secondary-container text-primary-fixed border-l-2 border-primary-fixed' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`} onClick={() => setView('brainMap')}>
              <span className="material-symbols-outlined text-[20px]">insights</span>
              <span className="font-body-md">Brain Map</span>
            </a>
            <a className={`px-4 py-2 flex items-center gap-3 transition-colors cursor-pointer rounded ${view === 'riskCenter' ? 'bg-secondary-container text-primary-fixed border-l-2 border-primary-fixed' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`} onClick={() => setView('riskCenter')}>
              <span className="material-symbols-outlined text-[20px]">emergency_home</span>
              <span className="font-body-md">Risk Center</span>
            </a>
            <a className={`px-4 py-2 flex items-center gap-3 transition-colors cursor-pointer rounded ${view === 'chat' ? 'bg-secondary-container text-primary-fixed border-l-2 border-primary-fixed' : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'}`} onClick={() => setView('chat')}>
              <span className="material-symbols-outlined text-[20px]">chat</span>
              <span className="font-body-md">Context Chat</span>
            </a>
          </div>
        </nav>
      </aside>

      {/* Main Canvas */}
      <main className="flex-1 flex flex-col ml-0 md:ml-sidebar-width min-w-0 bg-[#0A0C0B]">
        {/* TopAppBar */}
        <header className="h-16 sticky top-0 z-30 bg-surface dark:bg-surface border-b border-outline-variant flex items-center justify-between px-lg w-full flex-shrink-0">
          <div className="flex items-center gap-6">
            <button className="md:hidden text-on-surface-variant hover:text-on-surface">
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-on-surface-variant text-[20px]">folder</span>
              <span className="font-code-md text-code-md text-on-surface">
                {files.length > 0 ? "codesensei-core-v2" : "Select a repository"}
              </span>
              <span className="bg-surface-container-high text-on-surface-variant font-label-caps px-2 py-0.5 rounded text-[10px] ml-2 border border-outline-variant">MAIN</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center gap-6 h-full">
            <a className="text-primary-fixed border-b-2 border-primary-fixed pb-[18px] mt-[18px] font-bold h-full flex items-center" href="#">Main</a>
            <a className="text-on-surface-variant font-medium hover:text-on-surface hover:bg-surface-container transition-all h-full flex items-center px-3 mt-1 rounded-t" href="#">Risk</a>
            <a className="text-on-surface-variant font-medium hover:text-on-surface hover:bg-surface-container transition-all h-full flex items-center px-3 mt-1 rounded-t" href="#">Chatbot</a>
          </nav>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 border-r border-outline-variant pr-4">
              <div className="flex items-center gap-2 text-on-surface-variant text-sm px-2">
                <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-primary-fixed animate-pulse' : 'bg-outline-variant'}`}></div>
                {isAnalyzing ? 'Analyzing...' : 'Ready'}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-primary-container text-on-primary font-body-sm font-medium px-4 py-1.5 rounded hover:opacity-90 transition-opacity">Deploy</button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin">
          
          {/* Landing Import section if no files */}
          {(!effectiveAnalysis && !isAnalyzing) && (
            <div className="flex flex-col gap-6 items-center justify-center mt-20 relative z-10">
              {/* Grid goes first, sits behind everything */}
              <NeuralGrid />

              <div className="text-center relative z-10">
                <h1 className="text-[4rem] md:text-[7rem] font-headline-xl font-bold tracking-tighter leading-none text-on-surface mb-4">
                    Code<span className="text-primary-container">Sensei</span>
                  </h1>
                  <h2 className="text-on-surface-variant font-headline-lg text-headline-lg font-medium">Import a project to begin</h2>
                </div>
                <div className="flex gap-4 mt-16 relative z-10">
                    <button className="bg-primary-container text-on-primary px-6 py-3 rounded hover:opacity-90 transition-opacity font-bold" onClick={() => setImportSource('github')}>GitHub Import</button>
                    <button className="border border-outline-variant text-on-surface px-6 py-3 rounded hover:bg-surface-container transition-opacity font-bold" onClick={() => fileInputRef.current?.click()}>Local Folder</button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        {...{ webkitdirectory: "" } as any}
                        multiple
                        style={{ display: 'none' }}
                        onChange={handleFileUpload}
                    />
                </div>
                {importSource === 'github' && (
                    <div className="w-full max-w-2xl mt-4">
                        <GitHubImporter onImportComplete={handleFilesLoaded} onError={handleImportError} />
                    </div>
                )}
            </div>
          )}

          {(effectiveAnalysis || isAnalyzing) && (
            <>
              {/* Metric Row */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="panel p-4 flex flex-col justify-between h-[88px] interactive">
                  <span className="font-label-caps text-on-surface-variant">Total Files</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline-lg text-headline-lg text-on-surface">{files.length || '—'}</span>
                  </div>
                </div>
                <div className="panel p-4 flex flex-col justify-between h-[88px] interactive">
                  <span className="font-label-caps text-on-surface-variant">Total LOC</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline-lg text-headline-lg text-on-surface">
                        {files.reduce((acc, f) => acc + (f.content ? f.content.split('\n').length : 0), 0) || '—'}
                    </span>
                  </div>
                </div>
                <div className="panel p-4 flex flex-col justify-between h-[88px] interactive">
                  <span className="font-label-caps text-on-surface-variant">Nodes</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline-lg text-headline-lg text-on-surface">{effectiveAnalysis?.graphData?.nodes?.length || '—'}</span>
                  </div>
                </div>
                <div className="panel p-4 flex flex-col justify-between h-[88px] interactive border-error/30 hover:border-error/50">
                  <span className="font-label-caps text-error">Risks Detected</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline-lg text-headline-lg text-error">{effectiveAnalysis?.risks?.length || '0'}</span>
                    <span className="material-symbols-outlined text-error text-[16px]">warning</span>
                  </div>
                </div>
                <div className="panel p-4 flex flex-col justify-between h-[88px] interactive">
                  <span className="font-label-caps text-on-surface-variant">Analysis Time</span>
                  <div className="flex items-baseline gap-2">
                    <span className="font-headline-lg text-headline-lg text-primary-fixed">1.2s</span>
                    <span className="text-on-surface-variant font-body-sm">avg</span>
                  </div>
                </div>
              </div>

              {/* Dashboard Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-220px)] min-h-[600px]">
                {/* Left Column (Featured) */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                  {/* Brain Map Canvas */}
                  <div className="panel flex-1 flex flex-col overflow-hidden relative group">
                    <div className="panel-header flex justify-between items-center bg-[#111512]/80 backdrop-blur z-10 absolute top-0 w-full border-b-0 group-hover:border-b border-outline-variant transition-all">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary-fixed text-[18px]">insights</span>
                        <h2 className="font-code-md text-code-md font-medium">Brain Map Visualization</h2>
                      </div>
                      <div className="flex gap-2">
                        <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant"><span className="material-symbols-outlined text-[16px]">zoom_in</span></button>
                        <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-container-high text-on-surface-variant"><span className="material-symbols-outlined text-[16px]">zoom_out</span></button>
                      </div>
                    </div>
                    <div className="flex-1 bg-[#0d0f0e] relative overflow-hidden" style={{backgroundImage: 'radial-gradient(#252C27 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
                      {hasGraphData ? (
                          <div className="w-full h-full pt-12"><BrainMap data={effectiveAnalysis.graphData!} onNodeClick={() => {}} /></div>
                      ) : (
                          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                              <div className="w-16 h-16 rounded-full bg-surface-container-lowest border border-primary-fixed flex items-center justify-center pulse-lime z-20 relative shadow-[0_0_15px_rgba(183,243,74,0.2)]">
                                <span className="material-symbols-outlined text-primary-fixed">auto_awesome</span>
                              </div>
                          </div>
                      )}
                    </div>
                  </div>

                  {/* Lower Split */}
                  <div className="grid grid-cols-2 gap-6 h-64">
                    {/* Agent Network Status */}
                    <div className="panel flex flex-col">
                      <div className="panel-header">
                        <h2 className="font-label-caps text-on-surface-variant">Agent Activity</h2>
                      </div>
                      <div className="panel-body flex-1 overflow-y-auto scrollbar-thin space-y-3">
                        {AGENTS.map((agent) => {
                            const isComplete = completedAgents.includes(agent.id);
                            const isActive = currentStage === agent.id || 
                                (currentStage === 'parallel_reasoning' && ['behavior', 'semantic'].includes(agent.id)) ||
                                (currentStage === 'execution_simulation' && ['risk', 'execution'].includes(agent.id)) ||
                                (currentStage === 'synthesis' && agent.id === 'synthesizer');
                            
                            let statusText = 'Queued';
                            let dotColor = 'bg-outline-variant';
                            if (isComplete) { statusText = 'Completed'; dotColor = 'bg-[#4ADE80]'; }
                            else if (isActive) { statusText = 'Running'; dotColor = 'bg-primary-fixed animate-pulse'; }

                            return (
                                <div key={agent.id} className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${dotColor}`}></div>
                                    <span className="font-code-sm text-on-surface">{agent.label}</span>
                                  </div>
                                  <span className={`font-code-sm ${isActive && !isComplete ? 'text-primary-fixed' : 'text-on-surface-variant'}`}>{statusText}</span>
                                </div>
                            );
                        })}
                      </div>
                    </div>

                    {/* Execution Stream */}
                    <div className="panel flex flex-col bg-[#070907]">
                      <div className="panel-header border-b border-[#1B211C] flex justify-between items-center">
                        <h2 className="font-label-caps text-on-surface-variant">Execution Stream</h2>
                        <span className="flex h-2 w-2 relative">
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-fixed opacity-75 ${isAnalyzing ? 'block' : 'hidden'}`}></span>
                          <span className={`relative inline-flex rounded-full h-2 w-2 ${isAnalyzing ? 'bg-primary-fixed' : 'bg-outline-variant'}`}></span>
                        </span>
                      </div>
                      <div className="panel-body flex-1 overflow-y-auto scrollbar-thin font-code-sm text-code-sm text-on-surface-variant space-y-1">
                        <div><span className="text-[#8d937d]">[SYS]</span> System initialized.</div>
                        {stageMessage && <div><span className="text-[#8d937d]">[AGENT]</span> {stageMessage}</div>}
                        {hasSummary && <div><span className="text-[#4ADE80]">[OK]</span> Analysis complete.</div>}
                        <div className="text-primary-fixed animate-pulse">_</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column (Sidebar-ish) */}
                <div className="lg:col-span-4 flex flex-col gap-6">
                  {/* Risk Center */}
                  <div className="panel">
                    <div className="panel-header flex justify-between items-center">
                      <h2 className="font-label-caps text-on-surface-variant">Risk Center</h2>
                      <a className="font-code-sm text-primary-fixed hover:underline" href="#">View All</a>
                    </div>
                    <div className="panel-body space-y-3">
                      {(effectiveAnalysis?.risks || []).slice(0, 3).map((r, i) => (
                        <div key={i} className={`p-3 border border-[#434936] rounded bg-[#161B17] hover:border-[#FF5C5C]/50 transition-colors cursor-pointer`}>
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-code-sm text-on-surface truncate pr-2">{r.file}</span>
                            <span className={`bg-[#93000a]/20 text-[#FF5C5C] border border-[#93000a] text-[10px] px-1.5 py-0.5 rounded font-label-caps`}>
                              {r.severity}
                            </span>
                          </div>
                          <p className="font-body-sm text-on-surface-variant">{r.description}</p>
                        </div>
                      ))}
                      {(!effectiveAnalysis?.risks || effectiveAnalysis.risks.length === 0) && (
                          <div className="text-on-surface-variant text-sm py-4 text-center">No severe risks detected.</div>
                      )}
                    </div>
                  </div>

                  {/* Architecture Summary / Recent Insights */}
                  <div className="panel h-48 flex flex-col flex-shrink-0">
                    <div className="panel-header">
                      <h2 className="font-label-caps text-on-surface-variant">Architecture Summary</h2>
                    </div>
                    <div className="panel-body flex-1 overflow-y-auto scrollbar-thin">
                      {hasSummary ? (
                          <p className="font-body-sm text-on-surface-variant whitespace-pre-line leading-relaxed">{effectiveAnalysis.summary}</p>
                      ) : (
                          <p className="font-body-sm text-on-surface-variant/50">Summary will appear here...</p>
                      )}
                    </div>
                  </div>

                  {/* Context Chat */}
                  <div className="panel flex-1 flex flex-col border-primary-fixed/30 bg-[#0d0f0e] focus-within:border-primary-fixed transition-colors overflow-hidden">
                    <div className="panel-header border-b border-[#1B211C] py-2">
                      <h2 className="font-label-caps text-on-surface-variant flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">chat</span> Chatbot
                      </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
                      {chatHistory.length === 0 ? (
                        <div className="text-on-surface-variant/50 text-sm italic text-center mt-4">Ask a question about the repository...</div>
                      ) : (
                        chatHistory.map((msg, idx) => (
                          <div key={idx} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                            <div className={`p-2 rounded max-w-[85%] text-sm ${msg.role === 'user' ? 'bg-primary-fixed text-[#0A0C0B]' : 'bg-[#161B17] border border-[#252C27] text-on-surface-variant'}`}>
                              {msg.role === 'model' ? renderMarkdown(msg.text) : msg.text}
                            </div>
                          </div>
                        ))
                      )}
                      {chatLoading && (
                        <div className="flex items-start">
                          <div className="p-2 rounded bg-[#161B17] border border-[#252C27] text-on-surface-variant text-sm">
                            <span className="animate-pulse">Thinking...</span>
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                    <div className="p-3 border-t border-[#1B211C] flex items-center gap-3">
                      <span className="material-symbols-outlined text-primary-fixed">chat_bubble</span>
                      <input 
                        className="bg-transparent border-none outline-none text-body-sm text-on-surface placeholder:text-on-surface-variant/50 w-full focus:ring-0 p-0 font-body-sm" 
                        placeholder="Ask CodeSensei about this repo..." 
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => { if(e.key === 'Enter') handleSendMessage() }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </main>
    </>
  );
}
