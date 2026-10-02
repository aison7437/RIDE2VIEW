const test=require('node:test');
const assert=require('node:assert/strict');
const {mkdtempSync,rmSync}=require('node:fs');
const {join}=require('node:path');
const {tmpdir}=require('node:os');
const {openStore}=require('../server/store');
const {backupDatabase}=require('../scripts/backup-db');
const {checkDatabase}=require('../scripts/check-db');

test('SQLite backup captures committed data and passes integrity verification',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'r2v-backup-'));
 const source=join(dir,'source.sqlite'),destination=join(dir,'backup.sqlite');
 const db=openStore(source);
 try{
  db.prepare('INSERT INTO notifications VALUES(?,?,?,?)').run('backup-proof','user-proof','durable backup proof',new Date().toISOString());
  await backupDatabase(source,destination);
  const result=checkDatabase(destination);
  assert.equal(result.ok,true);
  assert.equal(result.foreignKeyViolations,0);
  assert.equal(result.integrity,'ok');
  const copy=new (require('node:sqlite').DatabaseSync)(destination,{readOnly:true});
  try{assert.equal(copy.prepare('SELECT message FROM notifications WHERE id=?').get('backup-proof').message,'durable backup proof');}
  finally{copy.close();}
 }finally{db.close();rmSync(dir,{recursive:true,force:true});}
});
