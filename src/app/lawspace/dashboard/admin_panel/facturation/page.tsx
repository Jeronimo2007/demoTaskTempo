
"use client";

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { useAuthStore } from '../../../../../store/useAuthStore';
import { useRouter } from 'next/navigation';
import InvoiceRegistry from '../../../../../components/facturation/InvoiceRegistry';

// Updated Client interface to match the API response
interface Client {
  id: number;
  name: string;
  total_time: number;
  permanent: boolean;
  monthly_limit_hours: number;
  current_month_hours: number;
  nit: string;
  phone: string;
  city: string;
  address: string;
  email: string;
}

// Form interfaces
interface InvoiceByHoursFormData {
  client_id: number;
  currency: "COP" | "USD";
  exchange_rate?: number;
}

interface InvoiceByPercentageFormData {
  client_id: number;
  total_case_value: number;
  percentage: number;
  payment_type: "anticipo" | "fracción" | "final";
  currency: "COP" | "USD";
  exchange_rate?: number;
}

export default function FacturationPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingClients, setLoadingClients] = useState(true);
  const [clientError, setClientError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'hours' | 'percentage' | 'registry'>('hours');
  const [notification, setNotification] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'success'
  });

  // Get auth state from useAuthStore
  const { user, token, logout } = useAuthStore();
  const router = useRouter();

  // Get API base URL from environment variable or use default
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // Set up forms
  const hoursForm = useForm<InvoiceByHoursFormData>({
    defaultValues: {
      client_id: undefined,
      currency: "COP",
      exchange_rate: undefined,
    },
  });

  const percentageForm = useForm<InvoiceByPercentageFormData>({
    defaultValues: {
      client_id: undefined,
      total_case_value: undefined,
      percentage: undefined,
      payment_type: undefined,
      currency: "COP",
      exchange_rate: undefined,
    },
  });

  // Check authentication on component mount
  useEffect(() => {
    if (!token || !user) {
      // Redirect to login if no token is found
      showNotification('Sesión expirada', 'Por favor inicie sesión nuevamente', 'error');
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    }
  }, [token, user, router]);

  // Create axios instance with auth headers using the token from useAuthStore
  const getAuthHeaders = () => {
    return {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      }
    };
  };

  // Get clients on component mount
  useEffect(() => {
    // Skip fetching if not authenticated
    if (!token) return;
    
    const fetchClients = async () => {
      setLoadingClients(true);
      setClientError(null);
      try {
        // Use the API base URL from environment variable
        const endpoint = `${API_URL}/clients/get_clients_admin`;
        console.log('Fetching clients from:', endpoint);
        
        // Include auth token in the request
        const authHeaders = getAuthHeaders();
        console.log('Using auth headers:', authHeaders);
        
        const response = await axios.get(endpoint, authHeaders);
        console.log('Clients data received:', response.data);
        
        if (Array.isArray(response.data) && response.data.length > 0) {
          setClients(response.data);
        } else {
          console.warn('No clients data found or empty array returned');
          setClientError('No se encontraron clientes');
        }
      } catch (error) {
        console.error('Error fetching clients:', error);
        
        // More detailed error handling
        if (axios.isAxiosError(error)) {
          if (error.response?.status === 404) {
            setClientError('Error 404: El endpoint de clientes no fue encontrado. Verifique la configuración de la API.');
          } else if (error.response?.status === 401) {
            setClientError('Error 401: No autorizado. Verifique su sesión e intente nuevamente.');
            
            // Handle unauthorized error - possible expired token
            logout();
            showNotification('Sesión expirada', 'Por favor inicie sesión nuevamente', 'error');
            setTimeout(() => {
              router.push('/login');
            }, 2000);
          } else {
            setClientError(`Error ${error.response?.status || 'desconocido'}: ${error.message}`);
          }
        } else {
          setClientError('Error al cargar los clientes');
        }
        
        showNotification('Error', 'No se pudieron cargar los clientes', 'error');
      } finally {
        setLoadingClients(false);
      }
    };

    fetchClients();
  }, [API_URL, token, logout, router]);

  // Custom toast function
  const showNotification = (title: string, message: string, type: 'success' | 'error') => {
    setNotification({ visible: true, title, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000); // Hide after 3 seconds
  };

  // Helper function to download file from response
  const downloadFile = (response: any, defaultFileName: string) => {
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
      type: response.headers['content-type'] || 'application/octet-stream' 
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
      const response = await axios.post(`${API_URL}/reports/invoices/by-hours`, data, {
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
      
      // Cambiar a la pestaña de registro después de generar la factura
      setTimeout(() => {
        setActiveTab('registry');
      }, 1500);
    } catch (error) {
      console.error('Error creating invoice:', error);
      let errorMessage = 'Error al crear la factura por horas';
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        errorMessage = 'No autorizado. Verifique su sesión e intente nuevamente.';
        
        // Handle unauthorized error - possible expired token
        logout();
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
      
      showNotification('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle invoice by percentage creation
  const onSubmitPercentageForm = async (data: InvoiceByPercentageFormData) => {
    if (!token) {
      showNotification('Error', 'No autorizado. Por favor inicie sesión', 'error');
      return;
    }
    
    setLoading(true);
    try {
      // Include auth token in the request from useAuthStore
      const authHeaders = getAuthHeaders();
      
      // Modify to handle file download - set responseType to blob
      const response = await axios.post(`${API_URL}/reports/invoices/by-percentage`, data, {
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
      percentageForm.reset();
      
      // Cambiar a la pestaña de registro después de generar la factura
      setTimeout(() => {
        setActiveTab('registry');
      }, 1500);
    } catch (error) {
      console.error('Error creating invoice:', error);
      let errorMessage = 'Error al crear la factura por porcentaje';
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        errorMessage = 'No autorizado. Verifique su sesión e intente nuevamente.';
        
        // Handle unauthorized error - possible expired token
        logout();
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
      
      showNotification('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Tab switching handler
  const handleTabSwitch = (tab: 'hours' | 'percentage' | 'registry') => {
    setActiveTab(tab);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6 text-black">Facturación</h1>

      {/* Custom Notification Toast */}
      {notification.visible && (
        <div className={`fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-100 border border-green-400 text-green-700' : 
          'bg-red-100 border border-red-400 text-red-700'
        }`}>
          <div className="font-bold">{notification.title}</div>
          <div className="text-sm">{notification.message}</div>
        </div>
      )}

      {/* Auth Status */}
      {!token && (
        <div className="mb-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          <p className="font-bold">No autenticado</p>
          <p>Por favor inicie sesión para acceder a esta página</p>
        </div>
      )}

      {/* Debug information - can be removed in production */}
      {clientError && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <p className="font-bold">Error de clientes:</p>
          <p>{clientError}</p>
          {API_URL ? (
            <p className="text-xs mt-2">API URL: {API_URL}</p>
          ) : (
            <p className="text-xs mt-2 font-bold">¡Advertencia! No se ha configurado NEXT_PUBLIC_API_URL</p>
          )}
          <p className="text-xs mt-1">
            Estado de autenticación: {token ? 'Autenticado' : 'No autenticado'}
            {user && ` como ${user.username} (${user.role})`}
          </p>
        </div>
      )}

      {/* Only show the forms if the user is authenticated */}
      {token && (
        <>
          {/* Custom Tabs UI */}
          <div className="w-full mb-6">
            <div className="flex border-b border-gray-300">
              <button
                onClick={() => handleTabSwitch('hours')}
                className={`py-2 px-4 font-medium text-sm ${
                  activeTab === 'hours'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-black hover:text-gray-700'
                }`}
              >
                Factura por Horas
              </button>
              <button
                onClick={() => handleTabSwitch('percentage')}
                className={`py-2 px-4 font-medium text-sm ${
                  activeTab === 'percentage'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-black hover:text-gray-700'
                }`}
              >
                Factura por Porcentaje
              </button>
              <button
                onClick={() => handleTabSwitch('registry')}
                className={`py-2 px-4 font-medium text-sm ${
                  activeTab === 'registry'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-black hover:text-gray-700'
                }`}
              >
                Registro de Facturas
              </button>
            </div>
          </div>
          
          {/* Invoice by Hours Form */}
          {activeTab === 'hours' && (
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-black">Crear Factura por Horas</h2>
                <p className="text-black text-sm">
                  Crea una nueva factura basada en horas trabajadas.
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
                        {clients.length === 0 && !clientError && (
                          <p className="text-yellow-600 text-xs mt-1">No hay clientes disponibles</p>
                        )}
                        {hoursForm.formState.errors.client_id && (
                          <p className="text-red-500 text-xs mt-1">Este campo es requerido</p>
                        )}
                      </>
                    )}
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
          )}
          
          {/* Invoice by Percentage Form */}
          {activeTab === 'percentage' && (
            <div className="bg-white rounded-lg border shadow-sm p-6">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-black">Crear Factura por Porcentaje</h2>
                <p className="text-black text-sm">
                  Crea una nueva factura basada en un porcentaje del valor del caso.
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
                        {clients.length === 0 && !clientError && (
                          <p className="text-yellow-600 text-xs mt-1">No hay clientes disponibles</p>
                        )}
                        {percentageForm.formState.errors.client_id && (
                          <p className="text-red-500 text-xs mt-1">Este campo es requerido</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* Total Case Value */}
                  <div className="space-y-2">
                    <label htmlFor="total-case-value" className="block text-sm font-medium text-black">
                      Valor Total del Caso
                    </label>
                    <input
                      id="total-case-value"
                      type="number"
                      step="0.01"
                      placeholder="Ingrese el valor total del caso"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                      {...percentageForm.register("total_case_value", { 
                        required: true,
                        valueAsNumber: true
                      })}
                    />
                    {percentageForm.formState.errors.total_case_value && (
                      <p className="text-red-500 text-xs mt-1">Este campo es requerido</p>
                    )}
                  </div>

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
          )}
          
          {/* Invoice Registry Component */}
          {activeTab === 'registry' && (
            <InvoiceRegistry 
              token={token} 
              apiUrl={API_URL} 
              showNotification={showNotification} 
            />
          )}
        </>
      )}
    </div>
  );
}