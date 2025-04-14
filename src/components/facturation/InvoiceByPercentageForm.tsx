
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios, { AxiosResponse } from 'axios';

// Updated interface with contract_id parameter, making some fields optional with nullable types
import { Task } from "@/types/task";

interface InvoiceByPercentageFormData {
  client_id: number | null;
  task_id: number | null;
  percentage: number | null;
  payment_type: "anticipo" | "fracción" | "final" | null;
  currency: "COP" | "USD";
  exchange_rate?: number | null;
}

interface Client {
  id: number;
  name: string;
  // Other client fields are omitted for brevity
}


interface InvoiceByPercentageFormProps {
  clients: Client[];
  loadingClients: boolean;
  token: string;
  API_URL: string;
  showNotification: (title: string, message: string, type: 'success' | 'error') => void;
  onSuccess?: () => void; // Optional callback for after successful form submission
}

const InvoiceByPercentageForm: React.FC<InvoiceByPercentageFormProps> = ({
  clients,
  loadingClients,
  token,
  API_URL,
  showNotification,
  onSuccess,
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loading, setLoading] = useState(false);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    return {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      }
    };
  };

  // Set up form with proper null values instead of undefined
  const percentageForm = useForm<InvoiceByPercentageFormData>({
    defaultValues: {
      client_id: null,
      task_id: null,
      percentage: null,
      payment_type: null,
      currency: "COP",
      exchange_rate: null,
    },
  });
  
  // Watch for client_id changes to fetch tasks
  const selectedClientId = percentageForm.watch("client_id");
  
  useEffect(() => {
    if (selectedClientId) {
      setLoadingTasks(true);
      setTasks([]);
      axios
        .get(`${API_URL}/tasks/get_tasks_by_client`, {
          params: { client_id: selectedClientId },
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
            "Content-Type": "application/json",
          },
        })
        .then((res) => {
          setTasks(res.data || []);
        })
        .catch(() => {
          setTasks([]);
          showNotification("Error", "No se pudieron cargar las tareas del cliente", "error");
        })
        .finally(() => setLoadingTasks(false));
    } else {
      setTasks([]);
    }
  }, [selectedClientId, API_URL, token, showNotification]);


  // Load contracts when client changes

  // Function to load contracts for a client

  // Helper function to download file from response
  const downloadFile = (response: AxiosResponse<Blob>, defaultFileName: string) => {
    // Get filename from Content-Disposition header if available
    const contentDisposition = response.headers['content-disposition'];
    let filename = defaultFileName;
    
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, '');
      }
    }
    
    // Create a blob from the response data
    const blob = new Blob([response.data], { 
      type: response.headers['content-type']?.toString() || 'application/octet-stream' 
    });
    
    // Create a URL for the blob
    const url = window.URL.createObjectURL(blob);
    
    // Create a temporary link element to trigger the download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    document.body.removeChild(link);
  };

  // Handle invoice by percentage creation
  const onSubmitPercentageForm = async (data: InvoiceByPercentageFormData) => {
    if (!token) {
      showNotification('Error', 'No autorizado. Por favor inicie sesión', 'error');
      return;
    }
  
    // Ensure all required fields are present before submission
    if (
      data.client_id === null ||
      data.task_id === null ||
      data.percentage === null ||
      data.payment_type === null ||
      (data.currency === "USD" && data.exchange_rate === null)
    ) {
      showNotification('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }
  
    setLoading(true);
    try {
      // Include auth token in the request
      const authHeaders = getAuthHeaders();
  
      // Create a clean version of the data without null values
      const cleanData = {
        client_id: data.client_id,
        task_id: data.task_id,
        percentage: data.percentage,
        payment_type: data.payment_type,
        currency: data.currency,
        exchange_rate: data.exchange_rate || undefined,
      };
  
      // Set responseType to blob for file download
      const response = await axios.post<Blob>(`${API_URL}/reports/invoices/by-percentage`, cleanData, {
        ...authHeaders,
        responseType: 'blob'
      });
  
      // Get client name for the filename
      const client = clients.find(c => c.id === data.client_id);
      const clientName = client ? client.name.replace(/\s+/g, '_') : 'cliente';
      const paymentType = data.payment_type || 'pago';
  
      // Download the file
      downloadFile(response, `factura_porcentaje_${clientName}_${paymentType}.pdf`);
  
      showNotification('Éxito', 'Factura por porcentaje generada y descargada correctamente', 'success');
      // Reset form with null values instead of undefined
      percentageForm.reset({
        client_id: null,
        task_id: null,
        percentage: null,
        payment_type: null,
        currency: "COP",
        exchange_rate: null,
      });
  
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      let errorMessage = 'Error al crear la factura por porcentaje';
  
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        errorMessage = 'No autorizado. Verifique su sesión e intente nuevamente.';
      }
  
      showNotification('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Function to handle opening contract manager

  // Function to handle closing contract manager

  // Function called when contract operations are successful

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-black">Crear orden por Porcentaje</h2>
        <p className="text-black text-sm">
          Crea una nueva orden basada en un porcentaje del valor del caso.
        </p>
      </div>
      <div>
        <form onSubmit={percentageForm.handleSubmit(onSubmitPercentageForm)} className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <label htmlFor="percentage-client" className="block text-sm font-medium text-black">
              Cliente
            </label>
            {loadingClients ? (
              <div className="text-black">Cargando clientes...</div>
            ) : (
              <>
                <select
                  id="percentage-client"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  {...percentageForm.register("client_id", {
                    required: true,
                    valueAsNumber: true
                  })}
                >
                  <option value="">Selecciona un cliente</option>
                  {clients.length > 0 ? (
                    clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))
                  ) : (
                    <option disabled>No hay clientes disponibles</option>
                  )}
                </select>
                {clients.length === 0 && (
                  <p className="text-yellow-600 text-xs mt-1">No hay clientes disponibles</p>
                )}
                {percentageForm.formState.errors.client_id && (
                  <p className="text-red-500 text-xs mt-1">Este campo es requerido</p>
                )}
              </>
            )}
          </div>
          
          {/* Task Selection (only show after client is selected) */}
          {selectedClientId && (
            <div className="space-y-2">
              <label htmlFor="percentage-task" className="block text-sm font-medium text-black">
                Tarea
              </label>
              {loadingTasks ? (
                <div className="text-black">Cargando tareas...</div>
              ) : (
                <>
                  <select
                    id="percentage-task"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    {...percentageForm.register("task_id", { required: true, valueAsNumber: true })}
                  >
                    <option value="">Selecciona una tarea</option>
                    {tasks.length > 0 ? (
                      tasks.map((task) => (
                        <option key={task.id} value={task.id}>
                          {task.title}
                        </option>
                      ))
                    ) : (
                      <option disabled>No hay tareas disponibles</option>
                    )}
                  </select>
                  {tasks.length === 0 && (
                    <p className="text-yellow-600 text-xs mt-1">No hay tareas disponibles</p>
                  )}
                  {percentageForm.formState.errors.task_id && (
                    <p className="text-red-500 text-xs mt-1">Este campo es requerido</p>
                  )}
                </>
              )}
            </div>
          )}


          {/* Percentage */}
          <div className="space-y-2">
            <label htmlFor="percentage" className="block text-sm font-medium text-black">
              Porcentaje (%)
            </label>
            <input
              id="percentage"
              type="number"
              step="0.01"
              min="0"
              max="100"
              placeholder="Ingrese el porcentaje (0-100)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              {...percentageForm.register("percentage", { 
                required: true,
                valueAsNumber: true,
                min: 0,
                max: 100
              })}
            />
            <p className="text-black text-xs">
              El porcentaje debe estar entre 0 y 100
            </p>
            {percentageForm.formState.errors.percentage && (
              <p className="text-red-500 text-xs mt-1">Este campo es requerido y debe estar entre 0 y 100</p>
            )}
          </div>

          {/* Payment Type */}
          <div className="space-y-2">
            <label htmlFor="payment-type" className="block text-sm font-medium text-black">
              Tipo de Pago
            </label>
            <select
              id="payment-type"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              {...percentageForm.register("payment_type", { required: true })}
            >
              <option value="">Selecciona un tipo de pago</option>
              <option value="anticipo">Anticipo</option>
              <option value="fracción">Fracción</option>
              <option value="final">Final</option>
            </select>
            {percentageForm.formState.errors.payment_type && (
              <p className="text-red-500 text-xs mt-1">Este campo es requerido</p>
            )}
          </div>


          {/* Currency Selection */}
          <div className="space-y-2">
            <label htmlFor="percentage-currency" className="block text-sm font-medium text-black">
              Moneda
            </label>
            <select
              id="percentage-currency"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              {...percentageForm.register("currency", { required: true })}
            >
              <option value="COP">COP</option>
              <option value="USD">USD</option>
            </select>
            {percentageForm.formState.errors.currency && (
              <p className="text-red-500 text-xs mt-1">Este campo es requerido</p>
            )}
          </div>

          {/* Exchange Rate (only shown when USD is selected) */}
          {percentageForm.watch('currency') === 'USD' && (
            <div className="space-y-2">
              <label htmlFor="percentage-exchange-rate" className="block text-sm font-medium text-black">
                Tasa de Cambio
              </label>
              <input
                id="percentage-exchange-rate"
                type="number"
                step="0.01"
                placeholder="Ingrese la tasa de cambio"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                {...percentageForm.register("exchange_rate", { 
                  required: percentageForm.watch('currency') === 'USD',
                  valueAsNumber: true 
                })}
              />
              <p className="text-black text-xs">
                Tasa de cambio de USD a COP
              </p>
              {percentageForm.formState.errors.exchange_rate && (
                <p className="text-red-500 text-xs mt-1">Este campo es requerido</p>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || loadingClients || clients.length === 0}
            className={`w-full px-4 py-2 text-white font-medium rounded-md ${
              loading || loadingClients || clients.length === 0 ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? "Generando..." : "Generar y Descargar Factura"}
          </button>
        </form>
      </div>

    </div>
  );
};

export default InvoiceByPercentageForm;
