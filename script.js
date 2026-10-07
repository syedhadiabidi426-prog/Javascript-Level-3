// Constant Board Configuration (Standard 3x3)
        const GRID_SIZE = 3;
        let boardState = Array(9).fill("");
        let currentPlayer = "X";
        let isGameActive = true;
        let scores = { X: 0, O: 0, Draw: 0 };
        let soundEnabled = true;

        // Web Audio API Sound Synthesizer
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        function playSynthSound(type) {
            if (!soundEnabled) return;
            try {
                if (audioCtx.state === 'suspended') {
                    audioCtx.resume();
                }

                const ctx = audioCtx;
                const now = ctx.currentTime;

                if (type === 'x-move') {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(440, now);
                    osc.frequency.exponentialRampToValueAtTime(880, now + 0.1);
                    gain.gain.setValueAtTime(0.15, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.1);
                } else if (type === 'o-move') {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(600, now);
                    osc.frequency.exponentialRampToValueAtTime(300, now + 0.12);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.12);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.12);
                } else if (type === 'win') {
                    const notes = [523.25, 659.25, 783.99, 1046.50];
                    notes.forEach((freq, idx) => {
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.type = 'sine';
                        osc.frequency.setValueAtTime(freq, now + idx * 0.08);
                        gain.gain.setValueAtTime(0.2, now + idx * 0.08);
                        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.3);
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.start(now + idx * 0.08);
                        osc.stop(now + idx * 0.08 + 0.3);
                    });
                } else if (type === 'draw') {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'triangle';
                    osc.frequency.setValueAtTime(300, now);
                    osc.frequency.linearRampToValueAtTime(150, now + 0.3);
                    gain.gain.setValueAtTime(0.2, now);
                    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.3);
                } else if (type === 'click') {
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(600, now);
                    gain.gain.setValueAtTime(0.05, now);
                    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(now);
                    osc.stop(now + 0.05);
                }
            } catch (e) {}
        }

        // DOM Elements Reference
        const boardEl = document.getElementById('board');
        const strikeSvg = document.getElementById('strike-svg');
        const pxCard = document.getElementById('px-card');
        const poCard = document.getElementById('po-card');
        const xScoreEl = document.getElementById('x-score');
        const oScoreEl = document.getElementById('o-score');
        const drawScoreEl = document.getElementById('draw-score');
        const restartBtn = document.getElementById('restart-btn');
        const resetScoresBtn = document.getElementById('reset-scores-btn');
        const soundBtn = document.getElementById('sound-btn');
        const winModal = document.getElementById('win-modal');
        const modalTitle = document.getElementById('modal-title');
        const modalSubtitle = document.getElementById('modal-subtitle');
        const modalRestartBtn = document.getElementById('modal-restart-btn');

        // Standard 3x3 Winning Combinations
        const WINNING_COMBINATIONS = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
            [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
            [0, 4, 8], [2, 4, 6]             // Diagonals
        ];

        function initBoard() {
            boardEl.innerHTML = "";
            strikeSvg.innerHTML = "";
            boardState = Array(9).fill("");
            isGameActive = true;

            for (let i = 0; i < 9; i++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.index = i;
                cell.addEventListener('click', handleCellClick);
                boardEl.appendChild(cell);
            }

            updateTurnUI();
        }

        function createMarkSVG(type) {
            if (type === 'X') {
                return `
                    <svg class="mark-svg mark-x" viewBox="0 0 100 100">
                        <path d="M 22,22 L 78,78 M 78,22 L 22,78"/>
                    </svg>
                `;
            } else {
                return `
                    <svg class="mark-svg mark-o" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="32"/>
                    </svg>
                `;
            }
        }

        function handleCellClick(e) {
            const cell = e.currentTarget;
            const idx = parseInt(cell.dataset.index);

            if (boardState[idx] !== "" || !isGameActive) return;

            boardState[idx] = currentPlayer;
            cell.classList.add('taken');
            cell.innerHTML = createMarkSVG(currentPlayer);

            playSynthSound(currentPlayer === 'X' ? 'x-move' : 'o-move');

            const winResult = checkWin();
            if (winResult) {
                isGameActive = false;
                drawStrikeLine(winResult.winningIndices);
                scores[currentPlayer]++;
                updateScoreUI();
                playSynthSound('win');
                triggerWinFX();
                setTimeout(() => showModal(`PLAYER ${currentPlayer} WINS!`, `Formed 3 in a row!`), 700);
            } else if (checkDraw()) {
                isGameActive = false;
                scores.Draw++;
                updateScoreUI();
                playSynthSound('draw');
                setTimeout(() => showModal("IT'S A DRAW!", "Grid filled with equal force."), 400);
            } else {
                currentPlayer = currentPlayer === "X" ? "O" : "X";
                updateTurnUI();
            }
        }

        function updateTurnUI() {
            const cells = document.querySelectorAll('.cell');
            cells.forEach(c => {
                c.classList.remove('preview-x', 'preview-o');
                if (boardState[parseInt(c.dataset.index)] === "") {
                    c.classList.add(currentPlayer === 'X' ? 'preview-x' : 'preview-o');
                }
            });

            if (currentPlayer === "X") {
                pxCard.className = "player-card active turn-x";
                poCard.className = "player-card";
            } else {
                poCard.className = "player-card active turn-o";
                pxCard.className = "player-card";
            }
        }

        function updateScoreUI() {
            xScoreEl.textContent = scores.X;
            oScoreEl.textContent = scores.O;
            drawScoreEl.textContent = scores.Draw;
        }

        function checkWin() {
            for (let combo of WINNING_COMBINATIONS) {
                const [a, b, c] = combo;
                if (boardState[a] && boardState[a] === boardState[b] && boardState[a] === boardState[c]) {
                    return { winningIndices: combo };
                }
            }
            return null;
        }

        function checkDraw() {
            return boardState.every(c => c !== "");
        }

        function drawStrikeLine(indices) {
            const firstCell = document.querySelectorAll('.cell')[indices[0]];
            const lastCell = document.querySelectorAll('.cell')[indices[indices.length - 1]];

            const boardRect = boardEl.getBoundingClientRect();
            const r1 = firstCell.getBoundingClientRect();
            const r2 = lastCell.getBoundingClientRect();

            const x1 = r1.left + r1.width / 2 - boardRect.left;
            const y1 = r1.top + r1.height / 2 - boardRect.top;
            const x2 = r2.left + r2.width / 2 - boardRect.left;
            const y2 = r2.top + r2.height / 2 - boardRect.top;

            strikeSvg.innerHTML = `
                <line class="strike-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />
            `;
        }

        function showModal(title, subtitle) {
            modalTitle.textContent = title;
            modalSubtitle.textContent = subtitle;
            if (title.includes('X')) {
                modalTitle.style.color = 'var(--neon-x)';
            } else if (title.includes('O')) {
                modalTitle.style.color = 'var(--neon-o)';
            } else {
                modalTitle.style.color = 'var(--text-primary)';
            }
            winModal.classList.add('active');
        }

        function hideModal() {
            winModal.classList.remove('active');
            stopWinFX();
        }

        function restartRound() {
            playSynthSound('click');
            hideModal();
            currentPlayer = "X";
            initBoard();
        }

        restartBtn.addEventListener('click', restartRound);
        modalRestartBtn.addEventListener('click', restartRound);

        resetScoresBtn.addEventListener('click', () => {
            playSynthSound('click');
            scores = { X: 0, O: 0, Draw: 0 };
            updateScoreUI();
            restartRound();
        });

        soundBtn.addEventListener('click', () => {
            soundEnabled = !soundEnabled;
            soundBtn.style.opacity = soundEnabled ? "1" : "0.4";
            playSynthSound('click');
        });

        const bgCanvas = document.getElementById('bg-canvas');
        const bgCtx = bgCanvas.getContext('2d');
        let bgParticles = [];

        function initBgCanvas() {
            bgCanvas.width = window.innerWidth;
            bgCanvas.height = window.innerHeight;
            bgParticles = [];
            for (let i = 0; i < 40; i++) {
                bgParticles.push({
                    x: Math.random() * bgCanvas.width,
                    y: Math.random() * bgCanvas.height,
                    radius: Math.random() * 2 + 0.5,
                    vx: (Math.random() - 0.5) * 0.4,
                    vy: (Math.random() - 0.5) * 0.4,
                    alpha: Math.random() * 0.5 + 0.1
                });
            }
        }

        function animateBgCanvas() {
            bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);
            bgCtx.fillStyle = '#00f0ff';

            bgParticles.forEach(p => {
                p.x += p.vx;
                p.y += p.vy;

                if (p.x < 0) p.x = bgCanvas.width;
                if (p.x > bgCanvas.width) p.x = 0;
                if (p.y < 0) p.y = bgCanvas.height;
                if (p.y > bgCanvas.height) p.y = 0;

                bgCtx.beginPath();
                bgCtx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                bgCtx.fillStyle = `rgba(0, 240, 255, ${p.alpha})`;
                bgCtx.fill();
            });

            requestAnimationFrame(animateBgCanvas);
        }

        // Victory FX Canvas Particle System
        const fxCanvas = document.getElementById('fx-canvas');
        const fxCtx = fxCanvas.getContext('2d');
        let fxParticles = [];
        let fxAnimId = null;

        function triggerWinFX() {
            fxCanvas.width = window.innerWidth;
            fxCanvas.height = window.innerHeight;
            fxParticles = [];

            const color = currentPlayer === 'X' ? '#00f0ff' : '#ff007f';
            for (let i = 0; i < 80; i++) {
                fxParticles.push({
                    x: fxCanvas.width / 2,
                    y: fxCanvas.height / 2,
                    vx: (Math.random() - 0.5) * 12,
                    vy: (Math.random() - 0.5) * 12,
                    size: Math.random() * 6 + 2,
                    color: color,
                    alpha: 1,
                    decay: Math.random() * 0.02 + 0.015
                });
            }
            animateWinFX();
        }

        function animateWinFX() {
            fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);

            fxParticles.forEach((p) => {
                p.x += p.vx;
                p.y += p.vy;
                p.alpha -= p.decay;

                if (p.alpha > 0) {
                    fxCtx.save();
                    fxCtx.globalAlpha = p.alpha;
                    fxCtx.fillStyle = p.color;
                    fxCtx.shadowBlur = 10;
                    fxCtx.shadowColor = p.color;
                    fxCtx.beginPath();
                    fxCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    fxCtx.fill();
                    fxCtx.restore();
                }
            });

            fxParticles = fxParticles.filter(p => p.alpha > 0);
            if (fxParticles.length > 0) {
                fxAnimId = requestAnimationFrame(animateWinFX);
            }
        }

        function stopWinFX() {
            if (fxAnimId) cancelAnimationFrame(fxAnimId);
            fxCtx.clearRect(0, 0, fxCanvas.width, fxCanvas.height);
        }

        window.addEventListener('resize', () => {
            initBgCanvas();
            if (isGameActive === false) {
                const winResult = checkWin();
                if (winResult) drawStrikeLine(winResult.winningIndices);
            }
        });

        // Initial launch
        initBgCanvas();
        animateBgCanvas();
        initBoard();