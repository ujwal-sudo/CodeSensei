import re

# Read original App.tsx
with open('App.tsx', 'r') as f:
    lines = f.readlines()

# Get the first 259 lines
header = "".join(lines[:259])

new_jsx = """
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
            <a className="text-on-surface-variant font-medium hover:text-on-surface hover:bg-surface-container transition-all h-full flex items-center px-3 mt-1 rounded-t" href="#">Agents</a>
            <a className="text-on-surface-variant font-medium hover:text-on-surface hover:bg-surface-container transition-all h-full flex items-center px-3 mt-1 rounded-t" href="#">Analytics</a>
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
            <div className="flex flex-col gap-6 items-center justify-center mt-20">
                <h2 className="text-on-surface font-headline-lg text-headline-lg font-bold">Import a project to begin</h2>
                <div className="flex gap-4">
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
                        {files.reduce((acc, f) => acc + (f.content ? f.content.split('\\n').length : 0), 0) || '—'}
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
                  <div className="panel flex-1 flex flex-col">
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

                  {/* Context Chat (Minimized) */}
                  <div className="panel mt-auto border-primary-fixed/30 bg-[#0d0f0e] focus-within:border-primary-fixed transition-colors">
                    <div className="p-3 flex items-center gap-3">
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
"""

with open('App.tsx', 'w') as f:
    f.write(header + new_jsx)

