'use strict';

/**
 * Identity V1 is an additive compatibility layer.
 * Legacy domain APIs continue to authorize against users.role and their
 * domain-specific verification records; a workspace entry is NOT permission.
 */
const LEGACY_ROLES = Object.freeze(['customer', 'driver', 'agent', 'admin']);
const WORKSPACE_PATHS = Object.freeze({
  customer: '/customer',
  driver: '/driver',
  agent: '/agent',
  admin: '/admin'
});

function allowedWorkspaces(db, user) {
  if (!user) return null;
  if (!LEGACY_ROLES.includes(user.role)) return { defaultWorkspace: null, workspaces: [], applications: [] };
  const now = new Date().toISOString();
  const hasVerifiedContact = Boolean(
    db.prepare("SELECT 1 FROM auth_contacts WHERE user_id=? AND verified_at IS NOT NULL LIMIT 1").get(user.id)
  );
  const identityVerified = Boolean(user.verified || hasVerifiedContact);

  // Do not silently grant customer access to a legacy professional identity.
  // Existing role guards still enforce all business APIs.
  const workspaces = [];
  const applications = [];
  const approved = user.role === 'customer' ? identityVerified : user.role === 'admin' ? Boolean(user.verified) : Boolean(user.verified);
  const role = user.role;
  const operationallyEligible = role === 'customer' || role === 'admin'
    ? approved : role === 'agent'
      ? approved && Boolean(db.prepare("SELECT 1 FROM agent_profiles WHERE user_id=? LIMIT 1").get(user.id))
      : approved && Boolean(db.prepare("SELECT 1 FROM driver_profiles WHERE user_id=? LIMIT 1").get(user.id));

  // Existing service-level guards remain authoritative, including independent
  // agent publication and driver dispatch eligibility checks. We only advertise
  // a landing page, not a promise that operational actions are enabled.
  if (identityVerified) {
    workspaces.push({
      key: role,
      label: {customer:'Customer',driver:'Driver',agent:'Property Agent',admin:'Administration'}[role],
      path: WORKSPACE_PATHS[role],
      operationalStatus: operationallyEligible ? 'ELIGIBILITY_REQUIRES_DOMAIN_CHECK' : 'PENDING_VERIFICATION'
    });
  }
  if (role === 'customer') {
    for (const application of ['driver','agent','pharmacy']) {
      applications.push({ key: application, status: 'NOT_STARTED', selfServiceEnabled: false });
    }
  }
  return { defaultWorkspace: workspaces[0]?.key || null, workspaces, applications, asOf: now };
}

module.exports = {allowedWorkspaces, WORKSPACE_PATHS};
