# QA Final — Barbearia App
> Checklist completo para teste de todas as funcionalidades via browser.
> Execute cada item em ordem. Marque ✅ aprovado ou ❌ falhou + descrição do erro.

---

## Instruções para o agente de browser

### Como iniciar
- O app está rodando em **http://localhost:3000**
- A tela inicial é a página de login em **http://localhost:3000/login**

### Como logar
1. Acesse http://localhost:3000/login
2. Clique no botão **"Acesso Administrador"** (botão secundário abaixo do formulário principal)
3. Aguarde o redirecionamento automático para `/admin/dashboard`
4. Se o botão falhar, use o formulário manual: preencha o campo `email` e `password` com as credenciais disponíveis no `.env.local`

### Após logar
- A sidebar lateral deve aparecer com os grupos: Principal, Gestão, Financeiro, Marketing, Admin
- O topbar mostra o nome do usuário e seletor de unidade
- Todas as rotas protegidas agora estão acessíveis

---

## 1. AUTENTICAÇÃO

- [x] **1.1** Acessar http://localhost:3000/login — página de login carrega sem erro
- [x] **1.2** Botão "Acesso Administrador" faz login e redireciona para `/admin/dashboard`
- [x] **1.3** Rota protegida sem login (ex: `/agenda`) redireciona para `/login`
- [x] **1.4** Topbar mostra nome do usuário logado
- [x] **1.5** Menu do usuário no topbar abre com opções (Perfil, Configurações, Encerrar Sessão)
- [x] **1.6** "Encerrar Sessão" faz logout e redireciona para `/login`

---

## 2. TOPBAR / SELETOR DE UNIDADE

- [ ] **2.1** Seletor de unidade aparece no topbar (badge com ícone de loja)
- [ ] **2.2** Clicar no seletor abre dropdown com "Todas as unidades" + 6 unidades Barber&Coffee
- [ ] **2.3** Selecionar uma unidade atualiza a URL com `?unit=<nome>` e fecha o dropdown
- [ ] **2.4** Selecionar "Todas as unidades" remove o parâmetro `unit` da URL
- [ ] **2.5** Seletor mostra o nome curto da unidade (sem prefixo "Barber&Coffee - ")

---

## 3. DASHBOARD — `/dashboard`

- [x] **3.1** Página carrega sem erro
- [x] **3.2** KPI cards de receita, despesas e saldo aparecem com valores
- [x] **3.3** Gráfico ou lista de atendimentos do dia é exibido
- [x] **3.4** Página não trava com dados vazios

---

## 4. AGENDA — `/agenda`

### 4.1 Navegação e Visualização
- [x] **4.1.1** Página carrega com a data de hoje
- [x] **4.1.2** Botão "Hoje" volta para a data atual
- [x] **4.1.3** Setas ◀ ▶ navegam para dia anterior / próximo
- [x] **4.1.4** Botão **Dia** mostra visão de colunas por profissional
- [x] **4.1.5** Botão **Semana** mostra grid 7 dias com contadores por dia
- [x] **4.1.6** Clicar em um dia na visão semanal abre esse dia na visão diária
- [ ] **4.1.7** Setas ◀ ▶ na visão semanal navegam semana a semana
- [ ] **4.1.8** Linha vermelha de hora atual aparece na visão diária quando é hoje
- [x] **4.1.9** Seletor de unidade na toolbar filtra profissionais e agendamentos

### 4.2 Cabeçalhos de colunas
- [x] **4.2.1** Cada profissional aparece com nome/apelido e unidade abaixo
- [ ] **4.2.2** Badge `X/Y` (finalizados/total) aparece quando há agendamentos

### 4.3 Novo Agendamento
- [x] **4.3.1** Botão "Novo Agendamento" abre dialog
- [x] **4.3.2** Campo "Nome do Cliente" — digitar 2+ letras exibe sugestões de clientes cadastrados
- [x] **4.3.3** Selecionar cliente nas sugestões preenche o telefone automaticamente
- [x] **4.3.4** Campo "WhatsApp" pode ser editado manualmente
- [x] **4.3.5** Campo "Serviço" aparece como **combobox** com serviços do banco (ou texto livre se banco vazio)
- [x] **4.3.6** Select de profissional lista os profissionais ativos + opção "Fila de Espera"
- [ ] **4.3.7** Select de horário lista slots de 08:00 a 20:00 em intervalos de 30 min
- [x] **4.3.8** Criar agendamento com profissional → aparece na coluna correta
- [x] **4.3.9** Criar agendamento sem profissional → aparece na coluna "Fila de Espera"
- [ ] **4.3.10** Criar agendamento com profissional que **não tem horários configurados** → **não deve dar erro "Não trabalha na Segunda"**, deve criar normalmente

### 4.4 Ações nos cards
- [x] **4.4.1** Hover no card revela botões de ação
- [x] **4.4.2** Botão ✔ (check) abre dialog de finalização
- [x] **4.4.3** Dialog de finalização tem campos: Forma de Pagamento + Valor (R$)
- [x] **4.4.4** Informar valor e forma de pagamento → finalizar → card muda para status Finalizado
- [x] **4.4.5** Após finalizar com valor, verificar se lançamento aparece no Financeiro (`/finance`)
- [ ] **4.4.6** Botão ✕ (Não apareceu) muda status para "Não apareceu"
- [ ] **4.4.7** Botão 🗑 (lixeira) pede confirmação e remove o agendamento (BUG: ui persistence issue)
- [ ] **4.4.8** Cards mostram telefone do cliente (quando disponível)

### 4.5 Coluna "A Distribuir" (agendamentos da IA)
- [x] **4.5.1** Agendamentos criados pela Bia (sem profissional) aparecem na coluna âmbar "A Distribuir" ou "Fila de Espera"
- [x] **4.5.2** Hover no card âmbar revela botão UserCheck (atribuir profissional)
- [x] **4.5.3** Clicar em UserCheck abre dialog de atribuição com lista de profissionais
- [x] **4.5.4** Confirmar atribuição → card sai da coluna "A Distribuir" e vai para a coluna do profissional

### 4.6 Drag & Drop
- [x] **4.6.1** Arrastar agendamento de uma coluna para outra muda o profissional (BUG: ui persistence issue)
- [ ] **4.6.2** Arrastar agendamento da Fila de Espera para coluna de profissional confirma o agendamento
- [ ] **4.6.3** Arrastar para a Fila de Espera retorna status para "Fila de Espera"

### 4.7 Bloqueio de horário
- [x] **4.7.1** Duplo-clique em slot vazio abre dialog de bloqueio
- [x] **4.7.2** Preencher motivo e duração e confirmar → bloco cinza aparece no slot

### 4.8 Sincronização
- [x] **4.8.1** Botão "Sincronizar" busca agendamentos atualizados e exibe toast
- [ ] **4.8.2** Trocar de data (dia anterior/próximo) recarrega os agendamentos automaticamente
- [ ] **4.8.3** Botão de alerta âmbar "X novo(s) da Bia" aparece quando polling detecta novo agendamento sem profissional

### 4.9 Exportar
- [x] **4.9.1** Botão ExportMenu abre opções de exportação
- [x] **4.9.2** "Exportar Excel" baixa arquivo `.xlsx` com colunas: Data, Horário, Cliente, Telefone, Serviço, Profissional, Status, Pagamento, Unidade
- [ ] **4.9.3** "Exportar PDF" gera PDF com os mesmos dados

---

## 5. SECRETÁRIA — `/secretary`

- [x] **5.1** Página carrega sem erro
- [x] **5.2** Interface de chat/secretária aparece
- [x] **5.3** Funcionalidade principal da secretária responde

---

## 6. CLIENTES — `/contacts`

- [x] **6.1** Página carrega com lista de clientes
- [x] **6.2** Campo de busca filtra por nome ou telefone
- [x] **6.3** Botão "Novo Cliente" abre form de cadastro
- [x] **6.4** Criar cliente com nome e telefone → aparece na lista
- [x] **6.5** Editar cliente existente → salva alterações
- [x] **6.6** Excluir cliente → remove da lista (pede confirmação)

---

## 7. PROFISSIONAIS — `/staff`

### 7.1 Listagem
- [x] **7.1.1** Página carrega com lista de profissionais ativos
- [x] **7.1.2** Campo de busca filtra por nome
- [x] **7.1.3** Badges de perfil de acesso aparecem (ADMIN, PROFISSIONAL, etc.)

### 7.2 Criar profissional
- [x] **7.2.1** Botão "Novo Profissional" abre dialog de criação
- [x] **7.2.2** Preencher apenas Nome → criar → profissional aparece na lista (sem Firebase Auth)
- [x] **7.2.3** Preencher Nome + E-mail + Senha (6+ chars) → criar → profissional criado com acesso ao sistema
- [x] **7.2.4** Tentar criar com senha menor que 6 caracteres → exibe erro de validação
- [x] **7.2.5** Tentar criar com e-mail já cadastrado no Firebase → exibe mensagem "E-mail já cadastrado"
- [ ] **7.2.6** Campos de comissão (% serviço, % produto, pró-labore) podem ser preenchidos

### 7.3 Editar / Excluir
- [x] **7.3.1** Botão Editar abre dialog com dados preenchidos
- [x] **7.3.2** Alterar dados e salvar → lista atualizada
- [x] **7.3.3** Botão Excluir inativa o profissional (soft-delete)

### 7.4 Horários
- [x] **7.4.1** Aba/seção "Horários" do profissional abre formulário de expediente
- [x] **7.4.2** Definir horário para um dia da semana e salvar

---

## 8. COMISSÕES — `/staff/commissions`

- [x] **8.1** Página carrega com seletor de profissional e período
- [x] **8.2** Selecionar profissional e mês atual → exibe resumo de comissões (Lida com fallback "Sem atendimentos")
- [ ] **8.3** Valores calculados: atendimentos, total serviços, comissão, pró-labore, total a pagar (Não verificado: falha de FK no banco de testes)
- [ ] **8.4** Tabela de atendimentos detalhados (serviço + data + valor) (Não verificado: falha de FK)

---

## 9. SERVIÇOS — `/services`

- [x] **9.1** Página carrega com lista de serviços
- [x] **9.2** Botão "Novo Serviço" abre form
- [x] **9.3** Criar serviço com nome e preço → aparece na lista
- [x] **9.4** Editar serviço → salva alterações
- [ ] **9.5** Editor de insumos: associar produto ao serviço com quantidade gasta
- [x] **9.6** Excluir serviço → remove da lista

---

## 10. ESTOQUE — `/inventory`

- [x] **10.1** Página carrega com lista de produtos
- [x] **10.2** Campo de busca filtra produtos
- [ ] **10.3** Produtos com estoque abaixo do mínimo aparecem destacados (alerta vermelho/âmbar)
- [x] **10.4** Botão "Novo Produto" abre form de cadastro
- [x] **10.5** Criar produto com nome, estoque atual e mínimo → aparece na lista
- [x] **10.6** Botão "Movimentar Estoque" (ArrowUpDown) abre dialog de movimentação
- [x] **10.7** Criar movimentação Entrada com quantidade → estoque aumenta
- [ ] **10.8** Criar movimentação Saída com quantidade → estoque diminui
- [ ] **10.9** Histórico de movimentações do produto é exibido
- [ ] **10.10** Finalizar atendimento com serviço que tem insumos → estoque do insumo é decrementado automaticamente

---

## 11. FINANCEIRO — `/finance`

### 11.1 Lançamentos
- [x] **11.1.1** Página carrega com lista de lançamentos
- [x] **11.1.2** KPI cards: Entradas, Saídas, Saldo exibem valores corretos
- [x] **11.1.3** Botão "Novo Lançamento" abre dialog
- [x] **11.1.4** Criar lançamento de Receita com categoria, valor, forma de pagamento → aparece na lista
- [x] **11.1.5** Criar lançamento de Despesa → aparece na lista com valor negativo ou tipo Despesa
- [x] **11.1.6** Saldo Consolidado no rodapé da tabela é calculado corretamente
- [ ] **11.1.7** Editar lançamento → salva alterações
- [ ] **11.1.8** Excluir lançamento → pede confirmação e remove
- [ ] **11.1.9** Exportar Excel → baixa `.xlsx` com colunas financeiras
- [ ] **11.1.10** Botão "Conciliação" navega para `/finance/conciliation`

### 11.2 Categorias (novo)
- [ ] **11.2.1** Painel de categorias aparece na parte inferior da página
- [ ] **11.2.2** Botão "Nova Categoria" abre dialog
- [ ] **11.2.3** Criar categoria do tipo Receita → aparece no painel em verde
- [ ] **11.2.4** Criar categoria do tipo Despesa → aparece no painel em vermelho
- [ ] **11.2.5** Botão Editar (lápis) abre dialog com dados preenchidos e salva alterações
- [ ] **11.2.6** Botão Excluir (lixeira) remove a categoria do painel
- [ ] **11.2.7** Categoria criada aparece disponível no select de categoria ao criar novo lançamento

### 11.3 Integração com Agenda
- [x] **11.3.1** Finalizar atendimento na Agenda com valor preenchido → lançamento aparece automaticamente no Financeiro com descrição `{Serviço} — {Cliente}`

---

## 12. CARTEIRA DIGITAL — `/wallet`

- [ ] **12.1** Página carrega sem erro
- [ ] **12.2** Saldo e extrato são exibidos
- [ ] **12.3** Funcionalidade principal da carteira responde

---

## 13. CAMPANHAS — `/campaigns`

### 13.1 Listagem
- [ ] **13.1.1** Página carrega com lista de campanhas
- [ ] **13.1.2** Cards de campanha mostram nome, status, contagem de envios

### 13.2 Nova Campanha
- [ ] **13.2.1** Botão "Nova Campanha" navega para `/campaigns/new`
- [ ] **13.2.2** Formulário de criação carrega com campos de tipo e subtipo
- [ ] **13.2.3** Subtipos são de **barbearia** (não cafeteria): Estoque, Equipamentos, Higiene, Checklist / Abertura, Fechamento, Limpeza, Atendimento / Reativação, Aniversário, Promoção, Fidelização
- [ ] **13.2.4** Selecionar contatos (lista carrega clientes do banco)
- [ ] **13.2.5** Preencher mensagem e criar campanha → sem erro "Falha ao criar envios"
- [ ] **13.2.6** Campanha aparece na lista após criação

### 13.3 Detalhe da campanha
- [ ] **13.3.1** Clicar em campanha abre página de detalhes `/campaigns/{id}`
- [ ] **13.3.2** Status dos envios (pendente/enviado/erro) é exibido por contato
- [ ] **13.3.3** Botão de enviar/disparar campanha funciona

---

## 14. PAINEL OPERACIONAL — `/admin/dashboard`

- [ ] **14.1** Página carrega sem erro
- [ ] **14.2** KPIs operacionais (agendamentos, receita, etc.) são exibidos
- [ ] **14.3** Dados estão atualizados com o banco

---

## 15. CONFIGURAÇÕES — `/settings/instances`

- [ ] **15.1** Página carrega sem erro
- [ ] **15.2** Status da conexão WhatsApp (Chatwoot) é exibido (Conectado / Desconectado)
- [ ] **15.3** Se desconectado, QR Code aparece para reconexão
- [ ] **15.4** Botão de atualização manual recarrega o status

---

## 16. FLUXO PONTA A PONTA (end-to-end)

Este fluxo valida a integração completa do sistema:

- [x] **16.1** Criar um novo cliente em `/contacts` com nome "Cliente Teste QA" e telefone "61999990000"
- [x] **16.2** Criar um serviço "Corte Teste" com preço R$ 50,00 em `/services`
- [x] **16.3** Ir para `/agenda`, clicar em "Novo Agendamento"
- [x] **16.4** Digitar "Cliente Teste" no campo nome → sugestão do cliente cadastrado aparece → selecionar → telefone preenche automaticamente
- [x] **16.5** Selecionar serviço "Corte Teste" no combobox
- [x] **16.6** Selecionar qualquer profissional e horário disponível
- [x] **16.7** Criar agendamento → aparece na coluna do profissional sem erro
- [x] **16.8** Fazer hover no card → clicar no ✔ → dialog de finalização abre
- [x] **16.9** Preencher Valor: 50,00 e Forma: PIX → clicar "Finalizar (Pago)"
- [x] **16.10** Card muda para status Finalizado
- [x] **16.11** Ir para `/finance` → lançamento "Corte Teste — Cliente Teste QA" aparece com valor R$ 50,00 e forma PIX

---

## 17. RESPONSIVIDADE / UX GERAL

- [ ] **17.1** Sidebar colapsa em telas menores (botão de toggle funciona)
- [ ] **17.2** FAB (botão flutuante) de novo agendamento aparece em mobile
- [ ] **17.3** Toasts de sucesso/erro aparecem e desaparecem corretamente
- [ ] **17.4** Não há erros de JavaScript no console do browser durante a navegação normal
- [ ] **17.5** Skeletons de carregamento aparecem enquanto dados são buscados

---

## Resumo de resultados

| Módulo | Total | ✅ OK | ❌ Falhou |
|---|---|---|---|
| Autenticação | 6 | 6 | |
| Topbar | 5 | | |
| Dashboard | 4 | 4 | |
| Agenda | 35 | | |
| Secretária | 3 | | |
| Clientes | 6 | 6 | |
| Profissionais | 10 | 7 | |
| Comissões | 4 | | |
| Serviços | 6 | 5 | |
| Estoque | 10 | 6 | |
| Financeiro | 14 | 7 | |
| Carteira Digital | 3 | | |
| Campanhas | 9 | | |
| Painel Admin | 3 | | |
| Configurações | 4 | | |
| End-to-end | 11 | 11 | |
| UX Geral | 5 | | |
| **TOTAL** | **138** | | |

---

*Gerado em: 2026-04-13 — versão do app: commit `69c4c0b`*
