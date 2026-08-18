# Regras do projeto (para o Claude)

Instruções permanentes para qualquer sessão do Claude Code neste repositório.

---

## Merge é automático — não perguntar

**Sempre que terminar de atualizar algo, faz o merge.** Não pergunta, não deixa
em draft esperando aprovação. O fluxo completo de qualquer mudança é:

1. Desenvolver no branch de trabalho.
2. Commitar e dar push.
3. Abrir o PR para `main` (com descrição do que mudou).
4. Esperar o CI ficar verde.
5. **Tirar do draft e fazer o merge em `main`** — squash merge, que é o padrão
   do repositório (o histórico da `main` é um commit por PR, com `(#NN)` no fim
   do título).
6. Avisar no chat que foi mergeado, com o link do PR.

Só **não** mergeia se:

- o CI estiver vermelho — arruma primeiro, aí mergeia;
- houver conflito com a `main` — resolve primeiro, aí mergeia;
- a pessoa tiver pedido explicitamente naquela conversa para segurar.

Fora esses casos, mudança terminada é mudança mergeada. Deixar PR aberto
esperando "posso mergear?" não é o comportamento desejado aqui.

---

## Convenções

- **Idioma:** tudo em português — commits, PRs, comentários no código, textos da
  interface. É um app de casal, o tom é informal e carinhoso, não corporativo.
- **Branch principal:** `main` (produção).
- **Verificação antes do push:** `npm run build` tem que passar.
- **Documentação:** mudanças relevantes de arquitetura ou de produto entram no
  `PROJETO.md`.
