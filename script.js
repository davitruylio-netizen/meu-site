package com.game.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.config.annotation.*;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.*;

@SpringBootApplication
@EnableWebSocket
public class GameServer implements WebSocketConfigurer {

    public static void main(String[] args) {
        SpringApplication.run(GameServer.class, args);
    }

    private final GameWebSocketHandler webSocketHandler;

    public GameServer(GameWebSocketHandler webSocketHandler) {
        this.webSocketHandler = webSocketHandler;
    }

    @Override
    public void registerWebSocketHandlers(WebSocketHandlerRegistry registry) {
        registry.addHandler(webSocketHandler, "/ws/game").setAllowedOrigins("*");
    }
}

/* ==========================================================================
   ROTEADOR DE CONEXÕES WEBSOCKET
   ========================================================================== */
@Component
class GameWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, GameRoom3D> rooms = new ConcurrentHashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Map<String, Object> payload = mapper.readValue(message.getPayload(), Map.class);
        String action = (String) payload.get("action");

        if ("JOIN".equals(action)) {
            String mode = (String) payload.get("mode");
            String roomId = "SOLO".equals(mode) ? session.getId() : "GLOBAL_3D_MULTIPLAYER";

            GameRoom3D room = rooms.computeIfAbsent(roomId, id -> new GameRoom3D(id, mode));
            room.addPlayer(session);
            session.getAttributes().put("roomId", roomId);
        } else if ("INPUT".equals(action)) {
            String roomId = (String) session.getAttributes().get("roomId");
            if (roomId != null && rooms.containsKey(roomId)) {
                Map<String, Object> input = (Map<String, Object>) payload.get("input");
                rooms.get(roomId).handleInput(session.getId(), input);
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        String roomId = (String) session.getAttributes().get("roomId");
        if (roomId != null && rooms.containsKey(roomId)) {
            GameRoom3D room = rooms.get(roomId);
            room.removePlayer(session.getId());
            if (room.isEmpty() && !"GLOBAL_3D_MULTIPLAYER".equals(roomId)) {
                room.stop();
                rooms.remove(roomId);
            }
        }
    }
}

/* ==========================================================================
   MOTOR DE JOGO 3D E IA PROCEDURAL (SPRING / JAVA AUTHORITATIVE)
   ========================================================================== */
class GameRoom3D {
    private final String roomId;
    private final String mode;
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final Map<String, Map<String, Object>> players = new ConcurrentHashMap<>();
    private final List> enemies = new CopyOnWriteArrayList<>();
    private final List> bullets = new CopyOnWriteArrayList<>();
    private final List> obstacles = new ArrayList<>();
    private Map<String, Object> worldConfig;
    private final ScheduledExecutorService gameLoopExecutor = Executors.newSingleThreadScheduledExecutor();
    private final ObjectMapper mapper = new ObjectMapper();
    private final Random random = new Random();

    // Constantes do Mundo 3D
    private static final double GRAVITY = -0.4;
    private static final double GROUND_Y = 1.5; // Altura padrão do chão para jogadores (eixo Y)

    public GameRoom3D(String roomId, String mode) {
        this.roomId = roomId;
        this.mode = mode;
        this.worldConfig = generateProcedural3DWorld(mode);
        generate3DObstacles(((Number) worldConfig.get("structureDensity")).intValue());
        startGameLoop();
    }

    private Map<String, Object> generateProcedural3DWorld(String mode) {
        Map<String, Object> config = new HashMap<>();
        List<String> logs = new ArrayList<>();

        String cameraMode = random.nextBoolean() ? "ISOMETRIC_3D" : "THIRD_PERSON_3D";
        logs.add("Câmera 3D Sintetizada: [" + cameraMode + "]");

        String[][] biomes = {
            {"Estação Neon Cyberpunk", "#050510", "#00f3ff", "#ff0055", "#1a1a3a"},
            {"Ruínas Vulcânicas", "#140808", "#ff4500", "#9b59b6", "#281111"},
            {"Platô Florestal 3D", "#0b140d", "#2ecc71", "#e74c3c", "#1b2a1e"}
        };
        String[] b = biomes[random.nextInt(biomes.length)];
        Map<String, String> biomeMap = new HashMap<>();
        biomeMap.put("name", b[0]); biomeMap.put("bg", b[1]);
        biomeMap.put("primary", b[2]); biomeMap.put("secondary", b[3]); biomeMap.put("obstacle", b[4]);
        logs.add("Bioma 3D Gerado: " + b[0]);

        config.put("cameraMode", cameraMode);
        config.put("biome", biomeMap);
        config.put("structureDensity", random.nextInt(10) + 8);
        config.put("logs", logs);
        return config;
    }

    private void generate3DObstacles(int count) {
        for (int i = 0; i < count; i++) {
            Map<String, Object> obs = new HashMap<>();
            obs.put("x", random.nextDouble() * 2000 + 200);
            obs.put("z", random.nextDouble() * 1400 + 200);
            obs.put("y", 3.0); // Altura central do bloco 3D
            obs.put("w", random.nextDouble() * 100 + 40);
            obs.put("h", random.nextDouble() * 100 + 40);
            obs.put("height", random.nextDouble() * 40 + 20); // Extrusão em Y
            obstacles.add(obs);
        }
    }

    public void addPlayer(WebSocketSession session) {
        sessions.put(session.getId(), session);
        Map<String, Object> p = new HashMap<>();
        p.put("id", session.getId());
        p.put("x", 1200.0);
        p.put("y", GROUND_Y); // Eixo Y 3D (Altura)
        p.put("z", 900.0);  // Eixo Z 3D (Profundidade)
        p.put("vy", 0.0);   // Velocidade vertical (Pulo/Queda)
        p.put("hp", 100);
        p.put("kills", 0);
        p.put("isGrounded", true);
        players.put(session.getId(), p);

        try {
            Map<String, Object> initMsg = new HashMap<>();
            initMsg.put("type", "INIT");
            initMsg.put("config", worldConfig);
            initMsg.put("obstacles", obstacles);
            initMsg.put("playerId", session.getId());
            session.sendMessage(new TextMessage(mapper.writeValueAsString(initMsg)));
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public void removePlayer(String sessionId) {
        sessions.remove(sessionId);
        players.remove(sessionId);
    }

    public boolean isEmpty() { return sessions.isEmpty(); }

    public void stop() { gameLoopExecutor.shutdown(); }

    public void handleInput(String playerId, Map<String, Object> input) {
        Map<String, Object> p = players.get(playerId);
        if (p == null) return;

        double x = ((Number) p.get("x")).doubleValue();
        double y = ((Number) p.get("y")).doubleValue();
        double z = ((Number) p.get("z")).doubleValue();
        double vy = ((Number) p.get("vy")).doubleValue();
        boolean isGrounded = (Boolean) p.getOrDefault("isGrounded", true);
        double speed = 6.0;

        // Movimentação X/Z (Plano Horizontal)
        if (Boolean.TRUE.equals(input.get("w"))) z -= speed;
        if (Boolean.TRUE.equals(input.get("s"))) z += speed;
        if (Boolean.TRUE.equals(input.get("a"))) x -= speed;
        if (Boolean.TRUE.equals(input.get("d"))) x += speed;

        // Pulo (Eixo Y 3D)
        if (Boolean.TRUE.equals(input.get("space")) && isGrounded) {
            vy = 8.5;
            isGrounded = false;
        }

        // Aplicação de Gravidade no Eixo Y
        vy += GRAVITY;
        y += vy;

        // Colisão com o chão
        if (y <= GROUND_Y) {
            y = GROUND_Y;
            vy = 0.0;
            isGrounded = true;
        }

        p.put("x", Math.max(30, Math.min(2370, x)));
        p.put("y", y);
        p.put("z", Math.max(30, Math.min(1770, z)));
        p.put("vy", vy);
        p.put("isGrounded", isGrounded);

        // Sistema de Disparo Projétil 3D
        if (Boolean.TRUE.equals(input.get("shoot"))) {
            long now = System.currentTimeMillis();
            long lastShoot = ((Number) p.getOrDefault("lastShoot", 0L)).longValue();
            if (now - lastShoot > 160) {
                p.put("lastShoot", now);
                double angle = ((Number) input.get("angle")).doubleValue();
                
                Map<String, Object> b = new HashMap<>();
                b.put("x", x);
                b.put("y", y + 1.0); // Sai na altura da arma
                b.put("z", z);
                b.put("vx", Math.cos(angle) * 16.0);
                b.put("vy", 0.0);
                b.put("vz", Math.sin(angle) * 16.0);
                b.put("ownerId", playerId);
                b.put("life", 80);
                bullets.add(b);
            }
        }
    }

    private void startGameLoop() {
        gameLoopExecutor.scheduleAtFixedRate(() -> {
            try {
                updateState();
                broadcastState();
            } catch (Exception e) {
                e.printStackTrace();
            }
        }, 0, 33, TimeUnit.MILLISECONDS);
    }

    private void updateState() {
        // Spawn de Inimigos 3D
        if (enemies.size() < 14 && random.nextDouble() < 0.04) {
            Map<String, Object> e = new HashMap<>();
            e.put("id", UUID.randomUUID().toString());
            e.put("x", random.nextDouble() * 2400);
            e.put("y", GROUND_Y);
            e.put("z", random.nextDouble() * 1800);
            e.put("hp", 50);
            e.put("speed", 3.0 + random.nextDouble());
            enemies.add(e);
        }

        // IA dos Inimigos 3D (Navegação tridimensional)
        for (Map<String, Object> e : enemies) {
            double ex = ((Number) e.get("x")).doubleValue();
            double ey = ((Number) e.get("y")).doubleValue();
            double ez = ((Number) e.get("z")).doubleValue();

            Map<String, Object> target = null;
            double minDist = Double.MAX_VALUE;
            for (Map<String, Object> p : players.values()) {
                double dist = Math.hypot(((Number) p.get("x")).doubleValue() - ex, ((Number) p.get("z")).doubleValue() - ez);
                if (dist < minDist) {
                    minDist = dist;
                    target = p;
                }
            }

            if (target != null) {
                double tx = ((Number) target.get("x")).doubleValue();
                double tz = ((Number) target.get("z")).doubleValue();
                double angle = Math.atan2(tz - ez, tx - ex);
                double spd = ((Number) e.get("speed")).doubleValue();

                e.put("x", ex + Math.cos(angle) * spd);
                e.put("z", ez + Math.sin(angle) * spd);
            }
        }

        // Atualização de Projéteis 3D com Raycasting Esférico
        for (Map<String, Object> b : bullets) {
            double bx = ((Number) b.get("x")).doubleValue() + ((Number) b.get("vx")).doubleValue();
            double by = ((Number) b.get("y")).doubleValue() + ((Number) b.get("vy")).doubleValue();
            double bz = ((Number) b.get("z")).doubleValue() + ((Number) b.get("vz")).doubleValue();
            int life = ((Number) b.get("life")).intValue() - 1;

            b.put("x", bx); b.put("y", by); b.put("z", bz); b.put("life", life);

            // Colisão Tridimensional com Inimigos
            for (Map<String, Object> e : enemies) {
                double ex = ((Number) e.get("x")).doubleValue();
                double ey = ((Number) e.get("y")).doubleValue();
                double ez = ((Number) e.get("z")).doubleValue();

                double dist3D = Math.sqrt(Math.pow(bx - ex, 2) + Math.pow(by - ey, 2) + Math.pow(bz - ez, 2));

                if (dist3D < 25.0) {
                    int hp = ((Number) e.get("hp")).intValue() - 25;
                    e.put("hp", hp);
                    b.put("life", 0);
                    if (hp <= 0) {
                        enemies.remove(e);
                        Map<String, Object> owner = players.get((String) b.get("ownerId"));
                        if (owner != null) owner.put("kills", ((Number) owner.get("kills")).intValue() + 1);
                    }
                    break;
                }
            }
        }
        bullets.removeIf(b -> ((Number) b.get("life")).intValue() <= 0);
    }

    private void broadcastState() throws IOException {
        Map<String, Object> state = new HashMap<>();
        state.put("type", "UPDATE");
        state.put("players", players.values());
        state.put("enemies", enemies);
        state.put("bullets", bullets);

        String json = mapper.writeValueAsString(state);
        for (WebSocketSession session : sessions.values()) {
            if (session.isOpen()) session.sendMessage(new TextMessage(json));
        }
    }
}
