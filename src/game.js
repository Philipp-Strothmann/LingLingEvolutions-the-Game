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

// 1. ZUERST den Canvas sauber auf die echten Browser-Maße zwingen
function resizeCanvas() {
    canvas.width = window.innerWidth || 1920;  // Fallback auf Full-HD, falls 0
    canvas.height = window.innerHeight || 1080;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Ausführen! Jetzt hat der Canvas garantiert valide Maße.

// 2. ERST JETZT die Map und den Spieler erstellen, damit die Zahlen stimmen!
const map = new ApocalypseMap(canvas.width, canvas.height);
const player = new Player(canvas.width / 2, canvas.height / 2);

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

// UI Event Listener
document.getElementById('btn-dmg').addEventListener('click', () => applyUpgrade('dmg'));
document.getElementById('btn-speed').addEventListener('click', () => applyUpgrade('speed'));
document.getElementById('btn-mspeed').addEventListener('click', () => applyUpgrade('mspeed'));
document.getElementById('btn-next-wave').addEventListener('click', startNextWave);
document.getElementById('btn-restart').addEventListener('click', restartGame);

function startWave() {
    monsters = [];
    monstersSpawned = 0;
    player.monstersKilledThisWave = 0;
    player.resetHealth(); // Vollständige Heilung bei neuer Welle
    updateHealthUI();
    waveStartTime = performance.now();
    isPaused = false;
    statsScreen.classList.add('hidden');
    upgradeScreen.classList.add('hidden');
    gameOverScreen.classList.add('hidden');
    gameLoop();
}

function updateHealthUI() {
    const healthBar = document.getElementById('health-bar');
    const healthText = document.getElementById('health-text');
    const percent = player.health + '%';
    
    healthBar.style.width = percent;
    healthText.innerText = percent;

    // Farbe der Lebensleiste dynamisch anpassen (Kritisch = Rot)
    if (player.health < 30) {
        healthBar.style.background = 'linear-gradient(90deg, #ff3333, #aa0000)';
    } else {
        healthBar.style.background = 'linear-gradient(90deg, #00ffcc, #00aa88)';
    }
}

function checkWaveEnd() {
    if (player.monstersKilledThisWave >= monstersToSpawn) {
        isPaused = true;
        const duration = ((performance.now() - waveStartTime) / 1000).toFixed(2);
        document.getElementById('stat-kills').innerText = player.monstersKilledThisWave;
        document.getElementById('stat-time').innerText = duration;
        statsScreen.classList.remove('hidden');
    }
}

function triggerGameOver() {
    isPaused = true;
    document.getElementById('final-wave').innerText = currentWave;
    gameOverScreen.classList.remove('hidden');
}

function restartGame() {
    currentWave = 1;
    monstersToSpawn = 100;
    player.monstersKilledTotal = 0;
    player.weapons[0].level = 1;
    player.weapons[0].damage = 20;
    player.weapons[0].cooldown = 400;
    player.speed = 4;
    startWave();
}

function startNextWave() {
    currentWave++;
    monstersToSpawn = Math.round(monstersToSpawn * 1.25);
    startWave();
}

function onMonsterDefeated(index) {
    monsters.splice(index, 1);
    player.monstersKilledTotal++;
    player.monstersKilledThisWave++;

    if (Math.random() < 0.02) {
        player.pendingUpgrades += 1;
        logLoot("Monster dropte ein Bonus-Levelup!");
    }
    if (Math.random() < 0.001) {
        player.pendingUpgrades += 2;
        logLoot("🍀 JACKPOT! 2x BONUS-LEVELUP! 🍀");
    }

    checkWaveEnd();
}

function logLoot(message) {
    const log = document.getElementById('loot-log');
    log.innerHTML = `<div>${message}</div>` + log.innerHTML;
}

function applyUpgrade(type) {
    const belt = player.weapons.find(w => w.name === 'Gürtel');
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
        upgradeScreen.classList.add('hidden');
        isPaused = false;
        gameLoop();
    }
}

// GAME LOOP
function gameLoop() {
    if (isPaused) return;

    const currentTime = performance.now();

    if (player.pendingUpgrades > 0) {
        isPaused = true;
        upgradeScreen.classList.remove('hidden');
        return;
    }

    if (monstersSpawned < monstersToSpawn && currentTime - lastSpawnTime > spawnInterval) {
        monsters.push(new Monster(canvas.width, canvas.height, player.x, player.y, currentWave));
        monstersSpawned++;
        lastSpawnTime = currentTime;
    }

    map.draw(ctx, player);

    player.update(keys, map);
    player.draw(ctx);

    // Monster Logik & Kampfsystem
    for (let i = monsters.length - 1; i >= 0; i--) {
        const monster = monsters[i];
        monster.update(player.x, player.y);
        monster.draw(ctx);

        // Angriffsprüfung: Monster schlägt Spieler
        if (monster.canAttackPlayer(player, currentTime)) {
            const attackResult = monster.attack(currentTime);
            player.takeDamage(attackResult.damage);
            updateHealthUI();

            if (attackResult.isCrit) {
                logLoot("⚠️ KRITISCHER TREFFER von Monster! -40% HP ⚠️");
            }

            if (player.health <= 0) {
                triggerGameOver();
                return; // Loop sofort beenden
            }
        }

        if (monster.hp <= 0) {
            onMonsterDefeated(i);
        }
    }

    document.getElementById('player-xp').innerText = `${player.monstersKilledThisWave}/${monstersToSpawn} (Welle ${currentWave})`;
    document.getElementById('player-level').innerText = player.weapons[0].level;

    requestAnimationFrame(gameLoop);
}

startWave();