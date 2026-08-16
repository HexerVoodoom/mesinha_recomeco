# Benchmarking — o que dá pra roubar dos apps de casal pro Mesinha

O Mesinha é um app privado, de duas pessoas, que não vai ser monetizado nem
distribuído. Então este documento **não é uma análise de mercado** — é um
garimpo: olhar o que Love8, Couple Tree e o resto do mercado fazem, separar o
que presta, e traduzir em ideias concretas para o Mesinha, ancoradas no código
que já existe.

**Data:** agosto de 2026
**Método:** 5 rodadas de pesquisa (ver §1)
**A parte que importa:** §6 (ideias) e §7 (ideias que só um app de 2 pessoas pode ter)

---

## 1. Método

| Rodada | Foco | O que saiu |
|---|---|---|
| 1 | Mapear o campo | Os cinco arquétipos de app de casal |
| 2 | Ficha app por app | Features literais de Love8, Couple Tree, Between, Locket |
| 3 | Retenção e reclamações | Mecânicas que funcionam + armadilhas a evitar |
| 4 | Tendências 2026 | IA, widgets de presença, humor, cápsula do tempo |
| 5 | Lacunas finais | Jogos, pet virtual, comparação com os widgets Android do Mesinha |

**Limitação honesta:** o proxy de rede desta sessão bloqueia `play.google.com`,
`apps.apple.com` e vários blogs de comparação. A coleta foi toda por busca web,
que devolve resumos das páginas em vez do texto integral. As listas de features
abaixo são fiéis ao que as fontes descrevem, mas **notas, downloads e preços não
puderam ser conferidos na fonte primária** — e, como não há monetização em jogo,
isso não muda nada para as decisões aqui.

---

## 2. Onde o Mesinha está hoje

Levantado direto do código, não da memória:

**Conteúdo**
- **11 categorias de lista** com ícones desenhados à mão: Mural, Lembrete, Datas,
  Bobeiras, Top 3, Filmes/Séries, Vídeos Curtos, Jogos, Comidas, Lugares, Outros
  — `src/app/components/CategoryMenu.tsx`
- **Mural** com texto, imagem, vídeo e **áudio**; likes (`likedBy`), marcação de
  visualizado (`viewedBy`), legenda e thumbnail leve pra preview
- **Top 3** — cada um preenche o seu e vê o do outro (`top3Mateus`/`top3Amanda`).
  Não achei equivalente em nenhum concorrente.
- **Lembretes** com horário, dias da semana, destinatário por pessoa e frequência
- **Calendário de Encontros** — proposta com período (manhã/tarde/noite), tipo
  (em casa / videogame separados / sair) e comentário
- **Mapa** — localização em tempo real, sessão de 1h com expiração
- Busca, filtros, tags, favoritos, pendente/concluído

**Plataforma**
- PWA (React + Vite) no Cloudflare Pages + **app Android nativo** na Play Store
- **4 widgets de home screen**: Alpaquinha, Corvinho (personagens com frases e
  diálogos editáveis por vocês em `WidgetPhrasesEditor.tsx`), Mesinha e Encontros
- Push duplo: web-push (VAPID) pro PWA + FCM pro app instalado
- Realtime sync, cache offline (localStorage + Dexie), backup exportável
- Backend Edge Function (Deno + Hono) sobre KV JSONB, cron de lembretes por minuto
- CI/CD: merge em `main` publica site, backend e AAB assinado sozinho

**Já existe mas está fora do app**
- `tools/weekly-summary.mjs` — resumo semanal do mural via API do Claude, hoje só
  roda no terminal. É a coisa mais subaproveitada do projeto (ver §6, ideia 1).

---

## 3. O campo: cinco arquétipos

Nenhum app de casal é "um app de casal". São cinco produtos diferentes:

- **A. Presença/widget** — *te ver sem abrir nada.* Love8, Widgetable, Locket,
  Lovestruck, Pookie, Coupl, Lovebox, Bond Touch. O widget é o produto.
- **B. Diário/memória** — *guardar o que a gente viveu.* Between, Couple Tree,
  LuvDiary, Couple2, CoupleTime, MemoriesBox.
- **C. Conversa guiada** — *melhorar a relação.* Paired, Lasting, Flamme,
  Lovewick, Agapé, Couply, CoupleWork. Pergunta do dia, quiz, coach de IA.
- **D. Logística** — *tocar a vida a dois.* Cupla, SameWave, Honeydue.
- **E. Jogos/intimidade** — Kindu, Spicer, Truth or Dare para casais.

**Onde o Mesinha cai:** hoje é **B + D com um pé forte em A** — os 4 widgets são
raros nesse mercado, a maioria dos concorrentes só tem widget no iOS. Não toca em
C nem em E, e é aí que estão várias das ideias abaixo.

---

## 4. Os dois alvos principais

### 4.1 Love8

Foco em presença constante, inclusive à distância.

| Feature | Detalhe |
|---|---|
| Localização em tempo real | Posição, **velocidade**, **bateria** e **duração da permanência** no local |
| Alertas de lugar | Avisa quando o outro chega ou sai de um local marcado (geofence) |
| Pet virtual | Criado junto; a alimentação cooperativa força os dois a aparecerem |
| Recompensas diárias | Missões que dão prêmios |
| Diário de crescimento | Registro diário de momentos |
| Contador de aniversário | Dias/horas/minutos/segundos juntos + lembretes repetidos |
| Widgets interativos | Pet, localização, distância, **horário de sono**, calendário de status |
| Widget de foto | Empurra imagem nova pra tela inicial do outro |
| Mensageiro privado | Chat com animações em tela cheia |

**Reclamações dos usuários:** celular **esquenta e come bateria** para o que
entrega; **trava ao parear** com o código do parceiro; "bem instável"; **excesso
de notificações**; navegação confusa.

**Leitura:** vitrine de ideias boas com execução ruim. Vale roubar os
*conceitos*, não a *implementação*.

### 4.2 Couple Tree

Ritual leve diário com metáfora de crescimento.

| Feature | Detalhe |
|---|---|
| Pergunta do dia | Os dois respondem; as respostas puxam conversa |
| **Floresta particular** | Cada pergunta respondida **planta e faz crescer uma árvore** — o progresso do casal virando objeto visível |
| Jogos | Verdade ou Desafio, "O que você prefere" |
| Diário romântico | Emoções, pensamentos, memórias do dia |
| Horóscopo e tarô | Compatibilidade diária |
| Calendário + widget "Been Love" | Marcos e aniversários |
| Couple AI | Roteiros de encontro personalizados e projeção de "como seremos em 10 anos" |
| Cutucadas gentis | Lembretes pra voltar a interagir |

**Leitura:** a floresta é a melhor ideia de design do mercado. Transforma
consistência em algo **visível e acumulado**, sem inventar moeda falsa nem
pontuação artificial. É diretamente transplantável.

---

## 5. Matriz de features

✅ tem · 🟡 parcial · ❌ não tem

| Feature | **Mesinha** | Love8 | Couple Tree | Between | Paired | Cupla | Locket/Widgetable |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Listas por categoria | ✅ **11** | ❌ | ❌ | ❌ | ❌ | 🟡 | ❌ |
| Mural / feed de memórias | ✅ | 🟡 | 🟡 | ✅ | ❌ | ❌ | 🟡 |
| Post de **áudio** | ✅ | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ |
| Post de vídeo | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ | ❌ |
| Likes / visualizado | ✅ | ❌ | ❌ | 🟡 | ❌ | ❌ | 🟡 |
| **Top 3 comparado** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Lembrete com push por pessoa | ✅ | 🟡 | 🟡 | 🟡 | 🟡 | ✅ | ❌ |
| Calendário de encontros | ✅ | ❌ | 🟡 | ✅ | ❌ | ✅ | ❌ |
| Localização em tempo real | ✅ | ✅ | ❌ | 🟡 | ❌ | ❌ | 🟡 |
| Bateria / sono do outro | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Alerta de chegada (geofence) | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Widgets de home screen | ✅ **4** | ✅ | ✅ | ✅ | 🟡 | ❌ | ✅ |
| Widget com **personagem próprio** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Widget de foto empurrada | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Contador "juntos há X" | 🟡 | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Aniversários repetíveis | 🟡 | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ |
| Pergunta do dia | ❌ | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ |
| Streak / ritual diário | ❌ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| Progresso visual acumulado | ❌ | 🟡 | ✅ | ❌ | 🟡 | ❌ | 🟡 |
| Check-in de humor | ❌ | ✅ | 🟡 | ❌ | 🟡 | ❌ | ✅ |
| Pet virtual cooperativo | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ✅ |
| Jogos / quiz | ❌ | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Cápsula do tempo | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Bucket list com progresso | 🟡 | ❌ | ❌ | ❌ | ❌ | ✅ | ❌ |
| IA / resumo automático | 🟡 CLI | ❌ | ✅ | 🟡 | ✅ | ❌ | ❌ |
| Retrospectiva anual | ❌ | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ |
| Cutucada / nudge | ❌ | ✅ | ✅ | ❌ | ❌ | ❌ | ✅ |
| Backup exportável | ✅ | ❌ | ❌ | 🟡 | ❌ | ❌ | ❌ |

---

## 6. Ideias — o backlog

Ordenado por impacto ÷ esforço. Cada item diz onde encostar no código.

### 🔥 Onda 1 — muito retorno, pouco trabalho

**1. Resumo semanal dentro do app**
O `tools/weekly-summary.mjs` já gera um resumo do mural via Claude, mas só roda
no terminal. Promover a feature: card "A semana de vocês" no topo do Mural toda
segunda, entregue por push. O código já existe — falta o plugue.
→ Mover a lógica pro `supabase/functions/server/index.ts` como
`POST /weekly-summary`, agendar no pg_cron (a infra de cron já está lá), guardar
em KV como `summary:<semana-ISO>`, renderizar no `MuralSection.tsx`.

**2. Widget de foto empurrada (padrão Locket)**
A última foto do mural aparece direto no widget da tela inicial do outro. O
Locket virou fenômeno fazendo *só* isso. O mural já recebe imagens e o
`muralThumbnail` já é gerado leve — falta só o passo final.
→ Novo `PhotoWidgetProvider.kt` reaproveitando o thumbnail.
**Provavelmente o melhor custo-benefício da lista inteira.**

**3. Cutucada instantânea**
Botão que manda push imediato: "tô pensando em você". `sendPushToUser()` já está
pronto e funciona nos dois canais.
→ Rota `POST /nudge` + um botão. Umas 50 linhas.
→ **Põe rate limit** (1 a cada X minutos) — excesso de notificação é a
reclamação nº 1 contra o Love8.

**4. Contador "juntos há X" de verdade**
Hoje o `Settings.tsx` tem contagem regressiva de 500 dias com data hard-coded
(`2026-03-29`). Todo concorrente tem contador vivo, é a feature mais universal do
mercado.
→ Data vai pro `settings`; dias/horas aparecem no widget Mesinha; a categoria
`dates` passa a disparar lembrete anual automático ("faltam 7 dias pra X").

**5. Check-in de humor diário**
Cada um marca como está o dia (emoji + frase curta). Aparece no widget do outro.
É o dado que alimenta metade das outras ideias.
→ Nova categoria `mood` no `CategoryMenu.tsx` — a grade já é paginada e tem
espaço sobrando na página 2.

**6. Roleta de encontro** ⭐
Botão que sorteia um programa **a partir das listas que vocês já mantêm**: um
filme de Filmes/Séries + uma comida de Comidas, ou um lugar de Lugares. Resolve o
"não sei o que fazer hoje" usando conteúdo que já está no banco, sem inventar
nada. O Cupla tem sugestão de encontro genérica; a de vocês seria com os itens de
vocês.
→ Só frontend, lê o estado já carregado no `Home.tsx`.

**7. Mapa de memórias**
O Mapa já existe pra localização ao vivo. Adicionar pins fixos: os lugares onde
vocês já estiveram, ligados aos posts do mural daquele dia. A categoria `places`
já é a fonte.
→ `MapView.tsx` + campo de coordenada nos itens de `places`.

### 🌱 Onda 2 — o ritual

**8. Progresso visual acumulado — a "floresta" do Mesinha**
A melhor ideia do Couple Tree. Cada interação (post, encontro marcado, humor
registrado, item concluído) faz *algo crescer*. Não precisa ser árvore — pode ser
a casa da Alpaquinha se mobiliando, a coleção do Corvinho aumentando, um mapa se
preenchendo. Transforma consistência em objeto visível, sem moeda falsa.

**9. Streak — com trava de segurança**
Sequência de dias com alguma interação. **Obrigatório incluir congelamento** (o
padrão Duolingo): a pesquisa é explícita que streak sem proteção gera pico de uso
seguido de abandono na primeira falha. Gatilho baixo — qualquer interação conta.

**10. Pergunta do dia escrita por vocês**
É a feature mais copiada do mercado e a que mais gera reclamação ("as perguntas
acabam", "repete sempre"). A saída: banco de perguntas que **vocês dois
alimentam** — a Amanda escreve pro Mateus e vice-versa — com a IA gerando mais
quando esvaziar. Resolve estruturalmente o problema que nenhum app comercial
consegue resolver.
→ Categoria `question`, mesma mecânica do Top 3: cada um responde, revela quando
os dois responderem.

**11. Cápsula do tempo**
Carta, áudio ou foto que só abre numa data futura. Encaixa perfeito no modelo de
item que já existe — é `eventDate` + um flag de bloqueio.
→ **O bloqueio tem que ser no servidor**, senão vaza no cache offline.

**12. "Neste dia, no ano passado"**
Card que ressuscita um post de um ano atrás. Barato, retorno emocional alto,
reaproveita conteúdo que já está lá.

**13. Álbum por linha do tempo**
O mural é cronológico infinito. Falta navegar por mês/ano — é o que faz uma
memória ser reencontrada. O índice `idx_kv_items_createdat` já cobre isso.

**14. Bucket list com progresso**
Dá pra usar "Outros" hoje, mas sem barra de progresso nem comemoração. Categoria
`bucket` com "12 de 40 feitos" e post automático no mural quando algo é
concluído fecha o ciclo.

### 🎲 Onda 3 — brincadeira

**15. Alpaquinha e Corvinho vivos**
Love8 e Widgetable provam que pet cooperativo segura gente no app. **Vocês já têm
os personagens** — dar estado a eles (humor, reação ao que acontece no app,
comentário sobre um post novo ou um encontro marcado) é a evolução natural do
widget que já existe. Ninguém mais tem mascote próprio pra fazer isso.
→ Não deixar virar obrigação: pet que "morre" gera culpa, não carinho.

**16. Jogos: Verdade ou Desafio / O que você prefere**
Categoria que o Mesinha não toca. A versão de vocês: as cartas são escritas pelos
dois e entram num baralho compartilhado.

**17. Assistindo juntos**
A categoria Filmes/Séries já existe. Falta o estado: em que episódio cada um
está, quem tá adiantado, "pode assistir sem mim?". Ninguém faz isso bem.

**18. Cardápio da semana**
A categoria Comidas já existe. Falta plugar no Calendário de Encontros: o que vai
ser o jantar de cada dia.

**19. Rodízio de decisões**
De quem é a vez de escolher o filme / o restaurante / o programa. Acaba com a
negociação de "tanto faz, escolhe você".

**20. Recado de voz no widget**
O mural já aceita áudio. Falta o áudio mais recente virar um botão de play direto
na tela inicial.

**21. Desenho compartilhado**
Rabisco rápido que aparece no widget do outro. O Bondly virou app inteiro em cima
disso.

**22. Modo viagem**
Checklist de mala + roteiro + contagem regressiva, reaproveitando `lista` e
`dates`.

### 🧱 Onda 0 — fundação (chato, mas destrava o resto)

**23. Migrar mídia de base64/JSONB pro Supabase Storage** ⚠️
Está documentado no `PROJETO.md` como a causa raiz do alerta de Disk IO: imagens
e áudios vivem como base64 dentro do JSONB, então toda leitura arrasta linhas
gigantes. **É um teto duro** — widget de foto, álbum por timeline, cápsula do
tempo e retrospectiva todos pioram isso. Se o mural continuar crescendo, resolver
antes da Onda 1.

**24. Confiabilidade de notificação**
A reclamação mais destrutiva contra Between e Paired não é falta de feature — é
**notificação que não chega ou chega horas depois**. Streak, pergunta do dia e
humor diário só existem se o push for confiável. Vale uma tela de diagnóstico
("sua última notificação chegou às 14h32") **antes** de construir ritual em cima.

**25. Validar alarme sem dias configurados**
O `PROJETO.md` registra que o item "16 de março - trem do dota" tem
`reminderDays: []` e nunca vai disparar. Validação no `AddItemModal.tsx` mata a
classe inteira do bug.

### 💡 Extras que valem registro

| Ideia | De onde vem | Nota |
|---|---|---|
| Bateria e sono do outro no widget | Love8 / Widgetable | Muito encanto, pouco custo — a ponte nativa já existe |
| Distância entre vocês no widget | Widgetable | Trivial com os dados de localização atuais |
| Alerta de chegada em casa | Love8 | O Mapa já existe, falta o geofence. Cuidado com bateria |
| Pôster automático em Filmes/Jogos (TMDB) | — | Melhora muito a estética das listas |
| Contagem regressiva pro próximo encontro | — | O widget de Encontros já existe, é só um campo a mais |
| Busca semântica no mural | — | "aquela vez que a gente foi na praia", via embeddings |
| Reação com emoji nos posts | — | `likedBy` já existe; virar `reactions` é incremental |
| Livro do relacionamento em PDF | ninguém faz bem | O `/backup` já tem os dados, falta a diagramação |
| Lista de mercado com modo "no supermercado" | Cupla / SameWave | A categoria `lista` já existe |
| PWA instalável no iPhone | — | Só importa se um dos dois trocar de celular |

---

## 7. Ideias que só um app de duas pessoas pode ter

Esta é a parte que nenhum concorrente consegue copiar — não por incompetência,
mas porque um app com milhões de usuários **precisa** de conteúdo genérico. Por
isso os quizzes do Paired ficam repetitivos e as perguntas rasas: é a reclamação
nº 1 do mercado inteiro, e é estrutural. O Mesinha não tem esse problema.

**26. IA que conhece a história de vocês**
Todo o mural, todos os encontros, todas as listas estão num banco só e cabem num
contexto. Dá pra perguntar em linguagem natural: *"quando foi a primeira vez que
a gente foi na praia?"*, *"o que a gente andou fazendo em julho?"*, *"me dá uma
ideia de encontro baseada no que a gente gostou esse ano"*. O Couple Tree tem um
"Cat AI Counselor" genérico que não conhece ninguém. O de vocês conheceria tudo.
→ O `weekly-summary.mjs` já provou o caminho; é a mesma chamada com outro prompt.

**27. Os personagens narrando a vida de vocês**
Hoje as frases da Alpaquinha e do Corvinho são escritas à mão no
`WidgetPhrasesEditor`. Elas podiam **reagir ao que aconteceu de verdade**: um
post novo, um encontro marcado pra sexta, um aniversário chegando, três dias sem
ninguém postar. Gerado por IA a partir dos eventos reais da semana, com o tom que
vocês definirem.

**28. Retrospectiva do ano**
Um "wrapped" de verdade, com os dados de vocês: quantos encontros, quantas fotos,
os lugares no mapa, as músicas, o mês mais movimentado, a foto mais curtida.
Between arranha isso; ninguém entrega direito. Vocês têm todos os dados e um
backup completo pra alimentar.

**29. Piadas internas como conteúdo de primeira classe**
A categoria Bobeiras já é isso, mas passiva. Dá pra virar mecânica: bobeira
sorteada no widget, "lembra dessa?", contador de quantas vezes uma piada voltou.

**30. Modo chateado**
Um botão discreto pra sinalizar que não tá legal, sem ter que formular. Nenhum
app comercial faz porque é delicado demais pra escala — pra duas pessoas que se
conhecem, é só um sinal combinado.

**31. Rituais próprios**
Boa noite com áudio, "tô saindo do trabalho", "chegou em casa". Não são features
genéricas — são os rituais específicos de vocês, e o app pode conhecê-los pelo
nome.

**32. Placar do que vocês jogam**
A categoria Jogos existe. Quem ganhou mais no videogame, qual jogo tá em
andamento, o placar histórico.

---

## 8. Roadmap sugerido

```
Onda 0  → Storage de mídia · diagnóstico de push · validação de alarme
Onda 1  → Resumo semanal · widget de foto · nudge · contador · humor · roleta de encontro
Onda 2  → Progresso visual · streak com trava · pergunta do dia · cápsula do tempo
Onda 3  → Personagens vivos · jogos · assistindo juntos · retrospectiva do ano
```

**Se for pra escolher três coisas e mais nada:**

1. **Widget de foto empurrada** — maior impacto por linha de código do projeto
2. **Resumo semanal dentro do app** — o código já existe, falta o plugue
3. **IA que conhece a história de vocês** — a única coisa aqui que nenhum app do
   mundo consegue oferecer, porque depende de ser só de vocês dois

---

## 9. Armadilhas — aprendidas com as reclamações dos concorrentes

| Armadilha | Quem caiu | Como evitar |
|---|---|---|
| Excesso de notificação | Love8, Paired | Rate limit no nudge; um push agregado por dia, não um por evento |
| Bateria e aquecimento | Love8 | A localização já expira em 1h — manter essa disciplina em qualquer geofence |
| Streak que pune | genérico | Congelamento obrigatório, gatilho baixo, nunca zerar sem aviso |
| Conteúdo que repete | Paired, Couply | Conteúdo escrito por vocês, não banco genérico |
| Gamificação sobre produto instável | genérico | Onda 0 antes da Onda 2 — streak sobre push furado destrói a confiança |
| Pareamento que trava | Love8 | Os 2 perfis fixos já evitam a classe inteira do problema |

---

## 10. Fontes

- [Love8 — App para casais (App Store BR)](https://apps.apple.com/br/app/love8-app-para-casais/id6448163027)
- [Love8 — App for Couples (Google Play)](https://play.google.com/store/apps/details?id=ltd.love8.couples.relationship&hl=en_US)
- [Love8 — MWM](https://mwm.ai/apps/love8-app-for-couples/6448163027)
- [Couple Tree: For Relationship (App Store)](https://apps.apple.com/us/app/couple-tree-for-relationship/id1550789824)
- [Couple Tree (Google Play)](https://play.google.com/store/apps/details?id=com.music.couple.diary&hl=en_US)
- [Tree of Memories — site oficial](https://tree-memories.com/)
- [Between — site oficial](https://between.us/)
- [Locket Widget (App Store)](https://apps.apple.com/us/app/locket-widget/id1600525061)
- [Locket — cobertura 9to5Mac](https://9to5mac.com/2022/01/13/locket-app-iphone-widgets/)
- [Widgetable: Besties & Couples](https://play.google.com/store/apps/details?id=com.widgetable.theme.android&hl=en_US)
- [Lovebox & Widget: Bond On](https://apps.apple.com/us/app/lovebox-long-distance-love/id1154499750)
- [Cupla — calendário compartilhado](https://cupla.app/)
- [Flamme: Cozy Couples App](https://apps.apple.com/us/app/flamme-cozy-couples-app/id1583601044)
- [LuvDiary — cápsula do tempo e bucket list](https://play.google.com/store/apps/details?id=com.azuremir.android.luvda&hl=en_US)
- [Paired — análise de avaliações (Couples Analytics)](https://couplesanalytics.com/en/science/paired-app-reviews-a-data-driven-look-at-top-couples-apps)
- [Paired vs Lasting — ranking 2026 (Unstar)](https://unstar.app/blog/paired-lasting-love-nudge-evergreen-cupla-couples-apps-ranked-2026)
- [Melhores apps de casal 2026 (Amora)](https://tryamora.app/apps-for-couples)
- [Melhores apps de casal 2026 (Habi)](https://habi.app/insights/best-couple-apps/)
- [Melhores widgets para casais 2026 (Smush)](https://www.smushapp.com/blog/best-couples-widget-apps-2026)
- [Streaks e milestones em gamificação (Plotline)](https://www.plotline.so/blog/streaks-for-gamification-in-mobile-apps)
- [Gamificação e churn (StriveCloud)](https://www.strivecloud.io/blog/mobile-app-churn-gamification)
- [Pet companion design em gamificação (Yu-kai Chou)](https://yukaichou.com/advanced-gamification/the-pet-companion-design-in-gamification/)
- [Apps de relacionamento com IA em 2026 (Smush)](https://www.smushapp.com/blog/ai-relationship-apps-couples-2026)
- [Aplicativos para casal (TechTudo)](https://www.techtudo.com.br/listas/2019/01/aplicativo-para-casal-veja-apps-que-podem-melhorar-seu-relacionamento.ghtml)
