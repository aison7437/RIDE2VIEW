'use strict';

/**
 * API-03: opt-in, never-enforcing OpenAPI response/request drift monitor.
 *
 * Contract comparison is advisory only. No request, response, billing, callback
 * or database operation may fail because of this component. Warning events
 * contain no request/response bodies, credentials, customer identifiers, URLs
 * with concrete IDs, cookies, headers, or query strings.
 */
const METHODS=new Set(['get','post','put','patch','delete','head','options']);
const MAX_ISSUES=5;
const MAX_DEPTH=16;

function schemaAt(spec,ref){
  if(typeof ref!=='string'||!ref.startsWith('#/components/schemas/'))return null;
  const key=ref.slice('#/components/schemas/'.length);
  if(!/^[A-Za-z0-9_-]+$/.test(key))return null;
  return spec.components?.schemas?.[key]||null;
}
function validate(spec,value,schema,at='$',issues=[],depth=0){
  if(issues.length>=MAX_ISSUES)return issues;
  if(depth>MAX_DEPTH){issues.push({location:at,code:'SCHEMA_DEPTH_LIMIT'});return issues;}
  if(!schema || typeof schema!=='object')return issues;
  if(schema.$ref){
    const target=schemaAt(spec,schema.$ref);
    if(!target){issues.push({location:at,code:'UNRESOLVED_SCHEMA_REF'});return issues;}
    return validate(spec,value,target,at,issues,depth+1);
  }
  if(Array.isArray(schema.anyOf)&&schema.anyOf.length){
    const accepted=schema.anyOf.some(branch=>validate(spec,value,branch,at,[],depth+1).length===0);
    if(!accepted){issues.push({location:at,code:'ANY_OF'});return issues;}
  }
  if(schema.type){
    const kinds=Array.isArray(schema.type)?schema.type:[schema.type];
    const isType=t=>t==='null'?value===null:t==='array'?Array.isArray(value):
      t==='object'?value!==null&&typeof value==='object'&&!Array.isArray(value):
      t==='integer'?Number.isSafeInteger(value):t==='number'?typeof value==='number'&&Number.isFinite(value):typeof value===t;
    if(!kinds.some(isType)){issues.push({location:at,code:'TYPE'});return issues;}
  }
  if(Object.hasOwn(schema,'const') && value!==schema.const)issues.push({location:at,code:'CONST'});
  if(Array.isArray(schema.enum) && !schema.enum.includes(value))issues.push({location:at,code:'ENUM'});
  if(typeof value==='number'){
    if(Number.isFinite(schema.minimum)&&value<schema.minimum)issues.push({location:at,code:'MINIMUM'});
    if(Number.isFinite(schema.maximum)&&value>schema.maximum)issues.push({location:at,code:'MAXIMUM'});
  }
  if(typeof value==='string'){
    if(Number.isInteger(schema.minLength)&&value.length<schema.minLength)issues.push({location:at,code:'MIN_LENGTH'});
    if(Number.isInteger(schema.maxLength)&&value.length>schema.maxLength)issues.push({location:at,code:'MAX_LENGTH'});
    if(schema.pattern && !(new RegExp(schema.pattern)).test(value))issues.push({location:at,code:'PATTERN'});
    if(schema.format==='date-time'&&!Number.isFinite(Date.parse(value)))issues.push({location:at,code:'DATE_TIME'});
    if(schema.format==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))issues.push({location:at,code:'EMAIL'});
    if(schema.format==='uri'){try{new URL(value);}catch{issues.push({location:at,code:'URI'});}}
  }
  if(Array.isArray(value)){
    if(Number.isInteger(schema.minItems)&&value.length<schema.minItems)issues.push({location:at,code:'MIN_ITEMS'});
    if(Number.isInteger(schema.maxItems)&&value.length>schema.maxItems)issues.push({location:at,code:'MAX_ITEMS'});
    if(schema.items)for(let i=0;i<value.length&&issues.length<MAX_ISSUES;i++)validate(spec,value[i],schema.items,at+'['+i+']',issues,depth+1);
  }
  if(value && typeof value==='object' && !Array.isArray(value)){
    for(const key of schema.required||[]){
      if(issues.length>=MAX_ISSUES)break;
      if(!Object.hasOwn(value,key))issues.push({location:at+'.'+key,code:'REQUIRED'});
    }
    for(const [key,child] of Object.entries(value)){
      if(issues.length>=MAX_ISSUES)break;
      if(schema.properties?.[key])validate(spec,child,schema.properties[key],at+'.'+key,issues,depth+1);
      else if(schema.additionalProperties===false)issues.push({location:at+'.<unexpected>',code:'ADDITIONAL_PROPERTY'});
    }
  }
  return issues;
}
function routePattern(template){
  // Escape every literal segment; only reviewed OpenAPI placeholders are wildcards.
  const escapePart=s=>[...s].map(ch=>'^$.*+?()[]{}|\\'.includes(ch)?'\\'+ch:ch).join('');
  const source=template.split('/').map(part=>/^\{[A-Za-z0-9_-]+\}$/.test(part)?'[^/]+':escapePart(part)).join('/');
  return new RegExp('^'+source+'$');
}
function createApiContractObserver({spec,logger=console,now=()=>new Date().toISOString()}={}){
  // Avoid parsing the large spec when contract shadow mode is disabled.
  spec ??= require('../../docs/api/openapi.json');
  const operations=[];
  for(const [template,pathItem] of Object.entries(spec.paths||{})){
    for(const [method,operation] of Object.entries(pathItem)){
      if(!METHODS.has(method)||operation['x-r2v-contract-level']!=='typed-core-v2')continue;
      operations.push({
        template,method:method.toUpperCase(),operationId:operation.operationId,
        pattern:routePattern(template),
        staticSegments:template.split('/').filter(x=>x&&!x.startsWith('{')).length,
        segments:template.split('/').length,
        operation
      });
    }
  }
  // Static URLs always take precedence over placeholders, e.g. /auth/me.
  operations.sort((a,b)=>b.staticSegments-a.staticSegments||b.segments-a.segments);
  const counts=new Map();

  function observe({method,path,status,requestId,requestBody,responseBody,durationMs}){
    try{
      if(!Number.isInteger(status)||status<200||status>=300)return null;
      if(typeof path!=='string'||!path.startsWith('/api/'))return null;
      const found=operations.find(o=>o.method===method&&o.pattern.test(path));
      if(!found)return null;
      const success=found.operation.responses?.[String(status)];
      if(!success)return null; // Do not misreport a status the contract has not typed.
      const issues=[];
      const requestSchema=found.operation.requestBody?.content?.['application/json']?.schema;
      if(requestSchema && requestBody!==undefined){
        const requestIssues=validate(spec,requestBody,requestSchema);
        for(const issue of requestIssues)if(issues.length<MAX_ISSUES)issues.push({phase:'request',...issue});
      }
      const responseSchema=success.content?.['application/json']?.schema;
      if(responseSchema){
        const responseIssues=validate(spec,responseBody,responseSchema);
        for(const issue of responseIssues)if(issues.length<MAX_ISSUES)issues.push({phase:'response',...issue});
      }
      // No concrete URL path, payload, authorization token or customer ID in keys.
      const key=found.operationId+' '+status;
      let entry=counts.get(key);
      if(!entry){
        if(counts.size>=256)return null;
        entry={operationId:found.operationId,route:found.template,method:found.method,status,checked:0,violations:0};
        counts.set(key,entry);
      }
      entry.checked++;
      if(issues.length){
        entry.violations++;
        const safeEvent={
          time:now(),level:'warn',event:'api_contract_shadow_mismatch',
          requestId:typeof requestId==='string'?requestId.slice(0,64):null,
          operationId:found.operationId,route:found.template,method:found.method,
          status,durationMs:Number.isFinite(durationMs)?Math.max(0,Math.round(durationMs)):null,
          issues
        };
        // Logging errors must NEVER affect in-flight requests.
        try{logger.warn?.(JSON.stringify(safeEvent));}catch{}
      }
      return {operationId:found.operationId,route:found.template,matched:true,valid:issues.length===0,issues:issues.map(({phase,location,code})=>({phase,location,code}))};
    }catch{
      // Invalid or unavailable optional monitor must not interrupt business logic.
      return null;
    }
  }
  function snapshot(){
    return [...counts.values()].map(x=>({...x})).sort((a,b)=>a.route.localeCompare(b.route)||a.method.localeCompare(b.method));
  }
  return Object.freeze({observe,snapshot,monitoredOperations:operations.length});
}
module.exports={createApiContractObserver,validate};
