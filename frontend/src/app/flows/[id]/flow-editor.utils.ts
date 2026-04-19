import type { Node } from 'reactflow';
import type { DomainNodeType } from './flow-editor.types';

export function mapDomainTypeToReactFlowType(type: DomainNodeType): string {
  switch (type) {
    case 'start':
      return 'input';
    case 'end':
      return 'output';
    case 'info':
      return 'default';
    case 'question':
    default:
      return 'default';
  }
}

export function getNodeStyle(
  nodeType: DomainNodeType,
  isSelected: boolean,
): React.CSSProperties {
  const baseStyle: React.CSSProperties = {
    borderRadius: '12px',
    padding: '10px 14px',
    border: '2px solid',
    fontWeight: 600,
    minWidth: 120,
    textAlign: 'center',
    boxShadow: isSelected
      ? '0 0 0 4px rgba(59, 130, 246, 0.25)'
      : '0 1px 3px rgba(0, 0, 0, 0.12)',
    transition: 'all 0.15s ease',
  };

  switch (nodeType) {
    case 'start':
      return {
        ...baseStyle,
        backgroundColor: '#dcfce7',
        borderColor: isSelected ? '#2563eb' : '#16a34a',
        color: '#166534',
      };
    case 'end':
      return {
        ...baseStyle,
        backgroundColor: '#f3e8ff',
        borderColor: isSelected ? '#2563eb' : '#9333ea',
        color: '#6b21a8',
      };
    case 'info':
      return {
        ...baseStyle,
        backgroundColor: '#fef3c7',
        borderColor: isSelected ? '#2563eb' : '#d97706',
        color: '#92400e',
      };
    case 'question':
    default:
      return {
        ...baseStyle,
        backgroundColor: '#dbeafe',
        borderColor: isSelected ? '#2563eb' : '#2563eb',
        color: '#1e3a8a',
      };
  }
}

export function createNode(
  nodeType: DomainNodeType,
  index: number,
  label?: string,
): Node {
  return {
    id: crypto.randomUUID(),
    type: mapDomainTypeToReactFlowType(nodeType),
    position: {
      x: 150 + index * 50,
      y: 150 + index * 50,
    },
    data: {
      label:
        label ??
        (nodeType === 'start'
          ? 'Start'
          : nodeType === 'end'
            ? 'End'
            : nodeType === 'info'
              ? `Info ${index + 1}`
              : `Question ${index + 1}`),
      nodeType,
      introText: '',
      questionText: '',
      resultText: '',
      infoText: '',
    },
    style: getNodeStyle(nodeType, false),
  };
}