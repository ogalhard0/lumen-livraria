import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import {
  toCents, fromCents, proximosStatus, podeTransicionar, liberaEstoque, etapasRastreamento, ROTULO_CLIENTE,
  consolidarItens, calcularTotais, normalizarCep, regiaoPorCep, cotarFlat, aplicarFreteGratis,
  statusEstoque, disponibilidadePublica, validarSenha, slugify, verificarAssinaturaMP,
  formatarNumeroPedido, numeroPedidoValido,
} from '../src/domain';

test('dinheiro em centavos sem erro de ponto flutuante', () => {
  assert.equal(toCents('39.90'), 3990);
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.equal(fromCents(10230), 102.3);
  assert.throws(() => toCents('abc'));
});

test('máquina de estados do pedido', () => {
  assert.ok(podeTransicionar('AGUARDANDO_PAGAMENTO', 'PAGO', 'ENVIO'));
  assert.ok(!podeTransicionar('AGUARDANDO_PAGAMENTO', 'ENVIADO', 'ENVIO'));
  assert.ok(!podeTransicionar('PAGO', 'CONCLUIDO', 'ENVIO'));
  assert.deepEqual(proximosStatus('EM_SEPARACAO', 'ENVIO'), ['ENVIADO', 'CANCELADO']);
  assert.deepEqual(proximosStatus('EM_SEPARACAO', 'RETIRADA'), ['PRONTO_RETIRADA', 'CANCELADO']);
  assert.deepEqual(proximosStatus('CANCELADO', 'ENVIO'), []);
  assert.ok(liberaEstoque('CANCELADO') && !liberaEstoque('PAGO'));
  assert.equal(ROTULO_CLIENTE.PAGO, 'Recebido');
});

test('linha do tempo de acompanhamento', () => {
  const e = etapasRastreamento('EM_SEPARACAO', 'ENVIO');
  assert.deepEqual(e.map((x) => x.concluida), [true, false, false]);
  assert.deepEqual(e.map((x) => x.atual), [false, true, false]);
  const f = etapasRastreamento('CONCLUIDO', 'RETIRADA');
  assert.ok(f.every((x) => x.concluida && !x.atual));
  assert.equal(f[2].rotulo, 'Pronto para retirada');
});

test('consolidação de itens e totais', () => {
  assert.deepEqual(
    consolidarItens([{ produtoId: 1, quantidade: 1 }, { produtoId: 1, quantidade: 2 }, { produtoId: 2, quantidade: 1 }]),
    [{ produtoId: 1, quantidade: 3 }, { produtoId: 2, quantidade: 1 }],
  );
  assert.throws(() => consolidarItens([]));
  assert.throws(() => consolidarItens([{ produtoId: 1, quantidade: 0 }]));
  assert.throws(() => consolidarItens([{ produtoId: 1, quantidade: 15 }, { produtoId: 1, quantidade: 10 }]));
  const t = calcularTotais([{ precoCents: 3990, quantidade: 1 }, { precoCents: 4990, quantidade: 2 }], 1250);
  assert.deepEqual(t, { subtotalCents: 13970, freteCents: 1250, totalCents: 15220 });
});

test('CEP, região e frete de referência', () => {
  assert.equal(normalizarCep('12500-000'), '12500000');
  assert.equal(normalizarCep('1250'), null);
  assert.equal(regiaoPorCep('12515-000'), 'LOCAL');
  assert.equal(regiaoPorCep('01310-100'), 'SP');
  assert.equal(regiaoPorCep('90010-000'), 'SUL');
  const [eco, exp] = cotarFlat('12500000', 400);
  assert.equal(eco.precoCents, 1500);
  assert.equal(exp.precoCents, 2400);
  assert.ok(exp.prazoDias < eco.prazoDias);
  assert.equal(cotarFlat('90010000', 7200)[0].precoCents, 4700 + 3 * 500);
  assert.throws(() => cotarFlat('12500000', 0));
  const g = aplicarFreteGratis(cotarFlat('01310100', 400), 15000, 15000);
  assert.equal(g[0].precoCents, 0);
  assert.ok(g[1].precoCents > 0);
  assert.equal(aplicarFreteGratis(cotarFlat('01310100', 400), 14999, 15000)[0].precoCents, 1900);
});

test('indicadores de estoque', () => {
  assert.equal(statusEstoque(0, 3), 'SEM_ESTOQUE');
  assert.equal(statusEstoque(3, 3), 'BAIXO');
  assert.equal(statusEstoque(4, 3), 'NORMAL');
  assert.equal(disponibilidadePublica(0), 'ESGOTADO');
  assert.equal(disponibilidadePublica(5), 'ULTIMAS_UNIDADES');
  assert.equal(disponibilidadePublica(6), 'EM_ESTOQUE');
});

test('política de senha', () => {
  assert.deepEqual(validarSenha('Fe2026Lumen!'), []);
  assert.ok(validarSenha('curta1').length > 0);
  assert.ok(validarSenha('somenteletras').some((e) => e.includes('número')));
  assert.ok(validarSenha('12345678').length > 0);
  assert.ok(validarSenha('Maria12345', 'maria@exemplo.com').some((e) => e.includes('e-mail')));
});

test('slug e número do pedido', () => {
  assert.equal(slugify('Bíblia Sagrada – Edição Pastoral'), 'biblia-sagrada-edicao-pastoral');
  assert.equal(slugify('  São José: Modelo de Pai e Esposo '), 'sao-jose-modelo-de-pai-e-esposo');
  assert.equal(formatarNumeroPedido(148), 'LUM-000148');
  assert.ok(numeroPedidoValido('LUM-000148') && !numeroPedidoValido('LUM-1; DROP'));
});

test('assinatura do webhook do Mercado Pago', () => {
  const secret = 'segredo-de-teste';
  const ts = '1742505638683';
  const manifest = `id:abc123;request-id:req-1;ts:${ts};`;
  const v1 = createHmac('sha256', secret).update(manifest).digest('hex');
  const base = { xSignature: `ts=${ts},v1=${v1}`, xRequestId: 'req-1', dataId: 'ABC123', secret };
  assert.equal(verificarAssinaturaMP(base), true);
  assert.equal(verificarAssinaturaMP({ ...base, dataId: 'outro' }), false);
  assert.equal(verificarAssinaturaMP({ ...base, secret: 'errado' }), false);
  assert.equal(verificarAssinaturaMP({ ...base, xSignature: undefined }), false);
  assert.equal(verificarAssinaturaMP({ ...base, xSignature: `ts=${ts},v1=${'0'.repeat(64)}` }), false);
});
