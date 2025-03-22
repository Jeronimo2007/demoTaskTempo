import axios from 'axios';

// Definición de tipos
export interface TimeEntry {
  id: string;
  description: string;
  duration: number;
  date: string;
  // Otros campos relevantes para tu aplicación
}

// Clase de servicio para manejar operaciones relacionadas con time entries
export class TimeEntriesService {
  private baseUrl: string;

  constructor(baseUrl = '/api') {
    this.baseUrl = baseUrl;
  }

  /**
   * Obtiene los time entries para un rango de fechas específico
   * @param startDate Fecha de inicio del rango
   * @param endDate Fecha final del rango
   * @returns Promise con el array de time entries
   */
  async getTimeEntries(startDate: Date, endDate: Date): Promise<TimeEntry[]> {
    try {
      // Enviar las fechas en formato ISO para mantener la información de datetime
      const params: {
        start_date?: string;
        end_date?: string;
      } = {};
      
      if (startDate) {
        params.start_date = startDate.toISOString();
      }
      
      if (endDate) {
        params.end_date = endDate.toISOString();
      }
      
      // Realizar la petición a la API con los parámetros de fecha
      const response = await axios.get(`${this.baseUrl}/time-entries`, {
        params
      });
      
      return response.data;
    } catch (error) {
      console.error('Error fetching time entries:', error);
      throw error;
    }
  }

  /**
   * Crea un nuevo time entry
   * @param timeEntry Datos del time entry a crear
   * @returns Promise con el time entry creado
   */
  async createTimeEntry(timeEntry: Omit<TimeEntry, 'id'>): Promise<TimeEntry> {
    try {
      const response = await axios.post(`${this.baseUrl}/time-entries`, timeEntry);
      return response.data;
    } catch (error) {
      console.error('Error creating time entry:', error);
      throw error;
    }
  }

  /**
   * Actualiza un time entry existente
   * @param id ID del time entry a actualizar
   * @param timeEntryData Datos actualizados
   * @returns Promise con el time entry actualizado
   */
  async updateTimeEntry(id: string, timeEntryData: Partial<TimeEntry>): Promise<TimeEntry> {
    try {
      const response = await axios.put(`${this.baseUrl}/time-entries/${id}`, timeEntryData);
      return response.data;
    } catch (error) {
      console.error('Error updating time entry:', error);
      throw error;
    }
  }

  /**
   * Elimina un time entry
   * @param id ID del time entry a eliminar
   * @returns Promise que se resuelve cuando la operación es exitosa
   */
  async deleteTimeEntry(id: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/time-entries/${id}`);
    } catch (error) {
      console.error('Error deleting time entry:', error);
      throw error;
    }
  }
}

// Exportar una instancia del servicio para uso directo
export const timeEntriesService = new TimeEntriesService();
