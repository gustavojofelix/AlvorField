import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

export interface SimulatedNotification {
  id: number;
  userId: number;
  userName: string;
  type: 'SMS' | 'Email' | 'Push';
  event: 'otp' | 'interesse' | 'aceite' | 'recusa';
  title: string;
  body: string;
  recipient: string; // Telemóvel, Email ou Browser/PWA
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly NOTIFICATIONS_KEY = 'alvorfield_notifications';
  private notificationSentSubject = new Subject<SimulatedNotification>();

  constructor() {}

  get notificationSent$(): Observable<SimulatedNotification> {
    return this.notificationSentSubject.asObservable();
  }

  // Obter todas as notificações simuladas guardadas no histórico
  getNotifications(): SimulatedNotification[] {
    const data = localStorage.getItem(this.NOTIFICATIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  // Envia notificações de acordo com as definições do utilizador (SMS, Email, Push)
  sendNotification(
    userId: number,
    event: 'otp' | 'interesse' | 'aceite' | 'recusa',
    title: string,
    body: string,
    fallbackTelefone?: string,
    fallbackNome?: string
  ): void {
    // Carregar utilizador diretamente do localStorage para evitar dependência circular com AuthService
    const usersData = localStorage.getItem('alvorfield_users');
    let user: any = null;
    if (usersData) {
      try {
        const users = JSON.parse(usersData);
        user = users.find((u: any) => u.id === userId);
      } catch (e) {
        console.error('Erro ao ler utilizadores em NotificationService', e);
      }
    }

    // Se utilizador não existir no DB (ex. durante o envio de OTP de registo), usamos fallback
    const userName = user ? user.nome : (fallbackNome || 'Utilizador Não Registado');
    const telefone = user ? user.telefone : (fallbackTelefone || '');
    const email = user ? user.email : '';

    // Mapeamento dos eventos para as propriedades das preferências do utilizador
    // Registo de novas preferências ou defaults se indefinido
    const settings = {
      sms: true,
      email: true,
      push: true
    };

    if (user) {
      switch (event) {
        case 'otp':
          settings.sms = user.notifSMS_otp !== false;
          settings.email = user.notifEmail_otp !== false;
          settings.push = user.notifPush_otp !== false;
          break;
        case 'interesse':
          settings.sms = user.notifSMS_interesse !== false;
          settings.email = user.notifEmail_interesse !== false;
          settings.push = user.notifPush_interesse !== false;
          break;
        case 'aceite':
          settings.sms = user.notifSMS_aceite !== false;
          settings.email = user.notifEmail_aceite !== false;
          settings.push = user.notifPush_aceite !== false;
          break;
        case 'recusa':
          settings.sms = user.notifSMS_recusa !== false;
          settings.email = user.notifEmail_recusa !== false;
          settings.push = user.notifPush_recusa !== false;
          break;
      }
    }

    const notifications: SimulatedNotification[] = this.getNotifications();
    const timestamp = Date.now();

    // 1. Enviar SMS se configurado (e se tiver telefone)
    if (settings.sms && telefone) {
      const smsNotif: SimulatedNotification = {
        id: Date.now() + Math.random(),
        userId,
        userName,
        type: 'SMS',
        event,
        title: 'SMS: ' + title,
        body,
        recipient: telefone,
        timestamp
      };
      notifications.unshift(smsNotif);
      this.notificationSentSubject.next(smsNotif);
      console.info(`[SMS SIMULADO] Enviado para ${telefone}: ${body}`);
    }

    // 2. Enviar Email se configurado E se o utilizador possuir email
    if (settings.email && email) {
      const emailNotif: SimulatedNotification = {
        id: Date.now() + Math.random(),
        userId,
        userName,
        type: 'Email',
        event,
        title,
        body,
        recipient: email,
        timestamp
      };
      notifications.unshift(emailNotif);
      this.notificationSentSubject.next(emailNotif);
      console.info(`[EMAIL SIMULADO] Enviado para ${email}: Assunto: ${title} - Mensagem: ${body}`);
    } else if (settings.email && !email) {
      console.info(`[EMAIL SIMULADO ADVERTÊNCIA] Opcionalidade de e-mail activa para ${userName}, mas e-mail não fornecido.`);
    }

    // 3. Enviar Push Notification (PWA / Navegador)
    if (settings.push) {
      const pushNotif: SimulatedNotification = {
        id: Date.now() + Math.random(),
        userId,
        userName,
        type: 'Push',
        event,
        title,
        body,
        recipient: 'Browser Push Service / PWA',
        timestamp
      };
      notifications.unshift(pushNotif);
      this.notificationSentSubject.next(pushNotif);
      console.info(`[PUSH SIMULADO] Enviado para PWA/Browser: [${title}] ${body}`);

      // Desparar notificação real de browser se autorização concedida
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: body,
          icon: '/assets/icons/icon-192x192.png' // Ícone padrão PWA
        });
      }
    }

    // Guardar logs no localStorage
    localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(notifications));
  }

  // Limpar logs
  clearNotifications(): void {
    localStorage.removeItem(this.NOTIFICATIONS_KEY);
  }

  // Pedir autorização para notificações reais no browser (para utilizadores com PWA / Web)
  requestBrowserPermission(): Promise<string> {
    if (!('Notification' in window)) {
      return Promise.resolve('not-supported');
    }
    return Notification.requestPermission();
  }
}
