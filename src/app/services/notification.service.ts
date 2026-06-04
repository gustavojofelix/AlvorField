import { Injectable, inject } from '@angular/core';
import { Subject, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

export interface SimulatedNotification {
  id: string | number;
  userId: string | number;
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
  private supabaseService = inject(SupabaseService);
  private notificationSentSubject = new Subject<SimulatedNotification>();

  get notificationSent$(): Observable<SimulatedNotification> {
    return this.notificationSentSubject.asObservable();
  }

  // Obter todas as notificações simuladas do Supabase
  async getNotifications(userId?: string | number): Promise<SimulatedNotification[]> {
    let query = this.supabaseService.client
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;
    if (error || !data) return [];

    return data.map(n => ({
      id: n.id,
      userId: n.user_id,
      userName: 'Utilizador',
      type: (n.type as any) || 'Push',
      event: 'interesse', // Evento simplificado
      title: n.title,
      body: n.message,
      recipient: 'PWA/Dispositivo',
      timestamp: new Date(n.created_at).getTime()
    }));
  }

  // Envia e regista notificações no Supabase
  async sendNotification(
    userId: string | number,
    event: 'otp' | 'interesse' | 'aceite' | 'recusa',
    title: string,
    body: string,
    fallbackTelefone?: string,
    fallbackNome?: string
  ): Promise<void> {
    const userName = fallbackNome || 'Utilizador AlvorField';
    const telefone = fallbackTelefone || '';

    // Salvar no Banco se o utilizador estiver registado
    if (userId && userId !== 0 && userId !== '0') {
      await this.supabaseService.client
        .from('notifications')
        .insert({
          user_id: userId,
          title: title,
          message: body,
          type: event,
          is_read: false
        });
    }

    // 1. Simulação SMS
    if (telefone) {
      const smsNotif: SimulatedNotification = {
        id: Date.now() + Math.random(),
        userId,
        userName,
        type: 'SMS',
        event,
        title: 'SMS: ' + title,
        body,
        recipient: telefone,
        timestamp: Date.now()
      };
      this.notificationSentSubject.next(smsNotif);
      console.info(`[SMS SIMULADO] Enviado para ${telefone}: ${body}`);
    }

    // 2. Simulação Push
    const pushNotif: SimulatedNotification = {
      id: Date.now() + Math.random(),
      userId,
      userName,
      type: 'Push',
      event,
      title,
      body,
      recipient: 'Browser Push Service / PWA',
      timestamp: Date.now()
    };
    this.notificationSentSubject.next(pushNotif);
    console.info(`[PUSH SIMULADO] Enviado para PWA/Browser: [${title}] ${body}`);

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/assets/icons/icon-192x192.png'
      });
    }
  }

  // Limpar histórico
  async clearNotifications(userId?: string | number): Promise<void> {
    let query = this.supabaseService.client.from('notifications').delete();
    if (userId) {
      query = query.eq('user_id', userId);
    } else {
      query = query.neq('id', '00000000-0000-0000-0000-000000000000');
    }
    await query;
  }

  requestBrowserPermission(): Promise<string> {
    if (!('Notification' in window)) {
      return Promise.resolve('not-supported');
    }
    return Notification.requestPermission();
  }
}
