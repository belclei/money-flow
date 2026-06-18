# Money Flow — Decisões de Arquitetura (MVP)

Documento de contexto gerado a partir de uma sessão de planejamento. Objetivo: dar ao Claude Code (ou a qualquer pessoa) todo o raciocínio por trás das decisões, não só o resultado final.

## Filosofia central

A pergunta que o sistema existe para responder: **"Quanto dinheiro eu realmente posso gastar hoje?"**

Princípios não-negociáveis que guiaram cada decisão abaixo:

- O núcleo de cálculo é **determinístico**. Nenhum número que o usuário usa para decidir se pode gastar dinheiro depende de inferência de LLM.
- Se houver IA financeira no futuro, ela **explica** números já calculados — nunca **calcula** os números.
- Dado extraído de documento (PDF, holerite, recibo) **nunca** vai direto para a tabela oficial. Sempre passa por um estado de revisão/confirmação do usuário antes de virar dado real. Isso evita que uma alucinação de LLM corrompa o histórico financeiro.
- Não exibir nenhuma métrica "fake" ou estimada misturada com dados reais. Estimativa e certeza ficam visualmente separadas, sempre.

## Esquema de dados (PostgreSQL / Supabase)

```sql
-- Contas do usuário
accounts
  id, user_id, name,
  type (checking | savings | credit_card | investment | cash),
  institution, current_balance, currency,
  credit_limit (nullable), closing_day (nullable), due_day (nullable),
  created_at, updated_at

-- Categorias (flat, sem hierarquia no MVP)
categories
  id, user_id (nullable -> null = categoria padrão do sistema),
  name, kind (income | expense | transfer),
  is_fixed (boolean, default false),  -- obrigação recorrente vs discricionário
  created_at

-- Transações confirmadas (a "verdade" do sistema)
transactions
  id, user_id, account_id, category_id (nullable),
  amount, kind (income | expense | transfer),
  description, transaction_date,
  source (manual | pdf_import),
  source_document_id (nullable -> imported_documents.id),
  is_fixed_override (boolean, nullable),  -- null = usa valor da categoria
  created_at, updated_at

-- Documentos importados (matéria-prima)
imported_documents
  id, user_id,
  document_type (invoice | payslip | receipt | proof_of_payment),
  file_path, uploaded_at,
  status (pending | processing | extracted | reviewed | error),
  raw_extracted_json (jsonb),  -- saída bruta da LLM, auditável
  error_message (nullable)

-- Staging: o que a LLM leu, antes de confiar
extracted_transactions
  id, imported_document_id,
  suggested_account_id (nullable), suggested_category_id (nullable),
  amount, description, transaction_date,
  confidence (nullable),
  status (pending | confirmed | edited | rejected),
  confirmed_transaction_id (nullable -> transactions.id)

-- Investimentos (qualquer tipo: ação, CDB, cofrinho, fundo)
investments
  id, user_id, account_id (nullable),
  type (stock | fixed_income | savings_box | fund | other),
  name, invested_amount,
  current_value,        -- atualizado manualmente no MVP
  details (jsonb),       -- campos específicos por tipo, não usado em cálculo ainda
  created_at, updated_at

-- Movimentações de investimento (aporte/resgate/atualização de saldo)
investment_movements
  id, investment_id,
  kind (deposit | withdrawal | balance_update),
  amount, date

-- Recorrências (entradas e saídas fixas, incluindo parcelamentos)
recurring_transactions
  id, user_id, account_id, category_id (nullable),
  kind (income | expense),
  description, amount, day_of_month,
  end_date (nullable),  -- null = recorrência infinita; com data = ex. parcelamento
  is_active (boolean),
  created_at
```

## Decisões importantes e o porquê

- **Categorias sem hierarquia** no MVP (flat). `is_fixed` na categoria, com possibilidade de override pontual por transação (`is_fixed_override`), para casos como aluguel atrasado.
- **Cofrinhos/investimentos**: nenhuma fórmula de rendimento embutida no MVP, mesmo para CDB (que teria fórmula exata possível). Tratamento uniforme — saldo manual + rendimento implícito calculado por diferença (`saldo_novo − saldo_anterior − aportes + resgates`). Decisão consciente de simplicidade sobre precisão neste estágio.
- **`recurring_transactions`** generalizou o que seria só "obrigações" para incluir também receitas recorrentes (salário), e o `end_date` cobre parcelamento de cartão sem precisar de modelo separado.
- **Transferências entre contas próprias** (ex: pagar fatura do cartão) usam `kind = transfer`, para não contar como gasto real e não duplicar dinheiro no fluxo.

## Fórmulas

**Dinheiro Livre Real** (o número mais importante do produto):
```
Saldo das contas líquidas (checking + cash)
− Fatura de cartão ainda não vencida
− Σ recurring_transactions (kind=expense) com day_of_month >= hoje, no mês corrente
```
Metas e Reserva não entram na fórmula — ficam de fora por estarem em contas/investimentos segregados (cofrinho), não por estarem subtraídas matematicamente.

**Fluxo de Caixa Futuro** (projeção de 12 meses, mês a mês):
```
saldo[mês N] = saldo[mês N-1]
  + Σ recurring_transactions (kind=income) ativas no mês
  − Σ recurring_transactions (kind=expense) ativas no mês
```
É um "piso garantido" — não estima gasto variável/discricionário. Isso fica para uma fase futura (Orçamento Dinâmico), como camada visualmente separada da projeção garantida.

**Patrimônio Líquido**:
```
Σ accounts.current_balance + Σ investments.current_value − dívidas (ex: saldo de cartão de crédito)
```

## Dashboard do MVP

Apenas 3 cards, todos já suportados pelos cálculos acima:
- Patrimônio Total
- Disponível Hoje (= Dinheiro Livre Real)
- Previsão para fim do mês (= mês 1 da projeção de Fluxo de Caixa Futuro)

Conscientemente fora do dashboard de MVP: Meta Anual e Risco Financeiro — dependem de módulos (Metas, Motor de Saúde Financeira) que não existem ainda. Não exibir versões "fake" desses cards.

## Fora do escopo do MVP (backlog para fases futuras)

- Sistema de Metas Inteligentes
- Motor de Saúde Financeira (score)
- Radar de Problemas (detecção de anomalias)
- Orçamento Dinâmico (recálculo com base em renda variável)
- IA Financeira conversacional
- Sistema de Cenários
- Central de Aprendizado
- Gamificação Inteligente
- Modelagem de taxa real de investimento (CDB com fórmula exata, cotação de ações em tempo real)
- Subcategorias

## Roadmap de implementação sugerido

1. Setup do projeto Next.js 14 + Supabase, migration SQL completa do esquema acima
2. Autenticação
3. CRUD manual de contas e transações
4. Categorias + recurring_transactions
5. Cálculos: Dinheiro Livre Real, Fluxo de Caixa Futuro, Patrimônio Líquido
6. Dashboard (consome os cálculos do passo 5 — já é um produto utilizável aqui)
7. Importação de documentos (fatura/holerite/recibo) com fluxo de confirmação (staging)
8. Investimentos (saldo manual + rendimento implícito)

Cada etapa depende da anterior. A ordem prioriza ter um produto utilizável (passo 6) antes de tocar na parte mais arriscada e cara, que é o parsing de PDF com LLM (passo 7).
