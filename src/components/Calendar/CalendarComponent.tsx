import React, { useState, useEffect } from 'react';
import { timeEntriesService, TimeEntry } from '../../services/timeEntriesService';

// Puedes importar aquí tu componente de calendario preferido
// import { Calendar } from 'tu-biblioteca-de-calendario';

const CalendarComponent: React.FC = () => {
  // Estado para almacenar los time entries
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  
  // Estado para el rango de fechas (inicializar con la semana actual)
  const [dateRange, setDateRange] = useState({
    startDate: getStartOfWeek(new Date()),
    endDate: getEndOfWeek(new Date())
  });
  
  // Estado para seguimiento de carga y errores
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Función para obtener el inicio de la semana
  function getStartOfWeek(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Ajustar cuando es domingo
    return new Date(d.setDate(diff));
  }
  
  // Función para obtener el fin de la semana
  function getEndOfWeek(date: Date): Date {
    const startOfWeek = getStartOfWeek(date);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    return endOfWeek;
  }
  
  // Función para cargar los time entries
  const loadTimeEntries = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Importante: Pasar las fechas al método getAllTimeEntries
      const entries = await timeEntriesService.getTimeEntries(
        dateRange.startDate,
        dateRange.endDate
      );
      setTimeEntries(entries);
    } catch (err) {
      setError('Error al cargar los time entries');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };
  
  // Cargar time entries cuando cambia el rango de fechas
  useEffect(() => {
    loadTimeEntries();
  }, [dateRange.startDate, dateRange.endDate]);
  
  // Función para manejar el cambio de semana
  const handleWeekChange = (newStartDate: Date) => {
    setDateRange({
      startDate: getStartOfWeek(newStartDate),
      endDate: getEndOfWeek(newStartDate)
    });
  };
  
  // Función para ir a la semana anterior
  const goToPreviousWeek = () => {
    const newStartDate = new Date(dateRange.startDate);
    newStartDate.setDate(newStartDate.getDate() - 7);
    handleWeekChange(newStartDate);
  };
  
  // Función para ir a la semana siguiente
  const goToNextWeek = () => {
    const newStartDate = new Date(dateRange.startDate);
    newStartDate.setDate(newStartDate.getDate() + 7);
    handleWeekChange(newStartDate);
  };
  
  return (
    <div className="calendar-container">
      <div className="calendar-controls">
        <button onClick={goToPreviousWeek}>Semana Anterior</button>
        <span>
          {dateRange.startDate.toLocaleDateString()} - {dateRange.endDate.toLocaleDateString()}
        </span>
        <button onClick={goToNextWeek}>Semana Siguiente</button>
      </div>
      
      {/* Aquí puedes incluir tu componente de calendario preferido */}
      {/* <Calendar
        // Propiedades específicas de tu componente de calendario
        onDateChange={handleWeekChange}
        // Más propiedades...
      /> */}
      
      {loading && <p>Cargando...</p>}
      {error && <p className="error">{error}</p>}
      
      <div className="time-entries-list">
        <h3>Time Entries</h3>
        {timeEntries.length === 0 ? (
          <p>No hay time entries para este periodo.</p>
        ) : (
          <ul>
            {timeEntries.map(entry => (
              <li key={entry.id}>
                <p><strong>Descripción:</strong> {entry.description}</p>
                <p><strong>Fecha:</strong> {new Date(entry.date).toLocaleDateString()}</p>
                <p><strong>Duración:</strong> {entry.duration} horas</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CalendarComponent;