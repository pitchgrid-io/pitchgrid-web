import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTs } from '../scripts/load-ts.mjs';

const L = await loadTs('src/lib/server/subscribe/logic.ts');

test('config: prospects list 6 by default, env override; confirm email off by default', () => {
    const d = L.readSubscribeConfig({});
    assert.equal(d.prospectsListId, 6);
    assert.equal(d.confirmEmailEnabled, false);
    assert.equal(L.readSubscribeConfig({ BREVO_LIST_PROSPECTS: '12' }).prospectsListId, 12);
    // template + secret alone are not enough: the switch must be "true"
    assert.equal(L.readSubscribeConfig({ BREVO_CONFIRM_TEMPLATE_ID: '4', SUBSCRIBE_CONFIRM_SECRET: 's' }).confirmEmailEnabled, false);
    assert.equal(L.readSubscribeConfig({ SUBSCRIBE_CONFIRM_EMAIL: 'true', SUBSCRIBE_CONFIRM_SECRET: 's' }).confirmEmailEnabled, false);
    assert.equal(L.readSubscribeConfig({ SUBSCRIBE_CONFIRM_EMAIL: 'true', BREVO_CONFIRM_TEMPLATE_ID: '4' }).confirmEmailEnabled, false);
    assert.equal(
        L.readSubscribeConfig({ SUBSCRIBE_CONFIRM_EMAIL: 'true', BREVO_CONFIRM_TEMPLATE_ID: '4', SUBSCRIBE_CONFIRM_SECRET: 's' }).confirmEmailEnabled,
        true
    );
});

test('blocked: blacklisted or unsubscribed from any list', () => {
    assert.equal(L.isBlocked(null), false);
    assert.equal(L.isBlocked({ emailBlacklisted: false, listUnsubscribed: [] }), false);
    assert.equal(L.isBlocked({ emailBlacklisted: true }), true);
    assert.equal(L.isBlocked({ emailBlacklisted: false, listUnsubscribed: [6] }), true);
});

test('signup attributes use only existing Brevo attributes unless proof attributes are enabled', () => {
    const proof = { source: 'web:home', at: '2026-10-08T12:00:00.000Z', page: 'https://pitchgrid.io/', textVersion: 'v1' };
    const a = L.signupAttributes(L.readSubscribeConfig({}), proof, { name: 'X', ck1: true });
    assert.deepEqual(Object.keys(a).sort(), ['CK1_WAITLIST', 'FIRSTNAME', 'OPT_IN', 'SIGNUP_SOURCE']);
    assert.equal(L.signupAttributes(L.readSubscribeConfig({}), proof, { ck1: false }).CK1_WAITLIST, undefined);
    const b = L.signupAttributes(L.readSubscribeConfig({ BREVO_PROOF_ATTRIBUTES: 'consent_at, CONSENT_URL,CONSENT_TEXT_VERSION,BOGUS' }), proof, {});
    assert.equal(b.CONSENT_AT, proof.at);
    assert.equal(b.CONSENT_URL, proof.page);
    assert.equal(b.CONSENT_TEXT_VERSION, 'v1');
    assert.equal(b.BOGUS, undefined);
});

test('confirm attributes: DOUBLE_OPT-IN=Yes; DOI_CONFIRMED(_AT) only when enabled', () => {
    assert.deepEqual(L.confirmAttributes(L.readSubscribeConfig({}), 't'), { 'DOUBLE_OPT-IN': 1 });
    assert.deepEqual(L.confirmAttributes(L.readSubscribeConfig({ BREVO_PROOF_ATTRIBUTES: 'DOI_CONFIRMED,DOI_CONFIRMED_AT' }), 't'), {
        'DOUBLE_OPT-IN': 1,
        DOI_CONFIRMED: true,
        DOI_CONFIRMED_AT: 't'
    });
    assert.equal(L.alreadyConfirmed({ attributes: { 'DOUBLE_OPT-IN': 1 } }), true);
    assert.equal(L.alreadyConfirmed({ attributes: {} }), false);
});

test('page URL: same host only, query and hash dropped', () => {
    assert.equal(L.sanitizePage('https://pitchgrid.io/download?utm_source=x#a', 'https://pitchgrid.io'), 'https://pitchgrid.io/download');
    assert.equal(L.sanitizePage('https://evil.example/', 'https://pitchgrid.io'), null);
    assert.equal(L.sanitizePage('javascript:alert(1)', 'https://pitchgrid.io'), null);
    assert.equal(L.sanitizePage(42, 'https://pitchgrid.io'), null);
});

test('confirm token: round trip, tamper, wrong secret, expiry', async () => {
    const now = Date.UTC(2026, 9, 8);
    const t = await L.signConfirmToken('sec', 178, now);
    assert.doesNotMatch(t, /@/);
    assert.deepEqual(await L.verifyConfirmToken('sec', t, now + 1000), { contactId: 178 });
    assert.equal(await L.verifyConfirmToken('other', t, now), null);
    assert.equal(await L.verifyConfirmToken(undefined, t, now), null);
    const [p, s] = t.split('.');
    const forged = Buffer.from(JSON.stringify({ c: 1, t: Math.floor(now / 1000) })).toString('base64url');
    assert.equal(await L.verifyConfirmToken('sec', `${forged}.${s}`, now), null);
    assert.equal(await L.verifyConfirmToken('sec', `${p}.${s}x`, now), null);
    assert.equal(await L.verifyConfirmToken('sec', t, now + (L.CONFIRM_TOKEN_MAX_AGE_S + 1) * 1000), null);
    assert.equal(await L.verifyConfirmToken('sec', 'garbage', now), null);
});
