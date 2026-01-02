import type { ChipPosition } from '../types';

/**
 * Pre-defined positions for tool chips in the Professional Tools section
 */
export const CHIP_POSITIONS: ChipPosition[] = [
    { toolId: 'invert', top: '25%', left: '25%' },
    { toolId: 'outpaint', top: '35%', left: '15%' },
    { toolId: 'inpaint', top: '50%', left: '26%' },
    { toolId: 'mask extractor', top: '44%', left: '5%' },
    { toolId: 'painter', top: '25%', right: '25%' },
    { toolId: 'channels', top: '35%', right: '15%' },
    { toolId: 'relight', top: '50%', right: '26%' },
];
