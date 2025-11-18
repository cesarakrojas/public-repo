import type { CashSession, Transaction } from '../types';

export const calculateTotalInflows = (transactions: Transaction[]): number => {
  return transactions
    .filter(t => t.type === 'inflow')
    .reduce((sum, t) => sum + t.amount, 0);
};

export const calculateTotalOutflows = (transactions: Transaction[]): number => {
  return transactions
    .filter(t => t.type === 'outflow')
    .reduce((sum, t) => sum + t.amount, 0);
};

export const calculateExpectedClosing = (
  openingAmount: number,
  totalInflows: number,
  totalOutflows: number
): number => {
  return openingAmount + totalInflows - totalOutflows;
};

export const calculateDifference = (
  countedAmount: number | undefined,
  expectedAmount: number
): number => {
  if (countedAmount === undefined) return 0;
  return countedAmount - expectedAmount;
};

export const calculateSessionMetrics = (session: CashSession & { transactions: Transaction[] }) => {
  const totalInflows = calculateTotalInflows(session.transactions);
  const totalOutflows = calculateTotalOutflows(session.transactions);
  const expectedClosing = calculateExpectedClosing(session.openingAmount, totalInflows, totalOutflows);
  const difference = calculateDifference(session.countedClosingAmount, expectedClosing);
  
  return {
    totalInflows,
    totalOutflows,
    expectedClosing,
    difference
  };
};

export const getBalanceStatusColor = (difference: number): string => {
  if (difference === 0) return 'text-emerald-600 dark:text-emerald-400';
  if (difference > 0) return 'text-green-600 dark:text-green-400';
  return 'text-red-600 dark:text-red-400';
};

export const getBalanceStatusBgColor = (difference: number): string => {
  if (difference === 0) return 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400';
  if (difference > 0) return 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400';
  return 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400';
};
