import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Get token from cookies
const getToken = (): string => {
  if (typeof document === 'undefined') return '';

  return (
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1] || ''
  );
};

// Define a more complete Client interface based on the API response
export interface Client {
  id: number;
  name: string;
  permanent?: boolean;
  monthly_limit_hours?: number;
  total_time?: number;
  nit?: string;
  phone?: string;
  city?: string;
  address?: string;
  email?: string;
  // Add other client properties as needed
}

// Define the API response interface
export interface ClientResponse {
  id: number;
  name?: string;
  nombre?: string;
  client_name?: string;
  permanent?: boolean;
  monthly_limit_hours?: number;
  total_time?: number;
  nit?: string;
  phone?: string;
  city?: string;
  address?: string;
  email?: string;
  [key: string]: string | number | boolean | undefined;  // Replace any with union type
}

// Define interfaces for create and update operations
export interface CreateClientData {
  name: string;
  permanent?: boolean;
  monthly_limit_hours?: number;
  nit?: string;
  phone?: string;
  city?: string;
  address?: string;
  email?: string;
}

export interface UpdateClientData {
  id: number;
  name?: string;
  permanent?: boolean;
  monthly_limit_hours?: number;
  nit?: string;
  phone?: string;
  city?: string;
  address?: string;
  email?: string;
}

// Client cache to avoid redundant API calls - using numbers as keys
let clientCache: Record<number, Client | null> = {};

const clientService = {
  // Clear the cache (useful when you want to force a refresh)
  clearCache: (): void => {
    clientCache = {};
  },

  // Create a new client with all the new fields
  createClient: async (clientData: CreateClientData): Promise<Client> => {
    const token = getToken();
    try {
      const response = await axios.post<ClientResponse>(
        `${API_URL}/clients/create`,
        clientData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data || !response.data.id) {
        throw new Error('Invalid response from server');
      }

      const client = response.data;

      const name =
        client.name ||
        client.nombre ||
        client.client_name ||
        `Cliente ${client.id}`;
      const clientObj: Client = {
        id: client.id,
        name,
        permanent: client.permanent,
        monthly_limit_hours: client.monthly_limit_hours,
        total_time: client.total_time,
        nit: client.nit,
        phone: client.phone,
        city: client.city,
        address: client.address,
        email: client.email,
      };

      // Update cache with this new client
      clientCache[client.id] = clientObj;

      return clientObj;
    } catch (error) {
      throw error;
    }
  },

  // Update an existing client with all the new fields
  updateClient: async (clientData: UpdateClientData): Promise<Client> => {
    const token = getToken();
    try {
      const response = await axios.put<ClientResponse>(
        `${API_URL}/clients/update/${clientData.id}`,
        clientData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data || !response.data.id) {
        throw new Error('Invalid response from server');
      }

      const client = response.data;

      const name =
        client.name ||
        client.nombre ||
        client.client_name ||
        `Cliente ${client.id}`;
      const clientObj: Client = {
        id: client.id,
        name,
        permanent: client.permanent,
        monthly_limit_hours: client.monthly_limit_hours,
        total_time: client.total_time,
        nit: client.nit,
        phone: client.phone,
        city: client.city,
        address: client.address,
        email: client.email,
      };

      // Update cache with this updated client
      clientCache[client.id] = clientObj;

      return clientObj;
    } catch (error) {
      throw error;
    }
  },

  // Get all clients with improved handling of the get_clients_admin endpoint
  getAllClients: async (): Promise<Client[]> => {
    const token = getToken();
    try {
      const response = await axios.get<ClientResponse[]>(
        `${API_URL}/clients/get_clients_admin`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!Array.isArray(response.data)) {
        return [];
      }
      
      
      // Log the first few clients to inspect their structure
      if (response.data.length > 0) {
      }
      
      const clients = response.data.map((client: ClientResponse) => {
        // Create a standardized client object
        const name = client.name || client.nombre || client.client_name || `Cliente ${client.id}`;
        
        const clientObj: Client = {
          id: client.id,
          name: name,
          permanent: client.permanent,
          monthly_limit_hours: client.monthly_limit_hours,
          total_time: client.total_time,
          nit: client.nit,
          phone: client.phone,
          city: client.city,
          address: client.address,
          email: client.email
        };
        
        // Update cache with this client - using number as key
        clientCache[client.id] = clientObj;
        
        return clientObj;
      });
      
      
      return clients;
    } catch (error) {
      // Return empty array instead of throwing to prevent app crashes
      return [];
    }
  },

  // Get a specific client with caching
  getClient: async (clientId: number | string): Promise<Client | null> => {
    // Convert to number if it's a string
    const clientIdNum = typeof clientId === 'string' ? Number(clientId) : clientId;
    
    // Check cache first
    if (clientCache[clientIdNum] !== undefined) {
      return clientCache[clientIdNum];
    }
    
    const token = getToken();
    try {
      const response = await axios.get<ClientResponse>(
        `${API_URL}/clients/get_client/${clientId}`,
        { 
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      if (!response.data || !response.data.id) {
        // Cache the null result to avoid repeated failed lookups
        clientCache[clientIdNum] = null;
        return null;
      }
      
      const client = response.data;
      
      const name = client.name || client.nombre || client.client_name || `Cliente ${client.id}`;
      const clientObj: Client = {
        id: client.id,
        name: name,
        permanent: client.permanent,
        monthly_limit_hours: client.monthly_limit_hours,
        total_time: client.total_time,
        nit: client.nit,
        phone: client.phone,
        city: client.city,
        address: client.address,
        email: client.email
      };
      
      // Update cache with this client
      clientCache[clientIdNum] = clientObj;
      
      return clientObj;
    } catch (error) {
      // Cache the null result to avoid repeated failed lookups
      clientCache[clientIdNum] = null;
      return null;
    }
  },
  
  // Get client name (convenience method)
  getClientName: async (clientId: number | string): Promise<string> => {
    
    if (!clientId) {
      return 'Cliente no asignado';
    }
    
    const client = await clientService.getClient(clientId);
    const result = client ? client.name : `Cliente ${clientId}`;
    return result;
  },
  
  // Get clients as options for dropdown selection
  getClientOptions: async (): Promise<{id: number, label: string}[]> => {
    const clients = await clientService.getAllClients();
    const options = clients.map(client => ({
      id: client.id,
      label: client.name
    }));
    return options;
  },
  
  // Batch get clients - efficiently fetch multiple clients at once
  getClientsBatch: async (clientIds: (number | string)[]): Promise<Record<number, Client>> => {
    
    // Filter out IDs we already have in cache
    const uniqueIds = [...new Set(clientIds.map(id => typeof id === 'string' ? Number(id) : id))];
    const idsToFetch = uniqueIds.filter(id => clientCache[id] === undefined);
    
    
    // If all clients are in cache, return immediately
    if (idsToFetch.length === 0) {
      const result: Record<number, Client> = {};
      uniqueIds.forEach(id => {
        if (clientCache[id]) result[id] = clientCache[id];
      });
      return result;
    }
    
    // Otherwise, fetch all clients and update cache
    await clientService.getAllClients();
    
    // Return requested clients from updated cache
    const result: Record<number, Client> = {};
    uniqueIds.forEach(id => {
      if (clientCache[id]) {
        result[id] = clientCache[id];
      } else {
      }
    });
    
    return result;
  }
};

export const getClientName = async (clientId: number): Promise<string> => {
  try {
    const response = await axios.get<ClientResponse>(`${API_URL}/clients/${clientId}`);
    return response.data.name || response.data.nombre || response.data.client_name || `Cliente ${clientId}`;
  } catch (error) {
    return `Cliente ${clientId}`;
  }
};

export default clientService;
