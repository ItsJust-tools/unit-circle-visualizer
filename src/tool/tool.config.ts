import type { ToolConfig } from '@itsjust/core';

export const toolConfig: ToolConfig = {
  id: 'unit-circle-visualizer',
  name: 'Unit Circle Visualizer',
  description:
    'Interactive unit circle explorer showing angle in degrees and radians, sine, cosine, tangent values, and quadrant, with animated pointer and snapshot of coordinates.',
  version: '1.0.0',
  exportFormats: ['json', 'png', 'jpeg', 'webp', 'pdf'],
  features: {
    export: true,
    autoSave: true,
    undoRedo: false,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  },
  theme: {
    accent: '#2563eb',
    accentHover: '#1d4ed8',
    accentSubtle: 'rgba(37, 99, 235, 0.12)',
    brand: 'Unit Circle Visualizer',
    icon: '🌀',
  },
};

export default toolConfig;
