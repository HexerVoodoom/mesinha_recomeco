package com.mesinha.app

import java.time.LocalDate

/**
 * Par de falas do widget duplo: uma fala do Corvinho e uma da Alpaquinha.
 */
data class DialoguePair(val corvinho: String, val alpaquinha: String)

/**
 * Frases PADRÃO (reserva) dos widgets, embutidas no app. São usadas quando
 * ainda não há uma lista baixada do servidor (ver [PhraseRepository]) — por
 * exemplo, no primeiro uso ou sem internet. A lista "ao vivo" fica no backend
 * (KV `widget-phrases`) e é editada pelo próprio app em Configurações.
 */
object Dialogues {

    val DEFAULT_POOL: List<DialoguePair> = listOf(
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
        DialoguePair("Tem jogo novo pra jogar junto?", "Vamos jogar Ragnarok? Eu te curo!"),
        DialoguePair("Mural cheio de memórias boas?", "Cada post é uma históriazinha!"),
        DialoguePair("Aquele restaurante novo está na lista?", "Já adicionei em Comidas!"),
        DialoguePair("O aniversário de vocês está marcado?", "Claro! Com lembrete e tudo!"),
        DialoguePair("Qual o plano pra próxima viagem?", "Tem bastante coisa em Lugares!"),
        DialoguePair("Tem vídeo novo pra rir juntos?", "Adicionei três hoje! Vai rir muito."),
        DialoguePair("Já escreveram alguma bobeira hoje?", "Ainda não, mas tem história pra contar!"),
        DialoguePair("Lembrou de marcar a data importante?", "Sim! Com notificação e tudo!"),
        DialoguePair("Alguém ganhou o Top 3 de hoje?", "Empate! Os dois têm bom gosto."),
        DialoguePair("Que lugar faz tempo que querem ir?", "Machu Picchu está na lista há séculos!"),
        DialoguePair("Stardew Valley ou Ak-xolotl: Together hoje?", "Precisa de uma votação rápida!"),
        DialoguePair("Quantos itens pendentes na lista?", "Bastante! Mas faz parte do charme!"),
        DialoguePair("Já mandaram um post fofo no Mural?", "Ainda não! Vai lá e surpreende!"),
        DialoguePair("Culinária nova na lista de comidas?", "Japonesa está esperando uma chance!"),
        DialoguePair("Próximo jogo de tabuleiro: qual?", "Tem ideia salva em Jogos! Olha lá."),
        DialoguePair("O mural está com saudade de vocês!", "Bora adicionar uma memória nova!"),
        DialoguePair("Já conferiram os lembretes de hoje?", "Sim! Tudo certo e no horário."),
        DialoguePair("Já giraram a Roleta hoje?", "Ainda não! Bora ver o que ela escolhe pra gente."),
        DialoguePair("Cutucada de hoje já foi enviada?", "Mandei uma fofa de manhã cedo!"),
        DialoguePair("Sabor do Dia já registrado?", "Ainda não escolhi o meu de hoje!"),
        DialoguePair("Pergunta do Dia já respondida?", "Já! Só falta você responder a sua."),
        DialoguePair("Nosso Jardim cresceu hoje?", "Subiu de nível! Olha que fofura."),
        DialoguePair("Bora jogar uma rodada de Verdade ou Desafio?", "Só se prometer não fugir da verdade!"),
        DialoguePair("O que preferimos hoje: praia ou cachoeira?", "Cachoeira, sem dúvida!"),
        DialoguePair("Cápsula do tempo já tem recado novo?", "Guardei um pra abrir só ano que vem!"),
        DialoguePair("Alguma tarefa da casa pendente?", "Só a louça, prometo que faço hoje!"),
        DialoguePair("Tem sonho novo na lista de Sonhos?", "Sim! Quero aprender a surfar com você."),
        DialoguePair("Gratidão de hoje: o que anotou?", "Sou grata por acordar do seu lado."),
        DialoguePair("Hoje é encontro de sofá ou de sair?", "Sofá, coberta e muito abraço!"),
        DialoguePair("Já ativou o compartilhamento no Mapa?", "Ativei! Tô voltando pra casa."),
        DialoguePair("Legend of Mana já rodou hoje?", "Rodou! Aquele mundo é lindo demais."),
        DialoguePair("Ak-xolotl: Together dá pra jogar hoje à noite?", "Com certeza, já separei o controle!"),
        DialoguePair("Betoneira nova apareceu na rua hoje?", "Duas! Foi um dia produtivo de Top 3."),
        DialoguePair("Frieren tem episódio novo?", "Tem! Bora maratonar juntinhos."),
        DialoguePair("Cafuné hoje tem hora marcada?", "Tem sim, reservei a noite inteira."),
        DialoguePair("Aquele pastel colorido tá na lista de Comidas?", "Tá! E já com estrelinha de favorito."),
        DialoguePair("Monsterzim de hoje já foi liberado?", "Já! Só um, prometo."),
        DialoguePair("Hoje tá querendo alguma coisa azeda?", "Sempre! Já sabe que sou fã."),
        DialoguePair("Fusca amarelo passou de novo hoje?", "Passou! Já gritei o nome dele bem alto."),
        DialoguePair("Vamos de helicóptero hoje?", "Sempre! Bora salvar o dia igual sempre."),
        DialoguePair("Aniversário de vocês já tem contagem regressiva?", "Já! Faltam poucos dias, olha lá em Datas."),
        DialoguePair("Aquele filme que salvamos, já assistiram?", "Ainda não! Bora colocar pra hoje à noite."),
        DialoguePair("Série nova pra maratonar apareceu?", "Apareceu! Já entrou na lista de Filmes/Séries."),
        DialoguePair("Vídeo curtinho engraçado de hoje já mandou?", "Mandei um que me fez chorar de rir!"),
        DialoguePair("Bobeira de hoje já foi registrada?", "Já! Foi aquela do chinelo perdido."),
        DialoguePair("Top 3 de comidas de boteco, alguém ganhou?", "Empate! Coxinha e pastel lado a lado."),
        DialoguePair("Já colocaram lugar novo na lista de viagem?", "Colocamos! Uma vila de pescadores linda."),
        DialoguePair("Tem cutucada guardada pra mandar mais tarde?", "Tenho! Vai ser surpresa."),
        DialoguePair("Jardim tá com sequência de quantos dias?", "Bateu recorde! Nem parece que é a gente."),
        DialoguePair("A Roleta já escolheu o que vamos fazer hoje?", "Escolheu! Vamos cozinhar juntos."),
        DialoguePair("O que prefere: praia ao amanhecer ou ao pôr do sol?", "Pôr do sol, sempre, do seu lado."),
        DialoguePair("Tarefa da semana já foi dividida?", "Já! Você lava, eu seco. Combinado?"),
        DialoguePair("Sonho de viajar pro Japão ainda tá na lista?", "Tá firme e forte, um dia a gente vai."),
        DialoguePair("Gratidão de hoje já escreveu a sua?", "Escrevi! Sou grata por cada dia mesinha."),
        DialoguePair("Encontro de hoje é pegadas, coração ou controle?", "Pegadas! Bora sair e tomar um ar."),
        DialoguePair("Mapa mostrando vocês dois hoje?", "Mostrando! Já tô quase chegando aí."),
        DialoguePair("Ak-xolotl: Together tem fase nova pra descobrir?", "Tem! E é linda igual você."),
        DialoguePair("Legend of Mana ainda tá lá esperando a gente?", "Tá! Mas hoje eu escolho jogar com você de verdade."),
        DialoguePair("Ragnarok hoje tem raid marcada?", "Tem! Já separei a cura pra você."),
        DialoguePair("Cafuné de fim de tarde tá reservado?", "Tá sim, com direito a soneca."),
        DialoguePair("Aquele pastel colorido virou hábito de fim de semana?", "Virou tradição sagrada!"),
        DialoguePair("Monster gelado hoje combina com o quê?", "Com um filme e muito colo."),
        DialoguePair("Hoje tá tudo azedinho por aí?", "Só o suficiente pra você provar e rir."),
        DialoguePair("Aquele Fusca amarelo ainda dá sorte?", "Sempre dá! Coisa boa vem por aí."),
        DialoguePair("Bora chamar de helicóptero de novo hoje?", "Bora! Missão: te fazer sorrir."),
        DialoguePair("Faltam quantos dias pro nosso aniversário?", "Poucos! Já tô ansiosa demais."),
        DialoguePair("Item novo entrou na lista de Sonhos hoje?", "Entrou! Quero te levar pra ver a neve."),
        DialoguePair("Cápsula do tempo já tá cheia de recados?", "Quase! Faltam só mais alguns segredinhos."),
        DialoguePair("Gratidão de hoje foi por algo simples?", "Foi! Por você me passar o café de manhã."),
        DialoguePair("Já fizeram Top 3 de músicas do nosso casamento imaginário?", "Já! E a primeira é a nossa música mesmo."),
        DialoguePair("Sabor do Dia de hoje foi doce ou salgado?", "Doce, igual esse nosso momento."),
        DialoguePair("Pergunta do Dia de hoje foi difícil?", "Nem tanto, principalmente pensando em você."),
        DialoguePair("Roleta escolheu filme de terror hoje?", "Escolheu! Vou ficar bem coladinha em você."),
        DialoguePair("Cartas de Verdade ou Desafio: quem começa?", "Eu começo! Manda a pergunta."),
        DialoguePair("O que prefere: café da manhã na cama ou no sofá?", "Na cama, sem sombra de dúvida."),
        DialoguePair("Tem lembrete novo marcado pra essa semana?", "Tem! Nosso date de sexta, não esquece."),
        DialoguePair("Data especial nova apareceu no calendário?", "Apareceu! Marcada com direito a lembrete."),
        DialoguePair("Bobeira nova pra guardar no Mural?", "Tenho uma novinha, é hilária!"),
        DialoguePair("Vídeo curtinho de hoje já foi visto duas vezes?", "Já foi três! Não canso de rir."),
        DialoguePair("Comida nova entrou pra explorar esse mês?", "Entrou! Um hambúrguer artesanal chamando."),
        DialoguePair("Lugar secreto novo apareceu na lista?", "Apareceu! Uma praia escondida, olha lá."),
        DialoguePair("Tem ideia solta pra guardar em Outros?", "Tenho! Guardei uma surpresa pra você."),
        DialoguePair("Tarefa de hoje já foi riscada da lista?", "Já! Mais uma pra história de organizados."),
        DialoguePair("Sonho de morar juntos ainda tá na lista?", "Tá! E cada dia mais perto de virar realidade."),
        DialoguePair("Gratidão de hoje foi pelo abraço de bom dia?", "Foi! O melhor jeito de começar o dia."),
        DialoguePair("Encontro de hoje vai ser em casa com jogo?", "Vai! Ak-xolotl: Together já tá esperando."),
        DialoguePair("Mapa mostrando quem chega primeiro hoje?", "Mostrando! Aposto que chego antes."),
        DialoguePair("Jardim já floresceu de vez essa semana?", "Floresceu! Cheio de coraçõezinhos."),
        DialoguePair("Cutucada surpresa de hoje já foi enviada de manhã?", "Já! Espero que tenha feito seu dia."),
        DialoguePair("Legend of Mana tem trilha sonora boa pra hoje?", "Tem! Perfeita pra tarde preguiçosa."),
        DialoguePair("Stardew Valley: já colheram algo bonito na fazenda?", "Já! Uma abóbora gigante, olha só."),
        DialoguePair("Frieren te fez chorar de novo no último episódio?", "Fez! Mas foi um choro bom, tipo os nossos."),
        DialoguePair("Aquele desafio de Verdade ou Desafio ficou pendente?", "Ficou! Prometo cumprir ainda hoje."),
        DialoguePair("O que prefere: filme novo ou clássico de sempre?", "Clássico, sempre que é com você do lado."),
        DialoguePair("Betoneira do dia já foi contada no Top 3?", "Já! Foi disputadíssimo hoje."),
        DialoguePair("Tem recadinho novo escondido no Mural?", "Tem! Vai lá que tem carinho esperando."),
        DialoguePair("Antes de dormir, já disseram 'eu te amo' hoje?", "Ainda não, mas tá dito agora: eu te amo!")
    )

    val DEFAULT_AMANDA: List<String> = listOf(
        "Bom dia, meu amor! Já pensei em você hoje 💕",
        "Mateus, não esquece que te amo, viu?",
        "Add aquele filme na lista que quero ver com você!",
        "Saudade de você... vem logo pra Mesinha!",
        "Você é meu lugar favorito, sabia?",
        "Topa um date hoje? Eu escolho o lugar!",
        "Lembra de beber água, meu cuidadoso preferido!",
        "Te amo mais que ontem e menos que amanhã.",
        "Guardei uma bobeira nossa pra te contar!",
        "Você faz meus dias bem melhores, Mateus.",
        "Qual nosso próximo lugar pra visitar juntos?",
        "Coloquei a gente no Top 3 de hoje 😄",
        "Obrigada por ser tão você comigo.",
        "Vamos maratonar algo hoje à noite?",
        "Pensa numa pessoa apaixonada... sou eu por você.",
        "Te mandei um beijo pelo mural, achou?",
        "Você é o melhor parceiro de mesinha do mundo.",
        "Bora marcar mais uma memória nossa hoje?",
        "Meu coração tem seu nome, Mateus 💌",
        "Comida nova ou nosso clássico? Você decide!",
        "Conta comigo sempre, viu, amor?",
        "Cada dia com você é meu favorito.",
        "Já tô pensando no nosso próximo abraço.",
        "Você merece o mundo, e eu vou te dar.",
        "Vem fazer nada comigo, que é tudo com você.",
        "Anota aí: encontro marcado, eu e você.",
        "Te escolho de novo, todo santo dia.",
        "Seu sorriso é meu app favorito 😊",
        "Faz um carinho virtual em mim? Te amo!",
        "Tamo juntos nessa mesinha, pra sempre."
    )

    val DEFAULT_MATEUS: List<String> = listOf(
        "Bom dia, Amanda! Você é minha alegria 💙",
        "Amanda, tô aqui torcendo por você sempre.",
        "Separei um lugar lindo pra gente visitar!",
        "Você deixa tudo mais leve, sabia?",
        "Te amo do jeitinho que você é.",
        "Bora um date? Hoje eu cuido de tudo.",
        "Lembra que você é incrível, viu?",
        "Mal posso esperar pra te ver de novo.",
        "Add um jogo pra gente jogar juntos!",
        "Você é meu sorriso favorito, Amanda.",
        "Guardei uma memória nossa no mural 💌",
        "Conta comigo pra qualquer bobeira.",
        "Meu dia melhora quando penso em você.",
        "Qual filme a gente vê hoje, princesa?",
        "Você é o meu lugar de paz.",
        "Te escolhi e escolho todo dia.",
        "Saudade já... volta logo pra Mesinha!",
        "Obrigado por existir do meu lado.",
        "Você é o melhor que me aconteceu.",
        "Coloquei a gente no Top 3 de sempre.",
        "Vem cá receber um abraço apertado.",
        "Seu nome é meu lembrete favorito 💙",
        "Topa criar mais uma memória hoje?",
        "Você merece todo o carinho do mundo.",
        "Tô planejando uma surpresa... aguarda!",
        "Com você até o nada vira aventura.",
        "Te amo mais a cada mesinha nossa.",
        "Você é forte, linda e minha inspiração.",
        "Manda um oi que meu dia já ganha cor.",
        "Pra sempre eu e você, combinado?"
    )

    /**
     * Índice determinístico que muda 1x por dia para um pool de tamanho [size].
     * Fórmula: `(diaDoAno + ano*365) % size`.
     */
    fun dailyIndex(size: Int): Int {
        if (size <= 0) return 0
        // Dias desde 1970. A conta antiga (dia-do-ano + ano*365) dava o MESMO
        // número no 31/12 de um ano bissexto e no 1º de janeiro seguinte — a
        // frase do dia ficava repetida bem na virada do ano.
        val n = LocalDate.now().toEpochDay()
        return Math.floorMod(n, size.toLong()).toInt()
    }
}
