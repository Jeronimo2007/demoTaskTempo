import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaPause, FaStop, FaSave, FaSync, FaTimes, FaClock, FaPlus, FaTrash } from 'react-icons/fa';
import { VscDebugRestart } from 'react-icons/vsc';
import { Task } from '@/types/task';

type TimeEntry = {
  id?: number;
  taskId: number;
  start_time?: Date;
  end_time?: Date;
  duration?: number;
  description?: string;
};

// Individual timer state
type Timer = {
  id: string;
  taskId: number | null;
  isRunning: boolean;
  isPaused: boolean;
  elapsedTime: number;
  displayTime: number;
  startTime: Date | null;
  description: string;
  currentTimeEntry: TimeEntry | null;
};

interface TimerSidebarProps {
  tasks: Task[];
  onTimeEntryCreate: (entry: TimeEntry) => void;
  onEntryCreated?: () => void;
  className?: string;
}

const TimerSidebar: React.FC<TimerSidebarProps> = ({ tasks, onTimeEntryCreate, onEntryCreated, className }) => {
  // Sidebar state
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const [activeTimerId, setActiveTimerId] = useState<string | null>(null);
  
  // Multiple timers state
  const [timers, setTimers] = useState<Timer[]>([]);
  
  // References
  const timerRef = useRef<HTMLDivElement>(null);
  const timerIntervalsRef = useRef<Map<string, number>>(new Map());
  const previousTasksRef = useRef<Task[]>(tasks);
  
  // Function to notify layout about timer state changes
  const notifyTimerStateChange = useCallback((isActive: boolean) => {
    const event = new CustomEvent('timerStateChange', { 
      detail: { isActive } 
    });
    window.dispatchEvent(event);
  }, []);
  
  // Check if any timer is active
  const isAnyTimerActive = timers.some(timer => timer.isRunning || timer.isPaused);
  
  // Auto-open sidebar when any timer is active
  useEffect(() => {
    if (isAnyTimerActive) {
      setIsOpen(true);
    }
    
    // Notify parent about active timers
    notifyTimerStateChange(isAnyTimerActive);
  }, [isAnyTimerActive, notifyTimerStateChange]);
  
  // Clean up timers when component unmounts
  useEffect(() => {
    return () => {
      // Clear all interval timers
      timerIntervalsRef.current.forEach((intervalId) => {
        window.clearInterval(intervalId);
      });
      
      // Clear any error timeouts
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
      
      // Ensure we notify that no timer is active when component unmounts
      notifyTimerStateChange(false);
    };
  }, [notifyTimerStateChange, errorTimeout]);
  
  // Use localStorage to save timers state between page refreshes
  useEffect(() => {
    const savedTimersState = localStorage.getItem('multiTimerState');
    if (savedTimersState) {
      try {
        const parsedState = JSON.parse(savedTimersState);
        
        if (Array.isArray(parsedState)) {
          // Process each timer to restore dates and validate task IDs
          const restoredTimers = parsedState.map(timer => {
            // Only include timers with valid task IDs
            if (timer.taskId && tasks.some(task => task.id === timer.taskId)) {
              const restoredTimer = {
                ...timer,
                startTime: timer.startTime ? new Date(timer.startTime) : null,
              };
              
              // Restore time entry date objects
              if (timer.currentTimeEntry && timer.currentTimeEntry.start_time) {
                restoredTimer.currentTimeEntry = {
                  ...timer.currentTimeEntry,
                  start_time: new Date(timer.currentTimeEntry.start_time)
                };
              }
              
              return restoredTimer;
            }
            return null;
          }).filter(Boolean) as Timer[];
          
          if (restoredTimers.length > 0) {
            setTimers(restoredTimers);
            
            // Setup intervals for running timers
            restoredTimers.forEach(timer => {
              if (timer.isRunning) {
                setupTimerInterval(timer.id);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error restoring timer states:', error);
        localStorage.removeItem('multiTimerState');
      }
    }
  }, [tasks]);

  // Save timers state to localStorage whenever it changes
  useEffect(() => {
    if (timers.length > 0 && timers.some(timer => timer.isRunning || timer.isPaused)) {
      const timersToSave = timers.map(timer => ({
        ...timer,
        startTime: timer.startTime ? timer.startTime.toISOString() : null,
        currentTimeEntry: timer.currentTimeEntry ? {
          ...timer.currentTimeEntry,
          start_time: timer.currentTimeEntry.start_time ? timer.currentTimeEntry.start_time.toISOString() : undefined,
          end_time: timer.currentTimeEntry.end_time ? timer.currentTimeEntry.end_time.toISOString() : undefined,
        } : null
      }));
      
      localStorage.setItem('multiTimerState', JSON.stringify(timersToSave));
    } else if (localStorage.getItem('multiTimerState')) {
      // Clear saved state if no timers are active
      localStorage.removeItem('multiTimerState');
    }
  }, [timers]);

  // Setup interval for a timer
  const setupTimerInterval = (timerId: string) => {
    // Clear existing interval if any
    if (timerIntervalsRef.current.has(timerId)) {
      window.clearInterval(timerIntervalsRef.current.get(timerId));
    }
    
    // Create new interval
    const intervalId = window.setInterval(() => {
      setTimers(currentTimers => {
        return currentTimers.map(timer => {
          if (timer.id === timerId && timer.isRunning) {
            const newElapsedTime = timer.elapsedTime + 1;
            return {
              ...timer,
              elapsedTime: newElapsedTime,
              displayTime: newElapsedTime
            };
          }
          return timer;
        });
      });
    }, 1000);
    
    // Store interval ID
    timerIntervalsRef.current.set(timerId, intervalId);
  };

  // Show error message with timeout
  const showError = (message: string) => {
    setErrorMessage(message);
    
    // Clear error message after 3 seconds
    if (errorTimeout) clearTimeout(errorTimeout);
    const timeout = setTimeout(() => setErrorMessage(null), 3000);
    setErrorTimeout(timeout);
  };

  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  // Create a new timer
  const addNewTimer = () => {
    const newTimer: Timer = {
      id: `timer-${Date.now()}`,
      taskId: null,
      isRunning: false,
      isPaused: false,
      elapsedTime: 0,
      displayTime: 0,
      startTime: null,
      description: '',
      currentTimeEntry: null
    };
    
    setTimers([...timers, newTimer]);
    setActiveTimerId(newTimer.id);
  };

  // Remove a timer
  const removeTimer = (timerId: string) => {
    // Stop the timer interval if running
    if (timerIntervalsRef.current.has(timerId)) {
      window.clearInterval(timerIntervalsRef.current.get(timerId));
      timerIntervalsRef.current.delete(timerId);
    }
    
    // Remove the timer from state
    setTimers(timers.filter(timer => timer.id !== timerId));
    
    // Update active timer if needed
    if (activeTimerId === timerId) {
      const remainingTimers = timers.filter(timer => timer.id !== timerId);
      setActiveTimerId(remainingTimers.length > 0 ? remainingTimers[0].id : null);
    }
  };

  // Update timer task
  const updateTimerTask = (timerId: string, taskId: number | null) => {
    setTimers(timers.map(timer => {
      if (timer.id === timerId) {
        return {
          ...timer,
          taskId
        };
      }
      return timer;
    }));
  };

  // Update timer description
  const updateTimerDescription = (timerId: string, description: string) => {
    setTimers(timers.map(timer => {
      if (timer.id === timerId) {
        return {
          ...timer,
          description
        };
      }
      return timer;
    }));
  };

  // Start a timer
  const startTimer = (timerId: string) => {
    const timer = timers.find(t => t.id === timerId);
    if (!timer) return;
    
    if (timer.taskId === null) {
      showError("Por favor primero selecciona una tarea");
      return;
    }
    
    try {
      const now = new Date();
      
      // Create a new time entry
      const newEntry: TimeEntry = {
        taskId: timer.taskId,
        start_time: now,
        description: timer.description
      };
      
      // Update the timer
      setTimers(timers.map(t => {
        if (t.id === timerId) {
          return {
            ...t,
            isRunning: true,
            isPaused: false,
            elapsedTime: 0,
            displayTime: 0,
            startTime: now,
            currentTimeEntry: newEntry
          };
        }
        return t;
      }));
      
      // Setup the interval
      setupTimerInterval(timerId);
      
      setErrorMessage(null);
    } catch (err) {
      console.error('Error starting timer:', err);
      showError("Error starting timer. Try again.");
    }
  };

  // Pause a timer
  const pauseTimer = (timerId: string) => {
    const timer = timers.find(t => t.id === timerId);
    if (!timer || !timer.isRunning) return;
    
    // Clear the interval
    if (timerIntervalsRef.current.has(timerId)) {
      window.clearInterval(timerIntervalsRef.current.get(timerId));
      timerIntervalsRef.current.delete(timerId);
    }
    
    // Update the timer
    setTimers(timers.map(t => {
      if (t.id === timerId) {
        return {
          ...t,
          isRunning: false,
          isPaused: true,
          currentTimeEntry: t.currentTimeEntry ? {
            ...t.currentTimeEntry,
            duration: t.elapsedTime,
            description: t.description
          } : null
        };
      }
      return t;
    }));
  };

  // Resume a timer
  const resumeTimer = (timerId: string) => {
    const timer = timers.find(t => t.id === timerId);
    if (!timer || !timer.isPaused) return;
    
    // Update the timer
    setTimers(timers.map(t => {
      if (t.id === timerId) {
        return {
          ...t,
          isRunning: true,
          isPaused: false
        };
      }
      return t;
    }));
    
    // Setup the interval
    setupTimerInterval(timerId);
  };

  // Stop and optionally save a timer
  const stopTimer = async (timerId: string, shouldSave: boolean = true) => {
    const timer = timers.find(t => t.id === timerId);
    if (!timer || (!timer.isRunning && !timer.isPaused) || !timer.currentTimeEntry) return;
    
    // Clear the interval
    if (timerIntervalsRef.current.has(timerId)) {
      window.clearInterval(timerIntervalsRef.current.get(timerId));
      timerIntervalsRef.current.delete(timerId);
    }
    
    if (shouldSave) {
      setIsSaving(true);
      const now = new Date();
      
      // Create the final time entry
      const finalEntry: TimeEntry = {
        ...timer.currentTimeEntry,
        end_time: now,
        duration: timer.elapsedTime,
        description: timer.description
      };
      
      try {
        // Send to parent component which will save to API
        await onTimeEntryCreate(finalEntry);
        
        // Call onEntryCreated callback to refresh time entries list if provided
        if (onEntryCreated) {
          onEntryCreated();
        }
        
        setErrorMessage(null);
      } catch (err) {
        console.error('Error saving time entry:', err);
        showError("Failed to save time entry to server");
        return; // Don't reset the timer if saving failed
      } finally {
        setIsSaving(false);
      }
    }
    
    // Reset the timer
    setTimers(timers.map(t => {
      if (t.id === timerId) {
        return {
          ...t,
          isRunning: false,
          isPaused: false,
          elapsedTime: 0,
          displayTime: 0,
          startTime: null,
          currentTimeEntry: null
        };
      }
      return t;
    }));
  };

  // Reset a timer without saving
  const resetTimer = (timerId: string) => {
    stopTimer(timerId, false);
  };

  // Manual refresh
  const handleManualRefresh = () => {
    // Save all active timers state
    if (timers.length > 0 && timers.some(timer => timer.isRunning || timer.isPaused)) {
      const timersToSave = timers.map(timer => ({
        ...timer,
        startTime: timer.startTime ? timer.startTime.toISOString() : null,
        currentTimeEntry: timer.currentTimeEntry ? {
          ...timer.currentTimeEntry,
          start_time: timer.currentTimeEntry.start_time ? timer.currentTimeEntry.start_time.toISOString() : undefined,
          end_time: timer.currentTimeEntry.end_time ? timer.currentTimeEntry.end_time.toISOString() : undefined,
        } : null
      }));
      
      localStorage.setItem('multiTimerState', JSON.stringify(timersToSave));
    }
    window.location.reload();
  };

  // Format elapsed time (HH:MM:SS)
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Calculate and format timer start time
  const formatStartTime = (date: Date | null) => {
    if (!date) return '';
    
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Helper function to get client name from task
  const getClientName = (task: Task): string => {
    if (task.client_name) return task.client_name;
    if (task.client) return task.client;
    return 'Sin cliente';
  };

  // Get task by id
  const getTaskById = (taskId: number | null): Task | undefined => {
    if (taskId === null) return undefined;
    return tasks.find(task => task.id === taskId);
  };

  // Get active timers for display in the toggle button
  const getActiveTimers = () => {
    return timers.filter(timer => timer.isRunning || timer.isPaused);
  };

  return (
    <>
      {/* Toggle button - only visible when sidebar is closed */}
      {!isOpen && (
        <div 
          className="fixed right-0 top-1/4 transform -translate-y-1/2 z-50 transition-opacity duration-300"
        >
          <button
            onClick={toggleSidebar}
            className={`flex items-center justify-center p-3 text-white rounded-l-lg shadow-lg transition-colors duration-200 ${isAnyTimerActive ? 'bg-green-500' : 'bg-blue-500 hover:bg-blue-600'}`}
            aria-label="Toggle timer sidebar"
          >
            <FaClock className="text-xl" />
            {isAnyTimerActive && (
              <div className="ml-2 flex flex-col">
                <span className="text-xs font-medium">
                  {getActiveTimers().length} timer{getActiveTimers().length !== 1 ? 's' : ''} activo{getActiveTimers().length !== 1 ? 's' : ''}
                </span>
                {getActiveTimers().length === 1 && (
                  <span className="text-sm font-medium">
                    {formatTime(getActiveTimers()[0].displayTime)}
                  </span>
                )}
              </div>
            )}
          </button>
        </div>
      )}

      {/* Sidebar */}
      <div 
        ref={timerRef}
        className={`fixed right-0 top-0 h-full bg-white shadow-xl transition-transform duration-300 ease-in-out z-40 ${isOpen ? 'translate-x-0' : 'translate-x-full'} ${className || ''}`}
        style={{ 
          width: '350px',
          maxWidth: '95vw'
        }}
      >
        {/* Header */}
        <div 
          className="p-4 flex justify-between items-center border-b"
          style={{ backgroundColor: '#3B82F6' }}
        >
          <span className="font-medium text-white text-lg">
            Temporizadores
          </span>
          <div className="flex items-center">
            <button 
              onClick={addNewTimer}
              className="mr-3 text-white hover:text-green-200 focus:outline-none"
              aria-label="Add new timer"
              title="Añadir nuevo timer"
            >
              <FaPlus />
            </button>
            <button 
              onClick={toggleSidebar} 
              className="text-white hover:text-gray-200 focus:outline-none"
              aria-label="Close timer sidebar"
            >
              <FaTimes />
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="overflow-y-auto h-full" style={{ maxHeight: 'calc(100vh - 64px)' }}>
          {/* Global messages */}
          {errorMessage && (
            <div className="text-center text-sm text-red-500 m-3 p-2 bg-red-50 rounded">
              {errorMessage}
            </div>
          )}
          
          {isSaving && (
            <div className="text-center text-sm text-blue-500 m-3 flex items-center justify-center p-2 bg-blue-50 rounded">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              Guardando en el servidor...
            </div>
          )}
          
          {/* Timer tabs or list */}
          {timers.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8">
              <p className="text-gray-500 mb-4 text-center">No hay temporizadores activos</p>
              <button 
                onClick={addNewTimer}
                className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition flex items-center justify-center"
              >
                <FaPlus className="mr-2" /> Añadir Temporizador
              </button>
            </div>
          ) : (
            <div className="flex flex-col divide-y">
              {/* Timer tabs */}
              <div className="flex overflow-x-auto p-2 bg-gray-100">
                {timers.map((timer) => {
                  const task = getTaskById(timer.taskId);
                  const isActive = timer.id === activeTimerId;
                  const isTimerRunning = timer.isRunning;
                  const isTimerPaused = timer.isPaused;
                  
                  return (
                    <button
                      key={timer.id}
                      onClick={() => setActiveTimerId(timer.id)}
                      className={`flex-shrink-0 px-3 py-2 rounded-t text-sm font-medium mr-1 ${
                        isActive 
                          ? 'bg-white border-t border-l border-r border-gray-300' 
                          : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                      } ${isTimerRunning ? 'text-green-600' : isTimerPaused ? 'text-yellow-600' : ''}`}
                    >
                      <span className="truncate max-w-[100px] inline-block">
                        {task ? task.title : 'Sin tarea'}
                      </span>
                      {(isTimerRunning || isTimerPaused) && (
                        <span className="ml-2 text-xs">
                          {formatTime(timer.displayTime)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              
              {/* Active timer content */}
              {activeTimerId && (
                <div className="p-4">
                  {timers.map((timer) => {
                    if (timer.id !== activeTimerId) return null;
                    
                    const task = getTaskById(timer.taskId);
                    
                    return (
                      <div key={timer.id} className="flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                          <h3 className="font-medium">
                            {task ? task.title : 'Seleccione una tarea'}
                          </h3>
                          <button 
                            onClick={() => removeTimer(timer.id)}
                            className="text-red-500 hover:text-red-700"
                            disabled={timer.isRunning || timer.isPaused}
                            title="Eliminar temporizador"
                          >
                            <FaTrash />
                          </button>
                        </div>
                        
                        <select
                          value={timer.taskId ?? ''}
                          onChange={(e) => {
                            const newTaskId = e.target.value ? Number(e.target.value) : null;
                            updateTimerTask(timer.id, newTaskId);
                          }}
                          className="w-full border p-2 rounded mb-4 text-black"
                          disabled={timer.isRunning || timer.isPaused}
                        >
                          <option value="">Seleccionar tarea</option>
                          {tasks.map((task) => (
                            <option key={task.id} value={task.id} className="text-black">
                              {task.title} - {getClientName(task)}
                            </option>
                          ))}
                        </select>
                        
                        <textarea
                          value={timer.description}
                          onChange={(e) => updateTimerDescription(timer.id, e.target.value)}
                          placeholder="Descripción de la actividad"
                          className="w-full border p-2 rounded mb-4 text-black resize-none"
                          rows={3}
                          disabled={isSaving}
                        />
                        
                        <div className="text-center text-3xl font-bold mb-2 text-black">
                          {formatTime(timer.displayTime)}
                        </div>
                        
                        {timer.startTime && (
                          <div className="text-center text-sm text-gray-500 mb-2">
                            Iniciado a las {formatStartTime(timer.startTime)}
                          </div>
                        )}
                        
                        <div className="flex flex-col gap-3 mt-4">
                          {!timer.isRunning && !timer.isPaused && (
                            <button 
                              onClick={() => startTimer(timer.id)} 
                              className="bg-green-500 text-white px-4 py-3 rounded hover:bg-green-600 transition flex items-center justify-center"
                              disabled={timer.taskId === null || isSaving}
                            >
                              <FaPlay className="mr-2" /> Iniciar Timer
                            </button>
                          )}
                          
                          {timer.isPaused && (
                            <>
                              <div className="flex w-full gap-2">
                                <button 
                                  onClick={() => resumeTimer(timer.id)} 
                                  className="bg-green-500 text-white px-4 py-3 rounded flex-1 hover:bg-green-600 transition flex items-center justify-center"
                                  disabled={isSaving}
                                >
                                  <FaPlay className="mr-2" /> Reanudar
                                </button>
                                <button 
                                  onClick={() => stopTimer(timer.id, true)} 
                                  className="bg-blue-500 text-white px-4 py-3 rounded flex-1 hover:bg-blue-600 transition flex items-center justify-center"
                                  disabled={isSaving}
                                >
                                  <FaSave className="mr-2" /> Guardar
                                </button>
                              </div>
                              <button 
                                onClick={() => resetTimer(timer.id)} 
                                className="bg-red-500 text-white px-4 py-2 rounded w-1/2 mx-auto hover:bg-red-600 transition flex items-center justify-center mt-2"
                                disabled={isSaving}
                              >
                                <VscDebugRestart className="mr-2" /> Reiniciar
                              </button>
                            </>
                          )}
                          
                          {timer.isRunning && (
                            <div className="flex w-full gap-3 flex-col">
                              <button 
                                onClick={() => pauseTimer(timer.id)} 
                                className="bg-yellow-500 text-white px-4 py-3 rounded hover:bg-yellow-600 transition flex items-center justify-center"
                                disabled={isSaving}
                              >
                                <FaPause className="mr-2" /> Pausar
                              </button>
                              <button 
                                onClick={() => stopTimer(timer.id, true)} 
                                className="bg-red-500 text-white px-4 py-3 rounded hover:bg-red-600 transition flex items-center justify-center"
                                disabled={isSaving}
                              >
                                <FaStop className="mr-2" /> Detener
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              
              {/* Refresh button at the bottom */}
              <div className="p-4 mt-auto">
                <button 
                  onClick={handleManualRefresh} 
                  className="bg-gray-500 text-white px-4 py-2 rounded w-full hover:bg-gray-600 transition flex items-center justify-center"
                >
                  <FaSync className="mr-2" /> Refrescar
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default TimerSidebar;