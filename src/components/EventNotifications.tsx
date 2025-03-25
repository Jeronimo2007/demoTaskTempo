import React, { useState, useEffect, useCallback } from 'react';
import { Badge, Button, Popover, List, Typography, Empty, Spin } from 'antd';
import { FaBell } from 'react-icons/fa';
import axios from 'axios';
import dayjs from 'dayjs';
import { useAuthStore } from '@/store/useAuthStore';

const { Text, Title } = Typography;

// URL de la API
const API_URL = process.env.NEXT_PUBLIC_API_URL;

interface Event {
  id: number;
  title: string;
  event_date: string;
  user_ids: number[];
}

const EventNotifications: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  
  // Obtener el token y el usuario actual del store de autenticación
  const authStore = useAuthStore();
  const currentUser = authStore.user;

  // Función para obtener los headers de autenticación
  const getAuthHeaders = useCallback(() => {
    if (!authStore.token) {
      return {};
    }
    
    return {
      headers: {
        Authorization: `Bearer ${authStore.token}`
      }
    };
  }, [authStore.token]);

  // Obtener todos los eventos
  const fetchEvents = useCallback(async () => {
    if (!authStore.token || !currentUser) {
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/events/get_all_events`, getAuthHeaders());
      setEvents(response.data);
    } catch (error) {
      console.error('Error fetching events:', error);
      // Manejar el error silenciosamente para no interrumpir la UI
    } finally {
      setLoading(false);
    }
  }, [authStore.token, currentUser, getAuthHeaders]);

  // Filtrar eventos próximos que pertenecen al usuario actual
  useEffect(() => {
    if (events.length > 0 && currentUser) {
      const now = dayjs();
      const oneWeekLater = now.add(7, 'day');
      
      // Filtrar eventos que:
      // 1. Incluyen al usuario actual en user_ids
      // 2. Están programados dentro de los próximos 7 días
      const upcoming = events.filter(event => {
        const eventDate = dayjs(event.event_date);
        const isUpcoming = eventDate.isAfter(now) && eventDate.isBefore(oneWeekLater);
        const isUserEvent = currentUser.id ? event.user_ids.includes(Number(currentUser.id)) : false;
        
        return isUpcoming && isUserEvent;
      });
      
      setUpcomingEvents(upcoming);
    }
  }, [events, currentUser]);

  // Cargar eventos cuando el componente se monta o cuando cambia el token
  useEffect(() => {
    fetchEvents();
    
    // Configurar un intervalo para actualizar los eventos cada 5 minutos
    const intervalId = setInterval(fetchEvents, 5 * 60 * 1000);
    
    // Limpiar el intervalo cuando el componente se desmonta
    return () => clearInterval(intervalId);
  }, [fetchEvents]); // Now fetchEvents is properly memoized

  // Formatear la fecha para mostrar
  const formatDate = (dateString: string) => {
    return dayjs(dateString).format('DD/MM/YYYY');
  };

  // Calcular días restantes hasta el evento
  const getDaysRemaining = (dateString: string) => {
    const eventDate = dayjs(dateString);
    const now = dayjs();
    return eventDate.diff(now, 'day');
  };

  // Contenido del popover
  const content = (
    <div style={{ width: 300 }}>
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Spin />
        </div>
      ) : upcomingEvents.length > 0 ? (
        <List
          itemLayout="horizontal"
          dataSource={upcomingEvents}
          renderItem={event => {
            const daysRemaining = getDaysRemaining(event.event_date);
            let textColor = 'black';
            
            // Cambiar color según la urgencia
            if (daysRemaining <= 1) {
              textColor = 'red';
            } else if (daysRemaining <= 3) {
              textColor = 'orange';
            }
            
            return (
              <List.Item>
                <List.Item.Meta
                  title={<Text strong style={{ color: textColor }}>{event.title}</Text>}
                  description={
                    <div>
                      <Text>Fecha: {formatDate(event.event_date)}</Text>
                      <br />
                      <Text style={{ color: textColor }}>
                        {daysRemaining === 0 
                          ? '¡Hoy!' 
                          : daysRemaining === 1 
                            ? '¡Mañana!' 
                            : `En ${daysRemaining} días`}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            );
          }}
        />
      ) : (
        <Empty 
          description="No tienes eventos próximos esta semana" 
          image={Empty.PRESENTED_IMAGE_SIMPLE} 
        />
      )}
    </div>
  );

  return (
    <Popover
      content={content}
      title={<Title level={5}>Eventos Próximos</Title>}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      <Badge count={upcomingEvents.length} overflowCount={9} size="small">
        <Button 
          icon={<FaBell style={{ fontSize: '16px' }} />} 
          shape="circle" 
          size="large"
          type={upcomingEvents.length > 0 ? "primary" : "default"}
        />
      </Badge>
    </Popover>
  );
};

export default EventNotifications;
