// Actualiza el componente TaskCard para mostrar el nombre del cliente desde la propiedad client
import React from 'react';
import { Task } from '@/types/task';

interface TaskCardProps {
  task: Task;
  // Otras propiedades que pueda tener
}

const TaskCard: React.FC<TaskCardProps> = ({ task, ...props }) => {
  // Usa la propiedad client si existe, de lo contrario usa client_name o un valor por defecto
  const clientName = task.client || task.client_name || 'Cliente no asignado';
  
  return (
    <div className="task-card">
      <h3>{task.title}</h3>
      <div className="task-details">
        <p>Estado: {task.status}</p>
        <p>Fecha límite: {new Date(task.due_date).toLocaleDateString()}</p>
        <p>Cliente: {clientName}</p>
      </div>
      {/* Resto del componente */}
    </div>
  );
};

export default TaskCard;