const API_URL = "/api/proxy";

const $ = (id) => document.getElementById(id);
const screens = {
  login: $("loginScreen"),
  menu: $("menuScreen"),
  game: $("gameScreen"),
  pause: $("pauseScreen"),
  over: $("gameOverScreen")
};

let currentUser = null;
let game = null;

function showOnly(name) {
  Object.values(screens).forEach(el => el.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

async function api(action, payload = {}) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...payload })
  });
  const data = await response.json().catch(() => ({ ok:false, message:"Respons server tidak valid." }));
  if (!response.ok || !data.ok) throw new Error(data.message || "Permintaan gagal.");
  return data;
}

function renderLeaderboard(containerId, rows) {
  const el = $(containerId);
  if (!rows || !rows.length) {
    el.innerHTML = '<div class="empty">Belum ada skor.</div>';
    return;
  }
  el.innerHTML = rows.map((r, i) => `
    <div class="row">
      <div class="rank">#${i + 1}</div>
      <div>${escapeHtml(r.username)}</div>
      <div class="score-cell">${Number(r.score) || 0}</div>
    </div>
  `).join("");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#039;"
  }[ch]));
}

function showLoginForm() {
  $("loginForm").classList.remove("hidden");
  $("signupForm").classList.add("hidden");
  $("loginStatus").textContent = "";
  $("signupStatus").textContent = "";
}

function showSignupForm() {
  $("loginForm").classList.add("hidden");
  $("signupForm").classList.remove("hidden");
  $("signupStatus").textContent = "";
  $("signupUsername").focus();
}

async function loadLeaderboard() {
  const targets = ["loginLeaderboard", "menuLeaderboard", "pauseLeaderboard", "resultLeaderboard"];
  targets.forEach(id => { if ($(id)) $(id).innerHTML = '<div class="empty">Memuat...</div>'; });
  try {
    const data = await api("leaderboard");
    targets.forEach(id => { if ($(id)) renderLeaderboard(id, data.leaderboard); });
  } catch (err) {
    targets.forEach(id => { if ($(id)) $(id).innerHTML = '<div class="empty">Leaderboard gagal dimuat.</div>'; });
    console.error(err);
  }
}

$("showSignupBtn").addEventListener("click", showSignupForm);
$("backToLoginBtn").addEventListener("click", showLoginForm);

$("signupForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = $("signupUsername").value.trim();
  const password = $("signupPassword").value;
  const confirmPassword = $("signupPasswordConfirm").value;
  const btn = $("signupBtn");

  if (!username || !password || !confirmPassword) {
    $("signupStatus").textContent = "Semua data wajib diisi.";
    return;
  }
  if (!/^[A-Za-z0-9_]+$/.test(username)) {
    $("signupStatus").textContent = "Username hanya boleh huruf, angka, dan _.";
    return;
  }
  if (password !== confirmPassword) {
    $("signupStatus").textContent = "Konfirmasi password tidak sama.";
    return;
  }

  $("signupStatus").textContent = "Membuat akun...";
  btn.disabled = true;
  btn.textContent = "CREATING...";

  try {
    const data = await api("register", { username, password });
    $("signupStatus").textContent = "Akun berhasil dibuat. Silakan Sign In.";
    $("username").value = username;
    $("password").value = "";
    $("signupPassword").value = "";
    $("signupPasswordConfirm").value = "";
    setTimeout(() => {
      showLoginForm();
      $("password").focus();
      $("loginStatus").textContent = data.message || "Akun berhasil dibuat. Silakan Sign In.";
    }, 400);
  } catch (err) {
    $("signupStatus").textContent = err.message || "Gagal membuat akun.";
  } finally {
    btn.disabled = false;
    btn.textContent = "CREATE ACCOUNT";
  }
});

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = $("username").value.trim();
  const password = $("password").value;
  const btn = $("loginBtn");

  if (!username || !password) {
    $("loginStatus").textContent = "Username dan password wajib diisi.";
    return;
  }

  $("loginStatus").textContent = "Sedang sign in...";
  if (btn) {
    btn.disabled = true;
    btn.textContent = "SIGNING IN...";
  }

  try {
    const data = await api("login", { username, password });
    currentUser = { username: data.username };
    $("playerName").textContent = currentUser.username;
    $("hudUser").textContent = currentUser.username;
    $("loginStatus").textContent = "";
    $("password").value = "";
    showOnly("menu");
    loadLeaderboard();
  } catch (err) {
    $("loginStatus").textContent = err.message || "Username atau password salah.";
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = "SIGN IN";
    }
  }
});

$("startBtn").addEventListener("click", () => startGame());
$("refreshLoginBoard").addEventListener("click", loadLeaderboard);
$("refreshMenuBoard").addEventListener("click", loadLeaderboard);
$("refreshPauseBoard").addEventListener("click", loadLeaderboard);

$("logoutBtn").addEventListener("click", () => {
  if (game) game.stop();
  game = null;
  currentUser = null;
  $("loginForm").reset();
  $("loginStatus").textContent = "";
  showOnly("login");
  loadLeaderboard();
});

$("pauseBtn").addEventListener("click", () => {
  if (!game || game.over) return;
  game.pause();
  screens.pause.classList.remove("hidden");
  loadLeaderboard();
});

$("resumeBtn").addEventListener("click", () => {
  screens.pause.classList.add("hidden");
  game?.resume();
});

$("quitBtn").addEventListener("click", () => {
  screens.pause.classList.add("hidden");
  if (game) game.stop();
  game = null;
  showOnly("menu");
  loadLeaderboard();
});

$("pauseBoardBtn").addEventListener("click", loadLeaderboard);

$("playAgainBtn").addEventListener("click", () => {
  screens.over.classList.add("hidden");
  startGame();
});

$("resultMenuBtn").addEventListener("click", () => {
  screens.over.classList.add("hidden");
  showOnly("menu");
  loadLeaderboard();
});

function startGame() {
  if (!currentUser) return;
  screens.pause.classList.add("hidden");
  screens.over.classList.add("hidden");
  showOnly("game");
  game?.stop();
  game = new KillTheBox($("gameCanvas"));
  game.start();
}

/* =========================
   GAME ENGINE
   ========================= */
class KillTheBox {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.running = false;
    this.paused = false;
    this.over = false;
    this.score = 0;
    this.spears = 20;
    this.maxSpears = 20;
    this.cheatUsed = false;
    this.boxes = [];
    this.spearsFlying = [];
    this.particles = [];
    this.spawnTimer = 0;
    this.lastTime = 0;
    this.drag = null;
    this.difficulty = 1;
    this.boundResize = () => this.resize();
    this.boundPointerDown = e => this.pointerDown(e);
    this.boundPointerMove = e => this.pointerMove(e);
    this.boundPointerUp = e => this.pointerUp(e);
    this.boundKey = e => this.keyDown(e);
  }

  start() {
    this.running = true;
    this.paused = false;
    this.over = false;
    this.resize();
    window.addEventListener("resize", this.boundResize);
    this.canvas.addEventListener("pointerdown", this.boundPointerDown);
    this.canvas.addEventListener("pointermove", this.boundPointerMove);
    window.addEventListener("pointerup", this.boundPointerUp);
    window.addEventListener("keydown", this.boundKey);
    $("score").textContent = this.score;
    $("spears").textContent = this.spears;
    this.lastTime = performance.now();
    requestAnimationFrame(t => this.loop(t));
  }

  stop() {
    this.running = false;
    window.removeEventListener("resize", this.boundResize);
    this.canvas.removeEventListener("pointerdown", this.boundPointerDown);
    this.canvas.removeEventListener("pointermove", this.boundPointerMove);
    window.removeEventListener("pointerup", this.boundPointerUp);
    window.removeEventListener("keydown", this.boundKey);
  }

  pause() {
    this.paused = true;
  }

  resume() {
    if (!this.over) {
      this.paused = false;
      this.lastTime = performance.now();
      requestAnimationFrame(t => this.loop(t));
    }
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = this.canvas.getBoundingClientRect();
    this.w = Math.max(320, rect.width);
    this.h = Math.max(320, rect.height);
    this.canvas.width = Math.floor(this.w * dpr);
    this.canvas.height = Math.floor(this.h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  }

  loop(now) {
    if (!this.running || this.over || this.paused) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.035);
    this.lastTime = now;
    this.update(dt);
    this.draw();
    requestAnimationFrame(t => this.loop(t));
  }

  update(dt) {
    this.spawnTimer -= dt;
    this.difficulty = Math.min(3, 1 + this.score / 400);
    const spawnEvery = Math.max(0.20, 0.62 - this.difficulty * 0.10);
    if (this.spawnTimer <= 0) {
      this.spawnBox();
      this.spawnTimer = spawnEvery;
    }

    for (const b of this.boxes) {
      b.x -= b.speed * dt;
      b.y += Math.sin((b.age += dt) * 4 + b.phase) * 8 * dt;
      if (b.x + b.size < 0) b.dead = true;
    }

    for (const s of this.spearsFlying) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      for (const b of this.boxes) {
        if (!b.dead && circleRect(s.x, s.y, 5, b.x, b.y, b.size, b.size)) {
          b.dead = true;
          s.dead = true;
          this.score += 20;
          $("score").textContent = this.score;
          this.explode(b.x + b.size/2, b.y + b.size/2);
          break;
        }
      }
      if (s.x > this.w + 80 || s.y < -80 || s.y > this.h + 80 || s.life <= 0) s.dead = true;
    }

    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 260 * dt;
      p.life -= dt;
    }

    this.boxes = this.boxes.filter(b => !b.dead);
    this.spearsFlying = this.spearsFlying.filter(s => !s.dead);
    this.particles = this.particles.filter(p => p.life > 0);

    if (this.spears <= 0 && this.spearsFlying.length === 0) {
      this.finish("TOMBAK HABIS!");
    }
  }

  spawnBox() {
    const size = Math.max(35, Math.min(70, this.w * 0.07));
    const y = 70 + Math.random() * Math.max(40, this.h - size - 150);
    const speed = Math.min(470, 190 + Math.random() * 120 + this.difficulty * 70);
    this.boxes.push({
      x: this.w + size + Math.random() * 80,
      y, size, speed, age: 0, phase: Math.random() * Math.PI * 2, dead:false
    });
  }

  pointerDown(e) {
    if (this.paused || this.over || this.spears <= 0) return;
    e.preventDefault();
    const p = this.point(e);
    this.drag = { x: p.x, y: p.y, startX: p.x, startY: p.y, active:true };
  }

  pointerMove(e) {
    if (!this.drag) return;
    const p = this.point(e);
    this.drag.x = p.x;
    this.drag.y = p.y;
  }

  pointerUp(e) {
    if (!this.drag) return;
    const p = this.point(e);
    this.drag.x = p.x;
    this.drag.y = p.y;
    const dx = p.x - this.w * 0.10;
    const dy = p.y - (this.h * 0.50);
    // Manual aim: spear starts from left side, and follows where the player points.
    const len = Math.hypot(dx, dy) || 1;
    const speed = Math.min(900, 520 + Math.hypot(p.x - this.drag.startX, p.y - this.drag.startY) * 1.4);
    this.throwSpear(dx / len * speed, dy / len * speed);
    this.drag = null;
  }

  throwSpear(vx, vy) {
    if (this.spears <= 0) return;
    this.spears--;
    $("spears").textContent = this.spears;
    this.spearsFlying.push({
      x: this.w * 0.10, y: this.h * 0.50, vx, vy, life: 3, dead:false
    });
  }

  point(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  keyDown(e) {
    if (e.key === "Escape") {
      if (!this.paused) $("pauseBtn").click();
      else $("resumeBtn").click();
      return;
    }
    // Cheat: ketik Sukiliar saat bermain.
    if (!this.cheatBuffer) this.cheatBuffer = "";
    if (e.key.length === 1) {
      this.cheatBuffer += e.key;
      if (this.cheatBuffer.length > 20) this.cheatBuffer = this.cheatBuffer.slice(-20);
      if (this.cheatBuffer.toLowerCase().endsWith("sukiliar") && !this.cheatUsed) {
        this.spears = 50;
        this.cheatUsed = true;
        $("spears").textContent = this.spears;
        $("gameMessage").textContent = "CHEAT AKTIF: 50 TOMBAK!";
        $("gameMessage").classList.remove("hidden");
        setTimeout(() => $("gameMessage").classList.add("hidden"), 1300);
      }
    }
  }

  explode(x, y) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = 60 + Math.random() * 230;
      this.particles.push({
        x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.35+Math.random()*.4
      });
    }
  }

  draw() {
    const c = this.ctx;
    c.clearRect(0,0,this.w,this.h);

    // Background
    const grad = c.createLinearGradient(0,0,0,this.h);
    grad.addColorStop(0, "#07111f");
    grad.addColorStop(1, "#0b1d2f");
    c.fillStyle = grad;
    c.fillRect(0,0,this.w,this.h);

    // Grid
    c.strokeStyle = "rgba(255,255,255,.05)";
    c.lineWidth = 1;
    for (let x=0; x<this.w; x+=50) { c.beginPath(); c.moveTo(x,0); c.lineTo(x,this.h); c.stroke(); }
    for (let y=0; y<this.h; y+=50) { c.beginPath(); c.moveTo(0,y); c.lineTo(this.w,y); c.stroke(); }

    // Player launcher
    const sx = this.w * .10, sy = this.h * .50;
    c.fillStyle = "#9ca3af";
    c.fillRect(sx-20, sy-7, 45, 14);
    c.fillStyle = "#374151";
    c.fillRect(sx-8, sy+7, 16, 28);

    // Aim line
    if (this.drag) {
      c.strokeStyle = "rgba(255,255,255,.45)";
      c.setLineDash([7,7]);
      c.beginPath(); c.moveTo(sx,sy); c.lineTo(this.drag.x,this.drag.y); c.stroke();
      c.setLineDash([]);
    }

    // Boxes
    for (const b of this.boxes) {
      c.save();
      c.translate(b.x + b.size/2, b.y + b.size/2);
      c.rotate(Math.sin(b.age * 2) * .06);
      c.fillStyle = "#dc2626";
      c.fillRect(-b.size/2, -b.size/2, b.size, b.size);
      c.strokeStyle = "#fecaca";
      c.lineWidth = 3;
      c.strokeRect(-b.size/2, -b.size/2, b.size, b.size);
      c.fillStyle = "rgba(0,0,0,.28)";
      c.fillRect(-b.size*.18, -b.size*.18, b.size*.36, b.size*.36);
      c.restore();
    }

    // Spears
    for (const s of this.spearsFlying) {
      const a = Math.atan2(s.vy, s.vx);
      c.save();
      c.translate(s.x,s.y);
      c.rotate(a);
      c.strokeStyle = "#f3f4f6";
      c.lineWidth = 5;
      c.beginPath(); c.moveTo(-26,0); c.lineTo(16,0); c.stroke();
      c.fillStyle = "#e5e7eb";
      c.beginPath(); c.moveTo(26,0); c.lineTo(12,-7); c.lineTo(12,7); c.closePath(); c.fill();
      c.restore();
    }

    // Particles
    for (const p of this.particles) {
      c.globalAlpha = Math.max(0,p.life/.7);
      c.fillStyle = "#fbbf24";
      c.fillRect(p.x,p.y,4,4);
    }
    c.globalAlpha = 1;
  }

  finish(reason) {
    if (this.over) return;
    this.over = true;
    this.running = false;
    $("resultTitle").textContent = reason || "GAME OVER";
    $("finalScore").textContent = this.score;
    $("saveStatus").textContent = "Menyimpan skor...";
    screens.over.classList.remove("hidden");

    api("saveScore", { username: currentUser.username, score: this.score })
      .then(() => {
        $("saveStatus").textContent = "Skor berhasil disimpan.";
        loadLeaderboard();
      })
      .catch(err => {
        $("saveStatus").textContent = "Skor gagal disimpan: " + err.message;
        loadLeaderboard();
      });
  }
}

function circleRect(cx, cy, r, rx, ry, rw, rh) {
  const x = Math.max(rx, Math.min(cx, rx + rw));
  const y = Math.max(ry, Math.min(cy, ry + rh));
  return (cx-x)*(cx-x) + (cy-y)*(cy-y) <= r*r;
}

// Leaderboard pertama kali tampil di halaman login.
loadLeaderboard();
