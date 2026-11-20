'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {DatabaseSync}=require('node:sqlite');
const {installIdentityMembershipSchema}=require('../server/identity/schema');
const {CURRENT_SCHEMA_VERSION,runMigrations}=require('../server/migrations');

function dbFixture(){
 const db=new DatabaseSync(':memory:');
 db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY,role TEXT NOT NULL);");
 db.prepare("INSERT INTO users(id,role) VALUES('customer-1','customer'),('reviewer-1','admin')").run();
 installIdentityMembershipSchema(db);
 return db;
}
function org(db){
 db.prepare("INSERT INTO identity_organizations(id,kind,legal_name,status,created_at,updated_at) VALUES('org-1','PHARMACY','Example pharmacy','PENDING','2026-01-01','2026-01-01')").run();
}
function membership(db,id,status='PENDING',role='PHARMACIST',orgId='org-1'){
 db.prepare("INSERT INTO identity_memberships(id,user_id,organization_id,role,status,approved_by,approved_at,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?,?)")
 .run(id,'customer-1',orgId,role,status,status==='APPROVED'?'reviewer-1':null,status==='APPROVED'?'2026-01-02':null,'2026-01-01','2026-01-01');
}
test('V2 schema starts empty; never backfills or authorizes legacy identities',()=>{
 const db=dbFixture();
 assert.equal(db.prepare('SELECT count(*) AS n FROM identity_memberships').get().n,0);
 assert.equal(db.prepare('SELECT role FROM users WHERE id=?').get('customer-1').role,'customer');
 db.close();
});
test('membership approval requires a reviewer and organization-scoped professional role',()=>{
 const db=dbFixture();org(db);
 assert.throws(()=>db.prepare("INSERT INTO identity_memberships(id,user_id,organization_id,role,status,created_at,updated_at) VALUES('unreviewed','customer-1','org-1','PHARMACIST','APPROVED','2026-01-01','2026-01-01')").run(),/CHECK constraint/);
 assert.throws(()=>membership(db,'unscoped','PENDING','PHARMACIST',null),/CHECK constraint/);
 membership(db,'pending');
 assert.throws(()=>membership(db,'duplicate'),/UNIQUE constraint/);
 db.close();
});
test('membership events are append-only and linked to an existing reviewer',()=>{
 const db=dbFixture();org(db);membership(db,'membership-1');
 db.prepare("INSERT INTO identity_membership_events(id,membership_id,actor_id,action,next_status,created_at) VALUES('event-1','membership-1','reviewer-1','REQUESTED','PENDING','2026-01-01')").run();
 assert.throws(()=>db.prepare("UPDATE identity_membership_events SET action='APPROVED' WHERE id='event-1'").run(),/IDENTITY_AUDIT_IMMUTABLE/);
 assert.throws(()=>db.prepare("DELETE FROM identity_membership_events WHERE id='event-1'").run(),/IDENTITY_AUDIT_IMMUTABLE/);
 assert.throws(()=>db.prepare("INSERT INTO identity_membership_events(id,membership_id,actor_id,action,next_status,created_at) VALUES('event-2','membership-1','missing','APPROVED','APPROVED','2026-01-01')").run(),/FOREIGN KEY constraint/);
 db.close();
});
test('verification cannot be marked verified without reviewer evidence',()=>{
 const db=dbFixture();org(db);membership(db,'membership-1');
 assert.throws(()=>db.prepare("INSERT INTO identity_verification_records(id,membership_id,kind,status,created_at,updated_at) VALUES('v-1','membership-1','LICENCE','VERIFIED','2026-01-01','2026-01-01')").run(),/CHECK constraint/);
 db.close();
});
test('versioned migration registers V2 without changing existing authorization',()=>{
 const db=new DatabaseSync(':memory:');
 db.exec("PRAGMA foreign_keys=ON;CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,name TEXT,password TEXT,role TEXT NOT NULL,verified INTEGER);");
 assert.equal(runMigrations(db),CURRENT_SCHEMA_VERSION);
 assert.equal(CURRENT_SCHEMA_VERSION,29);
 assert.equal(db.prepare("SELECT name FROM schema_migrations WHERE version=29").get().name,'identity-v2-membership-foundation');
 assert.equal(db.prepare('SELECT count(*) AS n FROM identity_memberships').get().n,0);
 assert.equal(runMigrations(db),29);
 db.close();
});
