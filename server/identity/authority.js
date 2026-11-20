'use strict';
const {randomUUID}=require('node:crypto');

/**
 * Privileged, server-only membership state machine.
 * This is not wired to HTTP and never authorizes existing domain operations.
 */
const ACTIVE_STATES=new Set(['PENDING','APPROVED','SUSPENDED']);
const TRANSITIONS=Object.freeze({
  PENDING:new Set(['APPROVED','REVOKED']),
  APPROVED:new Set(['SUSPENDED','REVOKED','EXPIRED']),
  SUSPENDED:new Set(['APPROVED','REVOKED','EXPIRED']),
  EXPIRED:new Set(),
  REVOKED:new Set()
});
function error(code){return Object.assign(new Error(code),{code});}
function createMembershipAuthority({db,clock=()=>new Date().toISOString(),ids=randomUUID}){
  if(!db)throw new TypeError('db required');
  const getMembership=db.prepare('SELECT * FROM identity_memberships WHERE id=?');
  const actorRecord=db.prepare('SELECT id,role,verified FROM users WHERE id=?');
  function authorize(actorId,subjectId){
    const actor=actorRecord.get(actorId);
    if(!actor||actor.role!=='admin'||!actor.verified)throw error('IDENTITY_REVIEWER_NOT_AUTHORIZED');
    if(actorId===subjectId)throw error('IDENTITY_SELF_APPROVAL_FORBIDDEN');
    return actor;
  }
  function tx(fn){
    db.exec('BEGIN IMMEDIATE');
    try{const value=fn();db.exec('COMMIT');return value;}
    catch(e){db.exec('ROLLBACK');throw e;}
  }
  function record({membershipId,actorId,action,priorStatus,nextStatus,evidenceReference,at}){
    db.prepare('INSERT INTO identity_membership_events(id,membership_id,actor_id,action,prior_status,next_status,evidence_reference,created_at) VALUES(?,?,?,?,?,?,?,?)')
      .run(ids(),membershipId,actorId,action,priorStatus,nextStatus,evidenceReference||null,at);
  }
  function request({actorId,userId,organizationId=null,role}){
    // Admin-led only: no public or self-service role application in V2.
    authorize(actorId,userId);
    if(!['CUSTOMER','DRIVER','AGENT','PHARMACIST','PHARMACY_STAFF','OPERATIONS','ADMIN'].includes(role))throw error('IDENTITY_INVALID_ROLE');
    const at=clock(),id=ids();
    return tx(()=>{
      if(!actorRecord.get(userId))throw error('IDENTITY_SUBJECT_NOT_FOUND');
      if(organizationId){
        const org=db.prepare('SELECT kind,status FROM identity_organizations WHERE id=?').get(organizationId);
        if(!org||org.status!=='ACTIVE')throw error('IDENTITY_ORGANIZATION_INACTIVE');
        const kinds={AGENT:['AGENCY'],DRIVER:['FLEET'],PHARMACIST:['PHARMACY'],PHARMACY_STAFF:['PHARMACY'],OPERATIONS:['PLATFORM'],ADMIN:['PLATFORM']};
        if(kinds[role]&&!kinds[role].includes(org.kind))throw error('IDENTITY_ORGANIZATION_SCOPE_MISMATCH');
      }else if(['AGENT','PHARMACIST','PHARMACY_STAFF'].includes(role))throw error('IDENTITY_ORGANIZATION_REQUIRED');
      db.prepare('INSERT INTO identity_memberships(id,user_id,organization_id,role,status,created_at,updated_at) VALUES(?,?,?,?,?,?,?)')
        .run(id,userId,organizationId,role,'PENDING',at,at);
      record({membershipId:id,actorId,action:'REQUESTED',priorStatus:null,nextStatus:'PENDING',at});
      return getMembership.get(id);
    });
  }
  function addVerification({actorId,membershipId,kind,evidenceReference,expiresAt=null}){
    if(!kind||!evidenceReference||typeof evidenceReference!=='string'||evidenceReference.length>500)throw error('IDENTITY_EVIDENCE_REQUIRED');
    const at=clock();
    return tx(()=>{
      const member=getMembership.get(membershipId);
      if(!member)throw error('IDENTITY_MEMBERSHIP_NOT_FOUND');
      authorize(actorId,member.user_id);
      if(!ACTIVE_STATES.has(member.status))throw error('IDENTITY_MEMBERSHIP_INACTIVE');
      if(expiresAt&&expiresAt<=at)throw error('IDENTITY_EVIDENCE_EXPIRED');
      const id=ids();
      db.prepare('INSERT INTO identity_verification_records(id,membership_id,kind,status,evidence_reference,reviewed_by,reviewed_at,expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
        .run(id,membershipId,kind,'VERIFIED',evidenceReference,actorId,at,expiresAt,at,at);
      record({membershipId,actorId,action:'EVIDENCE_REVIEWED',priorStatus:member.status,nextStatus:member.status,evidenceReference,at});
      return {id,membershipId,status:'VERIFIED'};
    });
  }
  function transition({actorId,membershipId,to,expectedVersion,evidenceReference=null}){
    if(!Number.isInteger(expectedVersion)||expectedVersion<1)throw error('IDENTITY_VERSION_REQUIRED');
    const at=clock();
    return tx(()=>{
      const member=getMembership.get(membershipId);
      if(!member)throw error('IDENTITY_MEMBERSHIP_NOT_FOUND');
      authorize(actorId,member.user_id);
      if(member.version!==expectedVersion)throw error('IDENTITY_VERSION_CONFLICT');
      if(!TRANSITIONS[member.status]?.has(to))throw error('IDENTITY_INVALID_TRANSITION');
      if(to==='APPROVED'){
        // Privileged access remains inert, even with approval. Future domain
        // policy integrations must independently validate evidence and scope.
        if(['ADMIN','OPERATIONS'].includes(member.role))throw error('IDENTITY_PRIVILEGED_ROLE_DISABLED');
        if(!evidenceReference||typeof evidenceReference!=='string')throw error('IDENTITY_EVIDENCE_REQUIRED');
        const evidence=db.prepare("SELECT 1 FROM identity_verification_records WHERE membership_id=? AND status='VERIFIED' AND evidence_reference=? AND (expires_at IS NULL OR expires_at>?) LIMIT 1")
          .get(membershipId,evidenceReference,at);
        if(!evidence)throw error('IDENTITY_EVIDENCE_NOT_VERIFIED');
        if(member.organization_id){
          const org=db.prepare('SELECT status FROM identity_organizations WHERE id=?').get(member.organization_id);
          if(org?.status!=='ACTIVE')throw error('IDENTITY_ORGANIZATION_INACTIVE');
        }
      }
      const action=to==='APPROVED'?'APPROVED':to;
      const result=db.prepare('UPDATE identity_memberships SET status=?,approved_by=CASE WHEN ?=\'APPROVED\' THEN ? ELSE approved_by END,approved_at=CASE WHEN ?=\'APPROVED\' THEN ? ELSE approved_at END,updated_at=?,version=version+1 WHERE id=? AND version=?')
        .run(to,to,actorId,to,at,at,membershipId,expectedVersion);
      if(result.changes!==1)throw error('IDENTITY_VERSION_CONFLICT');
      record({membershipId,actorId,action,priorStatus:member.status,nextStatus:to,evidenceReference,at});
      return getMembership.get(membershipId);
    });
  }
  return Object.freeze({request,addVerification,transition});
}
module.exports={createMembershipAuthority};
