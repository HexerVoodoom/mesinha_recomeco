import { useEffect, useRef } from 'react';
import { ListItem } from '../utils/api';
import faviconImage from 'figma:asset/be6328a8ae35307c0da22bbdbf01ed618424fba1.png';
import { projectId } from '/utils/supabase/info';

const BASE_URL = `https://${projectId}.supabase.co/functions/v1/make-server-19717bce`;
const VAPID_PUBLIC_KEY = 'BEeyyQPVJ900xV1F1Jo8Q2TNc2DK7jb9jyiqmQQX3QnUwzJYxy1j5BByQ0vJFDSbPTGacjS3oUtpOKCtxAF5WIY';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)));
}

async function subscribeToPush(currentUser: 'Amanda' | 'Mateus') {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
    }
    await fetch(`${BASE_URL}/push-subscription`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile: currentUser, subscription }),
    });
  } catch (err) {
    console.error('[Push] Failed to subscribe:', err);
  }
}

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
  // Última vez (data + horário) que cada lembrete disparou, para não repetir no mesmo minuto
  const lastNotified = useRef<Map<string, string>>(new Map());

  // Solicitar permissão e registrar push subscription
  useEffect(() => {
    if (!('Notification' in window) || !currentUser) return;

    if (Notification.permission === 'granted') {
      subscribeToPush(currentUser);
    } else if (Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') subscribeToPush(currentUser);
      });
    }
  }, [currentUser]);

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

      // Dia da semana atual como abreviação em inglês (como salvo em reminderDays)
      const dayByIndex = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const mappedDay = dayByIndex[now.getDay()];

      // Verificar se hoje é um dos dias configurados
      const shouldNotifyToday = schedule.days.includes(mappedDay);

      // Verificar se é o horário certo (com margem de 1 minuto)
      const [scheduleHour, scheduleMinute] = schedule.time.split(':').map(Number);
      const isRightTime =
        scheduleHour === now.getHours() &&
        Math.abs(scheduleMinute - now.getMinutes()) <= 1;

      // Chave única por dia + horário do lembrete: evita repetir no mesmo minuto,
      // mas permite disparar novamente no próximo dia configurado.
      const fireKey = `${now.toDateString()} ${schedule.time}`;
      const alreadyNotified = lastNotified.current.get(schedule.itemId) === fireKey;

      if (shouldNotifyToday && isRightTime && !alreadyNotified) {
        showNotification('Lembrete', schedule.title);
        lastNotified.current.set(schedule.itemId, fireKey);
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