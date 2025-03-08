'use client'

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState } from "react";
import axios from "axios";

interface ClientData {
  id: number;
  name: string;
}

interface UserData {
  id: number;
  username: string;
}

interface TaskData {
  id: number;
  title: string;
  status: string;
  client: string;
  assigned_to: string;
  due_date: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function AdminPanel() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [clients, setClients] = useState<ClientData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
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

  useEffect(() => {
    if (!user || !["socio", "senior", "consultor"].includes(user.role)) {
      router.push("/");
    } else {
      fetchClients();
      fetchTasks();
      fetchUsers();
    }
  }, [user, router]);

  const getToken = () => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1] || "";
  };

  const fetchClients = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/clients/get_clients_admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(response.data);
    } catch (error) {
      console.error("Error al obtener los clientes:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/tasks/get_task`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTasks(response.data);
    } catch (error) {
      console.error("Error al obtener las tareas:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/users/get_all_users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUsers(response.data);
    } catch (error) {
      console.error("Error al obtener los usuarios:", error);
    }
  };

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
      await axios.put(
        `${API_URL}/tasks/${editingTaskId}`,
        {
          assigned_to_id: editingTask.assigned_to ?? null,
          due_date: editingTask.due_date ?? null,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchTasks();
      setEditingTaskId(null);
      setEditingTask({});
    } catch (error) {
      console.error("Error al actualizar la tarea:", error);
    }
  };

  if (!user) return <p>Cargando...</p>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Panel de Administración</h1>

      {/* Sección de Crear Tareas */}
      <div className="bg-white p-4 rounded-lg shadow-lg text-black mb-6">
        <h2 className="text-lg font-semibold mb-3">Crear Nueva Tarea</h2>
        <div className="grid grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Título"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="border p-2 text-black"
          />
          <select
            value={newTask.client_id}
            onChange={(e) => setNewTask({ ...newTask, client_id: e.target.value })}
            className="border p-2 text-black"
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
            className="border p-2 text-black"
          >
            <option value="">Asignar a Usuario</option>
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
            className="border p-2 text-black"
          />
          <button onClick={handleCreateTask} className="bg-blue-800 text-white px-4 py-2 rounded">
            Crear Tarea
          </button>
        </div>
      </div>

      {/* Sección de Lista de Tareas */}
      <div className="bg-white p-4 rounded-lg shadow-lg text-black">
        <h2 className="text-lg font-semibold mb-3">Lista de Tareas</h2>
        <table className="w-full border border-black rounded-lg overflow-hidden">
          <thead className="bg-gray-100">
            <tr>
              <th className="border border-black p-2 text-left">Título</th>
              <th className="border border-black p-2 text-left">Estado</th>
              <th className="border border-black p-2 text-left">Cliente</th>
              <th className="border border-black p-2 text-left">Asignado a</th>
              <th className="border border-black p-2 text-left">Fecha de Vencimiento</th>
              <th className="border border-black p-2 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50">
                <td className="border border-black p-2">{task.title}</td>
                <td className="border border-black p-2">{task.status}</td>
                <td className="border border-black p-2">{task.client}</td>
                <td className="border border-black p-2">
                  {editingTaskId === task.id ? (
                    <select
                      value={editingTask.assigned_to ?? task.assigned_to}
                      onChange={(e) => setEditingTask({ ...editingTask, assigned_to: e.target.value })}
                      className="border p-1 text-black"
                    >
                      {users.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.username}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <>
                      {task.assigned_to}
                      <button onClick={() => setEditingTaskId(task.id)} className="ml-2 text-blue-600">
                        Cambiar
                      </button>
                    </>
                  )}
                </td>
                <td className="border border-black p-2">
                  {editingTaskId === task.id ? (
                    <input
                      type="date"
                      value={editingTask.due_date ?? ""}
                      onChange={(e) => setEditingTask({ ...editingTask, due_date: e.target.value })}
                      className="border p-1 text-black"
                    />
                  ) : (
                    <>
                      {task.due_date ? new Date(task.due_date).toLocaleDateString() : "Sin fecha"}
                      <button onClick={() => setEditingTaskId(task.id)} className="ml-2 text-blue-600">
                        Cambiar
                      </button>
                    </>
                  )}
                </td>
                <td className="border border-black p-2">
                  {editingTaskId === task.id && (
                    <button onClick={handleUpdateTask} className="bg-blue-800 text-white px-2 py-1 rounded">
                      Guardar Cambios
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}