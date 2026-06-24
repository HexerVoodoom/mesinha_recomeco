#!/usr/bin/env node
/**
 * Resumo Semanal da Mesinha 💕
 *
 * SETUP (uma vez só):
 *   cd tools && npm install
 *
 * EXECUÇÃO MANUAL:
 *   node tools/weekly-summary.mjs
 *
 * AUTOMAÇÃO — roda todo Monday às 9h (macOS / Linux):
 *   crontab -e
 *   Adicione a linha abaixo (ajuste o caminho absoluto):
 *   0 9 * * 1 /usr/local/bin/node /caminho/para/mesinha_recomeco/tools/weekly-summary.mjs >> /tmp/mesinha-cron.log 2>&1
 *
 * SAÍDA:
 *   ~/mesinha-resumos/
 *     2026/
 *       06-junho/
 *         resumo-semana-2026-06-16.md
 *
 *   Personalize com: MESINHA_OUTPUT_DIR=/outro/caminho
 *
 * CHAVE API:
 *   Salva em tools/.env.local (gitignored automaticamente)
 */

import Anthropic from '@anthropic-ai/sdk';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Carrega .env.local automaticamente (chave da API, etc.)
try {
  const envFile = path.join(__dirname, '.env.local');
  if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split('\n')) {
      const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
      if (m) process.env[m[1]] ??= m[2].trim();
    }
  }
} catch { /* silencioso */ }

// ── Configuração ─────────────────────────────────────────────────────────────

const BASE_URL = 'https://oubdmmaqxnutbbxiqeow.supabase.co/functions/v1/make-server-19717bce';
const ANON_KEY  = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91YmRtbWFxeG51dGJieGlxZW93Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MDE2OTMsImV4cCI6MjA4ODA3NzY5M30.jLMAGrD0jOaId3Tjy1IKDPc4rtDqm4hx-Bv6Mzo0dDw';
const OUTPUT_DIR = process.env.MESINHA_OUTPUT_DIR || path.join(os.homedir(), 'mesinha-resumos');

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error('❌  Variável ANTHROPIC_API_KEY não definida.');
  console.error('    Execute: ANTHROPIC_API_KEY=sk-ant-... node scripts/weekly-summary.mjs');
  process.exit(1);
}

// ── Helpers de data ───────────────────────────────────────────────────────────

const MONTH_NAMES = [
  'janeiro','fevereiro','março','abril','maio','junho',
  'julho','agosto','setembro','outubro','novembro','dezembro',
];

function ptDate(d) {
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  });
}

function getWeekRange() {
  const to = new Date();
  const from = new Date(to);
  from.setDate(to.getDate() - 7);
  from.setHours(0, 0, 0, 0);
  return { from, to };
}

// ── Busca dados da API ────────────────────────────────────────────────────────

async function fetchAllItems() {
  const all = [];
  let offset = 0;
  const limit = 200;

  while (true) {
    const res = await fetch(`${BASE_URL}/items?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`API retornou ${res.status}: ${body.slice(0, 200)}`);
    }
    const { items, hasMore } = await res.json();
    all.push(...items);
    if (!hasMore) break;
    offset += limit;
  }
  return all;
}

// ── Categorias ────────────────────────────────────────────────────────────────

const LABELS = {
  watch:  '📱 Vídeos Curtos',
  movies: '🎬 Filmes & Séries',
  games:  '🎮 Jogos',
  food:   '🍕 Comidas',
  places: '📍 Lugares',
  dates:  '📅 Datas Especiais',
  jokes:  '😄 Bobeiras',
  alarm:  '⏰ Lembretes',
  top3:   '🏆 Top 3',
  mural:  '💌 Mural',
  other:  '🌈 Outros',
};

const MURAL_TYPE = { text: 'texto', image: 'imagem', video: 'vídeo', audio: 'áudio' };

// ── Monta contexto para o Claude ──────────────────────────────────────────────

function buildContext(items, { from, to }) {
  const thisWeek = items.filter(i => new Date(i.createdAt) >= from);
  const recentDone = items.filter(i => {
    if (i.status !== 'done') return false;
    const ts = i.updatedAt ? new Date(i.updatedAt) : new Date(i.createdAt);
    return ts >= from;
  });
  const allPending = items.filter(i => i.status === 'pending' && i.category !== 'alarm');
  const alarms = items.filter(i => i.category === 'alarm' && i.reminderActive !== false);
  const favorites = items.filter(i => i.isFavorite);

  // Agrupar novidades por categoria
  const newByCat = {};
  for (const item of thisWeek) {
    (newByCat[item.category] ??= []).push(item);
  }

  let ctx = `=== DADOS DA MESINHA — ${ptDate(from)} até ${ptDate(to)} ===\n\n`;

  // ── Novidades da semana
  ctx += `## NOVIDADES DA SEMANA (${thisWeek.length} novo(s))\n\n`;
  if (thisWeek.length === 0) {
    ctx += 'Nenhum item novo esta semana.\n\n';
  } else {
    for (const [cat, catItems] of Object.entries(newByCat)) {
      ctx += `### ${LABELS[cat] ?? cat}\n`;
      for (const item of catItems) {
        ctx += `- [${item.createdBy}] "${item.title}"`;
        if (item.comment)  ctx += ` — ${item.comment}`;
        if (item.tags?.length) ctx += ` (tags: ${item.tags.join(', ')})`;
        if (item.videoLink)    ctx += ` [tem link de vídeo]`;
        if (item.isFavorite)   ctx += ` ⭐ favorito`;
        ctx += '\n';

        if (item.muralContentType) {
          ctx += `  Tipo de post: ${MURAL_TYPE[item.muralContentType] ?? item.muralContentType}`;
          if (item.caption) ctx += ` | Legenda: "${item.caption}"`;
          ctx += '\n';
        }

        if (item.top3Mateus || item.top3Amanda) {
          if (item.top3Mateus)
            ctx += `  Top 3 do Mateus: 1º "${item.top3Mateus.position1}", 2º "${item.top3Mateus.position2}", 3º "${item.top3Mateus.position3}"\n`;
          if (item.top3Amanda)
            ctx += `  Top 3 da Amanda: 1º "${item.top3Amanda.position1}", 2º "${item.top3Amanda.position2}", 3º "${item.top3Amanda.position3}"\n`;
        }

        if (item.category === 'alarm' && item.reminderTime) {
          const forWho = [item.reminderForMateus && 'Mateus', item.reminderForAmanda && 'Amanda'].filter(Boolean).join(' e ');
          ctx += `  ⏰ ${item.reminderTime} | Dias: ${item.reminderDays?.join(', ') ?? '?'} | Para: ${forWho}\n`;
        }

        if (item.category === 'dates' && item.eventDate) {
          ctx += `  📅 Data: ${item.eventDate}`;
          if (item.reminderFrequency) ctx += ` | Recorrência: ${item.reminderFrequency}`;
          ctx += '\n';
        }
      }
      ctx += '\n';
    }
  }

  // ── Concluídos
  ctx += `## CONCLUÍDOS ESTA SEMANA (${recentDone.length})\n`;
  if (recentDone.length === 0) {
    ctx += 'Nenhum item concluído esta semana.\n';
  } else {
    for (const item of recentDone) {
      ctx += `- [${item.createdBy}] "${item.title}" (${LABELS[item.category] ?? item.category})\n`;
      if (item.comment) ctx += `  Comentário: ${item.comment}\n`;
    }
  }
  ctx += '\n';

  // ── Lista geral pendente (resumida)
  ctx += `## PENDENTES NO TOTAL\n`;
  const pendByCat = {};
  for (const item of allPending) {
    (pendByCat[item.category] ??= []).push(item.title);
  }
  for (const [cat, titles] of Object.entries(pendByCat)) {
    ctx += `${LABELS[cat] ?? cat}: ${titles.length} item(ns)\n`;
    titles.slice(0, 6).forEach(t => ctx += `  - ${t}\n`);
    if (titles.length > 6) ctx += `  ... e mais ${titles.length - 6}\n`;
  }
  ctx += '\n';

  // ── Lembretes ativos
  if (alarms.length > 0) {
    ctx += `## LEMBRETES ATIVOS\n`;
    for (const a of alarms) {
      const forWho = [a.reminderForMateus && 'Mateus', a.reminderForAmanda && 'Amanda'].filter(Boolean).join(' e ');
      ctx += `- "${a.title}" — ${a.reminderTime ?? '?'} (${a.reminderDays?.join(', ') ?? ''}) → ${forWho}\n`;
    }
    ctx += '\n';
  }

  // ── Favoritos
  if (favorites.length > 0) {
    ctx += `## FAVORITOS\n`;
    for (const f of favorites) {
      ctx += `- [${f.createdBy}] "${f.title}" (${LABELS[f.category] ?? f.category})\n`;
    }
    ctx += '\n';
  }

  return ctx;
}

// ── Prompt para o Claude ──────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Você é um assistente pessoal íntimo de um casal chamado Amanda e Mateus. Eles usam um app chamado "Mesinha" para organizar a vida a dois — listas de filmes, comidas, lugares, datas especiais, Top 3 favoritos, um mural de memórias, lembretes, etc.

Seu trabalho é analisar os dados de uso semanal do app e gerar um resumo caloroso, pessoal e descritivo — como um diário íntimo do casal. Este resumo é de uso estritamente privado de Mateus para criar conteúdo especial de aniversário de namoro.

Escreva em português, com tom afetivo e atencioso. Interprete os dados com sensibilidade: o que as escolhas revelam sobre o casal, seus gostos, seus momentos, seus planos.`;

const USER_PROMPT = (context) => `${context}

Gere o **resumo semanal** no seguinte formato:

---

## ✨ Destaques da Semana
O que foi mais significativo ou especial — os momentos que merecem ser lembrados.

## 💕 Novidades de Amanda & Mateus
O que cada um adicionou à vida a dois esta semana — com contexto sobre o que isso revela sobre eles.

## ✅ O que Fizeram / Realizaram
Itens concluídos e o que isso significa (uma comida experimentada, um jogo zerado, um lugar visitado, etc.).

## 💌 Momentos do Mural
Posts do mural desta semana — memórias registradas, mensagens trocadas.

## 📅 Datas & Lembretes para Ficar de Olho
Datas especiais próximas e lembretes ativos relevantes.

## 💡 Insights para o Conteúdo de Aniversário
Observações específicas sobre gostos, planos, hábitos e momentos do casal que podem virar conteúdo especial. Seja concreto: sugira temas, frases, referências que Mateus pode usar.

---`;

// ── Gera e salva o relatório ──────────────────────────────────────────────────

async function run() {
  console.log('🔄  Buscando dados da Mesinha...');
  const items = await fetchAllItems();
  console.log(`✅  ${items.length} itens carregados`);

  const weekRange = getWeekRange();
  const context = buildContext(items, weekRange);

  console.log('🤖  Gerando resumo com Claude...');
  const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: USER_PROMPT(context) }],
  });

  const summary = response.content.find(b => b.type === 'text')?.text ?? '(sem conteúdo)';

  // ── Determina caminho de saída
  const now = new Date();
  const year  = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day   = String(now.getDate()).padStart(2, '0');
  const monthName = MONTH_NAMES[now.getMonth()];

  const dir = path.join(OUTPUT_DIR, String(year), `${month}-${monthName}`);
  fs.mkdirSync(dir, { recursive: true });

  const filename = `resumo-semana-${year}-${month}-${day}.md`;
  const filepath = path.join(dir, filename);

  const document = [
    `# Resumo Semanal da Mesinha 💕`,
    `**${ptDate(weekRange.from)} → ${ptDate(weekRange.to)}**`,
    '',
    summary,
    '',
    '---',
    `*Gerado em ${now.toLocaleString('pt-BR')}*`,
  ].join('\n');

  fs.writeFileSync(filepath, document, 'utf8');
  console.log(`✅  Resumo salvo em:\n    ${filepath}`);
}

run().catch(err => {
  console.error('❌  Erro:', err.message);
  process.exit(1);
});
