"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/useAuthStore";
import { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

// Tipo de datos del reporte y tareas
type ReportData = {
  Cliente: string;
  "Total Horas": number;
};

type TaskData = {
  id: string;
  title: string;
  status: string;
  client: string;
  assigned_to: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Dashboard() {
  const { user } = useAuthStore();
  const router = useRouter();
  const [reportData, setReportData] = useState<ReportData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());

  useEffect(() => {
    if (!user || !["socio", "senior", "consultor"].includes(user.role)) {
      router.push("/"); 
    } else {
      fetchReportData();
      fetchTasks();
    }
  }, [user, router, startDate, endDate]);

  const getToken = () => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1] || "";
  };

  const fetchReportData = async () => {
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
  };

  const fetchTasks = async () => {
    try {
      const token = getToken();
      if (!token) {
        console.error("No se encontró el token de autenticación.");
        return;
      }

      const response = await axios.get(`${API_URL}/tasks/get_task`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const formattedTasks = response.data.map((task: any) => ({
        id: task.id,
        title: task.title,
        status: task.status,
        client: task.client, 
        assigned_to: task.assigned_to, 
      }));

      setTasks(formattedTasks);
    } catch (error) {
      console.error("Error al obtener las tareas:", error);
    }
  };

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

      {/* Gráfico de Barras */}
      <div className="bg-white p-4 rounded-lg shadow-lg text-black">
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

      {/* Lista de Tareas */}
      <div className="bg-white p-4 rounded-lg shadow-lg mt-6 text-black">
        <h2 className="text-lg font-semibold mb-3">Tareas Actuales</h2>
        <table className="w-full  border border-black rounded-lg overflow-hidden ">
          <thead>
            <tr className="bg-blue-700 text-white">
              <th className=" border border-black p-2 text-left">Título</th>
              <th className=" border border-black p-2 text-left">Estado</th>
              <th className=" border border-black p-2 text-left">Cliente</th>
              <th className=" border border-black p-2 text-left">Asignado a</th>
            </tr>
          </thead>
          <tbody>
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50 ">
                  <td className=" border border-black p-2 ">{task.title}</td>
                  <td className=" border border-black p-2">{task.status}</td>
                  <td className=" border border-black p-2">{task.client}</td>
                  <td className=" border border-black p-2">{task.assigned_to}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="border p-2 text-center text-gray-500">
                  No hay tareas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
