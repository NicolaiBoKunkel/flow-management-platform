import { validateFlowGraph } from './flow-graph-validator';
import type {
  DomainNodeType,
  FlowEdge,
  FlowGraph,
  FlowNode,
  QuestionType,
} from './types/flow-graph.types';

function node(
  id: string,
  type: DomainNodeType,
  label: string,
  questionType?: QuestionType,
): FlowNode {
  return {
    id,
    type,
    label,
    position: {
      x: 0,
      y: 0,
    },
    questionType,
  };
}

function edge(
  id: string,
  source: string,
  target: string,
  condition?: FlowEdge['condition'],
): FlowEdge {
  return {
    id,
    source,
    target,
    condition,
  };
}

function validSingleChoiceGraph(): FlowGraph {
  return {
    nodes: [
      node('start', 'start', 'Start'),
      node('question', 'question', 'Question', 'singleChoice'),
      node('end', 'end', 'End'),
    ],
    edges: [
      edge('edge-start-question', 'start', 'question'),
      edge('edge-question-end', 'question', 'end'),
    ],
  };
}

function validTextGraph(): FlowGraph {
  return {
    nodes: [
      node('start', 'start', 'Start'),
      node('question', 'question', 'Text question', 'text'),
      node('end', 'end', 'End'),
    ],
    edges: [
      edge('edge-start-question', 'start', 'question'),
      edge('edge-question-end', 'question', 'end'),
    ],
  };
}

function validNumberGraph(): FlowGraph {
  return {
    nodes: [
      node('start', 'start', 'Start'),
      node('question', 'question', 'Age question', 'number'),
      node('young-end', 'end', 'Young end'),
      node('adult-end', 'end', 'Adult end'),
      node('senior-end', 'end', 'Senior end'),
    ],
    edges: [
      edge('edge-start-question', 'start', 'question'),
      edge('edge-under-18', 'question', 'young-end', {
        kind: 'number',
        operator: 'lt',
        value: 18,
      }),
      edge('edge-18-to-60', 'question', 'adult-end', {
        kind: 'numberRange',
        min: 18,
        max: 60,
        minInclusive: true,
        maxInclusive: true,
      }),
      edge('edge-over-60', 'question', 'senior-end', {
        kind: 'number',
        operator: 'gt',
        value: 60,
      }),
    ],
  };
}

function expectErrorContaining(errors: string[], expectedText: string) {
  expect(errors.some((error) => error.includes(expectedText))).toBe(true);
}

describe('validateFlowGraph - flow graph validation', () => {
  it('VAL-001 accepts a valid flow graph', () => {
    const errors = validateFlowGraph(validSingleChoiceGraph());

    expect(errors).toEqual([]);
  });

  it('VAL-002 rejects an empty graph', () => {
    const graph: FlowGraph = {
      nodes: [],
      edges: [],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(errors, 'Flow must contain at least one node.');
  });

  it('VAL-003 rejects a graph without a start node', () => {
    const graph: FlowGraph = {
      nodes: [
        node('question', 'question', 'Question', 'singleChoice'),
        node('end', 'end', 'End'),
      ],
      edges: [edge('edge-question-end', 'question', 'end')],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(errors, 'Flow must contain exactly one start node.');
  });

  it('VAL-004 rejects a graph with multiple start nodes', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start-1', 'start', 'Start 1'),
        node('start-2', 'start', 'Start 2'),
        node('question', 'question', 'Question', 'singleChoice'),
        node('end', 'end', 'End'),
      ],
      edges: [
        edge('edge-start-1-question', 'start-1', 'question'),
        edge('edge-start-2-question', 'start-2', 'question'),
        edge('edge-question-end', 'question', 'end'),
      ],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(errors, 'Flow must contain exactly one start node.');
  });

  it('VAL-005 rejects a graph without a question node', () => {
    const graph: FlowGraph = {
      nodes: [node('start', 'start', 'Start'), node('end', 'end', 'End')],
      edges: [edge('edge-start-end', 'start', 'end')],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Flow must contain at least one question node.',
    );
  });

  it('VAL-006 rejects a graph without an end node', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Question', 'singleChoice'),
      ],
      edges: [edge('edge-start-question', 'start', 'question')],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(errors, 'Flow must contain at least one end node.');
  });

  it('VAL-007 rejects a start node with an incoming edge', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Question', 'singleChoice'),
        node('end', 'end', 'End'),
      ],
      edges: [
        edge('edge-start-question', 'start', 'question'),
        edge('edge-question-start', 'question', 'start'),
        edge('edge-question-end', 'question', 'end'),
      ],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Start node "Start" cannot have incoming edges.',
    );
  });

  it('VAL-008 rejects an end node with an outgoing edge', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Question', 'singleChoice'),
        node('end', 'end', 'End'),
      ],
      edges: [
        edge('edge-start-question', 'start', 'question'),
        edge('edge-question-end', 'question', 'end'),
        edge('edge-end-question', 'end', 'question'),
      ],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(errors, 'End node "End" cannot have outgoing edges.');
  });

  it('VAL-009 rejects an unreachable node', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Question', 'singleChoice'),
        node('end', 'end', 'End'),
        node('unreachable', 'info', 'Unreachable info'),
      ],
      edges: [
        edge('edge-start-question', 'start', 'question'),
        edge('edge-question-end', 'question', 'end'),
      ],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Node "Unreachable info" is not reachable from the start node.',
    );
  });

  it('VAL-010 rejects a non-end node without an outgoing edge', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Question', 'singleChoice'),
        node('end', 'end', 'End'),
      ],
      edges: [edge('edge-start-question', 'start', 'question')],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Question node "Question" must have at least one outgoing edge.',
    );
  });

  it('VAL-011 rejects an edge with an invalid source node id', () => {
    const graph = validSingleChoiceGraph();

    graph.edges.push(edge('edge-invalid-source', 'missing-source', 'end'));

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Edge "edge-invalid-source" has source "missing-source" which does not exist.',
    );
  });

  it('VAL-012 rejects an edge with an invalid target node id', () => {
    const graph = validSingleChoiceGraph();

    graph.edges.push(edge('edge-invalid-target', 'question', 'missing-target'));

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Edge "edge-invalid-target" has target "missing-target" which does not exist.',
    );
  });

  it('VAL-013 rejects a question node without questionType', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Question'),
        node('end', 'end', 'End'),
      ],
      edges: [
        edge('edge-start-question', 'start', 'question'),
        edge('edge-question-end', 'question', 'end'),
      ],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Question node "Question" must have a questionType.',
    );
  });

  it('VAL-014 accepts a text question with exactly one outgoing edge', () => {
    const errors = validateFlowGraph(validTextGraph());

    expect(errors).toEqual([]);
  });

  it('VAL-015 rejects a text question with multiple outgoing edges', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Text question', 'text'),
        node('end-1', 'end', 'End 1'),
        node('end-2', 'end', 'End 2'),
      ],
      edges: [
        edge('edge-start-question', 'start', 'question'),
        edge('edge-question-end-1', 'question', 'end-1'),
        edge('edge-question-end-2', 'question', 'end-2'),
      ],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Text question "Text question" must have exactly one outgoing edge.',
    );
  });

  it('VAL-016 rejects a text question with an edge condition', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Text question', 'text'),
        node('end', 'end', 'End'),
      ],
      edges: [
        edge('edge-start-question', 'start', 'question'),
        edge('edge-question-end', 'question', 'end', {
          kind: 'number',
          operator: 'eq',
          value: 1,
        }),
      ],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Text question "Text question" cannot use edge conditions.',
    );
  });

  it('VAL-017 rejects an info node without an outgoing edge', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Question', 'singleChoice'),
        node('info', 'info', 'Info'),
        node('end', 'end', 'End'),
      ],
      edges: [
        edge('edge-start-question', 'start', 'question'),
        edge('edge-question-info', 'question', 'info'),
      ],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Info node "Info" must have at least one outgoing edge.',
    );
  });
});

describe('validateFlowGraph - numeric conditions', () => {
  it('NUM-001 accepts a number question with full numeric coverage', () => {
    const errors = validateFlowGraph(validNumberGraph());

    expect(errors).toEqual([]);
  });

  it('NUM-002 rejects a number question with an outgoing edge without condition', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Age question', 'number'),
        node('end', 'end', 'End'),
      ],
      edges: [
        edge('edge-start-question', 'start', 'question'),
        edge('edge-question-end', 'question', 'end'),
      ],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'All outgoing edges from number question "Age question" must have a numeric condition.',
    );
  });

  it('NUM-003 rejects overlapping numeric conditions', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Age question', 'number'),
        node('end-1', 'end', 'End 1'),
        node('end-2', 'end', 'End 2'),
        node('end-3', 'end', 'End 3'),
      ],
      edges: [
        edge('edge-start-question', 'start', 'question'),
        edge('edge-lte-18', 'question', 'end-1', {
          kind: 'number',
          operator: 'lte',
          value: 18,
        }),
        edge('edge-range-18-60', 'question', 'end-2', {
          kind: 'numberRange',
          min: 18,
          max: 60,
          minInclusive: true,
          maxInclusive: true,
        }),
        edge('edge-over-60', 'question', 'end-3', {
          kind: 'number',
          operator: 'gt',
          value: 60,
        }),
      ],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Number question "Age question" has overlapping conditions',
    );
  });

  it('NUM-004 rejects gaps in numeric conditions', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Age question', 'number'),
        node('end-1', 'end', 'End 1'),
        node('end-2', 'end', 'End 2'),
      ],
      edges: [
        edge('edge-start-question', 'start', 'question'),
        edge('edge-under-18', 'question', 'end-1', {
          kind: 'number',
          operator: 'lt',
          value: 18,
        }),
        edge('edge-over-18', 'question', 'end-2', {
          kind: 'number',
          operator: 'gt',
          value: 18,
        }),
      ],
    };

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Number question "Age question" has gaps in its conditions.',
    );
  });

  it('NUM-005 rejects a number range where min is greater than max', () => {
    const graph = validNumberGraph();

    graph.edges[2] = edge('edge-invalid-range', 'question', 'adult-end', {
      kind: 'numberRange',
      min: 60,
      max: 18,
      minInclusive: true,
      maxInclusive: true,
    });

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Edge "edge-invalid-range" has a number range where min is greater than max.',
    );
  });

  it.each([
    {
      testCaseId: 'NUM-006A',
      minInclusive: false,
      maxInclusive: true,
      description: '(18 - 18]',
    },
    {
      testCaseId: 'NUM-006B',
      minInclusive: true,
      maxInclusive: false,
      description: '[18 - 18)',
    },
    {
      testCaseId: 'NUM-006C',
      minInclusive: false,
      maxInclusive: false,
      description: '(18 - 18)',
    },
  ])(
    '$testCaseId rejects an empty number range $description',
    ({ minInclusive, maxInclusive }) => {
      const graph = validNumberGraph();

      graph.edges[2] = edge('edge-empty-range', 'question', 'adult-end', {
        kind: 'numberRange',
        min: 18,
        max: 18,
        minInclusive,
        maxInclusive,
      });

      const errors = validateFlowGraph(graph);

      expectErrorContaining(
        errors,
        'Edge "edge-empty-range" has an empty number range because min and max are equal but not both inclusive.',
      );
    },
  );

  it('NUM-007 accepts a single-point inclusive range when coverage is complete', () => {
    const graph: FlowGraph = {
      nodes: [
        node('start', 'start', 'Start'),
        node('question', 'question', 'Age question', 'number'),
        node('end-1', 'end', 'End 1'),
        node('end-2', 'end', 'End 2'),
        node('end-3', 'end', 'End 3'),
      ],
      edges: [
        edge('edge-start-question', 'start', 'question'),
        edge('edge-under-18', 'question', 'end-1', {
          kind: 'number',
          operator: 'lt',
          value: 18,
        }),
        edge('edge-equals-18', 'question', 'end-2', {
          kind: 'numberRange',
          min: 18,
          max: 18,
          minInclusive: true,
          maxInclusive: true,
        }),
        edge('edge-over-18', 'question', 'end-3', {
          kind: 'number',
          operator: 'gt',
          value: 18,
        }),
      ],
    };

    const errors = validateFlowGraph(graph);

    expect(errors).toEqual([]);
  });

  it('NUM-008 rejects an invalid numeric condition value', () => {
    const graph = validNumberGraph();

    graph.edges[1] = edge('edge-invalid-value', 'question', 'young-end', {
      kind: 'number',
      operator: 'lt',
      value: Number.NaN,
    });

    const errors = validateFlowGraph(graph);

    expectErrorContaining(
      errors,
      'Edge "edge-invalid-value" must have a valid numeric condition value.',
    );
  });
});
