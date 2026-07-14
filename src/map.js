export class ApocalypseMap {
    constructor(canvasWidth, canvasHeight) {
        this.buildings = [];
        this.generateMap(canvasWidth, canvasHeight);
    }

    generateMap(width, height) {
        this.buildings = [];
        
        const numberOfBuildings = 20; 
        const minWidth = 70, maxWidth = 130;  
        const minHeight = 70, maxHeight = 130; 
        const minFloors = 3, maxFloors = 7;
        
        const centerX = width / 2;
        const centerY = height / 2;
        const safeZone = 120; 

        for (let i = 0; i < numberOfBuildings; i++) {
            let attempts = 0;
            let validPosition = false;
            let bX, bY, bW, bH, bFloors;

            while (!validPosition && attempts < 80) {
                attempts++;
                
                bW = Math.floor(Math.random() * (maxWidth - minWidth + 1)) + minWidth;
                bH = Math.floor(Math.random() * (maxHeight - minHeight + 1)) + minHeight;
                
                bX = Math.floor(Math.random() * (width - bW - 20)) + 10;
                bY = Math.floor(Math.random() * (height - bH - 20)) + 10;
                
                bFloors = Math.floor(Math.random() * (maxFloors - minFloors + 1)) + minFloors;

                const distToCenter = Math.hypot((bX + bW/2) - centerX, (bY + bH/2) - centerY);
                if (distToCenter < safeZone) continue;

                let overlaps = false;
                const padding = 25; 
                for (const existing of this.buildings) {
                    if (
                        bX < existing.x + existing.w + padding &&
                        bX + bW > existing.x - padding &&
                        bY < existing.y + existing.h + padding &&
                        bY + bH > existing.y - padding
                    ) {
                        overlaps = true;
                        break;
                    }
                }

                if (!overlaps) {
                    validPosition = true;
                }
            }

            if (validPosition) {
                this.buildings.push({ x: bX, y: bY, w: bW, h: bH, floors: bFloors });
            }
        }
        
        console.log(`Stadt generiert: ${this.buildings.length} Hochhäuser erbaut.`);
    }

    draw(ctx, player) {
        ctx.fillStyle = '#111116';
        ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

        this.buildings.forEach(b => {
            for (let i = 0; i < b.floors; i++) {
                const heightOffset = i * 12; 
                
                const fromPlayerX = (b.x + b.w / 2) - player.x;
                const fromPlayerY = (b.y + b.h / 2) - player.y;

                const projectionX = fromPlayerX * (heightOffset * 0.001);
                const projectionY = fromPlayerY * (heightOffset * 0.001);

                const fX = b.x + projectionX;
                const fY = b.y + projectionY;

                if (i === 0) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                    ctx.fillRect(fX - 10, fY - 10, b.w + 20, b.h + 20);
                    
                    ctx.fillStyle = '#2b2b36';
                    ctx.fillRect(fX, fY, b.w, b.h);
                } else if (i === b.floors - 1) {
                    ctx.fillStyle = '#1e1e24';
                    ctx.fillRect(fX, fY, b.w, b.h);
                    
                    ctx.strokeStyle = '#ff0055';
                    ctx.lineWidth = 2;
                    ctx.strokeRect(fX, fY, b.w, b.h);

                    ctx.fillStyle = '#111';
                    ctx.fillRect(fX + b.w/3, fY + b.h/3, b.w/4, b.h/4);
                } else {
                    ctx.fillStyle = '#22222b';
                    ctx.fillRect(fX, fY, b.w, b.h);
                    
                    ctx.fillStyle = 'rgba(0, 255, 204, 0.15)';
                    ctx.fillRect(fX + 15, fY + 5, 10, 5);
                    ctx.fillRect(fX + b.w - 25, fY + 5, 10, 5);
                }
            }
        });
    }

    checkCollision(entity, nextX, nextY) {
        for (const b of this.buildings) {
            if (
                nextX + entity.radius > b.x &&
                nextX - entity.radius < b.x + b.w &&
                nextY + entity.radius > b.y &&
                nextY - entity.radius < b.y + b.h
            ) {
                return true;
            }
        }
        return false;
    }
}