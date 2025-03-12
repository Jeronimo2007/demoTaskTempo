import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTrash } from "@fortawesome/free-solid-svg-icons";

type ClientData = {
  id: number;
  name: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export default function ClientSection() {
  const [clients, setClients] = useState<ClientData[]>([]);
  const [newClient, setNewClient] = useState({ name: "" });
  const [editingClientId, setEditingClientId] = useState<number | null>(null);
  const [editingClient, setEditingClient] = useState<Partial<ClientData>>({});

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
    } catch (error) {
      console.error("Error al obtener los clientes:", error);
    }
  }, [getToken]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleCreateClient = async () => {
    try {
      const token = getToken();
      await axios.post(
        `${API_URL}/clients/create`,
        { name: newClient.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setNewClient({ name: "" });
      fetchClients();
    } catch (error) {
      console.error("Error al crear el cliente:", error);
    }
  };

  const handleUpdateClient = async () => {
    if (editingClientId === null) return;

    try {
      const token = getToken();
      await axios.put(
        `${API_URL}/clients/update_client`,
        { id: editingClientId, name: editingClient.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchClients();
      setEditingClientId(null);
      setEditingClient({});
    } catch (error) {
      console.error("Error al actualizar el cliente:", error);
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
    } catch (error) {
      console.error("Error al eliminar el cliente:", error);
    }
  };

  const startEditingClient = (client: ClientData) => {
    setEditingClientId(client.id);
    setEditingClient({ name: client.name });
  };

  return (
    <div className="p-6 text-black shadow-lg rounded-lg bg-white">
      <h2 className="text-lg font-semibold mb-3">Gestión de Clientes</h2>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          placeholder="Nombre del Cliente"
          value={newClient.name}
          onChange={(e) => setNewClient({ name: e.target.value })}
          className="border p-2 text-black rounded"
        />
        <button onClick={handleCreateClient} className="bg-blue-800 text-white px-4 py-2 rounded hover:bg-blue-700 transition">
          Crear Cliente
        </button>
      </div>

      <table className="w-full border border-black rounded-lg overflow-hidden shadow-md">
        <thead className="bg-gray-100">
          <tr>
            <th className="border-b border-black p-2 text-left">Nombre</th>
            <th className="border-b border-black p-2 text-left">Acciones</th>
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
                    onChange={(e) => setEditingClient({ name: e.target.value })}
                    className="border p-1 text-black rounded"
                  />
                ) : (
                  client.name
                )}
              </td>
              <td className="border-t border-black p-2 space-x-2">
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