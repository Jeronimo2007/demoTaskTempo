"use client";
import { Table, Collapse, Select, DatePicker as AntDatePicker } from "antd";

import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import "react-datepicker/dist/react-datepicker.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch } from "@fortawesome/free-solid-svg-icons";
import ProtectedRoute from "@/components/ProtectedRoute";
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';

const { Panel } = Collapse;

// Constantes para el manejo de tokens
const TOKEN_KEY = "token";
const TOKEN_STORAGE_KEY = "ssl_auth_token";


type ReportData = {
  Cliente: string;
  "Total Horas": number;
};

type ClientSummaryData = {
  client: string;
  monthly_hours: number;
  current_month_hours: number;
  cost_current_month: number;
};

//
// --- Rentability Panel Types and Components (moved from rentability_panel/page.tsx) ---

interface RentabilityData {
  total_salarios: number;
  total_horas_trabajadas: number;
  total_ingresos: number;
  rentabilidad_oficina: number;
}

interface LawyerCostVsHoursData {
  username: string;
  salary: number;
  worked_hours: number;
  cost_per_hour_firma: number;
  cost_per_hour_client: number;
  ingresos_generados: number;
  utilidad_por_hora: number;
}

interface LawyerWorkloadData {
  username: string;
  worked_hours_this_week: number;
  weekly_hours_expected: number;
  worked_hours_this_month: number;
  monthly_hours_expected: number;
}

interface ClientContribution {
  user_id: number;
  username: string;
  worked_hours: number;
  porcentaje_contribucion: number;
}

interface ClientContributionData {
  client_id: number;
  client_name: string;
  total_hours: number;
  contributions: ClientContribution[];
}

const OfficeRentabilitySummary = () => {
  const [rentabilityData, setRentabilityData] = useState<RentabilityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRentabilityData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/rentability/office/summary`);
        if (!response.ok) {
          throw new Error("HTTP error! Status: " + response.status);
        }
        const data: RentabilityData = await response.json();
        setRentabilityData(data);
      } catch (error) {
        console.error("Could not fetch rentability data:", error);
        setRentabilityData({
          total_salarios: 0,
          total_horas_trabajadas: 0,
          total_ingresos: 0,
          rentabilidad_oficina: 0,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRentabilityData();
  }, []);

  const columns = [
    {
      title: 'Total Salarios',
      dataIndex: 'total_salarios',
      key: 'total_salarios',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Total Horas Trabajadas',
      dataIndex: 'total_horas_trabajadas',
      key: 'total_horas_trabajadas',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Total Ingresos',
      dataIndex: 'total_ingresos',
      key: 'total_ingresos',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Rentabilidad Oficina',
      dataIndex: 'rentabilidad_oficina',
      key: 'rentabilidad_oficina',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value / 100),
    },
  ];

  const data = rentabilityData ? [rentabilityData] : [];

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg text-black mb-6">
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record, index = 0) => index.toString()}
        loading={loading}
        pagination={false}
      />
    </div>
  );
};

const LawyersCostVsHours = () => {
  const [data, setData] = useState<LawyerCostVsHoursData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/rentability/lawyers/cost-vs-hours`);
        if (!response.ok) {
          throw new Error("HTTP error! Status: " + response.status);
        }
        const data: LawyerCostVsHoursData[] = await response.json();
        setData(data);
      } catch (error) {
        console.error("Could not fetch lawyer cost vs hours data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const columns = [
    {
      title: 'Abogado',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Salario',
      dataIndex: 'salary',
      key: 'salary',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Horas Trabajadas',
      dataIndex: 'worked_hours',
      key: 'worked_hours',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Coste por Hora (Firma)',
      dataIndex: 'cost_per_hour_firma',
      key: 'cost_per_hour_firma',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Coste por Hora (Cliente)',
      dataIndex: 'cost_per_hour_client',
      key: 'cost_per_hour_client',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Ingresos Generados',
      dataIndex: 'ingresos_generados',
      key: 'ingresos_generados',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Utilidad por Hora',
      dataIndex: 'utilidad_por_hora',
      key: 'utilidad_por_hora',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg text-black mb-6">
      <Table
        columns={columns}
        dataSource={data}
        rowKey={(record, index = 0) => index.toString()}
        loading={loading}
        pagination={false}
      />
    </div>
  );
};

import { Tabs } from "antd";

const LawyersWeeklyWorkload = () => {
  const [data, setData] = useState<LawyerWorkloadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"week" | "month">("week");

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/rentability/lawyers/weekly-workload`);
        if (!response.ok) {
          throw new Error("HTTP error! Status: " + response.status);
        }
        const data: LawyerWorkloadData[] = await response.json();
        setData(data);
      } catch (error) {
        console.error("Could not fetch lawyer workload data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const weekColumns = [
    {
      title: 'Abogado',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Horas Trabajadas Esta Semana',
      dataIndex: 'worked_hours_this_week',
      key: 'worked_hours_this_week',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Horas Esperadas Esta Semana',
      dataIndex: 'weekly_hours_expected',
      key: 'weekly_hours_expected',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
  ];

  const monthColumns = [
    {
      title: 'Abogado',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: 'Horas Trabajadas Este Mes',
      dataIndex: 'worked_hours_this_month',
      key: 'worked_hours_this_month',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Horas Esperadas Este Mes',
      dataIndex: 'monthly_hours_expected',
      key: 'monthly_hours_expected',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg text-black mb-6">
      <Tabs
        activeKey={view}
        onChange={key => setView(key as "week" | "month")}
        items={[
          {
            key: "week",
            label: "Semana",
            children: (
              <Table
                columns={weekColumns}
                dataSource={data}
                rowKey={(record, index = 0) => index.toString()}
                loading={loading}
                pagination={false}
              />
            ),
          },
          {
            key: "month",
            label: "Mes",
            children: (
              <Table
                columns={monthColumns}
                dataSource={data}
                rowKey={(record, index = 0) => index.toString()}
                loading={loading}
                pagination={false}
              />
            ),
          },
        ]}
      />
    </div>
  );
};

const ClientsContributions = () => {
  const [data, setData] = useState<ClientContributionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${API_URL}/rentability/clients/contributions`);
        if (!response.ok) {
          throw new Error("HTTP error! Status: " + response.status);
        }
        const data: ClientContributionData[] = await response.json();
        setData(data);
      } catch (error) {
        console.error("Could not fetch clients contributions data:", error);
        setData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter data based on search term
  const filteredData = data.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.client_name.toLowerCase().includes(searchLower) ||
      client.contributions.some(contribution =>
        contribution.username.toLowerCase().includes(searchLower)
      )
    );
  });

  // Calculate pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const paginatedData = filteredData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const columns = [
    {
      title: 'Cliente',
      dataIndex: 'client_name',
      key: 'client_name',
    },
    {
      title: 'Total Horas',
      dataIndex: 'total_hours',
      key: 'total_hours',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Contribuciones',
      key: 'contributions',
      render: (record: ClientContributionData) => (
        <Table
          columns={[
            {
              title: 'Abogado',
              dataIndex: 'username',
              key: 'username',
            },
            {
              title: 'Horas Trabajadas',
              dataIndex: 'worked_hours',
              key: 'worked_hours',
              render: (value: number) => new Intl.NumberFormat('es-CO', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(value),
            },
            {
              title: 'Porcentaje de Contribución',
              dataIndex: 'porcentaje_contribucion',
              key: 'porcentaje_contribucion',
              render: (value: number) => new Intl.NumberFormat('es-CO', {
                style: 'percent',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
              }).format(value / 100),
            },
          ]}
          dataSource={record.contributions}
          rowKey={(record, index = 0) => index.toString()}
          pagination={false}
        />
      ),
    },
  ];

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg text-black mb-6">
      <div className="flex justify-between items-center mb-4">
        <div className="relative w-64">
          <input
            type="text"
            placeholder="Buscar por cliente o abogado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <FontAwesomeIcon icon={faSearch} />
          </div>
        </div>
      </div>
      <Table
        columns={columns}
        dataSource={paginatedData}
        rowKey={(record, index = 0) => index.toString()}
        loading={loading}
        pagination={false}
      />
      {/* Pagination Controls */}
      <div className="flex justify-between items-center mt-4">
        <button
          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
          disabled={currentPage === 1}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
        >
          Anterior
        </button>
        <span className="text-gray-700">
          Página {currentPage} de {totalPages}
        </span>
        <button
          onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
        >
          Siguiente
        </button>
      </div>
    </div>
  );
};
// --- End Rentability Panel Section ---

interface Task {
  id: number;
  title: string;
  status: string;
  due_date: string;
  client: string;
  area: string;
  billing_type: string;
  note: string | null;
  total_value: number | null;
  total_billed: number;
  permanent: boolean;
}

interface TaskTimeEntry {
  abogado: string;
  cargo: string;
  cliente: string;
  trabajo: string;
  fecha_trabajo: string;
  tiempo_trabajado: string;
  tarifa_horaria: number;
  moneda: string;
  total: number;
  facturado: string;
}

interface Client {
  id: number;
  name: string;
  color: string | null;
  total_time: number;
  monthly_limit_hours: number;
  current_month_hours: number;
  permanent: boolean;
  porcentaje_facturado: number | null;
  total_facturado: number | null;
  active: boolean;
  city: string;
  phone: string;
  nit: string;
  email: string;
  address: string;
}

const TaskTimeEntries = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [timeEntries, setTimeEntries] = useState<TaskTimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<number | null>(null);
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().subtract(1, 'year'));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().add(1, 'day'));
  const [facturado, setFacturado] = useState<"si" | "no" | "parcialmente" | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const getToken = useCallback(() => {
    const localToken = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (localToken) return localToken;
    const cookieToken = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${TOKEN_KEY}=`))
      ?.split("=")[1];
    if (cookieToken) {
      localStorage.setItem(TOKEN_STORAGE_KEY, cookieToken);
    }
    return cookieToken || "";
  }, []);

  // Fetch clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const token = getToken();
        const response = await axios.get(`${API_URL}/clients/get_clients_admin`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setClients(response.data);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };
    fetchClients();
  }, [getToken]);

  // Fetch tasks when client is selected
  useEffect(() => {
    const fetchTasks = async () => {
      if (!selectedClient) {
        setTasks([]);
        return;
      }
      try {
        const token = getToken();
        const response = await axios.get(`${API_URL}/tasks/get_tasks_by_client`, {
          headers: { Authorization: `Bearer ${token}` },
          params: { client_id: selectedClient }
        });
        setTasks(response.data);
      } catch (error) {
        console.error("Error fetching tasks:", error);
        setTasks([]);
      }
    };
    fetchTasks();
  }, [selectedClient, getToken]);

  // Reset task selection when client changes
  useEffect(() => {
    setSelectedTask(null);
  }, [selectedClient]);

  const fetchTimeEntries = useCallback(async () => {
    if (!selectedTask) return;
    
    try {
      setLoading(true);
      const token = getToken();
      
      // Normalize facturado value to remove accents only if it's not null
      const normalizedFacturado = facturado !== null 
        ? facturado.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        : null; // Send null if 'Todos' is selected

      const response = await axios.post(
        `${API_URL}/reports/task_time_entries`,
        {
          task_id: selectedTask,
          start_date: startDate.format("YYYY-MM-DD"),
          end_date: endDate.format("YYYY-MM-DD"),
          facturado: normalizedFacturado // Use the normalized or null value
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setTimeEntries(response.data);
    } catch (error) {
      console.error("Error fetching time entries:", error);
      setTimeEntries([]);
    } finally {
      setLoading(false);
    }
  }, [selectedTask, startDate, endDate, facturado, getToken]);

  useEffect(() => {
    if (selectedTask) {
      fetchTimeEntries();
    } else {
      setTimeEntries([]);
    }
  }, [selectedTask, fetchTimeEntries]);

  const columns = [
    {
      title: 'Abogado',
      dataIndex: 'abogado',
      key: 'abogado',
    },
    {
      title: 'Cargo',
      dataIndex: 'cargo',
      key: 'cargo',
      render: (cargo: string) => cargo.charAt(0).toUpperCase() + cargo.slice(1),
    },
    {
      title: 'Cliente',
      dataIndex: 'cliente',
      key: 'cliente',
    },
    {
      title: 'Trabajo',
      dataIndex: 'trabajo',
      key: 'trabajo',
    },
    {
      title: 'Fecha',
      dataIndex: 'fecha_trabajo',
      key: 'fecha_trabajo',
    },
    {
      title: 'Tiempo',
      dataIndex: 'tiempo_trabajado',
      key: 'tiempo_trabajado',
      render: (value: string) => {
        const [hours, minutes] = value.split(':').map(Number);
        return `${new Intl.NumberFormat('es-CO', {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(hours)}:${minutes.toString().padStart(2, '0')}`;
      },
    },
    {
      title: 'Tarifa',
      dataIndex: 'tarifa_horaria',
      key: 'tarifa_horaria',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Total',
      dataIndex: 'total',
      key: 'total',
      render: (value: number) => new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      }).format(value),
    },
    {
      title: 'Facturado',
      dataIndex: 'facturado',
      key: 'facturado',
      render: (value: string) => value.charAt(0).toUpperCase() + value.slice(1),
    },
  ];

  // Sort time entries by date (most recent first)
  const sortedTimeEntries = [...timeEntries].sort((a, b) => {
    return new Date(b.fecha_trabajo).getTime() - new Date(a.fecha_trabajo).getTime();
  });

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg text-black mb-6">
      <h2 className="text-lg font-semibold mb-4">Registro de Tiempo por Asunto</h2>
      
      <div className="flex gap-4 mb-4">
        <div className="flex-1">
          <label className="block text-sm font-medium text-black mb-1">Cliente</label>
          <Select
            className="w-full"
            placeholder="Seleccione un cliente"
            value={selectedClient}
            onChange={setSelectedClient}
            options={clients.map(client => ({
              value: client.id,
              label: client.name
            }))}
          />
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-black mb-1">Asunto</label>
          <Select
            className="w-full"
            placeholder="Seleccione un Asunto"
            value={selectedTask}
            onChange={setSelectedTask}
            options={tasks.map(task => ({
              value: task.id,
              label: task.title
            }))}
            disabled={!selectedClient}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-black mb-1">Fecha Inicio</label>
          <AntDatePicker
            value={startDate}
            onChange={(date) => date && setStartDate(date)}
            className="w-full"
            format="YYYY-MM-DD"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-black mb-1">Fecha Fin</label>
          <AntDatePicker
            value={endDate}
            onChange={(date) => date && setEndDate(date)}
            className="w-full"
            format="YYYY-MM-DD"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-black mb-1">Facturado</label>
          <Select
            className="w-full"
            value={facturado}
            onChange={setFacturado}
            options={[
              { value: null, label: 'Todos' },
              { value: 'si', label: 'Sí' },
              { value: 'no', label: 'No' },
              { value: 'parcialmente', label: 'Parcialmente' }
            ]}
          />
        </div>
      </div>

      <Table
        columns={columns}
        dataSource={sortedTimeEntries}
        rowKey={(record) => `${record.abogado}-${record.fecha_trabajo}-${record.tiempo_trabajado}`}
        loading={loading}
        pagination={{
          current: currentPage,
          pageSize: pageSize,
          total: sortedTimeEntries.length,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false
        }}
      />
    </div>
  );
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Dashboard() {
  const { user, isAuthenticated, logout } = useAuth();
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [clientSummary, setClientSummary] = useState<ClientSummaryData[]>([]);
  const [startDate, setStartDate] = useState<Dayjs>(dayjs().subtract(1, 'year'));
  const [endDate, setEndDate] = useState<Dayjs>(dayjs().add(1, 'day'));
  const currentMonth = new Date().toLocaleString('es-ES', { month: 'long' });
  const [isLoading, setIsLoading] = useState(true);

  // Add search states
  const [permanentSearch, setPermanentSearch] = useState("");

  // Add pagination states
  const [currentPermanentPage, setCurrentPermanentPage] = useState(1);
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

  // Removed verifyToken function as ProtectedRoute handles authentication
  const fetchReportData = useCallback(async () => {
    try {
      const token = getToken();
      if (!token) {
        console.error("No se encontró el token de autenticación.");
        return;
      }

      const response = await axios.post(
        `${API_URL}/reports/hours_by_client/`,
        {
          start_date: startDate.format("YYYY-MM-DD"),
          end_date: endDate.format("YYYY-MM-DD"),
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

  // Function to format currency in COP
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Filter tasks based on selected client

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

  // Calculate pagination for each table
  const totalPermanentPages = Math.ceil(filteredClientSummary.length / itemsPerPage);
  

  const paginatedClientSummary = filteredClientSummary.slice(
    (currentPermanentPage - 1) * itemsPerPage,
    currentPermanentPage * itemsPerPage
  );


  // Reset pagination when filters or search changes

  useEffect(() => {
    setCurrentPermanentPage(1);
  }, [permanentSearch]);

  // Simplified initialization effect relying on ProtectedRoute
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        // ProtectedRoute ensures we are authenticated and authorized
        await Promise.all([
          fetchReportData(),
          fetchClientSummary(),
        ]);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Handle potential 401 if token becomes invalid
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
  }, [isAuthenticated, user, fetchReportData, fetchClientSummary, logout, router]); // Removed verifyToken, added isAuthenticated, user, logout

  // Loading state handled within ProtectedRoute wrapper

  const [chartPage, setChartPage] = useState(1);
  const chartPageSize = 5;

  // Calculate paginated data for the chart
  const paginatedReportData = reportData.slice(
    (chartPage - 1) * chartPageSize,
    chartPage * chartPageSize
  );

  // Conditionally render based on user role
  return (
    <ProtectedRoute allowedRoles={['senior', 'socio']}>
      {isLoading ? (
        <div className="flex justify-center items-center h-screen">
          <p>Cargando...</p>
        </div>
      ) : (
        <div className="p-6">
          <h1 className="text-4xl font-bold text-center mb-8 text-black border-b-2 border-blue-200 pb-4">Dashboard</h1>

          {/* Selector de Fecha */}
          <div className="flex gap-4 mb-4">
            <div>
              <label className="block text-sm font-bold text-black">Fecha Inicio:</label>
              <AntDatePicker
                value={startDate}
                onChange={(date) => date && setStartDate(date)}
                className="mt-1 p-2 border rounded w-full text-black"
                format="YYYY-MM-DD"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-black">Fecha Fin:</label>
              <AntDatePicker
                value={endDate}
                onChange={(date) => date && setEndDate(date)}
                className="mt-1 p-2 border rounded w-full text-black"
                format="YYYY-MM-DD"
              />
            </div>
          </div>

          {/* Single chart with pagination */}
          <div className="bg-white p-4 rounded-lg shadow-lg text-black mb-6">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-lg font-semibold">Horas Trabajadas por Cliente</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setChartPage(prev => Math.max(prev - 1, 1))}
                  disabled={chartPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
                >
                  Anterior
                </button>
                <span className="text-gray-700">
                  Página {chartPage} de {Math.ceil(reportData.length / chartPageSize)}
                </span>
                <button
                  onClick={() => setChartPage(prev => Math.min(prev + 1, Math.ceil(reportData.length / chartPageSize)))}
                  disabled={chartPage >= Math.ceil(reportData.length / chartPageSize)}
                  className="px-3 py-1 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
                >
                  Siguiente
                </button>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={paginatedReportData} layout="vertical">
                <XAxis type="number" />
                <YAxis dataKey="Cliente" type="category" width={150} />
                <Tooltip />
                <Bar dataKey="Horas" fill="#4F46E5" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Task Time Entries Table */}
          <TaskTimeEntries />

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
                          <span className="whitespace-nowrap">
                            {new Intl.NumberFormat('es-CO', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            }).format(client.current_month_hours)} / {new Intl.NumberFormat('es-CO', {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0
                            }).format(client.monthly_hours)} hrs
                          </span>
                        </div>
                      </td>
                      
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
          {user?.role === 'socio' && (
            <div className="p-6 mt-8 text-black bg-white rounded-lg shadow-lg">
              <h1 className="text-4xl font-bold text-center mb-8 text-black border-b-2 border-blue-200 pb-4">
                Panel de Rentabilidad
              </h1>
              <Collapse defaultActiveKey={['1']}>
                <Panel header="Resumen de Rentabilidad de SSL" key="1">
                  <OfficeRentabilitySummary />
                </Panel>
                <Panel header="Coste por Hora de Abogados mensualmente" key="2">
                  <LawyersCostVsHours />
                </Panel>
                <Panel header="Carga de Abogados por Semana / Mes" key="3">
                  <LawyersWeeklyWorkload />
                </Panel>
                <Panel header="Contribuciones de Clientes" key="4">
                  <ClientsContributions />
                </Panel>
              </Collapse>
            </div>
          )}
        </div>
      )}
    </ProtectedRoute>
  );
}
