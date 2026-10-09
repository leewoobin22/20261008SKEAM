import { SOUND_CONFIG } from "./config.js";

const effectNames = new Set([
  "paintCollect",
  "paintSplash",
  "umbrellaBlock",
  "umbrella",
  "fever",
  "stageClear",
  "gameOver"
]);

export class Sound {
  constructor() {
    this.enabled = this.readEnabled();
    this.context = null;
    this.masterGain = null;
    this.noiseBuffer = null;
    this.activeEffects = 0;
    this.effectRecords = new Set();
    this.reportedAudioError = false;
    this.reportedStorageError = false;
  }

  readEnabled() {
    try {
      return localStorage.getItem(SOUND_CONFIG.muteStorageKey) !== "true";
    } catch (error) {
      console.warn("사운드 설정을 불러오지 못했습니다.", error);
      return true;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
    if (this.masterGain && this.context) {
      try {
        const gain = this.enabled ? SOUND_CONFIG.masterVolume : 0;
        this.masterGain.gain.cancelScheduledValues(this.context.currentTime);
        this.masterGain.gain.setValueAtTime(gain, this.context.currentTime);
      } catch (error) {
        this.reportAudioError(error);
      }
    }
    try {
      localStorage.setItem(SOUND_CONFIG.muteStorageKey, String(!enabled));
    } catch (error) {
      if (!this.reportedStorageError) {
        console.warn("사운드 설정을 저장하지 못했습니다.", error);
        this.reportedStorageError = true;
      }
    }
    if (enabled) this.resumeIfNeeded();
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  unlock() {
    if (!this.enabled) return;
    try {
      if (!this.context) {
        const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextConstructor) {
          throw new Error("이 브라우저는 Web Audio API를 지원하지 않습니다.");
        }
        this.context = new AudioContextConstructor();
        this.masterGain = this.context.createGain();
        this.masterGain.gain.value = this.enabled ? SOUND_CONFIG.masterVolume : 0;
        this.masterGain.connect(this.context.destination);
      }
      this.resumeIfNeeded();
    } catch (error) {
      this.reportAudioError(error);
    }
  }

  resumeIfNeeded() {
    if (!this.enabled || !this.context || this.context.state === "running" || this.context.state === "closed") return;
    try {
      this.context.resume().catch((error) => this.reportAudioError(error));
    } catch (error) {
      this.reportAudioError(error);
    }
  }

  play(name) {
    if (!this.enabled || !effectNames.has(name)) return;
    this.unlock();
    if (!this.context || this.context.state === "closed") return;
    const terminalEffect = name === "stageClear" || name === "gameOver";
    if (this.activeEffects >= SOUND_CONFIG.maxConcurrentEffects) {
      if (!terminalEffect) return;
      this.stopOldestEffect();
    }

    const recipes = {
      paintCollect: () => this.playCollect(),
      paintSplash: () => this.playSplash(),
      umbrellaBlock: () => this.playUmbrellaBlock(),
      umbrella: () => this.playUmbrella(),
      fever: () => this.playFever(),
      stageClear: () => this.playStageClear(),
      gameOver: () => this.playGameOver()
    };
    try {
      recipes[name]();
    } catch (error) {
      this.reportAudioError(error);
    }
  }

  playCollect() {
    this.effect(0.17, 0.56, (output, time) => {
      this.tone(output, time, 610, 970, 0.15, 0.52, "triangle");
      this.tone(output, time + 0.015, 390, 640, 0.12, 0.2, "sine");
    });
  }

  playSplash() {
    this.effect(0.3, 0.58, (output, time) => {
      this.noise(output, time, 0.27, 1250, 260, 0.45);
      this.tone(output, time, 155, 74, 0.25, 0.36, "sine");
    });
  }

  playUmbrellaBlock() {
    this.effect(0.15, 0.34, (output, time) => {
      this.noise(output, time, 0.12, 2600, 850, 0.25);
      this.tone(output, time, 760, 440, 0.13, 0.2, "sine");
    });
  }

  playUmbrella() {
    this.effect(0.26, 0.42, (output, time) => {
      this.tone(output, time, 280, 650, 0.23, 0.42, "triangle");
      this.noise(output, time + 0.04, 0.18, 1600, 700, 0.12);
    });
  }

  playFever() {
    this.effect(0.62, 0.42, (output, time) => {
      this.tone(output, time, 420, 590, 0.23, 0.3, "sine");
      this.tone(output, time + 0.12, 590, 790, 0.23, 0.27, "triangle");
      this.tone(output, time + 0.24, 790, 1180, 0.32, 0.25, "sine");
      this.noise(output, time + 0.18, 0.36, 3000, 1200, 0.08);
    });
  }

  playStageClear() {
    this.effect(0.62, 0.4, (output, time) => {
      [523, 659, 784, 1046].forEach((frequency, index) => {
        this.tone(output, time + index * 0.12, frequency, frequency * 1.02, 0.18, 0.28, "triangle");
      });
    });
  }

  playGameOver() {
    this.effect(0.46, 0.38, (output, time) => {
      this.tone(output, time, 310, 220, 0.2, 0.34, "triangle");
      this.tone(output, time + 0.18, 220, 145, 0.25, 0.3, "sine");
    });
  }

  effect(duration, volume, build) {
    const context = this.context;
    const output = context.createGain();
    const time = context.currentTime;
    output.gain.setValueAtTime(0.0001, time);
    output.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    output.gain.setValueAtTime(volume, time + duration * 0.45);
    output.gain.exponentialRampToValueAtTime(0.0001, time + duration);
    output.connect(this.masterGain);
    build(output, time);
    const record = { output, timer: null };
    this.effectRecords.add(record);
    this.activeEffects += 1;
    record.timer = window.setTimeout(() => this.releaseEffect(record), duration * 1000 + 40);
  }

  stopOldestEffect() {
    const oldest = this.effectRecords.values().next().value;
    if (!oldest) return;
    try {
      const time = this.context.currentTime;
      oldest.output.gain.cancelScheduledValues(time);
      oldest.output.gain.setValueAtTime(Math.max(0.0001, oldest.output.gain.value), time);
      oldest.output.gain.exponentialRampToValueAtTime(0.0001, time + 0.015);
    } catch (error) {
      this.reportAudioError(error);
    }
    this.releaseEffect(oldest);
  }

  releaseEffect(record) {
    if (!this.effectRecords.delete(record)) return;
    window.clearTimeout(record.timer);
    this.activeEffects = Math.max(0, this.activeEffects - 1);
  }

  tone(output, startTime, startFrequency, endFrequency, duration, volume, type) {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, startTime + duration);
    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.01);
  }

  noise(output, startTime, duration, startFrequency, endFrequency, volume) {
    if (!this.noiseBuffer) {
      const sampleCount = Math.ceil(this.context.sampleRate * 0.4);
      this.noiseBuffer = this.context.createBuffer(1, sampleCount, this.context.sampleRate);
      const samples = this.noiseBuffer.getChannelData(0);
      for (let index = 0; index < samples.length; index += 1) {
        samples[index] = Math.random() * 2 - 1;
      }
    }
    const source = this.context.createBufferSource();
    const filter = this.context.createBiquadFilter();
    const envelope = this.context.createGain();
    source.buffer = this.noiseBuffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(startFrequency, startTime);
    filter.frequency.exponentialRampToValueAtTime(endFrequency, startTime + duration);
    envelope.gain.setValueAtTime(volume, startTime);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    source.connect(filter);
    filter.connect(envelope);
    envelope.connect(output);
    source.start(startTime);
    source.stop(startTime + duration);
  }

  reportAudioError(error) {
    if (this.reportedAudioError) return;
    console.warn("효과음을 재생하지 못했습니다. 게임은 계속 진행됩니다.", error);
    this.reportedAudioError = true;
  }
}
