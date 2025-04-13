"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Modal, Form, DatePicker, TimePicker, Select, Input, Space, Popconfirm, message } from 'antd';
import { FaPlus, FaEdit, FaTrash, FaCalendarAlt, FaUsers } from 'react-icons/fa';
import dayjs from 'dayjs';
import axios from 'axios';
// import { useAuthStore } from '@/store/useAuthStore'; // Removed useAuthStore
import { useAuth } from '@/contexts/AuthContext'; // Import useAuth
// import { getAuthHeaders } from '@/app/utils/auth-utils'; // Removed getAuthHeaders
import ProtectedRoute from '@/components/ProtectedRoute'; // Import ProtectedRoute

// Usa la variable de entorno para la URL de la API
const API_URL = process.env.NEXT_PUBLIC_API_URL;
const TOKEN_KEY = "token"; // Define token key for cookies

// Interfaces for event data
interface User {
  id: number;
  username: string;  // Cambiado de name a username según la API
}

interface Event {
  id: number;
  title: string;
  description?: string | null;
  event_date: string;
  start_time?: string | null;
  end_time?: string | null;
  user_ids: number[];
}

interface EventFormData {
  title: string;
  description?: string | null;
  event_date: string | null;
  start_time?: string | null;
  end_time?: string | null;
  user_ids: number[];
}

const EventsPanel = () => {
  // State hooks
  const [events, setEvents] = useState<Event[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true); // Start loading true
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Get auth state from context
  const { isAuthenticated, logout } = useAuth(); // Use useAuth hook

  // Function to get token from cookies
  const getToken = useCallback(() => {
    if (typeof window === 'undefined') return ""; // Guard against SSR
    const token = document.cookie
      .split('; ')
      .find((row) => row.startsWith(`${TOKEN_KEY}=`))
      ?.split('=')[1] || "";
    return token;
  }, []);

  // Function to create auth headers
  const getAuthHeadersConfig = useCallback(() => {
    const token = getToken();
    if (!token) {
      message.error('No hay token de autenticación disponible');
      // Optionally logout or redirect if no token
      // logout();
      // router.push('/login');
      return null; // Indicate failure or missing token
    }
    return { headers: { Authorization: `Bearer ${token}` } };
  }, [getToken]);


  // Function to fetch all events
  const fetchEvents = useCallback(async () => {
    const config = getAuthHeadersConfig();
    if (!config) return; // Stop if no token/config

    setLoading(true); // Ensure loading is true when fetching starts
    try {
      const response = await axios.get(`${API_URL}/events/get_all_events`, config);
      setEvents(response.data);
    } catch (error) {
      message.error('Error al cargar los eventos');
      console.error('Error al cargar los eventos:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout(); // Logout on auth error
      }
    } finally {
      setLoading(false); // Always reset loading state
    }
  }, [getAuthHeadersConfig, logout]); // Added logout dependency

  // Function to fetch all users (for the assignment dropdown)
  const fetchUsers = useCallback(async () => {
    const config = getAuthHeadersConfig();
    if (!config) return; // Stop if no token/config

    try {
      const response = await axios.get(`${API_URL}/users/get_all_users`, config);
      setUsers(response.data);
    } catch (error) {
      message.error('Error al cargar los usuarios');
      console.error('Error al cargar los usuarios:', error);
       if (axios.isAxiosError(error) && error.response?.status === 401) {
        logout(); // Logout on auth error
      }
    }
  }, [getAuthHeadersConfig, logout]); // Added logout dependency

  // Fetch events and users on component mount if authenticated
  useEffect(() => {
    const loadData = async () => {
        setLoading(true);
        try {
            await Promise.all([fetchEvents(), fetchUsers()]);
        } catch (error) {
            // Errors are handled within fetchEvents/fetchUsers
            console.error("Error loading initial data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (isAuthenticated) {
      loadData();
    } else {
        setLoading(false); // Ensure loading is false if not authenticated
        // ProtectedRoute should handle redirection
    }
  }, [isAuthenticated, fetchEvents, fetchUsers]); // Depend on isAuthenticated

  // Handle event creation
  const handleCreateEvent = async (values: EventFormData) => {
    const config = getAuthHeadersConfig();
    if (!config) return;

    const formattedDate = values.event_date
      ? dayjs(values.event_date).format('YYYY-MM-DD')
      : null;

    if (!formattedDate) {
      message.error('La fecha es requerida');
      return;
    }

    const eventData = {
      title: values.title,
      description: values.description,
      event_date: formattedDate,
      start_time: values.start_time ? dayjs(values.start_time).format('HH:mm') : null,
      end_time: values.end_time ? dayjs(values.end_time).format('HH:mm') : null,
      user_ids: values.user_ids
    };

    try {
      await axios.post(`${API_URL}/events/create`, eventData, config);
      message.success('Evento creado exitosamente');
      setCreateModalVisible(false);
      form.resetFields();
      fetchEvents(); // Re-fetch events after creation
    } catch (error) {
      if (axios.isAxiosError(error)) {
        message.error(`Error al crear el evento: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
         if (error.response?.status === 401) logout();
      } else {
        message.error(`Error al crear el evento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }
  };

  // Handle event update
  const handleUpdateEvent = async (values: EventFormData) => {
    const config = getAuthHeadersConfig();
    if (!config || !editingEvent) {
        message.error('No se puede actualizar el evento. Falta información o autenticación.');
        return;
    }

    const formattedDate = values.event_date
      ? dayjs(values.event_date).format('YYYY-MM-DD')
      : null;

    if (!formattedDate) {
      message.error('La fecha es requerida');
      return;
    }

    const eventData = {
      title: values.title,
      description: values.description,
      event_date: formattedDate,
      start_time: values.start_time ? dayjs(values.start_time).format('HH:mm') : null,
      end_time: values.end_time ? dayjs(values.end_time).format('HH:mm') : null,
      user_ids: values.user_ids
    };

    try {
      await axios.put(`${API_URL}/events/update/${editingEvent.id}`, eventData, config);
      message.success('Evento actualizado exitosamente');
      setEditModalVisible(false);
      form.resetFields();
      fetchEvents(); // Re-fetch events after update
    } catch (error) {
      if (axios.isAxiosError(error)) {
        message.error(`Error al actualizar el evento: ${error.response?.status} - ${JSON.stringify(error.response?.data)}`);
         if (error.response?.status === 401) logout();
      } else {
        message.error(`Error al actualizar el evento: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }
  };

  // Handle event deletion
  const handleDeleteEvent = async (id: number) => {
    const config = getAuthHeadersConfig();
    if (!config) return;

    try {
      await axios.delete(`${API_URL}/events/delete/${id}`, config);
      message.success('Evento eliminado exitosamente');
      fetchEvents(); // Re-fetch events after deletion
    } catch (error) {
      message.error('Error al eliminar el evento');
      console.error('Error al eliminar el evento:', error);
       if (axios.isAxiosError(error) && error.response?.status === 401) logout();
    }
  };

  // Start editing an event
  const startEditEvent = (event: Event) => {
    setEditingEvent(event);
    form.setFieldsValue({
      title: event.title,
      description: event.description || "",
      event_date: dayjs(event.event_date),
      start_time: event.start_time ? dayjs(event.start_time, "HH:mm") : null,
      end_time: event.end_time ? dayjs(event.end_time, "HH:mm") : null,
      user_ids: event.user_ids,
    });
    setEditModalVisible(true);
  };

  // Get user names from user IDs
  const getUserNames = (userIds: number[]) => {
    return userIds.map(id => {
      const user = users.find(u => u.id === id);
      return user ? user.username : `Usuario #${id}`;
    }).join(', ');
  };

  // Table columns
  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      className: 'text-black',
    },
    {
      title: 'Título',
      dataIndex: 'title',
      key: 'title',
      className: 'text-black',
    },
    {
      title: 'Descripción',
      dataIndex: 'description',
      key: 'description',
      className: 'text-black',
      render: (desc: string) => desc || <span className="text-gray-400">Sin descripción</span>,
    },
    {
      title: 'Fecha de Evento',
      dataIndex: 'event_date',
      key: 'event_date',
      className: 'text-black',
      render: (date: string) => (
        <div className="flex items-center text-black">
          <FaCalendarAlt className="mr-2 text-blue-500" />
          {dayjs(date).format('DD/MM/YYYY')}
        </div>
      ),
    },
    {
      title: 'Hora de Inicio',
      dataIndex: 'start_time',
      key: 'start_time',
      className: 'text-black',
      render: (time: string) => time ? dayjs(time, "HH:mm").format("HH:mm") : <span className="text-gray-400">-</span>,
    },
    {
      title: 'Hora de Fin',
      dataIndex: 'end_time',
      key: 'end_time',
      className: 'text-black',
      render: (time: string) => time ? dayjs(time, "HH:mm").format("HH:mm") : <span className="text-gray-400">-</span>,
    },
    {
      title: 'Usuarios Asignados',
      dataIndex: 'user_ids',
      key: 'user_ids',
      className: 'text-black',
      render: (userIds: number[]) => (
        <div className="flex items-center text-black">
          <FaUsers className="mr-2 text-green-500" />
          {getUserNames(userIds)}
        </div>
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      className: 'text-black',
      render: (_: unknown, record: Event) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<FaEdit className="mr-1" />}
            onClick={() => startEditEvent(record)}
            className="flex items-center"
          >
            Editar
          </Button>
          <Popconfirm
            title="¿Está seguro de eliminar este evento?"
            onConfirm={() => handleDeleteEvent(record.id)}
            okText="Sí"
            cancelText="No"
          >
            <Button
              type="primary"
              danger
              icon={<FaTrash className="mr-1" />}
              className="flex items-center"
            >
              Eliminar
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <ProtectedRoute allowedRoles={['senior', 'socio']}>
      {loading ? (
         <div className="flex justify-center items-center h-screen">
           <p>Cargando eventos...</p>
         </div>
      ) : (
        <div className="p-6 text-black">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-black">Panel de Eventos</h1>
            <Button
              type="primary"
              className="flex items-center"
              onClick={() => {
                form.resetFields();
                setCreateModalVisible(true);
              }}
            >
              <FaPlus className="mr-2" /> Crear Evento
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={events}
            rowKey="id"
            // loading={loading} // Loading state handled by wrapper
            pagination={{ pageSize: 10 }}
            className="text-black"
          />

          {/* Create Event Modal */}
          <Modal
            title={
              <div className="flex items-center text-black">
                <FaPlus className="mr-2 text-green-500" />
                <span>Crear Nuevo Evento</span>
              </div>
            }
            open={createModalVisible}
            onCancel={() => setCreateModalVisible(false)}
            footer={null}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleCreateEvent}
              className="text-black"
            >
              <Form.Item
                name="title"
                label={<span className="text-black">Título</span>}
                rules={[{ required: true, message: 'Por favor ingrese un título' }]}
              >
                <Input placeholder="Título del evento" className="text-black" />
              </Form.Item>

              <Form.Item
                name="description"
                label={<span className="text-black">Descripción</span>}
                rules={[]}
              >
                <Input.TextArea placeholder="Descripción del evento" className="text-black" />
              </Form.Item>

              <Form.Item
                name="event_date"
                label={
                  <div className="flex items-center text-black">
                    <FaCalendarAlt className="mr-2 text-blue-500" />
                    <span>Fecha del Evento</span>
                  </div>
                }
                rules={[{ required: true, message: 'Por favor seleccione una fecha' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  className="text-black"
                />
              </Form.Item>
<Form.Item
  name="start_time"
  label={<span className="text-black">Hora de Inicio</span>}
  rules={[{ required: true, message: 'Por favor seleccione la hora de inicio' }]}
>
  <TimePicker
    format="HH:mm"
    style={{ width: '100%' }}
    className="text-black"
  />
</Form.Item>

<Form.Item
  name="end_time"
  label={<span className="text-black">Hora de Fin</span>}
  rules={[{ required: true, message: 'Por favor seleccione la hora de fin' }]}
>
  <TimePicker
    format="HH:mm"
    style={{ width: '100%' }}
    className="text-black"
  />
</Form.Item>

<Form.Item
  name="user_ids"
  label={
    <div className="flex items-center text-black">
      <FaUsers className="mr-2 text-green-500" />
      <span>Usuarios Asignados</span>
    </div>
  }
  rules={[{ required: true, message: 'Por favor seleccione al menos un usuario' }]}
>
  <Select
    mode="multiple"
    placeholder="Seleccione usuarios"
    style={{ width: '100%' }}
    className="text-black"
  >
    {users.map(user => (
      <Select.Option key={user.id} value={user.id}>
        {user.username}
      </Select.Option>
    ))}
  </Select>
</Form.Item>
<Form.Item>
  <div className="flex justify-end">
    <Button onClick={() => setCreateModalVisible(false)} style={{ marginRight: 8 }}>
      Cancelar
    </Button>
    <Button type="primary" htmlType="submit" className="flex items-center">
      <FaPlus className="mr-1" /> Crear
    </Button>
  </div>
</Form.Item>
</Form>
</Modal>

          {/* Edit Event Modal */}
          <Modal
            title={
              <div className="flex items-center text-black">
                <FaEdit className="mr-2 text-blue-500" />
                <span>Editar Evento</span>
              </div>
            }
            open={editModalVisible}
            onCancel={() => setEditModalVisible(false)}
            footer={null}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleUpdateEvent}
              className="text-black"
            >
              <Form.Item
                name="title"
                label={<span className="text-black">Título</span>}
                rules={[{ required: true, message: 'Por favor ingrese un título' }]}
              >
                <Input placeholder="Título del evento" className="text-black" />
              </Form.Item>

              <Form.Item
                name="description"
                label={<span className="text-black">Descripción</span>}
                rules={[]}
              >
                <Input.TextArea placeholder="Descripción del evento" className="text-black" />
              </Form.Item>

              <Form.Item
                name="event_date"
                label={
                  <div className="flex items-center text-black">
                    <FaCalendarAlt className="mr-2 text-blue-500" />
                    <span>Fecha del Evento</span>
                  </div>
                }
                rules={[{ required: true, message: 'Por favor seleccione una fecha' }]}
              >
                <DatePicker
                  style={{ width: '100%' }}
                  format="YYYY-MM-DD"
                  className="text-black"
                  defaultValue={editingEvent ? dayjs(editingEvent.event_date) : undefined}
                />
              </Form.Item>

              <Form.Item
                name="start_time"
                label={<span className="text-black">Hora de Inicio</span>}
                rules={[{ required: true, message: 'Por favor seleccione la hora de inicio' }]}
              >
                <DatePicker.TimePicker
                  format="HH:mm"
                  style={{ width: '100%' }}
                  className="text-black"
                  defaultValue={editingEvent && editingEvent.start_time ? dayjs(editingEvent.start_time, "HH:mm") : undefined}
                />
              </Form.Item>

              <Form.Item
                name="end_time"
                label={<span className="text-black">Hora de Fin</span>}
                rules={[{ required: true, message: 'Por favor seleccione la hora de fin' }]}
              >
                <DatePicker.TimePicker
                  format="HH:mm"
                  style={{ width: '100%' }}
                  className="text-black"
                  defaultValue={editingEvent && editingEvent.end_time ? dayjs(editingEvent.end_time, "HH:mm") : undefined}
                />
              </Form.Item>

              <Form.Item
                name="user_ids"
                label={
                  <div className="flex items-center text-black">
                    <FaUsers className="mr-2 text-green-500" />
                    <span>Usuarios Asignados</span>
                  </div>
                }
                rules={[{ required: true, message: 'Por favor seleccione al menos un usuario' }]}
              >
                <Select
                  mode="multiple"
                  placeholder="Seleccione usuarios"
                  style={{ width: '100%' }}
                  className="text-black"
                   // Ensure initial value is set correctly if editing
                  defaultValue={editingEvent ? editingEvent.user_ids : undefined}
                >
                  {users.map(user => (
                    <Select.Option key={user.id} value={user.id}>
                      {user.username}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>

              <Form.Item>
                <div className="flex justify-end">
                  <Button onClick={() => setEditModalVisible(false)} style={{ marginRight: 8 }}>
                    Cancelar
                  </Button>
                  <Button type="primary" htmlType="submit" className="flex items-center">
                    <FaEdit className="mr-1" /> Actualizar
                  </Button>
                </div>
              </Form.Item>
            </Form>
          </Modal>
        </div>
      )}
    </ProtectedRoute>
  );
};

export default EventsPanel;
