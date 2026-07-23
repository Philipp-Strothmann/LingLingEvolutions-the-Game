import { Player } from './player.js';
import { Monster } from './monster.js';
import { ApocalypseMap } from './map.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const upgradeScreen = document.getElementById('upgrade-screen');
const statsScreen = document.getElementById('stats-screen');
const gameOverScreen = document.getElementById('game-over-screen');
let isPaused = true; // Start paused to show the menu

let isOliverMode = false;
let playerName = '';

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
        const belt = player.weapons.find(w => w.name === 'Belt');
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
            logToConsole(`Signal [${id}] processed.`, "system-msg");
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
    
    logToConsole(`Wave ${currentWave} started! Elimination in progress...`, "wave-msg");
    
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
    
    // Spielername dynamisch im Game-Over-Titel setzen
    const lblTitle = document.getElementById('game-over-title');
    if (lblTitle) {
        lblTitle.innerText = `${player.name} has fallen!`;
    }
    
    if (gameOverScreen) gameOverScreen.classList.remove('hidden');
}

function resetGameState() {
    isPaused = true;
    currentWave = 1;
    monstersToSpawn = 100;
    monstersSpawned = 0;
    player.monstersKilledTotal = 0;
    player.monstersKilledThisWave = 0;
    
    if (player.weapons && player.weapons[0]) {
        player.weapons[0].level = 1;
        player.weapons[0].damage = 20;
        player.weapons[0].cooldown = 400;
    }
    
    // Reset Oliver Mode
    isOliverMode = false;
    const btnOliver = document.getElementById('btn-oliver');
    if (btnOliver) {
        btnOliver.classList.remove('highlight-btn');
        btnOliver.innerText = 'Oliver 👑';
    }
    
    // Reset Player Name Input default to "Player"
    const nameInput = document.getElementById('player-name-input');
    if (nameInput) {
        nameInput.value = 'Player';
    }
    playerName = 'Player';
    
    player.speed = 4;
    player.shield = 0;
    player.health = 100;
    player.maxHealth = 100;
    player.name = 'Player';
    player.isOliver = false;
    player.activeEffects = [];
    
    monsters = [];
    potions = [];
    
    updateHealthUI();
    
    // XP & Level UI zurücksetzen
    const elXp = document.getElementById('player-xp');
    const elLevel = document.getElementById('player-level');
    if (elXp) elXp.innerText = `0%`;
    if (elLevel) elLevel.innerText = `1`;
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
        logToConsole("A blue potion was dropped!", "upgrade-msg");
    }

    monsters.splice(index, 1);
    player.monstersKilledTotal++;
    player.monstersKilledThisWave++;

    if (Math.random() < 0.02) {
        player.pendingUpgrades += 1;
        logToConsole("Goblin defeated! Bonus evolution unlocked!", "upgrade-msg");
    }
    if (Math.random() < 0.001) {
        player.pendingUpgrades += 2;
        logToConsole("🍀 JACKPOT! Received 2x bonus evolutions!", "upgrade-msg");
    }

    checkWaveEnd();
}

function applyUpgrade(type) {
    if (type === 'dmg') logToConsole("Upgrade purchased: Belt Damage +25%", "system-msg");
    if (type === 'speed') logToConsole("Upgrade purchased: Attack Speed +15%", "system-msg");
    if (type === 'mspeed') logToConsole("Upgrade purchased: Movement Speed +10%", "system-msg");
    
    const belt = player.weapons ? player.weapons.find(w => w.name === 'Belt') : null;
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
                logToConsole("Blue potion collected! Shield +10% damage mitigation.", "upgrade-msg");
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
                logToConsole("CRITICAL HIT by goblin! -40% HP taken!", "crit-msg");   
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

function setupStartMenu() {
    const btnStart = document.getElementById('btn-start');
    const btnSettings = document.getElementById('btn-settings');
    const btnOliver = document.getElementById('btn-oliver');
    const btnHelp = document.getElementById('btn-help');
    
    const settingsOverlay = document.getElementById('settings-overlay');
    const helpOverlay = document.getElementById('help-overlay');
    const oliverOverlay = document.getElementById('oliver-overlay');
    const startMenuScreen = document.getElementById('start-menu-screen');
    
    const btnSettingsClose = document.getElementById('btn-settings-close');
    const btnHelpClose = document.getElementById('btn-help-close');
    const btnOliverClose = document.getElementById('btn-oliver-close');
    
    const btnMenu = document.getElementById('btn-menu');

    if (btnStart) {
        btnStart.addEventListener('click', () => {
            // Spielername auslesen
            const nameInput = document.getElementById('player-name-input');
            playerName = nameInput ? nameInput.value.trim() : 'Player';
            
            // Wenn Oliver-Modus aktiv ist, heisst der Spieler zwingend "Oliver"
            if (isOliverMode) {
                player.name = 'Oliver';
            } else {
                player.name = playerName || 'Player';
            }
            
            // Oliver Modus anwenden
            player.isOliver = isOliverMode;
            if (isOliverMode) {
                player.speed = 4.8; // +20% speed
                player.shield = 30; // +30% starting shield
                logToConsole("Oliver Mode ACTIVE! Crown equipped and stats boosted.", "upgrade-msg");
            } else {
                player.speed = 4;
                player.shield = 0;
            }
            
            // Schwierigkeit anwenden
            const diffSelect = document.getElementById('setting-difficulty');
            if (diffSelect) {
                const diff = diffSelect.value;
                if (diff === 'hard') {
                    monstersToSpawn = 150; // 50% mehr Monster
                    spawnInterval = 300; // schnelleres Spawnen
                } else if (diff === 'impossible') {
                    monstersToSpawn = 200; // 100% mehr Monster
                    spawnInterval = 200; // extremes Spawnen
                    player.speed = isOliverMode ? 5.5 : 4.5;
                } else {
                    monstersToSpawn = 100;
                    spawnInterval = 400;
                }
            }

            // Start screen ausblenden und Welle starten
            startMenuScreen.classList.add('hidden');
            startWave();
        });
    }

    if (btnSettings) {
        btnSettings.addEventListener('click', () => {
            settingsOverlay.classList.remove('hidden');
        });
    }
    if (btnSettingsClose) {
        btnSettingsClose.addEventListener('click', () => {
            settingsOverlay.classList.add('hidden');
        });
    }

    if (btnHelp) {
        btnHelp.addEventListener('click', () => {
            helpOverlay.classList.remove('hidden');
        });
    }
    if (btnHelpClose) {
        btnHelpClose.addEventListener('click', () => {
            helpOverlay.classList.add('hidden');
        });
    }

    if (btnOliver) {
        btnOliver.addEventListener('click', () => {
            oliverOverlay.classList.remove('hidden');
        });
    }
    if (btnOliverClose) {
        btnOliverClose.addEventListener('click', () => {
            isOliverMode = true;
            btnOliver.classList.add('highlight-btn');
            btnOliver.innerText = 'Oliver Mode: ON 👑';
            
            // Namen automatisch auf Oliver setzen
            const nameInput = document.getElementById('player-name-input');
            if (nameInput) {
                nameInput.value = 'Oliver';
            }
            
            oliverOverlay.classList.add('hidden');
            logToConsole("Oliver Mode unlocked!", "system-msg");
        });
    }

    if (btnMenu) {
        btnMenu.addEventListener('click', () => {
            // Blende Game Over Screen aus
            document.getElementById('game-over-screen').classList.add('hidden');
            
            // Blende Startmenü ein
            startMenuScreen.classList.remove('hidden');
            
            // Setze den Spielstatus zurück
            resetGameState();
        });
    }
}

// Wartet, bis alle HTML-Elemente vollständig geladen und geroutet sind
window.addEventListener('DOMContentLoaded', () => {
    // Canvas-Größe initial bestimmen
    resizeCanvas();
    
    // Upgrade-Buttons registrieren
    setupUpgradeButtons();

    // Startmenü initialisieren
    setupStartMenu();

    // Game Loop starten (läuft pausiert im Hintergrund)
    gameLoop();
});

// Debug-Schnittstelle global bereitstellen
window.debugForceNextWave = startNextWave;