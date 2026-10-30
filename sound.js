// ========================================
// sound.js
// BGM・効果音管理
// ========================================

let audioContext = null;
let masterGain = null;
let bgmTimer = null;
let currentBGM = null;
let bgmIndex = 0;

// 音量
const MASTER_VOLUME = 0.25;

// BGMのメロディ
const melodies = {
    title: [
        [523, 0.25], [659, 0.25], [784, 0.4],
        [659, 0.25], [784, 0.25], [1046, 0.5]
    ],

    menu: [
        [523, 0.25], [587, 0.25], [659, 0.4],
        [587, 0.25], [659, 0.25], [784, 0.5]
    ],

    birthday: [
        [523, 0.3], [523, 0.3], [587, 0.6],
        [523, 0.6], [698, 0.6], [659, 1.0]
    ],

    time: [
        [659, 0.2], [784, 0.2], [880, 0.2],
        [784, 0.2], [659, 0.2], [587, 0.2]
    ],

    endless: [
        [392, 0.3], [523, 0.3], [659, 0.3],
        [523, 0.3], [392, 0.3], [523, 0.3]
    ],

    breath: [
        [392, 0.5], [440, 0.5], [523, 0.8],
        [440, 0.5], [392, 0.8]
    ],

    gift: [
        [659, 0.2], [784, 0.2], [1046, 0.4],
        [1174, 0.4], [1046, 0.6]
    ],

    letter: [
        [523, 0.6], [659, 0.6], [784, 0.8],
        [698, 0.6], [659, 0.8], [523, 1.0]
    ],

    result: [
        [523, 0.25], [659, 0.25], [784, 0.25],
        [1046, 0.5], [784, 0.25], [1046, 0.7]
    ],

    gameover: [
        [392, 0.4], [349, 0.4], [330, 0.6],
        [294, 0.8]
    ]
};


// ========================================
// AudioContext初期化
// ========================================

window.initializeAudio = function () {
    try {
        if (!audioContext) {
            const AudioContextClass =
                window.AudioContext || window.webkitAudioContext;

            if (!AudioContextClass) {
                console.warn("このブラウザは音声に対応していません。");
                return;
            }

            audioContext = new AudioContextClass();

            masterGain = audioContext.createGain();
            masterGain.gain.value = MASTER_VOLUME;
            masterGain.connect(audioContext.destination);
        }

        if (audioContext.state === "suspended") {
            audioContext.resume();
        }

    } catch (error) {
        console.error("音声の初期化に失敗しました:", error);
    }
};


// ========================================
// 音を鳴らす基本関数
// ========================================

window.playTone = function (
    frequency,
    duration = 0.3,
    type = "sine",
    volume = 0.2
) {
    if (!audioContext || !masterGain) return;

    try {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(
            frequency,
            audioContext.currentTime
        );

        gain.gain.setValueAtTime(
            volume,
            audioContext.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            audioContext.currentTime + duration
        );

        oscillator.connect(gain);
        gain.connect(masterGain);

        oscillator.start();
        oscillator.stop(audioContext.currentTime + duration);

    } catch (error) {
        console.error("音声再生エラー:", error);
    }
};


// ========================================
// BGM再生
// ========================================

window.startBGM = function (name) {
    window.stopBGM();

    if (!audioContext) {
        window.initializeAudio();
    }

    if (!audioContext) return;

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    const melody = melodies[name];

    if (!melody) {
        console.warn("BGMが見つかりません:", name);
        return;
    }

    currentBGM = name;
    bgmIndex = 0;

    function playNextNote() {
        if (currentBGM !== name || !audioContext) return;

        const note = melody[bgmIndex];

        if (note) {
            window.playTone(
                note[0],
                note[1],
                "sine",
                0.08
            );
        }

        bgmIndex = (bgmIndex + 1) % melody.length;

        const nextDuration = note ? note[1] * 1000 : 500;

        bgmTimer = setTimeout(
            playNextNote,
            nextDuration
        );
    }

    playNextNote();
};


// ========================================
// BGM停止
// ========================================

window.stopBGM = function () {
    if (bgmTimer !== null) {
        clearTimeout(bgmTimer);
        bgmTimer = null;
    }

    currentBGM = null;
};


// ========================================
// 効果音
// ========================================

window.playStartSound = function () {
    window.playTone(523, 0.15, "sine", 0.2);
    setTimeout(() => {
        window.playTone(784, 0.2, "sine", 0.2);
    }, 100);
};

window.playCandleSound = function () {
    window.playTone(880, 0.12, "sine", 0.15);
    setTimeout(() => {
        window.playTone(1174, 0.18, "sine", 0.12);
    }, 60);
};

window.playSuccessSound = function () {
    window.playTone(523, 0.2, "sine", 0.2);

    setTimeout(() => {
        window.playTone(659, 0.2, "sine", 0.2);
    }, 150);

    setTimeout(() => {
        window.playTone(784, 0.4, "sine", 0.2);
    }, 300);
};

window.playResultMusic = function () {
    window.stopBGM();

    window.playTone(523, 0.3, "sine", 0.2);

    setTimeout(() => {
        window.playTone(659, 0.3, "sine", 0.2);
    }, 250);

    setTimeout(() => {
        window.playTone(784, 0.3, "sine", 0.2);
    }, 500);

    setTimeout(() => {
        window.playTone(1046, 0.8, "sine", 0.2);
    }, 750);
};

window.playGiftSound = function () {
    window.playTone(784, 0.2, "sine", 0.2);

    setTimeout(() => {
        window.playTone(988, 0.3, "sine", 0.2);
    }, 150);
};

window.playLetterSound = function () {
    window.playTone(523, 0.5, "sine", 0.15);

    setTimeout(() => {
        window.playTone(659, 0.5, "sine", 0.15);
    }, 300);
};

window.playGameOverSound = function () {
    window.stopBGM();

    window.playTone(392, 0.4, "triangle", 0.2);

    setTimeout(() => {
        window.playTone(330, 0.5, "triangle", 0.2);
    }, 350);

    setTimeout(() => {
        window.playTone(262, 0.8, "triangle", 0.2);
    }, 700);
};