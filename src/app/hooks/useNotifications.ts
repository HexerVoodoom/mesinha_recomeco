import { useEffect, useRef } from 'react';
import { ListItem } from '../utils/api';
import faviconImage from 'figma:asset/be6328a8ae35307c0da22bbdbf01ed618424fba1.png';

interface NotificationSchedule {
  itemId: string;
  time: string;
  days: string[];
  forMateus: boolean;
  forAmanda: boolean;
  title: string;
  active: boolean;
}

export function useNotifications(currentUser: 'Amanda' | 'Mateus' | null) {
  const scheduledNotifications = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const lastCheckTime = useRef<Date>(new Date());

  // Solicitar permissão de notificação
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Função para mostrar notificação
  const showNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`💝 Mesinha - ${title}`, {
        body,
        icon: faviconImage,
        badge: faviconImage,
        tag: 'mesinha-reminder',
        requireInteraction: false,
        silent: false,
      });
    }
  };

  // Função para agendar notificação de lembrete
  const scheduleReminder = (schedule: NotificationSchedule) => {
    // Limpar agendamento anterior se existir
    const existingTimeout = scheduledNotifications.current.get(schedule.itemId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    if (!schedule.active) {
      scheduledNotifications.current.delete(schedule.itemId);
      return;
    }

    // Verificar se o lembrete é para o usuário atual
    const isForCurrentUser = 
      (currentUser === 'Mateus' && schedule.forMateus) ||
      (currentUser === 'Amanda' && schedule.forAmanda);

    if (!isForCurrentUser) {
      return;
    }

    const checkAndNotify = () => {
      const now = new Date();
      const currentDay = now.toLocaleDateString('pt-BR', { weekday: 'long' }).toLowerCase();
      const currentTime = now.toTimeString().slice(0, 5);

      // Mapear dias em português para inglês
      const dayMap: { [key: string]: string } = {
        'domingo': 'sunday',
        'segunda-feira': 'monday',
        'terça-feira': 'tuesday',
        'quarta-feira': 'wednesday',
        'quinta-feira': 'thursday',
        'sexta-feira': 'friday',
        'sábado': 'saturday',
      };

      const mappedDay = dayMap[currentDay];

      // Verificar se hoje é um dos dias configurados
      const shouldNotifyToday = schedule.days.includes(mappedDay);

      // Verificar se é o horário certo (com margem de 1 minuto)
      const [scheduleHour, scheduleMinute] = schedule.time.split(':').map(Number);
      const [currentHour, currentMinute] = currentTime.split(':').map(Number);

      const isRightTime = 
        scheduleHour === currentHour && 
        Math.abs(scheduleMinute - currentMinute) <= 1;

      // Verificar se já notificou neste minuto
      const lastCheck = lastCheckTime.current;
      const alreadyNotified = 
        lastCheck.getHours() === now.getHours() &&
        lastCheck.getMinutes() === now.getMinutes();

      if (shouldNotifyToday && isRightTime && !alreadyNotified) {
        showNotification('Lembrete', schedule.title);
        lastCheckTime.current = now;
      }
    };

    // Verificar a cada 30 segundos
    const interval = setInterval(checkAndNotify, 30000);
    scheduledNotifications.current.set(schedule.itemId, interval as any);

    // Verificar imediatamente
    checkAndNotify();
  };

  // Função para atualizar lembretes baseado em itens
  const updateReminders = (items: ListItem[]) => {
    // Filtrar apenas itens da categoria alarm
    const alarmItems = items.filter(item => item.category === 'alarm');

    // Agendar cada lembrete
    alarmItems.forEach(item => {
      if (item.reminderTime && item.reminderDays && item.reminderDays.length > 0) {
        scheduleReminder({
          itemId: item.id,
          time: item.reminderTime,
          days: item.reminderDays,
          forMateus: item.reminderForMateus || false,
          forAmanda: item.reminderForAmanda || false,
          title: item.title,
          active: item.reminderActive !== false, // Por padrão é true
        });
      }
    });

    // Remover agendamentos de itens que não existem mais
    const currentItemIds = new Set(alarmItems.map(item => item.id));
    Array.from(scheduledNotifications.current.keys()).forEach(id => {
      if (!currentItemIds.has(id)) {
        const timeout = scheduledNotifications.current.get(id);
        if (timeout) {
          clearTimeout(timeout);
        }
        scheduledNotifications.current.delete(id);
      }
    });
  };

  // Função para notificar novo item no mural
  const notifyNewMuralItem = (item: ListItem) => {
    // Só notificar se não foi o usuário atual que criou
    if (item.createdBy !== currentUser) {
      const contentType = item.muralContentType || 'text';
      const typeEmoji = {
        text: '📝',
        image: '🖼️',
        video: '🎥',
        audio: '🎵',
      }[contentType];

      showNotification(
        'Novo no Mural!',
        `${item.createdBy} adicionou: ${typeEmoji} ${item.title || 'Novo post'}`
      );
    }
  };

  // Limpar todos os agendamentos quando desmontar
  useEffect(() => {
    return () => {
      scheduledNotifications.current.forEach(timeout => {
        clearTimeout(timeout);
      });
      scheduledNotifications.current.clear();
    };
  }, []);

  return {
    updateReminders,
    notifyNewMuralItem,
    showNotification,
  };
}