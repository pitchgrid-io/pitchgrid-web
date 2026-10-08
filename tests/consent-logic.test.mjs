// Run: npm run test:consent   (node:test, no extra dependencies)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { loadTs } from '../scripts/load-ts.mjs';

const L = await loadTs('src/lib/server/consent/logic.ts');
const cfg = L.readConfig({
    BREVO_LIST_OWNERS_SERVICE: '11', BREVO_LIST_OWNERS_NEWS: '12', BREVO_LIST_PROSPECTS: '6',
    BREVO_DOI_TEMPLATE_ID: '3'
});
const none = { exists: false };
const contact = (listIds, emailBlacklisted = false) => ({ exists: true, listIds, emailBlacklisted });
const off = { newsletterOptIn: false, productUpdatesOptIn: false };
const nl = { newsletterOptIn: true, productUpdatesOptIn: false };
const pu = { newsletterOptIn: false, productUpdatesOptIn: true };
const kinds = (a) => a.map((x) => x.kind);

test('signature: matches Moonbase reference (Base64 HMAC-SHA256, upper-cased)', async () => {
    const body = '{"eventType":"OrderCompleted"}';
    const sig = createHmac('sha256', 's3cret').update(body).digest('base64').toUpperCase();
    assert.equal(await L.moonbaseSignature('s3cret', body), sig);
    assert.ok(await L.verifyMoonbaseSignature('s3cret', body, sig));
    assert.ok(await L.verifyMoonbaseSignature('s3cret', body, sig.toLowerCase()));
    assert.ok(!(await L.verifyMoonbaseSignature('s3cret', body + ' ', sig)));
    assert.ok(!(await L.verifyMoonbaseSignature('other', body, sig)));
    assert.ok(!(await L.verifyMoonbaseSignature('s3cret', body, null)));
    assert.ok(!(await L.verifyMoonbaseSignature('', body, sig)));
    assert.ok(L.safeEqual('abc', 'abc') && !L.safeEqual('abc', 'abd') && !L.safeEqual('abc', 'abcd'));
});

test('config: writes and DOI are off by default; confirmed lists default to prospects', () => {
    assert.equal(cfg.writesEnabled, false);
    assert.equal(cfg.doiEnabled, false);
    assert.equal(cfg.moonbasePrefsWrite, false);
    assert.deepEqual(cfg.confirmedListIds, [6]);
    assert.deepEqual(L.readConfig({ BREVO_LIST_PROSPECTS: '6', BREVO_CONFIRMED_LIST_IDS: '6, 2' }).confirmedListIds, [6, 2]);
});

test('order: buyer without opt-in -> owners-service only', () => {
    assert.deepEqual(kinds(L.planForOwner(cfg, off, none)), ['upsert_owner_service', 'skip']);
});

test('order: buyer with newsletter or product-updates opt-in -> DOI for owners-news', () => {
    for (const p of [nl, pu]) {
        const a = L.planForOwner(cfg, p, none);
        assert.deepEqual(kinds(a), ['upsert_owner_service', 'trigger_doi_news']);
        assert.equal(a[1].listId, 12);
        assert.equal(a[1].templateId, 3);
    }
});

test('order: confirmed prospect -> moved to owners-news without second DOI (even without Moonbase flag)', () => {
    const a = L.planForOwner(cfg, off, contact([6]));
    assert.deepEqual(kinds(a), ['upsert_owner_service', 'move_prospect_to_news']);
    assert.deepEqual(a[1], { kind: 'move_prospect_to_news', addListId: 12, removeListIds: [6] });
});

test('order: blacklisted contact is never re-subscribed, but stays on service list', () => {
    assert.deepEqual(kinds(L.planForOwner(cfg, nl, contact([6], true))), ['upsert_owner_service', 'skip']);
});

test('order: already in owners-news -> no DOI', () => {
    assert.deepEqual(kinds(L.planForOwner(cfg, nl, contact([12]))), ['upsert_owner_service', 'skip']);
});

test('order: missing list config -> skips, never throws', () => {
    const empty = L.readConfig({});
    assert.deepEqual(kinds(L.planForOwner(empty, nl, none)), ['skip', 'skip']);
});

test('prefs change: both off -> remove from owners-news; already out -> noop', () => {
    assert.deepEqual(L.planForPrefsChange(cfg, off, contact([11, 12]), true), [{ kind: 'remove_from_news', listId: 12 }]);
    assert.deepEqual(kinds(L.planForPrefsChange(cfg, off, contact([11]), true)), ['skip']);
});

test('prefs change: owner opts in -> DOI, no service-list action', () => {
    assert.deepEqual(kinds(L.planForPrefsChange(cfg, pu, contact([11]), true)), ['trigger_doi_news']);
});

test('prefs change: non-owner newsletter contact is not added to owner lists', () => {
    assert.deepEqual(L.planForPrefsChange(cfg, nl, none, false), [{ kind: 'skip', reason: 'not an owner' }]);
});

test('brevo opt-out events and Moonbase patch body', () => {
    assert.ok(L.isBrevoOptOutEvent('unsubscribe'));
    assert.ok(L.isBrevoOptOutEvent('spam'));
    assert.ok(!L.isBrevoOptOutEvent('list_addition'));
    assert.deepEqual(L.moonbaseOptOutPatch(cfg), { communicationPreferences: { newsletterOptIn: false } });
    const both = L.readConfig({ MOONBASE_PREFS_WRITE_PRODUCT_UPDATES: 'true' });
    assert.deepEqual(L.moonbaseOptOutPatch(both), { communicationPreferences: { newsletterOptIn: false, productUpdatesOptIn: false } });
});

test('retryable statuses', () => {
    assert.ok(L.isRetryable(0) && L.isRetryable(429) && L.isRetryable(503));
    assert.ok(!L.isRetryable(400) && !L.isRetryable(401) && !L.isRetryable(404));
});
