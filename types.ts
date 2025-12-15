
export interface FileNode {
  path: string;
  content: string;
  language: string;
  size: number;
}

export interface FileSummary {
  path: string;
  purpose: string;
  exports: string[];
  imports: string[];
  dependencies: string[];
  complexity_score: number; // 1-10
}

export interface GraphNode {
  id: string;
  group: 'file' | 'module' | 'external';
  val: number;
  details?: string;
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'import' | 'dependency';
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export interface RiskItem {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  mitigation: string[];
}

export interface ExecutionStep {
  step: number;
  location: string;
  action: string;
  stateChanges: string;
  narrative: string;
  filesInvolved: string[];
  approxTimeMs: number;
}

export interface ImpactPrediction {
  change: string;
  affected: {
    file: string;
    why: string;
    confidence: number;
  }[];
  testsLikelyToBreak: string[];
  severityEstimate: 'critical' | 'high' | 'medium' | 'low';
  recommendedMitigations: string[];
}

export interface CodeAnalysisResult {
  summary: string;
  architecture: string;
  techStack: string[];
  graphData: GraphData;
  risks: RiskItem[];
  executionFlow: ExecutionStep[]; // Generated on demand or initially
}

export type ViewState = 'dashboard' | 'brainMap' | 'riskCenter' | 'execution' | 'chat' | 'impact';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface AnalysisProgress {
  stage: 'idle' | 'uploading' | 'mapping' | 'reducing' | 'complete' | 'error';
  currentFile: number;
  totalFiles: number;
  currentFileName: string;
  message: string;
}

export type AgentStage = 'init' | 'chunking' | 'structure' | 'parallel_reasoning' | 'execution_simulation' | 'synthesis' | 'complete' | 'error';
