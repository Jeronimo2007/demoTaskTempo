import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

export interface GroupCreatePayload {
  group_name: string;
  monthly_limit_hours: number;
  client_id: number;
  tasks: number[];
}

export interface GroupUpdatePayload {
  group_name: string;
  monthly_limit_hours: number;
  tasks: number[];
}

export interface Group {
  id?: number;
  group_name: string;
  monthly_limit_hours?: number;
  client_id?: number;
  client_name?: string;
  tasks: string[]; // For GET, tasks are titles
}

const getToken = (): string => {
  if (typeof document === 'undefined') return "";
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith('token='))
    ?.split('=')[1] || "";
};

const groupService = {
  createGroup: async (payload: GroupCreatePayload) => {
    const token = getToken();
    const response = await axios.post(
      `${API_URL}/groups/create_group`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
  updateGroup: async (groupId: number, payload: GroupUpdatePayload) => {
    const token = getToken();
    const response = await axios.put(
      `${API_URL}/groups/update_group_${groupId}`,
      payload,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
  getAllGroups: async (): Promise<Group[]> => {
    const token = getToken();
    const response = await axios.get(
      `${API_URL}/groups/get_all_groups`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
  getGroupsByUser: async (userId: number): Promise<Group[]> => {
    const token = getToken();
    const response = await axios.get(
      `${API_URL}/groups/get_groups?user_id=${userId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
  deleteGroup: async (groupId: number) => {
    const token = getToken();
    const response = await axios.delete(
      `${API_URL}/groups/delete_group_${groupId}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
};

export default groupService; 