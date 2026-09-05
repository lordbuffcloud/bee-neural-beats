const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const vm = require('node:vm');

function setup({ failFirst = false } = {}) {
    const document = new EventTarget();
    const button = new EventTarget();
    let prompt;
    let attempts = 0;
    const errors = [];
    document.createElement = () => {
        prompt = { style: {}, remove() { this.attached = false; } };
        return prompt;
    };
    document.body = {
        appendChild(node) { node.attached = true; },
        removeChild(node) {
            if (!node.attached) throw new Error('Node is no longer a child');
            node.attached = false;
        }
    };
    document.getElementById = () => button;
    const context = vm.createContext({
        document,
        console: { log() {}, error() {} },
        window: { AudioContext: class {
            constructor() {
                attempts++;
                if (failFirst && attempts === 1) throw new Error('Device unavailable');
                this.state = 'suspended';
            }
        } }
    });
    vm.runInContext(readFileSync(require.resolve('../script.js'), 'utf8') +
        '\nglobalThis.Generator = BinauralBeatsGenerator;', context);
    const generator = Object.create(context.Generator.prototype);
    generator.audioContext = null;
    generator.showError = (message) => errors.push(message);
    generator.showUserInteractionPrompt();
    return {
        generator, errors,
        get attempts() { return attempts; },
        get attached() { return prompt.attached; },
        clickButton() {
            // Model the button handler followed by its bubbling document handler.
            button.dispatchEvent(new Event('click'));
            document.dispatchEvent(new Event('click'));
        },
        clickPage() { document.dispatchEvent(new Event('click')); }
    };
}

test('Enable Audio creates one context with no false error', () => {
    const app = setup();
    app.clickButton();
    assert.equal(app.attempts, 1);
    assert.equal(app.attached, false);
    assert.deepEqual(app.errors, []);
    app.clickPage();
    assert.equal(app.attempts, 1);
});

test('clicking elsewhere enables audio once', () => {
    const app = setup();
    app.clickPage();
    app.clickPage();
    assert.equal(app.attempts, 1);
    assert.equal(app.attached, false);
    assert.deepEqual(app.errors, []);
});

test('failed context creation keeps the prompt available for retry', () => {
    const app = setup({ failFirst: true });
    app.clickButton();
    assert.equal(app.attached, true);
    assert.equal(app.errors.length, 1);
    app.clickButton();
    assert.equal(app.attempts, 2);
    assert.equal(app.attached, false);
    assert.ok(app.generator.audioContext);
});
