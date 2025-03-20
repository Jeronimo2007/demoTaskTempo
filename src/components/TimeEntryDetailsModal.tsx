import React, { useState } from 'react';
import moment from 'moment';
import { FaTimes, FaTrash } from 'react-icons/fa';
import { TimeEntryResponse } from '@/services/timeEntryService';

interface Task {
  id: number;
  title: string;
  status?: string;
  due_date?: string;
  client: string;
  color?: string;
}

interface TimeEntryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeEntry: TimeEntryResponse;
  task?: Task;
  creatorName?: string;
  onDelete: (entryId: number) => Promise<void>;
}

const TimeEntryDetailsModal: React.FC<TimeEntryDetailsModalProps> = ({
  isOpen,
  onClose,
  timeEntry,
  task,
  creatorName,
  onDelete
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  if (!isOpen) return null;

  const formatDate = (dateString: string) => {
    return moment(dateString).format('DD/MM/YYYY HH:mm');
  };

  const calculateDuration = () => {
    const startTime = new Date(timeEntry.start_time).getTime();
    const endTime = new Date(timeEntry.end_time).getTime();
    const duration = (endTime - startTime) / 1000;
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
  };

  const handleDeleteClick = () => {
    setShowConfirm(true);
  };

  const handleConfirmDelete = async () => {
    setIsDeleting(true);
    setError(null);
    
    try {
      await onDelete(timeEntry.id);
      onClose();
    } catch (err) {
      console.error('Error deleting time entry:', err);
      setError('Error al eliminar la entrada de tiempo. Inténtalo de nuevo.');
    } finally {
      setIsDeleting(false);
      setShowConfirm(false);
    }
  };

  const handleCancelDelete = () => {
    setShowConfirm(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Detalles de Entrada de Tiempo</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition"
            disabled={isDeleting}
          >
            <FaTimes />
          </button>
        </div>

        <div className="p-4">
          <div className="mb-4">
            <h3 className="text-lg font-medium">{task?.title || 'Tarea sin asignar'}</h3>
            {task && (
              <p className="text-sm text-gray-600">Cliente: {task.client}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Inicio</label>
              <p className="text-gray-900">{formatDate(timeEntry.start_time)}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Fin</label>
              <p className="text-gray-900">{formatDate(timeEntry.end_time)}</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Duración</label>
            <p className="text-gray-900">{calculateDuration()}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">Creado por</label>
            <p className="text-gray-900">{creatorName || `Usuario ${timeEntry.user_id}`}</p>
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-50 text-red-600 border border-red-200 rounded">
              {error}
            </div>
          )}

          {showConfirm ? (
            <div className="border-t pt-4 mt-2">
              <p className="text-sm text-gray-700 mb-4">¿Estás seguro de que deseas eliminar esta entrada de tiempo? Esta acción no se puede deshacer.</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancelDelete}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition"
                  disabled={isDeleting}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition flex items-center"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></div>
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <FaTrash className="mr-2" /> Eliminar
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t pt-4 mt-2">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleDeleteClick}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition flex items-center"
                  disabled={isDeleting}
                >
                  <FaTrash className="mr-2" /> Eliminar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimeEntryDetailsModal;
