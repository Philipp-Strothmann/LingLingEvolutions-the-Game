import { Player } from './player.js';
import { Monster } from './monster.js';
import { ApocalypseMap } from './map.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const upgradeScreen = document.getElementById('upgrade-screen');
const statsScreen = document.getElementById('stats-screen');
const gameOverScreen = document.getElementById('game-over-screen');
let isPaused = false;

let currentWave = 1;
let monstersToSpawn = 100;
let monstersSpawned = 0;
let waveStartTime = 0;
let spawnInterval = 400; 
let lastSpawnTime = 0;
let potions = [];

function resizeCanvas() {
    if (!canvas) return;
    canvas.width = window.innerWidth || 1920;
    canvas.height = window.innerHeight || 1080;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

const map = new ApocalypseMap(canvas.width, canvas.height);
const player = new Player(canvas.width / 2, canvas.height / 2);

// --- SELF-HEALING ARCHITECTURE (Fallback-Routen) ---
// Falls in der player.js Methoden oder Variablen fehlen, werden sie hier dynamisch gepatched.
if (typeof player.takeDamage !== 'function') {
    player.takeDamage = function(amount) {
        const mitigation = (this.shield || 0) / 100;
        const reducedDamage = amount * (1 - mitigation);
        this.health -= reducedDamage;
        if (this.health < 0) this.health = 0;
        if (this.shield > 0) {
            this.shield = Math.max(0, this.shield - 10);
        }
    };
}
if (typeof player.resetHealth !== 'function') {
    player.resetHealth = function() {
        this.health = this.maxHealth || 100;
    };
}
if (player.health === undefined) {
    player.health = 100;
    player.maxHealth = 100;
}
if (player.shield === undefined) {
    player.shield = 0;
}
if (player.pendingUpgrades === undefined) {
    player.pendingUpgrades = 0;
}
// ---------------------------------------------------

let monsters = []; 

const keys = {};
window.addEventListener('keydown', (e) => {
    keys[e.key.toLowerCase()] = true;
    if ((e.key === ' ' || e.code === 'Space') && !isPaused) {
        const currentTime = performance.now();
        const belt = player.weapons.find(w => w.name === 'Gürtel');
        if (belt && belt.canAttack(currentTime)) {
            belt.attack(player, monsters, currentTime);
        }
    }
});
window.addEventListener('keyup', (e) => keys[e.key.toLowerCase()] = false);

// Sicheres Schreiben in die Konsole
function logToConsole(message, type = 'system-msg') {
    const consoleContainer = document.getElementById('dark-console');
    if (!consoleContainer) return; 
    
    const newLine = document.createElement('div');
    newLine.className = `console-line ${type}`;
    newLine.innerText = `> ${message}`;
    
    consoleContainer.insertBefore(newLine, consoleContainer.firstChild);

    while (consoleContainer.childNodes.length > 6) {
        consoleContainer.removeChild(consoleContainer.lastChild);
    }
}

// Sicheres Klicken mit direktem Logging in die In-Game-Konsole
const bindClick = (id, fn) => {
    const el = document.getElementById(id);
    if (el) {
        el.addEventListener('click', (e) => {
            logToConsole(`Signal [${id}] verarbeitet.`, "system-msg");
            try {
                fn(e);
            } catch (err) {
                console.error(`Fehler in #${id}:`, err);
                logToConsole(`CRASH: ${err.message}`, "crit-msg");
            }
        });
    }
};

bindClick('btn-dmg', () => applyUpgrade('dmg'));
bindClick('btn-speed', () => applyUpgrade('speed'));
bindClick('btn-mspeed', () => applyUpgrade('mspeed'));
bindClick('btn-next-wave', startNextWave);
bindClick('btn-restart', restartGame);

function startWave() {
    monsters = [];
    potions = [];
    monstersSpawned = 0; 
    player.monstersKilledThisWave = 0;
    
    player.resetHealth();
    updateHealthUI();
    
    waveStartTime = performance.now();
    lastSpawnTime = performance.now(); // Verhindert Zeit-Anomalien beim Spawnen
    
    if (statsScreen) statsScreen.classList.add('hidden');
    if (upgradeScreen) upgradeScreen.classList.add('hidden');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    
    logToConsole(`Welle ${currentWave} gestartet! Eliminierung läuft...`, "wave-msg");
    
    isPaused = false;
}

function updateHealthUI() {
    const healthBar = document.getElementById('health-bar');
    const healthText = document.getElementById('health-text');
    if (!healthBar || !healthText) return;

    const percent = player.health + '%';
    healthBar.style.width = percent;
    healthText.innerText = percent;

    if (player.health < 30) {
        healthBar.style.background = 'linear-gradient(90deg, #ff3333, #aa0000)';
    } else {
        healthBar.style.background = 'linear-gradient(90deg, #00ffcc, #00aa88)';
    }
}


function triggerGameOver() {
    isPaused = true;
    const lblFinal = document.getElementById('final-wave');
    if (lblFinal) lblFinal.innerText = currentWave;
    if (gameOverScreen) gameOverScreen.classList.remove('hidden');
}

function restartGame() {
    currentWave = 1;
    monstersToSpawn = 100;
    player.monstersKilledTotal = 0;
    if (player.weapons && player.weapons[0]) {
        player.weapons[0].level = 1;
        player.weapons[0].damage = 20;
        player.weapons[0].cooldown = 400;
    }
    player.speed = 4;
    player.shield = 0;
    potions = [];
    startWave();
}

function startNextWave() {
    currentWave++;
    monstersToSpawn = Math.round(monstersToSpawn * 1.25);
    startWave();
}

function onMonsterDefeated(index) {
    const defeatedMonster = monsters[index];
    
    // Mit einer Wahrscheinlichkeit von 1:100 einen blauen Trank fallen lassen
    if (defeatedMonster && Math.random() < 0.01) {
        potions.push({
            x: defeatedMonster.x,
            y: defeatedMonster.y,
            radius: 12
        });
        logToConsole("Ein blauer Trank wurde fallen gelassen!", "upgrade-msg");
    }

    monsters.splice(index, 1);
    player.monstersKilledTotal++;
    player.monstersKilledThisWave++;

    if (Math.random() < 0.02) {
        player.pendingUpgrades += 1;
        logToConsole("Goblin besiegt! Bonus-Evolution freigeschaltet!", "upgrade-msg");
    }
    if (Math.random() < 0.001) {
        player.pendingUpgrades += 2;
        logToConsole("🍀 JACKPOT! 2x BONUS-EVOLUTION erhalten!", "upgrade-msg");
    }

    checkWaveEnd();
}

function applyUpgrade(type) {
    if (type === 'dmg') logToConsole("Upgrade erworben: Gürtelschaden +25%", "system-msg");
    if (type === 'speed') logToConsole("Upgrade erworben: Angriffsgeschwindigkeit +15%", "system-msg");
    if (type === 'mspeed') logToConsole("Upgrade erworben: Lauftempo +10%", "system-msg");
    
    const belt = player.weapons ? player.weapons.find(w => w.name === 'Gürtel') : null;
    if (type === 'dmg' && belt) {
        belt.damage = Math.round(belt.damage * 1.25);
        belt.level++;
    } else if (type === 'speed' && belt) {
        belt.cooldown = Math.round(belt.cooldown * 0.85);
    } else if (type === 'mspeed') {
        player.speed += 0.4;
    }

    player.pendingUpgrades--;
    
    if (player.pendingUpgrades <= 0) {
        if (upgradeScreen) upgradeScreen.classList.add('hidden');
        isPaused = false; 
    }
}

// Funktion zum Zeichnen eines wunderschönen blauen Zaubertranks
function drawPotion(ctx, potion) {
    ctx.save();
    ctx.translate(potion.x, potion.y);

    // 1. Flaschenhals (Glas)
    ctx.strokeStyle = '#cccccc';
    ctx.lineWidth = 1.5;
    ctx.fillStyle = '#3399ff'; // Blaue Flüssigkeit im Hals
    ctx.beginPath();
    ctx.rect(-3, -11, 6, 7);
    ctx.stroke();
    ctx.fill();
    ctx.closePath();

    // 2. Korken
    ctx.fillStyle = '#8b5a2b'; // Holzbraun
    ctx.beginPath();
    ctx.rect(-4, -14, 8, 3);
    ctx.fill();
    ctx.closePath();

    // 3. Runder Flaschenkörper (Glaskolben)
    ctx.beginPath();
    ctx.arc(0, 1, potion.radius - 2, 0, Math.PI * 2);
    ctx.fillStyle = '#0055ff'; // Kräftiges Blau
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00bbff';
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
    ctx.shadowBlur = 0; // Schatten zurücksetzen

    // 4. Lichtreflex auf dem Glas (für 3D-Look)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.beginPath();
    ctx.arc(-3, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.closePath();

    ctx.restore();
}

// PERMANENTER GAME LOOP
function gameLoop() {
    requestAnimationFrame(gameLoop);

    if (isPaused) return;

    const currentTime = performance.now();

    // Verhindert Hänger, falls offene Upgrades zur Verfügung stehen
    if (player && player.pendingUpgrades > 0) {
        isPaused = true;
        if (upgradeScreen) upgradeScreen.classList.remove('hidden');
        return;
    }

    // Spawning-Logik
    if (monstersSpawned < monstersToSpawn && currentTime - lastSpawnTime > spawnInterval) {
        monsters.push(new Monster(canvas.width, canvas.height, player.x, player.y, currentWave));
        monstersSpawned++;
        lastSpawnTime = currentTime;
    }

    // Zeichnen & Physik
    if (map && player) {
        map.draw(ctx, player);

        // Tränke verarbeiten (zeichnen & Einsammeln prüfen)
        for (let i = potions.length - 1; i >= 0; i--) {
            const potion = potions[i];
            drawPotion(ctx, potion);

            // Kollision mit Spieler prüfen
            const dist = Math.hypot(player.x - potion.x, player.y - potion.y);
            if (dist <= player.radius + potion.radius) {
                player.shield = Math.min(100, (player.shield || 0) + 10);
                logToConsole("Blauer Trank eingesammelt! Schild +10% Schadensminimierung.", "upgrade-msg");
                potions.splice(i, 1);
            }
        }

        player.update(keys, map);
        player.draw(ctx);
    }

    // Monster-Verarbeitung
    for (let i = monsters.length - 1; i >= 0; i--) {
        const monster = monsters[i];
        monster.update(player.x, player.y);
        monster.draw(ctx);

        if (monster.canAttackPlayer(player, currentTime)) {
            const attackResult = monster.attack(currentTime);
            player.takeDamage(attackResult.damage);
            updateHealthUI();

            if (attackResult.isCrit) {
                logToConsole("KRITISCHER TREFFER von Goblin! -40% HP erhalten!", "crit-msg");   
            }

            if (player.health <= 0) {
                triggerGameOver();
                return;
            }
        }

        if (monster.hp <= 0) {
            onMonsterDefeated(i);
        }
    }

    // Statusanzeige aktualisieren
    const progressPercent = Math.min(100, Math.round((player.monstersKilledThisWave / monstersToSpawn) * 100));
    const elXp = document.getElementById('player-xp');
    const elLevel = document.getElementById('player-level');
    
    if (elXp) elXp.innerText = `${progressPercent}%`;
    if (elLevel && player && player.weapons && player.weapons[0]) {
        elLevel.innerText = player.weapons[0].level;
    }
}

window.debugForceNextWave = startNextWave;

// Überprüft kontinuierlich (oder bei jedem Kill), ob die Welle vorbei ist
function checkWaveEnd() {
    // Wenn alle gespawnt sind und keine Monster mehr leben
    if (monstersSpawned >= monstersToSpawn && monsters.length === 0) {
        if (!isPaused) {
            isPaused = true;
            
            // UI einblenden (Blackhole Routing fixen)
            const upgradeScreen = document.getElementById('upgrade-screen');
            if (upgradeScreen) {
                upgradeScreen.classList.remove('hidden');
            }
        }
    }
}

// Binde die Buttons aus dem HTML an den Start der nächsten Welle
function setupUpgradeButtons() {
    const btnDmg = document.getElementById('btn-dmg');
    const btnSpeed = document.getElementById('btn-speed');
    const btnMspeed = document.getElementById('btn-mspeed');

    const startNextWave = () => {
        // UI wieder verstecken
        document.getElementById('upgrade-screen').classList.add('hidden');
        
        // Werte für Welle 2 resetten
        currentWave++;
        monstersSpawned = 0;
        monstersToSpawn = Math.floor(monstersToSpawn * 1.5); // 50% mehr Monster
        player.monstersKilledThisWave = 0;
        
        // Spiel weiterlaufen lassen
        isPaused = false;
    };

    // Event Listener anhängen, falls die Buttons existieren
    if (btnDmg) btnDmg.addEventListener('click', startNextWave);
    if (btnSpeed) btnSpeed.addEventListener('click', startNextWave);
    if (btnMspeed) btnMspeed.addEventListener('click', startNextWave);
}

// Wartet, bis alle HTML-Elemente vollständig geladen und geroutet sind
window.addEventListener('DOMContentLoaded', () => {
    // Canvas-Größe initial bestimmen
    resizeCanvas();
    
    // Upgrade-Buttons registrieren
    setupUpgradeButtons();

    // Erste Welle und Game Loop starten
    startWave();
    gameLoop();
});

// Debug-Schnittstelle global bereitstellen
window.debugForceNextWave = startNextWave;