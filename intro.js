const TYPED_MESSAGE = "Welcome to Swayam's Digital Universe";

const canvas = document.getElementById("particleCanvas");
const typedText = document.getElementById("typedText");
const enterBtn = document.getElementById("enterBtn");
const skipBtn = document.getElementById("skipBtn");
const introScreen = document.getElementById("introScreen");
const audioToggle = document.getElementById("audioToggle");
const parallaxLayer = document.getElementById("parallaxLayer");

const ctx = canvas.getContext("2d", { alpha: true });
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let particles = [];
let typingIndex = 0;
let typingDone = false;
let typingInterval;
let rafId;

let audioCtx;
let masterGain;
let droneOsc;
let lfo;
let lfoGain;
let ambientOn = false;

function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function createParticles() {
    const isMobile = window.innerWidth < 768;
    const count = isMobile ? 36 : 60;
    particles = Array.from({ length: count }, () => ({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.8 + 0.7,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.18,
        glow: Math.random() * 0.45 + 0.2,
        hue: Math.random() > 0.45 ? "cyan" : "pink",
    }));
}

function drawParticles() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -4) p.x = window.innerWidth + 4;
        if (p.x > window.innerWidth + 4) p.x = -4;
        if (p.y < -4) p.y = window.innerHeight + 4;
        if (p.y > window.innerHeight + 4) p.y = -4;

        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 8);
        if (p.hue === "pink") {
            gradient.addColorStop(0, `rgba(255, 111, 207, ${p.glow})`);
            gradient.addColorStop(1, "rgba(255, 111, 207, 0)");
        } else {
            gradient.addColorStop(0, `rgba(105, 233, 255, ${p.glow})`);
            gradient.addColorStop(1, "rgba(105, 233, 255, 0)");
        }

        ctx.beginPath();
        ctx.fillStyle = gradient;
        ctx.arc(p.x, p.y, p.r * 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = p.hue === "pink" ? "rgba(255, 194, 235, 0.8)" : "rgba(198, 240, 255, 0.82)";
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
    }

    rafId = requestAnimationFrame(drawParticles);
}

function showEnterButton() {
    enterBtn.disabled = false;
    enterBtn.classList.add("ready");
}

function runTypingAnimation() {
    if (reducedMotion) {
        typedText.textContent = TYPED_MESSAGE;
        typingDone = true;
        showEnterButton();
        return;
    }

    typingInterval = window.setInterval(() => {
        typingIndex += 1;
        typedText.textContent = TYPED_MESSAGE.slice(0, typingIndex);

        if (typingIndex >= TYPED_MESSAGE.length) {
            window.clearInterval(typingInterval);
            typingDone = true;
            showEnterButton();
        }
    }, 65);
}

function skipTyping() {
    if (typingDone) return;
    window.clearInterval(typingInterval);
    typedText.textContent = TYPED_MESSAGE;
    typingDone = true;
    showEnterButton();
}

function transitionToHome() {
    introScreen.classList.add("fade-out");
    window.setTimeout(() => {
        window.location.href = "home.html";
    }, 800);
}

function setupParallax() {
    if (reducedMotion) return;

    window.addEventListener("mousemove", (event) => {
        const xNorm = (event.clientX / window.innerWidth - 0.5) * 2;
        const yNorm = (event.clientY / window.innerHeight - 0.5) * 2;
        parallaxLayer.style.transform = `translate3d(${xNorm * 8}px, ${yNorm * 8}px, 0)`;
    });

    window.addEventListener("mouseleave", () => {
        parallaxLayer.style.transform = "translate3d(0, 0, 0)";
    });
}

function initAmbientAudio() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();

        masterGain = audioCtx.createGain();
        masterGain.gain.value = 0;
        masterGain.connect(audioCtx.destination);

        droneOsc = audioCtx.createOscillator();
        droneOsc.type = "sine";
        droneOsc.frequency.value = 88;

        lfo = audioCtx.createOscillator();
        lfo.type = "sine";
        lfo.frequency.value = 0.08;

        lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 10;

        lfo.connect(lfoGain);
        lfoGain.connect(droneOsc.frequency);

        droneOsc.connect(masterGain);

        droneOsc.start();
        lfo.start();
    }
}

async function toggleAmbientAudio() {
    initAmbientAudio();
    if (audioCtx.state === "suspended") {
        await audioCtx.resume();
    }

    ambientOn = !ambientOn;
    const time = audioCtx.currentTime;
    masterGain.gain.cancelScheduledValues(time);
    masterGain.gain.linearRampToValueAtTime(ambientOn ? 0.02 : 0, time + 0.6);

    audioToggle.textContent = ambientOn ? "Ambient: On" : "Ambient: Off";
    audioToggle.setAttribute("aria-pressed", String(ambientOn));
}

function setupEvents() {
    skipBtn.addEventListener("click", skipTyping);
    enterBtn.addEventListener("click", transitionToHome);
    audioToggle.addEventListener("click", () => {
        toggleAmbientAudio().catch(() => {
            audioToggle.textContent = "Ambient: Unavailable";
        });
    });

    window.addEventListener("resize", () => {
        sizeCanvas();
        createParticles();
    });

    document.addEventListener("visibilitychange", () => {
        if (document.hidden) {
            cancelAnimationFrame(rafId);
        } else if (!reducedMotion) {
            drawParticles();
        }
    });
}

function init() {
    sizeCanvas();
    createParticles();
    runTypingAnimation();
    setupParallax();
    setupEvents();

    if (!reducedMotion) {
        drawParticles();
    }
}

init();
