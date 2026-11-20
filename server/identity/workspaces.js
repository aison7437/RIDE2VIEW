'use strict';

/**
 * Ride2View Identity V1: READ-ONLY workspace discovery.
 *
 * This does not change authorization. Existing domain APIs still require the
 * legacy users.role and independently checked professional eligibility.
 * Never interpret a workspace link as approval to drive, publish, dispense,
 * or perform privileged operations.
 */
const WORKSPACES = Object.freeze({
  customer: Object.freeze({key:'customer',label:'Customer',path:'/customer'}),
  driver: Object.freeze({key:'driver',label:'Driver',path:'/driver'}),
  agent: Object.freeze({key:'agent',label:'Property Agent',path:'/agent'}),
  admin: Object.freeze({key:'admin',label:'Administration',path:'/admin'})
});

function allowedWorkspaces(db, user) {
  if (!user) return null;
  const primary = WORKSPACES[user.role];
  if (!primary) return {defaultWorkspace:null,workspaces:[],applications:[],phase:'LEGACY_PRIMARY_ROLE_ONLY'};
  const hasVerifiedContact = Boolean(
    db.prepare("SELECT 1 FROM auth_contacts WHERE user_id=? AND verified_at IS NOT NULL LIMIT 1").get(user.id)
  );
  const contactVerified = hasVerifiedContact;
  const professional = user.role === 'agent' || user.role === 'driver';
  // A professional's legacy verified flag is NOT a complete safety/agency
  // clearance; the operating domain rechecks documentary review every time.
  const operationalStatus = professional
    ? 'REQUIRES_DOMAIN_ELIGIBILITY_CHECK'
    : (Boolean(user.verified) || hasVerifiedContact ? 'IDENTITY_VERIFIED' : 'IDENTITY_PENDING');
  const workspaces = [{
    ...primary,
    membership:'PRIMARY_LEGACY_ROLE',
    operationalStatus,
    contactVerified
  }];
  // Applications are discovery-only until separate regulated onboarding,
  // organization roles, approval and server-side policy enforcement exist.
  const applications = user.role === 'customer'
    ? ['driver','agent','pharmacy'].map(key=>({
        key,
        status:'NOT_STARTED',
        selfServiceEnabled:false
      }))
    : [];
  return {
    defaultWorkspace:primary.key,
    workspaces,
    applications,
    phase:'LEGACY_PRIMARY_ROLE_ONLY',
    multiRoleEnabled:false
  };
}

module.exports = {allowedWorkspaces, WORKSPACES};
