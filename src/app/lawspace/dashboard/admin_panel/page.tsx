
'use client'

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState, useCallback } from "react";
import React from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTrash, faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";
import ClientSection from "@/components/ClientSection"; 
import ReportDownload from "@/components/ReportDownload";

type ClientData = {
  id: number;
  name: string;
  color: string;
  permanent: boolean;
};

type TaskData = {
  id: number;
  title: string;
  status: string;
  client: string;
  client_id: number;
  due_date: string;
};

type UserData = {
  id: number;
  username: string;
};

type ClientSectionProps = {
  // Existing props here
  onClientUpdate: () => void; // Add this line to define the prop
};

// Define task status options with their colors
const TASK_STATUSES = [
  { value: "En proceso", color: "bg-yellow-500" },
  { value: "Finalizado", color: "bg-green-500" },
  { value: "Cancelado", color: "bg-gray-500" },
  { value: "Gestionar al cliente", color: "bg-purple-500" }
];

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminPanel() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [clients, setClients] = useState<ClientData[]>([]); 
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    status: "En proceso",
    client_id: "",
    due_date: "",
  });

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Partial<TaskData>>({});
  const [clientsUpdated, setClientsUpdated] = useState(0); // Counter to trigger refreshes
  const [updateError, setUpdateError] = useState<string | null>(null);

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

  const getToken = useCallback(() => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1] || "";
  }, []);

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
      setTasks(response.data);
    } catch (error) {
      console.error("Error al obtener las tareas:", error);
    }
  }, [getToken]);

  const fetchUsers = useCallback(async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/users/get_all_users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error al obtener los usuarios:", error);
    }
  }, [getToken]);

  // This effect runs on initial load and when clientsUpdated changes
  useEffect(() => {
    if (!user || !["socio", "senior", "consultor"].includes(user.role)) {
      router.push("/");
    } else {
      fetchClients();
      fetchTasks();
      fetchUsers();
    }
  }, [user, router, fetchClients, fetchTasks, fetchUsers, clientsUpdated]);

  // Function to be passed to ClientSection to notify when clients are updated
  const handleClientUpdate = useCallback(() => {
    console.log("Client update detected, refreshing client list...");
    setClientsUpdated(prev => prev + 1); // Increment to trigger the effect
  }, []);

  const handleCreateTask = async () => {
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/tasks/create`,
        {
          title: newTask.title,
          description: newTask.description,
          status: newTask.status,
          client_id: Number(newTask.client_id),
          due_date: newTask.due_date,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewTask({ 
        title: "", 
        description: "", 
        status: "En proceso", 
        client_id: "", 
        due_date: "",
      });
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
      };
  
      console.log("Updating task with data:", data);
  
      const response = await axios.put(
        `${API_URL}/tasks/update_task`, // Updated endpoint
        data,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );
  
      console.log("Update response:", response.data);
      
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

  // Find client ID by client name
  const getClientIdByName = (clientName: string) => {
    const client = clients.find(c => c.name === clientName);
    return client?.id;
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
    });
    setUpdateError(null);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTask({});
    setUpdateError(null);
  };

  if (!user) return <p>Cargando...</p>;

  return (
    <div className="p-6 text-black">
      <h1 className="text-2xl font-bold mb-4 text-black">Panel de Administración</h1>

      {/* Sección de Gestión de Clientes */}
      <ClientSection onClientUpdate={handleClientUpdate} />

      {/* Sección combinada de Crear Tareas y Lista de Tareas */}
      <div className="bg-white text-black p-6 rounded-lg shadow-lg mt-6">
        <h2 className="text-lg font-semibold mb-3">Crear Nueva Tarea</h2>
        
        {updateError && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {updateError}
          </div>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <input
            type="text"
            placeholder="Título"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="border p-2 text-black rounded"
          />
          <select
            value={newTask.client_id}
            onChange={(e) => setNewTask({ ...newTask, client_id: e.target.value })}
            className="border p-2 text-black rounded"
          >
            <option value="">Seleccionar Cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={newTask.due_date}
            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
            className="border p-2 text-black rounded"
          />
          
          <button 
            onClick={handleCreateTask} 
            className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition col-span-1 md:col-span-3"
          >
            Crear Tarea
          </button>
        </div>

        <h2 className="text-lg font-semibold mb-3">Lista de Tareas</h2>
        <table className="w-full border border-black rounded-lg overflow-hidden shadow-md">
          <thead className="bg-gray-100">
            <tr>
              <th className="border-b border-black p-2 text-left">Título</th>
              <th className="border-b border-black p-2 text-left">Estado</th>
              <th className="border-b border-black p-2 text-left">Cliente</th>
              <th className="border-b border-black p-2 text-left">Fecha de Vencimiento</th>
              <th className="border-b border-black p-2 text-left">Asesoria Permanente</th>
              <th className="border-b border-black p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const clientId = task.client_id || getClientIdByName(task.client);
              const isPermanent = clientId ? isClientPermanent(clientId) : false;
              
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
            })}
          </tbody>
        </table>
      </div>

      <ReportDownload clients={clients} />
    </div>
  );
}