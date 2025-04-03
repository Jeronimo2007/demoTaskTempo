"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";
import { addDays, subYears } from "date-fns";
import ContractsTable from "@/components/contracts/ContractsTable";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";

// Constantes para el manejo de tokens
const TOKEN_KEY = "token";
const TOKEN_STORAGE_KEY = "ssl_auth_token";


type ReportData = {
  Cliente: string;
  "Total Horas": number;
};

type TaskData = {
  id: string;
  title: string;
  status: string;
  client: string;
  area: string; // Added area property
};

type ClientSummaryData = {
  client: string;
  monthly_hours: number;
  current_month_hours: number;
  cost_current_month: number;
};


const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface Contract {
  id: number;
  client_id: number;
  description: string | null;
  total_value: number;
  start_date: string;
  end_date: string | null;
  active: boolean;
  total_pagado: number;
  porcentaje_pagado: number;
  created_at: string;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [clientSummary, setClientSummary] = useState<ClientSummaryData[]>([]);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [clientNames, setClientNames] = useState<{ id: number; name: string }[]>([]);
  const [startDate, setStartDate] = useState(subYears(new Date(), 1));
  const [endDate, setEndDate] = useState(addDays(new Date(), 1));
  const currentMonth = new Date().toLocaleString('es-ES', { month: 'long' });
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [uniqueClients, setUniqueClients] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Add search states
  const [permanentSearch, setPermanentSearch] = useState("");
  const [contractsSearch, setContractsSearch] = useState("");
  const [tasksSearch, setTasksSearch] = useState("");

  // Add pagination states
  const [currentPermanentPage, setCurrentPermanentPage] = useState(1);
  const [currentContractsPage, setCurrentContractsPage] = useState(1);
  const [currentTasksPage, setCurrentTasksPage] = useState(1);
  const itemsPerPage = 5;

  // Función mejorada para obtener el token, priorizando localStorage y luego cookies
  const getToken = useCallback(() => {
    // Primero intenta obtener el token de localStorage (más persistente)
    const localToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (localToken) return localToken;

    // Si no está en localStorage, búscalo en las cookies
    const cookieToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${TOKEN_KEY}=`))
      ?.split("=")[1];

    // Si se encontró en cookies, guárdalo también en localStorage para futuras recargas
    if (cookieToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, cookieToken);
    }

    return cookieToken || "";
  }, []);

  // Función para verificar si el token es válido
  const verifyToken = useCallback(async () => {
    const token = getToken();
    if (!token) {
      router.push("/");
      return false;
    }

    try {
      // Intenta hacer una petición simple para verificar si el token es válido
      await axios.get(`${API_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return true;
    } catch (error) {
      console.error("Error al verificar el token:", error);
      // Si el token no es válido, elimínalo y redirige al login
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      document.cookie = `${TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      router.push("/");
      return false;
    }
  }, [getToken, router]);

  const fetchReportData = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        console.error("No se encontró el token de autenticación.");
        return;
      }

      const formattedStartDate = format(startDate, "yyyy-MM-dd");
      const formattedEndDate = format(endDate, "yyyy-MM-dd");

      const response = await axios.post(
        `${API_URL}/reports/hours_by_client/`,
        {
          start_date: formattedStartDate,
          end_date: formattedEndDate,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const formattedData = response.data.map((item: ReportData) => ({
        Cliente: item.Cliente,
        Horas: item["Total Horas"],
      }));

      setReportData(formattedData);
    } catch (error) {
      console.error("Error al obtener los datos del reporte:", error);
    }
  }, [getToken, startDate, endDate]);


  const fetchTasks = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        console.error("No se encontró el token de autenticación.");
        return;
      }

      const response = await axios.get(`${API_URL}/tasks/get_task`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const formattedTasks = (response.data as TaskData[]).map((task) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        client: task.client,
        area: task.area || "N/A", // Include area with fallback to "N/A" if not available
      }));

      setTasks(formattedTasks);

      // Extract unique client names for the filter dropdown
      const clients = [...new Set(formattedTasks.map(task => task.client))].filter(Boolean);
      setUniqueClients(clients);
    } catch (error) {
      console.error("Error al obtener las tareas:", error);
    }
  }, [getToken]);

  const fetchClientSummary = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        console.error("No se encontró el token de autenticación.");
        return;
      }

      const response = await axios.get(`${API_URL}/clients/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setClientSummary(response.data);
    } catch (error) {
      console.error("Error al obtener el resumen de clientes:", error);
    }
  }, [getToken]);

  // Function to determine the background color based on task status
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case "en proceso":
        return "bg-yellow-200"; // Amarillo
      case "finalizado":
        return "bg-green-200"; // Verde
      case "vencido":
        return "bg-red-200"; // Rojo
      case "cancelado":
        return "bg-gray-200"; // Gris
      case "gestionar al cliente":
        return "bg-purple-200"; // Morado
      case "gestionar al tercero":
        return "bg-pink-200"; // Rosa
      default:
        return "";
    }
  };

  // Function to format currency in COP
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Filter tasks based on selected client
  const filteredTasks = selectedClient === "all"
    ? tasks
    : tasks.filter(task => task.client === selectedClient);

  // Add search functionality
  const filteredClientSummary = clientSummary.filter(client => {
    const searchLower = permanentSearch.toLowerCase();
    return (
      client.client.toLowerCase().includes(searchLower) ||
      client.current_month_hours.toString().includes(searchLower) ||
      client.monthly_hours.toString().includes(searchLower) ||
      formatCurrency(client.cost_current_month).toLowerCase().includes(searchLower)
    );
  });

  const filteredContracts = contracts.filter(contract => {
    const searchLower = contractsSearch.toLowerCase();
    const clientName = clientNames.find(c => c.id === contract.client_id)?.name || "";
    return (
      clientName.toLowerCase().includes(searchLower) ||
      contract.description?.toLowerCase().includes(searchLower) ||
      formatCurrency(contract.total_value).toLowerCase().includes(searchLower) ||
      contract.start_date.includes(searchLower) ||
      (contract.end_date && contract.end_date.includes(searchLower))
    );
  });

  const searchedTasks = filteredTasks.filter(task => {
    const searchLower = tasksSearch.toLowerCase();
    return (
      task.title.toLowerCase().includes(searchLower) ||
      task.status.toLowerCase().includes(searchLower) ||
      task.client.toLowerCase().includes(searchLower) ||
      task.area.toLowerCase().includes(searchLower)
    );
  });

  // Calculate pagination for each table
  const totalPermanentPages = Math.ceil(filteredClientSummary.length / itemsPerPage);
  const totalContractsPages = Math.ceil(filteredContracts.length / itemsPerPage);
  const totalTasksPages = Math.ceil(searchedTasks.length / itemsPerPage);

  const paginatedClientSummary = filteredClientSummary.slice(
    (currentPermanentPage - 1) * itemsPerPage,
    currentPermanentPage * itemsPerPage
  );

  const paginatedContracts = filteredContracts.slice(
    (currentContractsPage - 1) * itemsPerPage,
    currentContractsPage * itemsPerPage
  );

  const paginatedTasks = searchedTasks.slice(
    (currentTasksPage - 1) * itemsPerPage,
    currentTasksPage * itemsPerPage
  );

  // Reset pagination when filters or search changes
  useEffect(() => {
    setCurrentTasksPage(1);
  }, [selectedClient, tasksSearch]);

  useEffect(() => {
    setCurrentPermanentPage(1);
  }, [permanentSearch]);

  useEffect(() => {
    setCurrentContractsPage(1);
  }, [contractsSearch]);

  useEffect(() => {
    const initializePage = async () => {
      setIsLoading(true);

      // Si no hay usuario en el store, intentamos verificar el token
      if (!user) {
        const isValid = await verifyToken();
        if (!isValid) return; // Si el token no es válido, verifyToken ya redirige al login
      } else if (!["socio", "senior", "consultor"].includes(user.role)) {
        router.push("/");
        return;
      }

      await Promise.all([
        fetchReportData(),
        fetchTasks(),
        fetchClientSummary()
      ]);

      setIsLoading(false);
    };

    initializePage();
  }, [
    user,
    router,
    fetchReportData,
    fetchTasks,
    fetchClientSummary,
    verifyToken,
    contracts
  ]);

    useEffect(() => {
      const fetchContracts = async () => {
        try {
          const token = getToken();
          if (!token) {
            console.error("No se encontró el token de autenticación.");
            return;
          }
  
          const contractsResponse = await axios.get(`${API_URL}/contracts/contracts`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setContracts(contractsResponse.data);
  
          const clientNamesResponse = await axios.get(`${API_URL}/clients/get_clients_name`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          setClientNames(clientNamesResponse.data);
        } catch (error) {
          console.error("Error al obtener los contratos:", error);
        }
      };
  
      fetchContracts();
    }, [getToken]);

  if (isLoading) return <p>Cargando...</p>;


  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4 text-black">Dashboard</h1>

      {/* Selector de Fecha */}
      <div className="flex gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-black">Fecha Inicio:</label>
          <DatePicker
            selected={startDate}
            onChange={(date) => date && setStartDate(date)}
            className="mt-1 p-2 border rounded w-full text-black"
            dateFormat="yyyy-MM-dd"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-black">Fecha Fin:</label>
          <DatePicker
            selected={endDate}
            onChange={(date) => date && setEndDate(date)}
            className="mt-1 p-2 border rounded w-full text-black"
            dateFormat="yyyy-MM-dd"
          />
        </div>
      </div>

      {/* Single chart */}
      <div className="bg-white p-4 rounded-lg shadow-lg text-black mb-6">
        <h2 className="text-lg font-semibold mb-3">Horas Trabajadas por Cliente</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={reportData} layout="vertical">
            <XAxis type="number" />
            <YAxis dataKey="Cliente" type="category" width={150} />
            <Tooltip />
            <Bar dataKey="Horas" fill="#4F46E5" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Asesoría Permanente Section */}
      <div className="bg-white p-4 rounded-lg shadow-lg text-black mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Asesoría Permanente - {currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)}</h2>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Buscar por cliente, horas o costo..."
              value={permanentSearch}
              onChange={(e) => setPermanentSearch(e.target.value)}
              className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <FontAwesomeIcon icon={faSearch} />
            </div>
          </div>
        </div>
        <table className="w-full border border-black rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-[#4901ce] text-white">
              <th className="border border-black p-2 text-left">Cliente</th>
              <th className="border border-black p-2 text-left">Horas Mensuales</th>
              <th className="border border-black p-2 text-left">Costo Total del Mes</th>
            </tr>
          </thead>
          <tbody>
            {paginatedClientSummary.length > 0 ? (
              paginatedClientSummary.map((client, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-black p-2">{client.client}</td>
                  <td className="border border-black p-2">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-4 mr-2">
                        <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${Math.min(100, (client.current_month_hours / client.monthly_hours) * 100)}%` }}></div>
                      </div>
                      <span className="whitespace-nowrap">{client.current_month_hours} / {client.monthly_hours} hrs</span>
                    </div>
                  </td>
                  <td className="border border-black p-2">{formatCurrency(client.cost_current_month)}</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={4} className="border p-2 text-center text-gray-500">No hay datos de asesoría permanente.</td></tr>
            )}
          </tbody>
        </table>
        {/* Pagination for Asesoría Permanente */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setCurrentPermanentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPermanentPage === 1}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-gray-700">
            Página {currentPermanentPage} de {totalPermanentPages}
          </span>
          <button
            onClick={() => setCurrentPermanentPage(prev => Math.min(prev + 1, totalPermanentPages))}
            disabled={currentPermanentPage === totalPermanentPages}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
      <div className="bg-white p-4 rounded-lg shadow-lg text-black mb-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-semibold">Contratos</h3>
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Buscar por cliente, descripción o valor..."
              value={contractsSearch}
              onChange={(e) => setContractsSearch(e.target.value)}
              className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <FontAwesomeIcon icon={faSearch} />
            </div>
          </div>
        </div>
        <ContractsTable contracts={paginatedContracts} clientNames={clientNames} />
        {/* Pagination for Contracts */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setCurrentContractsPage(prev => Math.max(prev - 1, 1))}
            disabled={currentContractsPage === 1}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-gray-700">
            Página {currentContractsPage} de {totalContractsPages}
          </span>
          <button
            onClick={() => setCurrentContractsPage(prev => Math.min(prev + 1, totalContractsPages))}
            disabled={currentContractsPage === totalContractsPages}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-lg mt-6 text-black">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Tareas Actuales</h2>
          <div className="flex items-center gap-4">
            <div className="relative w-64">
              <input
                type="text"
                placeholder="Buscar por título, estado o área..."
                value={tasksSearch}
                onChange={(e) => setTasksSearch(e.target.value)}
                className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="absolute left-3 top-2.5 text-gray-400">
                <FontAwesomeIcon icon={faSearch} />
              </div>
            </div>
            <div className="flex items-center">
              <label htmlFor="client-filter" className="mr-2 text-sm font-medium">
                Filtrar por cliente:
              </label>
              <select
                id="client-filter"
                value={selectedClient}
                onChange={(e) => setSelectedClient(e.target.value)}
                className="p-2 border rounded text-sm"
              >
                <option value="all">Todos los clientes</option>
                {uniqueClients.map((client) => (
                  <option key={client} value={client}>
                    {client}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <table className="w-full border border-black rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-[#4901ce] text-white">
              <th className="border border-black p-2 text-left">Título</th>
              <th className="border border-black p-2 text-left">Estado</th>
              <th className="border border-black p-2 text-left">Cliente</th>
              <th className="border border-black p-2 text-left">Área</th>
            </tr>
          </thead>
          <tbody>
            {paginatedTasks.length > 0 ? (
              paginatedTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="border border-black p-2">{task.title}</td>
                  <td className={`border border-black p-2 ${getStatusColor(task.status)}`}>
                    {task.status}
                  </td>
                  <td className="border border-black p-2">{task.client}</td>
                  <td className="border border-black p-2">{task.area}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="border p-2 text-center text-gray-500">
                  {selectedClient === "all"
                    ? "No hay tareas registradas."
                    : `No hay tareas registradas para el cliente "${selectedClient}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {/* Pagination for Tasks */}
        <div className="flex justify-between items-center mt-4">
          <button
            onClick={() => setCurrentTasksPage(prev => Math.max(prev - 1, 1))}
            disabled={currentTasksPage === 1}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Anterior
          </button>
          <span className="text-gray-700">
            Página {currentTasksPage} de {totalTasksPages}
          </span>
          <button
            onClick={() => setCurrentTasksPage(prev => Math.min(prev + 1, totalTasksPages))}
            disabled={currentTasksPage === totalTasksPages}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}
