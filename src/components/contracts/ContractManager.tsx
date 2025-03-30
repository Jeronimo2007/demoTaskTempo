import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import axios from 'axios';

interface Contract {
  id: number;
  client_id: number;
  description?: string;
  total_value: number;
  start_date: string;
  end_date?: string;
  active: boolean;
}

interface Client {
  id: number;
  name: string;
}

interface ContractCreateFormData {
  client_id: number;
  description?: string;
  total_value: number;
  start_date: string;
  end_date?: string;
}

interface ContractUpdateFormData {
  description?: string;
  total_value?: number;
  start_date?: string;
  end_date?: string;
  active?: boolean;
}

interface ContractManagerProps {
  clients: Client[];
  loadingClients: boolean;
  token: string;
  API_URL: string;
  showNotification: (title: string, message: string, type: 'success' | 'error') => void;
  initialClientId?: number;
  onSuccess?: () => void;
  onClose?: () => void;
}

const ContractManager: React.FC<ContractManagerProps> = ({
  clients,
  loadingClients,
  token,
  API_URL,
  showNotification,
  initialClientId,
  onSuccess,
  onClose,
}) => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<number | undefined>(initialClientId);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Setup forms
  const createForm = useForm<ContractCreateFormData>({
    defaultValues: {
      client_id: initialClientId,
      description: '',
      total_value: undefined,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
    },
  });

  const updateForm = useForm<ContractUpdateFormData>({
    defaultValues: {
      description: '',
      total_value: undefined,
      start_date: '',
      end_date: '',
      active: true,
    },
  });

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    return {
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      }
    };
  };

  // Load contracts when selectedClientId changes
  useEffect(() => {
    if (selectedClientId) {
      loadClientContracts(selectedClientId);
    } else {
      setContracts([]);
    }
  }, [selectedClientId]);

  // Initialize form when selectedContract changes
  useEffect(() => {
    if (selectedContract && isEditing) {
      updateForm.reset({
        description: selectedContract.description || '',
        total_value: selectedContract.total_value,
        start_date: selectedContract.start_date?.split('T')[0],
        end_date: selectedContract.end_date?.split('T')[0] || '',
        active: selectedContract.active,
      });
    }
  }, [selectedContract, isEditing]);

  // Initialize create form when isCreating changes
  useEffect(() => {
    if (isCreating) {
      createForm.reset({
        client_id: selectedClientId,
        description: '',
        total_value: undefined,
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
      });
    }
  }, [isCreating, selectedClientId]);

  // Set selected client ID from initial value
  useEffect(() => {
    if (initialClientId && !selectedClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);

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

  // Handle contract creation
  const handleCreateContract = async (data: ContractCreateFormData) => {
    if (!token) {
      showNotification('Error', 'No autorizado. Por favor inicie sesión', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      await axios.post(`${API_URL}/contracts/create`, data, authHeaders);
      
      showNotification('Éxito', 'Contrato creado correctamente', 'success');
      setIsCreating(false);
      
      // Reload contracts
      if (data.client_id) {
        loadClientContracts(data.client_id);
      }
      
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error creating contract:', error);
      let errorMessage = 'Error al crear el contrato';
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        errorMessage = 'No autorizado. Verifique su sesión e intente nuevamente.';
      }
      
      showNotification('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle contract update
  const handleUpdateContract = async (data: ContractUpdateFormData) => {
    if (!token || !selectedContract) {
      showNotification('Error', 'No autorizado o no se ha seleccionado un contrato', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      await axios.put(`${API_URL}/contracts/update/${selectedContract.id}`, data, authHeaders);
      
      showNotification('Éxito', 'Contrato actualizado correctamente', 'success');
      setIsEditing(false);
      setSelectedContract(null);
      
      // Reload contracts
      if (selectedClientId) {
        loadClientContracts(selectedClientId);
      }
      
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error updating contract:', error);
      let errorMessage = 'Error al actualizar el contrato';
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        errorMessage = 'No autorizado. Verifique su sesión e intente nuevamente.';
      }
      
      showNotification('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Handle contract deletion
  const handleDeleteContract = async () => {
    if (!token || !selectedContract) {
      showNotification('Error', 'No autorizado o no se ha seleccionado un contrato', 'error');
      return;
    }
    
    setLoading(true);
    try {
      const authHeaders = getAuthHeaders();
      await axios.delete(`${API_URL}/contracts/delete/${selectedContract.id}`, authHeaders);
      
      showNotification('Éxito', 'Contrato eliminado correctamente', 'success');
      setIsDeleting(false);
      setSelectedContract(null);
      
      // Reload contracts
      if (selectedClientId) {
        loadClientContracts(selectedClientId);
      }
      
      // Call the onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('Error deleting contract:', error);
      let errorMessage = 'Error al eliminar el contrato';
      
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        errorMessage = 'No autorizado. Verifique su sesión e intente nuevamente.';
      }
      
      showNotification('Error', errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(value);
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-CO');
  };

  return (
    <div className="bg-white rounded-lg border shadow-sm p-6">
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold text-black">Gestor de Contratos</h2>
        {onClose && (
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            aria-label="Cerrar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Client Selection */}
      <div className="mb-6">
        <label htmlFor="client-selector" className="block text-sm font-medium text-black mb-2">
          Cliente
        </label>
        {loadingClients ? (
          <div className="text-black">Cargando clientes...</div>
        ) : (
          <select
            id="client-selector"
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
            value={selectedClientId || ''}
            onChange={(e) => {
              const newClientId = e.target.value ? Number(e.target.value) : undefined;
              setSelectedClientId(newClientId);
              setSelectedContract(null);
              setIsCreating(false);
              setIsEditing(false);
              setIsDeleting(false);
            }}
            disabled={isCreating || isEditing || isDeleting}
          >
            <option value="">Selecciona un cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Contract Creation Form */}
      {isCreating && (
        <div className="mb-6 border rounded-md p-4 bg-gray-50">
          <h3 className="text-lg font-medium text-black mb-4">Crear Nuevo Contrato</h3>
          <form onSubmit={createForm.handleSubmit(handleCreateContract)} className="space-y-4">
            <input
              type="hidden"
              {...createForm.register("client_id", {
                required: true,
                valueAsNumber: true,
              })}
              value={selectedClientId}
            />
            
            <div>
              <label htmlFor="create-description" className="block text-sm font-medium text-black mb-1">
                Descripción
              </label>
              <input
                id="create-description"
                type="text"
                placeholder="Descripción del contrato"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                {...createForm.register("description")}
              />
            </div>
            
            <div>
              <label htmlFor="create-total-value" className="block text-sm font-medium text-black mb-1">
                Valor Total
              </label>
              <input
                id="create-total-value"
                type="number"
                step="0.01"
                placeholder="Valor total del contrato"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                {...createForm.register("total_value", {
                  required: true,
                  valueAsNumber: true,
                  min: 0,
                })}
              />
              {createForm.formState.errors.total_value && (
                <p className="text-red-500 text-xs mt-1">Este campo es requerido y debe ser un número positivo</p>
              )}
            </div>
            
            <div>
              <label htmlFor="create-start-date" className="block text-sm font-medium text-black mb-1">
                Fecha de Inicio
              </label>
              <input
                id="create-start-date"
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                {...createForm.register("start_date", {
                  required: true,
                })}
              />
              {createForm.formState.errors.start_date && (
                <p className="text-red-500 text-xs mt-1">Este campo es requerido</p>
              )}
            </div>
            
            <div>
              <label htmlFor="create-end-date" className="block text-sm font-medium text-black mb-1">
                Fecha de Finalización
              </label>
              <input
                id="create-end-date"
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                {...createForm.register("end_date")}
              />
              <p className="text-xs text-gray-500">Opcional. Deje en blanco si el contrato no tiene fecha de finalización.</p>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                {loading ? "Guardando..." : "Guardar Contrato"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contract Edit Form */}
      {isEditing && selectedContract && (
        <div className="mb-6 border rounded-md p-4 bg-gray-50">
          <h3 className="text-lg font-medium text-black mb-4">Editar Contrato</h3>
          <form onSubmit={updateForm.handleSubmit(handleUpdateContract)} className="space-y-4">
            <div>
              <label htmlFor="edit-description" className="block text-sm font-medium text-black mb-1">
                Descripción
              </label>
              <input
                id="edit-description"
                type="text"
                placeholder="Descripción del contrato"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                {...updateForm.register("description")}
              />
            </div>
            
            <div>
              <label htmlFor="edit-total-value" className="block text-sm font-medium text-black mb-1">
                Valor Total
              </label>
              <input
                id="edit-total-value"
                type="number"
                step="0.01"
                placeholder="Valor total del contrato"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                {...updateForm.register("total_value", {
                  valueAsNumber: true,
                  min: 0,
                })}
              />
              {updateForm.formState.errors.total_value && (
                <p className="text-red-500 text-xs mt-1">El valor debe ser un número positivo</p>
              )}
            </div>
            
            <div>
              <label htmlFor="edit-start-date" className="block text-sm font-medium text-black mb-1">
                Fecha de Inicio
              </label>
              <input
                id="edit-start-date"
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                {...updateForm.register("start_date")}
              />
            </div>
            
            <div>
              <label htmlFor="edit-end-date" className="block text-sm font-medium text-black mb-1">
                Fecha de Finalización
              </label>
              <input
                id="edit-end-date"
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-black"
                {...updateForm.register("end_date")}
              />
              <p className="text-xs text-gray-500">Opcional. Deje en blanco si el contrato no tiene fecha de finalización.</p>
            </div>
            
            <div>
              <label htmlFor="edit-active" className="flex items-center">
                <input
                  id="edit-active"
                  type="checkbox"
                  className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                  {...updateForm.register("active")}
                />
                <span className="ml-2 block text-sm text-black">Contrato activo</span>
              </label>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setSelectedContract(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                disabled={loading}
              >
                {loading ? "Actualizando..." : "Actualizar Contrato"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Contract Delete Confirmation */}
      {isDeleting && selectedContract && (
        <div className="mb-6 border rounded-md p-4 bg-red-50">
          <h3 className="text-lg font-medium text-black mb-2">Eliminar Contrato</h3>
          <p className="text-sm text-gray-700 mb-4">
            ¿Está seguro de que desea eliminar este contrato? Esta acción no se puede deshacer.
          </p>
          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => {
                setIsDeleting(false);
                setSelectedContract(null);
              }}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteContract}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              disabled={loading}
            >
              {loading ? "Eliminando..." : "Eliminar Contrato"}
            </button>
          </div>
        </div>
      )}

      {/* Contracts List */}
      {selectedClientId && !isCreating && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-black">Lista de Contratos</h3>
            <button
              type="button"
              onClick={() => {
                setIsCreating(true);
                setIsEditing(false);
                setIsDeleting(false);
                setSelectedContract(null);
                createForm.setValue("client_id", selectedClientId);
              }}
              className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
              disabled={loadingContracts}
            >
              Nuevo Contrato
            </button>
          </div>
          
          {loadingContracts ? (
            <div className="text-center py-4 text-gray-500">
              <svg className="animate-spin h-5 w-5 mx-auto mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Cargando contratos...</span>
            </div>
          ) : contracts.length > 0 ? (
            <div className="border rounded-md overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valor Total
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Inicio
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha Fin
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contracts.map((contract) => (
                    <tr key={contract.id} className={`${!contract.active ? 'bg-gray-50' : ''}`}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {contract.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {contract.description || "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {formatCurrency(contract.total_value)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {formatDate(contract.start_date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {contract.end_date ? formatDate(contract.end_date) : "-"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          contract.active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {contract.active ? "Activo" : "Inactivo"}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setIsEditing(true);
                            setIsCreating(false);
                            setIsDeleting(false);
                          }}
                          className="text-blue-600 hover:text-blue-900 mr-3"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => {
                            setSelectedContract(contract);
                            setIsDeleting(true);
                            setIsEditing(false);
                            setIsCreating(false);
                          }}
                          className="text-red-600 hover:text-red-900"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 border rounded-md">
              <p className="text-gray-500 mb-4">No hay contratos disponibles para este cliente.</p>
              <button
                type="button"
                onClick={() => {
                  setIsCreating(true);
                  createForm.setValue("client_id", selectedClientId);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Crear un contrato
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ContractManager;