import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// Get token from cookies
const getToken = (): string => {
  if (typeof document === 'undefined') return "";
  
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith("token="))
    ?.split("=")[1] || "";
};

// Define a more complete Client interface based on the API response
export interface Client {
  id: number;
  name: string;
  permanent?: boolean;
  monthly_limit_hours?: number;
  total_time?: number;
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
  [key: string]: any;
}

// Client cache to avoid redundant API calls - using numbers as keys
let clientCache: Record<number, Client | null> = {};

const clientService = {
  // Clear the cache (useful when you want to force a refresh)
  clearCache: () => {
    console.log('🧹 Clearing client cache');
    clientCache = {};
  },

  // Get all clients with improved handling of the get_clients_admin endpoint
  getAllClients: async (): Promise<Client[]> => {
    const token = getToken();
    try {
      console.log('🔍 Fetching all clients from admin endpoint');
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
        console.error('❌ Unexpected response format:', response.data);
        return [];
      }
      
      console.log(`✅ Received ${response.data.length} clients from API`);
      
      // Log the first few clients to inspect their structure
      if (response.data.length > 0) {
        console.log('📋 Sample client response:', JSON.stringify(response.data.slice(0, 3)));
      }
      
      const clients = response.data.map((client: ClientResponse) => {
        // Create a standardized client object
        const name = client.name || client.nombre || client.client_name || `Cliente ${client.id}`;
        console.log(`🔄 Processing client ID=${client.id}, Name=${name}`);
        
        const clientObj: Client = {
          id: client.id,
          name: name,
          permanent: client.permanent,
          monthly_limit_hours: client.monthly_limit_hours,
          total_time: client.total_time
        };
        
        // Update cache with this client - using number as key
        clientCache[client.id] = clientObj;
        console.log(`💾 Added client to cache: ID=${client.id}, Name=${name}`);
        
        return clientObj;
      });
      
      console.log(`✅ Processed ${clients.length} clients, cache now has ${Object.keys(clientCache).length} entries`);
      console.log('🔑 Cache keys:', Object.keys(clientCache));
      
      return clients;
    } catch (error) {
      console.error('❌ Error fetching clients:', error);
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
      console.log(`🔍 Client ${clientIdNum} found in cache:`, clientCache[clientIdNum]);
      return clientCache[clientIdNum];
    }
    
    const token = getToken();
    try {
      console.log(`🔍 Fetching client with ID: ${clientId} from API`);
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
        console.error('❌ Unexpected response format:', response.data);
        // Cache the null result to avoid repeated failed lookups
        clientCache[clientIdNum] = null;
        return null;
      }
      
      const client = response.data;
      console.log(`✅ Received client data from API:`, JSON.stringify(client));
      
      const name = client.name || client.nombre || client.client_name || `Cliente ${client.id}`;
      const clientObj: Client = {
        id: client.id,
        name: name,
        permanent: client.permanent,
        monthly_limit_hours: client.monthly_limit_hours,
        total_time: client.total_time
      };
      
      // Update cache with this client
      clientCache[clientIdNum] = clientObj;
      console.log(`💾 Added client to cache: ID=${client.id}, Name=${name}`);
      
      return clientObj;
    } catch (error) {
      console.error(`❌ Error fetching client with ID ${clientId}:`, error);
      // Cache the null result to avoid repeated failed lookups
      clientCache[clientIdNum] = null;
      return null;
    }
  },
  
  // Get client name (convenience method)
  getClientName: async (clientId: number | string): Promise<string> => {
    console.log(`🔍 getClientName called with clientId: ${clientId}`);
    
    if (!clientId) {
      console.log('⚠️ Empty clientId provided to getClientName');
      return 'Cliente no asignado';
    }
    
    const client = await clientService.getClient(clientId);
    const result = client ? client.name : `Cliente ${clientId}`;
    console.log(`✅ getClientName result for ID ${clientId}: ${result}`);
    return result;
  },
  
  // Get clients as options for dropdown selection
  getClientOptions: async (): Promise<{id: number, label: string}[]> => {
    console.log('🔍 Getting client options for dropdown');
    const clients = await clientService.getAllClients();
    const options = clients.map(client => ({
      id: client.id,
      label: client.name
    }));
    console.log(`✅ Created ${options.length} client options for dropdown`);
    return options;
  },
  
  // Batch get clients - efficiently fetch multiple clients at once
  getClientsBatch: async (clientIds: (number | string)[]): Promise<Record<number, Client>> => {
    console.log(`🔍 Batch getting clients for IDs: ${clientIds.join(', ')}`);
    
    // Filter out IDs we already have in cache
    const uniqueIds = [...new Set(clientIds.map(id => typeof id === 'string' ? Number(id) : id))];
    const idsToFetch = uniqueIds.filter(id => clientCache[id] === undefined);
    
    console.log(`🔍 Cache status: ${uniqueIds.length} unique IDs, ${idsToFetch.length} need fetching`);
    
    // If all clients are in cache, return immediately
    if (idsToFetch.length === 0) {
      console.log('✅ All requested clients found in cache');
      const result: Record<number, Client> = {};
      uniqueIds.forEach(id => {
        if (clientCache[id]) result[id] = clientCache[id];
      });
      return result;
    }
    
    // Otherwise, fetch all clients and update cache
    console.log(`🔍 Fetching all clients to get the ${idsToFetch.length} missing ones`);
    await clientService.getAllClients();
    
    // Return requested clients from updated cache
    const result: Record<number, Client> = {};
    uniqueIds.forEach(id => {
      if (clientCache[id]) {
        result[id] = clientCache[id];
        console.log(`✅ Added client from cache to result: ID=${id}, Name=${clientCache[id].name}`);
      } else {
        console.warn(`⚠️ Client ID=${id} not found even after refresh`);
      }
    });
    
    console.log(`✅ Returning ${Object.keys(result).length} clients from batch request`);
    return result;
  }
};

export default clientService;
