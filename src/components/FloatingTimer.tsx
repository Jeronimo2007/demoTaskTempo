import React, { useState, useEffect, useRef } from 'react';

type Task = {
  id: number;
  name: string;
  color: string; 
};

type TimeEntry = {
  taskId: number;
  duration: number; 
  date: Date;
};

interface FloatingTimerProps {
  tasks: Task[];
  onTimeEntryCreate: (entry: TimeEntry) => void;
}

const FloatingTimer: React.FC<FloatingTimerProps> = ({ tasks, onTimeEntryCreate }) => {
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [position, setPosition] = useState({ x: 20, y: 500 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  
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
  }, [isDragging]);

  // Timer control functions
  const handleStart = () => {
    if (selectedTaskId !== null) {
      setIsRunning(true);
    }
  };

  const handleStop = () => {
    if (selectedTaskId !== null && isRunning) {
      setIsRunning(false);
      onTimeEntryCreate({ 
        taskId: selectedTaskId, 
        duration: elapsedTime, 
        date: new Date() 
      });
      setElapsedTime(0);
    }
  };

  const handlePause = () => {
    setIsRunning(false);
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
        <span className="font-medium truncate">
          {selectedTask ? selectedTask.name : 'Select a task'}
        </span>
        <button onClick={toggleMinimize} className="ml-2 text-gray-700 hover:text-gray-900">
          {isMinimized ? '↑' : '↓'}
        </button>
      </div>
      
      {!isMinimized && (
        <div className="p-3 bg-white">
          <select
            value={selectedTaskId ?? ''}
            onChange={(e) => setSelectedTaskId(Number(e.target.value) || null)}
            className="w-full border p-2 rounded mb-3"
            disabled={isRunning}
          >
            <option value="">Select Task</option>
            {tasks.map((task) => (
              <option key={task.id} value={task.id}>
                {task.name}
              </option>
            ))}
          </select>
          
          <div className="text-center text-xl font-bold mb-3">
            {formatTime(elapsedTime)}
          </div>
          
          <div className="flex justify-between gap-2">
            {!isRunning ? (
              <button 
                onClick={handleStart} 
                className="bg-green-500 text-white px-4 py-2 rounded w-full"
                disabled={selectedTaskId === null}
              >
                Start
              </button>
            ) : (
              <>
                <button onClick={handlePause} className="bg-yellow-500 text-white px-4 py-2 rounded flex-1">
                  Pause
                </button>
                <button onClick={handleStop} className="bg-red-500 text-white px-4 py-2 rounded flex-1">
                  Stop
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FloatingTimer;
