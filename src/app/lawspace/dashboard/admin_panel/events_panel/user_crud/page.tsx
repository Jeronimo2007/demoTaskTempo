'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Button, Table, Modal, Form, Input, Space, Popconfirm, message, Switch, Select } from 'antd';
import { FaPlus, FaEdit, FaTrash, FaUser } from 'react-icons/fa';
import axios from 'axios';
import ProtectedRoute from '@/components/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';

const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface UserCreate {
  username: string;
  password: string;
  email: string;
  role: string;
  salary: number;
  cost: number;
  cost_per_hour_client: number;
  desvinculado: boolean;
  weekly_hours: number;
}

interface UserUpdate {
  id: number;
  username?: string | null;
  password?: string | null;
  email?: string | null;
  role?: string | null;
  salary?: number | null;
  cost?: number | null;
  cost_per_hour_client?: number | null;
  desvinculado?: boolean | null;
  weekly_hours?: number | null;
}

interface User extends Omit<UserCreate, 'password'> {
  id: number;
}

const UserCrudPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { isAuthenticated, logout } = useAuth();

  const roles = [
    { value: 'socio', label: 'Socio' },
    { value: 'senior', label: 'Senior' },
    { value: 'junior', label: 'Junior' },
    { value: 'consultor', label: 'Consultor' },
    { value: 'auxiliar', label: 'Auxiliar' },
  ];

  // Get token from cookies
  const getToken = (): string => {
    return document.cookie
      .split('; ')
      .find((row) => row.startsWith('token='))
      ?.split('=')[1] || '';
  };

  // Fetch users on component mount
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      const response = await axios.get(`${API_URL}/user_crud/get_all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
    } catch (err) {
      message.error('Error al cargar los usuarios');
      console.error('Error al cargar los usuarios:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
      }
    } finally {
      setLoading(false);
    }
  }, [getToken, logout]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [isAuthenticated, fetchUsers]);

  const handleCreate = async (values: UserCreate) => {
    try {
      const token = getToken();
      // Only send the required fields
      const userData = {
        username: values.username,
        password: values.password,
        email: values.email,
        role: values.role,
        salary: values.salary,
        cost: values.cost,
        cost_per_hour_client: values.cost_per_hour_client,
        desvinculado: values.desvinculado,
        weekly_hours: values.weekly_hours
      };
      const response = await axios.post(`${API_URL}/user_crud/create`, userData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data === 'creado exitosamente') {
        message.success('Usuario creado exitosamente');
        setCreateModalVisible(false);
        form.resetFields();
        fetchUsers();
      }
    } catch (err) {
      message.error('Error al crear el usuario');
      console.error('Error al crear el usuario:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
      }
    }
  };

  const handleUpdate = async (values: UserUpdate) => {
    try {
      const token = getToken();
      if (!editingUser) {
        message.error('Error: No se encontró el usuario a actualizar');
        return;
      }
      // Only send fields that have values
      const userData = {
        id: editingUser.id,
        ...(values.username && { username: values.username }),  // Allow username to be updated
        ...(values.password && { password: values.password }),
        ...(values.email && { email: values.email }),
        ...(values.role && { role: values.role }),
        ...(values.salary !== null && { salary: values.salary }),
        ...(values.cost !== null && { cost: values.cost }),
        ...(values.cost_per_hour_client !== null && { cost_per_hour_client: values.cost_per_hour_client }),
        ...(values.desvinculado !== null && { desvinculado: values.desvinculado }),
        ...(values.weekly_hours !== null && { weekly_hours: values.weekly_hours })
      };
      const response = await axios.put(`${API_URL}/user_crud/update`, userData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data === 'actualizado exitosamente') {
        message.success('Usuario actualizado exitosamente');
        setEditModalVisible(false);
        form.resetFields();
        fetchUsers();
      }
    } catch (err) {
      message.error('Error al actualizar el usuario');
      console.error('Error al actualizar el usuario:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
      }
    }
  };

  const handleDelete = async (userId: number) => {
    try {
      const token = getToken();
      const response = await axios.delete(`${API_URL}/user_crud/delete`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { user_id: userId }
      });
      if (response.data === 'eliminado exitosamente') {
        message.success('Usuario eliminado exitosamente');
        fetchUsers();
      }
    } catch (err) {
      message.error('Error al eliminar el usuario');
      console.error('Error al eliminar el usuario:', err);
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        logout();
      }
    }
  };

  const startEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      salary: user.salary,
      cost: user.cost,
      cost_per_hour_client: user.cost_per_hour_client,
      desvinculado: user.desvinculado,
      weekly_hours: user.weekly_hours
    });
    setEditModalVisible(true);
  };

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      className: 'text-black',
    },
    {
      title: 'Usuario',
      dataIndex: 'username',
      key: 'username',
      className: 'text-black',
      render: (username: string) => (
        <div className="flex items-center text-black">
          <FaUser className="mr-2 text-blue-500" />
          {username}
        </div>
      ),
    },
    {
      title: 'Nombre',
      dataIndex: 'name',
      key: 'name',
      className: 'text-black',
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      className: 'text-black',
    },
    {
      title: 'Rol',
      dataIndex: 'role',
      key: 'role',
      className: 'text-black',
      render: (role: string) => role.charAt(0).toUpperCase() + role.slice(1),
    },
    {
      title: 'Salario',
      dataIndex: 'salary',
      key: 'salary',
      className: 'text-black',
      render: (salary: number) => `$${salary.toFixed(2)}`,
    },
    {
      title: 'Costo',
      dataIndex: 'cost',
      key: 'cost',
      className: 'text-black',
      render: (cost: number) => `$${cost.toFixed(2)}`,
    },
    {
      title: 'Costo/Hora Cliente',
      dataIndex: 'cost_per_hour_client',
      key: 'cost_per_hour_client',
      className: 'text-black',
      render: (cost: number) => `$${cost.toFixed(2)}`,
    },
    {
      title: 'Horas Semanales',
      dataIndex: 'weekly_hours',
      key: 'weekly_hours',
      className: 'text-black',
      render: (hours: number) => `${hours.toFixed(2)}h`,
    },
    {
      title: 'Desvinculado',
      dataIndex: 'desvinculado',
      key: 'desvinculado',
      className: 'text-black',
      render: (desvinculado: boolean) => (
        <Switch checked={desvinculado} disabled />
      ),
    },
    {
      title: 'Acciones',
      key: 'actions',
      className: 'text-black',
      render: (_: unknown, record: User) => (
        <Space size="middle">
          <Button
            type="primary"
            icon={<FaEdit className="mr-1" />}
            onClick={() => startEditUser(record)}
            className="flex items-center"
          >
            Editar
          </Button>
          <Popconfirm
            title={`¿Está seguro de eliminar al usuario ${record.username}?`}
            onConfirm={() => handleDelete(record.id)}
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
    <ProtectedRoute allowedRoles={['socio']}>
      <div className="p-6 text-black">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-black">Panel de Usuarios</h1>
          <Button
            type="primary"
            className="flex items-center"
            onClick={() => {
              form.resetFields();
              setCreateModalVisible(true);
            }}
          >
            <FaPlus className="mr-2" /> Crear Usuario
          </Button>
        </div>

        <Table
          columns={columns}
          dataSource={users}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10 }}
          className="text-black"
        />

        {/* Create User Modal */}
        <Modal
          title={
            <div className="flex items-center text-black">
              <FaPlus className="mr-2 text-green-500" />
              <span>Crear Nuevo Usuario</span>
            </div>
          }
          open={createModalVisible}
          onCancel={() => setCreateModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreate}
            className="text-black"
          >
            <Form.Item
              name="username"
              label={<span className="text-black">Usuario</span>}
              rules={[{ required: true, message: 'Por favor ingrese un usuario' }]}
            >
              <Input placeholder="Usuario" className="text-black" />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-black">Contraseña</span>}
              rules={[{ required: true, message: 'Por favor ingrese una contraseña' }]}
            >
              <Input.Password placeholder="Contraseña" className="text-black" />
            </Form.Item>

            <Form.Item
              name="email"
              label={<span className="text-black">Email</span>}
              rules={[
                { required: true, message: 'Por favor ingrese un email' },
                { type: 'email', message: 'Por favor ingrese un email válido' }
              ]}
            >
              <Input placeholder="Email" className="text-black" />
            </Form.Item>

            <Form.Item
              name="role"
              label={<span className="text-black">Rol</span>}
              rules={[{ required: true, message: 'Por favor seleccione un rol' }]}
            >
              <Select
                placeholder="Seleccione un rol"
                options={roles}
                className="text-black"
              />
            </Form.Item>

            <Form.Item
              name="salary"
              label={<span className="text-black">Salario</span>}
              rules={[{ required: true, message: 'Por favor ingrese un salario' }]}
            >
              <Input type="number" step="0.01" placeholder="Salario" className="text-black" />
            </Form.Item>

            <Form.Item
              name="cost"
              label={<span className="text-black">Costo</span>}
              rules={[{ required: true, message: 'Por favor ingrese un costo' }]}
            >
              <Input type="number" step="0.01" placeholder="Costo" className="text-black" />
            </Form.Item>

            <Form.Item
              name="cost_per_hour_client"
              label={<span className="text-black">Costo por Hora Cliente</span>}
              rules={[{ required: true, message: 'Por favor ingrese un costo por hora' }]}
            >
              <Input type="number" step="0.01" placeholder="Costo por Hora Cliente" className="text-black" />
            </Form.Item>

            <Form.Item
              name="weekly_hours"
              label={<span className="text-black">Horas Semanales</span>}
              rules={[{ required: true, message: 'Por favor ingrese las horas semanales' }]}
            >
              <Input type="number" step="0.01" placeholder="Horas Semanales" className="text-black" />
            </Form.Item>

            <Form.Item
              name="desvinculado"
              label={<span className="text-black">Desvinculado</span>}
              valuePropName="checked"
            >
              <Switch />
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

        {/* Edit User Modal */}
        <Modal
          title={
            <div className="flex items-center text-black">
              <FaEdit className="mr-2 text-blue-500" />
              <span>Editar Usuario</span>
            </div>
          }
          open={editModalVisible}
          onCancel={() => setEditModalVisible(false)}
          footer={null}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleUpdate}
            className="text-black"
          >
            <Form.Item
              name="username"
              label={<span className="text-black">Usuario</span>}
              rules={[{ required: true, message: 'Por favor ingrese un usuario' }]}
            >
              <Input placeholder="Usuario" className="text-black" />
            </Form.Item>

            <Form.Item
              name="password"
              label={<span className="text-black">Contraseña</span>}
              rules={[{ required: false }]}
            >
              <Input.Password placeholder="Dejar en blanco para mantener la contraseña actual" className="text-black" />
            </Form.Item>

            <Form.Item
              name="email"
              label={<span className="text-black">Email</span>}
              rules={[
                { required: true, message: 'Por favor ingrese un email' },
                { type: 'email', message: 'Por favor ingrese un email válido' }
              ]}
            >
              <Input placeholder="Email" className="text-black" />
            </Form.Item>

            <Form.Item
              name="role"
              label={<span className="text-black">Rol</span>}
              rules={[{ required: true, message: 'Por favor seleccione un rol' }]}
            >
              <Select
                placeholder="Seleccione un rol"
                options={roles}
                className="text-black"
              />
            </Form.Item>

            <Form.Item
              name="salary"
              label={<span className="text-black">Salario</span>}
              rules={[{ required: true, message: 'Por favor ingrese un salario' }]}
            >
              <Input type="number" step="0.01" placeholder="Salario" className="text-black" />
            </Form.Item>

            <Form.Item
              name="cost"
              label={<span className="text-black">Costo</span>}
              rules={[{ required: true, message: 'Por favor ingrese un costo' }]}
            >
              <Input type="number" step="0.01" placeholder="Costo" className="text-black" />
            </Form.Item>

            <Form.Item
              name="cost_per_hour_client"
              label={<span className="text-black">Costo por Hora Cliente</span>}
              rules={[{ required: true, message: 'Por favor ingrese un costo por hora' }]}
            >
              <Input type="number" step="0.01" placeholder="Costo por Hora Cliente" className="text-black" />
            </Form.Item>

            <Form.Item
              name="weekly_hours"
              label={<span className="text-black">Horas Semanales</span>}
              rules={[{ required: true, message: 'Por favor ingrese las horas semanales' }]}
            >
              <Input type="number" step="0.01" placeholder="Horas Semanales" className="text-black" />
            </Form.Item>

            <Form.Item
              name="desvinculado"
              label={<span className="text-black">Desvinculado</span>}
              valuePropName="checked"
            >
              <Switch />
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
    </ProtectedRoute>
  );
};

export default UserCrudPage;