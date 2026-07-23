export class Weapon {
    constructor(name, type, baseDmg, baseCooldown) {
        this.name = name;
        this.type = type; // 'melee' oder 'ranged'
        this.level = 1;
        this.damage = baseDmg;
        this.cooldown = baseCooldown; // in Millisekunden
        this.lastShot = 0;
        this.range = 80; // Attack range for the belt
    }

    // Prüft, ob die Waffe bereit ist für den nächsten Angriff
    canAttack(currentTime) {
        return currentTime - this.lastShot >= this.cooldown;
    }

    // Führt den Angriff aus
    attack(player, monsters, currentTime) {
        this.lastShot = currentTime;

        if (this.type === 'melee' && this.name === 'Belt') {
            // Create a visual slash wave around LingLing
            this.triggerBeltEffect(player);

            // Calculate damage on nearby Goblins
            monsters.forEach(monster => {
                const dist = Math.hypot(monster.x - player.x, monster.y - player.y);
                if (dist <= this.range + monster.radius) {
                    monster.takeDamage(this.damage);
                }
            });
        }
    }

    triggerBeltEffect(player) {
        // Stored temporarily to be drawn in the game loop
        player.activeEffects.push({
            type: 'belt_slash',
            x: player.x,
            y: player.y,
            radius: this.range,
            duration: 10, // Visible frames
            maxDuration: 10
        });
    }
}