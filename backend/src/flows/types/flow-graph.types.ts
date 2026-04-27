export type NumberOperator = 'lt' | 'lte' | 'gt' | 'gte' | 'eq';

export type DomainNodeType = 'start' | 'question' | 'end' | 'info';

export type QuestionType = 'singleChoice' | 'number' | 'text';

export type EdgeCondition = {
  kind: 'number';
  operator: NumberOperator;
  value: number;
};

export type FlowNode = {
  id: string;
  type: DomainNodeType;
  label: string;
  position: {
    x: number;
    y: number;
  };
  questionType?: QuestionType;
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