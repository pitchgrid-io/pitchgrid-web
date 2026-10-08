// Route-level tests for /api/subscribe and /api/subscribe/confirm with a mocked Brevo (global fetch).
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function loadRoute(entry) {
    const res = await build({
        entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', write: false, target: 'node20',
        alias: { $lib: resolve('src/lib') }, logLevel: 'silent'
    });
    const file = join(mkdtempSync(join(tmpdir(), 'pg-route-')), 'mod.mjs');
    writeFileSync(file, res.outputFiles[0].text);
    return import(pathToFileURL(file).href);
}

const subscribe = await loadRoute('src/routes/api/subscribe/+server.ts');
const confirm = await loadRoute('src/routes/api/subscribe/confirm/+server.ts');
const L = await (await import('../scripts/load-ts.mjs')).loadTs('src/lib/server/subscribe/logic.ts');

let calls;
let brevoContact; // null = 404
const ENV_KEYS = ['BREVO_API_KEY', 'BREVO_LIST_PROSPECTS', 'SUBSCRIBE_CONFIRM_EMAIL', 'BREVO_CONFIRM_TEMPLATE_ID', 'SUBSCRIBE_CONFIRM_SECRET', 'BREVO_PROOF_ATTRIBUTES'];

beforeEach(() => {
    calls = [];
    brevoContact = null;
    for (const k of ENV_KEYS) delete process.env[k];
    process.env.BREVO_API_KEY = 'test-key';
    console.info = () => {};
    globalThis.fetch = async (url, init = {}) => {
        const method = init.method ?? 'GET';
        calls.push({ url: String(url), method, body: init.body ? JSON.parse(init.body) : undefined });
        if (method === 'GET') return brevoContact ? Response.json(brevoContact) : new Response('{}', { status: 404 });
        if (String(url).endsWith('/contacts') && method === 'POST')
            return brevoContact ? new Response(null, { status: 204 }) : Response.json({ id: 501 }, { status: 201 });
        if (String(url).endsWith('/smtp/email')) return Response.json({ messageId: 'm' }, { status: 201 });
        if (method === 'PUT') return new Response(null, { status: 204 });
        return new Response('{}', { status: 500 });
    };
});

const post = (body) =>
    subscribe.POST({
        request: new Request('https://pitchgrid.io/api/subscribe', { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } }),
        url: new URL('https://pitchgrid.io/api/subscribe')
    });

test('new signup: added to list 6 at once, no DOI endpoint, no email by default', async () => {
    const res = await post({ email: 'A@Example.com', source: 'home', consentVersion: '2026-10-08-v1', page: 'https://pitchgrid.io/?utm_source=x' });
    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.packUrl, '/tuning-pack/confirmed');
    const create = calls.find((c) => c.method === 'POST' && c.url.endsWith('/contacts'));
    assert.deepEqual(create.body.listIds, [6]);
    assert.equal(create.body.updateEnabled, true);
    assert.equal(create.body.email, 'a@example.com');
    assert.equal(create.body.attributes.SIGNUP_SOURCE, 'web:home');
    assert.ok(!calls.some((c) => c.url.includes('doubleOptin')));
    assert.ok(!calls.some((c) => c.url.endsWith('/smtp/email')));
});

test('no consent checkbox needed any more', async () => {
    const res = await post({ email: 'b@example.com', source: 'footer' });
    assert.equal(res.status, 200);
});

test('list id from BREVO_LIST_PROSPECTS', async () => {
    process.env.BREVO_LIST_PROSPECTS = '9';
    await post({ email: 'c@example.com' });
    assert.deepEqual(calls.find((c) => c.method === 'POST').body.listIds, [9]);
});

for (const [label, contact] of [
    ['blacklisted', { id: 7, emailBlacklisted: true, listUnsubscribed: [] }],
    ['unsubscribed from a list', { id: 7, emailBlacklisted: false, listUnsubscribed: [2] }]
]) {
    test(`${label} contact: neutral success, nothing written, no email`, async () => {
        process.env.SUBSCRIBE_CONFIRM_EMAIL = 'true';
        process.env.BREVO_CONFIRM_TEMPLATE_ID = '4';
        process.env.SUBSCRIBE_CONFIRM_SECRET = 's';
        brevoContact = contact;
        const blocked = await post({ email: 'd@example.com' });
        assert.deepEqual(calls.map((c) => c.method), ['GET']); // lookup only
        brevoContact = null;
        const fresh = await post({ email: 'e@example.com' });
        assert.equal(blocked.status, 200);
        assert.deepEqual(await blocked.json(), await fresh.json()); // indistinguishable from a real signup
    });
}

test('confirmation email only when switched on; membership does not wait for it', async () => {
    process.env.SUBSCRIBE_CONFIRM_EMAIL = 'true';
    process.env.BREVO_CONFIRM_TEMPLATE_ID = '4';
    process.env.SUBSCRIBE_CONFIRM_SECRET = 'sec';
    await post({ email: 'f@example.com' });
    const order = calls.map((c) => `${c.method} ${c.url.replace('https://api.brevo.com/v3', '')}`);
    assert.equal(order[1], 'POST /contacts'); // added before the email goes out
    const mail = calls.find((c) => c.url.endsWith('/smtp/email'));
    assert.equal(mail.body.templateId, 4);
    const link = new URL(mail.body.params.CONFIRM_URL);
    assert.equal(link.pathname, '/api/subscribe/confirm');
    assert.doesNotMatch(link.search, /example\.com|%40/);
    assert.deepEqual(await L.verifyConfirmToken('sec', link.searchParams.get('t')), { contactId: 501 });
});

test('email failure does not fail the signup', async () => {
    process.env.SUBSCRIBE_CONFIRM_EMAIL = 'true';
    process.env.BREVO_CONFIRM_TEMPLATE_ID = '4';
    process.env.SUBSCRIBE_CONFIRM_SECRET = 'sec';
    const orig = globalThis.fetch;
    globalThis.fetch = async (url, init) => (String(url).endsWith('/smtp/email') ? new Response('{}', { status: 400 }) : orig(url, init));
    console.error = () => {};
    const res = await post({ email: 'g@example.com' });
    assert.equal(res.status, 200);
});

test('already confirmed contact gets no second email', async () => {
    brevoContact = { id: 33, emailBlacklisted: false, listUnsubscribed: [], attributes: { 'DOUBLE_OPT-IN': 1 } };
    process.env.SUBSCRIBE_CONFIRM_EMAIL = 'true';
    process.env.BREVO_CONFIRM_TEMPLATE_ID = '4';
    process.env.SUBSCRIBE_CONFIRM_SECRET = 'sec';
    await post({ email: 'h@example.com' });
    assert.ok(calls.some((c) => c.method === 'POST' && c.url.endsWith('/contacts')));
    assert.ok(!calls.some((c) => c.url.endsWith('/smtp/email')));
});

test('honeypot: neutral success, no Brevo call', async () => {
    const res = await post({ email: 'i@example.com', website: 'spam' });
    assert.equal(res.status, 200);
    assert.equal(calls.length, 0);
});

async function clickConfirm(t) {
    try {
        await confirm.GET({ url: new URL(`https://pitchgrid.io/api/subscribe/confirm?t=${encodeURIComponent(t)}`) });
        assert.fail('expected redirect');
    } catch (e) {
        if (e?.status === undefined) throw e;
        return e;
    }
}

test('confirm click: valid token sets DOUBLE_OPT-IN, never touches lists, redirects to pack page', async () => {
    process.env.SUBSCRIBE_CONFIRM_SECRET = 'sec';
    process.env.BREVO_PROOF_ATTRIBUTES = 'DOI_CONFIRMED,DOI_CONFIRMED_AT';
    const r = await clickConfirm(await L.signConfirmToken('sec', 501));
    assert.equal(r.status, 303);
    assert.equal(r.location, '/tuning-pack/confirmed?via=email');
    assert.equal(calls.length, 1);
    assert.equal(calls[0].method, 'PUT');
    assert.match(calls[0].url, /\/contacts\/501\?identifierType=contact_id$/);
    assert.equal(calls[0].body.attributes['DOUBLE_OPT-IN'], 1);
    assert.equal(calls[0].body.attributes.DOI_CONFIRMED, true);
    assert.equal(calls[0].body.listIds, undefined);
    assert.equal(calls[0].body.unlinkListIds, undefined);
});

test('confirm click: bad token writes nothing', async () => {
    process.env.SUBSCRIBE_CONFIRM_SECRET = 'sec';
    const r = await clickConfirm(await L.signConfirmToken('wrong', 501));
    assert.equal(r.status, 303);
    assert.equal(r.location, '/tuning-pack/confirmed?via=link');
    assert.equal(calls.length, 0);
});
