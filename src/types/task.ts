// Define a shared Task interface to be used across components
export interface Task {
  id: number;
  title: string;
  status: string;
  due_date?: string;
  client?: string;
  client_id?: number | null;
  client_name?: string;
}

// Define an AssignedTask interface for task assignments
export interface AssignedTask {
  id: number;
  user_id: number;
  task_id: number;
  client_id?: number;
  assigned_by: unknown;
}

// Define a TaskWithAssignments interface that extends Task
export interface TaskWithAssignments extends Task {
  assignments?: AssignedTask[]; // Properly typed assignments array
}

// Define a type for task status
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | string;
