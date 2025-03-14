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

const getToken = () => {
    return document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="))
        ?.split("=")[1] || "";
};

export const timeEntryService = {
    // Create a new time entry
    create: async (entry: TimeEntryCreate): Promise<TimeEntryResponse> => {
        const token = getToken();
        const response = await axios.post(
            `${API_URL}/timeEntry/create`,
            entry,
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
    updateTimeEntry: async (entryId: number, updates: TimeEntryUpdate): Promise<TimeEntryResponse> => {
        const token = getToken();
        const response = await axios.put(
            `${API_URL}/timeEntry/update/${entryId}`,
            updates,
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