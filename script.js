package com.game.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Configuration;
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
   HANDLER WEBSOCKET (Roteador de Conexões)
   ========================================================================== */
@Component
class GameWebSocketHandler extends TextWebSocketHandler {

    private final Map<String, GameRoom> rooms = new ConcurrentHashMap<>();
    private final ObjectMapper mapper = new ObjectMapper();

    @Override
    protected void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        Map<String, Object> payload = mapper.readValue(message.getPayload(), Map.class);
        String action = (String) payload.get("action");

        if ("JOIN".equals(action)) {
            String mode = (String) payload.get("mode");
            String roomId = "SOLO".equals(mode) ? session.getId() : "GLOBAL_MULTIPLAYER";

            GameRoom room = rooms.computeIfAbsent(roomId, id -> new GameRoom(id, mode));
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
            GameRoom room = rooms.get(roomId);
            room.removePlayer(session.getId());
            if (room.isEmpty() && !"GLOBAL_MULTIPLAYER".equals(roomId)) {
                room.stop();
                rooms.remove(roomId);
            }
        }
    }
}

/* ==========================================================================
   SALA DE JOGO E IA PROCEDURAL (ENGINE JAVA AUTHORITATIVE)
   ========================================================================== */
class GameRoom {
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

    public GameRoom(String roomId, String mode) {
        this.roomId = roomId;
        this.mode = mode;
        this.worldConfig = generateProceduralWorld(mode);
        generateObstacles(((Number) worldConfig.get("structureDensity")).intValue());
        startGameLoop();
    }

    private Map<String, Object> generateProceduralWorld(String mode) {
        Map<String, Object> config = new HashMap<>();
        List<String> logs = new ArrayList<>();

        String perspective = random.nextBoolean() ? "TOP_DOWN" : "PLATFORMER_2D";
        logs.add("Perspectiva Definida: [" + perspective + "]");

        String[][] biomes = {
            {"Ciberespaço Neón", "#050510", "#00f3ff", "#ff0055", "#1a1a3a"},
            {"Floresta Sombria", "#0b140d", "#2ecc71", "#e74c3c", "#1b2a1e"},
            {"Deserto Industrial", "#18120c", "#f39c12", "#d35400", "#2c2219"},
            {"Vazio Vulcânico", "#140808", "#e74c3c", "#9b59b6", "#281111"}
        };
        String[] b = biomes[random.nextInt(biomes.length)];
        Map<String, String> biomeMap = new HashMap<>();
        biomeMap.put("name", b[0]); biomeMap.put("bg", b[1]); 
        biomeMap.put("primary", b[2]); biomeMap.put("secondary", b[3]); biomeMap.put("obstacle", b[4]);
        logs.add("Bioma Gerado: " + b[0]);

        config.put("perspective", perspective);
        config.put("biome", biomeMap);
        config.put("structureDensity", random.nextInt(12) + 10);
        config.put("logs", logs);
        return config;
    }

    private void generateObstacles(int count) {
        for (int i = 0; i < count; i++) {
            Map<String, Object> obs = new HashMap<>();
            obs.put("x", random.nextDouble() * 2000 + 200);
            obs.put("y", random.nextDouble() * 1400 + 200);
            obs.put("w", random.nextDouble() * 120 + 40);
            obs.put("h", random.nextDouble() * 120 + 40);
            obstacles.add(obs);
        }
    }

    public void addPlayer(WebSocketSession session) {
        sessions.put(session.getId(), session);
        Map<String, Object> p = new HashMap<>();
        p.put("id", session.getId());
        p.put("x", 1200.0);
        p.put("y", 900.0);
        p.put("hp", 100);
        p.put("kills", 0);
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
        double speed = 6.0;

        if (Boolean.TRUE.equals(input.get("w"))) y -= speed;
        if (Boolean.TRUE.equals(input.get("s"))) y += speed;
        if (Boolean.TRUE.equals(input.get("a"))) x -= speed;
        if (Boolean.TRUE.equals(input.get("d"))) dX(input, x, speed);

        p.put("x", Math.max(30, Math.min(2370, x)));
        p.put("y", Math.max(30, Math.min(1770, y)));

        if (Boolean.TRUE.equals(input.get("shoot"))) {
            long now = System.currentTimeMillis();
            long lastShoot = ((Number) p.getOrDefault("lastShoot", 0L)).longValue();
            if (now - lastShoot > 180) {
                p.put("lastShoot", now);
                double angle = ((Number) input.get("angle")).doubleValue();
                Map<String, Object> b = new HashMap<>();
                b.put("x", x);
                b.put("y", y);
                b.put("vx", Math.cos(angle) * 15);
                b.put("vy", Math.sin(angle) * 15);
                b.put("ownerId", playerId);
                b.put("life", 70);
                bullets.add(b);
            }
        }
    }

    private void dX(Map<String, Object> input, double x, double speed) {
        if (Boolean.TRUE.equals(input.get("d"))) x += speed;
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
        // Spawn de Inimigos
        if (enemies.size() < 15 && random.nextDouble() < 0.04) {
            Map<String, Object> e = new HashMap<>();
            e.put("id", UUID.randomUUID().toString());
            e.put("x", random.nextDouble() * 2400);
            e.put("y", random.nextDouble() * 1800);
            e.put("hp", 40);
            e.put("speed", 2.8 + random.nextDouble());
            enemies.add(e);
        }

        // IA dos Inimigos (Perseguição ao Jogador mais próximo)
        for (Map<String, Object> e : enemies) {
            double ex = ((Number) e.get("x")).doubleValue();
            double ey = ((Number) e.get("y")).doubleValue();

            Map<String, Object> target = null;
            double minDist = Double.MAX_VALUE;
            for (Map<String, Object> p : players.values()) {
                double dist = Math.hypot(((Number) p.get("x")).doubleValue() - ex, ((Number) p.get("y")).doubleValue() - ey);
                if (dist < minDist) {
                    minDist = dist;
                    target = p;
                }
            }

            if (target != null) {
                double angle = Math.atan2(((Number) target.get("y")).doubleValue() - ey, ((Number) target.get("x")).doubleValue() - ex);
                double spd = ((Number) e.get("speed")).doubleValue();
                e.put("x", ex + Math.cos(angle) * spd);
                e.put("y", ey + Math.sin(angle) * spd);
            }
        }

        // Projéteis
        for (Map<String, Object> b : bullets) {
            double bx = ((Number) b.get("x")).doubleValue() + ((Number) b.get("vx")).doubleValue();
            double by = ((Number) b.get("y")).doubleValue() + ((Number) b.get("vy")).doubleValue();
            int life = ((Number) b.get("life")).intValue() - 1;

            b.put("x", bx); b.put("y", by); b.put("life", life);

            for (Map<String, Object> e : enemies) {
                if (Math.hypot(bx - ((Number) e.get("x")).doubleValue(), by - ((Number) e.get("y")).doubleValue()) < 22) {
                    int hp = ((Number) e.get("hp")).intValue() - 20;
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
