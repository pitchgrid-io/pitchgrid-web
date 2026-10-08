// Run: npm run test:consent   (node:test, no extra dependencies)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { loadTs } from '../scripts/load-ts.mjs';

const L = await loadTs('src/lib/server/consent/logic.ts');
// Brevo list 5 = owners-service, list 8 = owners-news, list 6 = prospects.
const cfg = L.readConfig({});
const none = { exists: false };
const contact = (listIds, emailBlacklisted = false, listUnsubscribed = []) => ({ exists: true, listIds, emailBlacklisted, listUnsubscribed });
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

test('config: defaults are lists 5/8/6, writes off', () => {
    const d = L.readConfig({});
    assert.deepEqual(d.lists, { ownersService: 5, ownersNews: 8, prospects: 6 });
    assert.equal(d.writesEnabled, false);
    assert.equal(d.moonbasePrefsWrite, false);
    assert.deepEqual(L.readConfig({ BREVO_LIST_OWNERS_SERVICE: '11', BREVO_LIST_OWNERS_NEWS: '12' }).lists.ownersNews, 12);
});

test('order: buyer without opt-in -> owners-service only', () => {
    assert.deepEqual(kinds(L.planForOwner(cfg, off, none)), ['upsert_owner_service', 'skip']);
    assert.deepEqual(kinds(L.planForOwner(cfg, off, contact([2, 6]))), ['upsert_owner_service', 'skip']);
});

test('order: newsletter or product-updates opt-in -> list 5 and list 8 directly, no DOI', () => {
    for (const p of [nl, pu, { newsletterOptIn: true, productUpdatesOptIn: true }]) {
        for (const c of [none, contact([2, 6])]) {
            const a = L.planForOwner(cfg, p, c);
            assert.deepEqual(a.map((x) => [x.kind, x.listId]), [['upsert_owner_service', 5], ['add_to_news', 8]]);
        }
    }
    assert.ok(!JSON.stringify(L.planForOwner(cfg, nl, none)).match(/doi/i));
});

test('order: blacklisted or unsubscribed contact is never (re-)added to any list', () => {
    for (const c of [contact([6], true), contact([6], false, [8]), contact([], false, [2])]) {
        assert.deepEqual(kinds(L.planForOwner(cfg, nl, c, true)), ['skip']);
    }
});

test('order: already in owners-news -> no second add', () => {
    assert.deepEqual(kinds(L.planForOwner(cfg, nl, contact([8]))), ['upsert_owner_service', 'skip']);
});

test('order: list ids follow env', () => {
    const a = L.planForOwner(L.readConfig({ BREVO_LIST_OWNERS_SERVICE: '15', BREVO_LIST_OWNERS_NEWS: '18' }), pu, none);
    assert.deepEqual(a.map((x) => x.listId), [15, 18]);
});

test('prefs change: both off -> remove from owners-news (even if blocked); already out -> noop', () => {
    assert.deepEqual(L.planForPrefsChange(cfg, off, contact([5, 8]), true), [{ kind: 'remove_from_news', listId: 8 }]);
    assert.deepEqual(L.planForPrefsChange(cfg, off, contact([5, 8], true), true), [{ kind: 'remove_from_news', listId: 8 }]);
    assert.deepEqual(kinds(L.planForPrefsChange(cfg, off, contact([5]), true)), ['skip']);
});

test('prefs change: owner opts in -> list 8 directly, no service-list action', () => {
    assert.deepEqual(L.planForPrefsChange(cfg, pu, contact([5]), true), [{ kind: 'add_to_news', listId: 8 }]);
    assert.deepEqual(kinds(L.planForPrefsChange(cfg, nl, contact([5, 8]), true)), ['skip']);
});

test('prefs change: blocked owner opting in is not re-added', () => {
    assert.deepEqual(kinds(L.planForPrefsChange(cfg, nl, contact([5], true), true)), ['skip']);
    assert.deepEqual(kinds(L.planForPrefsChange(cfg, nl, contact([5], false, [8]), true)), ['skip']);
});

test('prefs change: non-owner newsletter contact is not added to owner lists', () => {
    assert.deepEqual(L.planForPrefsChange(cfg, nl, none, false), [{ kind: 'skip', reason: 'not an owner' }]);
});

test('brevo opt-out events and Moonbase patch body', () => {
    assert.ok(L.isBrevoOptOutEvent('unsubscribe'));
    assert.ok(L.isBrevoOptOutEvent('spam'));
    assert.ok(!L.isBrevoOptOutEvent('list_addition'));
    // Newsletter flag only; productUpdatesOptIn is never written back.
    assert.deepEqual(L.moonbaseOptOutPatch(), { communicationPreferences: { newsletterOptIn: false } });
});

test('PURCHASED only for real paid orders', () => {
    assert.equal(L.planForOwner(cfg, off, none)[0].purchased, false); // default: not paid (granted / prefs)
    assert.equal(L.planForOwner(cfg, off, none, true)[0].purchased, true);
    assert.ok(L.isPaidOrder({ total: { due: { amount: 42 } }, isFullyRefunded: false }));
    assert.ok(!L.isPaidOrder({ total: { due: { amount: 0 } } }));          // €0 coupon order
    assert.ok(!L.isPaidOrder({ total: { due: { amount: 42 } }, isFullyRefunded: true }));
    assert.ok(!L.isPaidOrder(null));
});

test('retryable statuses', () => {
    assert.ok(L.isRetryable(0) && L.isRetryable(429) && L.isRetryable(503));
    assert.ok(!L.isRetryable(400) && !L.isRetryable(401) && !L.isRetryable(404));
});
