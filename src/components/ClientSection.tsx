import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTrash } from "@fortawesome/free-solid-svg-icons";

type ClientData = {
  id: number;
  name: string;
  color: string; 
};


const DEFAULT_COLOR = "#3b82f6"; 

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ClientSection() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [newClient, setNewClient] = useState({ name: "", color: DEFAULT_COLOR });
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editingClient, setEditingClient] = useState<Partial<ClientData>>({});
  const [error, setError] = useState<string | null>(null);

  const getToken = useCallback(() => {
    return document.cookie
      .split("; ")
      .find((row) => row.startsWith("token="))
      ?.split("=")[1] || "";
  }, []);

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

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreateClient = async () => {
    try {
      if (!newClient.name.trim()) {
        setError("El nombre del cliente no puede estar vacío");
        return;
      }

      const token = getToken();
      await axios.post(
        `${API_URL}/clients/create`,
        { 
          name: newClient.name,
          color: newClient.color 
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewClient({ name: "", color: DEFAULT_COLOR });
      setError(null);
      fetchClients();
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

      const token = getToken();
      
      // Asegurarse de que enviamos un objeto con la estructura correcta
      const updateData = {
        id: editingClientId,
        name: editingClient.name,
        color: editingClient.color || DEFAULT_COLOR
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
      
      fetchClients();
      setEditingClientId(null);
      setEditingClient({});
      setError(null);
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

  const handleDeleteClient = async (clientId: number) => {
    try {
      const token = getToken();
      await axios.delete(`${API_URL}/clients/delete_client`, {
        data: { id: clientId },
        headers: { Authorization: `Bearer ${token}` },
      });
      setClients(clients.filter(client => client.id !== clientId));
      setError(null);
    } catch (error) {
      console.error("Error al eliminar el cliente:", error);
      if (axios.isAxiosError(error) && error.response) {
        setError(`Error al eliminar: ${error.response.data.message || error.message}`);
      } else {
        setError("Error al eliminar el cliente");
      }
    }
  };

  const startEditingClient = (client: ClientData) => {
    setEditingClientId(client.id);
    setEditingClient({ 
      name: client.name, 
      color: client.color || DEFAULT_COLOR 
    });
    setError(null);
  };

  return (
    <div className="p-6 text-black shadow-lg rounded-lg bg-white">
      <h2 className="text-lg font-semibold mb-3">Gestión de Clientes</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
        </div>
      )}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <input
          type="text"
          placeholder="Nombre del Cliente"
          value={newClient.name}
          onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
          className="border p-2 text-black rounded"
        />
        <div className="flex items-center space-x-2">
          <label htmlFor="new-client-color" className="text-sm font-medium">
            Color:
          </label>
          <input
            id="new-client-color"
            type="color"
            value={newClient.color}
            onChange={(e) => setNewClient({ ...newClient, color: e.target.value })}
            className="h-10 w-16 cursor-pointer border rounded"
          />
        </div>
        <button 
          onClick={handleCreateClient} 
          className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          Crear Cliente
        </button>
      </div>

      <table className="w-full border border-black rounded-lg overflow-hidden shadow-md">
        <thead className="bg-gray-100">
          <tr>
            <th className="border-b border-black p-2 text-left">Nombre</th>
            <th className="border-b border-black p-2 text-left">Color</th>
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
                    className="border p-1 text-black rounded"
                  />
                ) : (
                  client.name
                )}
              </td>
              <td className="border-b border-black p-2">
                {editingClientId === client.id ? (
                  <input
                    type="color"
                    value={editingClient.color ?? DEFAULT_COLOR}
                    onChange={(e) => setEditingClient({ ...editingClient, color: e.target.value })}
                    className="h-10 w-16 cursor-pointer border rounded"
                  />
                ) : (
                  <div className="flex items-center space-x-2">
                    <div 
                      className="h-6 w-6 rounded-full border border-gray-300" 
                      style={{ backgroundColor: client.color || DEFAULT_COLOR }}
                    ></div>
                    <span>{client.color || "No color"}</span>
                  </div>
                )}
              </td>
              <td className="border-t p-2 space-x-2">
                {editingClientId === client.id ? (
                  <button onClick={handleUpdateClient} className="bg-blue-800 text-white p-2 rounded hover:bg-blue-700 transition">
                    <FontAwesomeIcon icon={faSave} />
                  </button>
                ) : (
                  <button onClick={() => startEditingClient(client)} className="text-blue-600 hover:text-blue-800 transition">
                    Editar
                  </button>
                )}
                <button onClick={() => handleDeleteClient(client.id)} className="bg-red-800 text-white p-2 rounded hover:bg-red-700 transition">
                  <FontAwesomeIcon icon={faTrash} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
