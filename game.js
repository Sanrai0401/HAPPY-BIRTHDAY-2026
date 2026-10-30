"use strict";

const $ = id => document.getElementById(id);

const screens = [
  "title-screen",
  "mode-screen",
  "game-screen",
  "gift-screen",
  "letter-screen",
  "result-screen"
];

const TOTAL = 20;

let currentMode = "birthday";
let extinguished = 0;
let startedAt = 0;
let timerInterval = null;
let animationFrame = null;
let candles = [];
let giftsOpened = 0;

let micStream = null;
let micContext = null;
let micAnalyser = null;
let micFrame = null;
let lastBlowAt = 0;

let gameEnded = false;
let gameStarted = false;

const modeInfo = {
  birthday: {
    label: "BIRTHDAY MODE",
    title: "お誕生日おめでとう！",
    instruction: "20本のろうそくを全部消してね。",
    bgm: "birthday"
  },
  time: {
    label: "TIME ATTACK",
    title: "20本を消しきろう！",
    instruction: "動くろうそくをタップして、最速記録を目指そう。",
    bgm: "time"
  },
  endless: {
    label: "ENDLESS MODE",
    title: "どこまで消せるかな？",
    instruction: "ろうそくを消すと、新しいろうそくが現れるよ。",
    bgm: "endless"
  },
  breath: {
    label: "BREATH MODE",
    title: "息を吹いて消そう！",
    instruction: "マイクに向かって優しく息を吹いてね。",
    bgm: "breath"
  }
};


/* --------------------------------
   音声関数の安全な呼び出し
-------------------------------- */

function sound(name, ...args) {
  const fn = window[name];

  if (typeof fn !== "function") {
    console.warn(`${name} が読み込まれていません。`);
    return;
  }

  try {
    fn(...args);
  } catch (error) {
    console.warn(`音声処理エラー: ${name}`, error);
  }
}

function initializeGameAudio() {
  sound("initializeAudio");
}

function startBGM(name) {
  sound("startBGM", name);
}

function stopBGM() {
  sound("stopBGM");
}

function playStartSound() {
  sound("playStartSound");
}

function playCandleSound() {
  sound("playCandleSound");
}

function playGiftSound() {
  sound("playGiftSound");
}

function playLetterSound() {
  sound("playLetterSound");
}

function playResultMusic() {
  sound("playResultMusic");
}

function playGameOverSound() {
  sound("playGameOverSound");
}


/* --------------------------------
   画面切り替え
-------------------------------- */

function showScreen(id) {
  screens.forEach(screen => {
    $(screen).classList.toggle("active", screen === id);
  });
}


/* --------------------------------
   タイマー
-------------------------------- */

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function elapsedSeconds() {
  if (!startedAt) return 0;
  return (Date.now() - startedAt) / 1000;
}

function updateTimer() {
  $("timer-value").textContent =
    `${elapsedSeconds().toFixed(1)}秒`;
}

function startTimer() {
  startedAt = Date.now();
  stopTimer();

  timerInterval = setInterval(updateTimer, 100);
  updateTimer();
}


/* --------------------------------
   マイク停止
-------------------------------- */

function cleanupMic() {
  if (micFrame !== null) {
    cancelAnimationFrame(micFrame);
    micFrame = null;
  }

  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }

  if (micContext) {
    micContext.close().catch(() => {});
    micContext = null;
  }

  micAnalyser = null;

  $("mic-button").disabled = false;
  $("mic-button").textContent = "🎙️ マイクを使う";
}


/* --------------------------------
   ゲーム処理の停止
-------------------------------- */

function clearGameLoops() {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }

  stopTimer();
}

function goModeSelect() {
  gameEnded = true;
  gameStarted = false;

  clearGameLoops();
  cleanupMic();
  stopBGM();

  showScreen("mode-screen");
}


/* --------------------------------
   タイトル・モード選択
-------------------------------- */

$("start-button").addEventListener("click", () => {
  initializeGameAudio();
  playStartSound();

  stopBGM();

  showScreen("mode-screen");
  startBGM("menu");
});

$("back-title").addEventListener("click", () => {
  gameEnded = true;
  gameStarted = false;

  clearGameLoops();
  cleanupMic();
  stopBGM();

  showScreen("title-screen");
  startBGM("title");
});

document.querySelectorAll(".mode-card").forEach(button => {
  button.addEventListener("click", () => {
    startMode(button.dataset.mode);
  });
});

$("game-back-button").addEventListener("click", goModeSelect);
$("result-mode-button").addEventListener("click", goModeSelect);
$("letter-mode-button").addEventListener("click", goModeSelect);

$("retry-button").addEventListener("click", () => {
  startMode(currentMode);
});

$("stop-button").addEventListener("click", () => {
  if (currentMode === "endless") finishEndless();
  if (currentMode === "breath") finishBreath();
});

$("mic-button").addEventListener("click", startMicrophone);


/* --------------------------------
   ゲーム開始
-------------------------------- */

function startMode(mode) {
  gameEnded = true;
  gameStarted = false;

  clearGameLoops();
  cleanupMic();
  stopBGM();

  currentMode = mode;
  extinguished = 0;
  giftsOpened = 0;
  startedAt = 0;
  candles = [];

  gameEnded = false;
  gameStarted = true;
  lastBlowAt = 0;

  $("cake").classList.remove("fly-away");
  $("cake").style.opacity = "1";
  $("cake").style.transition = "";

  $("candles").innerHTML = "";

  $("game-message").textContent =
    mode === "breath"
      ? "マイクを準備してね。"
      : "ろうそくをタップして消してね！";

  $("mode-eyebrow").textContent = modeInfo[mode].label;
  $("game-heading").textContent = modeInfo[mode].title;
  $("game-instruction").textContent = modeInfo[mode].instruction;

  $("stat-label").textContent =
    mode === "endless" || mode === "breath"
      ? "消した本数"
      : "残り";

  $("stat-value").textContent =
    mode === "endless" || mode === "breath"
      ? "0本"
      : "20本";

  $("timer-value").textContent = "0.0秒";

  $("mic-button").classList.toggle("hidden", mode !== "breath");
  $("stop-button").classList.toggle(
    "hidden",
    mode !== "endless" && mode !== "breath"
  );
  $("mic-note").classList.toggle("hidden", mode !== "breath");

  document.querySelectorAll(".gift-box").forEach(box => {
    box.classList.remove("opened");
    box.disabled = false;
    box.textContent = "🎁";
  });

  $("gift-message").textContent = "気になる箱を選んでね！";
  $("gift-count").textContent = "プレゼント発見：0 / 3";

  $("letter").classList.add("hidden");
  $("open-letter").classList.remove("hidden");
  $("ending-message").classList.add("hidden");
  $("letter-mode-button").classList.add("hidden");

  $("result-stats").innerHTML = "";

  showScreen("game-screen");
  startBGM(modeInfo[mode].bgm);

  requestAnimationFrame(() => {
    if (gameEnded || !gameStarted) return;

    if (mode === "birthday" || mode === "time") {
      createCandles(TOTAL);
      startTimer();
    }

    if (mode === "endless") {
      createCandles(8);
      startTimer();

      $("game-message").textContent =
        "消した本数を増やしていこう！終了すると結果が出るよ。";
    }

    if (mode === "breath") {
      createCandles(8);

      $("game-message").textContent =
        "「マイクを使う」を押して、息を吹いてね。";
    }

    animateCandles();
  });
}


/* --------------------------------
   ろうそく配置
-------------------------------- */

function createCandles(count) {
  const field = $("playfield");
  const container = $("candles");

  const width = field.clientWidth || 800;
  const height = field.clientHeight || 400;

  const usableHeight = Math.max(100, height - 125);

  const columns = Math.ceil(
    Math.sqrt(count * width / usableHeight)
  );

  const rows = Math.ceil(count / columns);

  const cellWidth = width / columns;
  const cellHeight = usableHeight / rows;

  for (let i = 0; i < count; i++) {
    const column = i % columns;
    const row = Math.floor(i / columns);

    const el = document.createElement("button");

    el.className = "candle";
    el.type = "button";
    el.textContent = "🕯️";
    el.setAttribute("aria-label", "ろうそくを消す");

    const centerX = column * cellWidth + cellWidth / 2;
    const centerY = row * cellHeight + cellHeight / 2;

    const x = centerX - 23 +
      (Math.random() - 0.5) * cellWidth * 0.25;

    const y = centerY - 25 +
      (Math.random() - 0.5) * cellHeight * 0.25;

    const angle = Math.random() * Math.PI * 2;
    const speed = 0.6 + Math.random() * 0.8;

    const candle = {
      el,
      x: Math.max(3, Math.min(width - 49, x)),
      y: Math.max(3, Math.min(usableHeight - 58, y)),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      alive: true
    };

    el.addEventListener("click", () => {
      if (currentMode !== "breath") {
        extinguishCandle(candle);
      }
    });

    if (currentMode === "breath") {
      el.style.pointerEvents = "none";
    }

    container.appendChild(el);
    candles.push(candle);
  }

  positionCandles();
}


/* --------------------------------
   位置反映
-------------------------------- */

function positionCandles() {
  candles.forEach(candle => {
    if (!candle.alive) return;

    candle.el.style.left = `${candle.x}px`;
    candle.el.style.top = `${candle.y}px`;
  });
}


/* --------------------------------
   ろうそく移動
-------------------------------- */

function animateCandles() {
  if (gameEnded || !gameStarted) return;

  const field = $("playfield");
  const width = field.clientWidth;
  const height = Math.max(100, field.clientHeight - 125);

  candles.forEach(candle => {
    if (!candle.alive) return;

    candle.x += candle.vx;
    candle.y += candle.vy;

    if (candle.x <= 3 || candle.x >= width - 49) {
      candle.vx *= -1;
    }

    if (candle.y <= 3 || candle.y >= height - 58) {
      candle.vy *= -1;
    }

    if (Math.random() < 0.008) {
      candle.vx += (Math.random() - 0.5) * 0.4;
      candle.vy += (Math.random() - 0.5) * 0.3;
    }

    candle.vx = Math.max(-2, Math.min(2, candle.vx));
    candle.vy = Math.max(-1.7, Math.min(1.7, candle.vy));

    candle.x = Math.max(3, Math.min(width - 49, candle.x));
    candle.y = Math.max(3, Math.min(height - 58, candle.y));
  });

  positionCandles();

  animationFrame = requestAnimationFrame(animateCandles);
}


/* --------------------------------
   新しいろうそく
-------------------------------- */

function addOneCandle() {
  if (gameEnded) return;

  const field = $("playfield");
  const width = field.clientWidth;
  const height = Math.max(100, field.clientHeight - 125);

  const el = document.createElement("button");

  el.className = "candle";
  el.type = "button";
  el.textContent = "🕯️";
  el.setAttribute("aria-label", "ろうそくを消す");

  const angle = Math.random() * Math.PI * 2;
  const speed = 0.7 + Math.random() * 0.8;

  const candle = {
    el,
    x: Math.random() * Math.max(1, width - 49),
    y: Math.random() * Math.max(1, height - 58),
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    alive: true
  };

  el.addEventListener("click", () => {
    if (currentMode !== "breath") {
      extinguishCandle(candle);
    }
  });

  if (currentMode === "breath") {
    el.style.pointerEvents = "none";
  }

  $("candles").appendChild(el);
  candles.push(candle);
}


/* --------------------------------
   ろうそくを消す
-------------------------------- */

function extinguishCandle(candle) {
  if (!candle.alive || gameEnded) return;

  candle.alive = false;

  candle.el.classList.add("extinguished");
  candle.el.textContent = "💨";
  candle.el.disabled = true;

  extinguished++;

  playCandleSound();

  if (currentMode === "birthday" || currentMode === "time") {
    const remaining = TOTAL - extinguished;

    $("stat-value").textContent = `${remaining}本`;

    $("game-message").textContent =
      remaining === 0
        ? "全部消えたよ！おめでとう！"
        : `いい感じ！残り ${remaining} 本`;

    if (remaining === 0) {
      gameEnded = true;
      clearGameLoops();
      stopBGM();

      playResultMusic();

      if (currentMode === "birthday") {
        setTimeout(() => {
          cleanupMic();

          showScreen("gift-screen");
          startBGM("gift");
        }, 900);
      } else {
        setTimeout(() => showResult("time"), 700);
      }
    }

    return;
  }

  $("stat-value").textContent = `${extinguished}本`;
  $("game-message").textContent = `消した本数：${extinguished}本！`;

  if (currentMode === "endless" || currentMode === "breath") {
    setTimeout(addOneCandle, 180);
  }
}


/* --------------------------------
   エンドレス終了
-------------------------------- */

function finishEndless() {
  if (currentMode !== "endless" || gameEnded) return;

  gameEnded = true;
  clearGameLoops();
  stopBGM();

  playResultMusic();
  showResult("endless");
}


/* --------------------------------
   ブレス終了
-------------------------------- */

function finishBreath() {
  if (currentMode !== "breath" || gameEnded) return;

  gameEnded = true;
  clearGameLoops();
  cleanupMic();
  stopBGM();

  playResultMusic();
  showResult("breath-stop");
}


/* --------------------------------
   結果表示
-------------------------------- */

function addResultStat(label, value) {
  const div = document.createElement("div");
  div.className = "result-stat";

  const small = document.createElement("small");
  small.textContent = label;

  const strong = document.createElement("strong");
  strong.textContent = value;

  div.appendChild(small);
  div.appendChild(strong);

  $("result-stats").appendChild(div);
}

function showResult(kind) {
  cleanupMic();
  clearGameLoops();
  stopBGM();

  const seconds = elapsedSeconds();

  $("result-stats").innerHTML = "";

  if (kind === "time") {
    $("result-eyebrow").textContent = "TIME ATTACK RESULT";
    $("result-icon").textContent = "🏆";
    $("result-title").textContent = "クリアおめでとう！";
    $("result-description").textContent =
      "20本すべてのろうそくを消したよ！";

    addResultStat("クリアタイム", `${seconds.toFixed(1)}秒`);
  }

  if (kind === "endless") {
    $("result-eyebrow").textContent = "ENDLESS RESULT";
    $("result-icon").textContent = "✨";
    $("result-title").textContent = "おつかれさま！";
    $("result-description").textContent =
      "たくさんのろうそくを消したね！";

    addResultStat("消した本数", `${extinguished}本`);
    addResultStat("プレイ時間", `${seconds.toFixed(1)}秒`);
  }

  if (kind === "breath-stop") {
    $("result-eyebrow").textContent = "BREATH RESULT";
    $("result-icon").textContent = "🌬️";
    $("result-title").textContent = "チャレンジ終了！";
    $("result-description").textContent =
      "息でろうそくを消した結果はこちら！";

    addResultStat("消した本数", `${extinguished}本`);
    addResultStat("プレイ時間", `${seconds.toFixed(1)}秒`);
  }

  if (kind === "over") {
    $("result-eyebrow").textContent = "GAME OVER";
    $("result-icon").textContent = "💨";
    $("result-title").textContent = "ケーキが飛んでいっちゃった！";
    $("result-description").textContent =
      "息が強すぎたみたい……！もう一度挑戦してみよう。";

    addResultStat("消した本数", `${extinguished}本`);
    addResultStat("プレイ時間", `${seconds.toFixed(1)}秒`);
  }

  showScreen("result-screen");
  startBGM(kind === "over" ? "gameover" : "result");
}


/* --------------------------------
   プレゼント
-------------------------------- */

document.querySelectorAll(".gift-box").forEach(box => {
  box.addEventListener("click", () => {
    if (box.classList.contains("opened")) return;

    box.classList.add("opened");
    box.disabled = true;
    box.textContent = "🎀";

    giftsOpened++;

    playGiftSound();

    $("gift-count").textContent =
      `プレゼント発見：${giftsOpened} / 3`;

    $("gift-message").textContent =
      giftsOpened === 3
        ? "全部見つけたね！最後のサプライズへ。"
        : "プレゼントを見つけたよ！";

    if (giftsOpened === 3) {
      setTimeout(() => {
        showScreen("letter-screen");
        startBGM("letter");
      }, 1000);
    }
  });
});


/* --------------------------------
   手紙
-------------------------------- */

$("open-letter").addEventListener("click", () => {
  $("letter").classList.remove("hidden");
  $("open-letter").classList.add("hidden");
  $("ending-message").classList.remove("hidden");
  $("letter-mode-button").classList.remove("hidden");

  playLetterSound();
  startBGM("letter");
});


/* --------------------------------
   マイク開始
-------------------------------- */

async function startMicrophone() {
  if (!navigator.mediaDevices?.getUserMedia) {
    $("game-message").textContent =
      "マイクを使えません。HTTPSのページで開いてね。";
    return;
  }

  try {
    initializeGameAudio();

    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      }
    });

    const AudioContextClass =
      window.AudioContext || window.webkitAudioContext;

    micContext = new AudioContextClass();

    if (micContext.state === "suspended") {
      await micContext.resume();
    }

    const source = micContext.createMediaStreamSource(micStream);

    micAnalyser = micContext.createAnalyser();
    micAnalyser.fftSize = 1024;

    source.connect(micAnalyser);

    $("mic-button").disabled = true;
    $("mic-button").textContent = "🎙️ マイク使用中";

    $("game-message").textContent =
      "優しく息を吹いてね。強すぎるとケーキが飛んでいくよ！";

    startTimer();
    monitorBreath();

  } catch (error) {
    console.error("マイクエラー:", error);

    $("game-message").textContent =
      "マイクを使えなかったよ。ブラウザのマイク許可を確認してね。";

    cleanupMic();
  }
}


/* --------------------------------
   息の検出
-------------------------------- */

function monitorBreath() {
  if (!micAnalyser || gameEnded) return;

  const data = new Uint8Array(micAnalyser.fftSize);

  micAnalyser.getByteTimeDomainData(data);

  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    const sample = (data[i] - 128) / 128;
    sum += sample * sample;
  }

  const rms = Math.sqrt(sum / data.length);
  const now = Date.now();

  if (now - lastBlowAt > 850) {
    if (rms > 0.34) {
      lastBlowAt = now;
      triggerCakeGameOver();
      return;
    }

    if (rms > 0.075) {
      lastBlowAt = now;
      blowOutCandles();
    }
  }

  micFrame = requestAnimationFrame(monitorBreath);
}


/* --------------------------------
   息でろうそくを消す
-------------------------------- */

function blowOutCandles() {
  const alive = candles.filter(candle => candle.alive);

  if (alive.length === 0) return;

  const count = Math.min(
    alive.length,
    1 + Math.floor(Math.random() * 3)
  );

  alive.slice(0, count).forEach(candle => {
    extinguishCandle(candle);
  });

  $("game-message").textContent =
    `ふーっ！ ${count}本の火が消えたよ。`;
}


/* --------------------------------
   ケーキが飛ぶ演出
-------------------------------- */

function triggerCakeGameOver() {
  if (gameEnded) return;

  gameEnded = true;
  clearGameLoops();
  cleanupMic();
  stopBGM();

  $("cake").classList.add("fly-away");

  $("game-message").textContent =
    "風が強すぎた！ケーキが飛んでいっちゃった！";

  playGameOverSound();

  setTimeout(() => {
    showResult("over");
  }, 1200);
}


/* --------------------------------
   初期画面
-------------------------------- */

showScreen("title-screen");