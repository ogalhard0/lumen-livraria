/* Dados de demonstração. Preços, estoques e e-mails são fictícios. */
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomBytes } from 'node:crypto';
import { slugify } from '../src/domain/slug';

const prisma = new PrismaClient();

const CATEGORIAS: { nome: string; filhas?: string[] }[] = [
  { nome: 'Bíblia', filhas: ['Edição Pastoral', 'Bíblia de estudo'] },
  { nome: 'Liturgia' },
  { nome: 'Espiritualidade', filhas: ['Clássicos', 'Meditações'] },
  { nome: 'Doutrina', filhas: ['Catecismo'] },
  { nome: 'Teologia' },
  { nome: 'Santos e Devoções' },
  { nome: 'Infantil' },
  { nome: 'Presentes', filhas: ['Terços'] },
];

// titulo, autor, categoria (nome), preco, estoque, destaque, peso (g)
const PRODUTOS: [string, string, string, number, number, boolean, number][] = [
  ['Bíblia Sagrada – Edição Pastoral', 'Vários autores', 'Edição Pastoral', 129.9, 40, true, 900],
  ['Imitação de Cristo', 'Tomás de Kempis', 'Clássicos', 39.9, 25, true, 280],
  ['Catolicismo para Leigos', 'Pe. Reginaldo Manzotti', 'Doutrina', 54.9, 18, true, 420],
  ['A História de Jesus', 'Equipe Lumen Kids', 'Infantil', 44.9, 9, true, 380],
  ['Terço de Cada Dia', 'Equipe Lumen', 'Terços', 34.9, 60, true, 90],
  ['Catecismo da Igreja Católica', 'Igreja Católica', 'Catecismo', 89.9, 14, false, 1100],
  ['Consagração a Nossa Senhora', 'São Luís Maria Grignion de Montfort', 'Santos e Devoções', 32.9, 22, false, 250],
  ['São José: Modelo de Pai e Esposo', 'Pe. José Francisco', 'Santos e Devoções', 36.9, 12, false, 300],
  ['O Coração Eucarístico de Jesus', 'Pe. Stefano Manelli', 'Meditações', 42.9, 6, false, 320],
  ['Liturgia das Horas – Edição resumida', 'Vários autores', 'Liturgia', 79.9, 3, false, 700],
  ['Teologia para o Dia a Dia', 'Pe. Luiz Erlin', 'Teologia', 59.9, 0, false, 500],
  ['Terço de madeira Nossa Senhora Aparecida', 'Equipe Lumen', 'Terços', 49.9, 30, false, 110],
  ['Meditações para o Advento', 'Pe. Luiz Erlin', 'Meditações', 27.9, 35, true, 200],
  ['Bíblia de Estudo Católica', 'Vários autores', 'Bíblia de estudo', 189.9, 8, false, 1400],
];

async function main() {
  // Categorias
  const mapaCat = new Map<string, number>();
  let ordem = 0;
  for (const c of CATEGORIAS) {
    const pai = await prisma.categoria.upsert({
      where: { slug: slugify(c.nome) },
      update: { nome: c.nome, ordem },
      create: { nome: c.nome, slug: slugify(c.nome), ordem },
    });
    mapaCat.set(c.nome, pai.id);
    ordem++;
    for (const f of c.filhas ?? []) {
      const filha = await prisma.categoria.upsert({
        where: { slug: slugify(f) },
        update: { nome: f, categoriaPaiId: pai.id },
        create: { nome: f, slug: slugify(f), categoriaPaiId: pai.id },
      });
      mapaCat.set(f, filha.id);
    }
  }

  // Produtos
  for (const [titulo, autor, cat, preco, estoque, destaque, peso] of PRODUTOS) {
    const slug = slugify(titulo);
    const categoriaId = mapaCat.get(cat)!;
    await prisma.produto.upsert({
      where: { slug },
      update: {},
      create: {
        titulo, autor, slug, categoriaId, preco, destaque, pesoGramas: peso, estoqueAtual: estoque,
        descricao: `${titulo}, de ${autor}. Obra para fortalecer a vida de fé, a oração e o conhecimento da Igreja. (Texto de demonstração.)`,
        movimentacoes: estoque > 0 ? { create: { tipo: 'ENTRADA', quantidade: estoque, observacao: 'Carga inicial (seed)' } } : undefined,
      },
    });
  }

  // Banners
  if ((await prisma.banner.count()) === 0) {
    await prisma.banner.createMany({
      data: [
        { titulo: 'Fé que ilumina. Palavras que transformam.', subtitulo: 'Lançamentos e ofertas para aprofundar sua caminhada com Deus.', link: '/catalogo', ordem: 0 },
        { titulo: 'Prepare o Natal com fé', subtitulo: 'Meditações e devocionais para o tempo do Advento.', link: '/catalogo?categoria=meditacoes', ordem: 1 },
        { titulo: 'Presentes que abençoam', subtitulo: 'Terços, imagens e livros para Batismo, Crisma e Primeira Eucaristia.', link: '/catalogo?categoria=presentes', ordem: 2 },
      ],
    });
  }

  // Páginas institucionais (texto-base; revise com a livraria e com assessoria jurídica)
  const paginas = [
    ['quem-somos', 'Quem somos', 'A Lumen é uma livraria católica a serviço da evangelização. Reunimos livros, bíblias, devocionários e artigos religiosos para ajudar você a viver e compartilhar a sua fé.'],
    ['politica-de-privacidade', 'Política de privacidade', 'Tratamos seus dados pessoais conforme a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Coletamos apenas o necessário para processar compras e entregas. Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento em Minha conta. Comunicações promocionais só são enviadas com o seu consentimento. (Texto-base: revisar antes da publicação.)'],
    ['trocas-e-devolucoes', 'Trocas e devoluções', 'Em compras feitas pela internet, você pode desistir em até 7 dias corridos após o recebimento (art. 49 do Código de Defesa do Consumidor). Entre em contato pelo e-mail de atendimento informando o número do pedido. (Texto-base: revisar antes da publicação.)'],
    ['termos-de-compra', 'Termos de compra', 'Ao comprar na Lumen, você concorda com as condições de preço, prazo e entrega informadas no fechamento do pedido. Pedidos não pagos dentro do prazo são cancelados automaticamente. (Texto-base: revisar antes da publicação.)'],
  ];
  for (const [slug, titulo, conteudo] of paginas) {
    await prisma.pagina.upsert({ where: { slug }, update: {}, create: { slug, titulo, conteudo } });
  }

  // Administrador inicial
  const email = (process.env.SEED_ADMIN_EMAIL ?? 'admin@lumen.local').toLowerCase();
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (!existente) {
    const senha = process.env.SEED_ADMIN_PASSWORD || randomBytes(12).toString('base64url');
    const senhaHash = await argon2.hash(senha, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
    await prisma.usuario.create({ data: { nome: 'Administração Lumen', email, senhaHash, perfil: 'ADMINISTRADOR' } });
    console.log('\n=== Administrador criado ===');
    console.log(`E-mail: ${email}`);
    if (!process.env.SEED_ADMIN_PASSWORD) console.log(`Senha gerada: ${senha}   (anote agora; ela não será exibida novamente)`);
    console.log('============================\n');
  }
  console.log('Seed concluído.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
