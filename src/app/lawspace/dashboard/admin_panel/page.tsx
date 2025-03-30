'use client'

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState, useCallback, useMemo } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTrash, faTimes, faPlus, faFilter } from "@fortawesome/free-solid-svg-icons";
import ClientSection from "@/components/ClientSection"; 
import ReportDownload from "@/components/ReportDownload";

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
  { value: "Gestionar al cliente", color: "bg-purple-500" }
];

// Define area options
const AREA_OPTIONS = [
  "Laboral",
  "Comercial / Civil",
  "Propiedad Intelectual",
  "Societario",
  "Administrativo"
];

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Utility function to normalize IDs for consistent comparison
const stringifyId = (id: any): string => {
  if (id === null || id === undefined) return '';
  return String(id).trim();
};

export default function AdminPanel() {
  const { user, setUser } = useAuthStore();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]);
  const [isLoadingUser, setIsLoadingUser] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "En proceso",
    client_id: "",
    due_date: "",
    area: "",
  });

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Partial<TaskData>>({});
  const [clientsUpdated, setClientsUpdated] = useState(0); // Counter to trigger refreshes
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [taskModal, setTaskModal] = useState({
    isOpen: false
  });
  // Client filter state
  const [clientFilter, setClientFilter] = useState<string>("");

  // Helper function to check if a client is permanent
  const isClientPermanent = useCallback((clientId: number) => {
    const client = clients.find(c => c.id === clientId);
    return client?.permanent || false;
  }, [clients]);

  // Helper function to get status color
  const getStatusColor = (status: string) => {
    const statusObj = TASK_STATUSES.find(s => s.value === status);
    return statusObj?.color || "bg-gray-300";
  };

  // Get token from cookie
  const getToken = useCallback(() => {
    return document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1] || "";
  }, []);

  // Function to fetch user data with token
  const fetchUserData = useCallback(async (token: string) => {
    try {
      setIsLoadingUser(true);
      const response = await axios.get(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (response.data) {
        // Update store with user data
        setUser(response.data, token);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error al recuperar datos del usuario:", error);
      return false;
    } finally {
      setIsLoadingUser(false);
    }
  }, [API_URL, setUser]);

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

  // Debug function to inspect data structures
  const debugDataStructure = useCallback(() => {
    console.log("%c=== DATOS DE DEPURACIÓN ===", "color: blue; font-weight: bold");
    
    // Examine task structure
    if (tasks.length > 0) {
      console.log("%cEjemplo de tarea:", "font-weight: bold");
      console.log(tasks[0]);
      console.log("%cTipos de datos en client_id:", "font-weight: bold");
      
      // Create a map of client_id types found
      const idTypes = tasks.reduce((acc, task) => {
        const type = typeof task.client_id;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(idTypes);
      
      // Show client_id values
      console.log("%cValores de client_id en tareas:", "font-weight: bold");
      tasks.forEach(task => {
        console.log(`Tarea ${task.id}: client_id=${task.client_id} (${typeof task.client_id}), client=${task.client}`);
      });
    } else {
      console.log("No hay tareas disponibles para depurar");
    }
    
    // Examine client structure
    if (clients.length > 0) {
      console.log("%cEjemplo de cliente:", "font-weight: bold");
      console.log(clients[0]);
      console.log("%cTipos de datos en id de clientes:", "font-weight: bold");
      
      // Create a map of id types found
      const idTypes = clients.reduce((acc, client) => {
        const type = typeof client.id;
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      console.log(idTypes);
      
      // Show id values
      console.log("%cValores de id en clientes:", "font-weight: bold");
      clients.forEach(client => {
        console.log(`Cliente: ${client.name}, id=${client.id} (${typeof client.id})`);
      });
    } else {
      console.log("No hay clientes disponibles para depurar");
    }
    
    console.log("%c=== FIN DATOS DE DEPURACIÓN ===", "color: blue; font-weight: bold");
  }, [tasks, clients]);


  // Effect to handle authentication and session recovery
  useEffect(() => {
    const initializeSession = async () => {
      const token = getToken();
      
      // If there's a token but no user, try to recover the session
      if (token && !user && !isLoadingUser) {
        console.log("Token detectado, recuperando sesión...");
        const success = await fetchUserData(token);
        
        if (!success) {
          console.log("No se pudo recuperar la sesión, redirigiendo al login");
          router.push("/");
          return;
        }
      } 
      // If no token, redirect to login
      else if (!token) {
        console.log("No hay token, redirigiendo al login");
        router.push("/");
        return;
      }
      
      // If we have a valid user, load data
      if (user && ["socio", "senior", "consultor"].includes(user.role)) {
        console.log("Usuario válido, cargando datos...");
        
        // Fetch clients and tasks only once when the session is initialized
        if (clients.length === 0) {
          fetchClients();
        }
        if (tasks.length === 0) {
          fetchTasks();
        }
        
        // Run debugging after data is loaded
        const timer = setTimeout(() => {
          debugDataStructure();
        }, 1000);
        
        return () => clearTimeout(timer);
      } else if (user) {
        // User with invalid role
        console.log("Usuario con rol no válido");
        router.push("/");
      }
    };
    
    initializeSession();
    // Removed unnecessary dependencies to prevent infinite calls
  }, [user, router, getToken, fetchUserData, clients.length, tasks.length, isLoadingUser]);

  // Function to be passed to ClientSection to notify when clients are updated
  const handleClientUpdate = useCallback(() => {
    setClientsUpdated(prev => prev + 1); // Increment to trigger the effect
  }, []);

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
        console.log(`- Tarea: ${task.title}, client_id: ${task.client_id} (${typeof task.client_id})`);
      });
    }
    
    console.log("%c=== FIN CAMBIO DE FILTRO ===", "color: purple; font-weight: bold");
    setClientFilter(value);
    
    // Run data structure debugging when filter changes
    setTimeout(debugDataStructure, 500);
  };

  // Reset client filter
  const clearClientFilter = () => {
    setClientFilter("");
  };

  // Show loading indicator while recovering user
  if (isLoadingUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Recuperando sesión...</p>
        </div>
      </div>
    );
  }

  if (!user) return <p>Cargando...</p>;

  return (
    <div className="p-6 text-black">
      <h1 className="text-2xl font-bold mb-4 text-black">Panel de Administración</h1>

      {/* Sección de Gestión de Clientes */}
      <ClientSection onClientUpdate={handleClientUpdate} />

      {/* Sección combinada de Crear Tareas y Lista de Tareas */}
      <div className="bg-white text-black p-6 rounded-lg shadow-lg mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Gestión de Tareas</h2>
          <button 
            onClick={openTaskModal}
            className="flex items-center bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Nueva Tarea
          </button>
        </div>
        
        {updateError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {updateError}
          </div>
        )}

        <h2 className="text-lg font-semibold mb-3">Lista de Tareas</h2>
        
        {/* Client Filter - Minimalist Version */}
        <div className="mb-4 flex items-center space-x-3">
          <div className="flex items-center">
            <FontAwesomeIcon icon={faFilter} className="mr-2 text-gray-600" />
            <span className="text-sm">Cliente:</span>
          </div>
          <select
            value={clientFilter}
            onChange={handleClientFilterChange}
            className="border p-2 rounded"
          >
            <option value="">Todos los clientes</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          {clientFilter && (
            <button 
              onClick={clearClientFilter}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Limpiar
            </button>
          )}
          
          {/* Debug info - can be removed in production */}
          <span className="text-xs text-gray-500">
            {clientFilter ? `Filtrando por cliente ID: ${clientFilter}` : 'Mostrando todas las tareas'}
            {` (${filteredTasks.length} tareas)`}
          </span>
        </div>
        
        <table className="w-full border border-black rounded-lg overflow-hidden shadow-md">
          <thead className="bg-gray-100">
            <tr>
              <th className="border-b border-black p-2 text-left">Título</th>
              <th className="border-b border-black p-2 text-left">Estado</th>
              <th className="border-b border-black p-2 text-left">Cliente</th>
              <th className="border-b border-black p-2 text-left">Área</th>
              <th className="border-b border-black p-2 text-left">Fecha de Vencimiento</th>
              <th className="border-b border-black p-2 text-left">Asesoria Permanente</th>
              <th className="border-b border-black p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const isPermanent = isClientPermanent(task.client_id);
                
                return (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="border-b border-black p-2">
                    {editingTaskId === task.id ? (
                      <input
                        type="text"
                        value={editingTask.title || ""}
                        onChange={(e) => setEditingTask({ ...editingTask, title: e.target.value })}
                        className="border p-1 text-black rounded w-full"
                      />
                    ) : (
                      task.title
                    )}
                  </td>
                  <td className="border-b border-black p-2">
                    {editingTaskId === task.id ? (
                      <select
                        value={editingTask.status || task.status}
                        onChange={(e) => setEditingTask({ ...editingTask, status: e.target.value })}
                        className="border p-1 text-black rounded w-full"
                      >
                        {TASK_STATUSES.map((status) => (
                          <option key={status.value} value={status.value}>
                            {status.value}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold inline-block text-center text-white ${getStatusColor(task.status)}`}>
                        {task.status}
                      </div>
                    )}
                  </td>
                  <td className="border-b border-black p-2">{task.client}</td>
                  <td className="border-b border-black p-2">
                    {editingTaskId === task.id ? (
                      <select
                        value={editingTask.area || task.area || ""}
                        onChange={(e) => setEditingTask({ ...editingTask, area: e.target.value })}
                        className="border p-1 text-black rounded w-full"
                      >
                        <option value="">Seleccionar Área</option>
                        {AREA_OPTIONS.map((area) => (
                          <option key={area} value={area}>
                            {area}
                          </option>
                        ))}
                      </select>
                    ) : (
                      task.area || "No especificada"
                    )}
                  </td>
                  <td className="border-b border-black p-2">
                    {editingTaskId === task.id ? (
                      <input
                        type="date"
                        value={editingTask.due_date || ""}
                        onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                        className="border p-1 text-black rounded w-full"
                      />
                    ) : (
                      task.due_date ? new Date(task.due_date).toLocaleDateString() : "Sin fecha"
                    )}
                  </td>
                  <td className="border-b border-black p-2">
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold inline-block text-center ${
                      isPermanent 
                        ? "bg-green-500 text-white" 
                        : "bg-gray-300 text-gray-700"
                    }`}>
                      {isPermanent ? "Sí" : "No"}
                    </div>
                  </td>
                  <td className="border-b border-black p-2 flex space-x-2">
                    {editingTaskId === task.id ? (
                      <div className="flex space-x-2">
                        <button 
                          onClick={handleUpdateTask} 
                          className="bg-blue-800 text-white p-2 rounded hover:bg-blue-700 transition"
                          title="Guardar cambios"
                        >
                          <FontAwesomeIcon icon={faSave} />
                        </button>
                        <button 
                          onClick={cancelEditing} 
                          className="bg-gray-500 text-white p-2 rounded hover:bg-gray-400 transition"
                          title="Cancelar edición"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => startEditingTask(task)} 
                          className="bg-blue-600 text-white p-2 rounded hover:bg-blue-500 transition"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => handleDeleteTask(task.id)} 
                          className="bg-red-800 text-white p-2 rounded hover:bg-red-700 transition"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-4 text-gray-500">
                  {clientFilter ? "No hay tareas para el cliente seleccionado" : "No hay tareas disponibles"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Task Creation Modal */}
      {taskModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Crear Nueva Tarea</h3>
            
            {updateError && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                <p>{updateError}</p>
              </div>
            )}
            
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium mb-1">
                  Título de la Tarea*:
                </label>
                <input
                  id="title"
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="border p-2 text-black rounded w-full"
                  placeholder="Título de la tarea"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="description" className="block text-sm font-medium mb-1">
                  Descripción:
                </label>
                <textarea
                  id="description"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="border p-2 text-black rounded w-full"
                  placeholder="Descripción de la tarea"
                  rows={3}
                />
              </div>
              
              <div>
                <label htmlFor="client_id" className="block text-sm font-medium mb-1">
                  Cliente*:
                </label>
                <select
                  id="client_id"
                  value={newTask.client_id}
                  onChange={(e) => setNewTask({ ...newTask, client_id: e.target.value })}
                  className="border p-2 text-black rounded w-full"
                  required
                >
                  <option value="">Seleccionar Cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="status" className="block text-sm font-medium mb-1">
                  Estado:
                </label>
                <select
                  id="status"
                  value={newTask.status}
                  onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}
                  className="border p-2 text-black rounded w-full"
                >
                  {TASK_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.value}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="area" className="block text-sm font-medium mb-1">
                  Área:
                </label>
                <select
                  id="area"
                  value={newTask.area}
                  onChange={(e) => setNewTask({ ...newTask, area: e.target.value })}
                  className="border p-2 text-black rounded w-full"
                >
                  <option value="">Seleccionar Área</option>
                  {AREA_OPTIONS.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label htmlFor="due_date" className="block text-sm font-medium mb-1">
                  Fecha de Vencimiento:
                </label>
                <input
                  id="due_date"
                  type="date"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  className="border p-2 text-black rounded w-full"
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={closeTaskModal}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateTask}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Crear Tarea
              </button>
            </div>
          </div>
        </div>
      )}

      <ReportDownload clients={clients} />
    </div>
  );
}
