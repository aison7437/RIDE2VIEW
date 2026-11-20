'use strict';

/**
 * Additive Identity V2 persistence. No runtime authorization reads these
 * tables yet. Existing users.role and domain verification remain authoritative.
 * No legacy accounts are auto-merged or auto-approved.
 */
function installIdentityMembershipSchema(db) {
  db.exec(`
    CREATE TABLE identity_organizations(
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL CHECK(kind IN ('AGENCY','FLEET','PHARMACY','PLATFORM')),
      legal_name TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','ACTIVE','SUSPENDED','REVOKED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE identity_memberships(
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      organization_id TEXT REFERENCES identity_organizations(id),
      role TEXT NOT NULL CHECK(role IN ('CUSTOMER','DRIVER','AGENT','PHARMACIST','PHARMACY_STAFF','OPERATIONS','ADMIN')),
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','APPROVED','SUSPENDED','REVOKED','EXPIRED')),
      approved_by TEXT REFERENCES users(id),
      approved_at TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      version INTEGER NOT NULL DEFAULT 1 CHECK(version>=1),
      CHECK(status<>'APPROVED' OR (approved_by IS NOT NULL AND approved_at IS NOT NULL)),
      CHECK(role NOT IN ('PHARMACIST','PHARMACY_STAFF','AGENT') OR organization_id IS NOT NULL)
    );
    CREATE INDEX identity_memberships_user ON identity_memberships(user_id,status,role);
    CREATE INDEX identity_memberships_organization ON identity_memberships(organization_id,status);
    CREATE UNIQUE INDEX identity_memberships_scoped_role ON identity_memberships(
      user_id,COALESCE(organization_id,''),role
    ) WHERE status IN ('PENDING','APPROVED','SUSPENDED');
    CREATE TABLE identity_verification_records(
      id TEXT PRIMARY KEY,
      membership_id TEXT NOT NULL REFERENCES identity_memberships(id),
      kind TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('PENDING','VERIFIED','REJECTED','EXPIRED','REVOKED')),
      evidence_reference TEXT,
      reviewed_by TEXT REFERENCES users(id),
      reviewed_at TEXT,
      expires_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      CHECK(status<>'VERIFIED' OR (reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL))
    );
    CREATE INDEX identity_verification_membership ON identity_verification_records(membership_id,status);
    CREATE TABLE identity_membership_events(
      id TEXT PRIMARY KEY,
      membership_id TEXT NOT NULL REFERENCES identity_memberships(id),
      actor_id TEXT NOT NULL REFERENCES users(id),
      action TEXT NOT NULL CHECK(action IN ('REQUESTED','APPROVED','SUSPENDED','REVOKED','EXPIRED','EVIDENCE_REVIEWED')),
      prior_status TEXT,
      next_status TEXT NOT NULL,
      evidence_reference TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX identity_membership_events_order ON identity_membership_events(membership_id,created_at,id);
    CREATE TRIGGER identity_membership_events_immutable_update
      BEFORE UPDATE ON identity_membership_events
      BEGIN SELECT RAISE(ABORT,'IDENTITY_AUDIT_IMMUTABLE'); END;
    CREATE TRIGGER identity_membership_events_immutable_delete
      BEFORE DELETE ON identity_membership_events
      BEGIN SELECT RAISE(ABORT,'IDENTITY_AUDIT_IMMUTABLE'); END;
  `);
}
module.exports = {installIdentityMembershipSchema};
