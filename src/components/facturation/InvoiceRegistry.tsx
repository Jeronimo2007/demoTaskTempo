import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { format, subMonths } from 'date-fns';
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
}

interface InvoiceRegistryProps {
  token: string | null;
  apiUrl: string | undefined;
  showNotification: (title: string, message: string, type: 'success' | 'error') => void;
}

const InvoiceRegistry: React.FC<InvoiceRegistryProps> = ({ token, apiUrl, showNotification }) => {
  // Estado para las fechas de inicio y fin
  const [startDate, setStartDate] = useState<string>(
    format(subMonths(new Date(), 1), 'yyyy-MM-dd')
  );
  const [endDate, setEndDate] = useState<string>(
    format(new Date(), 'yyyy-MM-dd')
  );
  
  // Estado para las facturas y carga
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
    } catch (error) {
      return dateString;
    }
  };

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

      setInvoices(response.data);
    } catch (error) {
      console.error('Error al obtener el registro de facturas:', error);
      
      let message = 'Error al cargar el registro de facturas';
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          message = 'No autorizado. Verifique su sesión e intente nuevamente.';
        } else {
          message = `Error ${error.response?.status || 'desconocido'}: ${error.message}`;
        }
      }
      
      setErrorMessage(message);
      showNotification('Error', message, 'error');
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl, startDate, endDate, showNotification]);

  // Cargar facturas cuando cambian las fechas
  useEffect(() => {
    if (token && apiUrl) {
      fetchInvoiceRegistry();
    }
  }, [token, apiUrl, fetchInvoiceRegistry]); // Añadimos fetchInvoiceRegistry como dependencia

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

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6 mt-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-black">Registro de Facturas</h2>
        <p className="text-black text-sm">
          Consulta las facturas generadas en un período específico.
        </p>
      </div>

      {/* Formulario de búsqueda */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                  Cargando facturas...
                </td>
              </tr>
            ) : invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-500">
                  No se encontraron facturas en el período seleccionado
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
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
    </div>
  );
};

export default InvoiceRegistry;
