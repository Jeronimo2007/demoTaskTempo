import React, { useState } from 'react';
import moment from 'moment';
import { FaTimes, FaTrash } from 'react-icons/fa';
import { TimeEntryResponse } from '@/services/timeEntryService';
import { Task } from '@/types/task'; // Import the shared Task interface

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

  if (!isOpen) return null;

  // Calculate duration in seconds
  const startTime = new Date(timeEntry.start_time).getTime();
  const endTime = new Date(timeEntry.end_time).getTime();
  const duration = (endTime - startTime) / 1000;
  
  // Format duration in hours and minutes
  const hours = Math.floor(duration / 3600);
  const minutes = Math.floor((duration % 3600) / 60);
  const durationString = hours > 0 
    ? `${hours} horas y ${minutes} minutos`
    : `${minutes} minutos`;

  // Format dates for display
  const formatDate = (dateString: string) => {
    return moment(dateString).format('DD/MM/YYYY HH:mm');
  };

  const handleDelete = async () => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta entrada de tiempo?')) {
      setIsDeleting(true);
      setError(null);
      
      try {
        await onDelete(timeEntry.id);
        onClose();
      } catch (err) {
        console.error('Error al eliminar entrada de tiempo:', err);
        setError('Error al eliminar la entrada de tiempo. Inténtalo de nuevo.');
      } finally {
        setIsDeleting(false);
      }
    }
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
            <h3 className="font-medium text-lg">{task ? task.title : 'Tarea sin asignar'}</h3>
            {task && (
              <div className="mt-1 text-sm text-gray-600">
                <p><span className="font-medium">Estado:</span> {task.status}</p>
                <p>
                  <span className="font-medium">Cliente:</span> {task.client_name || `Cliente ${task.client_id}`}
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2 text-sm text-gray-700">
            <p><span className="font-medium">Inicio:</span> {formatDate(timeEntry.start_time)}</p>
            <p><span className="font-medium">Fin:</span> {formatDate(timeEntry.end_time)}</p>
            <p><span className="font-medium">Duración:</span> {durationString}</p>
            <p><span className="font-medium">Facturado:</span> {timeEntry.facturado ? 'Si' : 'No'}</p>
            {/* Display description if available */}
            {timeEntry.description && (
              <div className="mt-2">
                <p className="font-medium">Descripción:</p>
                <p className="mt-1 p-2 bg-gray-50 rounded border border-gray-200">
                  {timeEntry.description}
                </p>
              </div>
            )}
            {creatorName && (
              <p><span className="font-medium">Creado por:</span> {creatorName}</p>
            )}
          </div>

          {error && (
            <div className="mb-4 p-2 bg-red-50 text-red-600 border border-red-200 rounded">
              {error}
            </div>
          )}

          <div className="flex justify-end mt-6">
            <button
              onClick={handleDelete}
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
      </div>
    </div>
  );
};

export default TimeEntryDetailsModal;
