import React, { useState, useEffect } from 'react';
import type { Bill } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from './icons';
import { Modal } from './Modal';
import { MODAL_INPUT_CLASSES } from '../utils/constants';
import { formatCurrency } from '../utils/formatters';
import * as dataService from '../services/dataService';

export const CalendarView: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formAmount, setFormAmount] = useState('');
  const [formDueDate, setFormDueDate] = useState('');
  const [formFrequency, setFormFrequency] = useState<'once' | 'monthly' | 'yearly'>('monthly');
  const [formCategory, setFormCategory] = useState('');
  const [formNotes, setFormNotes] = useState('');

  useEffect(() => {
    // Subscribe to bills changes for multi-tab sync
    const unsubscribe = dataService.subscribeToBills((updatedBills) => {
      setBills(updatedBills);
    });

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormAmount('');
    setFormDueDate('');
    setFormFrequency('monthly');
    setFormCategory('');
    setFormNotes('');
  };

  const handleSaveBill = async () => {
    const amount = parseFloat(formAmount);
    if (!formName.trim() || isNaN(amount) || amount <= 0 || !formDueDate) {
      alert('Por favor complete todos los campos requeridos.');
      return;
    }

    try {
      if (editingBill) {
        await dataService.updateBill(editingBill.id, {
          name: formName,
          amount,
          dueDate: formDueDate,
          frequency: formFrequency,
          category: formCategory || undefined,
          notes: formNotes || undefined
        });
      } else {
        await dataService.createBill(
          formName,
          amount,
          formDueDate,
          formFrequency,
          formCategory || undefined,
          formNotes || undefined
        );
      }
      
      setIsAddModalOpen(false);
      setEditingBill(null);
      resetForm();
    } catch (error) {
      console.error('Error saving bill:', error);
      alert('Error al guardar el gasto fijo.');
    }
  };

  const handleEditBill = (bill: Bill) => {
    setEditingBill(bill);
    setFormName(bill.name);
    setFormAmount(bill.amount.toString());
    setFormDueDate(bill.dueDate);
    setFormFrequency(bill.frequency);
    setFormCategory(bill.category || '');
    setFormNotes(bill.notes || '');
    setIsAddModalOpen(true);
  };

  const handleDeleteBill = async (billId: string) => {
    if (confirm('¿Está seguro de eliminar este gasto fijo?')) {
      try {
        await dataService.deleteBill(billId);
      } catch (error) {
        console.error('Error deleting bill:', error);
        alert('Error al eliminar el gasto fijo.');
      }
    }
  };

  const handleTogglePaid = async (billId: string) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    // Show confirmation when marking as paid
    if (!bill.isPaid) {
      const confirmed = confirm(
        `¿Marcar "${bill.name}" como pagado?\n\nEsto creará una transacción de egreso por ${formatCurrency(bill.amount)} en el registro diario.`
      );
      
      if (!confirmed) return;
      
      try {
        // Pass true to create transaction when marking as paid
        await dataService.toggleBillPaid(billId, true);
      } catch (error) {
        console.error('Error marking bill as paid:', error);
        alert('Error al marcar el gasto como pagado.');
      }
    } else {
      // When unmarking as paid, just toggle without creating transaction
      try {
        await dataService.toggleBillPaid(billId, false);
      } catch (error) {
        console.error('Error unmarking bill as paid:', error);
        alert('Error al desmarcar el gasto.');
      }
    }
  };

  const handleCloseModal = () => {
    setIsAddModalOpen(false);
    setEditingBill(null);
    resetForm();
  };

  // Calendar helper functions
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getBillsForDate = (dateStr: string) => {
    return bills.filter(bill => bill.dueDate === dateStr);
  };

  const isToday = (dateStr: string) => {
    const today = new Date().toISOString().split('T')[0];
    return dateStr === today;
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);
  const monthName = currentDate.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });

  // Generate calendar days
  const calendarDays: (string | null)[] = [];
  
  // Add empty slots for days before the first day of the month
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  
  // Add all days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    calendarDays.push(dateStr);
  }

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in-up space-y-6">
      <div className="bg-white dark:bg-slate-800 shadow-lg rounded-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gastos Fijos</h2>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2 px-4 rounded-lg transition"
          >
            <PlusIcon className="w-5 h-5" /> Agregar
          </button>
        </div>
        
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Gestiona tus gastos fijos mensuales y anuales. Marca como pagados para llevar un control.
        </p>
      </div>

      {/* Calendar View */}
      <div className="bg-white dark:bg-slate-800 shadow-lg rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            title="Mes anterior"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          
          <div className="text-center">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white capitalize">{monthName}</h3>
            <button
              onClick={goToToday}
              className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline mt-1"
            >
              Ir a hoy
            </button>
          </div>
          
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
            title="Mes siguiente"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(day => (
            <div key={day} className="text-center text-sm font-semibold text-slate-600 dark:text-slate-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dateStr, index) => {
            if (!dateStr) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayBills = getBillsForDate(dateStr);
            const day = parseInt(dateStr.split('-')[2]);
            const hasUnpaidBills = dayBills.some(b => !b.isPaid);
            const todayClass = isToday(dateStr);

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(selectedDate === dateStr ? null : dateStr)}
                className={`aspect-square p-1 rounded-lg border transition relative ${
                  todayClass
                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                    : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50'
                } ${selectedDate === dateStr ? 'ring-2 ring-emerald-500' : ''}`}
              >
                <div className="flex flex-col h-full">
                  <span className={`text-sm font-semibold ${todayClass ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-700 dark:text-slate-200'}`}>
                    {day}
                  </span>
                  {dayBills.length > 0 && (
                    <div className="flex-1 flex items-center justify-center mt-1">
                      <div className={`w-2 h-2 rounded-full ${hasUnpaidBills ? 'bg-red-500' : 'bg-green-500'}`} />
                    </div>
                  )}
                  {dayBills.length > 1 && (
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-auto">
                      {dayBills.length}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected date bills */}
        {selectedDate && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-800 dark:text-white mb-3">
              {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </h4>
            {getBillsForDate(selectedDate).length === 0 ? (
              <p className="text-slate-500 dark:text-slate-400 text-sm">No hay gastos programados para este día.</p>
            ) : (
              <div className="space-y-2">
                {getBillsForDate(selectedDate).map(bill => (
                  <div key={bill.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={bill.isPaid}
                        onChange={() => handleTogglePaid(bill.id)}
                        className="w-5 h-5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <div>
                        <p className={`font-semibold ${bill.isPaid ? 'line-through text-slate-400' : 'text-slate-800 dark:text-white'}`}>
                          {bill.name}
                        </p>
                        {bill.category && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 italic">{bill.category}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold ${bill.isPaid ? 'text-slate-400' : 'text-red-600 dark:text-red-400'}`}>
                        {formatCurrency(bill.amount)}
                      </span>
                      <button
                        onClick={() => handleEditBill(bill)}
                        className="p-1 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 rounded transition"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteBill(bill.id)}
                        className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Empty state when no bills exist */}
        {bills.length === 0 && !selectedDate && (
          <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700 text-center py-8">
            <p className="text-slate-500 dark:text-slate-400">No hay gastos fijos registrados.</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-2">Haz clic en "Agregar Gasto" para comenzar.</p>
          </div>
        )}
      </div>

      <Modal
        isOpen={isAddModalOpen}
        onClose={handleCloseModal}
        title={editingBill ? 'Editar Gasto Fijo' : 'Agregar Gasto Fijo'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nombre del Gasto *</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="Ej: Renta, Electricidad, Internet..."
              className={MODAL_INPUT_CLASSES}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Monto *</label>
            <input
              type="number"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0.00"
              min="0.01"
              step="0.01"
              className={MODAL_INPUT_CLASSES}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Fecha de Vencimiento *</label>
            <input
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              className={MODAL_INPUT_CLASSES}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Frecuencia *</label>
            <select
              value={formFrequency}
              onChange={(e) => setFormFrequency(e.target.value as 'once' | 'monthly' | 'yearly')}
              className={MODAL_INPUT_CLASSES}
            >
              <option value="once">Una vez</option>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Categoría (Opcional)</label>
            <input
              type="text"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              placeholder="Ej: Servicios, Suscripciones..."
              className={MODAL_INPUT_CLASSES}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Notas (Opcional)</label>
            <textarea
              value={formNotes}
              onChange={(e) => setFormNotes(e.target.value)}
              placeholder="Información adicional..."
              rows={3}
              className={MODAL_INPUT_CLASSES}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={handleCloseModal}
            className="py-2 px-5 rounded-lg bg-slate-200 dark:bg-slate-600 text-slate-800 dark:text-slate-100 font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveBill}
            className="py-2 px-5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-500/30 transition"
          >
            {editingBill ? 'Guardar Cambios' : 'Agregar Gasto'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
