import { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTrash, faCheck, faTimes } from "@fortawesome/free-solid-svg-icons";

// Toggle Switch Component
const ToggleSwitch = ({ 
  isOn, 
  handleToggle, 
  label 
}: { 
  isOn: boolean; 
  handleToggle: () => void; 
  label?: string 
}) => {
  return (
    <div className="flex items-center">
      {label && <span className="mr-2 text-sm">{label}</span>}
      <div 
        onClick={handleToggle}
        className={`relative inline-block w-12 h-6 transition-colors duration-200 ease-in-out rounded-full cursor-pointer ${
          isOn ? "bg-green-500" : "bg-gray-300"
        }`}
      >
        <span 
          className={`absolute left-1 top-1 w-4 h-4 transition-transform duration-200 ease-in-out bg-white rounded-full transform ${
            isOn ? "translate-x-6" : "translate-x-0"
          }`}
        />
      </div>
    </div>
  );
};

type ClientData = {
  id: number;
  name: string;
  lawyers?: number[];
  permanent: boolean;
  monthly_limit_hours?: number;
};

type UserData = {
  id: number;
  username: string;
};

// New type for the client-user relationship data
type ClientUserRelationship = {
  id: number;
  client_id: number;
  user_id: number;
  created_at?: string;
};

// Define props interface for ClientSection
interface ClientSectionProps {
  onClientUpdate?: () => void; // Optional callback for when clients are updated
}

// Define a separate type for the new client form
type NewClientFormData = {
  name: string;
  lawyers: number[];
  permanent: boolean;
  monthly_limit_hours: string; // String for form input
};

// Define a separate type for the editing client form
type EditingClientFormData = {
  name?: string;
  lawyers?: number[];
  permanent?: boolean;
  monthly_limit_hours?: string; // String for form input
};

// Define a type for the delete confirmation state
type DeleteConfirmation = {
  isOpen: boolean;
  clientId: number | null;
  clientName: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ClientSection({ onClientUpdate }: ClientSectionProps) {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [clientUserRelationships, setClientUserRelationships] = useState<ClientUserRelationship[]>([]);
  const [newClient, setNewClient] = useState<NewClientFormData>({ 
    name: "", 
    lawyers: [],
    permanent: false,
    monthly_limit_hours: "" // Empty string for form input
  });
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editingClient, setEditingClient] = useState<EditingClientFormData>({});
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  // Add state for delete confirmation
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    clientId: null,
    clientName: ""
  });
  
  // Use ref to track data changes for debugging without causing re-renders
  const debugRef = useRef({
    lastClientsUpdate: Date.now(),
    lastRelationshipsUpdate: Date.now()
  });

  const getToken = useCallback(() => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1] || "";
  }, []);

  // Helper function to get lawyers assigned to a specific client
  const getLawyersForClient = useCallback((clientId: number) => {
    return clientUserRelationships
      .filter(relationship => relationship.client_id === clientId)
      .map(relationship => relationship.user_id);
  }, [clientUserRelationships]);

  // Function to update clients with their assigned lawyers
  const updateClientsWithLawyers = useCallback(() => {
    setClients(prevClients => 
      prevClients.map(client => ({
        ...client,
        lawyers: getLawyersForClient(client.id)
      }))
    );
  }, [getLawyersForClient]);

  const fetchClients = useCallback(async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/clients/get_clients_admin`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Fetched clients:", response.data);
      setClients(response.data);
      setError(null);
      debugRef.current.lastClientsUpdate = Date.now();
    } catch (error) {
      console.error("Error al obtener los clientes:", error);
      setError("Error al cargar los clientes");
    }
  }, [getToken]);

  const fetchUsers = useCallback(async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/users/get_all_users`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Fetched users:", response.data);
      setUsers(response.data);
    } catch (error) {
      console.error("Error al obtener los usuarios:", error);
      setError("Error al cargar los usuarios");
    }
  }, [getToken]);

  // New function to fetch client-user relationships
  const fetchClientUserRelationships = useCallback(async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/clients/get_client_user`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("Fetched client-user relationships:", response.data);
      setClientUserRelationships(response.data);
      debugRef.current.lastRelationshipsUpdate = Date.now();
      return response.data;
    } catch (error) {
      console.error("Error al obtener las relaciones cliente-abogado:", error);
      setError("Error al cargar las asignaciones de abogados");
      return [];
    }
  }, [getToken]);

  // Debug effect that only runs when clients or relationships actually change
  useEffect(() => {
    console.log("Current clients state:", clients);
    debugRef.current.lastClientsUpdate = Date.now();
  }, [clients]);

  useEffect(() => {
    console.log("Current relationships state:", clientUserRelationships);
    debugRef.current.lastRelationshipsUpdate = Date.now();
  }, [clientUserRelationships]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        console.log("Fetching users...");
        await fetchUsers();

        console.log("Fetching clients...");
        await fetchClients();

        console.log("Fetching client-user relationships...");
        const relationships = await fetchClientUserRelationships();
        
        console.log("All data fetched, updating clients with lawyers...");
        
        // We need to wait for all data to be fetched before updating
        setIsLoading(false);
      } catch (error) {
        console.error("Error al cargar los datos:", error);
        setError("Error al cargar los datos");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fetchClients, fetchUsers, fetchClientUserRelationships]);

  // This effect runs when clientUserRelationships changes to update clients with their lawyers
  useEffect(() => {
    if (!isLoading && clients.length > 0 && clientUserRelationships.length > 0) {
      console.log("Updating clients with their assigned lawyers");
      updateClientsWithLawyers();
    }
  }, [clientUserRelationships, clients.length, isLoading, updateClientsWithLawyers]);

  // Helper function to notify parent component about client updates
  const notifyClientUpdate = useCallback(() => {
    if (onClientUpdate) {
      console.log("Notifying parent component about client update");
      onClientUpdate();
    }
  }, [onClientUpdate]);

  // Helper function to parse monthly limit hours
  const parseMonthlyLimitHours = (value: string | undefined): number => {
    if (!value || value.trim() === '') return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const handleCreateClient = async () => {
    try {
      if (!newClient.name.trim()) {
        setError("El nombre del cliente no puede estar vacío");
        return;
      }

      const monthlyLimitHours = parseMonthlyLimitHours(newClient.monthly_limit_hours);

      // Validate monthly_limit_hours if client is permanent
      if (newClient.permanent && monthlyLimitHours <= 0) {
        setError("Para clientes de asesoría permanente, debe especificar un límite mensual de horas mayor a 0");
        return;
      }

      const token = getToken();
      await axios.post(
        `${API_URL}/clients/create`,
        { 
          name: newClient.name,
          lawyers: newClient.lawyers,
          permanent: newClient.permanent,
          monthly_limit_hours: newClient.permanent ? monthlyLimitHours : 0
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewClient({ name: "", lawyers: [], permanent: false, monthly_limit_hours: "" });
      setError(null);
      
      // Refresh data after creating a client
      await fetchClients();
      await fetchClientUserRelationships();
      
      // Notify parent component about the update
      notifyClientUpdate();
    } catch (error) {
      console.error("Error al crear el cliente:", error);
      if (axios.isAxiosError(error) && error.response) {
        setError(`Error al crear el cliente: ${error.response.data.message || error.message}`);
      } else {
        setError("Error al crear el cliente");
      }
    }
  };

  const handleUpdateClient = async () => {
    if (editingClientId === null) return;

    try {
      if (!editingClient.name || !editingClient.name.trim()) {
        setError("El nombre del cliente no puede estar vacío");
        return;
      }

      const monthlyLimitHours = parseMonthlyLimitHours(editingClient.monthly_limit_hours);

      // Validate monthly_limit_hours if client is permanent
      if (editingClient.permanent && monthlyLimitHours <= 0) {
        setError("Para clientes de asesoría permanente, debe especificar un límite mensual de horas mayor a 0");
        return;
      }

      const token = getToken();
      const updateData = {
        id: editingClientId,
        name: editingClient.name,
        lawyers: editingClient.lawyers || [],
        permanent: editingClient.permanent,
        monthly_limit_hours: editingClient.permanent ? monthlyLimitHours : 0
      };

      console.log("Enviando datos para actualizar:", updateData);

      const response = await axios.put(
        `${API_URL}/clients/update_client`,
        updateData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      console.log("Respuesta de actualización:", response.data);

      // Refresh data after updating a client
      await fetchClients();
      await fetchClientUserRelationships();
      setEditingClientId(null);
      setEditingClient({});
      setError(null);
      
      // Notify parent component about the update
      notifyClientUpdate();
    } catch (error) {
      console.error("Error al actualizar el cliente:", error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          console.error("Respuesta de error:", error.response.data);
          setError(`Error al actualizar (${error.response.status}): ${error.response.data.message || JSON.stringify(error.response.data)}`);
        } else if (error.request) {
          setError("No se recibió respuesta del servidor");
        } else {
          setError(`Error de configuración: ${error.message}`);
        }
      } else {
        setError("Error desconocido al actualizar el cliente");
      }
    }
  };

  // Function to open delete confirmation dialog
  const openDeleteConfirmation = (client: ClientData) => {
    setDeleteConfirmation({
      isOpen: true,
      clientId: client.id,
      clientName: client.name
    });
  };

  // Function to close delete confirmation dialog
  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({
      isOpen: false,
      clientId: null,
      clientName: ""
    });
  };

  // Modified function to handle client deletion after confirmation
  const handleDeleteClient = async () => {
    if (!deleteConfirmation.clientId) return;
    
    try {
      const token = getToken();
      await axios.delete(`${API_URL}/clients/delete_client`, {
        data: { id: deleteConfirmation.clientId },
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setClients(clients.filter(client => client.id !== deleteConfirmation.clientId));
      setError(null);
      
      // Close the confirmation dialog
      closeDeleteConfirmation();
      
      // Refresh client-user relationships after deleting a client
      await fetchClientUserRelationships();
      
      // Notify parent component about the update
      notifyClientUpdate();
    } catch (error) {
      console.error("Error al eliminar el cliente:", error);
      if (axios.isAxiosError(error) && error.response) {
        setError(`Error al eliminar: ${error.response.data.message || error.message}`);
      } else {
        setError("Error al eliminar el cliente");
      }
      // Close the confirmation dialog even on error
      closeDeleteConfirmation();
    }
  };

  const startEditingClient = (client: ClientData) => {
    const lawyerIds = getLawyersForClient(client.id);
    console.log(`Editing client ${client.id} with lawyers:`, lawyerIds);
    setEditingClientId(client.id);
    setEditingClient({ 
      name: client.name,
      lawyers: lawyerIds,
      permanent: client.permanent,
      monthly_limit_hours: client.monthly_limit_hours !== undefined ? client.monthly_limit_hours.toString() : ""
    });
    setError(null);
  };

  const handleLawyerSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => parseInt(option.value));
    setNewClient({ ...newClient, lawyers: selectedOptions });
  };

  const handleEditLawyerSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => parseInt(option.value));
    setEditingClient({ ...editingClient, lawyers: selectedOptions });
  };

  const togglePermanent = () => {
    setNewClient({ ...newClient, permanent: !newClient.permanent });
  };

  const toggleEditingPermanent = () => {
    setEditingClient({ ...editingClient, permanent: !(editingClient.permanent ?? false) });
  };

  const handleMonthlyLimitHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewClient({ ...newClient, monthly_limit_hours: e.target.value });
  };

  const handleEditMonthlyLimitHoursChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditingClient({ ...editingClient, monthly_limit_hours: e.target.value });
  };

  return (
    <div className="p-6 text-black shadow-lg rounded-lg bg-white">
      <h2 className="text-lg font-semibold mb-3">Gestión de Clientes</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-4">
          <p>Cargando datos...</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 mb-6">
            <input
              type="text"
              placeholder="Nombre del Cliente"
              value={newClient.name}
              onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
              className="border p-2 text-black rounded"
            />
            
            <div>
              <label htmlFor="lawyers-select" className="block text-sm font-medium mb-1">
                Asignar Abogados:
              </label>
              <select
                id="lawyers-select"
                multiple
                value={newClient.lawyers.map(id => id.toString())}
                onChange={handleLawyerSelection}
                className="border p-2 text-black rounded w-full h-32"
              >
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.username}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Mantenga presionado Ctrl (Cmd en Mac) para seleccionar múltiples abogados
              </p>
            </div>
            
            <div className="flex items-center mb-2">
              <ToggleSwitch 
                isOn={newClient.permanent} 
                handleToggle={togglePermanent} 
                label="Asesoría Permanente" 
              />
            </div>
            
            {newClient.permanent && (
              <div className="mb-2">
                <label htmlFor="monthly-limit-hours" className="block text-sm font-medium mb-1">
                  Límite Mensual de Horas:
                </label>
                <input
                  id="monthly-limit-hours"
                  type="text"
                  value={newClient.monthly_limit_hours}
                  onChange={handleMonthlyLimitHoursChange}
                  className="border p-2 text-black rounded w-full"
                  placeholder="Ej: 10.5"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ingrese el número de horas mensuales contratadas
                </p>
              </div>
            )}
            
            <button 
              onClick={handleCreateClient} 
              className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition w-full md:w-auto"
            >
              Crear Cliente
            </button>
          </div>

          <table className="w-full border border-black rounded-lg overflow-hidden shadow-md">
            <thead className="bg-gray-100">
              <tr>
                <th className="border-b border-black p-2 text-left">Nombre</th>
                <th className="border-b border-black p-2 text-left">Abogados Asignados</th>
                <th className="border-b border-black p-2 text-left">Asesoría Permanente</th>
                <th className="border-b border-black p-2 text-left">Límite Mensual (Horas)</th>
                <th className="p-2 text-left">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr key={client.id} className="hover:bg-gray-50">
                  <td className="border-b border-black p-2">
                    {editingClientId === client.id ? (
                      <input
                        type="text"
                        value={editingClient.name ?? ""}
                        onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                        className="border p-1 text-black rounded w-full"
                      />
                    ) : (
                      client.name
                    )}
                  </td>
                  <td className="border-b border-black p-2">
                    <div>
                      {editingClientId === client.id ? (
                        <select
                          multiple
                          value={(editingClient.lawyers || []).map(id => id.toString())}
                          onChange={handleEditLawyerSelection}
                          className="border p-1 text-black rounded w-full h-24"
                        >
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.username}
                            </option>
                          ))}
                        </select>
                      ) : client.lawyers && client.lawyers.length > 0 ? (
                        <ul className="list-disc pl-5">
                          {client.lawyers.map((lawyerId) => {
                            const user = users.find((u) => u.id === lawyerId);
                            return user ? (
                              <li key={lawyerId}>{user.username}</li>
                            ) : (
                              <li key={lawyerId} className="text-gray-500">
                                Usuario no encontrado (ID: {lawyerId})
                              </li>
                            );
                          })}
                        </ul>
                      ) : (
                        <span className="text-gray-500">Sin abogados asignados</span>
                      )}
                    </div>
                  </td>
                  <td className="border-b border-black p-2">
                    {editingClientId === client.id ? (
                      <ToggleSwitch 
                        isOn={editingClient.permanent ?? false} 
                        handleToggle={toggleEditingPermanent} 
                      />
                    ) : (
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold inline-block text-center ${
                        client.permanent 
                          ? "bg-green-500 text-white" 
                          : "bg-gray-300 text-gray-700"
                      }`}>
                        {client.permanent ? "Sí" : "No"}
                      </div>
                    )}
                  </td>
                  <td className="border-b border-black p-2">
                    {editingClientId === client.id && editingClient.permanent ? (
                      <input
                        type="text"
                        value={editingClient.monthly_limit_hours ?? ""}
                        onChange={handleEditMonthlyLimitHoursChange}
                        className="border p-1 text-black rounded w-full"
                        placeholder="Ej: 10.5"
                      />
                    ) : (
                      <span>
                        {client.permanent ? 
                          (client.monthly_limit_hours ? `${client.monthly_limit_hours} horas` : "No especificado") : 
                          "N/A"}
                      </span>
                    )}
                  </td>
                  <td className="border-t p-2 flex space-x-2">
                    {editingClientId === client.id ? (
                      <button onClick={handleUpdateClient} className="bg-blue-800 text-white p-2 rounded hover:bg-blue-700 transition">
                        <FontAwesomeIcon icon={faSave} />
                      </button>
                    ) : (
                      <button onClick={() => startEditingClient(client)} className="text-blue-600 hover:text-blue-800 transition">
                        Editar
                      </button>
                    )}
                    <button 
                      onClick={() => openDeleteConfirmation(client)} 
                      className="bg-red-800 text-white p-2 rounded hover:bg-red-700 transition"
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Delete Confirmation Modal */}
          {deleteConfirmation.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
                <h3 className="text-lg font-semibold mb-4">Confirmar eliminación</h3>
                <p className="mb-6">
                  ¿Está seguro que desea eliminar el cliente <span className="font-semibold">{deleteConfirmation.clientName}</span>? 
                  Esta acción no se puede deshacer.
                </p>
                <div className="flex justify-end space-x-3">
                  <button 
                    onClick={closeDeleteConfirmation}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleDeleteClient}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
