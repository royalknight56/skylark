/**
 * Referral and organization quota helpers.
 */

export const REFERRAL_UNLOCK_THRESHOLD = 5;
const BASE_ORG_LIMIT = 1;
const REFERRAL_BONUS_ORG_LIMIT = 1;

export interface OrgCreationQuota {
  owned_count: number;
  org_limit: number;
  verified_referrals: number;
  referrals_needed: number;
  can_create: boolean;
}

interface CountRow {
  count: number;
}

export async function getOrgCreationQuota(db: D1Database, userId: string): Promise<OrgCreationQuota> {
  const [owned, referrals] = await Promise.all([
    db.prepare("SELECT COUNT(*) AS count FROM organizations WHERE owner_id = ?").bind(userId).first<CountRow>(),
    getVerifiedReferralCount(db, userId),
  ]);
  const verifiedReferrals = referrals;
  const orgLimit = BASE_ORG_LIMIT + (verifiedReferrals >= REFERRAL_UNLOCK_THRESHOLD ? REFERRAL_BONUS_ORG_LIMIT : 0);

  return {
    owned_count: owned?.count || 0,
    org_limit: orgLimit,
    verified_referrals: verifiedReferrals,
    referrals_needed: Math.max(REFERRAL_UNLOCK_THRESHOLD - verifiedReferrals, 0),
    can_create: (owned?.count || 0) < orgLimit,
  };
}

export async function createReferralRegistration(
  db: D1Database,
  inviterId: string | null | undefined,
  referredUserId: string
): Promise<void> {
  const normalizedInviterId = inviterId?.trim();
  if (!normalizedInviterId || normalizedInviterId === referredUserId) return;

  const inviter = await db
    .prepare("SELECT id FROM users WHERE id = ? LIMIT 1")
    .bind(normalizedInviterId)
    .first<{ id: string }>();
  if (!inviter) return;

  await db
    .prepare(`
      INSERT OR IGNORE INTO referral_registrations (id, inviter_user_id, referred_user_id, status)
      VALUES (?, ?, ?, 'pending')
    `)
    .bind(`ref-${crypto.randomUUID()}`, normalizedInviterId, referredUserId)
    .run();
}

export async function markReferralVerified(db: D1Database, referredUserId: string): Promise<void> {
  await db
    .prepare(`
      UPDATE referral_registrations
      SET status = 'verified', verified_at = CURRENT_TIMESTAMP
      WHERE referred_user_id = ? AND status = 'pending'
    `)
    .bind(referredUserId)
    .run();
}

async function getVerifiedReferralCount(db: D1Database, userId: string): Promise<number> {
  const row = await db
    .prepare(`
      SELECT COUNT(*) AS count
      FROM referral_registrations
      WHERE inviter_user_id = ? AND status = 'verified'
    `)
    .bind(userId)
    .first<CountRow>();
  return row?.count || 0;
}
