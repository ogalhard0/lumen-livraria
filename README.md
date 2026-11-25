# Lumen Livraria Católica

Aplicação web de e-commerce para uma livraria católica (Etapa 5 – Desenvolvimento).
Implementa o MVP definido na Etapa 2, a arquitetura da Etapa 4 e as telas do protótipo da Etapa 3 (Canva).

| Camada | Tecnologia |
|---|---|
| Front-end | Next.js 14 (App Router) · React · TypeScript · Tailwind CSS · TanStack Query · React Hook Form · Zod |
| Back-end | Node.js 20 · NestJS 10 · TypeScript · Prisma · Zod · Argon2id · JWT |
| Banco de dados | MySQL 8.0 (InnoDB, utf8mb4) |
| Infra | Docker Compose · Nginx · (Cloudflare na frente, em produção) |
| Integrações | Mercado Pago (Pix e cartão), Melhor Envio (frete), ViaCEP, SMTP (e-mail) |

```
Cliente → (Cloudflare) → Nginx → Next.js (SSR)  ─┐
                              └→ API NestJS /api/v1 → MySQL
                                        └→ Mercado Pago · Melhor Envio · ViaCEP · SMTP
```

## Estado desta entrega (leia primeiro)

**O que foi verificado antes da entrega**
- 9 testes automatizados da lógica de negócio (`backend/test/domain.test.ts`): estados do pedido, totais em centavos, frete, estoque, política de senha e assinatura de webhook. Todos passam.
- Os 100+ arquivos TypeScript/TSX passam na análise de sintaxe, todos os imports internos existem e as 50 chamadas de API do front-end têm rota correspondente no back-end.

**O que ainda NÃO foi executado** (o ambiente de desenvolvimento não tinha acesso à internet para instalar pacotes)
- `npm install`, `npm run build`, verificação completa de tipos, banco de dados real e integração ponta a ponta.
- Integrações reais com Mercado Pago e Melhor Envio. Os formatos de requisição foram escritos conforme a documentação conhecida e **precisam ser validados no ambiente de testes (sandbox) de cada provedor**.
- O esquema Prisma não foi validado pelo `prisma validate`. Rode `npx prisma validate` primeiro.

Espere pequenos ajustes de tipagem ou de configuração no primeiro `npm run typecheck` / `npm run build`. A seção “Primeiros passos” indica a ordem mais segura.

## Como executar

### Opção A – Tudo em contêineres (Docker)

```bash
cp .env.example .env          # preencha MYSQL_*, JWT_SECRET (veja o comando no arquivo)
docker compose build
docker compose up -d
docker compose --profile tools run --rm tools npx tsx prisma/seed.ts   # dados de demonstração + administrador
# Abra http://localhost
```
O seed imprime a senha do administrador (ou use `SEED_ADMIN_PASSWORD`). Login: `admin@lumen.local`.

### Opção B – Desenvolvimento local

```bash
docker compose -f docker-compose.dev.yml up -d        # apenas o MySQL (127.0.0.1:3306)

cd backend
cp .env.example .env                                  # ajuste JWT_SECRET
npm install
npx prisma validate
npx prisma migrate dev --name init                    # cria e aplica a migração (versione a pasta prisma/migrations)
npm run seed
npm run test                                          # testes de domínio
npm run start:dev                                     # API em http://localhost:3001/api/v1 (Swagger em /api/docs)

cd ../frontend
cp .env.example .env.local
npm install
npm run dev                                           # site em http://localhost:3000
```

Os schemas Zod são escritos uma única vez em `backend/src/schemas` e copiados para o front-end:
`npm run sync:schemas` (na raiz). O CI falha se as cópias divergirem.

## Primeiros passos recomendados

1. `cd backend && npm install && npx prisma validate && npm run typecheck && npm test`
2. `npx prisma migrate dev --name init` e `npm run seed`
3. Suba a API e abra `http://localhost:3001/api/docs`.
4. `cd frontend && npm install && npm run typecheck && npm run dev`
5. Percorra o roteiro de testes abaixo.

## Roteiro de testes manuais

1. **Catálogo:** `/catalogo` com filtros (categoria, preço, idioma, disponibilidade, ordenação) e busca.
2. **Cadastro e login:** `/cadastro` (senha fraca deve ser recusada) e `/login`. Após 5 senhas erradas, o acesso é bloqueado por 15 minutos.
3. **Carrinho:** adicionar itens, alterar quantidades, calcular frete por CEP (ex.: `12500-000`).
4. **Checkout:** escolher entrega ou retirada, informar endereço (o CEP preenche o endereço), ir ao pagamento.
5. **Pagamento (modo `fake`):** na tela do pedido, “Simular pagamento aprovado”. O pedido vira “Recebido” e um e-mail (simulado no log) é emitido.
6. **Estoque:** o saldo cai na criação do pedido e volta se ele for cancelado ou expirar (`PEDIDO_EXPIRA_MINUTOS`).
7. **Painel:** `/admin` com o administrador. Altere status (Em separação → Enviado, com rastreio), registre entrada de estoque, edite produtos (com upload de capa), gerencie banners.
8. **LGPD:** em `/conta/pedidos`, baixe seus dados e exclua a conta.

## O que foi implementado (MVP da Etapa 2)

| Item | Onde |
|---|---|
| RF01 Catálogo por categoria/subcategoria | `backend/src/catalogo`, `frontend/src/app/catalogo` |
| RF02 Busca e filtros | idem (título, autor, preço, formato, idioma, disponibilidade) |
| RF03 Página do produto | `app/produto/[slug]` (SEO, JSON-LD) |
| RF04 Cadastro e login | `backend/src/auth`, `app/login`, `app/cadastro` |
| RF05 Carrinho | `lib/cart.tsx`, `app/carrinho`, `backend/src/carrinho` |
| RF06 Frete por CEP e retirada | `backend/src/frete`, `app/checkout` |
| RF07 Pagamento Pix e cartão | `backend/src/pagamentos`, `components/PixPayment`, `CardPayment` |
| RF08 E-mail de confirmação | `backend/src/mail` |
| RF09 Histórico e rastreamento | `app/conta/pedidos`, `app/pedido/[numero]` |
| RF10 Cadastro de produtos | `backend/src/admin`, `app/admin/produtos` |
| RF11 Estoque (baixa automática, entradas) | `pedidos.service` (reserva atômica), `app/admin/estoque` |
| RF12 Gestão de pedidos | `app/admin/pedidos` |
| RF15 Recuperação de senha | `auth` (token de uso único, 30 min) |
| RF16 Contato / WhatsApp | rodapé (`components/Footer`) |
| RNF05 Páginas legais | `/paginas/*` (texto-base: **revisar com a loja e assessoria jurídica**) |
| Itens do protótipo | banners (`/admin/banners`), painel com indicadores de estoque, páginas institucionais |

## Segurança implementada (Etapa 4, seção 8)

- Senhas com **Argon2id**; política de senha; bloqueio temporário após 5 falhas; mensagens que não revelam se o e-mail existe; tempo de resposta equalizado.
- **JWT de 15 minutos** em memória (nunca em localStorage) + **refresh token** em cookie `httpOnly`, `SameSite=Strict`, com **rotação** e **detecção de reutilização**. Refresh e logout exigem o cabeçalho `X-Requested-With` (proteção CSRF).
- Rotas **privadas por padrão** (`@Public()` libera); perfis `CLIENTE`, `ATENDENTE`, `ADMINISTRADOR` verificados no servidor; conferência de propriedade em pedidos.
- Validação de toda entrada com **Zod**; Prisma com consultas parametrizadas; Helmet; CORS com lista de origens; limitação de requisições (global e por rota) no NestJS e no Nginx.
- **Preços, frete e totais sempre recalculados no servidor.** Estoque reservado por atualização condicional atômica (impede venda sem saldo).
- Pagamentos: cartão tokenizado no navegador (o servidor nunca vê o número); notificações com **assinatura verificada** e status **reconsultado** na API do provedor; processamento idempotente.
- Upload de imagens: tipo verificado pelo conteúdo, limite de 2 MB, nome aleatório.
- **Trilha de auditoria** das ações administrativas; consulta a clientes restrita ao administrador e registrada.
- **LGPD:** consentimento registrado, exportação e exclusão de dados do titular, dados de pedidos desvinculados da identidade.
- A configuração recusa iniciar em produção com pagamento `fake`.

## Decisões e diferenças em relação às etapas anteriores

- **Pagamento na tela do pedido:** o checkout cria o pedido (reservando o estoque) e leva à tela de pagamento (Pix ou cartão), em vez de uma única página.
- **Login obrigatório para comprar.** A compra como visitante, que o protótipo deixa em aberto, não foi implementada.
- **E-book/formato digital:** o banco tem o atributo `formato`, mas a compra de produtos digitais é recusada (fora do MVP, Etapa 2).
- **Avaliações (RF17) e relatórios (RF13):** não implementados (versões 2.0 e 1.1).
- **Imagens de produtos:** armazenamento local (volume Docker). Para produção em escala, trocar por armazenamento compatível com S3 (`StorageService`).
- **Pix no protótipo:** o Canva mostrava apenas cartão; o Pix está implementado por ser requisito (RF07).

## Antes de ir para produção

- Trocar `PAYMENT_PROVIDER=mercadopago` e testar com credenciais de teste: criação de Pix, cartão (Brick), webhook (`MP_NOTIFICATION_URL` público com HTTPS) e `MP_WEBHOOK_SECRET`.
- Trocar `SHIPPING_PROVIDER=melhorenvio` e validar a cotação no sandbox; revisar a tabela `flat` (valores ilustrativos).
- Configurar SMTP real; revisar os textos das páginas legais; designar o encarregado de dados (LGPD).
- HTTPS (Cloudflare ou certbot) e ativar HSTS no Nginx; adicionar uma política CSP no front-end (o Brick do Mercado Pago exige liberar `sdk.mercadopago.com`).
- Gerar e **versionar as migrações** (`prisma migrate dev`); rotina de **backup** diário do MySQL com cópia externa e teste de restauração.
- Habilitar autenticação em dois fatores para administradores (previsto para a v1.1).
- Acrescentar testes de integração e ponta a ponta (Playwright) e um teste de carga básico.
- Substituir os dados do seed (preços, estoques e autores são fictícios/de demonstração).

## Estrutura

```
backend/   NestJS: src/{auth,catalogo,carrinho,frete,pedidos,pagamentos,admin,conteudo,mail,common,config,domain,schemas}, prisma/, test/
frontend/  Next.js: src/{app,components,lib}
deploy/    nginx.conf
scripts/   sync-schemas.mjs
```
