'use client'

import { useRouter } from "next/navigation";
// import { useAuthStore } from "@/store/useAuthStore"; // Remove useAuthStore
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus, faEdit, faRotate } from "@fortawesome/free-solid-svg-icons";
import ClientSection from "@/components/ClientSection";
import ReportDownload from "@/components/ReportDownload";
import ProtectedRoute from "@/components/ProtectedRoute"; // Import ProtectedRoute

type ClientData = {
  id: number;
  name: string;
  permanent: boolean;
};

type TaskData = {
  id: number;
  title: string;
  status: string;
  client: string;
  client_id: number;
  due_date: string;
  area: string;
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
  "Laboral",
  "Comercial/Civil",
  "Propiedad Intelectual",
  "Societario",
  "Administrativo"
];

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Utility function to normalize IDs for consistent comparison
const stringifyId = (id: string | number): string => {
  if (id === null || id === undefined) return '';
  return String(id).trim();
};

export default function AdminPanel() {
  // const { setUser } = useAuthStore(); // Remove useAuthStore usage
  const { user, isAuthenticated, logout } = useAuth(); // Use useAuth hook
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "En proceso",
    client_id: "",
    due_date: "",
    area: "",
  });

  // Pagination states
  const [currentTaskPage, setCurrentTaskPage] = useState(1);
  const itemsPerPage = 5;

  // Filter states
  const [clientFilter, setClientFilter] = useState<string>("");

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Partial<TaskData>>({});
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
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1] || "";

    console.log("%c=== TOKEN CHECK ===", "color: blue; font-weight: bold");
    console.log("All cookies:", document.cookie);
    console.log("Found token:", token ? "Yes" : "No");
    console.log("Token value:", token);
    console.log("%c==================", "color: blue; font-weight: bold");

    return token;
  }, []);

  // Removed fetchUserData function as user data is handled by AuthContext/ProtectedRoute
  const fetchClients = useCallback(async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/clients/get_clients_admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(response.data);
    } catch (error) {
      console.error("Error al obtener los clientes:", error);
    }
  }, [getToken]);

  const fetchTasks = useCallback(async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/tasks/get_task`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("Tasks fetched:", response.data); // Debug log
      setTasks(response.data);
    } catch (error) {
      console.error("Error al obtener las tareas:", error);
    }
  }, [getToken]);

  // Simplified initialization effect relying on ProtectedRoute for auth/role checks
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // ProtectedRoute ensures we only get here if authenticated and authorized
        await Promise.all([fetchClients(), fetchTasks()]);
      } catch (error) {
         console.error('Error fetching data:', error);
         setUpdateError("Error al cargar los datos. Por favor, intente nuevamente.");
         // Handle potential 401 if token becomes invalid between ProtectedRoute check and API calls
         if (axios.isAxiosError(error) && error.response?.status === 401) {
           console.log("Token became invalid, logging out and redirecting");
           logout(); // Clear auth context state
           router.push('/login');
         }
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch data if authenticated and user object exists (ensured by ProtectedRoute)
    if (isAuthenticated && user) {
      fetchData();
    }
    // Add dependencies: isAuthenticated, user, fetchClients, fetchTasks, logout, router
  }, [isAuthenticated, user, fetchClients, fetchTasks, logout, router]);

  // The useEffect block previously here (lines 225-240 in original) is removed as ProtectedRoute handles the check.
  const openTaskModal = () => {
    setNewTask({
      title: "",
      description: "",
      status: "En proceso",
      client_id: "",
      due_date: "",
      area: "",
    });
    setTaskModal({ isOpen: true });
    setUpdateError(null);
  };

  const closeTaskModal = () => {
    setTaskModal({ isOpen: false });
    setUpdateError(null);
  };

  const handleCreateTask = async () => {
    try {
      if (!newTask.title.trim()) {
        setUpdateError("El título de la tarea no puede estar vacío");
        return;
      }

      if (!newTask.client_id) {
        setUpdateError("Debe seleccionar un cliente");
        return;
      }

      const token = getToken();
      await axios.post(
        `${API_URL}/tasks/create`,
        {
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          client_id: Number(newTask.client_id),
          due_date: newTask.due_date,
          area: newTask.area,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      closeTaskModal();

      fetchTasks();
      setUpdateError(null);
    } catch (error) {
      console.error("Error al crear la tarea:", error);
      setUpdateError("Error al crear la tarea");
    }
  };

  const handleUpdateTask = async () => {
    if (editingTaskId === null) return;

    try {
      setUpdateError(null);
      const token = getToken();
      const taskToUpdate = tasks.find(task => task.id === editingTaskId);
      if (!taskToUpdate) return;

      // Make sure we have all the required fields
      if (!editingTask.title) {
        setUpdateError("El título no puede estar vacío");
        return;
      }

      const data = {
        id: editingTaskId, // Make sure to include the task ID
        title: editingTask.title,
        status: editingTask.status || taskToUpdate.status,
        due_date: editingTask.due_date || taskToUpdate.due_date,
        area: editingTask.area || taskToUpdate.area,
      };


      await axios.put(
        `${API_URL}/tasks/update_task`, // Updated endpoint
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );


      await fetchTasks(); // Refresh the task list
      setEditingTaskId(null);
      setEditingTask({});
    } catch (error) {
      console.error("Error al actualizar la tarea:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Server response:", error.response.data);
        setUpdateError(`Error: ${error.response.data.message || "Error al actualizar la tarea"}`);
      } else {
        setUpdateError("Error al actualizar la tarea");
      }
    }
  };


  const handleDeleteTask = async (taskId: number) => {
    // Agregar confirmación antes de eliminar
    const isConfirmed = window.confirm("¿Está seguro que desea eliminar esta tarea?");

    // Solo proceder si el usuario confirmó
    if (!isConfirmed) {
      return; // Salir de la función si el usuario cancela
    }

    try {
      const token = getToken();
      await axios.delete(`${API_URL}/tasks/delete/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(tasks.filter(task => task.id !== taskId));
      setUpdateError(null);
    } catch (error) {
      console.error("Error al eliminar la tarea:", error);
      setUpdateError("Error al eliminar la tarea");
    }
  };

  const startEditingTask = (task: TaskData) => {
    setEditingTaskId(task.id);
    // Make sure to set all fields explicitly to avoid undefined values
    setEditingTask({
      title: task.title,
      status: task.status,
      due_date: task.due_date,
      client: task.client,
      client_id: task.client_id,
      area: task.area,
    });
    setUpdateError(null);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTask({});
    setUpdateError(null);
  };

  // Filter tasks based on selected client with multiple comparison strategies
  const filteredTasks = useMemo(() => {
    if (!clientFilter) {
      return tasks;
    }

    // Debug filter process
    console.log("%c=== DEPURACIÓN DE FILTRO ===", "color: green; font-weight: bold");
    console.log(`Filtrando por cliente: ${clientFilter}`);

    // Strategy 1: Strict comparison after string normalization
    const strictFiltered = tasks.filter(task => {
      // Normalize both values to string for comparison
      const taskClientIdStr = stringifyId(task.client_id);
      const filterClientIdStr = stringifyId(clientFilter);

      return taskClientIdStr === filterClientIdStr;
    });

    console.log(`Resultados con comparación estricta: ${strictFiltered.length}`);

    // If strict comparison returns no results, try more flexible approaches
    if (strictFiltered.length === 0) {
      console.log("Intentando comparación flexible...");

      // Strategy 2: Comparison after converting both to numbers
      const flexFiltered = tasks.filter(task => {
        // Convert to number if possible
        const taskClientId = Number(task.client_id);
        const filterClientId = Number(clientFilter);

        // Check if they are valid numbers before comparing
        if (!isNaN(taskClientId) && !isNaN(filterClientId)) {
          return taskClientId === filterClientId;
        }
        return false;
      });

      console.log(`Resultados con comparación numérica: ${flexFiltered.length}`);

      // Strategy 3: Search by client name
      if (flexFiltered.length === 0) {
        console.log("Intentando búsqueda por nombre de cliente...");

        // Find the selected client to get its name
        const selectedClient = clients.find(c => stringifyId(c.id) === stringifyId(clientFilter));

        if (selectedClient) {
          const nameFiltered = tasks.filter(task => {
            // Check if the task's client name includes the selected client's name
            return task.client && task.client.includes(selectedClient.name);
          });

          console.log(`Resultados con búsqueda por nombre: ${nameFiltered.length}`);

          if (nameFiltered.length > 0) {
            console.log("Usando resultados de búsqueda por nombre");
            return nameFiltered;
          }
        }
      }

      console.log("Usando resultados de comparación numérica");
      return flexFiltered;
    }

    console.log("Usando resultados de comparación estricta");
    console.log("%c=== FIN DEPURACIÓN DE FILTRO ===", "color: green; font-weight: bold");
    return strictFiltered;
  }, [tasks, clientFilter, clients]);

  // Debug: Log when filtered tasks change
  useEffect(() => {
    console.log("Filtered tasks count:", filteredTasks?.length);
  }, [filteredTasks]);

  // Handle client filter change with enhanced debugging
  const handleClientFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    console.log("%c=== CAMBIO DE FILTRO ===", "color: purple; font-weight: bold");
    console.log(`Valor seleccionado: "${value}" (${typeof value})`);

    if (value) {
      // Find the selected client for debugging
      const selectedClient = clients.find(c => stringifyId(c.id) === stringifyId(value));
      console.log("Cliente seleccionado:", selectedClient);

      // Check for possible matches
      const possibleMatches = tasks.filter(task => {
        return stringifyId(task.client_id) === stringifyId(value) ||
          Number(task.client_id) === Number(value);
      });

      console.log(`Posibles coincidencias encontradas: ${possibleMatches.length}`);
      possibleMatches.forEach(task => {
        console.log(`Tarea ${task.id}: client_id=${task.client_id}, client=${task.client}`);
      });
    }

    setClientFilter(value);
  };

  // Pagination calculations
  const totalTaskPages = Math.ceil(filteredTasks.length / itemsPerPage);

  const paginatedTasks = filteredTasks
    .slice((currentTaskPage - 1) * itemsPerPage, currentTaskPage * itemsPerPage);

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0]; // This will give YYYY-MM-DD format
  };

  // Loading state check will be inside ProtectedRoute


  // Wrap the entire component return in ProtectedRoute
  return (
    <ProtectedRoute allowedRoles={['senior', 'socio', 'consultor']}>
      {isLoading ? (
        // Loading state shown while ProtectedRoute is potentially verifying or data is loading
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        // Actual content rendered only if authorized and not loading
        <div className="container mx-auto p-4">
          <h1 className="text-2xl font-bold mb-4">Panel de Administración</h1>

          {/* Clients Section */}
          <ClientSection />

          {/* Tasks Section */}
          <div className="p-6 text-black shadow-lg rounded-lg bg-white mt-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Gestión de Tareas</h2>
              <div className="flex gap-4">
                <select
                  value={clientFilter}
                  onChange={handleClientFilterChange}
                  className="p-2 border rounded text-black"
                >
                  <option value="">Todos los Clientes</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <button
                  onClick={() => {
                    setIsLoading(true);
                    fetchTasks().finally(() => setIsLoading(false));
                  }}
                  className="flex items-center bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
                  title="Actualizar lista de tareas"
                >
                  <FontAwesomeIcon icon={faRotate} className="mr-2" />
                  Actualizar
                </button>
                <button
                  onClick={openTaskModal}
                  className="flex items-center bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
                >
                  <FontAwesomeIcon icon={faPlus} className="mr-2" />
                  Nueva Tarea
                </button>
              </div>
            </div>

            {updateError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p>{updateError}</p>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full border border-black rounded-lg overflow-hidden shadow-md">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border-b border-black p-2 text-left">Título</th>
                    <th className="border-b border-black p-2 text-left">Cliente</th>
                    <th className="border-b border-black p-2 text-left">Fecha de Entrega</th>
                    <th className="border-b border-black p-2 text-left">Área</th>
                    <th className="border-b border-black p-2 text-left">Estado</th>
                    <th className="p-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      <td className="border-b border-black p-2">{task.title}</td>
                      <td className="border-b border-black p-2">{task.client}</td>
                      <td className="border-b border-black p-2">{formatDate(task.due_date)}</td>
                      <td className="border-b border-black p-2">{task.area}</td>
                      <td className="border-b border-black p-2">
                        <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold rounded ${getStatusColor(task.status)} text-white`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="p-2">
                        {editingTaskId === task.id ? (
                          <div className="flex gap-2">
                            <button onClick={handleUpdateTask} className="text-green-600 hover:text-green-800">Guardar</button>
                            <button onClick={cancelEditing} className="text-gray-600 hover:text-gray-800">Cancelar</button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button onClick={() => startEditingTask(task)} className="text-blue-600 hover:text-blue-800">
                              <FontAwesomeIcon icon={faEdit} />
                            </button>
                            <button onClick={() => handleDeleteTask(task.id)} className="text-red-600 hover:text-red-800">
                              <FontAwesomeIcon icon={faTrash} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Task Pagination */}
            <div className="flex justify-between items-center mt-4">
              <button
                onClick={() => setCurrentTaskPage(prev => Math.max(prev - 1, 1))}
                disabled={currentTaskPage === 1}
                className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              >
                Anterior
              </button>
              <span>Página {currentTaskPage} de {totalTaskPages}</span>
              <button
                onClick={() => setCurrentTaskPage(prev => Math.min(prev + 1, totalTaskPages))}
                disabled={currentTaskPage === totalTaskPages}
                className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>

          {/* Report Download Section */}
          <ReportDownload clients={clients} />

          {/* Task Creation Modal */}
          {taskModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4 text-black">Crear Nueva Tarea</h3>
                {updateError && <p className="text-red-500 mb-4">{updateError}</p>}
                <input
                  type="text"
                  placeholder="Título"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="w-full p-2 border rounded mb-2 text-black"
                />
                <textarea
                  placeholder="Descripción (opcional)"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full p-2 border rounded mb-2 text-black"
                />
                <select
                  value={newTask.status}
                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                  className="w-full p-2 border rounded mb-2 text-black"
                >
                  {TASK_STATUSES.map(status => (
                    <option key={status.value} value={status.value}>{status.value}</option>
                  ))}
                </select>
                <select
                  value={newTask.client_id}
                  onChange={(e) => setNewTask({ ...newTask, client_id: e.target.value })}
                  className="w-full p-2 border rounded mb-2 text-black"
                >
                  <option value="">Seleccionar Cliente</option>
                  {clients.map(client => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </select>
                <select
                  value={newTask.area}
                  onChange={(e) => setNewTask({ ...newTask, area: e.target.value })}
                  className="w-full p-2 border rounded mb-2 text-black"
                >
                  <option value="">Seleccionar Área</option>
                  {AREA_OPTIONS.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
                <input
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="w-full p-2 border rounded mb-4 text-black"
                />
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
