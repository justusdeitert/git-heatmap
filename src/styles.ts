import { variablesCSS } from './styles/variables.js';
import { baseCSS } from './styles/base.js';
import { componentsCSS } from './styles/components.js';
import { heatmapCSS } from './styles/heatmap.js';
import { commitsCSS } from './styles/commits.js';
import { modalCSS } from './styles/modal.js';
import { traceCSS } from './styles/trace.js';

export const CSS = [
  variablesCSS,
  baseCSS,
  componentsCSS,
  heatmapCSS,
  commitsCSS,
  modalCSS,
  traceCSS,
].join('\n');
