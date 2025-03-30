import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import axios, { AxiosResponse } from 'axios';

// Form interface with the new include_tax parameter
interface InvoiceByHoursFormData {
  client_id: number;
  currency: "COP" | "USD";
  exchange_rate?: number;
  include_tax: boolean; // New field for tax inclusion
}

interface Client {
  id: number;
  name: string;
  // Other client fields are omitted for brevity
}

interface InvoiceByHoursFormProps {
  clients: Client[];
  loadingClients: boolean;
  token: string;
  API_URL: string;
  showNotification: (title: string, message: string, type: 'success' | 'error') => void;
  onSuccess?: () => void; // Optional callback for after successful form submission
}

const InvoiceByHoursForm: React.FC<InvoiceByHoursFormProps> = ({
  clients,
  loadingClients,
  token,
  API_URL,
  showNotification,
  onSuccess
}) => {
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

  // Set up form
  const hoursForm = useForm<InvoiceByHoursFormData>({
    defaultValues: {
      client_id: undefined,
      currency: "COP",
      exchange_rate: undefined,
      include_tax: true, // Default to include tax
    },
  });

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

  // Handle invoice by hours creation
  const onSubmitHoursForm = async (data: InvoiceByHoursFormData) => {
    if (!token) {
      showNotification('Error', 'No autorizado. Por favor inicie sesión', 'error');
      return;
    }
    
    setLoading(true);
    try {
      // Include auth token in the request from useAuthStore
      const authHeaders = getAuthHeaders();
      
      // Modify to handle file download - set responseType to blob
      const response = await axios.post<Blob>(`${API_URL}/reports/invoices/by-hours`, data, {
        ...authHeaders,
        responseType: 'blob'
      });
      
      // Get client name for the filename
      const client = clients.find(c => c.id === data.client_id);
      const clientName = client ? client.name.replace(/\s+/g, '_') : 'cliente';
      
      // Download the file
      downloadFile(response, `factura_horas_${clientName}.pdf`);
      
      showNotification('Éxito', 'Factura por horas generada y descargada correctamente', 'success');
      hoursForm.reset();
      
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      let errorMessage = 'Error al crear la factura por horas';
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        errorMessage = 'No autorizado. Verifique su sesión e intente nuevamente.';
      }
      
      showNotification('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-black">Crear orden por Horas</h2>
        <p className="text-black text-sm">
          Crea una nueva orden basada en horas trabajadas.
        </p>
      </div>
      <div>
        <form onSubmit={hoursForm.handleSubmit(onSubmitHoursForm)} className="space-y-6">
          {/* Client Selection */}
          <div className="space-y-2">
            <label htmlFor="hours-client" className="block text-sm font-medium text-black">
              Cliente
            </label>
            {loadingClients ? (
              <div className="text-black">Cargando clientes...</div>
            ) : (
              <>
                <select
                  id="hours-client"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                  {...hoursForm.register("client_id", { 
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
                {hoursForm.formState.errors.client_id && (
                  <p className="text-red-500 text-xs mt-1">Este campo es requerido</p>
                )}
              </>
            )}
          </div>

          {/* Include Tax Toggle */}
          <div className="space-y-2">
            <label htmlFor="hours-include-tax" className="block text-sm font-medium text-black">
              ¿Incluir IVA?
            </label>
            <div className="flex items-center">
              <input
                id="hours-include-tax"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                {...hoursForm.register("include_tax")}
              />
              <label htmlFor="hours-include-tax" className="ml-2 block text-sm text-black">
                {hoursForm.watch("include_tax") ? "Con IVA" : "Sin IVA"}
              </label>
            </div>
          </div>

          {/* Currency Selection */}
          <div className="space-y-2">
            <label htmlFor="hours-currency" className="block text-sm font-medium text-black">
              Moneda
            </label>
            <select
              id="hours-currency"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              {...hoursForm.register("currency", { required: true })}
            >
              <option value="COP">COP</option>
              <option value="USD">USD</option>
            </select>
            {hoursForm.formState.errors.currency && (
              <p className="text-red-500 text-xs mt-1">Este campo es requerido</p>
            )}
          </div>

          {/* Exchange Rate (only shown when USD is selected) */}
          {hoursForm.watch('currency') === 'USD' && (
            <div className="space-y-2">
              <label htmlFor="hours-exchange-rate" className="block text-sm font-medium text-black">
                Tasa de Cambio
              </label>
              <input
                id="hours-exchange-rate"
                type="number"
                step="0.01"
                placeholder="Ingrese la tasa de cambio"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                {...hoursForm.register("exchange_rate", { 
                  required: hoursForm.watch('currency') === 'USD',
                  valueAsNumber: true 
                })}
              />
              <p className="text-black text-xs">
                Tasa de cambio de USD a COP
              </p>
              {hoursForm.formState.errors.exchange_rate && (
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

export default InvoiceByHoursForm;