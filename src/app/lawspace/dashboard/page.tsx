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


type ReportData = {
  Cliente: string;
  "Total Horas": number;
};

type TaskData = {
  id: string;
  title: string;
  status: string;
  client: string;
};

type ClientSummaryData = {
  client: string;
  monthly_hours: number;
  current_month_hours: number;
  cost_current_month: number;
};


const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Dashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [clientSummary, setClientSummary] = useState<ClientSummaryData[]>([]);
  const [startDate, setStartDate] = useState(subYears(new Date(), 1));
  const [endDate, setEndDate] = useState(addDays(new Date(), 1));
  const currentMonth = new Date().toLocaleString('es-ES', { month: 'long' });
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [uniqueClients, setUniqueClients] = useState<string[]>([]);

  const getToken = useCallback(() => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1] || "";
  }, []);

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

  useEffect(() => {
    if (!user || !["socio", "senior", "consultor"].includes(user.role)) {
      router.push("/");
    } else {
      fetchReportData();
      fetchTasks();
      fetchClientSummary();
    }
  }, [user, router, fetchReportData, fetchTasks, fetchClientSummary]);

  if (!user) return <p>Cargando...</p>;


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
        <h2 className="text-lg font-semibold mb-3">Asesoría Permanente - {currentMonth.charAt(0).toUpperCase() + currentMonth.slice(1)}</h2>
        <table className="w-full border border-black rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-[#4901ce] text-white">
              <th className="border border-black p-2 text-left">Cliente</th>
              <th className="border border-black p-2 text-left">Horas Mensuales</th>
              <th className="border border-black p-2 text-left">Costo Total del Mes</th>
            </tr>
          </thead>
          <tbody>
            {clientSummary.length > 0 ? (
              clientSummary.map((client, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="border border-black p-2">{client.client}</td>
                  <td className="border border-black p-2">
                    <div className="flex items-center">
                      <div className="w-full bg-gray-200 rounded-full h-4 mr-2">
                        <div 
                          className="bg-blue-600 h-4 rounded-full" 
                          style={{ 
                            width: `${Math.min(100, (client.current_month_hours / client.monthly_hours) * 100)}%` 
                          }}
                        ></div>
                      </div>
                      <span className="whitespace-nowrap">
                        {client.current_month_hours} / {client.monthly_hours} hrs
                      </span>
                    </div>
                  </td>
                  <td className="border border-black p-2">{formatCurrency(client.cost_current_month)}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="border p-2 text-center text-gray-500">
                  No hay datos de asesoría permanente.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-lg mt-6 text-black">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold">Tareas Actuales</h2>
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
        <table className="w-full border border-black rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-[#4901ce] text-white">
              <th className="border border-black p-2 text-left">Título</th>
              <th className="border border-black p-2 text-left">Estado</th>
              <th className="border border-black p-2 text-left">Cliente</th>
            </tr>
          </thead>
          <tbody>
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="border border-black p-2">{task.title}</td>
                  <td className={`border border-black p-2 ${getStatusColor(task.status)}`}>
                    {task.status}
                  </td>
                  <td className="border border-black p-2">{task.client}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="border p-2 text-center text-gray-500">
                  {selectedClient === "all" 
                    ? "No hay tareas registradas." 
                    : `No hay tareas registradas para el cliente "${selectedClient}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
