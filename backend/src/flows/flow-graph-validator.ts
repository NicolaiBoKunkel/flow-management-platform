import { FlowEdge, FlowGraph } from './types/flow-graph.types';

type NumberInterval = {
  min: number;
  minInclusive: boolean;
  max: number;
  maxInclusive: boolean;
};

function toNumberInterval(edge: FlowEdge): NumberInterval | null {
  const condition = edge.condition;

  if (!condition) {
    return null;
  }

  if (condition.kind === 'numberRange') {
    return {
      min: condition.min,
      minInclusive: condition.minInclusive,
      max: condition.max,
      maxInclusive: condition.maxInclusive,
    };
  }

  if (condition.kind !== 'number') {
    return null;
  }

  switch (condition.operator) {
    case 'lt':
      return {
        min: Number.NEGATIVE_INFINITY,
        minInclusive: false,
        max: condition.value,
        maxInclusive: false,
      };
    case 'lte':
      return {
        min: Number.NEGATIVE_INFINITY,
        minInclusive: false,
        max: condition.value,
        maxInclusive: true,
      };
    case 'gt':
      return {
        min: condition.value,
        minInclusive: false,
        max: Number.POSITIVE_INFINITY,
        maxInclusive: false,
      };
    case 'gte':
      return {
        min: condition.value,
        minInclusive: true,
        max: Number.POSITIVE_INFINITY,
        maxInclusive: false,
      };
    case 'eq':
      return {
        min: condition.value,
        minInclusive: true,
        max: condition.value,
        maxInclusive: true,
      };
    default:
      return null;
  }
}

function intervalsOverlap(a: NumberInterval, b: NumberInterval): boolean {
  if (a.max < b.min) return false;
  if (b.max < a.min) return false;

  if (a.max === b.min) {
    return a.maxInclusive && b.minInclusive;
  }

  if (b.max === a.min) {
    return b.maxInclusive && a.minInclusive;
  }

  return true;
}

function hasFullNumberCoverage(intervals: NumberInterval[]): boolean {
  if (intervals.length === 0) return false;

  const sortedIntervals = [...intervals].sort((a, b) => {
    if (a.min !== b.min) return a.min - b.min;
    if (a.minInclusive === b.minInclusive) return 0;
    return a.minInclusive ? -1 : 1;
  });

  const firstInterval = sortedIntervals[0];

  if (firstInterval.min !== Number.NEGATIVE_INFINITY) {
    return false;
  }

  let currentCoverageEnd = firstInterval.max;
  let currentCoverageEndInclusive = firstInterval.maxInclusive;

  for (let i = 1; i < sortedIntervals.length; i++) {
    const nextInterval = sortedIntervals[i];

    if (nextInterval.min > currentCoverageEnd) return false;

    if (
      nextInterval.min === currentCoverageEnd &&
      !currentCoverageEndInclusive &&
      !nextInterval.minInclusive
    ) {
      return false;
    }

    if (
      nextInterval.max > currentCoverageEnd ||
      (nextInterval.max === currentCoverageEnd &&
        nextInterval.maxInclusive &&
        !currentCoverageEndInclusive)
    ) {
      currentCoverageEnd = nextInterval.max;
      currentCoverageEndInclusive = nextInterval.maxInclusive;
    }
  }

  return currentCoverageEnd === Number.POSITIVE_INFINITY;
}

function hasDuplicateOptions(options: string[]): boolean {
  const normalizedOptions = options.map((option) =>
    option.trim().toLowerCase(),
  );
  return new Set(normalizedOptions).size !== normalizedOptions.length;
}

export function validateFlowGraph(graph: FlowGraph): string[] {
  const errors: string[] = [];

  if (!graph.nodes || graph.nodes.length === 0) {
    errors.push('Flow must contain at least one node.');
    return errors;
  }

  const startNodes = graph.nodes.filter((node) => node.type === 'start');
  const questionNodes = graph.nodes.filter((node) => node.type === 'question');
  const endNodes = graph.nodes.filter((node) => node.type === 'end');

  if (startNodes.length !== 1) {
    errors.push('Flow must contain exactly one start node.');
  }

  if (questionNodes.length < 1) {
    errors.push('Flow must contain at least one question node.');
  }

  if (endNodes.length < 1) {
    errors.push('Flow must contain at least one end node.');
  }

  const nodeIds = new Set(graph.nodes.map((node) => node.id));

  for (const node of graph.nodes) {
    if (node.type === 'question') {
      if (!node.questionType) {
        errors.push(`Question node "${node.label}" must have a questionType.`);
      } else if (
        node.questionType !== 'singleChoice' &&
        node.questionType !== 'number' &&
        node.questionType !== 'text' &&
        node.questionType !== 'multipleChoice'
      ) {
        errors.push(
          `Question node "${node.label}" uses unsupported questionType "${String(node.questionType)}".`,
        );
      }

      if (node.questionType === 'multipleChoice') {
        if (!Array.isArray(node.options) || node.options.length < 2) {
          errors.push(
            `Multiple choice question "${node.label}" must have at least two options.`,
          );
        } else {
          const hasEmptyOption = node.options.some(
            (option) => option.trim() === '',
          );

          if (hasEmptyOption) {
            errors.push(
              `Multiple choice question "${node.label}" cannot have empty options.`,
            );
          }

          if (hasDuplicateOptions(node.options)) {
            errors.push(
              `Multiple choice question "${node.label}" cannot have duplicate options.`,
            );
          }
        }
      }
    }
  }

  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(
        `Edge "${edge.id}" has source "${edge.source}" which does not exist.`,
      );
    }

    if (!nodeIds.has(edge.target)) {
      errors.push(
        `Edge "${edge.id}" has target "${edge.target}" which does not exist.`,
      );
    }

    if (edge.condition) {
      if (
        edge.condition.kind !== 'number' &&
        edge.condition.kind !== 'numberRange'
      ) {
        errors.push(`Edge "${edge.id}" has an unsupported condition kind.`);
      }

      if (edge.condition.kind === 'number') {
        if (
          !['lt', 'lte', 'gt', 'gte', 'eq'].includes(edge.condition.operator)
        ) {
          errors.push(`Edge "${edge.id}" has an invalid number operator.`);
        }

        if (
          typeof edge.condition.value !== 'number' ||
          Number.isNaN(edge.condition.value)
        ) {
          errors.push(
            `Edge "${edge.id}" must have a valid numeric condition value.`,
          );
        }
      }

      if (edge.condition.kind === 'numberRange') {
        if (
          typeof edge.condition.min !== 'number' ||
          Number.isNaN(edge.condition.min) ||
          typeof edge.condition.max !== 'number' ||
          Number.isNaN(edge.condition.max)
        ) {
          errors.push(
            `Edge "${edge.id}" must have valid numeric range values.`,
          );
        }

        if (edge.condition.min > edge.condition.max) {
          errors.push(
            `Edge "${edge.id}" has a number range where min is greater than max.`,
          );
        }

        if (
          edge.condition.min === edge.condition.max &&
          (!edge.condition.minInclusive || !edge.condition.maxInclusive)
        ) {
          errors.push(
            `Edge "${edge.id}" has an empty number range because min and max are equal but not both inclusive.`,
          );
        }
      }
    }
  }

  for (const startNode of startNodes) {
    const hasIncomingEdge = graph.edges.some(
      (edge) => edge.target === startNode.id,
    );

    if (hasIncomingEdge) {
      errors.push(
        `Start node "${startNode.label}" cannot have incoming edges.`,
      );
    }
  }

  for (const endNode of endNodes) {
    const hasOutgoingEdge = graph.edges.some(
      (edge) => edge.source === endNode.id,
    );

    if (hasOutgoingEdge) {
      errors.push(`End node "${endNode.label}" cannot have outgoing edges.`);
    }
  }

  for (const node of graph.nodes) {
    const outgoingEdges = graph.edges.filter((edge) => edge.source === node.id);

    if (
      (node.type === 'start' ||
        node.type === 'question' ||
        node.type === 'info') &&
      outgoingEdges.length === 0
    ) {
      errors.push(
        `${node.type.charAt(0).toUpperCase() + node.type.slice(1)} node "${node.label}" must have at least one outgoing edge.`,
      );
    }

    if (node.type === 'question' && node.questionType === 'number') {
      for (const edge of outgoingEdges) {
        if (!edge.condition) {
          errors.push(
            `All outgoing edges from number question "${node.label}" must have a numeric condition.`,
          );
        }

        if (
          edge.condition &&
          edge.condition.kind !== 'number' &&
          edge.condition.kind !== 'numberRange'
        ) {
          errors.push(
            `All outgoing edges from number question "${node.label}" must use numeric conditions.`,
          );
        }
      }

      const intervals = outgoingEdges
        .map((edge) => toNumberInterval(edge))
        .filter((interval): interval is NumberInterval => interval !== null);

      for (let i = 0; i < outgoingEdges.length; i++) {
        for (let j = i + 1; j < outgoingEdges.length; j++) {
          const firstEdge = outgoingEdges[i];
          const secondEdge = outgoingEdges[j];

          const firstInterval = toNumberInterval(firstEdge);
          const secondInterval = toNumberInterval(secondEdge);

          if (!firstInterval || !secondInterval) continue;

          if (intervalsOverlap(firstInterval, secondInterval)) {
            errors.push(
              `Number question "${node.label}" has overlapping conditions on edges "${firstEdge.id}" and "${secondEdge.id}".`,
            );
          }
        }
      }

      if (
        outgoingEdges.length > 0 &&
        intervals.length === outgoingEdges.length &&
        !hasFullNumberCoverage(intervals)
      ) {
        errors.push(
          `Number question "${node.label}" has gaps in its conditions. Numeric conditions must cover all possible values.`,
        );
      }
    }

    if (node.type === 'question' && node.questionType === 'text') {
      if (outgoingEdges.length !== 1) {
        errors.push(
          `Text question "${node.label}" must have exactly one outgoing edge.`,
        );
      }

      for (const edge of outgoingEdges) {
        if (edge.condition) {
          errors.push(
            `Text question "${node.label}" cannot use edge conditions.`,
          );
        }
      }
    }

    if (node.type === 'question' && node.questionType === 'multipleChoice') {
      if (outgoingEdges.length !== 1) {
        errors.push(
          `Multiple choice question "${node.label}" must have exactly one outgoing edge.`,
        );
      }

      for (const edge of outgoingEdges) {
        if (edge.condition) {
          errors.push(
            `Multiple choice question "${node.label}" cannot use edge conditions.`,
          );
        }
      }
    }
  }

  if (startNodes.length === 1) {
    const startNode = startNodes[0];
    const visited = new Set<string>();
    const queue: string[] = [startNode.id];

    while (queue.length > 0) {
      const currentNodeId = queue.shift();

      if (!currentNodeId || visited.has(currentNodeId)) {
        continue;
      }

      visited.add(currentNodeId);

      const nextEdges = graph.edges.filter(
        (edge) => edge.source === currentNodeId,
      );

      for (const edge of nextEdges) {
        if (!visited.has(edge.target)) {
          queue.push(edge.target);
        }
      }
    }

    for (const node of graph.nodes) {
      if (!visited.has(node.id)) {
        errors.push(
          `Node "${node.label}" is not reachable from the start node.`,
        );
      }
    }

    const reachableEndNodes = endNodes.filter((node) => visited.has(node.id));

    if (reachableEndNodes.length === 0) {
      errors.push(
        'At least one end node must be reachable from the start node.',
      );
    }
  }

  return errors;
}
