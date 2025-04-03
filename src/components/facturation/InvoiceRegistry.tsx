import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, subMonths, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

interface Invoice {
  id: number;
  issued_at: string;
  billing_type: 'hourly' | 'percentage';
  subtotal: number;
  tax: number;
  total: number;
  percentage: number | null;
  payment_type: 'anticipo' | 'fracción' | 'final' | null;
  total_hours: number | null;
  total_case_value: number | null;
  client_name: string;
  client_id: number | null;
}

interface Client {
  id: number;
  name: string;
  total_time?: number;
  permanent?: boolean;
  monthly_limit_hours?: number;
  current_month_hours?: number;
  nit?: string;
  phone?: string;
  city?: string;
  address?: string;
  email?: string;
}

interface InvoiceRegistryProps {
  token: string | null;
  apiUrl: string | undefined;
  showNotification: (title: string, message: string, type: 'success' | 'error') => void;
}

const InvoiceRegistry: React.FC<InvoiceRegistryProps> = ({ token, apiUrl, showNotification }) => {
  // Estado para las fechas de inicio y fin (3 meses atrás hasta mañana)
  const [startDate, setStartDate] = useState<string>(
    format(subMonths(new Date(), 3), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(addDays(new Date(), 1), 'yyyy-MM-dd')
  );
  
  // Estado para las facturas y carga
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Estado para paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Estado para los clientes
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [loadingClients, setLoadingClients] = useState<boolean>(false);
  
  // Estado para mostrar el mensaje de advertencia de client_id
  const [showClientIdWarning, setShowClientIdWarning] = useState<boolean>(false);

  // Función para formatear moneda
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  };

  // Función para formatear fecha
  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return format(date, 'dd MMM yyyy', { locale: es });
    } catch {
      return dateString;
    }
  };

  // Función para cargar los clientes
  const fetchClients = useCallback(async () => {
    if (!token || !apiUrl) {
      return;
    }
    
    setLoadingClients(true);
    
    try {
      const response = await axios.get(`${apiUrl}/clients/get_clients_admin`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      
      if (Array.isArray(response.data)) {
        setClients(response.data);
      }
    } catch (err) {
      console.error('Error al obtener la lista de clientes:', err);
      // No mostramos notificación para no interferir con la UI principal
    } finally {
      setLoadingClients(false);
    }
  }, [token, apiUrl]);

  // Cargar clientes una sola vez al montar el componente
  useEffect(() => {
    if (token && apiUrl) {
      fetchClients();
    }
  }, [token, apiUrl, fetchClients]);

  // Función para obtener el registro de facturas
  const fetchInvoiceRegistry = useCallback(async () => {
    if (!token || !apiUrl) {
      setErrorMessage('No hay token de autenticación o URL de API');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    try {
      const response = await axios.get(`${apiUrl}/reports/invoices/registry`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: {
          start_date: startDate,
          end_date: endDate
        }
      });

      // Procesar y ordenar las facturas por fecha
      const processedInvoices = response.data
        .map((invoice: Invoice) => {
          if ((invoice.client_id === undefined || invoice.client_id === null) && invoice.client_name) {
            const matchingClient = clients.find(client => 
              client.name.toLowerCase() === invoice.client_name.toLowerCase()
            );
            
            if (matchingClient) {
              return {
                ...invoice,
                client_id: matchingClient.id
              };
            }
          }
          return invoice;
        })
        .sort((a: Invoice, b: Invoice) => 
          new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
        );

      const hasNullClientIds = processedInvoices.some((inv: Invoice) => inv.client_id === null);
      setShowClientIdWarning(hasNullClientIds);

      setInvoices(processedInvoices);
      
      // Filtrar por cliente si está seleccionado
      if (selectedClientId !== null) {
        const filtered = processedInvoices.filter((invoice: Invoice) => 
          invoice.client_id === selectedClientId
        );
        setFilteredInvoices(filtered);
      } else {
        setFilteredInvoices(processedInvoices);
      }
    } catch (err) {
      console.error('Error al obtener el registro de facturas:', err);
      let message = 'Error al cargar el registro de facturas';
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          message = 'No autorizado. Verifique su sesión e intente nuevamente.';
        } else {
          message = `Error ${err.response?.status || 'desconocido'}: ${err.message}`;
        }
      }
      setErrorMessage(message);
      showNotification('Error', message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl, startDate, endDate, selectedClientId, clients, showNotification]);

  // Cargar facturas cuando cambian las fechas
  useEffect(() => {
    if (token && apiUrl) {
      fetchInvoiceRegistry();
    }
  }, [token, apiUrl, fetchInvoiceRegistry]);

  // Función para manejar la búsqueda con las fechas seleccionadas
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoiceRegistry();
  };

  // Función para obtener el tipo de factura en español
  const getBillingTypeText = (type: 'hourly' | 'percentage'): string => {
    return type === 'hourly' ? 'Por Horas' : 'Por Porcentaje';
  };

  // Función para obtener el tipo de pago en español
  const getPaymentTypeText = (type: 'anticipo' | 'fracción' | 'final' | null): string => {
    if (!type) return '-';
    
    const types = {
      'anticipo': 'Anticipo',
      'fracción': 'Fracción',
      'final': 'Final'
    };
    
    return types[type] || type;
  };

  // Función para manejar el cambio de cliente
  const handleClientChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const clientId = value ? Number(value) : null;
    setSelectedClientId(clientId);
    
    // Filtrar las facturas por el cliente seleccionado
    if (clientId !== null) {
      const filtered = invoices.filter(invoice => invoice.client_id === clientId);
      setFilteredInvoices(filtered);
    } else {
      setFilteredInvoices(invoices);
    }
  };

  // Función para filtrar las facturas que tienen client_id null
  const handleShowOnlyMissingClientIds = () => {
    const filtered = invoices.filter(invoice => invoice.client_id === null);
    setFilteredInvoices(filtered);
    setSelectedClientId(null);
  };

  // Calcular paginación
  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const paginatedInvoices = filteredInvoices.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Resetear a la primera página cuando cambia el filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedClientId, startDate, endDate]);

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 mt-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-black">Registro de ordenes</h2>
        <p className="text-black text-sm">
          Consulta las ordenes generadas en un período específico.
        </p>
      </div>

      {/* Formulario de búsqueda */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label htmlFor="start-date" className="block text-sm font-medium text-black">
              Fecha Inicial
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="end-date" className="block text-sm font-medium text-black">
              Fecha Final
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label htmlFor="client-filter" className="block text-sm font-medium text-black">
              Filtrar por Cliente
            </label>
            <select
              id="client-filter"
              value={selectedClientId === null ? '' : selectedClientId}
              onChange={handleClientChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
              disabled={loadingClients}
            >
              <option value="">Todos los clientes</option>
              {loadingClients ? (
                <option disabled>Cargando clientes...</option>
              ) : (
                clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))
              )}
            </select>
          </div>
          
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className={`w-full px-4 py-2 text-white font-medium rounded-md ${
                loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {loading ? "Buscando..." : "Buscar"}
            </button>
          </div>
        </div>
      </form>

      {/* Mensaje de error */}
      {errorMessage && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Advertencia de client_id nulos */}
      {showClientIdWarning && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-800 rounded">
          <p className="font-medium">Advertencia: Algunas órdenes no tienen ID de cliente asignado.</p>
          <p className="text-sm mt-1">Esto puede afectar el funcionamiento del filtro por cliente.</p>
          <button 
            onClick={handleShowOnlyMissingClientIds}
            className="mt-2 px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded hover:bg-yellow-300"
          >
            Mostrar solo órdenes sin ID de cliente
          </button>
        </div>
      )}

      {/* Tabla de resultados */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Fecha
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Cliente
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Tipo
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Detalles
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Subtotal
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IVA
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  Cargando ordenes...
                </td>
              </tr>
            ) : paginatedInvoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron ordenes en el período seleccionado
                  {selectedClientId !== null && " o para el cliente seleccionado"}
                </td>
              </tr>
            ) : (
              paginatedInvoices.map((invoice) => (
                <tr key={invoice.id} className={invoice.client_id === null ? "bg-yellow-50" : ""}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(invoice.issued_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {invoice.client_name}
                    
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {getBillingTypeText(invoice.billing_type)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {invoice.billing_type === 'hourly' ? (
                      <span>{invoice.total_hours} horas</span>
                    ) : (
                      <span>
                        {invoice.percentage}% - {getPaymentTypeText(invoice.payment_type)}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(invoice.subtotal)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatCurrency(invoice.tax)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {formatCurrency(invoice.total)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {!loading && paginatedInvoices.length > 0 && (
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
      )}
    </div>
  );
};

export default InvoiceRegistry;
