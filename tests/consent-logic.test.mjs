// Run: npm run test:consent   (node:test, no extra dependencies)
import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { loadTs } from '../scripts/load-ts.mjs';

const L = await loadTs('src/lib/server/consent/logic.ts');
// Brevo list 5 = owners-service, list 8 = owners-news, list 6 = prospects, list 9 = hypothetical DOI list.
const cfg = L.readConfig({ BREVO_DOI_TEMPLATE_ID: '3', BREVO_CONFIRMED_LIST_IDS: '9' });
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

test('config: defaults are lists 5/8/6, writes and DOI off, no confirmed lists', () => {
    const d = L.readConfig({});
    assert.deepEqual(d.lists, { ownersService: 5, ownersNews: 8, prospects: 6 });
    assert.equal(d.writesEnabled, false);
    assert.equal(d.doiEnabled, false);
    assert.equal(d.moonbasePrefsWrite, false);
    assert.deepEqual(d.confirmedListIds, []);
    assert.deepEqual(L.readConfig({ BREVO_LIST_OWNERS_SERVICE: '11', BREVO_LIST_OWNERS_NEWS: '12' }).lists.ownersNews, 12);
});

test('config: lists 2, 5 and 6 never count as DOI proof', () => {
    assert.deepEqual(L.readConfig({ BREVO_CONFIRMED_LIST_IDS: '2,5,6,8' }).confirmedListIds, [8]);
});

test('order: contact only in lists 2/5/6 still needs DOI (not proof)', () => {
    assert.deepEqual(kinds(L.planForOwner(cfg, nl, contact([2, 5, 6]))), ['upsert_owner_service', 'trigger_doi_news']);
    assert.deepEqual(kinds(L.planForOwner(cfg, off, contact([2, 6]))), ['upsert_owner_service', 'skip']);
});

test('order: buyer without opt-in -> owners-service only', () => {
    assert.deepEqual(kinds(L.planForOwner(cfg, off, none)), ['upsert_owner_service', 'skip']);
});

test('order: buyer with newsletter or product-updates opt-in -> DOI for owners-news', () => {
    for (const p of [nl, pu]) {
        const a = L.planForOwner(cfg, p, none);
        assert.deepEqual(kinds(a), ['upsert_owner_service', 'trigger_doi_news']);
        assert.equal(a[1].listId, 8);
        assert.equal(a[1].templateId, 3);
    }
});

test('order: member of a configured DOI list -> moved to owners-news without second DOI', () => {
    const a = L.planForOwner(cfg, off, contact([9]));
    assert.deepEqual(kinds(a), ['upsert_owner_service', 'move_prospect_to_news']);
    assert.deepEqual(a[1], { kind: 'move_prospect_to_news', addListId: 8, removeListIds: [9] });
});

test('order: blacklisted contact is never re-subscribed, but stays on service list', () => {
    assert.deepEqual(kinds(L.planForOwner(cfg, nl, contact([9], true))), ['upsert_owner_service', 'skip']);
});

test('order: already in owners-news -> no DOI', () => {
    assert.deepEqual(kinds(L.planForOwner(cfg, nl, contact([8]))), ['upsert_owner_service', 'skip']);
});

test('order: no DOI template configured -> service list only, never throws', () => {
    assert.deepEqual(kinds(L.planForOwner(L.readConfig({}), nl, none)), ['upsert_owner_service', 'skip']);
});

test('prefs change: both off -> remove from owners-news; already out -> noop', () => {
    assert.deepEqual(L.planForPrefsChange(cfg, off, contact([5, 8]), true), [{ kind: 'remove_from_news', listId: 8 }]);
    assert.deepEqual(kinds(L.planForPrefsChange(cfg, off, contact([5]), true)), ['skip']);
});

test('prefs change: owner opts in -> DOI, no service-list action', () => {
    assert.deepEqual(kinds(L.planForPrefsChange(cfg, pu, contact([5]), true)), ['trigger_doi_news']);
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

test('retryable statuses', () => {
    assert.ok(L.isRetryable(0) && L.isRetryable(429) && L.isRetryable(503));
    assert.ok(!L.isRetryable(400) && !L.isRetryable(401) && !L.isRetryable(404));
});
