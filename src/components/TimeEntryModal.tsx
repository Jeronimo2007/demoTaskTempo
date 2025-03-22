import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { FaTimes, FaSave } from 'react-icons/fa';
import { Task } from '@/types/task'; // Import the shared Task interface

interface TimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  start: Date;
  end: Date;
  tasks: Task[];
  onSubmit: (data: { taskId: number; start: Date; end: Date }) => void;
  isCreating: boolean;
  error: string | null;
}

const TimeEntryModal: React.FC<TimeEntryModalProps> = ({
  isOpen,
  onClose,
  start,
  end,
  tasks,
  onSubmit,
  isCreating,
  error
}) => {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    // Reset form when modal opens
    setStartDate(start);
    setEndDate(end);
    setSelectedTaskId(null);
    setFormError(null);
  }, [isOpen, start, end]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validaciones
    if (!selectedTaskId) {
      setFormError('Por favor, selecciona una tarea');
      return;
    }

    if (startDate >= endDate) {
      setFormError('La hora de inicio debe ser anterior a la hora de fin');
      return;
    }

    // Enviar datos
    onSubmit({
      taskId: selectedTaskId,
      start: startDate,
      end: endDate
    });
  };

  // Formatear fecha para input datetime-local
  const formatDateForInput = (date: Date) => {
    return moment(date).format('YYYY-MM-DDTHH:mm');
  };

  // Seleccionar tarea
  const handleTaskSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setSelectedTaskId(value ? Number(value) : null);
  };

  // Actualizar fecha y hora de inicio
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setStartDate(new Date(value));
    }
  };

  // Actualizar fecha y hora de fin
  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      setEndDate(new Date(value));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Crear Entrada de Tiempo</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            disabled={isCreating}
          >
            <FaTimes />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4">
          <div className="mb-4">
            <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-1">
              Tarea *
            </label>
            <select
              id="task"
              value={selectedTaskId || ''}
              onChange={handleTaskSelect}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating}
              required
            >
              <option value="">Seleccionar tarea</option>
              {tasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title} - {task.client_name || `Cliente ${task.client_id}`}
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700 mb-1">
              Hora de inicio *
            </label>
            <input
              type="datetime-local"
              id="startTime"
              value={formatDateForInput(startDate)}
              onChange={handleStartChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating}
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700 mb-1">
              Hora de fin *
            </label>
            <input
              type="datetime-local"
              id="endTime"
              value={formatDateForInput(endDate)}
              onChange={handleEndChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating}
              required
            />
          </div>

          {(formError || error) && (
            <div className="mb-4 p-2 bg-red-50 text-red-600 border border-red-200 rounded">
              {formError || error}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
              disabled={isCreating}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center"
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></div>
                  Guardando...
                </>
              ) : (
                <>
                  <FaSave className="mr-2" /> Guardar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimeEntryModal;
