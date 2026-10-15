document.addEventListener('DOMContentLoaded', () => {
    const p = 17;
    const a = 0;
    const b = 7;

    const canvas = document.getElementById('ec-canvas');
    const ctx = canvas.getContext('2d');
    const logOutput = document.getElementById('log-output');
    const btnCalculate = document.getElementById('btn-calculate');
    const btnAnimate = document.getElementById('btn-animate');
    const btnStats = document.getElementById('btn-stats');
    const inputK = document.getElementById('scalar-k');
    const inputGx = document.getElementById('input-gx');
    const inputGy = document.getElementById('input-gy');

    function mod(n, m) {
        return ((n % m) + m) % m;
    }

    function modInverse(a, m) {
        a = mod(a, m);
        for (let x = 1; x < m; x++) {
            if ((a * x) % m === 1) return x;
        }
        return null;
    }

    function isValidPoint(x, y) {
        let lhs = mod(y * y, p);
        let rhs = mod(Math.pow(x, 3) + b, p);
        return lhs === rhs;
    }

    function pointAdd(P, Q) {
        if (!P) return Q;
        if (!Q) return P;

        if (P.x === Q.x && P.y !== Q.y) return null;

        let lambda;
        if (P.x === Q.x && P.y === Q.y) {
            if (P.y === 0) return null;
            let num = mod(3 * P.x * P.x + a, p);
            let den = mod(2 * P.y, p);
            lambda = mod(num * modInverse(den, p), p);
        } else {
            let num = mod(Q.y - P.y, p);
            let den = mod(Q.x - P.x, p);
            lambda = mod(num * modInverse(den, p), p);
        }

        let x3 = mod(lambda * lambda - P.x - Q.x, p);
        let y3 = mod(lambda * (P.x - x3) - P.y, p);

        return { x: x3, y: y3 };
    }

    function scalarMultiply(k, basePoint) {
        let current = null;
        let addend = basePoint;
        let steps = [];

        for (let i = 1; i <= k; i++) {
            current = pointAdd(current, addend);
            steps.push({ step: i, point: current ? { ...current } : "Infinity" });
        }
        return steps;
    }

    function drawGrid(highlightPoint = null) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let size = canvas.width;
        let stepSize = size / p;

        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 1;
        for (let i = 0; i <= p; i++) {
            ctx.beginPath();
            ctx.moveTo(i * stepSize, 0);
            ctx.lineTo(i * stepSize, size);
            ctx.stroke();

            ctx.beginPath();
            ctx.moveTo(0, i * stepSize);
            ctx.lineTo(size, i * stepSize);
            ctx.stroke();
        }

        for (let x = 0; x < p; x++) {
            let rhs = mod(Math.pow(x, 3) + b, p);
            for (let y = 0; y < p; y++) {
                if (mod(y * y, p) === rhs) {
                    ctx.fillStyle = '#475569';
                    ctx.beginPath();
                    ctx.arc(x * stepSize + stepSize / 2, size - (y * stepSize + stepSize / 2), 5.5, 0, 2 * Math.PI);
                    ctx.fill();
                }
            }
        }

        if (highlightPoint && highlightPoint !== "Infinity") {
            ctx.fillStyle = '#38bdf8';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(highlightPoint.x * stepSize + stepSize / 2, size - (highlightPoint.y * stepSize + stepSize / 2), 8.5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    function getInputs() {
        const k = parseInt(inputK.value);
        const gx = parseInt(inputGx.value);
        const gy = parseInt(inputGy.value);

        if (isNaN(k) || k < 1) {
            alert("Please enter a valid value for k (>= 1)");
            return null;
        }
        if (isNaN(gx) || isNaN(gy) || gx < 0 || gx >= p || gy < 0 || gy >= p) {
            alert(`Coordinates for G must be between 0 and ${p - 1}`);
            return null;
        }
        if (!isValidPoint(gx, gy)) {
            alert(`Error: Point G (${gx}, ${gy}) does not belong to curve y^2 = x^3 + 7 (mod 17)!`);
            return null;
        }

        return { k, G: { x: gx, y: gy } };
    }

    btnCalculate.addEventListener('click', () => {
        const input = getInputs();
        if (!input) return;

        const { k, G } = input;
        const steps = scalarMultiply(k, G);

        logOutput.innerHTML = `<strong>Calculation for k = ${k} (Base G = (${G.x}, ${G.y})):</strong><br><br>`;
        
        steps.forEach(s => {
            let ptStr = s.point === "Infinity" ? "Infinity" : `(${s.point.x}, ${s.point.y})`;
            logOutput.innerHTML += `&bull; <strong>${s.step}G</strong> = ${ptStr}<br>`;
        });

        let finalPoint = steps[steps.length - 1].point;
        drawGrid(finalPoint);
        logOutput.innerHTML += `<br><strong>TOY PUBLIC KEY (Q):</strong> ${finalPoint === "Infinity" ? "Infinity" : `(${finalPoint.x},${finalPoint.y})`}`;
    });

    let animationId = null;
    btnAnimate.addEventListener('click', () => {
        const input = getInputs();
        if (!input) return;

        if (animationId) clearInterval(animationId);

        const { k, G } = input;
        const steps = scalarMultiply(k, G);
        let currentIndex = 0;

        logOutput.innerHTML = `<strong>Starting step-by-step animation (k = ${k}, G = (${G.x}, ${G.y}))...</strong><br><br>`;

        animationId = setInterval(() => {
            if (currentIndex >= steps.length) {
                clearInterval(animationId);
                return;
            }

            let s = steps[currentIndex];
            let ptStr = s.point === "Infinity" ? "Infinity" : `(${s.point.x}, ${s.point.y})`;
            logOutput.innerHTML += `Step ${s.step}G = ${ptStr}<br>`;
            logOutput.scrollTop = logOutput.scrollHeight;

            drawGrid(s.point);
            currentIndex++;
        }, 600);
    });

    btnStats.addEventListener('click', () => {
        const input = getInputs();
        if (!input) return;

        const { G } = input;
        
        let current = null;
        let visitedPoints = [];
        let xFreq = {};

        for (let i = 1; i <= 20; i++) {
            current = pointAdd(current, G);
            if (current === null) {
                visitedPoints.push({ step: i, point: "Infinity" });
                break;
            } else {
                visitedPoints.push({ step: i, point: { ...current } });
                xFreq[current.x] = (xFreq[current.x] || 0) + 1;
            }
        }

        let html = `<strong>=== STATISTICAL ANALYSIS (G = (${G.x}, ${G.y})) ===</strong><br><br>`;
        html += `<strong>1. Cyclicity & Subgroup:</strong><br>`;
        html += `Sequence repeats every ${visitedPoints.length} steps.<br><br>`;
        
        html += `<strong>2. Coordinate Frequency (x):</strong><br>`;
        for (let x in xFreq) {
            html += `- x = ${x}: ${xFreq[x]} times<br>`;
        }

        logOutput.innerHTML = html;
        drawGrid();
    });

    drawGrid();
});