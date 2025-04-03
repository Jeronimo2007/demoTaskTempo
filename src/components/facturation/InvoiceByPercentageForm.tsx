
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios, { AxiosResponse } from 'axios';
import ContractManager from '../contracts/ContractManager';

// Updated interface with contract_id parameter, making some fields optional with nullable types
interface InvoiceByPercentageFormData {
  client_id: number | null;
  contract_id: number | null;
  percentage: number | null;
  payment_type: "anticipo" | "fracción" | "final" | null;
  currency: "COP" | "USD";
  exchange_rate?: number | null;
  include_tax: boolean; // Field for tax inclusion
}

interface Client {
  id: number;
  name: string;
  // Other client fields are omitted for brevity
}

interface Contract {
  id: number;
  description?: string;
  total_value: number;
  start_date: string;
  end_date?: string;
  active: boolean;
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
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [showContractManager, setShowContractManager] = useState(false);
  const [selectedClientForContractManager, setSelectedClientForContractManager] = useState<number | undefined>(undefined);

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
      contract_id: null,
      percentage: null,
      payment_type: null,
      currency: "COP",
      exchange_rate: null,
      include_tax: true, // Default to include tax
    },
  });

  // Watch for changes to client_id to load contracts
  const selectedClientId = percentageForm.watch('client_id');

  // Load contracts when client changes
  useEffect(() => {
    if (selectedClientId) {
      loadClientContracts(selectedClientId);
    } else {
      setContracts([]);
    }
  }, [selectedClientId]);

  // Function to load contracts for a client
  const loadClientContracts = async (clientId: number) => {
    if (!token) {
      showNotification('Error', 'No autorizado. Por favor inicie sesión', 'error');
      return;
    }

    setLoadingContracts(true);
    try {
      const authHeaders = getAuthHeaders();
      const response = await axios.get<Contract[]>(`${API_URL}/contracts/client/${clientId}`, authHeaders);
      setContracts(response.data);
      
      // Reset contract_id when client changes - use null instead of undefined
      percentageForm.setValue('contract_id', null);
    } catch (error) {
      console.error('Error loading contracts:', error);
      let errorMessage = 'Error al cargar los contratos';
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        errorMessage = 'No autorizado. Verifique su sesión e intente nuevamente.';
      }
      
      showNotification('Error', errorMessage, 'error');
      setContracts([]);
    } finally {
      setLoadingContracts(false);
    }
  };

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
    if (data.client_id === null || data.contract_id === null || 
        data.percentage === null || data.payment_type === null ||
        (data.currency === "USD" && data.exchange_rate === null)) {
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
        contract_id: data.contract_id,
        percentage: data.percentage,
        payment_type: data.payment_type,
        currency: data.currency,
        exchange_rate: data.exchange_rate || undefined,
        include_tax: data.include_tax
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
        contract_id: null,
        percentage: null,
        payment_type: null,
        currency: "COP",
        exchange_rate: null,
        include_tax: true,
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
  const handleOpenContractManager = (clientId?: number) => {
    setSelectedClientForContractManager(clientId);
    setShowContractManager(true);
  };

  // Function to handle closing contract manager
  const handleCloseContractManager = () => {
    setShowContractManager(false);
  };

  // Function called when contract operations are successful
  const handleContractSuccess = () => {
    // Reload contracts for the selected client
    if (selectedClientId) {
      loadClientContracts(selectedClientId);
    }
  };

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

          {/* Contract Selection */}
          {selectedClientId && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="percentage-contract" className="block text-sm font-medium text-black">
                  Contrato
                </label>
                <button
                  type="button"
                  onClick={() => handleOpenContractManager(selectedClientId)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Gestionar Contratos
                </button>
              </div>
              {loadingContracts ? (
                <div className="text-black">Cargando contratos...</div>
              ) : (
                <>
                  <select
                    id="percentage-contract"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                    {...percentageForm.register("contract_id", { 
                      required: true,
                      valueAsNumber: true
                    })}
                  >
                    <option value="">Selecciona un contrato</option>
                    {contracts.length > 0 ? (
                      contracts.map((contract) => (
                        <option key={contract.id} value={contract.id}>
                          {contract.description || `Contrato #${contract.id}`} - ${contract.total_value.toLocaleString()} 
                          ({new Date(contract.start_date).toLocaleDateString()} - 
                          {contract.end_date ? new Date(contract.end_date).toLocaleDateString() : 'Sin fecha final'})
                        </option>
                      ))
                    ) : (
                      <option disabled>No hay contratos disponibles</option>
                    )}
                  </select>
                  {contracts.length === 0 && (
                    <p className="text-yellow-600 text-xs mt-1">
                      No hay contratos disponibles para este cliente.
                      <button
                        type="button"
                        onClick={() => handleOpenContractManager(selectedClientId)}
                        className="ml-2 text-blue-600 hover:text-blue-800"
                      >
                        Crear un contrato
                      </button>
                    </p>
                  )}
                  {percentageForm.formState.errors.contract_id && (
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

          {/* Include Tax Toggle */}
          <div className="space-y-2">
            <label htmlFor="percentage-include-tax" className="block text-sm font-medium text-black">
              ¿Incluir IVA?
            </label>
            <div className="flex items-center">
              <input
                id="percentage-include-tax"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                {...percentageForm.register("include_tax")}
              />
              <label htmlFor="percentage-include-tax" className="ml-2 block text-sm text-black">
                {percentageForm.watch("include_tax") ? "Con IVA" : "Sin IVA"}
              </label>
            </div>
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
            disabled={loading || loadingClients || clients.length === 0 || loadingContracts}
            className={`w-full px-4 py-2 text-white font-medium rounded-md ${
              loading || loadingClients || clients.length === 0 || loadingContracts ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {loading ? "Generando..." : "Generar y Descargar Factura"}
          </button>
        </form>
      </div>

      {/* Contract Manager Modal */}
      {showContractManager && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex">
          <div className="relative p-4 w-full max-w-4xl m-auto">
            <div className="relative bg-white rounded-lg shadow">
              <ContractManager
                clients={clients}
                loadingClients={loadingClients}
                token={token}
                API_URL={API_URL}
                showNotification={showNotification}
                initialClientId={selectedClientForContractManager}
                onSuccess={handleContractSuccess}
                onClose={handleCloseContractManager}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InvoiceByPercentageForm;
