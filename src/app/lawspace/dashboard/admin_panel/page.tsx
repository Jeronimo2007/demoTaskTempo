'use client'

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { useEffect, useState, useCallback, useMemo, ChangeEvent } from "react"; // Add ChangeEvent
import axios from "axios";
import InvoiceRegistry from "@/components/facturation/InvoiceRegistry";
import InvoiceByHoursForm from "@/components/facturation/InvoiceByHoursForm";
import InvoiceByPercentageForm from "@/components/facturation/InvoiceByPercentageForm";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus, faEdit, faRotate } from "@fortawesome/free-solid-svg-icons";
import ClientSection from "@/components/ClientSection";
import ReportDownload from "@/components/ReportDownload";
import ProtectedRoute from "@/components/ProtectedRoute";
import taskService from "@/services/taskService"; // Import taskService
import { Task } from "@/types/task"; // Import the updated Task type

type ClientData = {
  id: number;
  name: string;
  permanent: boolean;
};

// Define task status options with their colors
const TASK_STATUSES = [
  { value: "En proceso", color: "bg-yellow-500" },
  { value: "Finalizado", color: "bg-green-500" },
  { value: "Cancelado", color: "bg-gray-500" },
  { value: "Gestionar al cliente", color: "bg-purple-500" },
  { value: "Gestionar al tercero", color: "bg-pink-500" }
];

// Define area options
const AREA_OPTIONS = [
  "Sin área", // Add default option
  "Laboral",
  "Comercial/Civil",
  "Propiedad Intelectual",
  "Societario",
  "Administrativo"
];

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Utility function to normalize IDs for consistent comparison
const stringifyId = (id: string | number | null | undefined): string => {
  if (id === null || id === undefined) return '';
  return String(id).trim();
};

// Define type for the newTask state explicitly
type NewTaskState = {
  title: string;
  client_id: string; // Keep as string for form input
  status: string;
  billing_type: 'hourly' | 'percentage';
  area: string;
  note: string;
  total_value: number | null;
};


export default function AdminPanel() {
  const { user, isAuthenticated, logout } = useAuth(); // Use useAuth hook
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  // Simple notification function (replace with toast if needed)
  const showNotification = (title: string, message: string) => {
    window.alert(`${title}: ${message}`);
  };

  const [tasks, setTasks] = useState<Task[]>([]); // Use imported Task type
  const [clients, setClients] = useState<ClientData[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  // Update newTask state to align with TaskCreatePayload and include new fields
  const [newTask, setNewTask] = useState<NewTaskState>({ // Use explicit type
    title: "",
    client_id: "", // Keep as string for form input, convert later
    status: "En proceso", // Default status
    billing_type: 'hourly', // Default billing type
    area: "Sin área", // Default area
    note: "", // Optional note
    total_value: null, // Optional total value, initialize as null
  });

  // Pagination states
  const [currentTaskPage, setCurrentTaskPage] = useState(1);
  const itemsPerPage = 5;

  // Filter states
  const [clientFilter, setClientFilter] = useState<string>("");

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Partial<Task>>({}); // Use imported Task type
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [taskModal, setTaskModal] = useState({
    isOpen: false
  });

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    const statusObj = TASK_STATUSES.find(s => s.value === status);
    return statusObj?.color || "bg-gray-300";
  };

  // Get token from cookie
  const getToken = useCallback(() => {
    if (typeof document === 'undefined') return ""; // Add check for server-side rendering
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1] || "";
    return token;
  }, []);

  const fetchClients = useCallback(async () => {
    try {
      setLoadingClients(true);
      const token = getToken();
      if (!token) return; // Don't fetch if no token
      const response = await axios.get(`${API_URL}/clients/get_clients_admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(response.data);
    } catch (error) {
      console.error("Error al obtener los clientes:", error);
    } finally {
      setLoadingClients(false);
    }
  }, [getToken]);

  const fetchTasks = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) return; // Don't fetch if no token
      const fetchedTasks = await taskService.getAllTasks(); // Use the service
      console.log("Tasks fetched via service:", fetchedTasks); // Debug log
      setTasks(fetchedTasks);
    } catch (error) {
      console.error("Error al obtener los Asuntos:", error);
      setTasks([]); // Set to empty array on error
    }
  }, [getToken]);

  // Simplified initialization effect relying on ProtectedRoute for auth/role checks
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchClients(), fetchTasks()]);
      } catch (error) {
        console.error('Error fetching data:', error);
        setUpdateError("Error al cargar los datos. Por favor, intente nuevamente.");
        if (axios.isAxiosError(error) && error.response?.status === 401) {
          console.log("Token became invalid, logging out and redirecting");
          logout();
          router.push('/login');
        }
      } finally {
        setIsLoading(false);
      }
    };
    if (isAuthenticated && user) {
      fetchData();
    }
  }, [isAuthenticated, user, fetchClients, fetchTasks, logout, router]);


  const openTaskModal = () => {
    setNewTask({ // Reset to default values
      title: "",
      client_id: "",
      status: "En proceso",
      billing_type: 'hourly',
      area: "Sin área",
      note: "",
      total_value: null,
    });
    setTaskModal({ isOpen: true });
    setUpdateError(null);
  };

  const closeTaskModal = () => {
    setTaskModal({ isOpen: false });
    setUpdateError(null);
  };

  // Handler specifically for the New Task modal form
  const handleNewTaskChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | null = value;

    if (name === 'total_value') {
      processedValue = value === '' ? null : parseFloat(value);
      if (isNaN(processedValue as number)) {
        processedValue = null;
      }
    }

    setNewTask(prevState => {
      const updatedState = {
        ...prevState,
        [name]: processedValue,
      };
      // Reset total_value if billing_type changes to hourly
      if (name === 'billing_type' && value === 'hourly') {
        updatedState.total_value = null;
      }
      return updatedState;
    });
    console.log("NewTask.billing_type:", newTask.billing_type);
  };

  // Handler specifically for the inline editing fields
  const handleEditingTaskChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue: string | number | null | undefined = value; // Allow undefined for Partial<Task>

    // Handle specific types
    if (name === 'total_value') {
      processedValue = value === '' ? null : parseFloat(value);
      if (isNaN(processedValue as number)) {
        processedValue = null;
      }
    } else if (name === 'due_date') {
      // Keep as string, formatting happens elsewhere if needed
      processedValue = value || undefined; // Use undefined if empty string for optional field
    }

    setEditingTask(prevState => {
      const updatedState = {
        ...prevState,
        [name]: processedValue,
      };
      // Reset total_value if billing_type changes to hourly
      if (name === 'billing_type' && value === 'hourly') {
        updatedState.total_value = null;
      }
      return updatedState;
    });
  };
  console.log("EditingTask.billing_type:", editingTask.billing_type);


  const handleCreateTask = async () => {
    try {
      setUpdateError(null);
      if (!newTask.title.trim()) {
        setUpdateError("El título de la tarea no puede estar vacío"); return;
      }
      if (!newTask.client_id) {
        setUpdateError("Debe seleccionar un cliente"); return;
      }
      if (newTask.billing_type === 'percentage' && (newTask.total_value === null || newTask.total_value <= 0)) {
        setUpdateError("El valor total (mayor que 0) es requerido para facturación por porcentaje"); return;
      }

      const payload = {
        client_id: Number(newTask.client_id),
        title: newTask.title.trim(),
        billing_type: newTask.billing_type,
        status: newTask.status,
        area: newTask.area || "Sin área",
        note: newTask.note || null,
        total_value: newTask.billing_type === 'percentage' ? newTask.total_value : null,
      };

      await taskService.createTask(payload);
      closeTaskModal();
      fetchTasks();
    } catch (error) {
      console.error("Error al crear la tarea:", error);
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.detail
        ? `Error: ${error.response.data.detail}`
        : "Error al crear la tarea. Verifique los datos e intente nuevamente.";
      setUpdateError(errorMessage);
    }
  };

  const handleUpdateTask = async () => {
    if (editingTaskId === null || !editingTask) return;

    try {
      setUpdateError(null);
      const originalTask = tasks.find(task => task.id === editingTaskId);
      if (!originalTask) return;

      if (!editingTask.title || !editingTask.title.trim()) {
        setUpdateError("El título no puede estar vacío"); return;
      }
      if (editingTask.billing_type === 'percentage' && (editingTask.total_value === null || editingTask.total_value === undefined || editingTask.total_value <= 0)) {
        setUpdateError("El valor total (mayor que 0) es requerido para facturación por porcentaje"); return;
      }

      const payload: Partial<Omit<Task, 'id' | 'client_id' | 'client_name' | 'client' | 'name'>> = {};
      const updatableKeys: (keyof Task)[] = ['title', 'status', 'due_date', 'area', 'billing_type', 'note', 'total_value'];

      updatableKeys.forEach(key => {
        if (key in editingTask && editingTask[key] !== originalTask[key]) {
          if (key === 'title') {
            payload.title = editingTask[key] as string;
          } else if (key === 'status') {
            payload.status = editingTask[key] as string;
          } else if (key === 'due_date') {
            payload.due_date = editingTask[key] as string | undefined;
          } else if (key === 'area') {
            payload.area = editingTask[key] as string;
          } else if (key === 'billing_type') {
            payload.billing_type = editingTask[key] as 'hourly' | 'percentage';
            if (editingTask[key] === 'hourly' && originalTask.billing_type === 'percentage') {
              payload.total_value = null;
            } else if (editingTask[key] === 'percentage' && editingTask.total_value !== originalTask.total_value) {
              payload.total_value = editingTask.total_value;
            }
          } else if (key === 'note') {
            payload.note = editingTask[key] as string | null;
          } else if (key === 'total_value') {
            if (editingTask.billing_type === 'percentage') {
              payload.total_value = editingTask[key] as number | null;
            } else if (originalTask.total_value !== null) {
              payload.total_value = null;
            }
          }
        }
      });

      if (Object.keys(payload).length > 0) {
        await taskService.updateTask(editingTaskId, payload);
      }

      await fetchTasks();
      setEditingTaskId(null);
      setEditingTask({});
    } catch (error) {
      console.error("Error al actualizar la tarea:", error);
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.detail
        ? `Error: ${error.response.data.detail}`
        : "Error al actualizar la tarea. Verifique los datos e intente nuevamente.";
      setUpdateError(errorMessage);
    }
  };


  const handleDeleteTask = async (taskId: number) => {
    const isConfirmed = window.confirm("¿Está seguro que desea eliminar esta tarea?");
    if (!isConfirmed) return;

    try {
      setUpdateError(null);
      await taskService.deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error("Error al eliminar la tarea:", error);
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.detail
        ? `Error: ${error.response.data.detail}`
        : "Error al eliminar la tarea.";
      setUpdateError(errorMessage);
    }
  };

  const startEditingTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTask({ ...task }); // Copy task properties
    setUpdateError(null);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTask({});
    setUpdateError(null);
  };

  const filteredTasks = useMemo(() => {
    if (!clientFilter) return tasks;
    return tasks.filter(task => task.client_name === clientFilter);
  }, [tasks, clientFilter]);

  const handleClientFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setClientFilter(e.target.value);
    setCurrentTaskPage(1);
  };

  const totalTaskPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice((currentTaskPage - 1) * itemsPerPage, currentTaskPage * itemsPerPage);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return ''; // Return empty string for input value compatibility
    try {
      // Handle potential timezone issues by parsing as UTC if no time is specified
      const date = new Date(dateString.includes('T') ? dateString : dateString + 'T00:00:00Z');
      return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    } catch (e) {
      console.error("Error formatting date:", dateString, e);
      return ''; // Return empty string on error
    }
  };


  return (
    <ProtectedRoute allowedRoles={['senior', 'socio', 'consultor']}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Panel de Administración</h1>
          <ClientSection />
          <div className="p-6 text-black shadow-lg rounded-lg bg-white mt-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Gestión de Asuntos</h2>
              <div className="flex gap-4">
                <select value={clientFilter} onChange={handleClientFilterChange} className="p-2 border rounded text-black">
                  <option value="">Todos los Clientes</option>
                  {clients.map(client => (<option key={client.id} value={client.id}>{client.name}</option>))}
                </select>
                <button onClick={() => { setIsLoading(true); fetchTasks().finally(() => setIsLoading(false)); }} className="flex items-center bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition" title="Actualizar lista de tareas">
                  <FontAwesomeIcon icon={faRotate} className="mr-2" /> Actualizar
                </button>
                <button onClick={openTaskModal} className="flex items-center bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                  <FontAwesomeIcon icon={faPlus} className="mr-2" /> Nuevo Asunto
                </button>
              </div>
            </div>

            {updateError && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"><p>{updateError}</p></div>)}

            <div className="overflow-x-auto">
              <table className="w-full border border-black rounded-lg overflow-hidden shadow-md">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border-b border-black p-2 text-left">Título</th>
                    <th className="border-b border-black p-2 text-left">Cliente</th>
                    <th className="border-b border-black p-2 text-left">Fecha Entrega</th>
                    <th className="border-b border-black p-2 text-left">Área</th>
                    <th className="border-b border-black p-2 text-left">Facturación</th>
                    <th className="border-b border-black p-2 text-left">Total Facturado</th>
                    <th className="border-b border-black p-2 text-left">Estado</th>
                    <th className="border-b border-black p-2 text-left">Nota</th>
                    <th className="p-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      {editingTaskId === task.id ? (
                        <>
                          {/* Inline Editing Fields */}
                          <td className="border-b border-black p-1"><input type="text" name="title" value={editingTask.title || ''} onChange={handleEditingTaskChange} className="w-full p-1 border rounded text-black text-sm" /></td>
                          <td className="border-b border-black p-1 text-sm">{task.client_name || task.client || 'N/A'}</td>
                          <td className="border-b border-black p-1"><input type="date" name="due_date" value={formatDate(editingTask.due_date)} onChange={handleEditingTaskChange} className="w-full p-1 border rounded text-black text-sm" /></td>
                          <td className="border-b border-black p-1">
                            <select name="area" value={editingTask.area || ''} onChange={handleEditingTaskChange} className="w-full p-1 border rounded text-black text-sm">
                              {AREA_OPTIONS.map(area => (<option key={area} value={area}>{area}</option>))}
                            </select>
                          </td>
                          <td className="border-b border-black p-1">
                            <select name="billing_type" value={editingTask.billing_type || 'hourly'} onChange={handleEditingTaskChange} className="w-full p-1 border rounded text-black text-sm">
                              <option value="hourly">Por Hora</option>
                              <option value="percentage">Por Porcentaje</option>
                            </select>
                            {editingTask.billing_type === 'percentage' && (
                              <input type="number" name="total_value" placeholder="Valor Total" value={editingTask.total_value ?? ''} onChange={handleEditingTaskChange} className="w-full p-1 border rounded text-black mt-1 text-sm" step="0.01" />
                            )}
                          </td>
                          <td className="border-b border-black p-1 text-sm">{task.total_billed ? `$${task.total_billed.toLocaleString()}` : '-'}</td>
                          <td className="border-b border-black p-1">
                            <select name="status" value={editingTask.status || ''} onChange={handleEditingTaskChange} className="w-full p-1 border rounded text-black text-sm">
                              {TASK_STATUSES.map(status => (<option key={status.value} value={status.value}>{status.value}</option>))}
                            </select>
                          </td>
                          <td className="border-b border-black p-1">
                            <textarea name="note" placeholder="Nota" value={editingTask.note || ''} onChange={handleEditingTaskChange} className="w-full p-1 border rounded text-black text-sm" rows={1} />
                          </td>
                          <td className="p-1">
                            <div className="flex gap-2">
                              <button onClick={handleUpdateTask} className="text-green-600 hover:text-green-800 text-sm">Guardar</button>
                              <button onClick={cancelEditing} className="text-gray-600 hover:text-gray-800 text-sm">Cancelar</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          {/* Display Fields */}
                          <td className="border-b border-black p-2 text-sm">{task.title}</td>
                          <td className="border-b border-black p-2 text-sm">{task.client_name || task.client || 'N/A'}</td>
                          <td className="border-b border-black p-2 text-sm">{formatDate(task.due_date)}</td>
                          
                          <td className="border-b border-black p-2 text-sm">{task.area || 'N/A'}</td>
                          <td className="border-b border-black p-2 text-sm">{task.billing_type === 'hourly' ? `Por Hora` : `Porcentaje (${task.total_value ?? 'N/A'})`}</td>
                          <td className="border-b border-black p-2 text-sm">{task.total_billed ? `$${task.total_billed.toLocaleString()}` : '-'}</td>
                          <td className="border-b border-black p-2 text-sm"><span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded ${getStatusColor(task.status)} text-white`}>{task.status}</span></td>
                          <td className="border-b border-black p-2 text-sm">{task.note || '-'}</td>
                          <td className="p-2">
                            <div className="flex gap-2">
                              <button onClick={() => startEditingTask(task)} className="text-blue-600 hover:text-blue-800" title="Editar"><FontAwesomeIcon icon={faEdit} /></button>
                              <button onClick={() => handleDeleteTask(task.id)} className="text-red-600 hover:text-red-800" title="Eliminar"><FontAwesomeIcon icon={faTrash} /></button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Task Pagination */}
            <div className="flex justify-between items-center mt-4">
              <button onClick={() => setCurrentTaskPage(prev => Math.max(prev - 1, 1))} disabled={currentTaskPage === 1} className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50">Anterior</button>
              <span>Página {currentTaskPage} de {totalTaskPages}</span>
              <button onClick={() => setCurrentTaskPage(prev => Math.min(prev + 1, totalTaskPages))} disabled={currentTaskPage === totalTaskPages || totalTaskPages === 0} className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50">Siguiente</button>
            </div>
          </div>

          {/* Facturation/Invoices Section as Tabs (only for socio) */}
          {user?.role === "socio" && (
            <div className="mt-10">
              <Tabs defaultValue="hours" className="w-full">
                <TabsList>
                  <TabsTrigger value="hours">Orden por Horas</TabsTrigger>
                  <TabsTrigger value="percentage">Orden por Porcentaje</TabsTrigger>
                  <TabsTrigger value="registry">Registro de Ordenes</TabsTrigger>
                </TabsList>
                <TabsContent value="hours">
                  <InvoiceByHoursForm
                    clients={clients}
                    loadingClients={loadingClients}
                    token={getToken()}
                    API_URL={API_URL ?? ""}
                    showNotification={showNotification}
                  />
                </TabsContent>
                <TabsContent value="percentage">
                  <InvoiceByPercentageForm
                    clients={clients}
                    loadingClients={loadingClients}
                    token={getToken()}
                    API_URL={API_URL ?? ""}
                    showNotification={showNotification}
                  />
                </TabsContent>
                <TabsContent value="registry">
                  <InvoiceRegistry
                    token={getToken()}
                    apiUrl={API_URL ?? ""}
                    showNotification={showNotification}
                  />
                </TabsContent>
              </Tabs>
            </div>
          )}

          <ReportDownload clients={clients} />

          {/* Task Creation Modal */}
          {taskModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4 text-black">Crear Nueva Tarea</h3>
                {updateError && <p className="text-red-500 mb-4">{updateError}</p>}
                <input type="text" name="title" placeholder="Título *" value={newTask.title} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black" required />
                <select name="client_id" value={newTask.client_id} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black" required>
                  <option value="">Seleccionar Cliente *</option>
                  {clients.map(client => (<option key={client.id} value={client.id}>{client.name}</option>))}
                </select>
                <select name="status" value={newTask.status} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black" required>
                  {TASK_STATUSES.map(status => (<option key={status.value} value={status.value}>{status.value}</option>))}
                </select>
                <select name="area" value={newTask.area} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black">
                  {AREA_OPTIONS.map(area => (<option key={area} value={area}>{area}</option>))}
                </select>
                <select name="billing_type" value={newTask.billing_type} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black" required>
                  <option value="">Selecciona una opción</option>
                  <option value="percentage">Por Porcentaje</option>
                  <option value="hourly">Por Hora</option>
                </select>
                {newTask.billing_type === 'percentage' && (
                  <input type="number" name="total_value" placeholder="Valor Total *" value={newTask.total_value ?? ''} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black" required={newTask.billing_type === 'percentage'} step="0.01" min="0.01" />
                )}
                <textarea name="note" placeholder="Nota (opcional)" value={newTask.note} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-4 text-black" rows={3} />
                <div className="flex justify-end gap-2">
                  <button onClick={closeTaskModal} className="px-4 py-2 bg-gray-300 rounded text-black">Cancelar</button>
                  <button onClick={handleCreateTask} className="px-4 py-2 bg-blue-600 text-white rounded">Crear Tarea</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
