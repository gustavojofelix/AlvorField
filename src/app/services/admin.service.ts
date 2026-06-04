import { Injectable, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface AuditLog {
  id: string | number;
  adminNome: string;
  acao: string;
  detalhes?: string;
  timestamp: number;
}

export interface ReportRequest {
  id: string | number;
  investidorId: string | number;
  investidorNome: string;
  tema: string;
  detalhes: string;
  telefoneMpesa: string;
  status: 'Pendente' | 'Respondido';
  dataSolicitacao: number;
  dataResposta?: number;
  respostaArquivoNome?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AdminService {
  private supabaseService = inject(SupabaseService);

  // ==========================================
  // GESTÃO DE PRODUTOS (RF-52)
  // ==========================================
  async getProducts(): Promise<string[]> {
    const { data, error } = await this.supabaseService.client
      .from('predefined_products')
      .select('name');

    if (error || !data) return [];
    return data.map(p => p.name);
  }

  async addProduct(name: string, adminNome: string): Promise<void> {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('O nome do produto não pode estar vazio.');

    const { error } = await this.supabaseService.client
      .from('predefined_products')
      .insert({ name: cleanName });

    if (error) {
      if (error.code === '23505') throw new Error('Este produto já existe na lista.');
      throw new Error(error.message);
    }

    await this.logAction(adminNome, 'Adicionou Produto', `Produto: ${cleanName}`);
  }

  async editProduct(oldName: string, newName: string, adminNome: string): Promise<void> {
    const cleanNewName = newName.trim();
    if (!cleanNewName) throw new Error('O novo nome do produto não pode estar vazio.');

    // No Postgres, como name é chave primária, podemos fazer update direto:
    const { error } = await this.supabaseService.client
      .from('predefined_products')
      .update({ name: cleanNewName })
      .eq('name', oldName);

    if (error) {
      if (error.code === '23505') throw new Error('Já existe outro produto com este nome.');
      throw new Error(error.message);
    }

    await this.logAction(adminNome, 'Editou Produto', `Renomeou "${oldName}" para "${cleanNewName}"`);
  }

  async deleteProduct(name: string, adminNome: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('predefined_products')
      .delete()
      .eq('name', name);

    if (error) throw new Error(error.message);
    await this.logAction(adminNome, 'Removeu Produto', `Produto: ${name}`);
  }

  // ==========================================
  // REGISTO DE AUDITORIA (RF-56)
  // ==========================================
  async getAuditLogs(): Promise<AuditLog[]> {
    const { data, error } = await this.supabaseService.client
      .from('audit_logs')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(log => ({
      id: log.id,
      adminNome: log.profiles?.full_name || 'Admin',
      acao: log.action,
      detalhes: log.details,
      timestamp: new Date(log.created_at).getTime()
    }));
  }

  async logAction(adminNome: string, acao: string, detalhes?: string): Promise<void> {
    // Obter o admin_id logado
    const current = localStorage.getItem('alvorfield_current_user');
    let adminId = null;
    if (current) {
      adminId = JSON.parse(current).id;
    }

    await this.supabaseService.client
      .from('audit_logs')
      .insert({
        admin_id: adminId,
        action: acao,
        details: detalhes || ''
      });
  }

  // ==========================================
  // PEDIDOS DE RELATÓRIO DE INVESTIDORES (RF-54)
  // ==========================================
  async getReportRequests(): Promise<ReportRequest[]> {
    const { data, error } = await this.supabaseService.client
      .from('report_requests')
      .select('*, profiles(full_name)')
      .order('created_at', { ascending: false });

    if (error || !data) return [];
    return data.map(r => ({
      id: r.id,
      investidorId: r.investor_id,
      investidorNome: r.profiles?.full_name || 'Investidor',
      tema: r.topic,
      detalhes: r.details,
      telefoneMpesa: r.mpesa_phone,
      status: r.status as any,
      dataSolicitacao: new Date(r.created_at).getTime(),
      dataResposta: r.responded_at ? new Date(r.responded_at).getTime() : undefined,
      respostaArquivoNome: r.file_url ? r.file_url.split('/').pop() : undefined
    }));
  }

  async createReportRequest(investidorId: string | number, investidorNome: string, tema: string, detalhes: string, telefoneMpesa: string): Promise<ReportRequest> {
    const { data, error } = await this.supabaseService.client
      .from('report_requests')
      .insert({
        investor_id: investidorId,
        topic: tema,
        details: detalhes,
        mpesa_phone: telefoneMpesa,
        status: 'Pendente'
      })
      .select('*, profiles(full_name)')
      .single();

    if (error || !data) throw new Error(error?.message || 'Erro ao submeter pedido de relatório.');

    return {
      id: data.id,
      investidorId: data.investor_id,
      investidorNome: data.profiles?.full_name || investidorNome,
      tema: data.topic,
      detalhes: data.details,
      telefoneMpesa: data.mpesa_phone,
      status: data.status as any,
      dataSolicitacao: new Date(data.created_at).getTime()
    };
  }

  async respondToReportRequest(requestId: string | number, fileContentSimulated: string, adminNome: string): Promise<void> {
    const fileName = `relatorios/alvorfield_relatorio_${requestId}.csv`;
    
    // Fazer upload simulado/real do CSV para o Supabase Storage Bucket 'reports'
    const blob = new Blob([fileContentSimulated], { type: 'text/csv' });
    const { error: uploadError } = await this.supabaseService.client.storage
      .from('reports')
      .upload(fileName, blob, { contentType: 'text/csv', upsert: true });

    let fileUrl = '';
    if (!uploadError) {
      const { data } = this.supabaseService.client.storage.from('reports').getPublicUrl(fileName);
      fileUrl = data.publicUrl;
    }

    const { data, error } = await this.supabaseService.client
      .from('report_requests')
      .update({
        status: 'Respondido',
        responded_at: new Date(),
        file_url: fileUrl || fileName
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw new Error(error.message);

    await this.logAction(
      adminNome, 
      'Respondeu a Relatório de Investidor', 
      `Relatório ID: ${requestId}, Tema: "${data.topic}"`
    );

    console.info(`[ADMIN EMAIL ENVIADO AO INVESTIDOR]: Relatório "${data.topic}" enviado com sucesso! Anexo: ${fileUrl || fileName}`);
  }
}
