import React, { useState, useMemo } from 'react';
import type { Transaction } from '../types';
import { ArrowUpIcon, ArrowDownIcon, ChartBarIcon, DocumentArrowDownIcon, TrashIcon } from './icons';
import { calculateTotalInflows, calculateTotalOutflows } from '../utils/calculations';
import { INPUT_BASE_CLASSES, DATE_INPUT_CLASSES } from '../utils/constants';
import { formatCurrency, formatDate, formatTime } from '../utils/formatters';
import * as dataService from '../services/dataService';

interface StatCardProps {
  label: string;
  value: string;
  bgColor: string;
  textColor: string;
}
const StatCard: React.FC<StatCardProps> = ({ label, value, bgColor, textColor }) => {
  return (
    <div className={`${bgColor} shadow-lg rounded-xl p-4 text-center`}>
      <p className={`text-sm font-medium ${textColor}`}>{label}</p>
      <p className={`text-2xl font-bold ${textColor}`}>{value}</p>
    </div>
  );
};

export const ReportsView: React.FC = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchText, setSearchText] = useState('');
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'inflow' | 'outflow'>('all');
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasGeneratedReport, setHasGeneratedReport] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    setHasGeneratedReport(true);
    
    try {
      const filters: any = {};
      if (startDate) filters.startDate = startDate + 'T00:00:00';
      if (endDate) filters.endDate = endDate + 'T23:59:59';
      if (transactionFilter !== 'all') filters.type = transactionFilter;
      if (searchText) filters.searchTerm = searchText;
      
      const transactions = await dataService.getTransactionsWithFilters(filters);
      setAllTransactions(transactions);
    } catch (error) {
      console.error('Error loading transactions:', error);
      alert('Error al cargar las transacciones.');
    } finally {
      setLoading(false);
    }
  };

  const totalInflows = useMemo(() => 
    calculateTotalInflows(allTransactions), 
    [allTransactions]
  );
  const totalOutflows = useMemo(() => 
    calculateTotalOutflows(allTransactions), 
    [allTransactions]
  );
  const netFlow = totalInflows - totalOutflows;

  const exportToCSV = () => {
    const headers = ['Fecha', 'Hora', 'Sesión', 'Tipo', 'Descripción', 'Categoría', 'Monto', 'Usuario'];
    const rows = allTransactions.map(t => [
      formatDate(t.timestamp),
      formatTime(t.timestamp),
      formatDate(t.sessionDate),
      t.type === 'inflow' ? 'ingreso' : 'Gasto',
      t.description,
      t.category || '',
      t.amount.toFixed(2),
      t.responsibleUser
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const content = `
REPORTE DE TRANSACCIONES
Generado: ${new Date().toLocaleString('es-ES')}
${startDate || endDate ? `Período: ${startDate || 'Todas'} hasta ${endDate || 'Todas'}` : ''}

RESUMEN
Total Ingresos:  ${formatCurrency(totalInflows)}
Total Gastos:   ${formatCurrency(totalOutflows)}
Flujo Neto:      ${formatCurrency(netFlow)}
Total Registros: ${allTransactions.length}

TRANSACCIONES
${'='.repeat(100)}
${allTransactions.map(t => `
${formatDate(t.timestamp)} ${formatTime(t.timestamp)}
Tipo: ${t.type === 'inflow' ? 'INGRESO' : 'Gasto'}
Descripción: ${t.description}
${t.category ? `Categoría: ${t.category}` : ''}
Monto: ${formatCurrency(t.amount)}
Sesión: ${formatDate(t.sessionDate)} - ${t.responsibleUser}
${'-'.repeat(100)}`).join('\n')}
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `transactions_report_${new Date().toISOString().split('T')[0]}.txt`;
    link.click();
  };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in-up space-y-6">
      <div className="bg-white dark:bg-slate-800 shadow-lg rounded-2xl p-6 space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Reporte de Transacciones</h2>
        
        <div className="grid grid-cols-1 iphone-pro:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Fecha Inicial</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={DATE_INPUT_CLASSES} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Fecha Final</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className={DATE_INPUT_CLASSES} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Buscar Descripción</label>
          <input type="text" value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Buscar por descripción..." className={INPUT_BASE_CLASSES} />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">Tipo de Transacción</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'all' as const, label: 'Todas', bgColor: 'bg-emerald-500' },
              { value: 'inflow' as const, label: 'Ingresos', bgColor: 'bg-green-500' },
              { value: 'outflow' as const, label: 'Gastos', bgColor: 'bg-red-500' }
            ].map(({ value, label, bgColor }) => (
              <button
                key={value}
                onClick={() => setTransactionFilter(value)}
                className={`py-2 px-4 rounded-lg font-semibold transition ${
                  transactionFilter === value
                    ? `${bgColor} text-white shadow`
                    : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <button onClick={generateReport} disabled={loading} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition">
            <ChartBarIcon className="w-5 h-5 inline mr-2"/>
            {loading ? 'Generando...' : 'Generar'}
          </button>
          <button onClick={() => { setStartDate(''); setEndDate(''); setSearchText(''); setTransactionFilter('all'); setAllTransactions([]); setHasGeneratedReport(false); }} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 px-6 rounded-lg transition">
            <TrashIcon className="w-5 h-5 inline mr-2"/>
            Limpiar
          </button>
        </div>
      </div>



      {hasGeneratedReport && (
        <>
          <div className="bg-white dark:bg-slate-800 shadow-lg rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Transacciones ({allTransactions.length})</h3>
              <div className="flex gap-2">
                <button onClick={exportToCSV} disabled={allTransactions.length === 0} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-semibold py-2 px-3 rounded-lg transition text-sm">
                  <DocumentArrowDownIcon className="w-4 h-4"/> CSV
                </button>
                <button onClick={exportToPDF} disabled={allTransactions.length === 0} className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white font-semibold py-2 px-3 rounded-lg transition text-sm">
                  <DocumentArrowDownIcon className="w-4 h-4"/> TXT
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">Cargando...</div>
            ) : allTransactions.length === 0 ? (
              <div className="text-center py-10 text-slate-500 dark:text-slate-400">No se encontraron transacciones.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b-2 border-slate-200 dark:border-slate-700">
                    <tr className="text-left text-sm font-semibold text-slate-600 dark:text-slate-300">
                      <th className="pb-3 px-2">Fecha</th>
                      <th className="pb-3 px-2">Hora</th>
                      <th className="pb-3 px-2">Tipo</th>
                      <th className="pb-3 px-2">Descripción</th>
                      <th className="pb-3 px-2">Categoría</th>
                      <th className="pb-3 px-2 text-right">Monto</th>
                      <th className="pb-3 px-2">Sesión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                    {allTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="py-3 px-2 text-sm">{formatDate(t.timestamp)}</td>
                        <td className="py-3 px-2 text-sm">{formatTime(t.timestamp)}</td>
                        <td className="py-3 px-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                            t.type === 'inflow' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                          }`}>
                            {t.type === 'inflow' ? <ArrowUpIcon className="w-3 h-3"/> : <ArrowDownIcon className="w-3 h-3"/>}
                            {t.type === 'inflow' ? 'ingreso' : 'Gasto'}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-sm font-medium">{t.description}</td>
                        <td className="py-3 px-2 text-xs italic">{t.category || '-'}</td>
                        <td className={`py-3 px-2 text-sm font-bold text-right ${t.type === 'inflow' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'inflow' ? '+' : '-'} {formatCurrency(t.amount)}
                        </td>
                        <td className="py-3 px-2 text-xs">
                          {formatDate(t.sessionDate)}<br/>{t.responsibleUser}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
