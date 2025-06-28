// Define a shared Task interface to be used across components
export interface Task {
  id: number;
  title: string;
  status: string;
  due_date?: string; // Optional in TaskUpdate
  assignment_date?: string; // Optional assignment date
  client_id: number; // Required in TaskCreate
  client_name?: string; // Optional display field
  billing_type?: 'hourly' | 'percentage'; // Optional in TaskUpdate, required in TaskCreate
  area?: string | null; // Optional
  note?: string | null; // Optional
  total_value?: number | null; // Optional
  total_billed?: number | null; // Optional float value for billing amounts
  // Keep potentially redundant fields for now to avoid breaking changes elsewhere.
  client?: string;
  name: string;
  permanent: boolean;
  tarif?: number | null; // Optional float value for permanent task rate
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
