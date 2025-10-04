/**
 * Utility functions for calculating pallet fill percentage
 */

export interface PalletProgressData {
  reserved_bottles: number;
  capacity_bottles?: number;
  percent_filled?: number;
  status: 'OPEN' | 'CONSOLIDATING' | 'SHIPPED' | 'DELIVERED';
}

/**
 * Calculate pallet fill percentage
 * @param data Pallet progress data
 * @returns Percentage (0-100) or null if data insufficient
 */
export function getPercentFilled(data: PalletProgressData): number | null {
  const { reserved_bottles, capacity_bottles, percent_filled, status } = data;
  
  // Use provided percent_filled if available
  if (typeof percent_filled === 'number') {
    return Math.max(0, Math.min(100, Math.round(percent_filled)));
  }
  
  // Calculate from reserved/capacity if capacity is available
  if (typeof capacity_bottles === 'number' && capacity_bottles > 0) {
    const calculated = (reserved_bottles / capacity_bottles) * 100;
    return Math.max(0, Math.min(100, Math.round(calculated)));
  }
  
  // For SHIPPED/DELIVERED, assume 100% if no capacity data
  if (status === 'SHIPPED' || status === 'DELIVERED') {
    return 100;
  }
  
  // No capacity data available
  return null;
}

/**
 * Format percentage for display
 * @param percent Percentage or null
 * @returns Formatted string
 */
export function formatPercent(percent: number | null): string {
  if (percent === null) return '—%';
  return `${percent}%`;
}

/**
 * Check if pallet should show percentage
 * @param status Pallet status
 * @returns Whether to show percentage
 */
export function shouldShowPercent(status: string): boolean {
  return status === 'OPEN' || status === 'CONSOLIDATING';
}
