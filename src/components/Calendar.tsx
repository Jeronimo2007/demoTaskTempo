import React, { useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import '../styles/Calendar.css';

const localizer = momentLocalizer(moment);

type TimeEntry = {
  taskId: number;
  duration: number;
  date: Date;
};

type Task = {
  id: number;
  name: string;
  color: string;
};

interface TimeEntryCalendarProps {
  timeEntries: TimeEntry[];
  tasks: Task[];
}

const TimeEntryCalendar: React.FC<TimeEntryCalendarProps> = ({ timeEntries, tasks }) => {
  const [view, setView] = useState<'month' | 'week'>('week');
  
  // Convert time entries to calendar events
  const events = timeEntries.map((entry) => {
    const task = tasks.find((task) => task.id === entry.taskId);
    const startDate = new Date(entry.date);
    const endDate = new Date(startDate.getTime() + entry.duration * 1000);
    
    return {
      id: `${entry.taskId}-${startDate.getTime()}`,
      title: task ? task.name : 'Tarea sin asignar',
      start: startDate,
      end: endDate,
      color: task ? task.color : '#cccccc',
      resource: task,
    };
  });

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
        </div>
      </div>
    );
  };

  // Asegurarse de aplicar bien los estilos locales
  const calendarStyle = {
    height: 600
  };

  return (
    <div className="calendar-container">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={calendarStyle}
        eventPropGetter={eventPropGetter}
        defaultView="week"
        view={view} // Controlamos la vista actual explícitamente
        onView={(view) => setView(view as 'week' | 'month')} // Aseguramos que se actualice correctamente
        views={['month', 'week']} // Solo incluimos mes y semana
        components={{
          toolbar: CustomToolbar,
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
      />
    </div>
  );
};

export default TimeEntryCalendar;
