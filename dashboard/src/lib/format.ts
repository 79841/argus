export const formatCost = (v: number): string => `$${v.toFixed(2)}`

export const formatCostDetail = (v: number): string => {
  if (v >= 1) return `$${v.toFixed(2)}`
  if (v >= 0.01) return `$${v.toFixed(3)}`
  return `$${v.toFixed(4)}`
}

export const formatCostChart = (v: number): string => `$${v.toFixed(4)}`
