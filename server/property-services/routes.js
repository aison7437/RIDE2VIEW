function createPropertyServiceRoutes({services}){return ({path,method,user,body,send,res})=>{
 if(path==='/api/property-services/config'&&['GET','POST'].includes(method)){send(200,services.configuration(user,method==='POST'?body:undefined));return true;}
 if(path==='/api/property-services'&&['GET','POST'].includes(method)){const r=method==='POST'?services.create(user,body):{cases:services.list(user)};send(method==='POST'&&!r.duplicate?201:200,r);return true;}
 if(path==='/api/property-services/documents'&&method==='POST'){send(201,services.document(user,body));return true;}
 let m=path.match(/^\/api\/property-services\/documents\/([^/]+)$/);if(m&&method==='GET'){const d=services.readDocument(user,m[1]);res.writeHead(200,{'Content-Type':d.mime,'Content-Disposition':'attachment; filename="evidence.'+(d.mime==='application/pdf'?'pdf':d.mime==='image/png'?'png':'jpg')+'"','Content-Security-Policy':"sandbox; default-src 'none'"});res.end(Buffer.from(d.content));return true;}
 m=path.match(/^\/api\/property-services\/([^/]+)$/);if(m&&method==='GET'){send(200,services.get(user,m[1]));return true;}
 m=path.match(/^\/api\/property-services\/([^/]+)\/(room|recording)\/access$/);if(m&&method==='POST'){send(200,services.link(user,m[1],m[2]));return true;}
 m=path.match(/^\/api\/property-services\/([^/]+)\/([a-z]+)$/);if(m&&method==='POST'){send(200,services.action(user,m[1],m[2],body));return true;}
 return false;
};}
module.exports={createPropertyServiceRoutes};
