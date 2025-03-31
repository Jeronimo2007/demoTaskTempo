import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface TimeEntryCreate {
    task_id: number;
    start_time: string;
    end_time: string;
    description: string;
}

export interface TimeEntryUpdate {
    start_time?: string;
    end_time?: string;
    description?: string;
}

export interface TimeEntryResponse {
    id: number;
    task_id: number;
    user_id: number;
    start_time: string;
    end_time: string;
    duration: number;
    description?: string;
    facturado: boolean;
}


const getToken = () => {
    return document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1] || "";
};

// Updated date formatting function to match backend expected format
const formatDateForAPI = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
};

export const timeEntryService = {
    // Create a new time entry
    create: async (entry: { 
      task_id: number; 
      start_time: Date | string; 
      end_time: Date | string; 
      description: string 
    }): Promise<TimeEntryResponse> => {
        const token = getToken();
        
        // Formateamos las fechas en formato ISO para enviar al backend
        const formattedEntry: TimeEntryCreate = {
            task_id: entry.task_id,
            start_time: entry.start_time instanceof Date ? formatDateForAPI(entry.start_time) : entry.start_time,
            end_time: entry.end_time instanceof Date ? formatDateForAPI(entry.end_time) : entry.end_time,
            description: entry.description
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

        // Format dates for API in the expected format
        const start_date = formatDateForAPI(startDate);
        const end_date = formatDateForAPI(endDate);

        console.log(`📅 Fetching time entries from ${start_date} to ${end_date}`);
        
        try {
            const response = await axios.post(
                `${API_URL}/timeEntry/get_all_time_entries`,
                {
                    start_date: start_date,
                    end_date: end_date
                },
                {
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );
            
            console.log(`✅ Received ${response.data.length} time entries for the date range`);
            return response.data;
        } catch (error) {
            console.error('Error fetching time entries:', error);
            throw error;
        }
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
    updateTimeEntry: async (entryId: number, updates: { start_time?: Date | string; end_time?: Date | string; description?: string }): Promise<TimeEntryResponse> => {
        const token = getToken();
        
        // Formateamos las fechas si existen
        const formattedUpdates: TimeEntryUpdate = {};
        if (updates.start_time) {
            formattedUpdates.start_time = updates.start_time instanceof Date ? formatDateForAPI(updates.start_time) : updates.start_time;
        }
        if (updates.end_time) {
            formattedUpdates.end_time = updates.end_time instanceof Date ? formatDateForAPI(updates.end_time) : updates.end_time;
        }
        if (updates.description !== undefined) {
            formattedUpdates.description = updates.description;
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
