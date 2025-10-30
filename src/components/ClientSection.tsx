import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrash, faPlus, faEdit, faSearch, faRotate } from "@fortawesome/free-solid-svg-icons";

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
  international?: boolean;
  type?: 'natural' | 'juridica';
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
  nit: string;
  phone: string;
  city: string;
  address: string;
  email: string;
  international: boolean;
  type: 'natural' | 'juridica';
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
  nit: "",
  phone: "",
  city: "",
  address: "",
  email: "",
  international: false,
  type: 'natural',
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
  const [expandedClientId, setExpandedClientId] = useState<number | null>(null); // State for expanded row
  
  // Add search state
  const [searchTerm, setSearchTerm] = useState("");
  
  // Add pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [pageInput, setPageInput] = useState<string>('1');

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
      const response = await axios.get(`${API_URL}/users/get_users_B`, {
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
      nit: client.nit || "",
      phone: client.phone || "",
      city: client.city || "",
      address: client.address || "",
      email: client.email || "",
      international: client.international ?? false,
      type: client.type ?? 'natural',
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
      const token = getToken();
      await axios.post(
        `${API_URL}/clients/create`,
        {
          name: clientForm.name,
          lawyers: clientForm.lawyers,
          permanent: clientForm.permanent,
          monthly_limit_hours: 0,
          nit: clientForm.nit,
          phone: clientForm.phone,
          city: clientForm.city,
          address: clientForm.address,
          email: clientForm.email,
          international: clientForm.international,
          type: clientForm.type,
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
      const token = getToken();
      const updateData = {
        id: clientModal.clientId,
        name: clientForm.name,
        lawyers: clientForm.lawyers || [],
        permanent: clientForm.permanent,
        monthly_limit_hours: 0,
        nit: clientForm.nit,
        phone: clientForm.phone,
        city: clientForm.city,
        address: clientForm.address,
        email: clientForm.email,
        international: clientForm.international,
        type: clientForm.type,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'international' && e.target instanceof HTMLInputElement && e.target.type === 'checkbox') {
      setClientForm(prev => ({ ...prev, international: (e.target as HTMLInputElement).checked }));
    } else if (name === 'type') {
      setClientForm(prev => ({ ...prev, type: value as 'natural' | 'juridica' }));
    } else {
      setClientForm(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleLawyerSelection = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions).map(option => parseInt(option.value));
    setClientForm(prev => ({ ...prev, lawyers: selectedOptions }));
  };

  const togglePermanent = () => {
    setClientForm(prev => ({ ...prev, permanent: !prev.permanent }));
  };

  // Add search functionality
  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return (
      client.name.toLowerCase().includes(searchLower) ||
      (client.nit && client.nit.toLowerCase().includes(searchLower)) ||
      (client.phone && client.phone.toLowerCase().includes(searchLower)) ||
      (client.email && client.email.toLowerCase().includes(searchLower)) ||
      (client.city && client.city.toLowerCase().includes(searchLower))
    );
  });

  // Update pagination calculations to use filtered clients
  const totalPages = Math.ceil(filteredClients.length / itemsPerPage);
  const paginatedClients = filteredClients.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // Keep page input synced with current page
  useEffect(() => {
    setPageInput(String(currentPage || 1));
  }, [currentPage]);

  const handlePageJump = () => {
    if (totalPages === 0) return;
    const parsed = parseInt(pageInput, 10);
    if (isNaN(parsed)) return;
    const clamped = Math.max(1, Math.min(parsed, totalPages));
    setCurrentPage(clamped);
  };

  const handleRowClick = (clientId: number) => {
    setExpandedClientId(prevId => (prevId === clientId ? null : clientId));
  };

  return (
    <div className="p-6 text-black shadow-lg rounded-lg bg-white">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Gestión de Clientes</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => {
              setIsLoading(true);
              Promise.all([fetchClients(), fetchClientUserRelationships()]).finally(() => setIsLoading(false));
            }}
            className="flex items-center bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
            title="Actualizar lista de clientes"
          >
            <FontAwesomeIcon icon={faRotate} className="mr-2" />
            Actualizar
          </button>
          <button 
            onClick={openCreateClientModal}
            className="flex items-center bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            <FontAwesomeIcon icon={faPlus} className="mr-2" />
            Nuevo Cliente
          </button>
        </div>
      </div>
      
      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar cliente por nombre, NIT, teléfono, email o ciudad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute left-3 top-2.5 text-gray-400">
            <FontAwesomeIcon icon={faSearch} />
          </div>
        </div>
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
                  {/* Removed NIT and Contacto headers */}
                  <th className="border-b border-black p-2 text-left">Abogados Asignados</th>
                  <th className="border-b border-black p-2 text-left">Asesoría Permanente</th>
                  <th className="p-2 text-left">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedClients.map((client) => (
                  <React.Fragment key={client.id}>
                    <tr
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleRowClick(client.id)}
                    >
                      <td className="border-b border-black p-2">{client.name}</td>
                      {/* Removed NIT and Contacto cells */}
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
                                    Abogado Desvinculado
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
                      <td className="p-2 flex space-x-2">
                        {/* Stop propagation to prevent row click when clicking buttons */}
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditClientModal(client); }}
                          className="flex items-center text-blue-600 hover:text-blue-800 transition"
                          title="Editar Cliente"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); openDeleteConfirmation(client); }}
                          className="text-red-600 hover:text-red-800 transition"
                          title="Eliminar Cliente"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                    {/* Expanded Row for Details */}
                    {expandedClientId === client.id && (
                      <tr className="bg-gray-100">
                        <td colSpan={5} className="p-4 border-b border-black"> {/* Adjusted colSpan */}
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><span className="font-semibold">NIT:</span> {client.nit || "-"}</p>
                              <p><span className="font-semibold">Teléfono:</span> {client.phone || "-"}</p>
                              <p><span className="font-semibold">Email:</span> {client.email || "-"}</p>
                              <p><span className="font-semibold">Internacional:</span> {client.international ? 'Sí' : 'No'}</p>
                              <p><span className="font-semibold">Tipo:</span> {client.type === 'juridica' ? 'Jurídica' : 'Natural'}</p>
                            </div>
                            <div>
                              <p><span className="font-semibold">Ciudad:</span> {client.city || "-"}</p>
                              <p><span className="font-semibold">Dirección:</span> {client.address || "-"}</p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex justify-between items-center mt-4">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
            >
              Anterior
            </button>
            <div className="flex items-center gap-2">
              <span className="text-gray-700">Página {currentPage} de {totalPages}</span>
              <input
                type="number"
                min={1}
                max={Math.max(1, totalPages)}
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePageJump(); }}
                disabled={totalPages === 0}
                className="w-20 p-2 border rounded text-black"
                placeholder="Ir a..."
              />
              <button
                onClick={handlePageJump}
                disabled={totalPages === 0}
                className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                Ir
              </button>
            </div>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 transition disabled:opacity-50"
            >
              Siguiente
            </button>
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
                    
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="international" className="block text-sm font-medium mb-1">
                        Internacional:
                      </label>
                      <input
                        id="international"
                        name="international"
                        type="checkbox"
                        checked={clientForm.international}
                        onChange={handleInputChange}
                        className="mr-2"
                      />
                      <span>{clientForm.international ? 'Sí' : 'No'}</span>
                    </div>
                    <div>
                      <label htmlFor="type" className="block text-sm font-medium mb-1">
                        Tipo de Cliente:
                      </label>
                      <select
                        id="type"
                        name="type"
                        value={clientForm.type}
                        onChange={handleInputChange}
                        className="border p-2 text-black rounded w-full"
                      >
                        <option value="natural">Natural</option>
                        <option value="juridica">Jurídica</option>
                      </select>
                    </div>
                    
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
