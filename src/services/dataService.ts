import type { CashSession, Transaction, Bill } from '../types';
import { calculateTotalInflows, calculateTotalOutflows, calculateExpectedClosing, calculateDifference } from '../utils/calculations';

const STORAGE_KEYS = {
  SESSIONS: 'cashier_sessions',
  TRANSACTIONS: 'cashier_transactions',
  ACTIVE_SESSION: 'cashier_active_session',
  BILLS: 'app_bills'
};

// Generate unique ID
const generateId = (): string => {
  return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
};

// Get all sessions from localStorage
const getSessions = (): CashSession[] => {
  const data = localStorage.getItem(STORAGE_KEYS.SESSIONS);
  return data ? JSON.parse(data) : [];
};

// Save sessions to localStorage
const saveSessions = (sessions: CashSession[]): void => {
  localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
};

// Get all transactions from localStorage
const getTransactions = (): Transaction[] => {
  const data = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
  return data ? JSON.parse(data) : [];
};

// Save transactions to localStorage
const saveTransactions = (transactions: Transaction[]): void => {
  localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(transactions));
};

// Get active session ID
const getActiveSessionId = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_SESSION);
};

// Set active session ID
const setActiveSessionId = (id: string | null): void => {
  if (id === null) {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_SESSION);
  } else {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_SESSION, id);
  }
};

// Create a new session
export const createSession = async (openingAmount: number, responsibleUser: string): Promise<CashSession> => {
  const sessions = getSessions();
  
  const newSession: CashSession = {
    id: generateId(),
    openingAmount,
    responsibleUser,
    startTime: new Date().toISOString(),
    status: 'open',
    createdAt: new Date().toISOString()
  };
  
  sessions.push(newSession);
  saveSessions(sessions);
  setActiveSessionId(newSession.id);
  
  return newSession;
};

// Get active session
export const getActiveSession = (): CashSession | null => {
  const activeId = getActiveSessionId();
  if (!activeId) return null;
  
  const sessions = getSessions();
  return sessions.find(s => s.id === activeId && s.status === 'open') || null;
};

// Subscribe to active session changes
export const subscribeToActiveSession = (callback: (session: CashSession | null) => void): () => void => {
  // Initial call
  callback(getActiveSession());
  
  // Listen for storage changes (for multi-tab support)
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.SESSIONS || e.key === STORAGE_KEYS.ACTIVE_SESSION) {
      callback(getActiveSession());
    }
  };
  
  window.addEventListener('storage', handler);
  
  // Return cleanup function
  return () => window.removeEventListener('storage', handler);
};

// Add a transaction
export const addTransaction = async (
  sessionId: string,
  type: 'inflow' | 'outflow',
  description: string,
  amount: number,
  responsibleUser: string,
  sessionDate: string,
  category?: string,
  paymentMethod?: string
): Promise<Transaction> => {
  const transactions = getTransactions();
  
  const newTransaction: Transaction = {
    id: generateId(),
    sessionId,
    type,
    description,
    amount,
    timestamp: new Date().toISOString(),
    responsibleUser,
    sessionDate,
    category,
    paymentMethod
  };
  
  transactions.push(newTransaction);
  saveTransactions(transactions);
  
  // Trigger storage event for subscribers
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEYS.TRANSACTIONS,
    newValue: JSON.stringify(transactions)
  }));
  
  return newTransaction;
};

// Get transactions for a session
export const getSessionTransactions = (sessionId: string): Transaction[] => {
  const transactions = getTransactions();
  return transactions
    .filter(t => t.sessionId === sessionId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// Subscribe to session transactions
export const subscribeToSessionTransactions = (
  sessionId: string,
  callback: (transactions: Transaction[]) => void
): () => void => {
  // Initial call
  callback(getSessionTransactions(sessionId));
  
  // Listen for storage changes
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.TRANSACTIONS) {
      callback(getSessionTransactions(sessionId));
    }
  };
  
  window.addEventListener('storage', handler);
  
  return () => window.removeEventListener('storage', handler);
};

// Close a session
export const closeSession = async (sessionId: string, countedAmount: number): Promise<void> => {
  const sessions = getSessions();
  const transactions = getSessionTransactions(sessionId);
  
  const sessionIndex = sessions.findIndex(s => s.id === sessionId);
  if (sessionIndex === -1) throw new Error('Session not found');
  
  const session = sessions[sessionIndex];
  const totalInflows = calculateTotalInflows(transactions);
  const totalOutflows = calculateTotalOutflows(transactions);
  const expectedClosing = calculateExpectedClosing(session.openingAmount, totalInflows, totalOutflows);
  const difference = calculateDifference(countedAmount, expectedClosing);
  
  sessions[sessionIndex] = {
    ...session,
    status: 'closed',
    endTime: new Date().toISOString(),
    countedClosingAmount: countedAmount,
    totalInflows,
    totalOutflows,
    expectedClosing,
    difference
  };
  
  saveSessions(sessions);
  setActiveSessionId(null);
  
  // Trigger storage event
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEYS.SESSIONS,
    newValue: JSON.stringify(sessions)
  }));
};

// Get closed sessions with pagination
export const getClosedSessions = async (
  limit: number = 20,
  startAfter?: any
): Promise<{ sessions: CashSession[]; lastVisible: any }> => {
  const allSessions = getSessions();
  const closedSessions = allSessions
    .filter(s => s.status === 'closed')
    .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  
  const startIndex = startAfter ? startAfter.index + 1 : 0;
  const endIndex = startIndex + limit;
  const sessions = closedSessions.slice(startIndex, endIndex);
  
  return {
    sessions,
    lastVisible: sessions.length > 0 ? { index: endIndex - 1 } : null
  };
};

// Get all transactions with filters
export const getTransactionsWithFilters = async (filters: {
  startDate?: string;
  endDate?: string;
  type?: 'inflow' | 'outflow';
  searchTerm?: string;
}): Promise<Transaction[]> => {
  let transactions = getTransactions();
  
  // Filter by date range
  if (filters.startDate) {
    transactions = transactions.filter(t => t.timestamp >= filters.startDate!);
  }
  if (filters.endDate) {
    const endOfDay = new Date(filters.endDate);
    endOfDay.setHours(23, 59, 59, 999);
    transactions = transactions.filter(t => t.timestamp <= endOfDay.toISOString());
  }
  
  // Filter by type
  if (filters.type) {
    transactions = transactions.filter(t => t.type === filters.type);
  }
  
  // Filter by search term
  if (filters.searchTerm) {
    const term = filters.searchTerm.toLowerCase();
    transactions = transactions.filter(t =>
      t.description.toLowerCase().includes(term) ||
      t.category?.toLowerCase().includes(term)
    );
  }
  
  return transactions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

// ==================== BILLS MANAGEMENT ====================

// Get all bills from localStorage
const getBills = (): Bill[] => {
  const data = localStorage.getItem(STORAGE_KEYS.BILLS);
  return data ? JSON.parse(data) : [];
};

// Save bills to localStorage
const saveBills = (bills: Bill[]): void => {
  localStorage.setItem(STORAGE_KEYS.BILLS, JSON.stringify(bills));
  
  // Trigger storage event for multi-tab sync
  window.dispatchEvent(new StorageEvent('storage', {
    key: STORAGE_KEYS.BILLS,
    newValue: JSON.stringify(bills)
  }));
};

// Get all bills
export const getAllBills = (): Bill[] => {
  return getBills();
};

// Subscribe to bills changes
export const subscribeToBills = (callback: (bills: Bill[]) => void): () => void => {
  // Initial call
  callback(getBills());
  
  // Listen for storage changes
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.BILLS) {
      callback(getBills());
    }
  };
  
  window.addEventListener('storage', handler);
  
  return () => window.removeEventListener('storage', handler);
};

// Create a new bill
export const createBill = async (
  name: string,
  amount: number,
  dueDate: string,
  frequency: 'once' | 'monthly' | 'yearly',
  category?: string,
  notes?: string
): Promise<Bill> => {
  const bills = getBills();
  
  const newBill: Bill = {
    id: generateId(),
    name: name.trim(),
    amount,
    dueDate,
    frequency,
    category: category?.trim() || undefined,
    notes: notes?.trim() || undefined,
    isPaid: false,
    createdAt: new Date().toISOString()
  };
  
  bills.push(newBill);
  saveBills(bills);
  
  return newBill;
};

// Update an existing bill
export const updateBill = async (
  billId: string,
  updates: Partial<Omit<Bill, 'id' | 'createdAt'>>
): Promise<Bill> => {
  const bills = getBills();
  const billIndex = bills.findIndex(b => b.id === billId);
  
  if (billIndex === -1) {
    throw new Error('Bill not found');
  }
  
  const updatedBill: Bill = {
    ...bills[billIndex],
    ...updates,
    name: updates.name?.trim() || bills[billIndex].name,
    category: updates.category?.trim() || undefined,
    notes: updates.notes?.trim() || undefined
  };
  
  bills[billIndex] = updatedBill;
  saveBills(bills);
  
  return updatedBill;
};

// Delete a bill
export const deleteBill = async (billId: string): Promise<void> => {
  const bills = getBills();
  const filteredBills = bills.filter(b => b.id !== billId);
  
  saveBills(filteredBills);
};

// Toggle bill paid status and optionally create transaction
export const toggleBillPaid = async (
  billId: string,
  createTransaction: boolean = true
): Promise<Bill> => {
  const bills = getBills();
  const billIndex = bills.findIndex(b => b.id === billId);
  
  if (billIndex === -1) {
    throw new Error('Bill not found');
  }
  
  const bill = bills[billIndex];
  const newPaidStatus = !bill.isPaid;
  
  // Update bill status
  bills[billIndex] = {
    ...bill,
    isPaid: newPaidStatus
  };
  
  saveBills(bills);
  
  // Create transaction if marking as paid and createTransaction is true
  if (newPaidStatus && createTransaction) {
    await addTransaction(
      'continuous', // Use continuous session for bill payments
      'outflow',
      `Pago: ${bill.name}`,
      bill.amount,
      'Usuario',
      new Date().toISOString(),
      bill.category || 'Gastos Fijos',
      undefined
    );
  }
  
  return bills[billIndex];
};
