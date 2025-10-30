import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { FaTimes, FaSave } from 'react-icons/fa';
import { Task } from '@/types/task';
import clientService from '@/services/clientService';
import taskService from '@/services/taskService';

interface TimeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  start: Date;
  end: Date;
  tasks: Task[];
  onSubmit: (data: { taskId: number; start: Date; end: Date; description: string }) => void;
  isCreating: boolean;
  error: string | null;
}

interface Client {
  id: number;
  name: string;
}

const TimeEntryModal: React.FC<TimeEntryModalProps> = ({
  isOpen,
  onClose,
  start,
  end,
  onSubmit,
  isCreating,
  error
}) => {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState(start);
  const [endDate, setEndDate] = useState(end);
  const [description, setDescription] = useState<string>('');
  const [formError, setFormError] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState<string>('');
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);

  useEffect(() => {
    // Reset form when modal opens
    setStartDate(start);
    setEndDate(end);
    setSelectedClientId(null);
    setSelectedTaskId(null);
    setDescription('');
    setFormError(null);
    setFilteredTasks([]);
    setClientSearchTerm('');
  }, [isOpen, start, end]);

  // Fetch clients when modal opens
  useEffect(() => {
    if (isOpen) {
      setIsLoadingClients(true);
      clientService.getAllClients()
        .then(clientsData => {
          // Ensure we have an array
          const validClients = Array.isArray(clientsData) ? clientsData : [];
          setClients(validClients);
          setFilteredClients(validClients);
        })
        .catch(err => {
          console.error('Error fetching clients:', err);
          setFormError('Error al cargar los clientes');
          setClients([]);
          setFilteredClients([]);
        })
        .finally(() => setIsLoadingClients(false));
    }
  }, [isOpen]);

  // Filter clients based on search term
  useEffect(() => {
    if (!clientSearchTerm.trim()) {
      setFilteredClients(clients);
    } else {
      const searchLower = clientSearchTerm.toLowerCase();
      const filtered = clients.filter(client =>
        client.name.toLowerCase().includes(searchLower)
      );
      setFilteredClients(filtered);
    }
  }, [clientSearchTerm, clients]);

  // Update filtered tasks when client selection changes
  useEffect(() => {
    const fetchClientTasks = async () => {
      if (selectedClientId) {
        setIsLoadingTasks(true);
        try {
          const clientTasks = await taskService.getTasksByClient(selectedClientId);
          // Ensure we always have an array
          const validTasks = Array.isArray(clientTasks) ? clientTasks : [];
          setFilteredTasks(validTasks);
        } catch (err) {
          console.error('Error fetching client tasks:', err);
          setFormError('Error al cargar las tareas del cliente');
          setFilteredTasks([]);
        } finally {
          setIsLoadingTasks(false);
        }
      } else {
        setFilteredTasks([]);
      }
      setSelectedTaskId(null); // Reset task selection when client changes
    };

    fetchClientTasks();
  }, [selectedClientId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validaciones
    if (!selectedClientId) {
      setFormError('Por favor, selecciona un cliente');
      return;
    }

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
      end: endDate,
      description: description.trim()
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

  // Manejar cambios en la descripción
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value);
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
            <label htmlFor="clientSearch" className="block text-sm font-medium text-gray-700 mb-1">
              Buscar Cliente *
            </label>
            <input
              type="text"
              id="clientSearch"
              value={clientSearchTerm}
              onChange={(e) => setClientSearchTerm(e.target.value)}
              placeholder="Escribe para buscar un cliente..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating || isLoadingClients}
            />
            {clientSearchTerm && filteredClients.length > 0 && (
              <div className="mt-1 max-h-48 overflow-y-auto border border-gray-300 rounded-md bg-white shadow-lg">
                {filteredClients.map(client => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setClientSearchTerm(client.name);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-blue-50 transition ${
                      selectedClientId === client.id ? 'bg-blue-100' : ''
                    }`}
                  >
                    {client.name}
                  </button>
                ))}
              </div>
            )}
            {clientSearchTerm && filteredClients.length === 0 && !isLoadingClients && (
              <div className="mt-1 p-2 text-sm text-gray-500 border border-gray-300 rounded-md bg-gray-50">
                No se encontraron clientes
              </div>
            )}
            {selectedClientId && !clientSearchTerm && (
              <div className="mt-2 text-sm text-green-600">
                Cliente seleccionado: {clients.find(c => c.id === selectedClientId)?.name}
              </div>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="task" className="block text-sm font-medium text-gray-700 mb-1">
              Tarea *
            </label>
            <select
              id="task"
              value={selectedTaskId || ''}
              onChange={handleTaskSelect}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isCreating || !selectedClientId || isLoadingTasks}
              required
            >
              <option value="">Seleccionar tarea</option>
              {Array.isArray(filteredTasks) && filteredTasks.map(task => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            {isLoadingTasks && (
              <div className="mt-2 text-sm text-gray-500">
                Cargando tareas...
              </div>
            )}
            {!isLoadingTasks && selectedClientId && filteredTasks.length === 0 && (
              <div className="mt-2 text-sm text-amber-600">
                Este cliente no tiene tareas asignadas.
              </div>
            )}
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

          <div className="mb-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              id="description"
              value={description}
              onChange={handleDescriptionChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
              disabled={isCreating}
              placeholder="Describe brevemente el trabajo realizado..."
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
