"use client";

import { useRouter } from "next/navigation";
import { useAuthStore } from "../../store/useAuthStore";
import { useEffect, useState } from "react";
import axios from "axios";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

// Tipo de datos del reporte
type ReportData = {
    Cliente: string;
    "Total Horas": number;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function Dashboard() {
    const { user } = useAuthStore();
    const router = useRouter();
    const [reportData, setReportData] = useState<ReportData[]>([]);
    const [startDate, setStartDate] = useState(new Date());
    const [endDate, setEndDate] = useState(new Date());

    useEffect(() => {
        if (!user || !["socio", "senior", "consultor"].includes(user.role)) {
            router.push("/"); // Redirige si el usuario no tiene permiso
        } else {
            fetchReportData();
        }
    }, [user, router, startDate, endDate]);

    const fetchReportData = async () => {
        try {
          const token = document.cookie.replace(
            /(?:(?:^|.*;\s*)token\s*=\s*([^;]*).*$)|^.*$/,
            "$1"
          );
      
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
            {
              headers: { Authorization: `Bearer ${token}` }, // Asegurar que el token se envíe
            }
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
                        onChange={(date) => date && setStartDate(date)} // Solo asigna si date no es null
                        className="mt-1 p-2 border rounded w-full text-black"
                        dateFormat="yyyy-MM-dd"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-black">Fecha Fin:</label>
                    <DatePicker
                        selected={endDate}
                        onChange={(date) => date && setEndDate(date)} // Solo asigna si date no es null
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
        </div>
    );
}
