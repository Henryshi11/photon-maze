/* ============================================================================
   PhotonGame — Core engine of the Photon Maze game
   Handles:
   - Canvas rendering loop
   - Ray physics (reflection/refraction)
   - Level state + HUD UI
   - Wall objects & collision detection
   - Shot history visualization
============================================================================ */

class PhotonGame {
    constructor() {
        // --- Canvas setup ---
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // --- UI references ---
        this.ui = {
            level: document.getElementById('level-txt'),
            desc: document.getElementById('level-desc'),
            attempts: document.getElementById('attempts-txt'),
            win: document.getElementById('win-overlay'),
            stats: document.getElementById('win-stats'),
            statCurrent: document.getElementById('stat-current'),
            statBest: document.getElementById('stat-best'),
            statOptTotal: document.getElementById('stat-opt-total'),
            statSessionTotal: document.getElementById('stat-session-total')
        };

        // --- Game state variables ---
        this.levelIndex = 0;                     // Current level number
        this.attempts = 0;                       // Shots taken in current level
        this.maxBounces = CONFIG.defaultMaxBounces;

        this.walls = [];                         // All mirror/glass line segments
        this.history = [];                       // Stores recent ray paths
        this.particles = [];                     // Hit effects
        this.mouse = { x: 0, y: 0 };               // Mouse aiming vector

        // Emitter and target positions
        this.emitter = { x: 0, y: 0 };
        this.target = { x: 0, y: 0, r: 15 };

        // Score tracking
        this.totalSessionDistance = 0;
        this.currentLevelBest = Infinity;        // Best score in current level
        this.levelRecords = {};                  // Stores best score per level index

        // Init
        this.resize();
        this.initLevels();
        this.loadLevel(0);
        this.bindEvents();

        // Begin animation loop
        this.lastTime = 0;
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    /* --------------------------------------------------------------------------
       Resize canvas based on viewport while maintaining aspect constraints
    -------------------------------------------------------------------------- */
    resize() {
        const maxWidth = 1200;
        const maxHeight = 900;
        let w = window.innerWidth * 0.98;
        let h = window.innerHeight * 0.9;
        if (w > maxWidth) w = maxWidth;
        if (h > maxHeight) h = maxHeight;

        this.canvas.width = w;
        this.canvas.height = h;

        // When resizing, rebuild level environment
        if (this.walls.length > 0) this.loadLevel(this.levelIndex, true);
    }

    /* --------------------------------------------------------------------------
       Input bindings: mouse position + click to shoot ray
    -------------------------------------------------------------------------- */
    bindEvents() {
        const updateMouse = (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            this.mouse.x = clientX - rect.left;
            this.mouse.y = clientY - rect.top;
        };
        this.canvas.addEventListener('mousemove', updateMouse);
        this.canvas.addEventListener('touchmove', e => { e.preventDefault(); updateMouse(e) }, { passive: false });

        // Shoot ray on click/touch
        const shoot = (e) => {
            if (this.ui.win.classList.contains('active')) return;
            if (e.target !== this.canvas) return;
            e.preventDefault();
            this.shootRay();
        };
        this.canvas.addEventListener('mousedown', shoot);
        this.canvas.addEventListener('touchstart', shoot);

        // Handle resize
        window.addEventListener('resize', () => this.resize());
    }

    /* --------------------------------------------------------------------------
       Define predefined puzzle levels + procedural maze levels
    -------------------------------------------------------------------------- */
    initLevels() {
        this.staticLevels = [

            // ===== Level 1: Reflection bounce puzzle =====
            {
                name: "RICOCHET",
                emitter: { x: 0.1, y: 0.5 },
                target: { x: 0.9, y: 0.5 },
                walls: [
                    { x1: 0.5, y1: 0.4, x2: 0.5, y2: 0.6, type: 'mirror' },
                    { x1: 0.3, y1: 0.1, x2: 0.7, y2: 0.1, type: 'mirror' },
                    { x1: 0.3, y1: 0.9, x2: 0.7, y2: 0.9, type: 'mirror' },
                ]
            },

            // ===== Level 2: Refraction through a glass square =====
            {
                name: "REFRACTION",
                emitter: { x: 0.1, y: 0.5 },
                target: { x: 0.9, y: 0.4 },
                walls: [
                    { x1: 0.4, y1: 0.2, x2: 0.6, y2: 0.2, type: 'glass' },
                    { x1: 0.6, y1: 0.2, x2: 0.6, y2: 0.8, type: 'glass' },
                    { x1: 0.6, y1: 0.8, x2: 0.4, y2: 0.8, type: 'glass' },
                    { x1: 0.4, y1: 0.8, x2: 0.4, y2: 0.2, type: 'glass' },
                    { x1: 0.8, y1: 0.5, x2: 0.8, y2: 1.0, type: 'mirror' }
                ]
            },

            // ===== Level 3: Triangle prism =====
            {
                name: "PRISM",
                emitter: { x: 0.1, y: 0.8 },
                target: { x: 0.9, y: 0.2 },
                walls: [
                    { x1: 0.3, y1: 0.3, x2: 0.7, y2: 0.3, type: 'glass' },
                    { x1: 0.7, y1: 0.3, x2: 0.5, y2: 0.7, type: 'glass' },
                    { x1: 0.5, y1: 0.7, x2: 0.3, y2: 0.3, type: 'glass' }
                ]
            }
        ];
    }

    /* --------------------------------------------------------------------------
       Load specified level
       keepMap = true → keep current geometry but reset attempts/history only
    -------------------------------------------------------------------------- */
    loadLevel(index, keepMap = false) {
        this.levelIndex = index;
        const w = this.canvas.width, h = this.canvas.height;

        // Reset state
        this.history = [];
        this.attempts = 0;
        this.particles = [];
        this.currentLevelBest = this.levelRecords[index] || Infinity;

        // Reset UI
        this.ui.win.classList.remove('active');
        this.ui.level.innerText = index + 1;
        this.ui.statCurrent.innerText = "0";
        this.ui.statBest.innerText = this.currentLevelBest === Infinity ? "--" : this.currentLevelBest;
        this.ui.attempts.innerText = "0";
        this.ui.statBest.classList.remove("stat-highlight");

        // Build walls only if not preserving previous map
        if (!keepMap) {
            this.walls = [];

            // Add canvas boundary mirrors
            const border = 'mirror';
            this.addWall(0, 0, w, 0, border);
            this.addWall(w, 0, w, h, border);
            this.addWall(w, h, 0, h, border);
            this.addWall(0, h, 0, 0, border);

            // If still in static campaign mode
            if (index < this.staticLevels.length) {
                const L = this.staticLevels[index];
                this.ui.desc.innerText = L.name;
                this.maxBounces = CONFIG.defaultMaxBounces;

                this.emitter = { x: L.emitter.x * w, y: L.emitter.y * h };
                this.target = { x: L.target.x * w, y: L.target.y * h, r: 15 };

                L.walls.forEach(wl => this.addWall(wl.x1 * w, wl.y1 * h, wl.x2 * w, wl.y2 * h, wl.type));
            }

            // Procedural maze mode after static levels
            else {
                const complexity = index - this.staticLevels.length;
                let cols = 10, rows = 6;
                if (complexity >= 1) { cols = 16; rows = 9; }
                if (complexity >= 2) { cols = 22; rows = 14; }

                this.ui.desc.innerText = complexity === 0 ? "LABYRINTH" : "MEGA COMPLEX";
                this.maxBounces = CONFIG.complexMaxBounces;

                const maze = MazeGenerator.generate(cols, rows);
                const cellW = w / cols, cellH = h / rows;

                this.emitter = { x: cellW * 0.5, y: cellH * 0.5 };
                this.target = { x: w - cellW * 0.5, y: h - cellH * 0.5, r: Math.min(cellW, cellH) * 0.3 };

                maze.forEach(wl => this.addWall(wl.x1 * w, wl.y1 * h, wl.x2 * w, wl.y2 * h, wl.type));
            }
        }
    }

    /* --------------------------------------------------------------------------
       Add wall segment to simulation
    -------------------------------------------------------------------------- */
    addWall(x1, y1, x2, y2, type) {
        this.walls.push({
            a: { x: x1, y: y1 },
            b: { x: x2, y: y2 },
            type: type,
            normal: this.calculateNormal({ x: x1, y: y1 }, { x: x2, y: y2 })
        });
    }

    /* Returns outward normal vector for a wall */
    calculateNormal(a, b) {
        let dx = b.x - a.x, dy = b.y - a.y;
        return Vec2.normalize({ x: -dy, y: dx });
    }

    /* ============================================================================
       Continue PhotonGame class — Ray simulation + interaction logic
    ============================================================================ */

    /* --------------------------------------------------------------------------
       Trace a ray path step-by-step until:
       - it hits the target
       - it exceeds bounce limit
       - no more wall intersections
       Returns: { path:[points], success:true/false }
    -------------------------------------------------------------------------- */
    traceRay(start, dir) {
        let points = [start];               // Stores each ray vertex
        let currPos = start;
        let currDir = Vec2.normalize(dir);
        let hitTarget = false;
        const epsilon = 0.01;               // Prevents self-intersection

        for (let i = 0; i < this.maxBounces; i++) {
            let closest = null, minT = Infinity, hitWall = null;

            // Check intersection against every wall segment
            for (let wall of this.walls) {
                const hit = this.getLineIntersection(currPos, currDir, wall.a, wall.b);
                if (hit && hit.t > epsilon && hit.t < minT) {
                    minT = hit.t;
                    closest = hit.point;
                    hitWall = wall;
                }
            }

            if (closest) {
                // Check if path segment touches target circle
                if (this.segmentCircleIntersect(currPos, closest, this.target))
                    hitTarget = true;

                points.push(closest);

                // Absorption wall — beam stops
                if (hitWall.type === 'absorb') break;

                // Mirror reflection
                if (hitWall.type === 'mirror') {
                    let normal = hitWall.normal;
                    if (Vec2.dot(currDir, normal) > 0)
                        normal = Vec2.mult(normal, -1);

                    const reflect = Vec2.sub(
                        currDir,
                        Vec2.mult(normal, 2 * Vec2.dot(currDir, normal))
                    );

                    currDir = Vec2.normalize(reflect);
                    currPos = closest;
                    this.spawnParticles(closest, CONFIG.colors.wall, 2);
                }

                // Glass refraction (Snell's law)
                else if (hitWall.type === 'glass') {
                    let normal = hitWall.normal;
                    let n1 = CONFIG.airIndex, n2 = CONFIG.refractiveIndex;
                    let entering = Vec2.dot(currDir, normal) < 0;

                    // Swap index if exiting the material
                    if (!entering) { normal = Vec2.mult(normal, -1);[n1, n2] = [n2, n1]; }

                    const n = n1 / n2;
                    const cosI = -Vec2.dot(normal, currDir);
                    const sinT2 = n * n * (1 - cosI * cosI);

                    // Total internal reflection
                    if (sinT2 > 1.0) {
                        const reflect = Vec2.sub(
                            currDir,
                            Vec2.mult(normal, 2 * Vec2.dot(currDir, normal))
                        );
                        currDir = Vec2.normalize(reflect);
                    }
                    else {
                        const cosT = Math.sqrt(1 - sinT2);
                        const term1 = Vec2.mult(currDir, n);
                        const term2 = Vec2.mult(normal, (n * cosI - cosT));
                        currDir = Vec2.add(term1, term2);
                    }

                    currPos = closest;
                    this.spawnParticles(closest, '#fff', 1);
                }
            }

            // No more collisions, extend ray outward
            else {
                points.push({
                    x: currPos.x + currDir.x * 2000,
                    y: currPos.y + currDir.y * 2000
                });
                break;
            }
            if (hitTarget) break;
        }
        return { path: points, success: hitTarget };
    }

    /* Line (ray) vs segment intersection — parametric solver */
    getLineIntersection(p, d, a, b) {
        const v1 = { x: p.x - a.x, y: p.y - a.y };
        const v2 = { x: b.x - a.x, y: b.y - a.y };
        const v3 = { x: -d.y, y: d.x };
        const dot = Vec2.dot(v2, v3);
        if (Math.abs(dot) < 0.00001) return null;

        const t1 = (v2.x * v1.y - v2.y * v1.x) / dot;
        const t2 = Vec2.dot(v1, v3) / dot;

        // t1>0 ensures ray forward only, 0≤t2≤1 ensures segment bounds
        if (t1 >= 0 && t2 >= 0 && t2 <= 1)
            return { t: t1, point: { x: p.x + t1 * d.x, y: p.y + t1 * d.y } };
        return null;
    }

    /* Detect whether the ray segment passes through target circle */
    segmentCircleIntersect(p1, p2, circle) {
        const L2 = Vec2.dist(p1, p2) ** 2;
        if (L2 === 0) return Vec2.dist(p1, circle) < circle.r;

        let t = ((circle.x - p1.x) * (p2.x - p1.x) + (circle.y - p1.y) * (p2.y - p1.y)) / L2;
        t = Math.max(0, Math.min(1, t)); // clamp to segment

        const proj = {
            x: p1.x + t * (p2.x - p1.x),
            y: p1.y + t * (p2.y - p1.y)
        };
        return Vec2.dist(circle, proj) < circle.r;
    }

    /* --------------------------------------------------------------------------
       Fire a ray based on mouse direction
       Update UI statistics + generate trails
    -------------------------------------------------------------------------- */
    shootRay() {
        this.attempts++;
        this.ui.attempts.innerText = this.attempts;

        let dir = Vec2.sub(this.mouse, this.emitter);
        if (Vec2.mag(dir) === 0) dir = { x: 1, y: 0 };

        const result = this.traceRay(this.emitter, dir);
        const rayLen = this.calculatePathLength(result.path);

        // Update displayed stats
        this.totalSessionDistance += rayLen;
        this.ui.statCurrent.innerText = rayLen;
        this.ui.statSessionTotal.innerText = this.totalSessionDistance.toLocaleString();

        if (result.success) {
            if (rayLen < this.currentLevelBest) {
                this.currentLevelBest = rayLen;
                this.levelRecords[this.levelIndex] = rayLen;
                this.ui.statBest.innerText = rayLen;
                this.ui.statBest.classList.add('stat-highlight');
                setTimeout(() => this.ui.statBest.classList.remove('stat-highlight'), 500);
            }
            this.updateOptimizedTotal();
        }

        // Store trail history (maximum 10)
        this.history.unshift({
            path: result.path,
            timestamp: Date.now(),
            success: result.success,
            color: result.success ? '#0f0' : CONFIG.colors.shot1
        });
        if (this.history.length > 10) this.history.pop();

        if (result.success) this.handleWin(rayLen);


        if (!result.success) {
            if (this.attempts >= 10) {
                alert("You failed 10 times!\nBeat the click challenge to continue.");
                window.location.href = "button.html?return=game"; // redirect
                return;
            }
        }
    }



    /* Compute total path length of a ray */
    calculatePathLength(points) {
        let L = 0;
        for (let i = 0; i < points.length - 1; i++)
            L += Vec2.dist(points[i], points[i + 1]);
        return Math.floor(L);
    }

    /* Sum best record of every level played */
    updateOptimizedTotal() {
        const total = Object.values(this.levelRecords)
            .reduce((a, b) => a + b, 0);
        this.ui.statOptTotal.innerText = total.toLocaleString();
    }

    /* Trigger win overlay with stats */
    handleWin(rayLen) {
        for (let i = 0; i < 50; i++)
            this.spawnParticles(this.target, '#0f0', 15);

        this.ui.stats.innerHTML = `
            Path Length: <b style="color:#0f0">${rayLen} px</b><br>
            Level Best: <b>${this.currentLevelBest} px</b><br>
            Attempts: ${this.attempts}
        `;

        setTimeout(() => this.ui.win.classList.add('active'), 300);
    }

    /* Simple pixel particle burst effect */
    spawnParticles(pos, color, speedScale) {
        for (let i = 0; i < 3; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * speedScale + 1;
            this.particles.push({
                x: pos.x, y: pos.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1,
                color: color
            });
        }
    }

    /* --------------------------------------------------------------------------
   Public control methods (used by buttons in HTML)
-------------------------------------------------------------------------- */

    // Advance to the next level (generates new layout if beyond static levels)
    nextLevel() {
        this.loadLevel(this.levelIndex + 1);
    }

    // Reset current level state change geometry layout (diff puzzle)
    resetLevel() {
        this.loadLevel(this.levelIndex, false);
    }

    // Retry — keep same puzzle
    retryLevel() {
        this.loadLevel(this.levelIndex, true);
    }




    // Clear ray history (removes trails but keeps current shot)
    clearHistory() {
        this.history = [];
    }

    /* --------------------------------------------------------------------------
       Main animation loop
       Called every frame via requestAnimationFrame
    -------------------------------------------------------------------------- */
    animate(timestamp) {
        const dt = timestamp - this.lastTime;
        this.lastTime = timestamp;

        // Clear background
        this.ctx.fillStyle = '#050508';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw target and walls first
        this.drawTarget();
        this.walls.forEach(w => this.drawWall(w));

        // Draw emitter (origin point of the beam)
        this.ctx.beginPath();
        this.ctx.arc(this.emitter.x, this.emitter.y, 8, 0, Math.PI * 2);
        this.ctx.fillStyle = '#fff';
        this.ctx.shadowBlur = 10;
        this.ctx.shadowColor = '#fff';
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Draw previous ray paths (oldest at back)
        for (let i = this.history.length - 1; i >= 0; i--) {
            this.drawPath(this.history[i], i);
        }

        // Draw aiming line from emitter toward mouse cursor
        this.drawAimLine();

        // Update and render particle effects
        this.updateAndDrawParticles();

        requestAnimationFrame(this.animate);
    }

    /* --------------------------------------------------------------------------
       Rendering helpers
    -------------------------------------------------------------------------- */

    // Draw pulsating target circle
    drawTarget() {
        const t = this.target;
        const pulse = Math.sin(Date.now() / 200) * 3;

        this.ctx.beginPath();
        this.ctx.arc(t.x, t.y, t.r + pulse, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#0f0';
        this.ctx.lineWidth = 2;
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = '#0f0';
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    // Draw a wall segment (mirror/glass/absorber)
    drawWall(w) {
        this.ctx.beginPath();
        this.ctx.moveTo(w.a.x, w.a.y);
        this.ctx.lineTo(w.b.x, w.b.y);
        this.ctx.lineWidth = 4;
        this.ctx.lineCap = 'round';

        if (w.type === 'mirror') {
            this.ctx.strokeStyle = CONFIG.colors.wall;
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = CONFIG.colors.wall;
        } else if (w.type === 'glass') {
            this.ctx.strokeStyle = CONFIG.colors.glass;
            this.ctx.lineWidth = 6;
            this.ctx.shadowBlur = 5;
            this.ctx.shadowColor = '#fff';
        } else {
            this.ctx.strokeStyle = CONFIG.colors.absorb;
            this.ctx.shadowBlur = 0;
        }

        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    // Draw a single ray path from history
    drawPath(historyItem, index) {
        const path = historyItem.path;
        if (!path || path.length < 2) return;

        // Color logic: brightest for newest, fades for older
        let color = historyItem.success ? '#0f0' : CONFIG.colors.shot1;
        if (!historyItem.success) {
            if (index === 1) color = CONFIG.colors.shot2;
            if (index === 2) color = CONFIG.colors.shot3;
            if (index > 2) color = CONFIG.colors.old;
        }

        this.ctx.beginPath();
        this.ctx.moveTo(path[0].x, path[0].y);
        for (let j = 1; j < path.length; j++) {
            this.ctx.lineTo(path[j].x, path[j].y);
        }

        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = index === 0 ? 2 : 1;
        this.ctx.globalAlpha = Math.max(0.2, 1 - index * 0.15);
        this.ctx.globalCompositeOperation = 'screen';

        if (index === 0) {
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = color;
        }

        this.ctx.stroke();

        // Reset composite state
        this.ctx.shadowBlur = 0;
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.globalAlpha = 1.0;
    }

    // Draw the short aiming line from emitter towards current mouse position
    drawAimLine() {
        if (this.ui.win.classList.contains('active')) return;

        this.ctx.beginPath();
        this.ctx.moveTo(this.emitter.x, this.emitter.y);

        let dir = Vec2.sub(this.mouse, this.emitter);
        if (Vec2.mag(dir) === 0) dir = { x: 1, y: 0 };
        dir = Vec2.normalize(dir);

        const end = {
            x: this.emitter.x + dir.x * 50,
            y: this.emitter.y + dir.y * 50
        };

        this.ctx.lineTo(end.x, end.y);
        this.ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        this.ctx.setLineDash([2, 4]);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
    }

    // Update and render all active particles
    updateAndDrawParticles() {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.05;

            if (p.life <= 0) {
                this.particles.splice(i, 1);
            } else {
                this.ctx.fillStyle = p.color;
                this.ctx.globalAlpha = p.life;
                this.ctx.fillRect(p.x, p.y, 2, 2);
                this.ctx.globalAlpha = 1.0;
            }
        }
    }
}
