
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus, faEdit } from "@fortawesome/free-solid-svg-icons";

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
  nit?: string;
  phone?: string;
  city?: string;
  address?: string;
  email?: string;
};

type UserData = {
  id: number;
  username: string;
};

type ClientUserRelationship = {
  id: number;
  client_id: number;
  user_id: number;
  created_at?: string;
};

interface ClientSectionProps {
  onClientUpdate?: () => void;
}

type ClientFormData = {
  id?: number;
  name: string;
  lawyers: number[];
  permanent: boolean;
  monthly_limit_hours: string;
  nit: string;
  phone: string;
  city: string;
  address: string;
  email: string;
};

type ClientModalState = {
  isOpen: boolean;
  isEditing: boolean;
  clientId: number | null;
};

type DeleteConfirmation = {
  isOpen: boolean;
  clientId: number | null;
  clientName: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const initialClientFormState: ClientFormData = {
  name: "",
  lawyers: [],
  permanent: false,
  monthly_limit_hours: "",
  nit: "",
  phone: "",
  city: "",
  address: "",
  email: ""
};

export default function ClientSection({ onClientUpdate }: ClientSectionProps) {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [clientUserRelationships, setClientUserRelationships] = useState<ClientUserRelationship[]>([]);
  const [clientForm, setClientForm] = useState<ClientFormData>(initialClientFormState);
  const [clientModal, setClientModal] = useState<ClientModalState>({
    isOpen: false,
    isEditing: false,
    clientId: null
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation>({
    isOpen: false,
    clientId: null,
    clientName: ""
  });
  
  const getToken = useCallback(() => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1] || "";
  }, []);

  const getLawyersForClient = useCallback((clientId: number) => {
    return clientUserRelationships
      .filter(relationship => relationship.client_id === clientId)
      .map(relationship => relationship.user_id);
  }, [clientUserRelationships]);

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
      setClients(response.data);
      setError(null);
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
      setUsers(response.data);
    } catch (error) {
      console.error("Error al obtener los usuarios:", error);
      setError("Error al cargar los usuarios");
    }
  }, [getToken]);

  const fetchClientUserRelationships = useCallback(async () => {
    try {
      const token = getToken();
      const response = await axios.get(`${API_URL}/clients/get_client_user`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setClientUserRelationships(response.data);
      return response.data;
    } catch (error) {
      console.error("Error al obtener las relaciones cliente-abogado:", error);
      setError("Error al cargar las asignaciones de abogados");
      return [];
    }
  }, [getToken]);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await fetchUsers();
        await fetchClients();
        await fetchClientUserRelationships();
        setIsLoading(false);
      } catch (error) {
        console.error("Error al cargar los datos:", error);
        setError("Error al cargar los datos");
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fetchClients, fetchUsers, fetchClientUserRelationships]);

  useEffect(() => {
    if (!isLoading && clients.length > 0 && clientUserRelationships.length > 0) {
      updateClientsWithLawyers();
    }
  }, [clientUserRelationships, clients.length, isLoading, updateClientsWithLawyers]);

  const notifyClientUpdate = useCallback(() => {
    if (onClientUpdate) {
      onClientUpdate();
    }
  }, [onClientUpdate]);

  const parseMonthlyLimitHours = (value: string | undefined): number => {
    if (!value || value.trim() === '') return 0;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? 0 : parsed;
  };

  const openCreateClientModal = () => {
    setClientForm(initialClientFormState);
    setClientModal({
      isOpen: true,
      isEditing: false,
      clientId: null
    });
    setError(null);
  };

  const openEditClientModal = (client: ClientData) => {
    const lawyerIds = getLawyersForClient(client.id);
    setClientForm({
      id: client.id,
      name: client.name,
      lawyers: lawyerIds,
      permanent: client.permanent,
      monthly_limit_hours: client.monthly_limit_hours !== undefined ? client.monthly_limit_hours.toString() : "",
      nit: client.nit || "",
      phone: client.phone || "",
      city: client.city || "",
      address: client.address || "",
      email: client.email || ""
    });
    setClientModal({
      isOpen: true,
      isEditing: true,
      clientId: client.id
    });
    setError(null);
  };

  const closeClientModal = () => {
    setClientModal({
      isOpen: false,
      isEditing: false,
      clientId: null
    });
    setClientForm(initialClientFormState);
    setError(null);
  };

  const handleCreateClient = async () => {
    try {
      if (!clientForm.name.trim()) {
        setError("El nombre del cliente no puede estar vacío");
        return;
      }

      const monthlyLimitHours = parseMonthlyLimitHours(clientForm.monthly_limit_hours);

      if (clientForm.permanent && monthlyLimitHours <= 0) {
        setError("Para clientes de asesoría permanente, debe especificar un límite mensual de horas mayor a 0");
        return;
      }

      const token = getToken();
      await axios.post(
        `${API_URL}/clients/create`,
        { 
          name: clientForm.name,
          lawyers: clientForm.lawyers,
          permanent: clientForm.permanent,
          monthly_limit_hours: clientForm.permanent ? monthlyLimitHours : 0,
          nit: clientForm.nit,
          phone: clientForm.phone,
          city: clientForm.city,
          address: clientForm.address,
          email: clientForm.email
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      closeClientModal();
      await fetchClients();
      await fetchClientUserRelationships();
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
    if (!clientModal.clientId) return;

    try {
      if (!clientForm.name.trim()) {
        setError("El nombre del cliente no puede estar vacío");
        return;
      }

      const monthlyLimitHours = parseMonthlyLimitHours(clientForm.monthly_limit_hours);

      if (clientForm.permanent && monthlyLimitHours <= 0) {
        setError("Para clientes de asesoría permanente, debe especificar un límite mensual de horas mayor a 0");
        return;
      }

      const token = getToken();
      const updateData = {
        id: clientModal.clientId,
        name: clientForm.name,
        lawyers: clientForm.lawyers || [],
        permanent: clientForm.permanent,
        monthly_limit_hours: clientForm.permanent ? monthlyLimitHours : 0,
        nit: clientForm.nit,
        phone: clientForm.phone,
        city: clientForm.city,
        address: clientForm.address,
        email: clientForm.email
      };

      await axios.put(
        `${API_URL}/clients/update_client`,
        updateData,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      closeClientModal();
      await fetchClients();
      await fetchClientUserRelationships();
      notifyClientUpdate();
    } catch (error) {
      console.error("Error al actualizar el cliente:", error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
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

  const openDeleteConfirmation = (client: ClientData) => {
    setDeleteConfirmation({
      isOpen: true,
      clientId: client.id,
      clientName: client.name
    });
  };

  const closeDeleteConfirmation = () => {
    setDeleteConfirmation({
      isOpen: false,
      clientId: null,
      clientName: ""
    });
  };

  const handleDeleteClient = async () => {
    if (!deleteConfirmation.clientId) return;
    
    try {
      const token = getToken();
      await axios.delete(`${API_URL}/clients/delete_client`, {
        data: { id: deleteConfirmation.clientId },
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setClients(clients.filter(client => client.id !== deleteConfirmation.clientId));
      closeDeleteConfirmation();
      await fetchClientUserRelationships();
      notifyClientUpdate();
    } catch (error) {
      console.error("Error al eliminar el cliente:", error);
      if (axios.isAxiosError(error) && error.response) {
        setError(`Error al eliminar: ${error.response.data.message || error.message}`);
      } else {
        setError("Error al eliminar el cliente");
      }
      closeDeleteConfirmation();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setClientForm(prev => ({ ...prev, [name]: value }));
  };

  const handleLawyerSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => parseInt(option.value));
    setClientForm(prev => ({ ...prev, lawyers: selectedOptions }));
  };

  const togglePermanent = () => {
    setClientForm(prev => ({ ...prev, permanent: !prev.permanent }));
  };

  return (
    <div className="p-6 text-black shadow-lg rounded-lg bg-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Gestión de Clientes</h2>
        <button 
          onClick={openCreateClientModal}
          className="flex items-center bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          <FontAwesomeIcon icon={faPlus} className="mr-2" />
          Nuevo Cliente
        </button>
      </div>
      
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
          <div className="overflow-x-auto">
            <table className="w-full border border-black rounded-lg overflow-hidden shadow-md">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border-b border-black p-2 text-left">Nombre</th>
                  <th className="border-b border-black p-2 text-left">NIT</th>
                  <th className="border-b border-black p-2 text-left">Contacto</th>
                  <th className="border-b border-black p-2 text-left">Abogados Asignados</th>
                  <th className="border-b border-black p-2 text-left">Asesoría Permanente</th>
                  <th className="border-b border-black p-2 text-left">Límite Mensual (Horas)</th>
                  <th className="p-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50">
                    <td className="border-b border-black p-2">{client.name}</td>
                    <td className="border-b border-black p-2">{client.nit || "-"}</td>
                    <td className="border-b border-black p-2">
                      <div className="text-sm">
                        {client.phone && <p><span className="font-medium">Tel:</span> {client.phone}</p>}
                        {client.email && <p><span className="font-medium">Email:</span> {client.email}</p>}
                        {client.city && <p><span className="font-medium">Ciudad:</span> {client.city}</p>}
                        {client.address && <p className="truncate max-w-[150px]"><span className="font-medium">Dir:</span> {client.address}</p>}
                        {!client.phone && !client.email && !client.city && !client.address && "-"}
                      </div>
                    </td>
                    <td className="border-b border-black p-2">
                      <div>
                        {client.lawyers && client.lawyers.length > 0 ? (
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
                      <div className={`px-3 py-1 rounded-full text-xs font-semibold inline-block text-center ${
                        client.permanent 
                          ? "bg-green-500 text-white" 
                          : "bg-gray-300 text-gray-700"
                      }`}>
                        {client.permanent ? "Sí" : "No"}
                      </div>
                    </td>
                    <td className="border-b border-black p-2">
                      <span>
                        {client.permanent ? 
                          (client.monthly_limit_hours ? `${client.monthly_limit_hours} horas` : "No especificado") : 
                          "N/A"}
                      </span>
                    </td>
                    <td className="p-2 flex space-x-2">
                      <button 
                        onClick={() => openEditClientModal(client)} 
                        className="flex items-center text-blue-600 hover:text-blue-800 transition"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button 
                        onClick={() => openDeleteConfirmation(client)} 
                        className="text-red-600 hover:text-red-800 transition"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Client Form Modal */}
          {clientModal.isOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <h3 className="text-lg font-semibold mb-4">
                  {clientModal.isEditing ? 'Editar Cliente' : 'Crear Nuevo Cliente'}
                </h3>
                
                {error && (
                  <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    <p>{error}</p>
                  </div>
                )}
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-1">
                        Nombre del Cliente*:
                      </label>
                      <input
                        id="name"
                        name="name"
                        type="text"
                        value={clientForm.name}
                        onChange={handleInputChange}
                        className="border p-2 text-black rounded w-full"
                        placeholder="Nombre del cliente"
                        required
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="nit" className="block text-sm font-medium mb-1">
                        NIT:
                      </label>
                      <input
                        id="nit"
                        name="nit"
                        type="text"
                        value={clientForm.nit}
                        onChange={handleInputChange}
                        className="border p-2 text-black rounded w-full"
                        placeholder="NIT"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="phone" className="block text-sm font-medium mb-1">
                        Teléfono:
                      </label>
                      <input
                        id="phone"
                        name="phone"
                        type="text"
                        value={clientForm.phone}
                        onChange={handleInputChange}
                        className="border p-2 text-black rounded w-full"
                        placeholder="Teléfono de contacto"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="email" className="block text-sm font-medium mb-1">
                        Email:
                      </label>
                      <input
                        id="email"
                        name="email"
                        type="email"
                        value={clientForm.email}
                        onChange={handleInputChange}
                        className="border p-2 text-black rounded w-full"
                        placeholder="Email de contacto"
                      />
                    </div>
                    
                    <div className="flex items-center mb-2">
                      <ToggleSwitch 
                        isOn={clientForm.permanent} 
                        handleToggle={togglePermanent} 
                        label="Asesoría Permanente" 
                      />
                    </div>
                    
                    {clientForm.permanent && (
                      <div>
                        <label htmlFor="monthly_limit_hours" className="block text-sm font-medium mb-1">
                          Límite Mensual de Horas*:
                        </label>
                        <input
                          id="monthly_limit_hours"
                          name="monthly_limit_hours"
                          type="text"
                          value={clientForm.monthly_limit_hours}
                          onChange={handleInputChange}
                          className="border p-2 text-black rounded w-full"
                          placeholder="Ej: 10.5"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Ingrese el número de horas mensuales contratadas
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="city" className="block text-sm font-medium mb-1">
                        Ciudad:
                      </label>
                      <input
                        id="city"
                        name="city"
                        type="text"
                        value={clientForm.city}
                        onChange={handleInputChange}
                        className="border p-2 text-black rounded w-full"
                        placeholder="Ciudad"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="address" className="block text-sm font-medium mb-1">
                        Dirección:
                      </label>
                      <input
                        id="address"
                        name="address"
                        type="text"
                        value={clientForm.address}
                        onChange={handleInputChange}
                        className="border p-2 text-black rounded w-full"
                        placeholder="Dirección completa"
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="lawyers-select" className="block text-sm font-medium mb-1">
                        Asignar Abogados:
                      </label>
                      <select
                        id="lawyers-select"
                        multiple
                        value={clientForm.lawyers.map(id => id.toString())}
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
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 mt-6">
                  <button 
                    onClick={closeClientModal}
                    className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={clientModal.isEditing ? handleUpdateClient : handleCreateClient}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    {clientModal.isEditing ? 'Actualizar' : 'Crear'}
                  </button>
                </div>
              </div>
            </div>
          )}

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
