import { Injectable } from '@angular/core';

export interface AuditLog {
  id: number;
  adminNome: string;
  acao: string;
  detalhes?: string;
  timestamp: number;
}

export interface ReportRequest {
  id: number;
  investidorId: number;
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
  private readonly AUDIT_LOGS_KEY = 'alvorfield_audit_logs';
  private readonly PRODUCTS_KEY = 'alvorfield_products';
  private readonly REPORT_REQUESTS_KEY = 'alvorfield_report_requests';

  private readonly DEFAULT_PRODUCTS = [
    'Milho Branco',
    'Feijão Nhemba',
    'Feijão Manteiga',
    'Gergelim',
    'Castanha de Caju',
    'Manga',
    'Mandioca',
    'Amendoim',
    'Batata Doce',
    'Tomate',
    'Cebola Vermelha'
  ];

  constructor() {
    this.initializeProducts();
  }

  // ==========================================
  // GESTÃO DE PRODUTOS (RF-52)
  // ==========================================
  private initializeProducts(): void {
    const existing = localStorage.getItem(this.PRODUCTS_KEY);
    if (!existing) {
      localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(this.DEFAULT_PRODUCTS));
    }
  }

  getProducts(): string[] {
    const data = localStorage.getItem(this.PRODUCTS_KEY);
    return data ? JSON.parse(data) : this.DEFAULT_PRODUCTS;
  }

  addProduct(name: string, adminNome: string): void {
    const products = this.getProducts();
    const cleanName = name.trim();
    if (!cleanName) throw new Error('O nome do produto não pode estar vazio.');
    if (products.some(p => p.toLowerCase() === cleanName.toLowerCase())) {
      throw new Error('Este produto já existe na lista.');
    }
    products.push(cleanName);
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    this.logAction(adminNome, 'Adicionou Produto', `Produto: ${cleanName}`);
  }

  editProduct(oldName: string, newName: string, adminNome: string): void {
    const products = this.getProducts();
    const cleanNewName = newName.trim();
    if (!cleanNewName) throw new Error('O novo nome do produto não pode estar vazio.');
    
    const index = products.findIndex(p => p.toLowerCase() === oldName.toLowerCase());
    if (index === -1) throw new Error('Produto original não encontrado.');

    if (oldName.toLowerCase() !== cleanNewName.toLowerCase() && 
        products.some(p => p.toLowerCase() === cleanNewName.toLowerCase())) {
      throw new Error('Já existe outro produto com este nome.');
    }

    products[index] = cleanNewName;
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    this.logAction(adminNome, 'Editou Produto', `Renomeou "${oldName}" para "${cleanNewName}"`);
  }

  deleteProduct(name: string, adminNome: string): void {
    let products = this.getProducts();
    const initialLength = products.length;
    products = products.filter(p => p.toLowerCase() !== name.toLowerCase());
    
    if (products.length === initialLength) throw new Error('Produto não encontrado.');
    
    localStorage.setItem(this.PRODUCTS_KEY, JSON.stringify(products));
    this.logAction(adminNome, 'Removeu Produto', `Produto: ${name}`);
  }

  // ==========================================
  // REGISTO DE AUDITORIA (RF-56)
  // ==========================================
  getAuditLogs(): AuditLog[] {
    const data = localStorage.getItem(this.AUDIT_LOGS_KEY);
    return data ? JSON.parse(data) : [];
  }

  logAction(adminNome: string, acao: string, detalhes?: string): void {
    const logs = this.getAuditLogs();
    const newLog: AuditLog = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      adminNome,
      acao,
      detalhes,
      timestamp: Date.now()
    };
    logs.unshift(newLog);
    localStorage.setItem(this.AUDIT_LOGS_KEY, JSON.stringify(logs));
  }

  // ==========================================
  // PEDIDOS DE RELATÓRIO DE INVESTIDORES (RF-54)
  // ==========================================
  getReportRequests(): ReportRequest[] {
    const data = localStorage.getItem(this.REPORT_REQUESTS_KEY);
    return data ? JSON.parse(data) : [];
  }

  createReportRequest(investidorId: number, investidorNome: string, tema: string, detalhes: string, telefoneMpesa: string): ReportRequest {
    const requests = this.getReportRequests();
    const newRequest: ReportRequest = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      investidorId,
      investidorNome,
      tema,
      detalhes,
      telefoneMpesa,
      status: 'Pendente',
      dataSolicitacao: Date.now()
    };
    requests.unshift(newRequest);
    localStorage.setItem(this.REPORT_REQUESTS_KEY, JSON.stringify(requests));
    return newRequest;
  }

  respondToReportRequest(requestId: number, fileContentSimulated: string, adminNome: string): void {
    const requests = this.getReportRequests();
    const index = requests.findIndex(r => r.id === requestId);
    if (index === -1) throw new Error('Pedido de relatório não encontrado.');

    const request = requests[index];
    request.status = 'Respondido';
    request.dataResposta = Date.now();
    request.respostaArquivoNome = `alvorfield_relatorio_${request.id}.csv`;

    localStorage.setItem(this.REPORT_REQUESTS_KEY, JSON.stringify(requests));

    this.logAction(
      adminNome, 
      'Respondeu a Relatório de Investidor', 
      `Relatório ID: ${request.id}, Investidor: ${request.investidorNome}, Tema: "${request.tema}"`
    );

    // Simulação do envio de e-mail com anexo CSV no console
    console.info(`[ADMIN EMAIL ENVIADO AO INVESTIDOR ${request.investidorNome}]: Relatório "${request.tema}" enviado com sucesso! Anexo: ${request.respostaArquivoNome}`);
    console.info(`[CONTEÚDO CSV ANEXADO]:\n${fileContentSimulated}`);
  }
}
