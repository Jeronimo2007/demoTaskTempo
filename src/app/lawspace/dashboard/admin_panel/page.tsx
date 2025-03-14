'use client'

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTrash } from "@fortawesome/free-solid-svg-icons";
import ClientSection from "@/components/ClientSection"; 
import ReportDownload from "@/components/ReportDownload";

type ClientData = {
  id: number;
  name: string;
  color: string; 
};

type TaskData = {
  id: number;
  title: string;
  status: string;
  client: string;
  assigned_to: string;
  due_date: string;
};

type UserData = {
  id: number;
  username: string;
};

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
    assigned_to_id: "",
    due_date: "",
  });

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [editingTask, setEditingTask] = useState<Partial<TaskData>>({});

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

  useEffect(() => {
    if (!user || !["socio", "senior", "consultor"].includes(user.role)) {
      router.push("/");
    } else {
      fetchClients();
      fetchTasks();
      fetchUsers();
    }
  }, [user, router, fetchClients, fetchTasks, fetchUsers]);

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
          assigned_to_id: Number(newTask.assigned_to_id),
          due_date: newTask.due_date,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewTask({ title: "", description: "", status: "En proceso", client_id: "", assigned_to_id: "", due_date: "" });
      fetchTasks();
    } catch (error) {
      console.error("Error al crear la tarea:", error);
    }
  };

  const handleUpdateTask = async () => {
    if (editingTaskId === null) return;
  
    try {
      const token = getToken();
      const taskToUpdate = tasks.find(task => task.id === editingTaskId);
      if (!taskToUpdate) return;
  
      const data = {
        assigned_to_id: Number(editingTask.assigned_to) ?? taskToUpdate.assigned_to,
        due_date: editingTask.due_date ?? taskToUpdate.due_date,
      };
  
      console.log("Updating task with data:", data); // Log the data being sent
  
      await axios.put(
        `${API_URL}/tasks/${editingTaskId}`,
        data,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTasks();
      setEditingTaskId(null);
      setEditingTask({});
    } catch (error) {
      console.error("Error al actualizar la tarea:", error);
      if (axios.isAxiosError(error) && error.response) {
        console.error("Server response:", error.response.data); // Log server response
      }
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const token = getToken();
      await axios.delete(`${API_URL}/tasks/delete/${taskId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(tasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error("Error al eliminar la tarea:", error);
    }
  };

  const startEditingTask = (task: TaskData) => {
    setEditingTaskId(task.id);
    setEditingTask({
      assigned_to: task.assigned_to || "",
      due_date: task.due_date,
    });
  };

  if (!user) return <p>Cargando...</p>;

  return (
    <div className="p-6 text-black">
      <h1 className="text-2xl font-bold mb-4 text-black">Panel de Administración</h1>

      {/* Sección de Gestión de Clientes */}
      <ClientSection />

      {/* Sección combinada de Crear Tareas y Lista de Tareas */}
      <div className="bg-white text-black p-6 rounded-lg shadow-lg mt-6">
        <h2 className="text-lg font-semibold mb-3">Crear Nueva Tarea</h2>
        <div className="grid grid-cols-3 gap-4 mb-6">
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
          <select
            value={newTask.assigned_to_id}
            onChange={(e) => setNewTask({ ...newTask, assigned_to_id: e.target.value })}
            className="border p-2 text-black rounded"
          >
            <option value="">...</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.username}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={newTask.due_date}
            onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
            className="border p-2 text-black rounded"
          />
          <button onClick={handleCreateTask} className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
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
              <th className="border-b border-black p-2 text-left">Asignado a</th>
              <th className="border-b border-black p-2 text-left">Fecha de Vencimiento</th>
              <th className="border-b border-black p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="border-b border-black p-2">{task.title}</td>
                <td className="border-b border-black p-2">{task.status}</td>
                <td className="border-b border-black p-2">{task.client}</td>
                <td className="border-b border-black p-2">
                  {editingTaskId === task.id ? (
                    <select
                      value={editingTask.assigned_to ?? ""}
                      onChange={(e) => setEditingTask({ ...editingTask, assigned_to: e.target.value })}
                      className="border p-1 text-black rounded"
                    >
                      <option value="">...</option>
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      {task.assigned_to}
                      <button onClick={() => startEditingTask(task)} className="ml-2 text-blue-600 hover:text-blue-800 transition">
                        Cambiar
                      </button>
                    </>
                  )}
                </td>
                <td className="border-b border-black p-2">
                  {editingTaskId === task.id ? (
                    <input
                      type="date"
                      value={editingTask.due_date ?? ""}
                      onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                      className="border p-1 text-black rounded"
                    />
                  ) : (
                    <>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : "Sin fecha"}
                      <button onClick={() => startEditingTask(task)} className="ml-2 text-blue-600 hover:text-blue-800 transition">
                        Cambiar
                      </button>
                    </>
                  )}
                </td>
                <td className=" p-2 flex space-x-2">
                  {editingTaskId === task.id && (
                    <>
                      <button onClick={handleUpdateTask} className="bg-blue-800 text-white p-2 rounded hover:bg-blue-700 transition">
                        <FontAwesomeIcon icon={faSave} />
                      </button>
                      <button onClick={() => handleDeleteTask(task.id)} className="bg-red-800 text-white p-2 rounded hover:bg-red-700 transition">
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReportDownload clients={clients} />
    </div>
  );
}
