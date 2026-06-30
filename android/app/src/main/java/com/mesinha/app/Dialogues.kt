package com.mesinha.app

import java.time.LocalDate

/**
 * Par de falas exibido no widget: uma fala do Corvinho e uma da Alpaquinha.
 */
data class DialoguePair(val corvinho: String, val alpaquinha: String)

/**
 * Pool de diálogos do widget — mantido em sincronia com o widget web
 * (`src/app/components/CharacterDialogueWidget.tsx`). A mesma fórmula de índice
 * diário é usada nos dois lados, então app e widget mostram a MESMA frase no
 * mesmo dia.
 */
object Dialogues {

    val POOL: List<DialoguePair> = listOf(
        DialoguePair("Viram algum post novo no Mural hoje?", "Vi sim! Que memória mais fofa..."),
        DialoguePair("Qual é o plano de hoje?", "Jantar naquele lugar que a gente salvou!"),
        DialoguePair("Tem filme novo na lista pra maratonar?", "Tem! Coloca na fila e aguarda!"),
        DialoguePair("Não esquece o lembrete das 21h!", "Já ativei! Obrigada, corvinho."),
        DialoguePair("Que data especial está chegando?", "Olha lá nas Datas e se prepara!"),
        DialoguePair("Bobeira do dia: qual foi a melhor?", "Aquela do elevador ainda me faz rir!"),
        DialoguePair("Top 3 filmes de romance, vai lá!", "La La Land, já garantido no primeiro!"),
        DialoguePair("Tem lugar novo pra visitar na lista?", "Uma cachoeira novinha apareceu!"),
        DialoguePair("Comida nova pra explorar esse mês?", "Aquela pizza na lista me chama demais!"),
        DialoguePair("Alguém curtiu o post do mural hoje?", "Só corações e amor por aqui!"),
        DialoguePair("Já planejaram o fim de semana?", "Praia, piquenique ou sofá? Difícil!"),
        DialoguePair("Série nova na lista pra ver juntos?", "Adiciona lá e a gente decide!"),
        DialoguePair("Lembrete: dizer 'te amo' hoje!", "Isso não precisa de lembrete!"),
        DialoguePair("Viram algum vídeo curtinho hoje?", "Mandei um nos Vídeos Curtos!"),
        DialoguePair("Top 3 de sabores de sorvete, rápido!", "Chocolate, morango e creme! Fácil."),
        DialoguePair("Tem jogo novo pra jogar junto?", "It Takes Two ainda está esperando!"),
        DialoguePair("Mural cheio de memórias boas?", "Cada post é uma históriazinha!"),
        DialoguePair("Aquele restaurante novo está na lista?", "Já adicionei em Comidas!"),
        DialoguePair("O aniversário de vocês está marcado?", "Claro! Com lembrete e tudo!"),
        DialoguePair("Qual o plano pra próxima viagem?", "Tem bastante coisa em Lugares!"),
        DialoguePair("Tem vídeo novo pra rir juntos?", "Adicionei três hoje! Vai rir muito."),
        DialoguePair("Já escreveram alguma bobeira hoje?", "Ainda não, mas tem história pra contar!"),
        DialoguePair("Lembrou de marcar a data importante?", "Sim! Com notificação e tudo!"),
        DialoguePair("Alguém ganhou o Top 3 de hoje?", "Empate! Os dois têm bom gosto."),
        DialoguePair("Que lugar faz tempo que querem ir?", "Machu Picchu está na lista há séculos!"),
        DialoguePair("Stardew Valley ou Unravel Two hoje?", "Precisa de uma votação rápida!"),
        DialoguePair("Quantos itens pendentes na lista?", "Bastante! Mas faz parte do charme!"),
        DialoguePair("Já mandaram um post fofo no Mural?", "Ainda não! Vai lá e surpreende!"),
        DialoguePair("Culinária nova na lista de comidas?", "Japonesa está esperando uma chance!"),
        DialoguePair("Próximo jogo de tabuleiro: qual?", "Tem ideia salva em Jogos! Olha lá."),
        DialoguePair("O mural está com saudade de vocês!", "Bora adicionar uma memória nova!"),
        DialoguePair("Já conferiram os lembretes de hoje?", "Sim! Tudo certo e no horário.")
    )

    /**
     * Índice determinístico que muda 1x por dia. Replica a fórmula do widget web:
     * `(diaDoAno + ano*365) % POOL.size`.
     */
    private fun dailyIndex(date: LocalDate): Int {
        val dayOfYear = date.dayOfYear.toLong()          // 1..366
        val n = dayOfYear + date.year.toLong() * 365L
        return (Math.floorMod(n, POOL.size.toLong())).toInt()
    }

    /** Par de falas do dia de hoje. */
    fun today(): DialoguePair = POOL[dailyIndex(LocalDate.now())]
}
