import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import axios from 'axios';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ReportDownloadProps = {
  clients: { id: number; name: string }[];
};

const ReportDownload: React.FC<ReportDownloadProps> = ({ clients }) => {
  const user = useAuthStore((state) => state.user);

  if (user?.role === 'consultor') {
    return null;
  }
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedClientId, setSelectedClientId] = useState('');

  const getToken = () => {
    return document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1] || '';
  };

  const downloadReport = async (endpoint: string, data: object) => {
    try {
      const token = getToken();
      const response = await axios.post(`${API_URL}${endpoint}`, data, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob', // Important for downloading files
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'report.xlsx'); // Excel file extension
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading report:', error);
    }
  };

  const handleDownloadGeneralReport = () => {
    const formattedStartDate = startDate.toISOString(); // Full ISO string if needed
    const formattedEndDate = endDate.toISOString(); // Full ISO string if needed
    downloadReport('/reports/download_report', { start_date: formattedStartDate, end_date: formattedEndDate });
  };
  
  const handleDownloadClientReport = () => {
    if (!selectedClientId) {
      alert('Please select a client');
      return;
    }
    const formattedStartDate = startDate.toISOString(); // Full ISO string if needed
    const formattedEndDate = endDate.toISOString(); // Full ISO string if needed
    downloadReport('/reports/download_client_report', { client_id: parseInt(selectedClientId), start_date: formattedStartDate, end_date: formattedEndDate });
  };

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg mt-6">
      <h2 className="text-lg font-semibold mb-3">Descargar Reportes</h2>
      <div className="mb-4">
        <div className="flex space-x-4">
          <DatePicker
            selected={startDate}
            onChange={(date: Date | null) => date && setStartDate(date)}
            selectsStart
            startDate={startDate}
            endDate={endDate}
            className="border p-2 rounded"
          />
          <DatePicker
            selected={endDate}
            onChange={(date: Date | null) => date && setEndDate(date)}
            selectsEnd
            startDate={startDate}
            endDate={endDate}
            minDate={startDate}
            className="border p-2 rounded"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 mb-4">
        <select
          value={selectedClientId}
          onChange={(e) => setSelectedClientId(e.target.value)}
          className="border p-2 text-black rounded"
        >
          <option value="">Select Client</option>
          {clients.map((client) => (
            <option key={client.id} value={client.id}>
              {client.name}
            </option>
          ))}
        </select>
      </div>
      <div className="flex space-x-4">
        <button
          onClick={handleDownloadGeneralReport}
          className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Descargar Reporte General
        </button>
        <button
          onClick={handleDownloadClientReport}
          className="bg-green-800 text-white px-4 py-2 rounded hover:bg-green-700 transition"
        >
          Descargar Reporte De Cliente
        </button>
      </div>
    </div>
  );
};

export default ReportDownload;
