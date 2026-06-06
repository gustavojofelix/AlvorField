import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { OfferService, Offer } from './offer.service';
import { NotificationService } from './notification.service';
import { SupabaseService } from './supabase.service';

export interface Interest {
  id: string | number;
  offerId: string | number;
  produto: string;
  produtorId: string | number;
  produtorNome: string;
  produtorTelefone?: string;
  compradorId: string | number;
  compradorNome: string;
  compradorTelefone: string;
  mensagem: string;
  quantidadePretendida?: number | null;
  unidade: 'kg' | 'ton';
  dataInteresse: number;
  status: 'Pendente' | 'Aceite' | 'Recusado' | 'Concluido';
  dataAceite?: number;
  compradorConfirmou?: boolean | null;
  produtorConfirmou?: boolean | null;
  compradorAvaliou?: boolean;
  produtorAvaliou?: boolean;
  precoProposto: number;
}

@Injectable({
  providedIn: 'root'
})
export class InterestService {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);
  private offerService = inject(OfferService);
  private notificationService = inject(NotificationService);

  private mapStatusToDB(status: 'Pendente' | 'Aceite' | 'Recusado' | 'Concluido'): 'pending' | 'accepted' | 'rejected' | 'completed' {
    switch (status) {
      case 'Pendente': return 'pending';
      case 'Aceite': return 'accepted';
      case 'Recusado': return 'rejected';
      case 'Concluido': return 'completed';
    }
  }

  private mapDBToStatus(dbStatus: 'pending' | 'accepted' | 'rejected' | 'completed'): 'Pendente' | 'Aceite' | 'Recusado' | 'Concluido' {
    switch (dbStatus) {
      case 'pending': return 'Pendente';
      case 'accepted': return 'Aceite';
      case 'rejected': return 'Recusado';
      case 'completed': return 'Concluido';
    }
  }

  private mapRecordToInterest(record: any): Interest {
    // produtorTelefone e compradorTelefone são preenchidos
    return {
      id: record.id,
      offerId: record.offer_id,
      produto: record.offers?.product_name || 'Produto',
      produtorId: record.offers?.producer_id,
      produtorNome: record.offers?.profiles?.full_name || 'Produtor',
      produtorTelefone: record.status === 'accepted' || record.status === 'completed' 
        ? record.offers?.profiles?.phone 
        : undefined,
      compradorId: record.buyer_id,
      compradorNome: record.profiles?.full_name || 'Comprador',
      compradorTelefone: record.profiles?.phone || '',
      mensagem: record.message || '',
      quantidadePretendida: record.requested_quantity ? Number(record.requested_quantity) : null,
      unidade: record.offers?.unit || 'kg',
      dataInteresse: new Date(record.created_at).getTime(),
      status: this.mapDBToStatus(record.status),
      dataAceite: record.updated_at ? new Date(record.updated_at).getTime() : undefined,
      compradorConfirmou: record.status === 'completed' ? true : null, // Mapeamento simplificado
      produtorConfirmou: record.status === 'completed' ? true : null,
      compradorAvaliou: false,
      produtorAvaliou: false,
      precoProposto: record.proposed_price ? Number(record.proposed_price) : 0
    };
  }

  // RF-31, RF-32, RF-33: Registar Interesse
  async createInterest(offer: Offer, mensagem: string, quantidadePretendida?: number | null, precoProposto?: number | null): Promise<Interest> {
    const currentUser = this.authService.getCurrentUser();
    if (!currentUser) throw new Error('Utilizador não autenticado.');
    if (currentUser.tipo !== 'Comprador') throw new Error('Apenas compradores podem manifestar interesse.');

    const { data: record, error } = await this.supabaseService.client
      .from('interests')
      .insert({
        offer_id: offer.id,
        buyer_id: currentUser.id,
        requested_quantity: quantidadePretendida || offer.quantidade,
        proposed_price: precoProposto !== undefined && precoProposto !== null ? precoProposto : offer.precoUnitario,
        message: mensagem,
        status: 'pending'
      })
      .select('*, offers(*, profiles(*)), profiles(*)')
      .single();

    if (error || !record) {
      throw new Error(error?.message || 'Erro ao submeter manifestação de interesse.');
    }

    // Enviar notificação ao produtor
    const producerPhone = record.offers?.profiles?.phone || '';
    const notificationSummary = `${currentUser.nome} está interessado na sua oferta de ${offer.produto}.`;
    
    this.notificationService.sendNotification(
      offer.produtorId,
      'interesse',
      'Novo Interesse Recebido',
      notificationSummary,
      producerPhone,
      offer.produtorNome
    );

    return this.mapRecordToInterest(record);
  }

  // RF-34: O produtor visualiza interesses recebidos
  async getReceivedInterests(producerId: string | number): Promise<Interest[]> {
    const { data, error } = await this.supabaseService.client
      .from('interests')
      .select('*, offers!inner(*, profiles(*)), profiles(*)')
      .eq('offers.producer_id', producerId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(r => this.mapRecordToInterest(r));
  }

  // RF-37: Histórico de interações enviadas pelo comprador
  async getSentInterests(buyerId: string | number): Promise<Interest[]> {
    const { data, error } = await this.supabaseService.client
      .from('interests')
      .select('*, offers(*, profiles(*)), profiles(*)')
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(r => this.mapRecordToInterest(r));
  }

  // RF-35: O produtor escolhe "Aceitar contacto"
  async acceptInterest(interestId: string | number): Promise<void> {
    const { data: record, error } = await this.supabaseService.client
      .from('interests')
      .update({ status: 'accepted', updated_at: new Date() })
      .eq('id', interestId)
      .select('*, offers(*, profiles(*)), profiles(*)')
      .single();

    if (error || !record) throw new Error(error?.message || 'Registo de interesse não encontrado.');

    // Notificar o comprador
    const producerName = record.offers?.profiles?.full_name || 'Produtor';
    const producerPhone = record.offers?.profiles?.phone || '';
    const notificationMsg = `O produtor ${producerName} aceitou o seu contacto para a oferta de ${record.offers?.product_name}. Contacto: ${producerPhone}.`;
    
    this.notificationService.sendNotification(
      record.buyer_id,
      'aceite',
      'Contacto Aceite pelo Produtor',
      notificationMsg,
      record.profiles?.phone || '',
      record.profiles?.full_name || ''
    );
  }

  // RF-35: O produtor escolhe "Recusar"
  async refuseInterest(interestId: string | number): Promise<void> {
    const { data: record, error } = await this.supabaseService.client
      .from('interests')
      .update({ status: 'rejected' })
      .eq('id', interestId)
      .select('*, offers(*), profiles(*)')
      .single();

    if (error || !record) throw new Error(error?.message || 'Registo de interesse não encontrado.');

    // Notificar o comprador
    const notificationMsg = `O produtor aceitou recusou o interesse na oferta de ${record.offers?.product_name}.`;
    this.notificationService.sendNotification(
      record.buyer_id,
      'recusa',
      'Contacto Recusado pelo Produtor',
      notificationMsg,
      record.profiles?.phone || '',
      record.profiles?.full_name || ''
    );
  }

  // RF-39, RF-40, RF-41: Confirmar Transação
  async confirmTransaction(interestId: string | number, userId: string | number, confirmed: boolean): Promise<void> {
    // Se ambas as partes confirmarem ou se quisermos simplificar a simulação no banco,
    // atualizamos o status do interesse para 'completed'.
    const { data: record, error } = await this.supabaseService.client
      .from('interests')
      .update({ status: 'completed' })
      .eq('id', interestId)
      .select()
      .single();

    if (error || !record) throw new Error(error?.message || 'Transação não encontrada.');

    // Marcar oferta correspondente como sold (concluída)
    await this.offerService.markAsCompleted(record.offer_id);
  }

  async getAllInterests(): Promise<Interest[]> {
    const { data, error } = await this.supabaseService.client
      .from('interests')
      .select('*, offers(*, profiles(*)), profiles(*)')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(r => this.mapRecordToInterest(r));
  }

  async markAsRated(interestId: string | number, userId: string | number): Promise<void> {
    // Guardado localmente ou inferido
  }

  simulateSevenDaysPassed(interestId: string | number): void {
    // Apenas visual simulado no frontend
  }
}
