package com.hub;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@SpringBootApplication
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class HubApplication {

    // --- ESTADO GERAL DO USUÁRIO ---
    private String nome = "Davi";
    private int nivel = 1;
    private int xp = 0;
    private List> historico = new ArrayList<>();
    private Set<String> conquistas = new HashSet<>();

    public static void main(String[] args) {
        SpringApplication.run(HubApplication.class, args);
    }

    // --- PERFIL E PROGRESSO ---
    @GetMapping("/perfil")
    public Map<String, Object> getPerfil() {
        Map<String, Object> res = new HashMap<>();
        res.put("nome", nome);
        res.put("nivel", nivel);
        res.put("xp", xp);
        res.put("historico", historico);
        res.put("conquistas", conquistas);
        return res;
    }

    @PostMapping("/perfil/add-xp")
    public Map<String, Object> adicionarXP(@RequestParam int pontos, @RequestParam String jogo) {
        this.xp += pontos;
        this.nivel = (this.xp / 100) + 1;

        Map<String, Object> reg = new HashMap<>();
        reg.put("jogo", jogo);
        reg.put("pontos", pontos);
        reg.put("data", new Date().toString());
        historico.add(0, reg);

        // Verificação de Conquistas
        if (historico.size() >= 1) conquistas.add("Primeiro Jogo");
        if (historico.size() >= 10) conquistas.add("Dez Partidas Completadas");
        if (this.nivel >= 5) conquistas.add("Mestre dos Desafios");

        return getPerfil();
    }

    // --- ENDPOINTS DOS JOGOS ---

    // 1. Jokenpô
    @PostMapping("/jogos/jokenpo")
    public Map<String, Object> jogarJokenpo(@RequestParam String escolha) {
        String[] opts = {"Pedra", "Papel", "Tesoura"};
        String bot = opts[new Random().nextInt(3)];
        String res;
        int xpGanha;

        if (escolha.equalsIgnoreCase(bot)) {
            res = "Empate!";
            xpGanha = 10;
        } else if ((escolha.equalsIgnoreCase("Pedra") && bot.equals("Tesoura")) ||
                   (escolha.equalsIgnoreCase("Papel") && bot.equals("Pedra")) ||
                   (escolha.equalsIgnoreCase("Tesoura") && bot.equals("Papel"))) {
            res = "Você Venceu!";
            xpGanha = 35;
            conquistas.add("Primeira Vitória");
        } else {
            res = "O Bot Venceu!";
            xpGanha = 5;
        }

        adicionarXP(xpGanha, "Pedra, Papel e Tesoura");

        Map<String, Object> response = new HashMap<>();
        response.put("jogador", escolha);
        response.put("bot", bot);
        response.put("resultado", res);
        response.put("xpGanha", xpGanha);
        return response;
    }

    // 2. Desafio de Matemática
    @GetMapping("/jogos/math/gerar")
    public Map<String, Integer> gerarMath() {
        Random r = new Random();
        int a = r.nextInt(25) + 1;
        int b = r.nextInt(25) + 1;
        Map<String, Integer> math = new HashMap<>();
        math.put("num1", a);
        math.put("num2", b);
        math.put("resposta", a + b);
        return math;
    }

    // 3. Adivinhe o Número
    @GetMapping("/jogos/guess/gerar")
    public Map<String, Integer> gerarNumero() {
        Map<String, Integer> guess = new HashMap<>();
        guess.put("target", new Random().nextInt(100) + 1);
        return guess;
    }
}
