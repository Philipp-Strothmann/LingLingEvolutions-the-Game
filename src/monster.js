export class Monster {
    constructor(canvasWidth, canvasHeight, playerX, playerY, waveNumber) {
        this.radius = 15;
        this.speed = 1.5 + (waveNumber * 0.1);
        this.maxHp = 20 + (waveNumber * 5);
        this.hp = this.maxHp;
        this.color = '#ff3333';
        
        // Cooldown für Monster-Angriffe (z.B. alle 1.5 Sekunden)
        this.attackCooldown = 1500; 
        this.lastAttackTime = 0;

        const edge = Math.floor(Math.random() * 4);
        if (edge === 0) { this.x = Math.random() * canvasWidth; this.y = -this.radius; }
        else if (edge === 1) { this.x = canvasWidth + this.radius; this.y = Math.random() * canvasHeight; }
        else if (edge === 2) { this.x = Math.random() * canvasWidth; this.y = canvasHeight + this.radius; }
        else { this.x = -this.radius; this.y = Math.random() * canvasHeight; }
    }

    update(playerX, playerY) {
        const dx = playerX - this.x;
        const dy = playerY - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0) {
            this.x += (dx / distance) * this.speed;
            this.y += (dy / distance) * this.speed;
        }
    }

    takeDamage(amount) {
        this.hp -= amount;
    }

    // Prüft, ob das Monster nah genug am Spieler ist, um zuzuschlagen
    canAttackPlayer(player, currentTime) {
        const dist = Math.hypot(player.x - this.x, player.y - this.y);
        // Kollisionsprüfung (Berührung der Radien)
        if (dist <= this.radius + player.radius) {
            return currentTime - this.lastAttackTime >= this.attackCooldown;
        }
        return false;
    }

    // Führt den Schlag aus und berechnet den variablen/kritischen Schaden
    attack(currentTime) {
        this.lastAttackTime = currentTime;
        
        // 1 von 50 Chance entspricht 2%
        const isCrit = Math.random() < 0.02; 
        
        if (isCrit) {
            return { damage: 40, isCrit: true };
        } else {
            // Zufälliger Schaden zwischen 15 und 25
            const baseDmg = Math.floor(Math.random() * (25 - 15 + 1)) + 15;
            return { damage: baseDmg, isCrit: false };
        }
    }

// In src/monster.js die draw-Methode ersetzen:
draw(ctx) {
    ctx.save();
    ctx.translate(this.x, this.y);

    // 1. Fiese spitze Goblin-Ohren (links und rechts abstehend)
    ctx.fillStyle = '#4fa83b'; // Goblin Grün
    ctx.strokeStyle = '#1d4215';
    ctx.lineWidth = 1.5;

    // Linkes Ohr (weit nach außen gezogen)
    ctx.beginPath();
    ctx.moveTo(-10, -5);
    ctx.lineTo(-28, -8); // Spitze nach links
    ctx.lineTo(-12, 5);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    // Rechtes Ohr
    ctx.beginPath();
    ctx.moveTo(10, -5);
    ctx.lineTo(28, -8); // Spitze nach rechts
    ctx.lineTo(12, 5);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    // 2. Der Kopf-Körper des Goblins
    ctx.beginPath();
    ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#5cb847'; // Hellgrün
    ctx.shadowBlur = 4;
    ctx.shadowColor = '#1d4215';
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
    ctx.shadowBlur = 0;

    // 3. Glühende rote Augen
    ctx.fillStyle = '#ff2222';
    // Linkes Auge (schräg geschnitten für bösen Blick)
    ctx.beginPath();
    ctx.moveTo(-8, -6);
    ctx.lineTo(-2, -3);
    ctx.lineTo(-8, 0);
    ctx.fill();
    ctx.closePath();

    // Rechtes Auge
    ctx.beginPath();
    ctx.moveTo(8, -6);
    ctx.lineTo(2, -3);
    ctx.lineTo(8, 0);
    ctx.fill();
    ctx.closePath();

    // 4. Ein fieses Goblin-Grinsen
    ctx.beginPath();
    ctx.strokeStyle = '#1d4215';
    ctx.lineWidth = 2;
    ctx.moveTo(-7, 5);
    ctx.quadraticCurveTo(0, 10, 7, 5); // Grinsekurve nach unten
    ctx.stroke();
    ctx.closePath();

    ctx.restore();

    // 5. Schwebende Lebensleiste über dem Goblin
    const barWidth = 30;
    const barHeight = 4;
    const barX = this.x - barWidth / 2;
    const barY = this.y - this.radius - 12; // Leicht erhöht wegen der Ohren

    // Hintergrund (Grau)
    ctx.fillStyle = '#444';
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // Vordergrund (Rot, skaliert nach HP-Prozent)
    const hpPercent = Math.max(0, this.hp / this.maxHp);
    ctx.fillStyle = '#ff3333';
    ctx.fillRect(barX, barY, barWidth * hpPercent, barHeight);
}
}