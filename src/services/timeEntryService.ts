import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface TimeEntryCreate {
    task_id: number;
    start_time: string;
    end_time: string;
}

export interface TimeEntryUpdate {
    start_time?: string;
    end_time?: string;
}

export interface TimeEntryResponse {
    id: number;
    task_id: number;
    user_id: number;
    start_time: string;
    end_time: string;
    duration: number;
}

export interface DateRangeRequest {
    start_date: string;
    end_date: string;
}

const getToken = () => {
    return document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1] || "";
};

// Función que preserva la zona horaria local al formatear fechas para la API
// En lugar de usar toISOString() que convierte a UTC, usamos un formato que preserva la zona horaria
const formatDateForAPI = (date: Date): string => {
    // Obtener el offset de la zona horaria en minutos
    const tzOffset = date.getTimezoneOffset();
    
    // Crear una nueva fecha ajustada para preservar la hora local al convertirla a ISO
    const adjustedDate = new Date(date.getTime() - tzOffset * 60000);
    
    // Formatear como ISO pero eliminar la 'Z' al final para evitar la interpretación UTC
    return adjustedDate.toISOString().slice(0, -1);
};

export const timeEntryService = {
    // Create a new time entry
    create: async (entry: { task_id: number; start_time: Date | string; end_time: Date | string }): Promise<TimeEntryResponse> => {
        const token = getToken();
        
        // Formateamos las fechas en formato ISO para enviar al backend
        const formattedEntry: TimeEntryCreate = {
            task_id: entry.task_id,
            start_time: entry.start_time instanceof Date ? formatDateForAPI(entry.start_time) : entry.start_time,
            end_time: entry.end_time instanceof Date ? formatDateForAPI(entry.end_time) : entry.end_time
        };
        
        const response = await axios.post(
            `${API_URL}/timeEntry/create`,
            formattedEntry,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    },

    // Get all time entries
    getAllTimeEntries: async (): Promise<TimeEntryResponse[]> => {
        const token = getToken();
        const response = await axios.get(
            `${API_URL}/timeEntry/get_all_time_entries`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    },

    // Get time entries for a specific date range
    getTimeEntriesByDateRange: async (startDate: Date, endDate: Date): Promise<TimeEntryResponse[]> => {
        const token = getToken();

        // Format dates for API
        const formattedRequest: DateRangeRequest = {
            start_date: formatDateForAPI(startDate),
            end_date: formatDateForAPI(endDate)
        };

        console.log(`📅 Fetching time entries from ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
        
        const response = await axios.post(
            `${API_URL}/timeEntry/get_all_time_entries`,
            formattedRequest,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        console.log(`✅ Received ${response.data.length} time entries for the date range`);
        return response.data;
    },

    // Get a specific time entry
    getTimeEntry: async (entryId: number): Promise<TimeEntryResponse> => {
        const token = getToken();
        const response = await axios.get(
            `${API_URL}/timeEntry/get_time_entry/${entryId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    },

    // Update a time entry
    updateTimeEntry: async (entryId: number, updates: { start_time?: Date | string; end_time?: Date | string }): Promise<TimeEntryResponse> => {
        const token = getToken();
        
        // Formateamos las fechas si existen
        const formattedUpdates: TimeEntryUpdate = {};
        if (updates.start_time) {
            formattedUpdates.start_time = updates.start_time instanceof Date ? formatDateForAPI(updates.start_time) : updates.start_time;
        }
        if (updates.end_time) {
            formattedUpdates.end_time = updates.end_time instanceof Date ? formatDateForAPI(updates.end_time) : updates.end_time;
        }
        
        const response = await axios.put(
            `${API_URL}/timeEntry/update/${entryId}`,
            formattedUpdates,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return response.data;
    },

    // Delete a time entry
    deleteTimeEntry: async (entryId: number): Promise<void> => {
        const token = getToken();
        await axios.delete(
            `${API_URL}/timeEntry/delete/${entryId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
    }
};

export default timeEntryService;
