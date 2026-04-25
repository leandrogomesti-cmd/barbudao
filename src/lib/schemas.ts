import { z } from 'zod';

// ─── Serviços ────────────────────────────────────────────
export const ServiceSchema = z.object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    categoria_id: z.string().uuid('Categoria inválida').optional().nullable(),
    preco_venda: z.number({ invalid_type_error: 'Preço deve ser um número' }).nonnegative('Preço não pode ser negativo'),
    preco_profissional: z.number().nonnegative().optional().nullable(),
    duracao_minutos: z.number().int().positive('Duração deve ser positiva').optional().nullable(),
    descricao: z.string().optional().nullable(),
    ativo: z.boolean().optional(),
});

export type ServiceInput = z.infer<typeof ServiceSchema>;

// ─── Produtos ────────────────────────────────────────────
export const ProductSchema = z.object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    categoria_id: z.string().uuid('Categoria inválida').optional().nullable(),
    preco_profissional: z.number().nonnegative('Preço não pode ser negativo').optional().nullable(),
    estoque_atual: z.number().int('Estoque deve ser inteiro').nonnegative('Estoque não pode ser negativo').optional(),
    unidade: z.string().optional().nullable(),
    ativo: z.boolean().optional(),
});

export type ProductInput = z.infer<typeof ProductSchema>;

// ─── Profissionais ───────────────────────────────────────
export const StaffSchema = z.object({
    nome: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
    apelido: z.string().optional().nullable(),
    email: z.union([z.string().email('E-mail inválido'), z.literal('')]).optional().nullable(),
    telefone: z.string().optional().nullable(),
    cpf: z.string().optional().nullable(),
    funcao: z.string().optional().nullable(),
    unidade_padrao: z.string().optional().nullable(),
    perfil_acesso: z.enum(['ADMIN', 'GERENTE', 'PROFISSIONAL', 'RECEPCAO']).optional().nullable(),
    possui_agenda: z.boolean().optional(),
    ativo: z.boolean().optional(),
    comissao_servico: z.number().min(0).max(100).optional().nullable(),
    comissao_produto: z.number().min(0).max(100).optional().nullable(),
    prolabore_fixo: z.number().nonnegative().optional().nullable(),
});

export type StaffInput = z.infer<typeof StaffSchema>;

// ─── Lançamentos Financeiros ─────────────────────────────
export const FinanceTransactionSchema = z.object({
    categoria_id: z.string().uuid('Categoria inválida'),
    valor: z.number({ invalid_type_error: 'Valor deve ser um número' }).refine(v => v !== 0, 'Valor deve ser diferente de zero'),
    data_lancamento: z.string().min(1, 'Data é obrigatória'),
    descricao: z.string().optional().nullable(),
    comprovante_url: z.string().url('URL inválida').optional().nullable(),
    forma_pagamento: z.string().optional().nullable(),
    status: z.string().optional().nullable(),
    unidade: z.string().optional().nullable(),
});

export type FinanceTransactionInput = z.infer<typeof FinanceTransactionSchema>;

// ─── Agendamentos (API N8N) ─────────────────────────────
export const AppointmentSchema = z.object({
    nome_cliente: z.string().min(1, 'Nome do cliente é obrigatório'),
    telefone: z.string().optional().nullable(),
    servico: z.string().min(1, 'Serviço é obrigatório'),
    profissional: z.string().optional().default('Indiferente'),
    inicio_agendado: z.string().datetime({ message: 'inicio_agendado deve ser ISO 8601' }),
    fim_agendado: z.string().datetime({ message: 'fim_agendado deve ser ISO 8601' }),
    unidade: z.string().optional().nullable(),
    status_agendamento: z.string().optional().default('Aguardando Confirmação'),
    id_evento_google: z.string().optional().nullable(),
    id_conversa_chatwoot: z.number().int().optional().nullable(),
    ultima_interacao_em: z.string().datetime().optional().nullable(),
});

export type AppointmentInput = z.infer<typeof AppointmentSchema>;

// ─── Helper ──────────────────────────────────────────────
export function parseSchema<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; message: string } {
    const result = schema.safeParse(data);
    if (!result.success) {
        const message = result.error.errors.map(e => e.message).join(', ');
        return { success: false, message };
    }
    return { success: true, data: result.data };
}
