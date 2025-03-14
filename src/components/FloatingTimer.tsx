import React, { useState, useEffect, useRef } from 'react';
import { FaPlay, FaPause, FaStop, FaSave } from 'react-icons/fa';
import { VscDebugRestart } from 'react-icons/vsc';

type Task = {
  id: number;
  title: string;
  status: string;
  due_date: string;
  client: string;
  assigned_to: string;
  color: string;
};

type TimeEntry = {
  id?: number;
  taskId: number;
  start_time?: Date;
  end_time?: Date;
  duration?: number;
};


interface FloatingTimerProps {
  tasks: Task[];
  onTimeEntryCreate: (entry: TimeEntry) => void;
  onEntryCreated?: () => void;
}

const FloatingTimer: React.FC<FloatingTimerProps> = ({ tasks, onTimeEntryCreate, onEntryCreated }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [position, setPosition] = useState({ x: 20, y: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentTimeEntry, setCurrentTimeEntry] = useState<TimeEntry | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  const timerRef = useRef<HTMLDivElement>(null);
  const selectedTask = selectedTaskId ? tasks.find(task => task.id === selectedTaskId) : null;


  // Timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning) {
      timer = setInterval(() => {
        setElapsedTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(timer);
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

  const handleMouseMove = (e: MouseEvent) => {
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
  };

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
  }, [isDragging, dragOffset.x, dragOffset.y]);

  // Timer control functions
  const handleStart = () => {
    if (selectedTaskId !== null) {
      setIsRunning(true);
      setIsPaused(false);
      const now = new Date();
      setStartTime(now);
      
      // Create a new time entry that we'll update later
      const newEntry: TimeEntry = {
        taskId: selectedTaskId,
        start_time: now
      };
      
      setCurrentTimeEntry(newEntry);
      setErrorMessage(null);
    } else {
      setErrorMessage("Please select a task first");
    }
  };

  const handleStop = async (shouldSave: boolean = true) => {
    if (selectedTaskId !== null && (isRunning || isPaused) && currentTimeEntry) {
      setIsRunning(false);
      setIsPaused(false);
      
      if (shouldSave) {
        setIsSaving(true);
        const now = new Date();
        
        // Create the final time entry
        const finalEntry: TimeEntry = {
          ...currentTimeEntry,
          end_time: now,
          duration: elapsedTime
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
          console.error('Error saving time entry:', error);
          setErrorMessage("Failed to save time entry to server");
        } finally {
          // Reset timer
          setIsSaving(false);
          setElapsedTime(0);
          setCurrentTimeEntry(null);
          setStartTime(null);
        }
      } else {
        // Just reset without saving
        setElapsedTime(0);
        setCurrentTimeEntry(null);
        setStartTime(null);
        setErrorMessage(null);
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
        duration: elapsedTime
      });
    }
  };

  const handleResume = () => {
    if (isPaused && currentTimeEntry) {
      setIsRunning(true);
      setIsPaused(false);
    }
  };

  const handleReset = () => {
    // Stop the timer without saving and reset
    handleStop(false);
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
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

  return (
    <div 
      ref={timerRef}
      className={`fixed shadow-lg rounded-lg ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isMinimized ? 'w-48' : 'w-64'}`}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        backgroundColor: selectedTask?.color || 'white',
        borderColor: selectedTask?.color || '#e2e8f0',
        borderWidth: '2px',
        borderStyle: 'solid',
        transition: isDragging ? 'none' : 'all 0.2s ease',
        zIndex: 1000
      }}
    >
      <div 
        className="p-2 flex justify-between items-center border-b"
        onMouseDown={handleMouseDown}
        style={{ backgroundColor: selectedTask?.color || 'white' }}
      >
        <span className="font-medium truncate text-white">
          {selectedTask ? selectedTask.title : 'Select a task'}
        </span>
        <button onClick={toggleMinimize} className="ml-2 text-white hover:text-gray-200">
          {isMinimized ? '↑' : '↓'}
        </button>
      </div>
      
      {!isMinimized && (
        <div className="p-3 bg-white">
          <select
            value={selectedTaskId ?? ''}
            onChange={(e) => setSelectedTaskId(Number(e.target.value) || null)}
            className="w-full border p-2 rounded mb-3"
            disabled={isRunning || isPaused}
          >
            <option value="">Select Task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.title} - {task.client}
              </option>
            ))}
          </select>
          
          <div className="text-center text-xl font-bold mb-3">
            {formatTime(elapsedTime)}
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
          
          <div className="flex justify-between gap-2">
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
                <button 
                  onClick={handleReset} 
                  className="bg-red-500 text-white px-4 py-2 rounded flex-1 hover:bg-red-600 transition flex items-center justify-center"
                  disabled={isSaving}
                >
                  <VscDebugRestart className="mr-2" /> Reset
                </button>
              </div>
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
        </div>
      )}
    </div>
  );
};

export default FloatingTimer;
