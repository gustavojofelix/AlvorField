import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NotificationService, SimulatedNotification } from '../../services/notification.service';
import { Subscription } from 'rxjs';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-notification-simulator',
  standalone: true,
  imports: [
    CommonModule,
    MatIconModule,
    MatBadgeModule,
    MatButtonModule,
    MatTooltipModule
  ],
  templateUrl: './notification-simulator.component.html',
  styleUrl: './notification-simulator.component.scss'
})
export class NotificationSimulatorComponent implements OnInit, OnDestroy {
  notifications: SimulatedNotification[] = [];
  isOpen = false;
  activeTab: 'sms' | 'email' | 'push' = 'sms';
  unreadCount = 0;
  browserPermission: NotificationPermission | 'not-supported' = 'default';

  private sub?: Subscription;

  // Visualização de detalhe do E-mail selecionado
  selectedEmail: SimulatedNotification | null = null;

  constructor(private notificationService: NotificationService) {}

  async ngOnInit(): Promise<void> {
    await this.loadNotifications();
    this.checkBrowserPermission();

    // Ouvir novas notificações em tempo real
    this.sub = this.notificationService.notificationSent$.subscribe((newNotif) => {
      this.notifications.unshift(newNotif);
      if (!this.isOpen) {
        this.unreadCount++;
      }
      if (newNotif.type === 'Email' && !this.selectedEmail) {
        this.selectedEmail = newNotif;
      }
    });

    // Definir e-mail inicial se houver
    const emails = this.getEmails();
    if (emails.length > 0) {
      this.selectedEmail = emails[0];
    }
  }

  ngOnDestroy(): void {
    if (this.sub) {
      this.sub.unsubscribe();
    }
  }

  async loadNotifications(): Promise<void> {
    this.notifications = await this.notificationService.getNotifications();
  }

  togglePanel(): void {
    this.isOpen = !this.isOpen;
    if (this.isOpen) {
      this.unreadCount = 0;
    }
  }

  setTab(tab: 'sms' | 'email' | 'push'): void {
    this.activeTab = tab;
    if (tab === 'email') {
      const emails = this.getEmails();
      if (emails.length > 0 && !this.selectedEmail) {
        this.selectedEmail = emails[0];
      }
    }
  }

  getSMS(): SimulatedNotification[] {
    return this.notifications.filter(n => n.type === 'SMS');
  }

  getEmails(): SimulatedNotification[] {
    return this.notifications.filter(n => n.type === 'Email');
  }

  getPush(): SimulatedNotification[] {
    return this.notifications.filter(n => n.type === 'Push');
  }

  selectEmail(email: SimulatedNotification): void {
    this.selectedEmail = email;
  }

  async clearAll(): Promise<void> {
    await this.notificationService.clearNotifications();
    this.notifications = [];
    this.selectedEmail = null;
    this.unreadCount = 0;
  }

  checkBrowserPermission(): void {
    if (!('Notification' in window)) {
      this.browserPermission = 'not-supported';
    } else {
      this.browserPermission = Notification.permission;
    }
  }

  requestPermission(): void {
    this.notificationService.requestBrowserPermission().then((res) => {
      this.browserPermission = res as any;
    });
  }

  // Helper para agrupar SMS por remetente/destinatário ou apenas formatar
  formatPhone(phone: string): string {
    if (!phone) return 'AlvorField';
    return `+258 ${phone}`;
  }
}
