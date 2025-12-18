
import { FileNode, CodeAnalysisResult, AgentStage } from '../types';
import { chunkRepository } from './chunker/chunkRepo';
import { runStructureAgent } from './agents/structureAgent';
import { runBehaviorAgent } from './agents/behaviorAgent';
import { runSemanticAgent } from './agents/semanticAgent';
import { runRiskAgent } from './agents/riskAgent';
import { runExecutionAgent } from './agents/executionAgent';
import { runSynthesizerAgent } from './agents/synthesizerAgent';

export const orchestrateAgents = async (
  files: FileNode[], 
  onProgress?: (stage: AgentStage) => void,
  onAgentProgress?: (agentName: string) => void
): Promise<CodeAnalysisResult> => {
  console.log('--- STARTING MULTI-AGENT ORCHESTRATION ---');
  if (onProgress) onProgress('init');

  // 1. Ingest & Chunk
  if (onProgress) onProgress('chunking');
  const chunks = chunkRepository(files);
  console.log(`Chunker: Created ${chunks.length} chunks from ${files.length} files.`);

  // 2. Run Structure Agent (Blocking - needed for context)
  if (onProgress) onProgress('structure');
  console.log('Agent: Structure running...');
  onAgentProgress?.('Structure');
  const structure = await runStructureAgent(chunks);
  onAgentProgress?.(`DONE:Structure`);

  // 3. Run Behavior, Semantic, Risk in Parallel
  if (onProgress) onProgress('parallel_reasoning');
  console.log('Agents: Behavior, Semantic, Risk running in parallel...');
  onAgentProgress?.('Behavior');
  onAgentProgress?.('Semantic');
  onAgentProgress?.('Risk');
  const [behavior, semantic, risk] = await Promise.all([
    (async () => { const r = await runBehaviorAgent(chunks); onAgentProgress?.('DONE:Behavior'); return r })(),
    (async () => { const r = await runSemanticAgent(chunks); onAgentProgress?.('DONE:Semantic'); return r })(),
    (async () => { const r = await runRiskAgent(chunks); onAgentProgress?.('DONE:Risk'); return r })()
  ]);

  // 4. Run Execution Agent (Dependent on Structure)
  if (onProgress) onProgress('execution_simulation');
  console.log('Agent: Execution running...');
  onAgentProgress?.('Execution');
  const execution = await runExecutionAgent(chunks, structure.modules.map(m => m.name).join(', '));
  onAgentProgress?.('DONE:Execution');

  // 5. Synthesize
  if (onProgress) onProgress('synthesis');
  console.log('Agent: Synthesizer merging results...');
  
  // We pass summaries to the synthesizer, not raw deep objects, to save context tokens if possible
  onAgentProgress?.('Synthesizer');
  const synthesizerOutput = await runSynthesizerAgent({
    structure,
    behavior_summary: behavior.call_graph, // passing full behavior might be too big
    semantic_summary: semantic.apis,
    risk_summary: risk.risks.map(r => ({ id: r.id, title: r.id, severity: r.severity })), // Only pass IDs/Titles to synthesizer
    execution_summary: execution.steps.map(s => s.desc) // Only pass step descriptions
  });
  onAgentProgress?.('DONE:Synthesizer');

  // 6. Manual Merge
  // We reconstruct the full CodeAnalysisResult by combining the specific Agent outputs
  // This avoids asking the LLM to echo back thousands of tokens of risk/execution data
  const finalResult: CodeAnalysisResult = {
    summary: synthesizerOutput.summary,
    architecture: synthesizerOutput.architecture,
    techStack: synthesizerOutput.techStack,
    graphData: synthesizerOutput.graphData,
    risks: risk.risks.map(r => ({
      id: r.id,
      title: r.id,
      description: r.description,
      severity: r.severity as 'critical' | 'high' | 'medium' | 'low',
      location: r.location,
      mitigation: r.mitigation
    })),
    executionFlow: execution.steps.map(s => ({
      step: s.step,
      location: s.location,
      action: s.action,
      stateChanges: s.stateChanges,
      narrative: s.narrative,
      filesInvolved: s.files,
      approxTimeMs: s.approx_time_ms
    }))
  };

  if (onProgress) onProgress('complete');
  console.log('--- ORCHESTRATION COMPLETE ---');
  return finalResult;
};
