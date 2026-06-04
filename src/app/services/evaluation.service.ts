import { Injectable } from '@angular/core';
import { AuthService } from './auth.service';

export interface Evaluation {
  id: number;
  interestId: number;
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
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
  private readonly EVALUATIONS_KEY = 'alvorfield_evaluations';

  constructor(private authService: AuthService) {
    this.initializeMockEvaluations();
  }

  private getEvaluations(): Evaluation[] {
    const data = localStorage.getItem(this.EVALUATIONS_KEY);
    return data ? JSON.parse(data) : [];
  }

  private saveEvaluations(evaluations: Evaluation[]): void {
    localStorage.setItem(this.EVALUATIONS_KEY, JSON.stringify(evaluations));
  }

  private initializeMockEvaluations(): void {
    const existing = localStorage.getItem(this.EVALUATIONS_KEY);
    if (!existing) {
      // Mock de avaliações iniciais para os utilizadores Mateus Tembe (ID 1) e Lúcia Maputo (ID 2)
      const mockEvaluations: Evaluation[] = [
        {
          id: 2001,
          interestId: 999,
          fromUserId: 2, // Lúcia Maputo
          fromUserName: 'Lúcia Maputo',
          toUserId: 1, // Mateus Tembe
          toUserName: 'Mateus Tembe',
          rating: 5,
          comentario: 'Excelente qualidade dos tomates. Entrega muito rápida e o Mateus foi muito profissional.',
          dataCriacao: Date.now() - 15 * 24 * 60 * 60 * 1000,
          denunciada: false
        },
        {
          id: 2002,
          interestId: 998,
          fromUserId: 3, // AgroInvest
          fromUserName: 'AgroInvest Moçambique',
          toUserId: 1, // Mateus Tembe
          toUserName: 'Mateus Tembe',
          rating: 4,
          comentario: 'Muito empenhado e responde rápido às solicitações de relatórios da machamba.',
          dataCriacao: Date.now() - 30 * 24 * 60 * 60 * 1000,
          denunciada: false
        },
        {
          id: 2003,
          interestId: 997,
          fromUserId: 1, // Mateus Tembe
          fromUserName: 'Mateus Tembe',
          toUserId: 2, // Lúcia Maputo
          toUserName: 'Lúcia Maputo',
          rating: 5,
          comentario: 'Compradora super séria. Fez o pagamento conforme o acordado na entrega.',
          dataCriacao: Date.now() - 15 * 24 * 60 * 60 * 1000,
          denunciada: false
        }
      ];
      this.saveEvaluations(mockEvaluations);
    }
  }

  // RF-40: Criar avaliação
  createEvaluation(
    interestId: number,
    fromUserId: number,
    fromUserName: string,
    toUserId: number,
    toUserName: string,
    rating: number,
    comentario?: string
  ): Evaluation {
    const newEval: Evaluation = {
      id: Date.now(),
      interestId,
      fromUserId,
      fromUserName,
      toUserId,
      toUserName,
      rating: Math.max(1, Math.min(5, rating)),
      comentario,
      dataCriacao: Date.now(),
      denunciada: false
    };

    const evals = this.getEvaluations();
    evals.unshift(newEval);
    this.saveEvaluations(evals);

    // Forçar a sincronização de reputações nas listagens locais
    this.syncUserReputations();

    return newEval;
  }

  // RF-42: Obter avaliações recebidas por um utilizador
  getEvaluationsForUser(userId: number): Evaluation[] {
    return this.getEvaluations().filter(e => e.toUserId === userId);
  }

  // RF-42: Calcular reputação média (média de estrelas e total)
  getUserReputation(userId: number): { average: number; total: number } {
    const evals = this.getEvaluationsForUser(userId);
    if (evals.length === 0) {
      return { average: 5.0, total: 0 }; // Reputação inicial padrão de 5 estrelas
    }
    const sum = evals.reduce((acc, curr) => acc + curr.rating, 0);
    return {
      average: Number((sum / evals.length).toFixed(1)),
      total: evals.length
    };
  }

  // RF-43: Contar total de transações concluídas do produtor ou comprador
  getCompletedTransactionsCount(userId: number): number {
    const interestsData = localStorage.getItem('alvorfield_interests');
    if (!interestsData) return 0;
    try {
      const interests: any[] = JSON.parse(interestsData);
      return interests.filter(i => 
        (i.produtorId === userId || i.compradorId === userId) &&
        i.compradorConfirmou === true && 
        i.produtorConfirmou === true
      ).length;
    } catch (e) {
      return 0;
    }
  }

  // RF-44: Denunciar avaliação
  reportEvaluation(evaluationId: number, reason: string): void {
    const evals = this.getEvaluations();
    const index = evals.findIndex(e => e.id === evaluationId);
    if (index !== -1) {
      evals[index].denunciada = true;
      evals[index].motivoDenuncia = reason;
      this.saveEvaluations(evals);
      console.info(`[DENÚNCIA]: Avaliação ${evaluationId} foi marcada como denunciada. Motivo: ${reason}`);
    }
  }

  // RF-44: Administrador - Listar todas as avaliações denunciadas
  getReportedEvaluations(): Evaluation[] {
    return this.getEvaluations().filter(e => e.denunciada);
  }

  // RF-44: Administrador - Listar todas as avaliações no sistema
  getAllEvaluations(): Evaluation[] {
    return this.getEvaluations();
  }

  // RF-44: Administrador - Remover avaliação
  removeEvaluation(evaluationId: number): void {
    let evals = this.getEvaluations();
    evals = evals.filter(e => e.id !== evaluationId);
    this.saveEvaluations(evals);
    console.info(`[ADMIN]: Avaliação ${evaluationId} foi REMOVIDA do sistema.`);
    this.syncUserReputations();
  }

  // Sincroniza e atualiza o estado de reputação nas ofertas e utilizadores
  private syncUserReputations(): void {
    // Atualizar reputações nos dados de ofertas para fins de listagem pública rápida
    const offersData = localStorage.getItem('alvorfield_offers');
    if (offersData) {
      try {
        const offers: any[] = JSON.parse(offersData);
        let updated = false;
        offers.forEach(o => {
          const rep = this.getUserReputation(o.produtorId);
          const transCount = this.getCompletedTransactionsCount(o.produtorId) + (o.produtorId === 1 ? 14 : 5); // Fallback para manter consistência dos mock iniciais
          if (o.produtorReputacao !== rep.average || o.produtorTransacoes !== transCount) {
            o.produtorReputacao = rep.average;
            o.produtorTransacoes = transCount;
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem('alvorfield_offers', JSON.stringify(offers));
        }
      } catch (e) {}
    }
  }
}
