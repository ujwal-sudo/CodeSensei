
import { FileNode, CodeAnalysisResult, AgentStage, PartialCodeAnalysisResult, StreamingAnalysisUpdate } from '../types';
import { chunkRepository } from './chunker/chunkRepo';
import { runStructureAgent } from './agents/structureAgent';
import { runBehaviorAgent } from './agents/behaviorAgent';
import { runSemanticAgent } from './agents/semanticAgent';
import { runRiskAgent } from './agents/riskAgent';
import { runExecutionAgent } from './agents/executionAgent';
import { runSynthesizerAgent } from './agents/synthesizerAgent';

/**
 * Streaming Agent Orchestrator
 * 
 * Uses AsyncGenerator to yield partial results as each agent completes.
 * This allows the UI to render immediately after the first agent finishes.
 * 
 * Execution order with controlled concurrency:
 * 1. Structure Agent (blocking - needed for context)
 * 2. Behavior + Semantic (parallel, max 2)
 * 3. Risk + Execution (parallel, max 2)
 * 4. Synthesizer (final merge)
 */
export async function* orchestrateAgentsStreaming(
  files: FileNode[]
): AsyncGenerator<StreamingAnalysisUpdate, CodeAnalysisResult, unknown> {
  console.log('--- STARTING STREAMING MULTI-AGENT ORCHESTRATION ---');

  // Accumulate partial results
  let partialResult: PartialCodeAnalysisResult = {
    completedAgents: [],
    isComplete: false
  };

  // ============ PHASE 1: Chunking ============
  yield {
    stage: 'chunking',
    message: 'Preparing code chunks...',
    partialResult: { ...partialResult }
  };

  const chunks = chunkRepository(files);
  console.log(`Chunker: Created ${chunks.length} chunks from ${files.length} files.`);

  // ============ PHASE 2: Structure Agent (Critical - needed for graph) ============
  yield {
    stage: 'structure',
    message: 'Analyzing code structure...',
    partialResult: { ...partialResult }
  };

  console.log('Agent: Structure running...');
  let structure;
  try {
    structure = await runStructureAgent(chunks);
    console.log('Agent: Structure completed successfully');
  } catch (error: any) {
    console.error('[Orchestrator] Structure Agent FAILED:', error.message);
    throw new Error(`Structure analysis failed: ${error.message}`);
  }

  // Generate initial graph from structure
  const initialGraphData = {
    nodes: structure.modules.map(m => ({
      id: m.name,
      group: 'module' as const,
      val: 10,
      details: `Module: ${m.name}`
    })),
    links: [] as any[]
  };

  // Add file nodes
  structure.modules.forEach(m => {
    if (m.files) {
      m.files.forEach(f => {
        initialGraphData.nodes.push({
          id: f,
          group: 'module' as const, // Use module since 'file' isn't in GraphNode type
          val: 5,
          details: `File in ${m.name}`
        });
        initialGraphData.links.push({
          source: m.name,
          target: f,
          type: 'import' as const
        });
      });
    }
  });

  partialResult = {
    ...partialResult,
    graphData: initialGraphData,
    techStack: [], // Will be populated by synthesizer
    architecture: `Detected ${structure.modules.length} modules: ${structure.modules.map(m => m.name).join(', ')}`,
    completedAgents: ['structure']
  };

  // YIELD 1: Brain Map is now available!
  yield {
    stage: 'structure',
    message: 'Structure complete - Brain Map ready!',
    partialResult: { ...partialResult }
  };

  // ============ PHASE 3: Behavior + Semantic (Parallel) ============
  yield {
    stage: 'parallel_reasoning',
    message: 'Analyzing behavior and semantics...',
    partialResult: { ...partialResult }
  };

  console.log('Agents: Behavior + Semantic running in parallel...');
  const [behavior, semantic] = await Promise.all([
    runBehaviorAgent(chunks),
    runSemanticAgent(chunks)
  ]);

  partialResult = {
    ...partialResult,
    completedAgents: [...(partialResult.completedAgents || []), 'behavior', 'semantic']
  };

  // YIELD 2: Behavior and Semantic complete
  yield {
    stage: 'parallel_reasoning',
    message: 'Behavior and semantic analysis complete',
    partialResult: { ...partialResult }
  };

  // ============ PHASE 4: Risk + Execution (Parallel) ============
  yield {
    stage: 'execution_simulation',
    message: 'Analyzing risks and execution flow...',
    partialResult: { ...partialResult }
  };

  console.log('Agents: Risk + Execution running in parallel...');
  const [risk, execution] = await Promise.all([
    runRiskAgent(chunks),
    runExecutionAgent(chunks, structure.modules.map(m => m.name).join(', '))
  ]);

  // Add risks to partial result
  partialResult = {
    ...partialResult,
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
    })),
    completedAgents: [...(partialResult.completedAgents || []), 'risk', 'execution']
  };

  // YIELD 3: Risks are available!
  yield {
    stage: 'execution_simulation',
    message: 'Risk analysis complete - viewing risks',
    partialResult: { ...partialResult }
  };

  // ============ PHASE 5: Synthesizer (Final) ============
  yield {
    stage: 'synthesis',
    message: 'Synthesizing final report with PRO model...',
    partialResult: { ...partialResult }
  };

  console.log('Agent: Synthesizer merging results with PRO model...');

  // Optimized context for synthesizer
  const optimizedContext = {
    structure_summary: {
      modules: structure.modules.map(m => m.name),
      entry_points: structure.entrypoints || []
    },
    behavior_summary: behavior.call_graph?.slice(0, 20) || [],
    semantic_summary: semantic.apis?.map((a: any) => a.name || a).slice(0, 20) || [],
    risk_summary: risk.risks.map(r => ({ id: r.id, severity: r.severity })),
    execution_summary: execution.steps.slice(0, 10).map(s => s.desc || s.action)
  };

  console.log(`[Orchestrator] Optimized context size: ${JSON.stringify(optimizedContext).length} chars`);
  const synthesizerOutput = await runSynthesizerAgent(optimizedContext);

  // ============ FINAL: Merge everything ============
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

  // YIELD 4: Complete!
  yield {
    stage: 'complete',
    message: 'Analysis complete!',
    partialResult: { ...finalResult, completedAgents: ['structure', 'behavior', 'semantic', 'risk', 'execution', 'synthesizer'], isComplete: true }
  };

  console.log('--- STREAMING ORCHESTRATION COMPLETE ---');
  return finalResult;
}

/**
 * Legacy non-streaming orchestrator for backward compatibility
 * Wraps the streaming version and waits for completion
 */
export const orchestrateAgents = async (
  files: FileNode[],
  onProgress?: (stage: AgentStage) => void
): Promise<CodeAnalysisResult> => {
  console.log('[Orchestrator] Using legacy wrapper for streaming orchestrator');

  const generator = orchestrateAgentsStreaming(files);
  let result: CodeAnalysisResult | undefined;

  for await (const update of generator) {
    if (onProgress) {
      onProgress(update.stage);
    }
    console.log(`[Orchestrator] Stage: ${update.stage} - ${update.message}`);
  }

  // Get the final return value
  const final = await generator.next();
  if (final.done && final.value) {
    result = final.value;
  }

  if (!result) {
    throw new Error('Orchestration failed to produce a result');
  }

  return result;
};
