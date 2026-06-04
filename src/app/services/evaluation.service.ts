import { Injectable, inject } from '@angular/core';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

export interface Evaluation {
  id: string | number;
  interestId: string | number;
  fromUserId: string | number;
  fromUserName: string;
  toUserId: string | number;
  toUserName: string;
  rating: number; // 1 a 5 estrelas
  comentario?: string;
  dataCriacao: number;
  denunciada: boolean;
  motivoDenuncia?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EvaluationService {
  private supabaseService = inject(SupabaseService);
  private authService = inject(AuthService);

  private mapRecordToEvaluation(record: any): Evaluation {
    return {
      id: record.id,
      interestId: record.interest_id,
      fromUserId: record.reviewer_id,
      fromUserName: record.reviewer?.full_name || 'Comprador/Produtor',
      toUserId: record.reviewee_id,
      toUserName: record.reviewee?.full_name || 'Destinatário',
      rating: Number(record.rating),
      comentario: record.comment || undefined,
      dataCriacao: new Date(record.created_at).getTime(),
      denunciada: record.approved === false, // Se foi ocultada/denunciada
      motivoDenuncia: undefined // Opcional
    };
  }

  // RF-40: Criar avaliação
  async createEvaluation(
    interestId: string | number,
    fromUserId: string | number,
    fromUserName: string,
    toUserId: string | number,
    toUserName: string,
    rating: number,
    comentario?: string
  ): Promise<Evaluation> {
    const { data: record, error } = await this.supabaseService.client
      .from('reviews')
      .insert({
        interest_id: interestId,
        reviewer_id: fromUserId,
        reviewee_id: toUserId,
        rating: Math.max(1, Math.min(5, rating)),
        comment: comentario || null,
        approved: true
      })
      .select('*, reviewer:profiles!reviewer_id(full_name), reviewee:profiles!reviewee_id(full_name)')
      .single();

    if (error || !record) throw new Error(error?.message || 'Erro ao criar avaliação no Supabase.');

    // Recalcular e atualizar a pontuação de reputação média do perfil no banco
    const reputation = await this.getUserReputation(toUserId);
    await this.supabaseService.client
      .from('profiles')
      .update({ reputation_score: reputation.average })
      .eq('id', toUserId);

    return this.mapRecordToEvaluation(record);
  }

  // RF-42: Obter avaliações recebidas por um utilizador
  async getEvaluationsForUser(userId: string | number): Promise<Evaluation[]> {
    const { data, error } = await this.supabaseService.client
      .from('reviews')
      .select('*, reviewer:profiles!reviewer_id(full_name), reviewee:profiles!reviewee_id(full_name)')
      .eq('reviewee_id', userId)
      .eq('approved', true)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(r => this.mapRecordToEvaluation(r));
  }

  // RF-42: Calcular reputação média (média de estrelas e total)
  async getUserReputation(userId: string | number): Promise<{ average: number; total: number }> {
    const { data, error } = await this.supabaseService.client
      .from('reviews')
      .select('rating')
      .eq('reviewee_id', userId)
      .eq('approved', true);

    if (error || !data || data.length === 0) {
      return { average: 5.0, total: 0 };
    }

    const sum = data.reduce((acc, curr) => acc + Number(curr.rating), 0);
    return {
      average: Number((sum / data.length).toFixed(1)),
      total: data.length
    };
  }

  // RF-43: Contar total de transações concluídas do produtor ou comprador
  async getCompletedTransactionsCount(userId: string | number): Promise<number> {
    const { count, error } = await this.supabaseService.client
      .from('interests')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'completed')
      .or(`buyer_id.eq.${userId},offers.producer_id.eq.${userId}`);

    if (error) return 0;
    return count || 0;
  }

  // RF-44: Denunciar avaliação
  async reportEvaluation(evaluationId: string | number, reason: string): Promise<void> {
    // Definimos aprovado como false para ocultar na moderação administrativa
    const { error } = await this.supabaseService.client
      .from('reviews')
      .update({ approved: false })
      .eq('id', evaluationId);

    if (error) throw new Error(error.message);
  }

  // RF-44: Administrador - Listar todas as avaliações denunciadas/não aprovadas
  async getReportedEvaluations(): Promise<Evaluation[]> {
    const { data, error } = await this.supabaseService.client
      .from('reviews')
      .select('*, reviewer:profiles!reviewer_id(full_name), reviewee:profiles!reviewee_id(full_name)')
      .eq('approved', false)
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(r => this.mapRecordToEvaluation(r));
  }

  // RF-44: Administrador - Listar todas as avaliações no sistema
  async getAllEvaluations(): Promise<Evaluation[]> {
    const { data, error } = await this.supabaseService.client
      .from('reviews')
      .select('*, reviewer:profiles!reviewer_id(full_name), reviewee:profiles!reviewee_id(full_name)')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(r => this.mapRecordToEvaluation(r));
  }

  // RF-44: Administrador - Remover avaliação
  async removeEvaluation(evaluationId: string | number): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('reviews')
      .delete()
      .eq('id', evaluationId);

    if (error) throw new Error(error.message);
  }
}
