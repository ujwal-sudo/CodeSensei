
import React, { useState, useRef } from 'react';
import { 
  Terminal, Zap, Activity, FolderOpen, Layers, 
  GitBranch, MessageSquare, AlertTriangle, 
  ChevronRight, Brain, Github, UploadCloud,
  CheckCircle
} from 'lucide-react';
import ParticleBackground from './components/ParticleBackground';
import BrainMap from './components/BrainMap';
import ImpactSimulator from './components/ImpactSimulator';
import ExecutionCinematic from './components/ExecutionCinematic';
import { GlassPanel, NeonButton } from './components/ui';
import GitHubImporter from './components/GitHubImporter';
import { analyzeRepository, chatWithContext } from './services/geminiService';
import { FileNode, CodeAnalysisResult, ViewState, AnalysisProgress, ChatMessage } from './types';

// Extend HTMLInputElement attributes to support webkitdirectory
declare module 'react' {
  interface InputHTMLAttributes<T> extends React.HTMLAttributes<T> {
    webkitdirectory?: string;
    directory?: string;
  }
}

// --- DEMO DATA ---
const DEMO_FILES: FileNode[] = [
  {
    path: "src/server.ts",
    language: "typescript",
    size: 1200,
    content: `import express from 'express';\nimport { createServer } from 'http';\nimport { Server } from 'socket.io';\n\nconst app = express();\nconst httpServer = createServer(app);\nconst io = new Server(httpServer);\n\nio.on('connection', (socket) => {\n  console.log('Client connected');\n  socket.on('message', (data) => {\n    io.emit('message', data);\n  });\n});\n\nhttpServer.listen(3000, () => {\n  console.log('Server running on 3000');\n});`
  },
  {
    path: "src/auth/authService.ts",
    language: "typescript",
    size: 800,
    content: `export class AuthService {\n  private users: Map<string, string> = new Map();\n\n  login(username: string, pass: string): boolean {\n    // TODO: Implement proper hashing\n    return this.users.get(username) === pass;\n  }\n\n  register(username: string, pass: string): void {\n    if (this.users.has(username)) throw new Error('User exists');\n    this.users.set(username, pass);\n  }\n}`
  },
  {
    path: "src/utils/db.ts",
    language: "typescript",
    size: 500,
    content: `import { Pool } from 'pg';\n\nexport const pool = new Pool({\n  connectionString: process.env.DATABASE_URL\n});\n\nexport const query = (text: string, params: any[]) => pool.query(text, params);`
  },
  {
    path: "src/api/routes.ts",
    language: "typescript",
    size: 600,
    content: `import { Router } from 'express';\nimport { AuthService } from '../auth/authService';\n\nconst router = Router();\nconst auth = new AuthService();\n\nrouter.post('/login', (req, res) => {\n  const { user, pass } = req.body;\n  if (auth.login(user, pass)) res.json({ token: 'mock-jwt' });\n  else res.status(401).send('Unauthorized');\n});\n\nexport default router;`
  }
];

export default function App() {
  const [view, setView] = useState<ViewState>('dashboard');
  const [files, setFiles] = useState<FileNode[]>([]);
  const [analysis, setAnalysis] = useState<CodeAnalysisResult | null>(null);
  const [importSource, setImportSource] = useState<'local' | 'github'>('local');
  
  // Progress State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress>({
    stage: 'idle', currentFile: 0, totalFiles: 0, currentFileName: '', message: ''
  });

  // Chat State
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const fileList = Array.from(e.target.files);
      
      const codeFiles = fileList.filter(f => 
        !f.name.startsWith('.') && 
        !f.webkitRelativePath.includes('node_modules') &&
        !f.webkitRelativePath.includes('dist') &&
        !f.name.endsWith('.png') && 
        !f.name.endsWith('.jpg')
      );

      const processedFiles = await Promise.all(
        codeFiles.map(async (file) => ({
          path: file.webkitRelativePath,
          content: await file.text(),
          language: file.name.split('.').pop() || 'text',
          size: file.size
        }))
      );
      
      handleFilesLoaded(processedFiles);
    }
  };

  const handleFilesLoaded = (loadedFiles: FileNode[]) => {
    setFiles(loadedFiles);
    setAnalysis(null);
    // Automatically start analysis after loading
    startAnalysis(loadedFiles);
  };

  const startAnalysis = async (filesToAnalyze: FileNode[]) => {
    if (filesToAnalyze.length === 0) return;
    setIsAnalyzing(true);
    
    try {
      const result = await analyzeRepository(filesToAnalyze, (p) => setProgress(p));
      setAnalysis(result);
      setView('dashboard');
    } catch (error: any) {
      console.error(error);
      alert(`Analysis Failed: ${error.message}`);
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
    } catch (e) {
      console.error(e);
    } finally {
      setChatLoading(false);
    }
  };

  // Demo Fallback
  const handleImportError = (msg: string) => {
    console.warn(`[Import Error] ${msg}`);
    // Simulate a short delay then load demo data
    setTimeout(() => {
      handleFilesLoaded(DEMO_FILES);
    }, 500);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200 font-sans overflow-hidden relative">
      <ParticleBackground />

      {/* --- Top Navigation --- */}
      <header className="h-16 border-b border-slate-800/60 bg-slate-900/60 backdrop-blur-md flex items-center justify-between px-6 z-20">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Terminal size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-xl leading-none bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent tracking-tight">
              CODESENSEI
            </h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-1">
              AI Architect OS
            </p>
          </div>
        </div>

        {analysis && (
          <nav className="flex bg-slate-800/50 rounded-lg p-1 border border-slate-700/50">
            {[
              { id: 'dashboard', icon: Layers, label: 'Overview' },
              { id: 'brainMap', icon: GitBranch, label: 'Brain Map' },
              { id: 'riskCenter', icon: AlertTriangle, label: 'Risks' },
              { id: 'chat', icon: MessageSquare, label: 'Query' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as ViewState)}
                className={`
                  flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-all
                  ${view === item.id 
                    ? 'bg-slate-700 text-cyan-400 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-700/50'}
                `}
              >
                <item.icon size={14} />
                {item.label}
              </button>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          {files.length > 0 && !isAnalyzing && !analysis && (
             <div className="text-xs font-mono text-cyan-400 mr-2 animate-pulse">
               {files.length} FILES LOADED
             </div>
          )}
          
          <NeonButton 
             onClick={() => {
               setAnalysis(null);
               setFiles([]);
               setImportSource('local');
             }} 
             variant="blue"
             icon={FolderOpen}
             disabled={isAnalyzing}
          >
            New Project
          </NeonButton>
        </div>
      </header>

      {/* --- Main Content Area --- */}
      <main className="flex-1 overflow-hidden relative p-6">
        
        {/* State: Empty / Upload */}
        {!analysis && !isAnalyzing && (
          <div className="h-full flex flex-col items-center justify-center animate-fade-in-up">
            <GlassPanel className="p-12 max-w-2xl text-center border-slate-700/50 w-full">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                 <div className="absolute inset-0 bg-cyan-500/20 rounded-full animate-pulse-slow"></div>
                 <Zap size={40} className="text-cyan-400" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Initialize Neural Analysis</h2>
              <p className="text-slate-400 mb-8 max-w-md mx-auto leading-relaxed">
                Import a repository to generate a complete architectural knowledge graph, risk assessment, and execution simulation.
              </p>
              
              <div className="flex justify-center gap-4 mb-8">
                <button
                  onClick={() => setImportSource('local')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    importSource === 'local' 
                      ? 'bg-slate-800 text-cyan-400 border border-slate-600' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <UploadCloud size={16} /> Local Upload
                </button>
                <button
                  onClick={() => setImportSource('github')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                    importSource === 'github' 
                      ? 'bg-slate-800 text-purple-400 border border-slate-600' 
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Github size={16} /> GitHub Import
                </button>
              </div>

              {importSource === 'local' ? (
                <>
                  <NeonButton 
                    onClick={() => fileInputRef.current?.click()} 
                    icon={FolderOpen} 
                    className="mx-auto w-48 h-12 text-lg"
                  >
                    Select Folder
                  </NeonButton>
                  <input
                    ref={fileInputRef}
                    type="file"
                    webkitdirectory=""
                    multiple
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </>
              ) : (
                <GitHubImporter 
                  onImportComplete={handleFilesLoaded}
                  onError={handleImportError}
                />
              )}

            </GlassPanel>
          </div>
        )}

        {/* State: Analyzing */}
        {isAnalyzing && (
          <div className="h-full flex flex-col items-center justify-center">
            <GlassPanel className="p-8 w-full max-w-lg text-center">
              <h3 className="text-xl font-bold text-white mb-2">Analyzing Architecture</h3>
              <p className="text-slate-400 text-sm mb-6">{progress.message}</p>
              
              <div className="relative h-4 bg-slate-800 rounded-full overflow-hidden mb-2">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                  style={{ width: `${(progress.currentFile / Math.max(progress.totalFiles, 1)) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs font-mono text-slate-500">
                <span>{progress.stage.toUpperCase()}</span>
                <span>{progress.currentFile} / {progress.totalFiles}</span>
              </div>
            </GlassPanel>
          </div>
        )}

        {/* State: Dashboard View */}
        {analysis && view === 'dashboard' && (
          <div className="h-full overflow-y-auto space-y-6 animate-fade-in pr-2">
             {/* Summary Card */}
             <GlassPanel className="p-8 relative overflow-hidden border-l-4 border-l-cyan-500">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                   <Brain size={150} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">Executive Summary</h2>
                <p className="text-slate-300 leading-relaxed max-w-4xl text-lg font-light">
                  {analysis.summary}
                </p>
                <div className="mt-6 flex gap-3 flex-wrap">
                  {analysis.techStack.map(t => (
                    <span key={t} className="px-3 py-1 bg-slate-800 rounded-full border border-slate-700 text-xs font-mono text-cyan-300">
                      {t}
                    </span>
                  ))}
                </div>
             </GlassPanel>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <GlassPanel className="p-6">
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                   <Layers className="text-purple-400" /> System Architecture
                 </h3>
                 <p className="text-slate-400 text-sm whitespace-pre-line leading-relaxed">
                   {analysis.architecture}
                 </p>
               </GlassPanel>

               <GlassPanel className="p-6">
                 <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                   <AlertTriangle className="text-red-400" /> Critical Risks
                 </h3>
                 <div className="space-y-3">
                   {analysis.risks.slice(0, 3).map(risk => (
                     <div key={risk.id} className="p-3 bg-red-900/10 border border-red-500/20 rounded-lg">
                       <div className="flex justify-between mb-1">
                         <span className="text-red-300 font-bold text-sm">{risk.title}</span>
                         <span className="text-[10px] uppercase bg-red-500/20 text-red-300 px-2 py-0.5 rounded">
                           {risk.severity}
                         </span>
                       </div>
                       <p className="text-xs text-red-200/60 truncate">{risk.description}</p>
                     </div>
                   ))}
                 </div>
               </GlassPanel>
             </div>
          </div>
        )}

        {/* State: Brain Map */}
        {analysis && view === 'brainMap' && (
          <div className="h-full rounded-2xl overflow-hidden border border-slate-700 shadow-2xl relative">
            <BrainMap 
              data={analysis.graphData} 
              onNodeClick={(node) => console.log(node)} 
            />
            <div className="absolute top-4 left-4 pointer-events-none">
              <GlassPanel className="px-4 py-2">
                 <p className="text-xs font-mono text-cyan-400 font-bold">INTERACTIVE TOPOLOGY</p>
                 <p className="text-[10px] text-slate-500">{analysis.graphData.nodes.length} Modules</p>
              </GlassPanel>
            </div>
          </div>
        )}

        {/* State: Risk Center */}
        {analysis && view === 'riskCenter' && (
           <div className="h-full overflow-y-auto space-y-4 animate-fade-in pr-2">
             <h2 className="text-2xl font-bold text-white mb-4">Risk Assessment Report</h2>
             {analysis.risks.map(risk => (
               <GlassPanel key={risk.id} className="p-6 border-l-4 border-l-transparent hover:border-l-red-500 transition-all">
                 <div className="flex gap-4">
                   <div className="mt-1">
                     <AlertTriangle className={
                       risk.severity === 'critical' ? 'text-red-500' : 
                       risk.severity === 'high' ? 'text-orange-500' : 'text-yellow-500'
                     } size={24} />
                   </div>
                   <div className="flex-1">
                     <div className="flex justify-between items-start">
                       <h3 className="text-lg font-bold text-slate-200">{risk.title}</h3>
                       <span className={`
                         text-xs font-bold uppercase px-3 py-1 rounded-full
                         ${risk.severity === 'critical' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}
                       `}>
                         {risk.severity}
                       </span>
                     </div>
                     <p className="text-slate-400 mt-2 text-sm">{risk.description}</p>
                     
                     <div className="mt-4 p-3 bg-slate-900/50 rounded border border-slate-700/50">
                       <p className="text-xs font-mono text-slate-500 mb-2">MITIGATION STRATEGY:</p>
                       <ul className="space-y-1">
                         {risk.mitigation.map((m, i) => (
                           <li key={i} className="text-sm text-slate-300 flex items-start gap-2">
                             <CheckCircle size={14} className="text-green-500 mt-0.5" />
                             {m}
                           </li>
                         ))}
                       </ul>
                     </div>
                   </div>
                 </div>
               </GlassPanel>
             ))}
           </div>
        )}

        {/* State: Chat */}
        {analysis && view === 'chat' && (
          <div className="h-full flex flex-col">
            <GlassPanel className="flex-1 mb-4 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatHistory.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-slate-600">
                    <MessageSquare size={48} className="mb-4 opacity-50" />
                    <p>Ask me anything about the codebase...</p>
                  </div>
                )}
                {chatHistory.map((msg, i) => (
                   <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`
                        max-w-[80%] p-3 rounded-xl text-sm font-medium
                        ${msg.role === 'user' 
                          ? 'bg-cyan-600 text-white rounded-tr-none' 
                          : 'bg-slate-800 text-slate-300 rounded-tl-none'}
                      `}>
                        {msg.text}
                      </div>
                   </div>
                ))}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 p-3 rounded-xl rounded-tl-none">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-75"></div>
                        <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-150"></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </GlassPanel>
            
            <div className="flex gap-2">
              <input 
                className="flex-1 bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="Type your query..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <NeonButton onClick={handleSendMessage} disabled={chatLoading} icon={ChevronRight}>
                Send
              </NeonButton>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
