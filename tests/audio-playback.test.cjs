const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function setup() {
    const document = new EventTarget();
    const elements = Object.fromEntries(Object.entries({
        'carrier-freq': 400, 'beat-freq': 10, volume: 50,
        'play-pause': '', timer: '', 'background-mode': ''
    }).map(([id, value]) => [id, Object.assign(new EventTarget(), {
        value, checked: true, classList: { toggle() {} }
    })]));
    document.getElementById = id => elements[id];
    const actions = {};
    const revoked = [];
    let created = 0;
    const mediaSession = { setActionHandler(action, callback) { actions[action] = callback; } };
    const context = vm.createContext({
        document, Blob, Date,
        console: { log() {}, error() {} },
        navigator: { mediaSession, audioSession: {} }, window: {},
        URL: { createObjectURL() { return `blob:${++created}`; }, revokeObjectURL(url) { revoked.push(url); } },
        setInterval() { return 1; }, clearInterval() {}
    });
    vm.runInContext(readFileSync(require.resolve('../tone-audio.js'), 'utf8') + '\n' +
        readFileSync(require.resolve('../script.js'), 'utf8') +
        '\nglobalThis.Generator = BinauralBeatsGenerator;', context);
    const audio = Object.assign(new EventTarget(), {
        paused: true, currentTime: 0,
        play() { this.paused = false; this.dispatchEvent(new Event('playing')); return Promise.resolve(); },
        pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
    });
    const errors = [];
    const generator = Object.assign(Object.create(context.Generator.prototype), {
        audio, playRequest: 0, elapsedSeconds: 0, isPlaying: false,
        showError(message) { errors.push(message); }
    });
    generator.setupMediaPlayback();
    generator.setupMobileOptimizations();
    return { generator, audio, elements, context, actions, mediaSession, errors, revoked, document,
        get created() { return created; } };
}

test('WAV has distinct accurate stereo frequencies, volume and phase-continuous endpoints', async () => {
    const { context } = setup();
    const view = new DataView(await context.createToneWav(400, 10.1, 50).arrayBuffer());
    assert.equal(view.getUint16(22, true), 2);
    assert.equal(view.getUint32(24, true), 44100);
    assert.equal(view.getUint32(40, true), 44100 * 20 * 4);
    for (const [channel, frequency] of [[0, 394.95], [1, 405.05]]) {
        for (const i of [0, 1, 31, 4001, 44099, 881999]) {
            const actual = view.getInt16(44 + i * 4 + channel * 2, true);
            const expected = Math.round(32767 * 0.5 * Math.sin(2 * Math.PI * frequency * i / 44100));
            assert.ok(Math.abs(actual - expected) <= 1);
        }
        assert.ok(Math.abs(Math.sin(2 * Math.PI * frequency * 20)) < 1e-8);
    }
    const silent = new Uint8Array(await context.createToneWav(400, 10, 0).arrayBuffer());
    assert.ok(silent.subarray(44).every(value => value === 0));
});

test('play, pause and resume reuse one media source; stop resets time', async () => {
    const app = setup();
    await app.generator.play();
    assert.equal(app.generator.isPlaying, true);
    assert.equal(app.mediaSession.playbackState, 'playing');
    app.generator.pause();
    assert.equal(app.generator.isPlaying, false);
    await app.generator.play();
    assert.equal(app.created, 1);
    app.audio.currentTime = 3;
    app.generator.stop();
    assert.equal(app.audio.currentTime, 0);
    assert.equal(app.elements.timer.textContent, '00:00');
    assert.deepEqual(app.errors, []);
});

test('frequency and volume changes replace and release the previous track', async () => {
    const app = setup();
    await app.generator.play();
    app.elements['beat-freq'].value = 6;
    await app.generator.play();
    app.elements.volume.value = 0;
    await app.generator.play();
    assert.equal(app.created, 3);
    assert.deepEqual(app.revoked, ['blob:1', 'blob:2']);
    assert.equal(app.generator.toneKey, '400:6:0');
});

test('media controls and external pauses update playback state', async () => {
    const app = setup();
    await app.actions.play();
    app.audio.pause();
    assert.equal(app.generator.isPlaying, false);
    await app.actions.play();
    app.actions.pause();
    assert.equal(app.audio.paused, true);
    app.actions.stop();
    assert.equal(app.elements.timer.textContent, '00:00');
});

test('hidden page keeps playing only when background mode is enabled', async () => {
    const app = setup();
    await app.generator.play();
    app.document.hidden = true;
    app.document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(app.audio.paused, false);
    app.elements['background-mode'].checked = false;
    app.elements['background-mode'].dispatchEvent(new Event('change'));
    app.document.dispatchEvent(new Event('visibilitychange'));
    assert.equal(app.audio.paused, true);
});

test('blocked playback reports failure and permits a retry', async () => {
    const app = setup();
    const play = app.audio.play;
    app.audio.play = () => Promise.reject(new Error('NotAllowedError'));
    await app.generator.play();
    assert.equal(app.generator.isPlaying, false);
    assert.equal(app.errors.length, 1);
    app.audio.play = play;
    await app.generator.play();
    assert.equal(app.generator.isPlaying, true);
});

test('a pending play rejection after Stop does not show a spurious error', async () => {
    const app = setup();
    let reject;
    app.audio.play = () => new Promise((resolve, fail) => { reject = fail; });
    const pending = app.generator.play();
    app.generator.stop();
    reject(new Error('AbortError'));
    await pending;
    assert.equal(app.generator.isPlaying, false);
    assert.deepEqual(app.errors, []);
});
