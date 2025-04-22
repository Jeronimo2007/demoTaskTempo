import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { FaTimes, FaTrash, FaEdit, FaSave, FaWindowClose } from 'react-icons/fa'; // Added icons
import { TimeEntryResponse, timeEntryService } from '@/services/timeEntryService'; // Assuming update function will be here
import { Task } from '@/types/task';
import { useAuthStore } from '@/store/useAuthStore';

// Define the update payload structure based on the backend model
interface TimeEntryUpdatePayload {
  start_time?: string; // Use string for input compatibility
  end_time?: string;
  description?: string;
}

interface TimeEntryDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeEntry: TimeEntryResponse;
  task?: Task;
  creatorName?: string;
  onDelete: (entryId: number) => Promise<void>;
  onUpdate: (entryId: number, data: TimeEntryUpdatePayload) => Promise<void>; // Added onUpdate prop
}

const ELEVATED_ROLES = ['senior', 'socio'];

const TimeEntryDetailsModal: React.FC<TimeEntryDetailsModalProps> = ({
  isOpen,
  onClose,
  timeEntry,
  task,
  creatorName,
  onDelete,
  onUpdate // Destructure onUpdate
}) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false); // State for update loading
  const [isEditing, setIsEditing] = useState(false); // State for editing mode
  const [error, setError] = useState<string | null>(null);
  const authUser = useAuthStore(state => state.user);

  // State for edited values
  const [editedStartTime, setEditedStartTime] = useState('');
  const [editedEndTime, setEditedEndTime] = useState('');
  const [editedDescription, setEditedDescription] = useState('');

  // Function to format Date object to 'YYYY-MM-DDTHH:mm' for datetime-local input
  const formatDateTimeLocal = (dateString: string): string => {
    return moment(dateString).format('YYYY-MM-DDTHH:mm');
  };

  // Initialize edit state when modal opens or timeEntry changes
  useEffect(() => {
    if (isOpen) {
      setEditedStartTime(formatDateTimeLocal(timeEntry.start_time));
      setEditedEndTime(formatDateTimeLocal(timeEntry.end_time));
      setEditedDescription(timeEntry.description || '');
      setIsEditing(false); // Reset editing mode on open
      setError(null); // Clear previous errors
    }
  }, [isOpen, timeEntry]);

  // Function to check if user has permission to update/delete
  const canModifyEntry = () => {
    if (!authUser) return false;
    const userRole = authUser.role.toLowerCase();
    return ELEVATED_ROLES.includes(userRole);
  };

  // Function to check if user has permission to delete (original logic)
   const canDeleteEntry = () => {
     if (!authUser) return false;
     const userRole = authUser.role.toLowerCase();
     const isElevatedRole = ELEVATED_ROLES.includes(userRole);
     if (isElevatedRole) return true;
     return timeEntry.user_id === Number(authUser.id);
   };


  if (!isOpen) return null;

  // Calculate duration
  const calculateDuration = (start: string, end: string): string => {
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    if (isNaN(startTime) || isNaN(endTime) || endTime < startTime) {
        return 'Duración inválida';
    }
    const duration = (endTime - startTime) / 1000;
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    return hours > 0
      ? `${hours} horas y ${minutes} minutos`
      : `${minutes} minutos`;
  };

  const durationString = calculateDuration(timeEntry.start_time, timeEntry.end_time);
  const editedDurationString = calculateDuration(editedStartTime, editedEndTime);


  // Format dates for display
  const formatDate = (dateString: string) => {
    return moment(dateString).format('DD/MM/YYYY HH:mm');
  };

  const handleDelete = async () => {
    if (!canDeleteEntry()) {
      setError('No tienes permisos para eliminar esta entrada de tiempo.');
      return;
    }

    if (window.confirm('¿Estás seguro de que deseas eliminar esta entrada de tiempo?')) {
      setIsDeleting(true);
      setError(null);
      try {
        await onDelete(timeEntry.id);
        onClose(); // Close modal on successful delete
      } catch (err) {
        console.error('Error al eliminar entrada de tiempo:', err);
        setError('Error al eliminar la entrada de tiempo. Inténtalo de nuevo.');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleToggleEdit = () => {
    if (canModifyEntry()) {
      setIsEditing(!isEditing);
      setError(null); // Clear errors when toggling edit mode
      // Reset edited values if cancelling edit
      if (isEditing) {
        setEditedStartTime(formatDateTimeLocal(timeEntry.start_time));
        setEditedEndTime(formatDateTimeLocal(timeEntry.end_time));
        setEditedDescription(timeEntry.description || '');
      }
    } else {
      setError('No tienes permisos para editar esta entrada de tiempo.');
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setError(null);
    // Reset edited values
    setEditedStartTime(formatDateTimeLocal(timeEntry.start_time));
    setEditedEndTime(formatDateTimeLocal(timeEntry.end_time));
    setEditedDescription(timeEntry.description || '');
  };

  const handleSaveUpdate = async () => {
     if (!canModifyEntry()) {
       setError('No tienes permisos para actualizar esta entrada de tiempo.');
       return;
     }

     // Basic validation
     if (!editedStartTime || !editedEndTime) {
        setError('Las fechas de inicio y fin son requeridas.');
        return;
     }
     if (new Date(editedEndTime) <= new Date(editedStartTime)) {
        setError('La fecha de fin debe ser posterior a la fecha de inicio.');
        return;
     }


     setIsUpdating(true);
     setError(null);

     const payload: TimeEntryUpdatePayload = {};
     // Only include fields if they have changed
     if (formatDateTimeLocal(timeEntry.start_time) !== editedStartTime) {
        payload.start_time = new Date(editedStartTime).toISOString();
     }
      if (formatDateTimeLocal(timeEntry.end_time) !== editedEndTime) {
        payload.end_time = new Date(editedEndTime).toISOString();
     }
     if (timeEntry.description !== editedDescription) {
        payload.description = editedDescription;
     }

     // If no changes, just exit edit mode
     if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        setIsUpdating(false);
        return;
     }


     try {
       await onUpdate(timeEntry.id, payload);
       setIsEditing(false); // Exit editing mode on success
       // No need to call onClose here, let the parent handle refresh and potentially keep modal open if needed
     } catch (err) {
       console.error('Error al actualizar entrada de tiempo:', err);
       setError('Error al actualizar la entrada de tiempo. Inténtalo de nuevo.');
     } finally {
       setIsUpdating(false);
     }
   };


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b bg-gray-50">
          <h2 className="text-xl font-semibold text-gray-800">
            {isEditing ? 'Editar Entrada de Tiempo' : 'Detalles de Entrada de Tiempo'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition disabled:opacity-50"
            disabled={isDeleting || isUpdating}
          >
            <FaTimes size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {/* Task Info */}
          <div className="mb-5 pb-4 border-b">
            <h3 className="font-semibold text-lg text-gray-800">{task ? task.title : 'Tarea sin asignar'}</h3>
            {task && (
              <div className="mt-1 text-sm text-gray-600 space-y-1">
                <p><span className="font-medium">Estado:</span> {task.status}</p>
                <p>
                  <span className="font-medium">Cliente:</span> {task.client_name || (task.client_id ? `Cliente ${task.client_id}` : 'No asignado')}
                </p>
              </div>
            )}
          </div>

          {/* Time Entry Details or Edit Form */}
          <div className="space-y-3 text-sm text-gray-700">
            {isEditing ? (
              <>
                {/* Edit Start Time */}
                <div>
                  <label htmlFor="edit-start-time" className="block font-medium mb-1">Inicio:</label>
                  <input
                    type="datetime-local"
                    id="edit-start-time"
                    value={editedStartTime}
                    onChange={(e) => setEditedStartTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={isUpdating}
                  />
                </div>
                {/* Edit End Time */}
                <div>
                  <label htmlFor="edit-end-time" className="block font-medium mb-1">Fin:</label>
                  <input
                    type="datetime-local"
                    id="edit-end-time"
                    value={editedEndTime}
                    onChange={(e) => setEditedEndTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    disabled={isUpdating}
                  />
                </div>
                 {/* Display Edited Duration */}
                 <p><span className="font-medium">Duración Calculada:</span> {editedDurationString}</p>
                {/* Edit Description */}
                <div>
                  <label htmlFor="edit-description" className="block font-medium mb-1">Descripción:</label>
                  <textarea
                    id="edit-description"
                    rows={3}
                    value={editedDescription}
                    onChange={(e) => setEditedDescription(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Añade una descripción (opcional)"
                    disabled={isUpdating}
                  />
                </div>
              </>
            ) : (
              <>
                {/* Display Details */}
                <p><span className="font-medium">Inicio:</span> {formatDate(timeEntry.start_time)}</p>
                <p><span className="font-medium">Fin:</span> {formatDate(timeEntry.end_time)}</p>
                <p><span className="font-medium">Duración:</span> {durationString}</p>
                <p><span className="font-medium">Facturado:</span> {timeEntry.facturado ? 'Si' : 'No'}</p>
                {timeEntry.description && (
                  <div className="mt-2">
                    <p className="font-medium">Descripción:</p>
                    <p className="mt-1 p-2 bg-gray-50 rounded border border-gray-200 whitespace-pre-wrap">
                      {timeEntry.description}
                    </p>
                  </div>
                )}
                {creatorName && (
                  <p><span className="font-medium">Creado por:</span> {creatorName}</p>
                )}
              </>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 border border-red-200 rounded-md text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="flex justify-end items-center p-4 border-t bg-gray-50 space-x-3">
          {isEditing ? (
            <>
              {/* Save Changes Button */}
              <button
                onClick={handleSaveUpdate}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isUpdating || isDeleting}
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin h-4 w-4 mr-2 border-b-2 border-white rounded-full"></div>
                    Guardando...
                  </>
                ) : (
                  <>
                    <FaSave className="mr-2" /> Guardar Cambios
                  </>
                )}
              </button>
              {/* Cancel Edit Button */}
              <button
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition flex items-center disabled:opacity-50"
                disabled={isUpdating || isDeleting}
              >
                <FaWindowClose className="mr-2" /> Cancelar
              </button>
            </>
          ) : (
            <>
              {/* Update Button (Toggle Edit) */}
              {canModifyEntry() && (
                <button
                  onClick={handleToggleEdit}
                  className="px-4 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition flex items-center disabled:opacity-50"
                  disabled={isDeleting} // Disable if deleting
                >
                  <FaEdit className="mr-2" /> Actualizar
                </button>
              )}
              {/* Delete Button */}
              {canDeleteEntry() && (
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isDeleting || isUpdating} // Disable if deleting or updating
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
              )}
            </>
          )}
          {/* Close Button (Always visible, but might be disabled) */}
           <button
             onClick={onClose}
             className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition disabled:opacity-50"
             disabled={isDeleting || isUpdating}
           >
             Cerrar
           </button>
        </div>
      </div>
    </div>
  );
};

export default TimeEntryDetailsModal;
