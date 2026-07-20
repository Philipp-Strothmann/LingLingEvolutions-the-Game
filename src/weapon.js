export class Weapon {
    constructor(name, type, baseDmg, baseCooldown) {
        this.name = name;
        this.type = type; // 'melee' oder 'ranged'
        this.level = 1;
        this.damage = baseDmg;
        this.cooldown = baseCooldown; // in Millisekunden
        this.lastShot = 0;
        this.range = 80; // Schlag-Radius für den Gürtel
    }

    // Prüft, ob die Waffe bereit ist für den nächsten Angriff
    canAttack(currentTime) {
        return currentTime - this.lastShot >= this.cooldown;
    }

    // Führt den Angriff aus
    attack(player, monsters, currentTime) {
        this.lastShot = currentTime;

        if (this.type === 'melee' && this.name === 'Gürtel') {
            // Wir erzeugen eine visuelle "Schlag-Welle" im Kreis um LingLing herum
            this.triggerGürtelEffect(player);

            // Schadensberechnung an nahen Monstern (Kollisionsprüfung)
            monsters.forEach(monster => {
                const dist = Math.hypot(monster.x - player.x, monster.y - player.y);
                if (dist <= this.range + monster.radius) {
                    monster.takeDamage(this.damage);
                }
            });
        }
    }

    triggerGürtelEffect(player) {
        // Wird im Game Loop gezeichnet (wir merken uns den Effekt temporär)
        player.activeEffects.push({
            type: 'belt_slash',
            x: player.x,
            y: player.y,
            radius: this.range,
            duration: 10, // Frames sichtbar
            maxDuration: 10
        });
    }
}