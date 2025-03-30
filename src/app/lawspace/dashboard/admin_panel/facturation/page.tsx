
"use client";

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../../../../store/useAuthStore';
import { useRouter } from 'next/navigation';
import InvoiceRegistry from '../../../../../components/facturation/InvoiceRegistry';
import InvoiceByHoursForm from '../../../../../components/facturation/InvoiceByHoursForm';
import InvoiceByPercentageForm from '../../../../../components/facturation/InvoiceByPercentageForm';

// Client interface
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

export default function FacturationPage() {
  // State for clients and UI
  const [clients, setClients] = useState<Client[]>([]);
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

  // Get API base URL from environment variable
  const API_URL = process.env.NEXT_PUBLIC_API_URL;

  // Custom toast function
  const showNotification = (title: string, message: string, type: 'success' | 'error') => {
    setNotification({ visible: true, title, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, visible: false }));
    }, 3000); // Hide after 3 seconds
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
        const authHeaders = {
          headers: {
            'Authorization': token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          }
        };
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

  // Tab switching handler
  const handleTabSwitch = (tab: 'hours' | 'percentage' | 'registry') => {
    setActiveTab(tab);
  };

  // Success handler - changes to registry tab
  const handleFormSuccess = () => {
    setTimeout(() => {
      setActiveTab('registry');
    }, 1500);
  };

  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6 text-black">Orden de servicios</h1>

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
                Orden por Horas
              </button>
              <button
                onClick={() => handleTabSwitch('percentage')}
                className={`py-2 px-4 font-medium text-sm ${
                  activeTab === 'percentage'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-black hover:text-gray-700'
                }`}
              >
                Orden por Porcentaje
              </button>
              <button
                onClick={() => handleTabSwitch('registry')}
                className={`py-2 px-4 font-medium text-sm ${
                  activeTab === 'registry'
                    ? 'border-b-2 border-blue-500 text-blue-600'
                    : 'text-black hover:text-gray-700'
                }`}
              >
                Registro de Ordenes
              </button>
            </div>
          </div>
          
          {/* Invoice by Hours Form Component */}
          {activeTab === 'hours' && (
            <InvoiceByHoursForm
              clients={clients}
              loadingClients={loadingClients}
              token={token}
              API_URL={API_URL || ''}
              showNotification={showNotification}
              onSuccess={handleFormSuccess}
            />
          )}
          
          {/* Invoice by Percentage Form Component */}
          {activeTab === 'percentage' && (
            <InvoiceByPercentageForm
              clients={clients}
              loadingClients={loadingClients}
              token={token}
              API_URL={API_URL || ''}
              showNotification={showNotification}
              onSuccess={handleFormSuccess}
            />
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
