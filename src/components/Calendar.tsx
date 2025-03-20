import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Calendar, momentLocalizer, SlotInfo, Event, EventPropGetter, View } from 'react-big-calendar';
import moment from 'moment';
import 'moment/locale/es'; // Importar la localización española de moment
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/Calendar.css';
import { TimeEntryResponse, timeEntryService } from '@/services/timeEntryService';
import { FaSync } from 'react-icons/fa';
import TimeEntryModal from './TimeEntryModal';
import TimeEntryDetailsModal from '@/components/TimeEntryDetailsModal';
import { useAuthStore } from '@/store/useAuthStore';

// Configurar moment para usar español
moment.locale('es');

const localizer = momentLocalizer(moment);

type Task = {
  id: number;
  title: string;
  status: string;
  due_date: string;
  client: string;
};

interface TimeEntryCalendarProps {
  apiTimeEntries: TimeEntryResponse[];
  tasks: Task[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onTimeEntryCreate?: (entry: { taskId: number; start_time: Date; end_time: Date }) => Promise<void>;
  // Props for user information
  userMap?: Record<number, string> | ((userId: number) => string); // Map of user_id to name or function to get name
  currentUserId?: number; // ID of the currently logged-in user
  // Optional prop to fetch users if userMap is not provided
  fetchUsers?: () => Promise<Record<number, string>>;
  // New prop for user color mapping
  userColorMap?: Record<number, string>;
}

// Tipo personalizado para nuestros eventos de calendario
interface CalendarEvent extends Event {
  id: string;
  title: string;
  start: Date;
  end: Date;
  color: string;
  resource: {
    task?: Task;
    entry: TimeEntryResponse;
    userId: number; // Añadimos el userId explícitamente para facilitar el acceso
  };
}

// Tipo para toolbar
interface ToolbarProps {
  date: Date;
  onNavigate: (action: 'PREV' | 'NEXT' | 'TODAY') => void;
  onView: (view: View) => void;
}

const TimeEntryCalendar: React.FC<TimeEntryCalendarProps> = ({ 
  apiTimeEntries, 
  tasks, 
  isLoading = false,
  onRefresh,
  onTimeEntryCreate,
  userMap: initialUserMap = {},
  currentUserId,
  fetchUsers,
  userColorMap = {} // Default to empty object if not provided
}) => {
  // Estado para el modal de creación de time entry
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{start: Date, end: Date} | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for the details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  // Estado para el mapa de usuarios (para mantener nombres)
  const [userMap, setUserMap] = useState<Record<number, string>>(
    typeof initialUserMap === 'function' ? {} : initialUserMap
  );
  const [loadingUsers, setLoadingUsers] = useState(false);
  
  // Obtener el usuario actual del store de autenticación
  const authUser = useAuthStore(state => state.user);
  const effectiveCurrentUserId = currentUserId || (authUser ? authUser.id : undefined);

  // Efecto para cargar los usuarios si es necesario
  useEffect(() => {
    const loadUsers = async () => {
      // Si ya tenemos un mapa de usuarios poblado, no necesitamos hacer nada
      if (Object.keys(userMap).length > 0) return;
      
      // Si no hay una función para obtener usuarios, no podemos cargarlos
      if (!fetchUsers) return;
      
      try {
        setLoadingUsers(true);
        const users = await fetchUsers();
        setUserMap(users);
      } catch (err) {
        console.error('Error al cargar información de usuarios:', err);
      } finally {
        setLoadingUsers(false);
      }
    };
    
    loadUsers();
  }, [fetchUsers, userMap]);

  // Función auxiliar para obtener nombre de usuario
  const getUserName = useCallback((userId: number): string => {
    // Si se proporcionó una función para obtener nombres de usuario, úsala
    if (typeof initialUserMap === 'function') {
      return initialUserMap(userId);
    }
    
    // Si es el usuario actual y tenemos su información en authUser
    if (userId === effectiveCurrentUserId && authUser) {
      return authUser.username || `Usuario ${userId}`;
    }
    
    // Si tenemos el nombre en el mapa de usuarios
    if (userMap[userId]) {
      return userMap[userId];
    }
    
    // Fallback a ID de usuario
    return `Usuario ${userId}`;
  }, [effectiveCurrentUserId, authUser, userMap, initialUserMap]);

  // Handler para selección de slot en el calendario
  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end
    });
    setShowModal(true);
  }, []);

  // Handler para cerrar el modal
  const handleCloseModal = useCallback(() => {
    setShowModal(false);
    setSelectedSlot(null);
    setError(null);
  }, []);

  // Handler para cerrar el modal de detalles
  const handleCloseDetailsModal = useCallback(() => {
    setShowDetailsModal(false);
    setSelectedEvent(null);
  }, []);

  // Handler for selecting an event (time entry)
  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  }, []);

  // Handler for deleting a time entry
  const handleDeleteTimeEntry = useCallback(async (entryId: number) => {
    try {
      await timeEntryService.deleteTimeEntry(entryId);
      
      // Refresh the calendar after successful deletion
      if (onRefresh) {
        onRefresh();
      }
    } catch (error) {
      console.error("Error deleting time entry:", error);
      throw error;
    }
  }, [onRefresh]);

  // Handler para crear una nueva entrada de tiempo
  const handleCreateTimeEntry = useCallback(async (data: { taskId: number, start: Date, end: Date }) => {
    if (onTimeEntryCreate) {
      setCreating(true);
      setError(null);
      
      try {
        await onTimeEntryCreate({
          taskId: data.taskId,
          start_time: data.start,
          end_time: data.end
        });
        
        // Cerrar el modal después de crear con éxito
        setShowModal(false);
        setSelectedSlot(null);
        
        // Refrescar las entradas de tiempo si hay un callback
        if (onRefresh) {
          onRefresh();
        }
      } catch (err) {
        console.error('Error al crear time entry:', err);
        setError('Error al guardar la entrada de tiempo. Inténtalo de nuevo.');
      } finally {
        setCreating(false);
      }
    }
  }, [onTimeEntryCreate, onRefresh]);

  // Función para parsear correctamente las fechas de strings ISO a objetos Date
  // preservando la zona horaria local
  const parseISOtoLocalDate = useCallback((isoString: string): Date => {
    // Parsear la fecha ISO a objeto Date
    return new Date(isoString);
  }, []);

  // Para depuración - mostrar el userColorMap en la consola
  useEffect(() => {
    console.log('userColorMap:', userColorMap);
  }, [userColorMap]);

  // Convert time entries from API to calendar events
  const events = useMemo(() => {
    return apiTimeEntries.map((entry) => {
      const task = tasks.find((task) => task.id === entry.task_id);
      
      // Use user color from userColorMap if available, otherwise use default color
      const userId = entry.user_id;
      const eventColor = userColorMap[userId] || '#cccccc';
      
      // Para depuración
      console.log(`Entry ${entry.id} - User ${userId} - Color: ${eventColor}`);
      
      return {
        id: `api-${entry.id}`,
        title: task ? task.title : 'Tarea sin asignar',
        start: parseISOtoLocalDate(entry.start_time),
        end: parseISOtoLocalDate(entry.end_time),
        color: eventColor,
        resource: { 
          task, 
          entry,
          userId // Añadimos el userId explícitamente
        }
      };
    });
  }, [apiTimeEntries, tasks, parseISOtoLocalDate, userColorMap]);

  // Customize event appearance
  const eventPropGetter: EventPropGetter<CalendarEvent> = useCallback((event) => {
    const isCurrentUserEntry = event.resource.userId === effectiveCurrentUserId;
    
    // Para depuración
    console.log(`Rendering event ${event.id} with color ${event.color}`);
    
    return {
      className: '',
      style: {
        backgroundColor: event.color || '#cccccc',
        borderRadius: '4px',
        opacity: isCurrentUserEntry ? 1 : 0.8, // Highlight current user's entries
        color: '#fff',
        border: '0px',
        display: 'block',
        fontWeight: 'bold',
        boxShadow: isCurrentUserEntry ? '0 2px 6px rgba(0,0,0,0.2)' : '0 2px 4px rgba(0,0,0,0.1)',
        cursor: 'pointer',
      },
    };
  }, [effectiveCurrentUserId]);

  // Custom event component to show more details
  const EventComponent = useCallback(({ event }: { event: CalendarEvent }) => {
    const task = event.resource.task;
    const entry = event.resource.entry;
    // Calculate duration in seconds
    const startTime = new Date(entry.start_time).getTime();
    const endTime = new Date(entry.end_time).getTime();
    const duration = (endTime - startTime) / 1000;
    
    // Format duration in hours and minutes
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const durationString = hours > 0 
      ? `${hours}h ${minutes}m`
      : `${minutes}m`;
    
    // Get creator name using our helper function
    const creator = getUserName(entry.user_id);
    
    return (
      <div>
        <strong>{event.title}</strong>
        <div style={{ fontSize: '0.8em' }}>
          {task ? `Cliente: ${task.client}` : ''}
        </div>
        <div style={{ fontSize: '0.8em' }}>
          {durationString}
        </div>
        <div style={{ fontSize: '0.8em', fontStyle: 'italic' }}>
          Por: {creator}
        </div>
      </div>
    );
  }, [getUserName]);

  // Custom toolbar component - removed month view button
  const CustomToolbar = useCallback(({ date, onNavigate }: ToolbarProps) => {
    const goToBack = () => {
      onNavigate('PREV');
    };

    const goToNext = () => {
      onNavigate('NEXT');
    };

    const goToCurrent = () => {
      onNavigate('TODAY');
    };

    const handleRefresh = () => {
      if (onRefresh) {
        onRefresh();
      }
    };

    const label = () => {
      const dateObj = moment(date);
      return (
        <span><b>{dateObj.format('MMMM')}</b><span> {dateObj.format('YYYY')}</span></span>
      );
    };

    return (
      <div className="rbc-toolbar custom-toolbar">
        <div className="toolbar-label">
          {label()}
        </div>
        <div className="toolbar-nav">
          <button type="button" onClick={goToBack} className="toolbar-btn">
            &lt;
          </button>
          <button type="button" onClick={goToCurrent} className="toolbar-btn today-btn">
            Hoy
          </button>
          <button type="button" onClick={goToNext} className="toolbar-btn">
            &gt;
          </button>
        </div>
        <div className="toolbar-views">
          {/* Only week view is available */}
          <button 
            type="button" 
            className="toolbar-btn active"
          >
            Semana
          </button>
          {onRefresh && (
            <button 
              type="button" 
              onClick={handleRefresh} 
              className="toolbar-btn refresh-btn"
              disabled={isLoading || loadingUsers}
            >
              <FaSync className={(isLoading || loadingUsers) ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>
    );
  }, [isLoading, loadingUsers, onRefresh]);

  // Definir formatos personalizados para el calendario en español
  const formats = useMemo(() => ({
    dayFormat: 'ddd DD', // Formato para los días: Lun 01, Mar 02, etc.
    dayHeaderFormat: 'dddd DD/MM', // Formato para los encabezados de días: Lunes 01/01
    dayRangeHeaderFormat: ({ start, end }: { start: Date, end: Date }) => 
      `${moment(start).format('DD MMM')} - ${moment(end).format('DD MMM')}`,
    monthHeaderFormat: 'MMMM YYYY', // Formato para el encabezado del mes: Enero 2023
    weekdayFormat: 'dddd', // Formato para los días de la semana: Lunes, Martes, etc.
  }), []);

  // Calendar messages
  const messages = useMemo(() => ({
    today: 'Hoy',
    previous: 'Anterior',
    next: 'Siguiente',
    week: 'Semana',
    day: 'Día',
    date: 'Fecha',
    time: 'Hora',
    event: 'Evento',
    allDay: 'Todo el día',
    work_week: 'Semana laboral',
    yesterday: 'Ayer',
    tomorrow: 'Mañana',
    noEventsInRange: 'No hay eventos en este rango',
  }), []);

  return (
    <div className="calendar-container">
      {(isLoading || loadingUsers) && (
        <div className="loading-indicator flex items-center justify-center p-2 bg-blue-50 text-blue-700 rounded mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-800 mr-2"></div>
          <span>Cargando datos...</span>
        </div>
      )}
      
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: 600 }}
        eventPropGetter={eventPropGetter}
        defaultView="week"
        view="week" // Force week view
        views={['week']} // Only week view is available
        formats={formats} // Aplicar formatos personalizados
        components={{
          toolbar: CustomToolbar,
          event: EventComponent
        }}
        messages={messages}
        selectable={true}
        onSelectSlot={handleSelectSlot}
        onSelectEvent={handleSelectEvent}
        longPressThreshold={20}
      />
      
      {/* Modal para crear time entry */}
      {showModal && selectedSlot && (
        <TimeEntryModal
          isOpen={showModal}
          onClose={handleCloseModal}
          start={selectedSlot.start}
          end={selectedSlot.end}
          tasks={tasks}
          onSubmit={handleCreateTimeEntry}
          isCreating={creating}
          error={error}
        />
      )}

      {/* Modal para ver detalles de time entry y eliminarlo */}
      {showDetailsModal && selectedEvent && (
        <TimeEntryDetailsModal
          isOpen={showDetailsModal}
          onClose={handleCloseDetailsModal}
          timeEntry={selectedEvent.resource.entry}
          task={selectedEvent.resource.task}
          creatorName={getUserName(selectedEvent.resource.entry.user_id)}
          onDelete={handleDeleteTimeEntry}
        />
      )}
    </div>
  );
};

export default TimeEntryCalendar;
