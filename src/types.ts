export interface CashSession {
  id: string;
  openingAmount: number;
  countedClosingAmount?: number;
  responsibleUser: string;
  startTime: string;
  endTime?: string;
  status: 'open' | 'closed';
  createdAt: string;
  totalInflows?: number;
  totalOutflows?: number;
  expectedClosing?: number;
  difference?: number;
}

export interface Transaction {
  id: string;
  sessionId: string;
  type: 'inflow' | 'outflow';
  description: string;
  category?: string;
  paymentMethod?: string;
  amount: number;
  timestamp: string;
  responsibleUser: string;
  sessionDate: string;
}

export interface CategoryConfig {
  enabled: boolean;
  inflowCategories: string[];
  outflowCategories: string[];
}

export interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  frequency: 'once' | 'monthly' | 'yearly';
  category?: string;
  notes?: string;
  isPaid: boolean;
  createdAt: string;
}
