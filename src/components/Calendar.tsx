import React, { useState } from 'react';
import { Calendar, momentLocalizer, SlotInfo } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/Calendar.css';
import { TimeEntryResponse } from '@/services/timeEntryService';
import { FaSync } from 'react-icons/fa';
import TimeEntryModal from './TimeEntryModal';

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
  onTimeEntryCreate?: (entry: any) => Promise<void>;
}

const TimeEntryCalendar: React.FC<TimeEntryCalendarProps> = ({ 
  apiTimeEntries, 
  tasks, 
  isLoading = false,
  onRefresh,
  onTimeEntryCreate
}) => {
  const [view, setView] = useState<'month' | 'week'>('week');
  // Estado para el modal de creación de time entry
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{start: Date, end: Date} | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Convert time entries from API to calendar events
  const getEvents = () => {
    return apiTimeEntries.map((entry) => {
      const task = tasks.find((task) => task.id === entry.task_id);
      return {
        id: `api-${entry.id}`,
        title: task ? task.title : 'Tarea sin asignar',
        start: new Date(entry.start_time),
        end: new Date(entry.end_time),
        color: task ? task.color : '#cccccc',
        resource: { task, entry }
      };
    });
  };

  // Customize event appearance
  const eventPropGetter = (event: any) => {
    return {
      style: {
        backgroundColor: event.color,
        borderRadius: '4px',
        opacity: 0.9,
        color: '#fff',
        border: '0px',
        display: 'block',
        fontWeight: 'bold',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      },
    };
  };

  // Custom event component to show more details
  const EventComponent = ({ event }: { event: any }) => {
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
    
    return (
      <div>
        <strong>{event.title}</strong>
        <div style={{ fontSize: '0.8em' }}>
          {task ? `Cliente: ${task.client}` : ''}
        </div>
        <div style={{ fontSize: '0.8em' }}>
          {durationString}
        </div>
      </div>
    );
  };

  // Custom toolbar component
  const CustomToolbar = (toolbar: any) => {
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
              disabled={isLoading}
            >
              <FaSync className={isLoading ? 'animate-spin' : ''} />
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
      {isLoading && (
        <div className="loading-indicator flex items-center justify-center p-2 bg-blue-50 text-blue-700 rounded mb-4">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-800 mr-2"></div>
          <span>Cargando entradas de tiempo...</span>
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
    </div>
  );
};

export default TimeEntryCalendar;
