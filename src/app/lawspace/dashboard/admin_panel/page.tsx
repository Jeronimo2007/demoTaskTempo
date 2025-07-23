'use client'

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { useEffect, useState, useCallback, useMemo, ChangeEvent } from "react"; // Add ChangeEvent
import axios from "axios";
import ClientSection from "@/components/ClientSection";
import ReportDownload from "@/components/ReportDownload";
import ProtectedRoute from "@/components/ProtectedRoute";
import taskService from "@/services/taskService"; // Import taskService
import { Task } from "@/types/task"; // Import the updated Task type
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus, faEdit, faRotate } from "@fortawesome/free-solid-svg-icons";
import groupService, { Group } from '@/services/groupService';

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
  "Sin área",
  "Derecho Comercial y Societario",
  "Derecho Laboral",
  "Cumplimiento",
  "Propiedad Intelectual",
  "Derecho Digital",
  "Derecho Cannábico",
  "Derecho Inmobiliario y Urbanístico",
  "Regulatorio",
  "Derecho Judicial",
];

const FACTURADO_OPTIONS = [
  { label: 'Si', value: 'si' },
  { label: 'No', value: 'no' },
  { label: 'Parcialmente', value: 'parcialmente' },
];

const API_URL = process.env.NEXT_PUBLIC_API_URL;


// Define type for the newTask state explicitly
type NewTaskState = {
  title: string;
  client_id: string; // Keep as string for form input
  status: string;
  billing_type: 'hourly' | 'percentage' | 'mensual';
  area: string;
  note: string;
  total_value: number | null;
  due_date: string;
  permanent: boolean;
  tarif: number | null; // Add tarif field
  // Add facturado for clarity, but always send as 'no' on creation
  facturado?: string;
};


export default function AdminPanel() {
  const { user, isAuthenticated, logout } = useAuth(); // Use useAuth hook
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  
  const [tasks, setTasks] = useState<Task[]>([]); // Use imported Task type
  const [clients, setClients] = useState<ClientData[]>([]);
  const [newTask, setNewTask] = useState<NewTaskState>({ // Use explicit type
    title: "",
    client_id: "", // Keep as string for form input, convert later
    status: "En proceso", // Default status
    billing_type: 'hourly', // Default billing type
    area: "Sin área", // Default area
    note: "", // Optional note
    total_value: null, // Optional total value, initialize as null
    due_date: "", // Add due_date 
    permanent: false,
    tarif: null, // Initialize tarif as null
    facturado: 'no', // Initialize facturado as 'no'
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

  // --- GROUP STATE ---
  const [groups, setGroups] = useState<Group[]>([]);
  const [isGroupLoading, setIsGroupLoading] = useState(false);
  const [groupError, setGroupError] = useState<string | null>(null);
  const [groupModal, setGroupModal] = useState<{ isOpen: boolean; isEdit: boolean; groupId?: number }>({ isOpen: false, isEdit: false });
  const [newGroup, setNewGroup] = useState<{
    group_name: string;
    monthly_limit_hours: number | '';
    client_id: string;
    tasks: number[];
  }>({
    group_name: '',
    monthly_limit_hours: '',
    client_id: '',
    tasks: [],
  });

  // For editing
  const [editingGroup, setEditingGroup] = useState<typeof newGroup>(newGroup);
  
  // For filtered tasks by client in group modal
  const [groupFilteredTasks, setGroupFilteredTasks] = useState<Task[]>([]);
  const [isLoadingGroupTasks, setIsLoadingGroupTasks] = useState(false);

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
      const token = getToken();
      if (!token) return; // Don't fetch if no token
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
      if (!token) return; // Don't fetch if no token
      const fetchedTasks = await taskService.getAllTasks(); // Use the service
      console.log("Tasks fetched via service:", fetchedTasks); // Debug log
      // Add more detailed logging for permanent tasks
      fetchedTasks.forEach(task => {
        if (task.permanent) {
          console.log(`Permanent task ${task.id}:`, {
            title: task.title,
            permanent: task.permanent,
            tarif: task.tarif
          });
        }
      });
      console.log("Tasks array before setting state:", fetchedTasks); // New debug log
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
      due_date: "", // Add due_date
      permanent: false,
      tarif: null, // Initialize tarif as null
      facturado: 'no', // Initialize facturado as 'no'
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
    } else if (name === 'tarif') {
      processedValue = value === '' ? null : parseFloat(value);
      if (isNaN(processedValue as number)) {
        processedValue = null;
      }
    }

    setNewTask(prevState => {
      let updatedValue: string | number | null | boolean = processedValue;
      if (name === 'permanent') {
        updatedValue = value === 'true';
      }
      const updatedState = {
        ...prevState,
        [name]: updatedValue,
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
        setUpdateError("El título de el asunto no puede estar vacío"); return;
      }
      if (!newTask.client_id) {
        setUpdateError("Debe seleccionar un cliente"); return;
      }
      if (newTask.billing_type === 'percentage' && (newTask.total_value === null || newTask.total_value <= 0)) {
        setUpdateError("El valor total (mayor que 0) es requerido para facturación por porcentaje");
        return;
      }
      if (newTask.permanent && (newTask.tarif === null || newTask.tarif <= 0)) {
        setUpdateError("La tarifa es requerida para asuntos permanentes");
        return;
      }

      let isoDueDate = null;
      if (newTask.due_date) {
        isoDueDate = new Date(newTask.due_date).toISOString();
      }

      const payload = {
        client_id: Number(newTask.client_id),
        title: newTask.title.trim(),
        billing_type: newTask.billing_type,
        status: newTask.status,
        area: newTask.area || "Sin área",
        note: newTask.note || null,
        total_value: newTask.billing_type === 'percentage' ? newTask.total_value : null,
        due_date: isoDueDate,
        permanent: newTask.permanent,
        tarif: newTask.permanent ? newTask.tarif : null, // Only include tarif if permanent is true
        facturado: 'no', // Always send as 'no' on creation
      };

      console.log("Creating task with payload:", payload); // Debug log
      const createdTask = await taskService.createTask(payload);
      console.log("Created task:", createdTask); // Debug log
      closeTaskModal();
      fetchTasks();
    } catch (error) {
      console.error("Error al crear el asunto:", error);
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.detail
        ? `Error: ${error.response.data.detail}`
        : "Error al crear el asunto. Verifique los datos e intente nuevamente.";
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
      const updatableKeys: (keyof Task)[] = ['title', 'area', 'billing_type', 'note', 'total_value', 'facturado'];

      updatableKeys.forEach(key => {
        if (key in editingTask && editingTask[key] !== originalTask[key]) {
          if (key === 'title') {
            payload.title = editingTask[key] as string;
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
          } else if (key === 'facturado') {
            // Always send lowercase value
            payload.facturado = (editingTask[key] as string)?.toLowerCase();
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
      console.error("Error al actualizar el asunto:", error);
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.detail
        ? `Error: ${error.response.data.detail}`
        : "Error al actualizar el asunto. Verifique los datos e intente nuevamente.";
      setUpdateError(errorMessage);
    }
  };


  const handleDeleteTask = async (taskId: number) => {
    const isConfirmed = window.confirm("¿Está seguro que desea eliminar el asunto?");
    if (!isConfirmed) return;

    try {
      setUpdateError(null);
      await taskService.deleteTask(taskId);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
    } catch (error) {
      console.error("Error al eliminar el asunto:", error);
      const errorMessage = axios.isAxiosError(error) && error.response?.data?.detail
        ? `Error: ${error.response.data.detail}`
        : "Error al eliminar el asunto.";
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
    const searchTerm = clientFilter.toLowerCase();
    return tasks.filter(task =>
      task.title.toLowerCase().includes(searchTerm) ||
      ((task.client_name || task.client) && (task.client_name || task.client)?.toString().toLowerCase().includes(searchTerm)) ||
      (task.area && task.area.toLowerCase().includes(searchTerm))
    );
  }, [tasks, clientFilter]);

  const handleClientFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  // --- GROUP HANDLERS ---
  const fetchGroups = useCallback(async () => {
    setIsGroupLoading(true);
    setGroupError(null);
    try {
      const data = await groupService.getAllGroups();
      setGroups(data);
    } catch {
      setGroupError('Error al obtener los grupos.');
    } finally {
      setIsGroupLoading(false);
    }
  }, []);

  // Update filtered tasks when client selection changes
  useEffect(() => {
    const fetchClientTasks = async () => {
      const currentClientId = groupModal.isEdit ? editingGroup.client_id : newGroup.client_id;
      if (currentClientId) {
        setIsLoadingGroupTasks(true);
        try {
          const clientTasks = await taskService.getTasksByClient(Number(currentClientId));
          setGroupFilteredTasks(clientTasks);
        } catch (err) {
          console.error('Error fetching client tasks:', err);
          setGroupError('Error al cargar las tareas del cliente');
          setGroupFilteredTasks([]);
        } finally {
          setIsLoadingGroupTasks(false);
        }
      } else {
        setGroupFilteredTasks([]);
      }
    };

    if (groupModal.isOpen) {
      fetchClientTasks();
    }
  }, [groupModal.isOpen, groupModal.isEdit, editingGroup.client_id, newGroup.client_id]);

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchGroups();
    }
  }, [isAuthenticated, user, fetchGroups]);

  const openGroupModal = (isEdit = false, group?: Group) => {
    if (isEdit && group && group.id) {
      // Find client id by matching client name to clients array
      const clientId = clients.find(c => c.name === group.client_name)?.id?.toString() || '';
      // Find task ids by matching titles
      const taskIds = tasks.filter(t => group.tasks.includes(t.title)).map(t => t.id);
      setEditingGroup({
        group_name: group.group_name,
        monthly_limit_hours: group.monthly_limit_hours || '',
        client_id: clientId,
        tasks: taskIds,
      });
      setGroupModal({ isOpen: true, isEdit: true, groupId: group.id });
    } else {
      setNewGroup({ group_name: '', monthly_limit_hours: '', client_id: '', tasks: [] });
      setGroupModal({ isOpen: true, isEdit: false });
    }
    setGroupError(null);
  };

  const closeGroupModal = () => {
    setGroupModal({ isOpen: false, isEdit: false });
    setGroupError(null);
    setGroupFilteredTasks([]);
  };

  const handleGroupChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (groupModal.isEdit) {
      setEditingGroup(prev => ({ 
        ...prev, 
        [name]: name === 'monthly_limit_hours' ? (value === '' ? '' : parseInt(value)) : value,
        // Reset tasks when client changes
        ...(name === 'client_id' && { tasks: [] })
      }));
    } else {
      setNewGroup(prev => ({ 
        ...prev, 
        [name]: name === 'monthly_limit_hours' ? (value === '' ? '' : parseInt(value)) : value,
        // Reset tasks when client changes
        ...(name === 'client_id' && { tasks: [] })
      }));
    }
  };

  const handleGroupTasksChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
    if (groupModal.isEdit) {
      setEditingGroup(prev => ({ ...prev, tasks: selected }));
    } else {
      setNewGroup(prev => ({ ...prev, tasks: selected }));
    }
  };

  const handleCreateGroup = async () => {
    setGroupError(null);
    if (!newGroup.group_name.trim()) { setGroupError('El nombre del grupo es obligatorio.'); return; }
    if (!newGroup.client_id) { setGroupError('Debe seleccionar un cliente.'); return; }
    if (!newGroup.monthly_limit_hours || newGroup.monthly_limit_hours <= 0) { setGroupError('El límite de horas debe ser mayor a 0.'); return; }
    if (!newGroup.tasks.length) { setGroupError('Debe seleccionar al menos un asunto.'); return; }
    try {
      await groupService.createGroup({
        group_name: newGroup.group_name,
        monthly_limit_hours: Number(newGroup.monthly_limit_hours),
        client_id: Number(newGroup.client_id),
        tasks: newGroup.tasks,
      });
      closeGroupModal();
      fetchGroups();
    } catch {
      setGroupError('Error al crear el grupo.');
    }
  };

  const handleUpdateGroup = async () => {
    if (!groupModal.groupId) return;
    setGroupError(null);
    if (!editingGroup.group_name.trim()) { setGroupError('El nombre del grupo es obligatorio.'); return; }
    if (!editingGroup.monthly_limit_hours || editingGroup.monthly_limit_hours <= 0) { setGroupError('El límite de horas debe ser mayor a 0.'); return; }
    if (!editingGroup.tasks.length) { setGroupError('Debe seleccionar al menos un asunto.'); return; }
    try {
      await groupService.updateGroup(groupModal.groupId, {
        group_name: editingGroup.group_name,
        monthly_limit_hours: Number(editingGroup.monthly_limit_hours),
        tasks: editingGroup.tasks,
      });
      closeGroupModal();
      fetchGroups();
    } catch {
      setGroupError('Error al actualizar el grupo.');
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!window.confirm('¿Está seguro que desea eliminar el grupo?')) return;
    setGroupError(null);
    try {
      await groupService.deleteGroup(groupId);
      fetchGroups();
    } catch {
      setGroupError('Error al eliminar el grupo.');
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
                <input
                  type="text"
                  placeholder="Buscar Cliente"
                  value={clientFilter}
                  onChange={handleClientFilterChange}
                  className="p-2 border rounded text-black"
                />
                <button onClick={() => { setIsLoading(true); fetchTasks().finally(() => setIsLoading(false)); }} className="flex items-center bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition" title="Actualizar lista de asuntos">
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
                    <th className="border-b border-black p-2 text-left">Cliente</th>
                    <th className="border-b border-black p-2 text-left">Título</th>
                    <th className="border-b border-black p-2 text-left">Fecha de Asignación</th>
                    <th className="border-b border-black p-2 text-left">Asesoría Permanente</th>
                    <th className="border-b border-black p-2 text-left">Área</th>
                    <th className="border-b border-black p-2 text-left">Facturación</th>
                    <th className="border-b border-black p-2 text-left">Nota</th>
                    <th className="border-b border-black p-2 text-left">Facturado</th>
                    <th className="p-2 text-left">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTasks.map(task => (
                    <tr key={task.id} className="hover:bg-gray-50">
                      {editingTaskId === task.id ? (
                        <>
                          {/* Inline Editing Fields */}
                          <td className="border-b border-black p-1 text-sm">{task.client_name || task.client || 'N/A'}</td>
                          <td className="border-b border-black p-1"><input type="text" name="title" value={editingTask.title || ''} onChange={handleEditingTaskChange} className="w-full p-1 border rounded text-black text-sm" /></td>
                          <td className="border-b border-black p-1 text-sm">{formatDate(task.assignment_date)}</td>
                          <td className="border-b border-black p-1 text-sm">{task.permanent ? "Si" : "No"}</td>
                          <td className="border-b border-black p-1">
                            <select name="area" value={editingTask.area || ''} onChange={handleEditingTaskChange} className="w-full p-1 border rounded text-black text-sm">
                              {AREA_OPTIONS.map(area => (<option key={area} value={area}>{area}</option>))}
                            </select>
                          </td>
                          <td className="border-b border-black p-1">
                            <select name="billing_type" value={editingTask.billing_type || 'hourly'} onChange={handleEditingTaskChange} className="w-full p-1 border rounded text-black text-sm">
                              <option value="percentage">Porcentaje</option>
                              <option value="mensual">Mensual</option>
                              <option value="hourly">Por hora</option>
                            </select>
                            {editingTask.billing_type === 'percentage' && (
                              <input type="number" name="total_value" placeholder="Valor Total" value={editingTask.total_value ?? ''} onChange={handleEditingTaskChange} className="w-full p-1 border rounded text-black mt-1 text-sm" step="0.01" />
                            )}
                          </td>
                          <td className="border-b border-black p-1">
                            <textarea name="note" placeholder="Nota" value={editingTask.note || ''} onChange={handleEditingTaskChange} className="w-full p-1 border rounded text-black text-sm" rows={1} />
                          </td>
                          <td className="border-b border-black p-1">
                            <select
                              name="facturado"
                              value={editingTask.facturado || 'no'}
                              onChange={handleEditingTaskChange}
                              className="w-full p-1 border rounded text-black text-sm"
                            >
                              {FACTURADO_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
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
                          <td className="border-b border-black p-2 text-sm">{task.client_name || task.client || 'N/A'}</td>
                          <td className="border-b border-black p-2 text-sm">{task.title}</td>
                          <td className="border-b border-black p-2 text-sm">{formatDate(task.assignment_date)}</td>
                          <td className="border-b border-black p-2 text-sm">{task.permanent ? "Si" : "No"}</td>
                          <td className="border-b border-black p-2 text-sm">{task.area || 'N/A'}</td>
                          <td className="border-b border-black p-2 text-sm">{task.billing_type === 'hourly' ? `Por Hora` : `Porcentaje (${task.total_value ? task.total_value.toLocaleString('en-US', { maximumFractionDigits: 0 }) : 'N/A'})`}</td>
                          <td className="border-b border-black p-2 text-sm">{task.note || '-'}</td>
                          <td className="border-b border-black p-2 text-sm">
                            {task.facturado ?
                              (task.facturado === 'si' ? 'Si' : task.facturado === 'parcialmente' ? 'Parcialmente' : 'No')
                              : 'No'}
                          </td>
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

          {/* --- GESTIÓN DE GRUPOS --- */}
          <div className="p-6 text-black shadow-lg rounded-lg bg-white mt-10">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">Gestión de Grupos</h2>
              <button onClick={() => openGroupModal(false)} className="flex items-center bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
                <FontAwesomeIcon icon={faPlus} className="mr-2" /> Nuevo Grupo
              </button>
            </div>
            {groupError && (<div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4"><p>{groupError}</p></div>)}
            {isGroupLoading ? (
              <div className="flex items-center justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div></div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border border-black rounded-lg overflow-hidden shadow-md">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="border-b border-black p-2 text-left">Nombre</th>
                      <th className="border-b border-black p-2 text-left">Cliente</th>
                      <th className="border-b border-black p-2 text-left">Límite Mensual (horas)</th>
                      <th className="border-b border-black p-2 text-left">Asuntos</th>
                      <th className="p-2 text-left">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((group, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border-b border-black p-2 text-sm">{group.group_name}</td>
                        <td className="border-b border-black p-2 text-sm">{group.client_name || '-'}</td>
                        <td className="border-b border-black p-2 text-sm">{group.monthly_limit_hours ?? '-'}</td>
                        <td className="border-b border-black p-2 text-sm">
                          <ul className="list-disc list-inside">
                            {group.tasks.map((task, taskIdx) => (
                              <li key={taskIdx} className="text-xs">{task}</li>
                            ))}
                          </ul>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            <button onClick={() => openGroupModal(true, group)} className="text-blue-600 hover:text-blue-800" title="Editar"><FontAwesomeIcon icon={faEdit} /></button>
                            <button onClick={() => handleDeleteGroup(group.id!)} className="text-red-600 hover:text-red-800" title="Eliminar"><FontAwesomeIcon icon={faTrash} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <ReportDownload clients={clients} />

          {/* Task Creation Modal */}
          {taskModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4 text-black">Crear Nuevo Asunto</h3>
                {updateError && <p className="text-red-500 mb-4">{updateError}</p>}
                <input type="text" name="title" placeholder="Título *" value={newTask.title} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black" required />
                <select name="client_id" value={newTask.client_id} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black" required>
                  <option value="">Seleccionar Cliente *</option>
                  {clients.map((client: ClientData) => (<option key={client.id} value={client.id}>{client.name}</option>))}
                </select>
                <select name="status" value={newTask.status} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black" required>
                  {TASK_STATUSES.map(status => (<option key={status.value} value={status.value}>{status.value}</option>))}
                </select>
                <select name="area" value={newTask.area} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black">
                  {AREA_OPTIONS.map(area => (<option key={area} value={area}>{area}</option>))}
                </select>
                <select name="billing_type" value={newTask.billing_type} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black" required>
                  <option value="">Selecciona una opción</option>
                  <option value="percentage">Porcentaje</option>
                  <option value="mensual">Mensual</option>
                  <option value="hourly">Por hora</option>
                </select>
                {newTask.billing_type === 'percentage' && (
                  <input type="number" name="total_value" placeholder="Valor Total *" value={newTask.total_value ?? ''} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black" required={newTask.billing_type === 'percentage'} step="0.01" min="0.01" />
                )}
                <input type="date" name="due_date" placeholder="Fecha de Entrega" value={newTask.due_date} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-2 text-black" />
                <div className="flex items-center mb-2">
                  <input type="checkbox" id="permanent" name="permanent" checked={newTask.permanent} onChange={(e: ChangeEvent<HTMLInputElement>) => {
                    setNewTask({ ...newTask, permanent: e.target.checked });
                  }} className="mr-2" />
                  <label htmlFor="permanent" className="text-black">Asesoría Permanente</label>
                </div>
                {newTask.permanent && newTask.permanent === true && (
                  <input
                    type="number"
                    name="tarif"
                    placeholder="Tarifa *"
                    value={newTask.tarif ?? ''} 
                    onChange={handleNewTaskChange} 
                    className="w-full p-2 border rounded mb-2 text-black" 
                    required={newTask.permanent} 
                    step="0.01" 
                    min="0.01" 
                  />
                )}
                <textarea name="note" placeholder="Nota (opcional)" value={newTask.note} onChange={handleNewTaskChange} className="w-full p-2 border rounded mb-4 text-black" rows={3} />
                <div className="flex justify-end gap-2">
                  <button onClick={closeTaskModal} className="px-4 py-2 bg-gray-300 rounded text-black">Cancelar</button>
                  <button onClick={handleCreateTask} className="px-4 py-2 bg-blue-600 text-white rounded">Crear Asunto</button>
                </div>
              </div>
            </div>
          )}

          {/* Group Modal */}
          {groupModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
                <h3 className="text-lg font-semibold mb-4 text-black">{groupModal.isEdit ? 'Editar Grupo' : 'Crear Nuevo Grupo'}</h3>
                {groupError && <p className="text-red-500 mb-4">{groupError}</p>}
                <input type="text" name="group_name" placeholder="Nombre del Grupo *" value={groupModal.isEdit ? editingGroup.group_name : newGroup.group_name} onChange={handleGroupChange} className="w-full p-2 border rounded mb-2 text-black" required />
                <input type="number" name="monthly_limit_hours" placeholder="Límite Mensual de Horas *" value={groupModal.isEdit ? editingGroup.monthly_limit_hours : newGroup.monthly_limit_hours} onChange={handleGroupChange} className="w-full p-2 border rounded mb-2 text-black" required min="1" />
                {!groupModal.isEdit && (
                  <select name="client_id" value={groupModal.isEdit ? editingGroup.client_id : newGroup.client_id} onChange={handleGroupChange} className="w-full p-2 border rounded mb-2 text-black" required={!groupModal.isEdit} disabled={groupModal.isEdit}>
                    <option value="">Seleccionar Cliente *</option>
                    {clients.map((client: ClientData) => (<option key={client.id} value={client.id}>{client.name}</option>))}
                  </select>
                )}
                <select name="tasks" multiple value={groupModal.isEdit ? editingGroup.tasks.map(String) : newGroup.tasks.map(String)} onChange={handleGroupTasksChange} className="w-full p-2 border rounded mb-4 text-black h-32" required disabled={!((groupModal.isEdit ? editingGroup.client_id : newGroup.client_id) && !isLoadingGroupTasks)}>
                  <option value="" disabled>Seleccionar asuntos (seleccione un cliente primero)</option>
                  {groupFilteredTasks.map((task) => (
                    <option key={task.id} value={task.id}>{task.title}</option>
                  ))}
                </select>
                {isLoadingGroupTasks && (
                  <div className="mb-4 text-sm text-gray-500">
                    Cargando asuntos del cliente...
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button onClick={closeGroupModal} className="px-4 py-2 bg-gray-300 rounded text-black">Cancelar</button>
                  {groupModal.isEdit ? (
                    <button onClick={handleUpdateGroup} className="px-4 py-2 bg-blue-600 text-white rounded">Actualizar Grupo</button>
                  ) : (
                    <button onClick={handleCreateGroup} className="px-4 py-2 bg-blue-600 text-white rounded">Crear Grupo</button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
