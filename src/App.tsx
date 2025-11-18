import React, { useState, useEffect, useMemo } from 'react';
import type { Transaction, CategoryConfig } from './types';
import { CashIcon, ArrowUpIcon, ArrowDownIcon, PlusIcon, CalendarIcon, ChartBarIcon, Cog6ToothIcon, Bars3Icon, BellIcon, XMarkIcon, UserIcon } from './components/icons';
import { CategorySettings } from './components/CategorySettings';
import { ReportsView } from './components/ReportsView';
import { CalendarView } from './components/CalendarView';
import { Modal } from './components/Modal';
import { calculateTotalInflows, calculateTotalOutflows } from './utils/calculations';
import { INPUT_BASE_CLASSES } from './utils/constants';
import { formatCurrency, formatTime } from './utils/formatters';
import * as dataService from './services/dataService';

// --- CHILD COMPONENTS ---

interface TransactionItemProps {
  transaction: Transaction;
}
const TransactionItem: React.FC<TransactionItemProps> = ({ transaction }) => {
  const is_inflow = transaction.type === 'inflow';
  return (
    <li className="flex items-center justify-between py-4 px-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded-lg transition-colors duration-200">
      <div className="flex items-center space-x-4">
        <div className={`p-2 rounded-full ${is_inflow ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'}`}>
          {is_inflow ? <ArrowUpIcon className="w-5 h-5" /> : <ArrowDownIcon className="w-5 h-5" />}
        </div>
        <div>
          <p className="font-semibold text-slate-800 dark:text-slate-100">{transaction.description}</p>
          <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <span>{formatTime(transaction.timestamp)}</span>
            {transaction.category && (
              <>
                <span>•</span>
                <span className="italic">{transaction.category}</span>
              </>
            )}
          </div>
        </div>
      </div>
      <p className={`font-bold text-lg ${is_inflow ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {is_inflow ? '+' : '-'} {formatCurrency(transaction.amount)}
      </p>
    </li>
  );
};

interface NewTransactionFormProps {
    onAddTransaction: (transaction: Omit<Transaction, 'id' | 'timestamp' | 'sessionId' | 'responsibleUser' | 'sessionDate'>) => void;
    categoryConfig: CategoryConfig;
    initialType?: 'inflow' | 'outflow';
    onClose?: () => void;
}
const NewTransactionForm: React.FC<NewTransactionFormProps> = ({ onAddTransaction, categoryConfig, initialType, onClose }) => {
    const [description, setDescription] = useState('');
    const [category, setCategory] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('');
    const [amount, setAmount] = useState('');
    const [type, setType] = useState<'inflow' | 'outflow'>(initialType || 'inflow');
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (description.trim() && parseFloat(amount) > 0) {
            onAddTransaction({ 
                description, 
                amount: parseFloat(amount), 
                type,
                category: category || undefined,
                paymentMethod: paymentMethod || undefined
            });
            setDescription('');
            setCategory('');
            setPaymentMethod('');
            setAmount('');
            if (onClose) onClose();
        }
    };

    const availableCategories = type === 'inflow' ? categoryConfig.inflowCategories : categoryConfig.outflowCategories;

    return (
        <form onSubmit={handleSubmit} className="p-0 bg-white dark:bg-slate-800 space-y-4">
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción de la transacción" required className={INPUT_BASE_CLASSES}/>
            {categoryConfig.enabled && (
              <select value={category} onChange={e => setCategory(e.target.value)} className={INPUT_BASE_CLASSES}>
                  <option value="">Seleccionar categoría (opcional)</option>
                  {availableCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
              </select>
            )}
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className={INPUT_BASE_CLASSES}>
                <option value="">Seleccionar medio de pago (opcional)</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Tarjeta">Tarjeta</option>
                <option value="Transferencia">Transferencia</option>
                <option value="Cheque">Cheque</option>
                <option value="Otro">Otro</option>
            </select>
            <div className="flex gap-2">
                <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto" min="0.01" step="0.01" required className={INPUT_BASE_CLASSES}/>
                <button type="submit" className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold p-2 rounded-lg transition-transform transform hover:scale-105 flex items-center justify-center aspect-square">
                    <PlusIcon className="w-6 h-6"/>
                </button>
            </div>
        </form>
    );
};





interface NavButtonProps {
  view: 'home' | 'history' | 'reports' | 'settings';
  currentView: 'home' | 'history' | 'reports' | 'settings';
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  title?: string;
}
const NavButton: React.FC<NavButtonProps> = ({ view, currentView, icon: Icon, label, onClick, title }) => {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 text-white font-semibold py-2 px-4 rounded-lg backdrop-blur-sm transition ${
        currentView === view ? 'bg-white/30' : 'bg-white/20 hover:bg-white/30'
      }`}
      title={title}
    >
      <Icon className="w-5 h-5"/>
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
};

// --- MAIN APP COMPONENT ---

export default function App() {
  const [view, setView] = useState<'home' | 'calendar' | 'reports' | 'settings'>('home');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [mobileTransactionModal, setMobileTransactionModal] = useState<'inflow' | 'outflow' | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuSlideIn, setMenuSlideIn] = useState(false);
  const [categoryConfig, setCategoryConfig] = useState<CategoryConfig>({
    enabled: true,
    inflowCategories: ['Ventas', 'Servicios', 'Otros Ingresos'],
    outflowCategories: ['Gastos Operativos', 'Salarios', 'Suministros', 'Servicios Públicos', 'Mantenimiento', 'Transporte', 'Otros Gastos']
  });

  // Load theme and initial data
  useEffect(() => {
    const isDark = document.documentElement.classList.contains('dark');
    setIsDarkMode(isDark);
    
    const savedConfig = localStorage.getItem('categoryConfig');
    if (savedConfig) {
      try {
        setCategoryConfig(JSON.parse(savedConfig));
      } catch (error) {
        console.error('Error loading category config:', error);
      }
    }

    // Load all transactions
    const loadData = async () => {
      const txs = await dataService.getTransactionsWithFilters({});
      setTransactions(txs);
    };

    loadData();

    // Listen for storage changes (for multi-tab sync)
    const handleStorageChange = () => {
      loadData();
      const savedConfig = localStorage.getItem('categoryConfig');
      if (savedConfig) {
        try {
          setCategoryConfig(JSON.parse(savedConfig));
        } catch (error) {
          console.error('Error loading category config:', error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Handle body scroll lock and trigger slide-in animation for the mobile menu
  useEffect(() => {
    if (isMenuOpen) {
      // lock background scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      // trigger slide-in on next frame
      requestAnimationFrame(() => setMenuSlideIn(true));
      return () => {
        document.body.style.overflow = originalOverflow;
        setMenuSlideIn(false);
      };
    } else {
      setMenuSlideIn(false);
    }
  }, [isMenuOpen]);

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    
    setIsDarkMode(newDarkMode);
  };

  const handleSaveCategoryConfig = (config: CategoryConfig) => {
    setCategoryConfig(config);
    localStorage.setItem('categoryConfig', JSON.stringify(config));
  };

  const handleAddTransaction = async (transaction: Omit<Transaction, 'id' | 'timestamp' | 'sessionId' | 'responsibleUser' | 'sessionDate'>) => {
    try {
      // Use a dummy session ID for continuous tracking
      await dataService.addTransaction(
        'continuous',
        transaction.type,
        transaction.description,
        transaction.amount,
        'Usuario',
        new Date().toISOString(),
        transaction.category,
        transaction.paymentMethod
      );
      // Reload all transactions
      const txs = await dataService.getTransactionsWithFilters({});
      setTransactions(txs);
    } catch (error) {
      console.error('Error adding transaction:', error);
      alert('Error al agregar la transacción.');
    }
  };

  const totalInflows = useMemo(() => calculateTotalInflows(transactions), [transactions]);
  const totalOutflows = useMemo(() => calculateTotalOutflows(transactions), [transactions]);
  const netBalance = useMemo(() => totalInflows - totalOutflows, [totalInflows, totalOutflows]);

  const MainView = () => {
    return (
        <div className="w-full max-w-4xl mx-auto animate-fade-in-up space-y-6">
            <header className="bg-white dark:bg-slate-800 shadow-lg rounded-2xl p-6">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Registro Diario</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">
                      {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </p>
                  </div>
                  <div className="w-full sm:w-auto grid grid-cols-2 gap-2">
                    <button onClick={() => setMobileTransactionModal('inflow')} className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-emerald-500/30 transition-transform transform hover:scale-105">
                      <ArrowUpIcon className="w-5 h-5"/> Ingreso
                    </button>
                    <button onClick={() => setMobileTransactionModal('outflow')} className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-lg shadow-red-500/30 transition-transform transform hover:scale-105">
                      <ArrowDownIcon className="w-5 h-5"/> Egreso
                    </button>
                  </div>
                </div>
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                    <div className="bg-emerald-100 dark:bg-emerald-900/50 p-4 rounded-xl">
                        <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">Total Ingresos</p>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(totalInflows)}</p>
                    </div>
                    <div className="bg-red-100 dark:bg-red-900/50 p-4 rounded-xl">
                        <p className="text-sm font-medium text-red-700 dark:text-red-300">Total Egresos</p>
                        <p className="text-2xl font-bold text-red-700 dark:text-red-300">{formatCurrency(totalOutflows)}</p>
                    </div>
                    <div className={`p-4 rounded-xl ${netBalance >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-orange-100 dark:bg-orange-900/50'}`}>
                        <p className={`text-sm font-medium ${netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-400' : 'text-orange-700 dark:text-orange-300'}`}>Balance Neto</p>
                        <p className={`text-2xl font-bold ${netBalance >= 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-orange-700 dark:text-orange-300'}`}>{formatCurrency(netBalance)}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 gap-6">
                <div>
                    <div className="bg-white dark:bg-slate-800 shadow-lg rounded-2xl p-6">
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">Transacciones</h3>
                         {transactions.length === 0 ? (
                            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                                <p>No se han registrado transacciones todavía.</p>
                            </div>
                        ) : (
                            <ul className="divide-y divide-slate-200 dark:divide-slate-700 -mx-2">
                                {transactions.map(t => <TransactionItem key={t.id} transaction={t} />)}
                            </ul>
                        )}
                    </div>
                </div>
            </div>

            <Modal 
                isOpen={mobileTransactionModal !== null} 
                onClose={() => setMobileTransactionModal(null)}
                title={mobileTransactionModal === 'inflow' ? 'Nuevo Ingreso' : mobileTransactionModal === 'outflow' ? 'Nuevo Egreso' : 'Nueva Transacción'}
            >
                <NewTransactionForm 
                    onAddTransaction={handleAddTransaction} 
                    categoryConfig={categoryConfig} 
                    initialType={mobileTransactionModal || 'inflow'}
                    onClose={() => setMobileTransactionModal(null)}
                />
            </Modal>
        </div>
    );
  };



  const SettingsView = () => {
    return (
      <CategorySettings
        onSave={handleSaveCategoryConfig}
        initialConfig={categoryConfig}
        isDarkMode={isDarkMode}
        onToggleTheme={toggleTheme}
      />
    );
  };

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-200 transition-colors duration-300 font-sans pb-20">
      <div className="absolute top-0 left-0 w-full h-72 bg-gradient-to-br from-emerald-500 to-teal-600 dark:from-emerald-800 dark:to-teal-900 rounded-b-[3rem]"></div>
      <div className="relative p-4 sm:p-6 md:p-8">
        <nav className="flex justify-between items-center mb-10 relative z-10">
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition"
            aria-label="Menu"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Registro Diario</h1>
          <button
            className="p-2 text-white hover:bg-white/20 rounded-lg transition relative"
            aria-label="Notificaciones"
          >
            <BellIcon className="w-6 h-6" />
          </button>
        </nav>

        {/* Mobile-first slide-in drawer menu */}
        {isMenuOpen && (
          <div className="fixed inset-0 z-50 flex">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
              onClick={() => setIsMenuOpen(false)}
            />
            {/* Drawer panel */}
            <div
              className={`relative ml-0 h-full w-[80vw] max-w-sm sm:max-w-md bg-white dark:bg-slate-800 shadow-2xl z-50 transform transition-transform duration-300 ease-out ${menuSlideIn ? 'translate-x-0' : '-translate-x-full'}`}
              role="dialog"
              aria-modal="true"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-3">
                  <Bars3Icon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <h3 className="text-lg font-bold text-slate-800 dark:text-white">Menú</h3>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                  aria-label="Cerrar menú"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>

              {/* Items with large touch targets */}
              <div className="py-2">
                <button
                  onClick={() => { setIsMenuOpen(false); }}
                  className="w-full px-5 py-4 text-left flex items-center gap-4 text-lg font-medium text-slate-800 dark:text-slate-100 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition"
                >
                  <CashIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                  <span>Registro</span>
                </button>
                <button
                  onClick={() => { setIsMenuOpen(false); alert('Módulo de Productos próximamente'); }}
                  className="w-full px-5 py-4 text-left flex items-center gap-4 text-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                >
                  <div className="w-6 h-6 text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
                    </svg>
                  </div>
                  <span>Productos</span>
                </button>
                <button
                  onClick={() => { setIsMenuOpen(false); alert('Módulo de Clientes próximamente'); }}
                  className="w-full px-5 py-4 text-left flex items-center gap-4 text-lg font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition"
                >
                  <UserIcon className="w-6 h-6 text-slate-400" />
                  <span>Clientes</span>
                </button>
              </div>
            </div>
            {/* Spacer to catch clicks on the right area; click closes via backdrop */}
            <div className="flex-1" />
          </div>
        )}

        <main className="flex flex-col items-center justify-center">
            {view === 'home' ? <MainView /> : view === 'reports' ? <ReportsView /> : view === 'settings' ? <SettingsView /> : <CalendarView />}
        </main>
      </div>
      
      {/* Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 shadow-lg z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex justify-around items-center">
            <button
              onClick={() => setView('home')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition ${
                view === 'home' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <CashIcon className="w-6 h-6"/>
              <span className="text-xs font-medium">Inicio</span>
            </button>
            <button
              onClick={() => setView('reports')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition ${
                view === 'reports' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <ChartBarIcon className="w-6 h-6"/>
              <span className="text-xs font-medium">Reportes</span>
            </button>
            <button
              onClick={() => setView('calendar')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition ${
                view === 'calendar' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <CalendarIcon className="w-6 h-6"/>
              <span className="text-xs font-medium">Calendario</span>
            </button>
            <button
              onClick={() => setView('settings')}
              className={`flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition ${
                view === 'settings' ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
              }`}
            >
              <Cog6ToothIcon className="w-6 h-6"/>
              <span className="text-xs font-medium">Ajustes</span>
            </button>
          </div>
        </div>
      </nav>
    </div>
  );
}