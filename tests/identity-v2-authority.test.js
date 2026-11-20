'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {installIdentityMembershipSchema}=require('../server/identity/schema');
const {createMembershipAuthority}=require('../server/identity/authority');

function fixture(){
 const db=new DatabaseSync(':memory:');
 db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY,role TEXT NOT NULL,verified INTEGER NOT NULL);");
 db.exec("INSERT INTO users VALUES('admin-1','admin',1),('admin-2','admin',1),('customer-1','customer',1),('bad-admin','admin',0);");
 installIdentityMembershipSchema(db);
 db.prepare("INSERT INTO identity_organizations(id,kind,legal_name,status,created_at,updated_at) VALUES('agency-1','AGENCY','Test agency','ACTIVE','2026-01-01','2026-01-01')").run();
 db.prepare("INSERT INTO identity_organizations(id,kind,legal_name,status,created_at,updated_at) VALUES('pharmacy-1','PHARMACY','Test pharmacy','ACTIVE','2026-01-01','2026-01-01')").run();
 let n=0;
 const service=createMembershipAuthority({db,clock:()=> '2026-11-20T10:00:00.000Z',ids:()=> 'identity-'+(++n)});
 return {db,service};
}
test('request requires verified admin and correct organization scope',()=>{
 const {db,service}=fixture();
 assert.throws(()=>service.request({actorId:'customer-1',userId:'admin-1',organizationId:'agency-1',role:'AGENT'}),/IDENTITY_REVIEWER_NOT_AUTHORIZED/);
 assert.throws(()=>service.request({actorId:'bad-admin',userId:'customer-1',organizationId:'agency-1',role:'AGENT'}),/IDENTITY_REVIEWER_NOT_AUTHORIZED/);
 assert.throws(()=>service.request({actorId:'admin-1',userId:'admin-1',role:'DRIVER'}),/IDENTITY_SELF_APPROVAL_FORBIDDEN/);
 assert.throws(()=>service.request({actorId:'admin-1',userId:'customer-1',organizationId:'pharmacy-1',role:'AGENT'}),/IDENTITY_ORGANIZATION_SCOPE_MISMATCH/);
 const member=service.request({actorId:'admin-1',userId:'customer-1',organizationId:'agency-1',role:'AGENT'});
 assert.equal(member.status,'PENDING');
 assert.equal(db.prepare('SELECT count(*) AS n FROM identity_membership_events').get().n,1);
 assert.equal(db.prepare('SELECT role FROM users WHERE id=?').get('customer-1').role,'customer');
 db.close();
});
test('verified evidence, version fencing, immutable events, suspension and revocation',()=>{
 const {db,service}=fixture();
 const member=service.request({actorId:'admin-1',userId:'customer-1',organizationId:'agency-1',role:'AGENT'});
 assert.throws(()=>service.transition({actorId:'admin-2',membershipId:member.id,to:'APPROVED',expectedVersion:1,evidenceReference:'private://review/1'}),/IDENTITY_EVIDENCE_NOT_VERIFIED/);
 service.addVerification({actorId:'admin-2',membershipId:member.id,kind:'AGENCY_KYC',evidenceReference:'private://review/1'});
 const approved=service.transition({actorId:'admin-2',membershipId:member.id,to:'APPROVED',expectedVersion:1,evidenceReference:'private://review/1'});
 assert.equal(approved.status,'APPROVED');
 assert.equal(approved.version,2);
 assert.throws(()=>service.transition({actorId:'admin-2',membershipId:member.id,to:'REVOKED',expectedVersion:1}),/IDENTITY_VERSION_CONFLICT/);
 const suspended=service.transition({actorId:'admin-2',membershipId:member.id,to:'SUSPENDED',expectedVersion:2});
 assert.equal(suspended.status,'SUSPENDED');
 const revoked=service.transition({actorId:'admin-2',membershipId:member.id,to:'REVOKED',expectedVersion:3});
 assert.equal(revoked.status,'REVOKED');
 assert.throws(()=>service.transition({actorId:'admin-2',membershipId:member.id,to:'APPROVED',expectedVersion:4,evidenceReference:'private://review/1'}),/IDENTITY_INVALID_TRANSITION/);
 assert.equal(db.prepare('SELECT count(*) AS n FROM identity_membership_events WHERE membership_id=?').get(member.id).n,5);
 assert.equal(db.prepare('SELECT role FROM users WHERE id=?').get('customer-1').role,'customer');
 db.close();
});
test('failed approval does not partially update state or append audit events',()=>{
 const {db,service}=fixture();
 const member=service.request({actorId:'admin-1',userId:'customer-1',organizationId:'pharmacy-1',role:'PHARMACIST'});
 const before=db.prepare('SELECT count(*) AS n FROM identity_membership_events').get().n;
 assert.throws(()=>service.transition({actorId:'admin-2',membershipId:member.id,to:'APPROVED',expectedVersion:1,evidenceReference:'unreviewed'}),/IDENTITY_EVIDENCE_NOT_VERIFIED/);
 assert.equal(db.prepare('SELECT status FROM identity_memberships WHERE id=?').get(member.id).status,'PENDING');
 assert.equal(db.prepare('SELECT count(*) AS n FROM identity_membership_events').get().n,before);
 db.close();
});
test('admin and operations role approval is disabled pending privileged policy review',()=>{
 const {db,service}=fixture();
 const member=service.request({actorId:'admin-1',userId:'customer-1',role:'ADMIN'});
 service.addVerification({actorId:'admin-2',membershipId:member.id,kind:'REVIEW',evidenceReference:'private://review/admin'});
 assert.throws(()=>service.transition({actorId:'admin-2',membershipId:member.id,to:'APPROVED',expectedVersion:1,evidenceReference:'private://review/admin'}),/IDENTITY_PRIVILEGED_ROLE_DISABLED/);
 db.close();
});
