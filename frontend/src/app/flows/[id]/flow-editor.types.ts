export type DomainNodeType = 'start' | 'question' | 'end' | 'info';

export type QuestionType = 'singleChoice' | 'number' | 'text';

export type FlowGraph = {
  nodes: {
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
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    label?: string;
  }[];
};

export type FlowEditorProps = {
  flowId: string;
  initialGraph?: FlowGraph | null;
};