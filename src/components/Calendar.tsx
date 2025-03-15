import React, { useState, useEffect } from 'react';
import { Calendar, momentLocalizer, SlotInfo, Event, EventPropGetter, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/Calendar.css';
import { TimeEntryResponse, timeEntryService } from '@/services/timeEntryService';
import { FaSync } from 'react-icons/fa';
import TimeEntryModal from './TimeEntryModal';
import TimeEntryDetailsModal from '@/components/TimeEntryDetailsModal';
import { useAuthStore } from '@/store/useAuthStore';

const localizer = momentLocalizer(moment);

type Task = {
  id: number;
  title: string;
  status: string;
  due_date: string;
  client: string;
  assigned_to: string;
  color: string;
};

interface TimeEntryCalendarProps {
  apiTimeEntries: TimeEntryResponse[];
  tasks: Task[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onTimeEntryCreate?: (entry: { taskId: number; start_time: Date; end_time: Date }) => Promise<void>;
  // Props for user information
  userMap?: Record<number, string>; // Map of user_id to name
  currentUserId?: number; // ID of the currently logged-in user
  // Optional prop to fetch users if userMap is not provided
  fetchUsers?: () => Promise<Record<number, string>>;
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
  fetchUsers
}) => {
  const [view, setView] = useState<'month' | 'week'>('week');
  // Estado para el modal de creación de time entry
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{start: Date, end: Date} | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // State for the details modal
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  
  // Estado para el mapa de usuarios (para mantener nombres)
  const [userMap, setUserMap] = useState<Record<number, string>>(initialUserMap);
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
  const getUserName = (userId: number): string => {
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
  };

  // Handler para selección de slot en el calendario
  const handleSelectSlot = (slotInfo: SlotInfo) => {
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end
    });
    setShowModal(true);
  };

  // Handler para cerrar el modal
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSlot(null);
    setError(null);
  };

  // Handler para cerrar el modal de detalles
  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedEvent(null);
  };

  // Handler for selecting an event (time entry)
  const handleSelectEvent = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setShowDetailsModal(true);
  };

  // Handler for deleting a time entry
  const handleDeleteTimeEntry = async (entryId: number) => {
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
  };


  // Handler para crear una nueva entrada de tiempo
  const handleCreateTimeEntry = async (data: { taskId: number, start: Date, end: Date }) => {
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
  };

  // Función para parsear correctamente las fechas de strings ISO a objetos Date
  // preservando la zona horaria local
  const parseISOtoLocalDate = (isoString: string): Date => {
    // Parsear la fecha ISO a objeto Date
    const date = new Date(isoString);
    return date;
  };

  // Convert time entries from API to calendar events
  const getEvents = (): CalendarEvent[] => {
    return apiTimeEntries.map((entry) => {
      const task = tasks.find((task) => task.id === entry.task_id);
      return {
        id: `api-${entry.id}`,
        title: task ? task.title : 'Tarea sin asignar',
        start: parseISOtoLocalDate(entry.start_time),
        end: parseISOtoLocalDate(entry.end_time),
        color: task ? task.color : '#cccccc',
        resource: { task, entry }
      };
    });
  };

  // Customize event appearance
  const eventPropGetter: EventPropGetter<CalendarEvent> = (event) => {
    const isCurrentUserEntry = event.resource.entry.user_id === effectiveCurrentUserId;
    
    return {
      style: {
        backgroundColor: event.color,
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
  };

  // Custom event component to show more details
  const EventComponent = ({ event }: { event: CalendarEvent }) => {
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
  };

  // Custom toolbar component
  const CustomToolbar = (toolbar: ToolbarProps) => {
    const goToBack = () => {
      toolbar.onNavigate('PREV');
    };

    const goToNext = () => {
      toolbar.onNavigate('NEXT');
    };

    const goToCurrent = () => {
      toolbar.onNavigate('TODAY');
    };

    const goToMonth = () => {
      setView('month');
      toolbar.onView('month');
    };

    const goToWeek = () => {
      setView('week');
      toolbar.onView('week');
    };

    const handleRefresh = () => {
      if (onRefresh) {
        onRefresh();
      }
    };

    const label = () => {
      const date = moment(toolbar.date);
      return (
        <span><b>{date.format('MMMM')}</b><span> {date.format('YYYY')}</span></span>
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
          <button 
            type="button" 
            onClick={goToMonth} 
            className={`toolbar-btn ${view === 'month' ? 'active' : ''}`}
          >
            Mes
          </button>
          <button 
            type="button" 
            onClick={goToWeek} 
            className={`toolbar-btn ${view === 'week' ? 'active' : ''}`}
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
  };

  // Calendar style
  const calendarStyle = {
    height: 600
  };

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
        events={getEvents()}
        startAccessor="start"
        endAccessor="end"
        style={calendarStyle}
        eventPropGetter={eventPropGetter}
        defaultView="week"
        view={view}
        onView={(view) => setView(view as 'week' | 'month')}
        views={['month', 'week']}
        components={{
          toolbar: CustomToolbar,
          event: EventComponent
        }}
        messages={{
          today: 'Hoy',
          previous: 'Anterior',
          next: 'Siguiente',
          month: 'Mes',
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
        }}
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
