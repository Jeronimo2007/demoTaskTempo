import React, { useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import axios from 'axios';
import taskService from '@/services/taskService';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type ReportDownloadProps = {
  clients: { id: number; name: string }[];
};

const ReportDownload: React.FC<ReportDownloadProps> = ({ clients }) => {
  const user = useAuthStore((state) => state.user);

  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [selectedClientId, setSelectedClientId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'client' | 'task'>('general');
  const [taskTabClientId, setTaskTabClientId] = useState('');
  const [taskTabAvailableTasks, setTaskTabAvailableTasks] = useState<{ id: number; title: string }[]>([]);
  const [taskTabLoadingTasks, setTaskTabLoadingTasks] = useState(false);

  // Move useEffect to top level
  React.useEffect(() => {
    const fetchTasks = async () => {
      if (activeTab === 'task' && taskTabClientId) {
        setTaskTabLoadingTasks(true);
        try {
          const tasks = await taskService.getTasksByClient(Number(taskTabClientId));
          setTaskTabAvailableTasks(tasks);
        } catch (error) {
          console.error('Error fetching tasks:', error);
        } finally {
          setTaskTabLoadingTasks(false);
        }
      }
    };

    fetchTasks();
  }, [activeTab, taskTabClientId]);

  if (user?.role === 'consultor') {
    return null;
  }

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

  const handleDownloadTaskReport = () => {
    if (!taskTabClientId) {
      alert('Por favor selecciona un cliente');
      return;
    }
    if (!selectedTaskId) {
      alert('Por favor selecciona una tarea');
      return;
    }
    if (!startDate || !endDate) {
      alert('Por favor selecciona la fecha de inicio y fin');
      return;
    }
    const formattedStartDate = startDate.toISOString();
    const formattedEndDate = endDate.toISOString();
    downloadReport('/reports/download_task_report', {
      task_id: Number(selectedTaskId),
      start_date: formattedStartDate,
      end_date: formattedEndDate,
    });
  };

  return (
    <div className="p-4 bg-white shadow-lg rounded-lg mt-6">
      <h2 className="text-lg font-semibold mb-3">Descargar Reportes</h2>
      {/* Tabs */}
      <div className="flex mb-6 space-x-2">
        <button
          className={`px-4 py-2 rounded-t ${activeTab === 'general' ? 'bg-blue-800 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`px-4 py-2 rounded-t ${activeTab === 'client' ? 'bg-green-800 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setActiveTab('client')}
        >
          Cliente
        </button>
        <button
          className={`px-4 py-2 rounded-t ${activeTab === 'task' ? 'bg-purple-800 text-white' : 'bg-gray-200 text-gray-700'}`}
          onClick={() => setActiveTab('task')}
        >
          Tarea
        </button>
      </div>
      {/* Tab Content */}
      <div className="bg-gray-50 p-4 rounded-b shadow-inner">
        {activeTab === 'general' && (
          <>
            <div className="flex space-x-4 mb-4">
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
            <button
              onClick={handleDownloadGeneralReport}
              className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
            >
              Descargar Reporte General
            </button>
          </>
        )}
        {activeTab === 'client' && (
          <>
            <div className="flex flex-col space-y-4 mb-4">
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
            <button
              onClick={handleDownloadClientReport}
              className="bg-green-800 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Descargar Reporte De Cliente
            </button>
          </>
        )}
        {activeTab === 'task' && (
          <>
            <div className="flex flex-col space-y-4 mb-4">
              <select
                value={taskTabClientId}
                onChange={e => {
                  setTaskTabClientId(e.target.value);
                  setSelectedTaskId('');
                }}
                className="border p-2 text-black rounded"
              >
                <option value="">Selecciona un cliente</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
              <select
                value={selectedTaskId}
                onChange={e => setSelectedTaskId(e.target.value)}
                className="border p-2 text-black rounded"
                disabled={!taskTabClientId || taskTabLoadingTasks}
              >
                <option value="">
                  {taskTabLoadingTasks
                    ? 'Cargando tareas...'
                    : !taskTabClientId
                      ? 'Selecciona un cliente primero'
                      : taskTabAvailableTasks.length === 0
                        ? 'No hay tareas para este cliente'
                        : 'Selecciona una tarea'}
                </option>
                {taskTabAvailableTasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.title}
                  </option>
                ))}
              </select>
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
            <button
              onClick={handleDownloadTaskReport}
              className="bg-purple-800 text-white px-4 py-2 rounded hover:bg-purple-700 transition"
            >
              Descargar Reporte de Tarea
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportDownload;
