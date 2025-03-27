import React from 'react';
import { Task } from '@/types/task';

interface TaskCardProps {
  task: Task;
}

const TaskCard: React.FC<TaskCardProps> = ({ task }) => {
  const clientName = task.client || task.client_name || 'Cliente no asignado';
  
  // Format due date with null check
  const formattedDueDate = task.due_date 
    ? new Date(task.due_date).toLocaleDateString()
    : 'Sin fecha límite';
  
  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <div className="task-details">
        <p>Estado: {task.status}</p>
        <p>Fecha límite: {formattedDueDate}</p>
        <p>Cliente: {clientName}</p>
      </div>
    </div>
  );
};

export default TaskCard;