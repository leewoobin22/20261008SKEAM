import { SOUND_CONFIG } from "./config.js";

const soundBuilders = {
  paintCollect: (sound, event) => sound.playCollect(event.noteIndex, event.fever),
  paintSplash: (sound) => sound.playSplash(),
  umbrellaBlock: (sound) => sound.playUmbrellaBlock(),
  umbrella: (sound) => sound.playUmbrella(),
  fever: (sound) => sound.playFever(),
  stageClear: (sound) => sound.playStageClear(),
  gameOver: (sound) => sound.playGameOver()
};

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
    this.compressor = null;
    this.noiseBuffer = null;
    this.activeEffects = 0;
    this.effectRecords = new Set();
    this.reportedAudioError = false;
    this.reportedStorageError = false;
    this.musicMode = null;
    this.musicPaused = false;
    this.musicScheduler = null;
    this.musicTracks = new Map();
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
    if (enabled) {
      this.unlock();
      this.applyMusicMode();
    } else {
      this.deactivateMusicTracks(0.08);
    }
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
        this.compressor = this.context.createDynamicsCompressor();
        this.compressor.threshold.value = -9;
        this.compressor.knee.value = 4;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.003;
        this.compressor.release.value = 0.12;
        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.context.destination);
      }
      this.ensureMusicTracks();
      this.resumeIfNeeded();
      this.applyMusicMode();
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

  play(event) {
    if (!this.enabled || !event || !effectNames.has(event.name)) return;
    this.unlock();
    if (!this.context || this.context.state === "closed") return;
    const terminalEffect = event.name === "stageClear" || event.name === "gameOver";
    if (this.activeEffects >= SOUND_CONFIG.maxConcurrentEffects) {
      if (!terminalEffect) return;
      this.stopOldestEffect();
    }

    try {
      soundBuilders[event.name](this, event);
    } catch (error) {
      this.reportAudioError(error);
    }
  }

  setMusicMode(mode) {
    if (mode !== null && mode !== "normal" && mode !== "fever") {
      throw new Error(`지원하지 않는 BGM 모드입니다: ${mode}`);
    }
    if (this.musicMode === mode && !this.musicPaused) return;
    this.musicMode = mode;
    this.applyMusicMode();
  }

  pauseMusic() {
    if (this.musicPaused) return;
    this.musicPaused = true;
    this.deactivateMusicTracks(0.08);
  }

  resumeMusic() {
    if (!this.musicPaused) return;
    this.musicPaused = false;
    this.applyMusicMode();
  }

  stopMusic() {
    this.musicMode = null;
    this.applyMusicMode();
  }

  ensureMusicTracks() {
    if (this.musicTracks.size > 0 || !this.context || !this.masterGain) return;
    for (const mode of ["normal", "fever"]) {
      const output = this.context.createGain();
      output.gain.value = 0;
      output.connect(this.masterGain);
      this.musicTracks.set(mode, {
        mode,
        output,
        active: false,
        step: 0,
        nextNoteTime: 0
      });
    }
  }

  applyMusicMode() {
    if (!this.context || this.context.state === "closed") return;
    this.ensureMusicTracks();
    if (!this.enabled || this.musicPaused || !this.musicMode) {
      this.deactivateMusicTracks(SOUND_CONFIG.music.crossfadeDuration);
      return;
    }

    try {
      const now = this.context.currentTime;
      for (const track of this.musicTracks.values()) {
        const shouldPlay = track.mode === this.musicMode;
        const targetVolume = shouldPlay
          ? SOUND_CONFIG.music.volume * (track.mode === "fever" ? 1.08 : 1)
          : 0;
        if (track.active === shouldPlay) continue;
        track.output.gain.cancelScheduledValues(now);
        track.output.gain.setValueAtTime(track.output.gain.value, now);
        track.output.gain.linearRampToValueAtTime(
          targetVolume,
          now + SOUND_CONFIG.music.crossfadeDuration
        );
        track.active = shouldPlay;
        if (shouldPlay) track.nextNoteTime = now + 0.015;
      }
      this.startMusicScheduler();
    } catch (error) {
      this.reportAudioError(error);
      this.deactivateMusicTracks(0.08);
    }
  }

  deactivateMusicTracks(duration) {
    if (!this.context) return;
    const now = this.context.currentTime;
    for (const track of this.musicTracks.values()) {
      if (!track.active) continue;
      track.output.gain.cancelScheduledValues(now);
      track.output.gain.setValueAtTime(track.output.gain.value, now);
      track.output.gain.linearRampToValueAtTime(0, now + duration);
      track.active = false;
    }
  }

  startMusicScheduler() {
    if (this.musicScheduler !== null) return;
    this.musicScheduler = window.setInterval(() => {
      try {
        this.scheduleMusic();
      } catch (error) {
        this.reportAudioError(error);
        this.deactivateMusicTracks(0.08);
      }
    }, SOUND_CONFIG.music.schedulerInterval);
    this.scheduleMusic();
  }

  scheduleMusic() {
    if (!this.enabled || this.musicPaused || !this.context || this.context.state !== "running") {
      if (!this.musicTracksHasActive() && this.musicScheduler !== null) {
        window.clearInterval(this.musicScheduler);
        this.musicScheduler = null;
      }
      return;
    }
    const horizon = this.context.currentTime + SOUND_CONFIG.music.scheduleAhead;
    let hasActiveTrack = false;
    for (const track of this.musicTracks.values()) {
      if (!track.active) continue;
      hasActiveTrack = true;
      const settings = SOUND_CONFIG.music[track.mode];
      const stepDuration = 60 / settings.bpm / 2;
      while (track.nextNoteTime < horizon) {
        this.scheduleMusicStep(track, settings, track.nextNoteTime, stepDuration);
        track.step = (track.step + 1) % settings.notes.length;
        track.nextNoteTime += stepDuration;
      }
    }
    if (!hasActiveTrack && this.musicScheduler !== null) {
      window.clearInterval(this.musicScheduler);
      this.musicScheduler = null;
    }
  }

  musicTracksHasActive() {
    for (const track of this.musicTracks.values()) {
      if (track.active) return true;
    }
    return false;
  }

  scheduleMusicStep(track, settings, time, stepDuration) {
    const note = settings.notes[track.step];
    const eighthNote = track.step % 2 === 0;
    const leadVolume = track.mode === "fever" ? 0.2 : 0.22;
    const bassVolume = track.mode === "fever" ? 0.22 : 0.25;
    this.musicTone(track.output, time, note, stepDuration * 0.82, leadVolume, "sine");
    if (eighthNote) {
      const bass = settings.bass[Math.floor(track.step / 2) % settings.bass.length];
      this.musicTone(track.output, time, bass, stepDuration * 1.35, bassVolume, "triangle");
    }
    if (track.mode === "fever" && track.step % 4 === 0) {
      this.musicTone(track.output, time, note * 2, stepDuration * 0.55, 0.035, "triangle");
    }
  }

  musicTone(output, startTime, frequency, duration, volume, type) {
    const oscillator = this.context.createOscillator();
    const envelope = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, startTime);
    envelope.gain.setValueAtTime(0.0001, startTime);
    envelope.gain.exponentialRampToValueAtTime(volume, startTime + 0.012);
    envelope.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
    oscillator.connect(envelope);
    envelope.connect(output);
    oscillator.start(startTime);
    oscillator.stop(startTime + duration + 0.01);
  }

  playCollect(noteIndex, fever = false) {
    const frequency = SOUND_CONFIG.melody.frequencies[noteIndex] ?? SOUND_CONFIG.melody.frequencies[0];
    const playedFrequency = fever ? frequency * 2 : frequency;
    const crescendo = Math.min(
      SOUND_CONFIG.melody.maxCrescendo,
      1 + noteIndex / (SOUND_CONFIG.melody.frequencies.length - 1) * (SOUND_CONFIG.melody.maxCrescendo - 1)
    );
    const duration = fever ? 0.36 : 0.5;
    this.effect("paintCollect", duration, 0.42 * crescendo, (output, time) => {
      this.tone(output, time, playedFrequency, playedFrequency * 0.997, duration * 0.86, fever ? 0.4 : 0.48, "sine");
      this.tone(output, time, playedFrequency * 2, playedFrequency * 1.99, duration * 0.62, fever ? 0.13 : 0.19, "sine");
      this.tone(output, time + 0.004, playedFrequency * (fever ? 2.76 : 3.01), playedFrequency * (fever ? 2.73 : 2.98), duration * 0.42, fever ? 0.035 : 0.07, "triangle");
      this.tone(output, time + (fever ? 0.07 : 0.105), playedFrequency * 2, playedFrequency * 1.99, duration * 0.56, fever ? 0.055 : 0.07, "sine");
      this.tone(output, time, 430, playedFrequency * 0.72, 0.1, 0.045, "triangle");
      if (noteIndex === SOUND_CONFIG.melody.frequencies.length - 1) {
        const chordFrequency = fever ? 1318.5 : 659.25;
        this.tone(output, time + 0.035, chordFrequency, chordFrequency, duration * 0.76, 0.12, "sine");
        this.tone(output, time + 0.035, fever ? 1567.98 : 783.99, fever ? 1567.98 : 783.99, duration * 0.68, 0.1, "sine");
      }
    });
  }

  playSplash() {
    this.effect("paintSplash", 0.42, 0.66, (output, time) => {
      this.tone(output, time, 176, 72, 0.34, 0.4, "triangle");
      this.tone(output, time + 0.006, 194, 79, 0.31, 0.34, "sine");
      this.tone(output, time, 92, 48, 0.3, 0.28, "sine");
      this.noise(output, time + 0.012, 0.36, 1050, 180, 0.55);
    });
  }

  playUmbrellaBlock() {
    this.effect("umbrellaBlock", 0.15, 0.34, (output, time) => {
      this.noise(output, time, 0.12, 2600, 850, 0.25);
      this.tone(output, time, 760, 440, 0.13, 0.2, "sine");
    });
  }

  playUmbrella() {
    this.effect("umbrella", 0.26, 0.42, (output, time) => {
      this.tone(output, time, 280, 650, 0.23, 0.42, "triangle");
      this.noise(output, time + 0.04, 0.18, 1600, 700, 0.12);
    });
  }

  playFever() {
    this.effect("fever", 0.62, 0.42, (output, time) => {
      this.tone(output, time, 420, 590, 0.23, 0.3, "sine");
      this.tone(output, time + 0.12, 590, 790, 0.23, 0.27, "triangle");
      this.tone(output, time + 0.24, 790, 1180, 0.32, 0.25, "sine");
      this.noise(output, time + 0.18, 0.36, 3000, 1200, 0.08);
    });
  }

  playStageClear() {
    this.effect("stageClear", 0.62, 0.4, (output, time) => {
      [523, 659, 784, 1046].forEach((frequency, index) => {
        this.tone(output, time + index * 0.12, frequency, frequency * 1.02, 0.18, 0.28, "triangle");
      });
    });
  }

  playGameOver() {
    this.effect("gameOver", 0.46, 0.38, (output, time) => {
      this.tone(output, time, 310, 220, 0.2, 0.34, "triangle");
      this.tone(output, time + 0.18, 220, 145, 0.25, 0.3, "sine");
    });
  }

  effect(name, duration, volume, build) {
    const context = this.context;
    const output = context.createGain();
    const time = context.currentTime;
    const individualGain = SOUND_CONFIG.effectVolumes[name] ?? 1;
    output.gain.setValueAtTime(0.0001, time);
    output.gain.exponentialRampToValueAtTime(volume * individualGain, time + 0.012);
    output.gain.setValueAtTime(volume * individualGain, time + duration * 0.45);
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

  stopAll() {
    if (!this.context) return;
    for (const record of this.effectRecords) {
      try {
        const time = this.context.currentTime;
        record.output.gain.cancelScheduledValues(time);
        record.output.gain.setValueAtTime(Math.max(0.0001, record.output.gain.value), time);
        record.output.gain.exponentialRampToValueAtTime(0.0001, time + 0.015);
      } catch (error) {
        this.reportAudioError(error);
      }
      this.releaseEffect(record);
    }
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
    console.warn("사운드를 재생하지 못했습니다. 게임은 계속 진행됩니다.", error);
    this.reportedAudioError = true;
  }
}
