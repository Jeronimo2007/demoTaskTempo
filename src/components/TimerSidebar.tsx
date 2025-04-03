import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaPause, FaStop, FaSync, FaTimes, FaClock, FaPlus, FaTrash } from 'react-icons/fa';
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
  }, [notifyTimerStateChange, errorTimeout, timerIntervalsRef]);
  
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

      <div
        ref={timerRef}
        className={`fixed top-0 right-0 h-full w-80 bg-gray-100 shadow-lg transform transition-transform duration-300 z-50 ${className} ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Sidebar content */}
        <div className="p-4 flex flex-col h-full">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-black">Temporizadores</h2>
            <button onClick={toggleSidebar} className="p-2 bg-gray-200 rounded hover:bg-gray-300" aria-label="Close timer sidebar">
              <FaTimes className="text-black" />
            </button>
          </div>

          {/* Error message */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-200 text-red-700 rounded">
              {errorMessage}
            </div>
          )}

          <div className="flex-grow overflow-y-auto">
            {timers.map((timer, index) => (
              <div key={timer.id} className="mb-6 p-4 bg-white rounded shadow">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-medium text-black">Temporizador {index + 1}</h3>
                  <button
                    onClick={() => removeTimer(timer.id)}
                    className="p-2 bg-red-200 text-red-700 rounded hover:bg-red-300"
                    aria-label="Remove timer"
                  >
                    <FaTrash className="text-lg" />
                  </button>
                </div>

                <div className="mb-2">
                  <label htmlFor={`task-select-${timer.id}`} className="block text-sm font-medium text-black">
                    Tarea:
                  </label>
                  <select
                    id={`task-select-${timer.id}`}
                    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-black"
                    value={timer.taskId === null ? '' : timer.taskId}
                    onChange={(e) => updateTimerTask(timer.id, Number(e.target.value))}
                  >
                    <option value="">Selecciona una tarea</option>
                    {tasks.map((task) => (
                      <option key={task.id} value={task.id}>
                        {getClientName(task)} - {task.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-2">
                  <label htmlFor={`description-${timer.id}`} className="block text-sm font-medium text-black">
                    Descripción:
                  </label>
                  <input
                    type="text"
                    id={`description-${timer.id}`}
                    className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md text-black"
                    placeholder="Descripción de la actividad"
                    value={timer.description}
                    onChange={(e) => updateTimerDescription(timer.id, e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between mb-2">
                  <div className="text-2xl font-semibold text-black">
                    {formatTime(timer.displayTime)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {timer.startTime ? `Iniciado a las ${formatStartTime(timer.startTime)}` : 'Sin iniciar'}
                  </div>
                </div>

                <div className="flex justify-around">
                  {!timer.isRunning && !timer.isPaused && (
                    <button
                      onClick={() => startTimer(timer.id)}
                      className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                      aria-label="Start timer"
                    >
                      <FaPlay className="text-lg" />
                    </button>
                  )}
                  {timer.isRunning && (
                    <button
                      onClick={() => pauseTimer(timer.id)}
                      className="p-2 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                      aria-label="Pause timer"
                    >
                      <FaPause className="text-lg" />
                    </button>
                  )}
                  {timer.isPaused && (
                    <button
                      onClick={() => resumeTimer(timer.id)}
                      className="p-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      aria-label="Resume timer"
                    >
                      <FaPlay className="text-lg" />
                    </button>
                  )}
                  {(timer.isRunning || timer.isPaused) && (
                    <button
                      onClick={() => stopTimer(timer.id)}
                      className="p-2 bg-red-500 text-white rounded hover:bg-red-600"
                      aria-label="Stop timer"
                      disabled={isSaving}
                    >
                      {isSaving ? <FaSync className="animate-spin text-lg" /> : <FaStop className="text-lg" />}
                    </button>
                  )}
                  {(timer.isRunning || timer.isPaused) && (
                    <button
                      onClick={() => resetTimer(timer.id)}
                      className="p-2 bg-gray-500 text-white rounded hover:bg-gray-600"
                      aria-label="Reset timer"
                    >
                      <VscDebugRestart className="text-lg" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addNewTimer}
            className="w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600"
            aria-label="Add new timer"
          >
            <FaPlus className="inline-block mr-2" /> Añadir Temporizador
          </button>
        </div>

        <div className="p-4 border-t border-gray-300">
          <button
            onClick={handleManualRefresh}
            className="w-full p-3 bg-yellow-500 text-white rounded hover:bg-yellow-600"
            aria-label="Refresh timers"
          >
            <FaSync className="inline-block mr-2" /> Refrescar
          </button>
        </div>
      </div>
    </>
  );
};

export default TimerSidebar;