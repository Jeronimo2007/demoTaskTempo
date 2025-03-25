import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FaPlay, FaPause, FaStop, FaSave, FaSync } from 'react-icons/fa';
import { VscDebugRestart } from 'react-icons/vsc';
import { Task } from '@/types/task'; // Import Task from types file

type TimeEntry = {
  id?: number;
  taskId: number;
  start_time?: Date;
  end_time?: Date;
  duration?: number;
  description?: string;
};


interface FloatingTimerProps {
  tasks: Task[];
  onTimeEntryCreate: (entry: TimeEntry) => void;
  onEntryCreated?: () => void;
  className?: string;
}

const FloatingTimer: React.FC<FloatingTimerProps> = ({ tasks, onTimeEntryCreate, onEntryCreated, className }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const elapsedTimeRef = useRef(0); // Use useRef to persist elapsed time between renders
  const [displayTime, setDisplayTime] = useState(0); // New state for displaying time
  const [position, setPosition] = useState({ x: 20, y: 600 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentTimeEntry, setCurrentTimeEntry] = useState<TimeEntry | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [errorTimeout, setErrorTimeout] = useState<NodeJS.Timeout | null>(null);
  const [description, setDescription] = useState<string>('');
  
  // References for persistent state between prop updates
  const timerRef = useRef<HTMLDivElement>(null);
  const timerIntervalRef = useRef<number | null>(null); // Reference to store the timer interval
  const previousTasksRef = useRef<Task[]>(tasks);
  
  // Store the timer state between re-renders
  const timerStateRef = useRef({
    isRunning: false,
    isPaused: false,
    elapsedTime: 0,
    displayTime: 0,
    selectedTaskId: null as number | null,
    startTime: null as Date | null,
    currentTimeEntry: null as TimeEntry | null,
    description: ''
  });
  
  // Function to notify layout about timer state changes
  const notifyTimerStateChange = useCallback((isActive: boolean) => {
    const event = new CustomEvent('timerStateChange', { 
      detail: { isActive } 
    });
    window.dispatchEvent(event);
  }, []);
  
  // Synchronize state with refs when component mounts/unmounts
  useEffect(() => {
    // Restore state from ref if available (when tasks update but timer is active)
    if ((isRunning || isPaused) && tasks !== previousTasksRef.current) {
      if (timerStateRef.current.isRunning || timerStateRef.current.isPaused) {
        setIsRunning(timerStateRef.current.isRunning);
        setIsPaused(timerStateRef.current.isPaused);
        setDisplayTime(timerStateRef.current.displayTime);
        elapsedTimeRef.current = timerStateRef.current.elapsedTime;
        setSelectedTaskId(timerStateRef.current.selectedTaskId);
        setStartTime(timerStateRef.current.startTime);
        setCurrentTimeEntry(timerStateRef.current.currentTimeEntry);
        setDescription(timerStateRef.current.description);
      }
    }
    previousTasksRef.current = tasks;
  }, [tasks, isRunning, isPaused]);
  
  // Update refs whenever state changes
  useEffect(() => {
    timerStateRef.current = {
      isRunning,
      isPaused,
      elapsedTime: elapsedTimeRef.current,
      displayTime,
      selectedTaskId,
      startTime,
      currentTimeEntry,
      description
    };
    
    // Notify parent about timer active state
    notifyTimerStateChange(isRunning || isPaused);
  }, [isRunning, isPaused, displayTime, selectedTaskId, startTime, currentTimeEntry, description, notifyTimerStateChange]);
  const selectedTask = selectedTaskId ? tasks.find(task => task.id === selectedTaskId) : null;
  
  // Default timer color
  const timerColor = '#3B82F6'; // Blue color

  // Clean up timer when component unmounts
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
      // Clear any error timeouts
      if (errorTimeout) {
        clearTimeout(errorTimeout);
      }
      // Ensure we notify that timer is inactive when component unmounts
      notifyTimerStateChange(false);
    };
  }, [notifyTimerStateChange, errorTimeout]);
  
  // Use localStorage to save timer state between page refreshes
  useEffect(() => {
    const savedTimerState = localStorage.getItem('floatingTimerState');
    if (savedTimerState) {
      try {
        const parsedState = JSON.parse(savedTimerState);
        
        // Validate the saved data has essential fields
        if (parsedState && 
            typeof parsedState.isRunning === 'boolean' && 
            typeof parsedState.elapsedTime === 'number') {
          
          // Restore basic timer state
          setIsRunning(parsedState.isRunning);
          setIsPaused(parsedState.isPaused || false);
          elapsedTimeRef.current = parsedState.elapsedTime;
          setDisplayTime(parsedState.displayTime || parsedState.elapsedTime);
          
          // Restore task selection if it exists in current tasks
          if (parsedState.selectedTaskId && 
              tasks.some(task => task.id === parsedState.selectedTaskId)) {
            setSelectedTaskId(parsedState.selectedTaskId);
          }
          
          // Restore other state
          if (parsedState.startTime) {
            setStartTime(new Date(parsedState.startTime));
          }
          
          if (parsedState.description) {
            setDescription(parsedState.description);
          }
          
          if (parsedState.currentTimeEntry) {
            const entry = parsedState.currentTimeEntry;
            if (entry.start_time) {
              entry.start_time = new Date(entry.start_time);
            }
            setCurrentTimeEntry(entry);
          }
        }
      } catch (error) {
        console.error('Error restoring timer state:', error);
        localStorage.removeItem('floatingTimerState');
      }
    }
  }, [tasks]);

  // Save timer state to localStorage whenever it changes
  useEffect(() => {
    if (isRunning || isPaused) {
      const stateToSave = {
        isRunning,
        isPaused,
        elapsedTime: elapsedTimeRef.current,
        displayTime,
        selectedTaskId,
        startTime: startTime ? startTime.toISOString() : null,
        currentTimeEntry: currentTimeEntry ? {
          ...currentTimeEntry,
          start_time: currentTimeEntry.start_time ? currentTimeEntry.start_time.toISOString() : undefined,
          end_time: currentTimeEntry.end_time ? currentTimeEntry.end_time.toISOString() : undefined,
        } : null,
        description
      };
      localStorage.setItem('floatingTimerState', JSON.stringify(stateToSave));
    } else if (localStorage.getItem('floatingTimerState')) {
      // Clear saved state if timer is not active
      localStorage.removeItem('floatingTimerState');
    }
  }, [isRunning, isPaused, displayTime, selectedTaskId, startTime, currentTimeEntry, description]);

  // Timer effect - Using window.setInterval for better browser compatibility
  useEffect(() => {
    // Clear any existing interval first to prevent multiple intervals
    if (timerIntervalRef.current !== null) {
      window.clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    
    if (isRunning) {
      timerIntervalRef.current = window.setInterval(() => {
        elapsedTimeRef.current += 1;
        const newDisplayTime = elapsedTimeRef.current;
        setDisplayTime(newDisplayTime);
        
        // Update references for persistence
        timerStateRef.current.elapsedTime = elapsedTimeRef.current;
        timerStateRef.current.displayTime = newDisplayTime;
      }, 1000);
    }
    
    return () => {
      if (timerIntervalRef.current !== null) {
        window.clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isRunning]);

  // Drag and drop functions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (timerRef.current && !e.defaultPrevented) {
      const rect = timerRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      });
      setIsDragging(true);
    }
  };

  // Using useCallback to memoize the event handler
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && timerRef.current) {
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Ensure timer stays within window bounds
      const maxX = window.innerWidth - timerRef.current.offsetWidth;
      const maxY = window.innerHeight - timerRef.current.offsetHeight;
      
      setPosition({
        x: Math.max(0, Math.min(newX, maxX)),
        y: Math.max(0, Math.min(newY, maxY))
      });
    }
  }, [isDragging, dragOffset.x, dragOffset.y, timerRef]);

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Add and remove event listeners for drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, handleMouseMove]);

  // Timer control functions
  const handleStart = () => {
    if (selectedTaskId === null) {
      setErrorMessage("Por favor primero selecciona una tarea");
      
      // Clear error message after 3 seconds
      if (errorTimeout) clearTimeout(errorTimeout);
      const timeout = setTimeout(() => setErrorMessage(null), 3000);
      setErrorTimeout(timeout);
      return;
    }
    
    try {
      const now = new Date();
      
      // Create a new time entry that we'll update later
      const newEntry: TimeEntry = {
        taskId: selectedTaskId,
        start_time: now,
        description: description
      };
      
      // Reset both ref and display time
      elapsedTimeRef.current = 0;
      setDisplayTime(0);
      
      // Important: Set these states in this specific order
      setStartTime(now);
      setCurrentTimeEntry(newEntry);
      setErrorMessage(null);
      
      // Set isRunning last so the useEffect will pick it up properly
      setIsRunning(true);
      setIsPaused(false);
      
      // Update references for persistence and notify layout
      timerStateRef.current = {
        isRunning: true,
        isPaused: false,
        elapsedTime: 0,
        displayTime: 0,
        selectedTaskId,
        startTime: now,
        currentTimeEntry: newEntry,
        description
      };
      notifyTimerStateChange(true);
    } catch (error) {
      setErrorMessage("Error starting timer. Try again.");
    }
  };

  const handleStop = async (shouldSave: boolean = true) => {
    if (selectedTaskId !== null && (isRunning || isPaused) && currentTimeEntry) {
      // Stop the timer first
      setIsRunning(false);
      setIsPaused(false);
      
      // Update references for persistence
      timerStateRef.current.isRunning = false;
      timerStateRef.current.isPaused = false;
      
      // Notify layout that timer is no longer active
      notifyTimerStateChange(false);
      
      if (shouldSave) {
        setIsSaving(true);
        const now = new Date();
        
        // Create the final time entry
        const finalEntry: TimeEntry = {
          ...currentTimeEntry,
          end_time: now,
          duration: elapsedTimeRef.current,
          description: description // Include the description
        };
        
        try {
          // Send to parent component which will save to API
          await onTimeEntryCreate(finalEntry);
          
          // Call onEntryCreated callback to refresh time entries list if provided
          if (onEntryCreated) {
            onEntryCreated();
          }
          
          setErrorMessage(null);
        } catch (error) {
          setErrorMessage("Failed to save time entry to server");
          
          // Clear error message after 3 seconds
          if (errorTimeout) clearTimeout(errorTimeout);
          const timeout = setTimeout(() => setErrorMessage(null), 3000);
          setErrorTimeout(timeout);
        } finally {
          // Reset timer
          setIsSaving(false);
          elapsedTimeRef.current = 0;
          setDisplayTime(0); // Reset display time as well
          setCurrentTimeEntry(null);
          setStartTime(null);
          setDescription('');
          
          // Reset references for persistence
          timerStateRef.current = {
            isRunning: false,
            isPaused: false,
            elapsedTime: 0,
            displayTime: 0,
            selectedTaskId: null,
            startTime: null,
            currentTimeEntry: null,
            description: ''
          };
        }
      } else {
        // Just reset without saving
        elapsedTimeRef.current = 0;
        setDisplayTime(0); // Reset display time as well
        setCurrentTimeEntry(null);
        setStartTime(null);
        setErrorMessage(null);
        
        // Reset references for persistence
        timerStateRef.current = {
          isRunning: false,
          isPaused: false,
          elapsedTime: 0,
          displayTime: 0,
          selectedTaskId: null,
          startTime: null,
          currentTimeEntry: null,
          description: ''
        };
      }
    }
  };

  const handlePause = () => {
    if (isRunning && currentTimeEntry) {
      setIsRunning(false);
      setIsPaused(true);
      
      // Just update the current time entry state with the elapsed time so far
      setCurrentTimeEntry({
        ...currentTimeEntry,
        duration: elapsedTimeRef.current,
        description: description // Update description in case it changed
      });
      
      // Update references for persistence
      timerStateRef.current.isRunning = false;
      timerStateRef.current.isPaused = true;
      timerStateRef.current.currentTimeEntry = {
        ...currentTimeEntry,
        duration: elapsedTimeRef.current,
        description: description
      };
      
      // Still considered active when paused
      notifyTimerStateChange(true);
    }
  };

  const handleResume = () => {
    if (isPaused && currentTimeEntry) {
      setIsRunning(true);
      setIsPaused(false);
      
      // Update references for persistence
      timerStateRef.current.isRunning = true;
      timerStateRef.current.isPaused = false;
      
      // Still considered active
      notifyTimerStateChange(true);
    }
  };

  const handleReset = () => {
    // Stop the timer without saving and reset
    handleStop(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  const handleManualRefresh = () => {
    // Save current timer state if active
    if (isRunning || isPaused) {
      const stateToSave = {
        isRunning,
        isPaused,
        elapsedTime: elapsedTimeRef.current,
        displayTime,
        selectedTaskId,
        startTime: startTime ? startTime.toISOString() : null,
        currentTimeEntry: currentTimeEntry ? {
          ...currentTimeEntry,
          start_time: currentTimeEntry.start_time ? currentTimeEntry.start_time.toISOString() : undefined,
          end_time: currentTimeEntry.end_time ? currentTimeEntry.end_time.toISOString() : undefined,
        } : null,
        description
      };
      localStorage.setItem('floatingTimerState', JSON.stringify(stateToSave));
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
  const formatStartTime = () => {
    if (!startTime) return '';
    
    const hours = startTime.getHours().toString().padStart(2, '0');
    const minutes = startTime.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  };

  // Helper function to get client name from task
  const getClientName = (task: Task): string => {
    // Try different client name properties that might exist
    if (task.client_name) return task.client_name;
    if (task.client) return task.client;
    return 'Sin cliente';
  };

  return (
    <div 
      ref={timerRef}
      className={`fixed shadow-lg rounded-lg ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isMinimized ? 'w-48' : 'w-64'} ${className || ''}`}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        backgroundColor: timerColor,
        borderColor: timerColor,
        borderWidth: '2px',
        borderStyle: 'solid',
        transition: isDragging ? 'none' : 'all 0.2s ease',
        zIndex: 1000
      }}
    >
      <div 
        className="p-2 flex justify-between items-center border-b"
        onMouseDown={handleMouseDown}
        style={{ backgroundColor: timerColor }}
      >
        <span className="font-medium truncate text-white">
          {selectedTask ? selectedTask.title : 'Selecciona una tarea'}
        </span>
        <button onClick={toggleMinimize} className="ml-2 text-white hover:text-gray-200">
          {isMinimized ? '↑' : '↓'}
        </button>
      </div>
      
      {!isMinimized && (
        <div className="p-3 bg-white text-black">
          <select
            value={selectedTaskId ?? ''}
            onChange={(e) => {
              const newTaskId = e.target.value ? Number(e.target.value) : null;
              setSelectedTaskId(newTaskId);
              // Clear error message when task is selected
              if (newTaskId) {
                setErrorMessage(null);
                if (errorTimeout) {
                  clearTimeout(errorTimeout);
                  setErrorTimeout(null);
                }
              }
              
              // Update references for persistence
              timerStateRef.current.selectedTaskId = newTaskId;
            }}
            className="w-full border p-2 rounded mb-3 text-black"
            disabled={isRunning || isPaused}
          >
            <option value="">Seleccionar tarea</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id} className="text-black">
                {task.title} - {getClientName(task)}
              </option>
            ))}
          </select>
          
          {/* Description field */}
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              // Update references for persistence
              timerStateRef.current.description = e.target.value;
            }}
            placeholder="Descripción de la actividad"
            className="w-full border p-2 rounded mb-3 text-black resize-none"
            rows={2}
            disabled={isSaving}
          />
          
          <div className="text-center text-xl font-bold mb-3 text-black">
            {formatTime(displayTime)} {/* Changed to use displayTime */}
          </div>
          
          {startTime && (
            <div className="text-center text-sm text-gray-500 mb-3">
              Started at {formatStartTime()}
            </div>
          )}
          
          {errorMessage && (
            <div className="text-center text-sm text-red-500 mb-3">
              {errorMessage}
            </div>
          )}
          
          {isSaving && (
            <div className="text-center text-sm text-blue-500 mb-3 flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 mr-2"></div>
              Saving to server...
            </div>
          )}
          
          <div className="flex flex-col gap-2">
            {!isRunning && !isPaused && !currentTimeEntry && (
              <button 
                onClick={handleStart} 
                className="bg-green-500 text-white px-4 py-2 rounded w-full hover:bg-green-600 transition flex items-center justify-center"
                disabled={selectedTaskId === null || isSaving}
              >
                <FaPlay className="mr-2" /> Start
              </button>
            )}
            
            {isPaused && currentTimeEntry && (
              <>
                <div className="flex w-full gap-2">
                  <button 
                    onClick={handleResume} 
                    className="bg-green-500 text-white px-4 py-2 rounded flex-1 hover:bg-green-600 transition flex items-center justify-center"
                    disabled={isSaving}
                  >
                    <FaPlay className="mr-2" /> Resume
                  </button>
                  <button 
                    onClick={() => handleStop(true)} 
                    className="bg-blue-500 text-white px-4 py-2 rounded flex-1 hover:bg-blue-600 transition flex items-center justify-center"
                    disabled={isSaving}
                  >
                    <FaSave className="mr-2" /> Save
                  </button>
                </div>
                <button 
                  onClick={handleReset} 
                  className="bg-red-500 text-white px-4 py-2 rounded w-1/2 mx-auto hover:bg-red-600 transition flex items-center justify-center mt-2"
                  disabled={isSaving}
                >
                  <VscDebugRestart className="mr-2" /> Reset
                </button>
              </>
            )}
            
            {isRunning && (
              <div className="flex w-full gap-2">
                <button 
                  onClick={handlePause} 
                  className="bg-yellow-500 text-white px-4 py-2 rounded flex-1 hover:bg-yellow-600 transition flex items-center justify-center"
                  disabled={isSaving}
                >
                  <FaPause className="mr-2" /> Pause
                </button>
                <button 
                  onClick={() => handleStop(true)} 
                  className="bg-red-500 text-white px-4 py-2 rounded flex-1 hover:bg-red-600 transition flex items-center justify-center"
                  disabled={isSaving}
                >
                  <FaStop className="mr-2" /> Stop
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={handleManualRefresh} 
            className="bg-gray-500 text-white px-4 py-2 rounded w-full mt-3 hover:bg-gray-600 transition flex items-center justify-center"
          >
            <FaSync className="mr-2" /> Refresh
          </button>
          
        </div>
      )}
    </div>
  );
};

export default FloatingTimer;
