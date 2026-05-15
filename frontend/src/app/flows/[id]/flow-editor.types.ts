export type DomainNodeType = 'start' | 'question' | 'end' | 'info';

export type QuestionType =
  | 'singleChoice'
  | 'number'
  | 'text'
  | 'multipleChoice';

export type NumberOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq';

export type NumberConditionMode = 'single' | 'range';

export type SingleNumberCondition = {
  kind: 'number';
  operator: NumberOperator;
  value: number;
};

export type NumberRangeCondition = {
  kind: 'numberRange';
  min: number;
  max: number;
  minInclusive: boolean;
  maxInclusive: boolean;
};

export type EdgeCondition = SingleNumberCondition | NumberRangeCondition;

export type FlowNode = {
  id: string;
  type: DomainNodeType;
  label: string;
  position: {
    x: number;
    y: number;
  };
  questionType?: QuestionType;
  options?: string[];
  introText?: string;
  questionText?: string;
  resultText?: string;
  infoText?: string;
};

export type FlowEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
  condition?: EdgeCondition;
};

export type FlowGraph = {
  nodes: FlowNode[];
  edges: FlowEdge[];
};

export type FlowAnswerSummaryEntry = {
  nodeId: string;
  questionLabel: string;
  questionType: QuestionType;
  answer: string;
};

export type FlowEditorProps = {
  flowId: string;
  initialGraph?: FlowGraph | null;
};