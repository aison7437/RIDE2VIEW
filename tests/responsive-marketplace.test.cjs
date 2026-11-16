'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const css=fs.readFileSync(path.join(__dirname,'../css/app.css'),'utf8');
const html=fs.readFileSync(path.join(__dirname,'../index.html'),'utf8');
const marker='/* Ride2View Pro responsive luxury marketplace';
const override=css.slice(css.indexOf(marker));
test('responsive override is shipped after workspace styles',()=>{
  assert.ok(css.includes(marker),'responsive stylesheet block missing');
  assert.ok(override.includes('.shell { width:100%; max-width:none;'));
  assert.match(html,/href="\/css\/style\.css"/);
  assert.match(html,/href="\/css\/app\.css"/);
  assert.ok(html.indexOf('/css/style.css')<html.indexOf('/css/app.css'));
});
test('responsive layout covers phone, tablet, and desktop',()=>{
  assert.match(override,/@media \(max-width:1100px\)/);
  assert.match(override,/@media \(max-width:700px\)/);
  assert.match(override,/@media\(max-width:380px\)/);
  assert.match(override,/grid-template-columns:repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(override,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(override,/max-width:1440px/);
});
test('accessibility and touch safe-area affordances are retained',()=>{
  assert.match(override,/:focus-visible/);
  assert.match(override,/safe-area-inset-bottom/);
  assert.match(override,/prefers-reduced-motion/);
  assert.match(override,/touch-action:manipulation/);
});
test('preview retains sample-data disclaimer',()=>{
  assert.match(html,/Design preview · Sample listings and activity/);
});
