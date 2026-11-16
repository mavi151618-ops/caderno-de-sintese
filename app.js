'use strict';
const $ = s => document.querySelector(s);
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uuid = () => crypto.randomUUID();
const icons = {
 search:'<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 4.5 4.5"/>',
 flask:'<path d="M9 3h6m-5 0v7l-5 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-8V3M8 15h8"/>',
 home:'<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
 compare:'<path d="M3 7h17m-4-4 4 4-4 4m5 6H4m4-4-4 4 4 4"/>',
 book:'<path d="M4 5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 1 0-4h14M4 5v14M8 7h8m-8 4h6"/>',
 drive:'<rect x="3" y="5" width="18" height="14" rx="3"/><path d="M3 13h18m-4 3h1m-5 0h1"/>',
 plus:'<path d="M12 5v14M5 12h14"/>', arrow:'<path d="M4 12h15m-6-6 6 6-6 6"/>',
 clock:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l4 2"/>',
 check:'<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
 warning:'<path d="M10 4 3 18a1 1 0 0 0 1 2h16a1 1 0 0 0 1-2L14 4a2 2 0 0 0-4 0Zm2 5v4m0 3v.1"/>'
};
function icon(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[name]+'</svg>';}
document.querySelectorAll('[data-icon]').forEach(el=>el.innerHTML=icon(el.dataset.icon));
const states=['Planejada','Em bancada','Concluída','Pausada'];
const evidences=['Hipótese','Dados faltantes','Relatado na literatura','Observado em bancada'];
const labels={inicio:'Visão geral',reacoes:'Reações',comparar:'Comparar protocolos',referencias:'Referências',pesquisa:'Pesquisar artigos',triagem:'Triagem de condições',dados:'Dados e backup'};
const key='caderno-sintese-v1';
const core=[['reagents','Reagentes e quantidades'],['target','Produto-alvo'],['solvent','Solvente'],['catalyst','Catalisador'],['temperature','Temperatura'],['time','Tempo'],['atmosphere','Atmosfera'],['conditions','Procedimento e condições adicionais']];
const uncertainties=[['limitations','Limitações'],['missing','Dados faltantes'],['hypotheses','Pontos hipotéticos']];
const samples=[
 {id:'ex-1',title:'Síntese de diamina',code:'EX-01',status:'Planejada',example:true,reagents:'Aldeído e diamina de partida',target:'Derivado de diamina',missing:'Definir solvente e método de monitoramento.',hypotheses:'A formação de um intermediário imínico deve ser investigada.',mechanisms:[{title:'Possível formação de imina',evidence:'Hipótese',notes:'Registrar a proposta e os dados necessários para avaliá-la.'}]},
 {id:'ex-2',title:'Triagem de condições',code:'EX-02',status:'Em bancada',example:true,reagents:'Aldeído e diamina de partida',target:'Derivado de diamina',limitations:'Comparar somente ensaios com o mesmo método de avaliação.',missing:'Registrar os resultados e a unidade de rendimento.'},
 {id:'ex-3',title:'Revisão de rota sintética',code:'EX-03',status:'Planejada',example:true,target:'Intermediário de interesse',hypotheses:'Avaliar a transferência das condições para o substrato de interesse.'}
];
const defaults = {reactions:samples,refs:[]};
let data, storageProblem='';
try { const raw=localStorage.getItem(key); data=raw?JSON.parse(raw):structuredClone(defaults); }
catch { data=structuredClone(defaults); storageProblem='O navegador não conseguiu ler os dados locais. Exporte um backup se fizer registros nesta sessão.'; }
function persist(next,message){
 try{ localStorage.setItem(key,JSON.stringify(next));data=next;storageProblem='';notify(message);return true; }
 catch{notify('Falha ao salvar. Verifique o espaço e as permissões do navegador.');return false;}
}
let timer;
function notify(msg){const el=$('#toast');el.textContent=msg;el.style.display='block';clearTimeout(timer);timer=setTimeout(()=>el.style.display='none',4200);}
const button=(text,action,id='',cls='',symbol='')=>'<button type="button" class="'+cls+'" data-action="'+action+'" data-id="'+html(id)+'">'+(symbol?icon(symbol):'')+html(text)+'</button>';
const badge=(text,cls='')=>'<span class="badge '+cls+'">'+html(text)+'</span>';
const statusBadge=s=>badge(s||'Planejada',{'Planejada':'blue','Em bancada':'amber','Concluída':'green'}[s]||'');
const empty=msg=>'<div class="panel empty">'+html(msg)+'</div>';
const field=(name,label,value='',opts={})=>'<label class="'+(opts.wide?'wide':'')+'">'+html(label)+(opts.values?'<select name="'+name+'">'+opts.values.map(v=>'<option'+(v===value?' selected':'')+'>'+html(v)+'</option>').join('')+'</select>':opts.area?'<textarea name="'+name+'" placeholder="'+html(opts.placeholder)+'">'+html(value)+'</textarea>':'<input name="'+name+'" type="'+(opts.type||'text')+'" value="'+html(value)+'" placeholder="'+html(opts.placeholder)+'" '+(opts.required?'required ':'')+(opts.type==='number'?'min="0" max="100" step="any"':'')+'>')+'</label>';
const dateFormat=d=>d?new Date(d.length===10?d+'T12:00:00':d).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}):'';
const head=(title,desc,action='')=>'<div class="page-head"><div><h1>'+html(title)+'</h1><p class="muted">'+html(desc)+'</p></div>'+action+'</div>';
const detail=(label,value)=>'<div><b>'+html(label)+'</b><p class="muted pre">'+html(value||'Não informado')+'</p></div>';
const art='<svg class="hero-art" viewBox="0 0 440 235" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><pattern id="grid" width="19" height="19" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="currentColor" opacity=".50"/></pattern></defs><path d="M20 0h420v235H20z" fill="url(#grid)"/><g stroke="currentColor" stroke-width="1.6" fill="none"><path d="m132 83 45-26 45 26v52l-45 26-45-26z m90 0 45-26 45 26v52l-45 26-45-26 m90-52 53-30 m-188 108v45 m90-149V22 m45 113 54 32 m-234-32-37 22 M142 90v38m7 7 28 16m0-84 32 18m48-15 43 25m0 33-33 21"/><circle cx="379" cy="45" r="12"/><circle cx="381" cy="174" r="13"/><circle cx="85" cy="162" r="9"/><circle cx="177" cy="214" r="7"/><circle cx="267" cy="14" r="7"/></g><text x="373" y="50" fill="currentColor" font-size="13">N</text><text x="376" y="179" fill="currentColor" font-size="13">O</text></svg>';
function card(r){
 const descriptor=r.reagents&&r.target?r.reagents+' → '+r.target:r.target||r.reagents||'Defina os reagentes e o produto-alvo.';
 return '<article class="card"><div class="card-top"><div class="row">'+badge(r.code||'Sem código')+(r.example?badge('Exemplo'): '')+'</div>'+statusBadge(r.status)+'</div><h3>'+html(r.title)+'</h3><p class="muted">'+html(descriptor)+'</p><div class="card-bottom"><span>'+((r.versions||[]).length+1)+'ª versão'+(r.missing?' · Dados faltantes':'')+'</span><a class="link row" href="#reacao/'+encodeURIComponent(r.id)+'">Abrir reação '+icon('arrow')+'</a></div></article>';
}
function dashboard(){
 const metrics=[['flask','',data.reactions.length,'Reações cadastradas'],['clock','amber',data.reactions.filter(r=>r.status==='Em bancada').length,'Em bancada'],['check','blue',data.reactions.filter(r=>r.status==='Concluída').length,'Reações concluídas'],['book','gray',data.refs.length,'Referências']];
 return '<section class="hero">'+art+'<span class="eyebrow">CADERNO DIGITAL DE LABORATÓRIO</span><h1>Planeje sua síntese orgânica</h1><p>Organize reações, compare condições experimentais e acompanhe sua pesquisa do planejamento à bancada.</p>'+button('Planejar uma reação','new','','primary','plus')+'</section><div class="metrics">'+metrics.map(([i,c,n,l])=>'<div class="metric"><i class="tile '+c+'">'+icon(i)+'</i><div><b>'+n+'</b><small>'+l+'</small></div></div>').join('')+'</div><div class="section-head"><h2>Reações recentes</h2><a class="link row" href="#reacoes">Ver todas '+icon('arrow')+'</a></div>'+cards(data.reactions.slice(0,4));
}
function cards(items){return items.length?'<div class="cards">'+items.map(card).join('')+'</div>':empty('Nenhuma reação encontrada.');}
function list(){
 return head('Reações','Encontre, edite ou reutilize um planejamento.',button('Nova reação','new','','primary','plus'))+'<div class="toolbar"><input id="search" type="search" aria-label="Buscar reações" placeholder="Buscar por nome, código ou reagente"><select id="filter" aria-label="Filtrar por situação"><option>Todas as situações</option>'+states.map(v=>'<option>'+v+'</option>').join('')+'</select></div><div id="results">'+cards(data.reactions)+'</div>';
}
const tabNames=['Condições','Mecanismo','Literatura','Bancada','Versões'];
let tab='Condições';
const missingFields=r=>core.filter(([k])=>!r[k]&&k!=='conditions').map(([,l])=>l);
function reaction(r){
 if(!r)return empty('Reação não encontrada.');
 const id=r.id;
 const entries=(arr,fn,msg)=>arr?.length?arr.map(fn).join(''):'<p class="muted">'+msg+'</p>';
 let body='';
 if(tab==='Condições'){
  body='<section class="panel"><h2>Planejamento</h2><div class="details-grid">'+core.map(([k,l])=>detail(l,r[k])).join('')+detail('Observações',r.notes)+'</div>'+structureSummary(r)+'</section>'+planningVerification(r)+'<section class="panel"><h2>Estruturas químicas</h2>'+entries(r.structures,(s,i)=>'<div class="entry"><b>'+html(s.name)+'</b> '+badge(s.format)+'<p class="pre code">'+html(s.text)+'</p>'+(validImage(s.image)?'<img class="structure-img" alt="'+html(s.name)+'" src="'+html(s.image)+'">':'')+button('Editar','structure',id,'link') .replace('data-action="structure"','data-action="structure" data-index="'+i+'"')+'</div>','Registre um SMILES, InChI, nome químico ou imagem.')+'<div class="actions sub">'+button('Adicionar estrutura','structure',id,'','plus')+'</div></section><section class="panel"><h2>Limitações e hipóteses</h2>'+(missingFields(r).length?'<div class="alert"><b>Campos em aberto</b><p>'+html(missingFields(r).join(' · '))+'</p></div>':'')+'<div class="details-grid">'+uncertainties.map(([k,l])=>detail(l,r[k])).join('')+'</div></section>';
 }
 if(tab==='Mecanismo') body='<section class="panel"><div class="section-head"><h2>Mecanismo proposto</h2>'+button('Adicionar etapa','mechanism',id,'','plus')+'</div>'+entries(r.mechanisms,(s,i)=>'<div class="entry"><div class="row"><b>'+ (i+1)+'. '+html(s.title)+'</b>'+evidenceBadge(s.evidence)+'</div><p class="pre">'+html(s.notes)+'</p>'+indexed('Editar','mechanism',id,i)+ (i?indexed('Mover para cima','up',id,i):'')+'</div>','Adicione etapas na ordem proposta e registre a evidência de cada uma.')+'</section>';
 if(tab==='Literatura') body='<section class="panel"><div class="section-head"><h2>Referências vinculadas</h2>'+button('Vincular referências','attach',id)+'</div>'+entries(data.refs.filter(x=>r.refIds?.includes(x.id)),refCard,'Vincule artigos ou protocolos da sua biblioteca.')+'</section>';
 if(tab==='Bancada') body='<section class="panel"><div class="section-head"><h2>Ensaios de bancada</h2>'+button('Registrar ensaio','run',id,'','plus')+'</div>'+entries(r.runs,(s,i)=>'<div class="entry"><div class="row"><b>'+html(s.title)+'</b>'+badge(dateFormat(s.date))+badge('Versão '+(s.version||1))+'</div><div class="details-grid sub">'+detail('Condições praticadas e desvios',s.actual)+detail('Rendimento',yieldText(s))+detail('Observações e evidências',s.notes)+core.slice(0,-1).filter(([k])=>s[k]).map(([k,l])=>detail(l,s[k])).join('')+'</div>'+indexed('Editar ensaio','run',id,i)+'</div>','Registre condições praticadas, rendimento, observações e evidências de cada ensaio.')+'</section>';
 if(tab==='Versões') body='<section class="panel"><div class="section-head"><h2>Histórico do planejamento</h2>'+button('Criar nova versão','version',id)+'</div><div class="entry"><b>Versão '+((r.versions||[]).length+1)+' · Atual</b><p>'+html(r.versionNote||'Planejamento inicial')+'</p></div>'+entries((r.versions||[]).map((v,i)=>({...v,number:i+1})).reverse(),v=>'<div class="entry"><details><summary>Versão '+v.number+' · '+html(dateFormat(v.date))+'</summary><p class="sub">'+html(v.snapshot.versionNote||'Planejamento inicial')+'</p><div class="details-grid">'+detail('Título',v.snapshot.title)+detail('Situação',v.snapshot.status)+core.concat(uncertainties,[['notes','Observações']]).map(([k,l])=>detail(l,v.snapshot[k])).join('')+'</div>'+structureSummary(v.snapshot)+'</details></div>','Nenhuma versão anterior.')+'</section>';
 return '<a class="link" href="#reacoes">← Todas as reações</a><div class="sub">'+head(r.title,r.code||'Planejamento de síntese','<div class="actions">'+button('Duplicar','duplicate',id)+button('Editar planejamento','edit',id,'primary')+'</div>')+'</div><div class="row sub">'+statusBadge(r.status)+(r.example?badge('Exemplo ilustrativo'):'')+'</div><div class="tabs">'+tabNames.map(t=>button(t,'tab',t,t===tab?'active':'')).join('')+'</div>'+body+'<div class="actions">'+'<a class="link" href="#triagem/'+encodeURIComponent(id)+'">Triar condições a partir das referências</a>'+button('Exportar ficha','export-reaction',id)+button('Excluir reação','delete-reaction',id,'danger')+'</div>';
}
function indexed(title,action,id,index){return button(title,action,id,'link').replace('data-id=', 'data-index="'+index+'" data-id=');}
function evidenceBadge(s){return badge(s,s==='Hipótese'||s==='Dados faltantes'?'amber':'green');}
function yieldText(s){return s.yield===''||s.yield==null?'':s.yield+'%'+(s.yieldType?' · '+s.yieldType:'');}
function validImage(s){return typeof s==='string'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(s);}
function safeURL(v){try{const u=new URL(v);return ['https:','http:'].includes(u.protocol)?u.href:'';}catch{return '';}}
const doiValue=v=>(v||'').trim().replace(/^(?:doi:\s*|https?:\/\/(?:dx\.)?doi\.org\/)/i,'');
const validDOI=v=>/^10\.\d{4,9}\/\S+$/i.test(v);
function links(r){
 const a=validDOI(r.doi)?'<a target="_blank" rel="noopener noreferrer" href="https://doi.org/'+encodeURI(r.doi).replace(/#/g,'%23').replace(/\?/g,'%3F').replace(/"/g,'%22')+'">DOI '+html(r.doi)+'</a>':'';
 const b=safeURL(r.url)?'<a target="_blank" rel="noopener noreferrer" href="'+html(safeURL(r.url))+'">Abrir fonte</a>':'';
 return a||b?'<div class="refs">'+a+b+'</div>':'';
}
function refCard(r){return '<div class="entry"><div class="row"><b>'+html(r.title)+'</b>'+badge(r.kind)+(r.verified==='Conferida por mim'?badge(r.verified,'green'):badge('A conferir','amber'))+'</div><p class="muted">'+html([r.authors,r.journal,r.year].filter(Boolean).join(' · '))+'</p>'+links(r)+'<p class="pre">'+html(r.notes)+'</p>'+button('Editar fonte','ref',r.id,'link')+verificationPanel(r)+'</div>';}
function refs(){return head('Referências','Cadastre artigos e protocolos com a origem de cada condição.',button('Nova referência','ref','','primary','plus'))+(data.refs.length?'<section class="panel">'+data.refs.map(refCard).join('')+'</section>':empty('Nenhuma referência cadastrada. Adicione um artigo ou protocolo para começar.'));}
let compared=[];
function comparisons(){
 const items=[
  ...data.refs.map(r=>({...r,itemId:'ref/'+r.id,label:r.kind})),
  ...data.reactions.flatMap(r=>[
    ...[...(r.versions||[]).map(v=>v.snapshot),r].map((v,i)=>({...v,itemId:'v/'+r.id+'/'+i,label:'Planejamento v'+(i+1),title:v.title||r.title})),
    ...(r.runs||[]).map((s,i)=>({...s,itemId:'run/'+r.id+'/'+i,title:r.title+' · '+s.title,label:'Bancada v'+s.version,conditions:s.actual,yield:s.yield,yieldType:s.yieldType,notes:s.notes}))
  ])
 ];
 compared=compared.filter(id=>items.some(x=>x.itemId===id));
 const columns=compared.map(id=>items.find(x=>x.itemId===id));
 const rows=[...core,['yield','Rendimento'],...uncertainties,['notes','Observações'],['source','Fonte']];
 const table=columns.length>1?'<div class="table-wrap"><table><thead><tr><th scope="col">Parâmetro</th>'+columns.map(r=>'<th scope="col">'+html(r.title)+'<div class="note">'+html(r.label)+'</div></th>').join('')+'</tr></thead><tbody>'+rows.map(([k,l])=>'<tr><th scope="row">'+html(l)+'</th>'+columns.map(r=>'<td>'+(k==='source'?links(r)||'—':k==='yield'?(yieldText(r)?html(yieldText(r))+'<div class="bar" aria-hidden="true"><span style="width:'+Math.max(0,Math.min(100,Number(r.yield)||0))+'%"></span></div>':'—'):html(r[k]||'—'))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div><p class="note">Confira o método de determinação antes de comparar rendimentos.</p>':empty('Selecione pelo menos dois registros para comparar.');
 return head('Comparar protocolos','Compare artigos, protocolos, versões e ensaios lado a lado.')+ '<section class="panel"><h2>Registros para comparar</h2><p class="muted">Selecione de 2 a 4 registros.</p><div class="check-list">'+items.map(x=>'<label><input type="checkbox" data-compare="'+html(x.itemId)+'" '+(compared.includes(x.itemId)?'checked':compared.length>=4?'disabled':'')+'>'+html(x.title+' · '+x.label)+'</label>').join('')+'</div></section>'+table;
}
function backups(){return head('Dados e backup','Exporte seus registros ou restaure uma cópia em outro navegador.')+'<section class="panel"><h2>Onde seus dados ficam</h2><p>Os registros ficam no perfil deste navegador. Limpar os dados do site, trocar de perfil ou usar navegação privativa pode apagar ou ocultar seus registros. Use o backup para transferir o caderno entre dispositivos.</p><p>O caderno funciona sem APIs, chaves ou integrações pagas. A capacidade depende da cota do navegador. Imagens têm limite de 350 KB por arquivo. A abertura do site e dos links externos exige acesso à internet.</p></section><section class="panel"><h2>Backup do caderno</h2><p class="muted">O arquivo JSON inclui reações, versões, referências e imagens. Restaurar substitui os registros locais.</p><div class="actions sub">'+button('Baixar backup JSON','backup','','primary')+button('Restaurar backup','restore')+'</div><input type="file" id="import" hidden accept=".json,application/json"></section><section class="panel"><h2>Exemplos iniciais</h2><p class="muted">As reações marcadas como exemplo são ilustrativas e podem ser removidas juntas.</p><div class="actions sub">'+button('Remover exemplos','remove-examples')+'</div></section>';}
function route(){const [page,id]=location.hash.slice(1).split('/');try{return [page||'inicio',id?decodeURIComponent(id):''];}catch{return ['inicio',''];}}
function render(){
 const [page,id]=route();
 const nav=page==='reacao'?'reacoes':page;
 document.querySelectorAll('[data-nav]').forEach(a=>{a.classList.toggle('active',a.dataset.nav===nav);if(a.dataset.nav===nav)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 $('#crumb').textContent=labels[nav]||labels.inicio;
 const views={inicio:dashboard,reacoes:list,reacao:()=>reaction(data.reactions.find(r=>r.id===id)),referencias:refs,pesquisa:articleSearch,triagem:()=>triage(id),comparar:comparisons,dados:backups};
 $('#main').innerHTML=(storageProblem?'<div class="alert">'+html(storageProblem)+'</div>':'')+(Object.hasOwn(views,page)?views[page]:dashboard)();
}
window.addEventListener('hashchange',()=>{tab='Condições';render();window.scrollTo(0,0);});
const modal=$('#modal');
function show(markup,onSubmit){
 modal.innerHTML=markup;
 modal.querySelector('form').onsubmit=ev=>{ev.preventDefault();onSubmit(ev.currentTarget,ev);};
 if(!modal.open)modal.showModal();
}
const close=()=>modal.close();
const dialogHead=title=>'<div class="dialog-head"><h2>'+html(title)+'</h2><button type="button" data-action="close" aria-label="Fechar">✕</button></div>';
const dialogFoot=(label,extra='')=>'<div class="dialog-foot">'+(extra||button('Cancelar','close'))+'<button type="submit" class="primary">'+html(label)+'</button></div>';
const getValues=f=>Object.fromEntries([...new FormData(f)].filter(([,v])=>typeof v==='string').map(([k,v])=>[k,v.trim()]));
function updateReaction(r,message){
 const current=data.reactions.find(x=>x.id===r.id);
 const reactions=current?data.reactions.map(x=>x.id===r.id?r:x):[r,...data.reactions];
 if(!persist({...data,reactions},message))return false;
 close();render();return true;
}
let draft,stage;
function wizard(r,mode,proposal={}){
 draft={...r,...proposal};stage=0;
 if(mode==='new')draft={id:uuid(),status:states[0]};
 if(mode==='duplicate'){draft.id=uuid();draft.title=r.title+' (cópia)';draft.code='';draft.example=false;draft.status=states[0];draft.runs=[];draft.versions=[];draft.versionNote='';}
 showStage(mode,r);
}
function showStage(mode,original){
 const steps=['Identificação','Condições','Evidências','Revisão'];
 const config=[
  [['title','Nome da reação',{required:true,wide:true,placeholder:'Ex.: Síntese de diamina'}],['code','Código interno'],['status','Situação',{values:states}],['reagents','Reagentes e quantidades',{area:true,wide:true,placeholder:'Nome, massa, volume, mmol ou equivalentes'}],['target','Produto-alvo',{wide:true}]],
  core.slice(2).map(([k,l])=>[k,l,k==='conditions'?{area:true,wide:true}:{}]),
  [...uncertainties,['notes','Observações']].map(([k,l])=>[k,l,{area:true,wide:true}])
 ];
 const content=stage===3?'<div class="grid">'+[['title','Nome'],['status','Situação'],...core].map(([k,l])=>detail(l,draft[k])).join('')+(mode==='version'?field('versionNote','Motivo da nova versão',draft.versionNote||'',{area:true,wide:true}):'')+'</div>'+structureSummary(draft)+'<details class="audit"><summary>Ver evidências e incertezas</summary>'+planningVerification(draft,true)+'</details>':'<div class="grid">'+config[stage].map(([k,l,o])=>field(k,l,draft[k],o)).join('')+(stage===0?structureEditor.markup('reagentDrawing',draft.reagentDrawing,'Desenhar estruturas dos reagentes')+structureEditor.markup('targetDrawing',draft.targetDrawing,'Desenhar estrutura do produto-alvo')+pubchemControls(draft):'')+'</div>';
 show('<form>'+dialogHead({new:'Nova reação',duplicate:'Duplicar reação',edit:'Editar planejamento',version:'Criar nova versão'}[mode])+'<div class="steps">'+steps.map((s,i)=>'<span '+(i===stage?'class="current" aria-current="step"':'')+'>'+(i+1)+'. '+s+'</span>').join('')+'</div>'+content+dialogFoot(stage<3?'Continuar':'Salvar reação',stage?button('Voltar','wizard-back'):button('Cancelar','close'))+'</form>',f=>{
  Object.assign(draft,getValues(f));
  if(stage===0&&!draft.title){notify('Informe o nome da reação.');return;}
  if(stage===0&&draft.target!==draft.targetImageName){draft.targetCID='';draft.targetImage='';draft.targetImageName='';}
  delete draft.publicCompound;
  if(stage<3){stage++;showStage(mode,original);return;}
  if(mode==='version'){
   const {versions,runs,...snapshot}=original;
   draft.versions=[...(versions||[]),{date:new Date().toISOString(),snapshot}];
  }
  if(updateReaction(draft,'Planejamento salvo.')){
   if(mode==='new'||mode==='duplicate')location.hash='reacao/'+encodeURIComponent(draft.id);
  }
 });
 const back=modal.querySelector('[data-action="wizard-back"]');
 if(back)back.onclick=()=>{Object.assign(draft,getValues(modal.querySelector('form')));stage--;showStage(mode,original);};
}
function readonlyForm(title,body,save,extra){
 show('<form>'+dialogHead(title)+body+dialogFoot('Salvar',extra)+'</form>',save);
}
function deletionButton(label,handler){
 const b=modal.querySelector('[data-action="remove-entry"]');
 if(b){b.onclick=()=>{if(confirm(label))handler();};}
}
function fileData(file){return new Promise((resolve,reject)=>{const reader=new FileReader();reader.onerror=reject;reader.onload=()=>resolve(reader.result);reader.readAsDataURL(file);});}
function entryForm(r,type,index){
 const schema={
  structure:{key:'structures',title:'Estrutura química',fields:[['name','Identificação',{required:true}],['format','Formato',{values:['SMILES','InChI','Nome químico','Imagem','Outro']}],['text','Estrutura ou identificação química',{area:true,wide:true}]]},
  mechanism:{key:'mechanisms',title:'Etapa do mecanismo',fields:[['title','Nome da etapa',{required:true}],['evidence','Grau de evidência',{values:evidences}],['notes','Transformação proposta, intermediários e evidências',{area:true,wide:true}]]},
  run:{key:'runs',title:'Ensaio de bancada',fields:[['title','Identificação do ensaio',{required:true}],['date','Data',{type:'date'}],['version','Versão do planejamento',{values:Array.from({length:(r.versions||[]).length+1},(_,i)=>String(i+1))}],['yield','Rendimento (%)',{type:'number'}],['yieldType','Método de determinação',{values:['','Isolado','RMN','Cromatografia','Outro']}],...core.slice(0,-1).map(([k,l])=>[k,l,{}]),['actual','Procedimento praticado e desvios',{area:true,wide:true}],['notes','Observações, evidências e próximos passos',{area:true,wide:true}]]}
 }[type];
 const entries=r[schema.key]||[];
 const current=entries[index]|| (type==='run'?{date:new Intl.DateTimeFormat('sv-SE',{timeZone:'America/Sao_Paulo'}).format(new Date()),version:String((r.versions||[]).length+1)}:{});
 const upload=type==='structure'?'<label class="wide">Imagem da estrutura (PNG, JPEG ou WebP, até 350 KB)<input type="file" name="image" accept="image/png,image/jpeg,image/webp"></label>'+(current.image?'<label class="wide row"><input style="width:auto" type="checkbox" name="clearImage">Remover imagem atual</label>':''):'';
 readonlyForm(schema.title,'<div class="grid">'+schema.fields.map(([k,l,o])=>field(k,l,current[k],o)).join('')+upload+'</div>',async f=>{
  const value=getValues(f);
  if(!value[schema.fields[0][0]]){notify('Preencha o campo de identificação.');return;}
  if(type==='structure'){
   const file=f.elements.image.files[0];
   value.image=value.clearImage?'':current.image||'';
   delete value.clearImage;
   if(file){
    if(file.size>350000){notify('A imagem deve ter até 350 KB.');return;}
    try{value.image=await fileData(file);}catch{notify('Não foi possível ler a imagem.');return;}
    if(!validImage(value.image)){notify('Use uma imagem PNG, JPEG ou WebP.');return;}
   }
   if(!value.text&&!value.image){notify('Informe a estrutura ou selecione uma imagem.');return;}
  }
  const next=[...entries];
  if(index>=0)next[index]=value;else next.push(value);
  updateReaction({...r,[schema.key]:next},'Registro salvo.');
 },index>=0?button('Excluir registro','remove-entry','','danger'):'');
 deletionButton('Excluir este registro?',()=>updateReaction({...r,[schema.key]:entries.filter((_,i)=>i!==index)},'Registro excluído.'));
}
function refForm(r,prefill={}){
 const entry=r||{id:uuid(),...prefill};
 const fields=[['title','Título',{required:true,wide:true}],['kind','Tipo',{values:['Artigo','Protocolo']}],['verified','Verificação',{values:['A conferir','Conferida por mim']}],['authors','Autores'],['year','Ano'],['journal','Periódico'],['doi','DOI'],['url','Link da fonte',{type:'url'}],...core.map(([k,l])=>[k,l]),['yield','Rendimento (%)',{type:'number'}],['yieldType','Método de determinação'],...uncertainties.map(([k,l])=>[k,l,{area:true,wide:true}]),['notes','Observações, página, seção ou tabela',{area:true,wide:true}]];
 readonlyForm(r?'Editar referência':'Nova referência','<p class="hint">O DOI vira um link para a fonte. Abra a fonte e confirme os dados antes de marcar a referência como conferida.</p><div class="grid">'+fields.map(([k,l,o])=>field(k,l,entry[k],o)).join('')+'</div>'+
 '<details class="audit sub"><summary>Conferência manual no artigo ou suplemento</summary><p class="hint">Abra o DOI ou link da fonte e anote, em cada campo conferido, onde o valor aparece e em qual exemplo experimental. Revise as anotações ao alterar os valores.</p><div class="grid">'+verificationFields.map(([k,l])=>field('evidence_'+k,'Localização · '+l,entry['evidence_'+k],{placeholder:'Ex.: tabela 2, entrada 4'})).join('')+'</div></details>',f=>{
  const v=getValues(f);v.doi=doiValue(v.doi);
  if(!v.title){notify('Informe o título da referência.');return;}
  if(v.doi&&!validDOI(v.doi)){notify('Informe um DOI no formato 10.xxxx/sufixo.');return;}
  if(v.url&&!safeURL(v.url)){notify('Use um link http ou https.');return;}
  if(v.doi&&data.refs.some(x=>x.id!==entry.id&&doiValue(x.doi).toLowerCase()===v.doi.toLowerCase())){
   notify('Este DOI já está cadastrado em Referências.');return;
  }
  for(const [k] of verificationFields){
   const locator='evidence_'+k;
   if(!v[k]||r&&v[locator]===r[locator]&&[k,'doi','url'].some(x=>String(v[x]||'')!==String(r[x]||'')))v[locator]='';
  }
  const record={...entry,...v};
  const next=r?data.refs.map(x=>x.id===r.id?record:x):[record,...data.refs];
  if(persist({...data,refs:next},'Referência salva.')){close();render();}
 },r?button('Excluir referência','remove-entry','','danger'):'');
 deletionButton('Excluir esta referência da biblioteca e das reações?',()=>{
  if(persist({refs:data.refs.filter(x=>x.id!==r.id),reactions:data.reactions.map(x=>({...x,refIds:x.refIds?.filter(j=>j!==r.id)}))},'Referência excluída.')){close();render();}
 });
}
function attach(r){
 readonlyForm('Vincular referências',data.refs.length?'<div class="check-list">'+data.refs.map(x=>'<label><input type="checkbox" name="ref" value="'+html(x.id)+'" '+(r.refIds?.includes(x.id)?'checked':'')+'>'+html(x.title)+'</label>').join('')+'</div>':'<p>Cadastre uma fonte na página <a href="#referencias" data-action="close">Referências</a> para vinculá-la a esta reação.</p>',f=>updateReaction({...r,refIds:new FormData(f).getAll('ref')},'Vínculos salvos.'));
}
function download(name,content,type){
 const url=URL.createObjectURL(new Blob([content],{type}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function exportReaction(r){
 const text=[r.title,r.code||'',r.status||'',productRecord(r)?'Estrutura do produto (PubChem): https://pubchem.ncbi.nlm.nih.gov/compound/'+productRecord(r):'',r.targetDrawing?'Desenho do produto incluído no caderno e no backup JSON.':'','Versão '+((r.versions||[]).length+1),'',...core.concat(uncertainties,[['notes','Observações']]).map(([k,l])=>l+': '+(r[k]||'Não informado')),'','Estruturas',...(r.structures||[]).map(s=>[s.name,s.format,s.text,s.image?'Imagem disponível no backup JSON':''].filter(Boolean).join(' · ')),'','Mecanismo',...(r.mechanisms||[]).map((s,i)=>(i+1)+'. '+s.title+' · '+s.evidence+'\n'+s.notes),'','Ensaios',...(r.runs||[]).map(s=>[s.title,s.date,'Versão '+s.version,...core.slice(0,-1).filter(([k])=>s[k]).map(([k,l])=>l+': '+s[k]),s.actual,yieldText(s),s.notes].filter(Boolean).join('\n')),'','Referências',...data.refs.filter(x=>r.refIds?.includes(x.id)).map(s=>[s.title,s.authors,s.journal,s.year,validDOI(s.doi)?'https://doi.org/'+s.doi:'',safeURL(s.url),s.notes].filter(Boolean).join('\n'))].join('\n');
 download('ficha-reacao.txt',text,'text/plain;charset=utf-8');
}
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
const primitive=v=>v==null||typeof v==='string'||typeof v==='boolean'||typeof v==='number';
const fieldsOnly=(v,lists=[])=>object(v)&&Object.entries(v).every(([k,x])=>lists.includes(k)||primitive(x));
const objects=v=>v===undefined||Array.isArray(v)&&v.every(x=>fieldsOnly(x));
function validBackup(x){
 const lists=['structures','mechanisms','runs','versions','refIds'];
 const validPlan=r=>fieldsOnly(r,lists)&&typeof r.title==='string'&&objects(r.structures)&&objects(r.mechanisms)&&objects(r.runs)&&(r.refIds===undefined||Array.isArray(r.refIds)&&r.refIds.every(v=>typeof v==='string'));
 const records=(a,check)=>Array.isArray(a)&&a.every(r=>check(r)&&typeof r.id==='string'&&r.id.length>0)&&new Set(a.map(r=>r.id)).size===a.length;
 return object(x)&&x.schema===1&&records(x.refs,r=>fieldsOnly(r)&&typeof r.title==='string')&&records(x.reactions,r=>validPlan(r)&&(r.versions===undefined||Array.isArray(r.versions)&&r.versions.every(v=>object(v)&&typeof v.date==='string'&&validPlan(v.snapshot))));
}
document.addEventListener('click',ev=>{
 const b=ev.target.closest('[data-action]');if(!b)return;
 const {action,id,index}=b.dataset;
 const r=data.reactions.find(x=>x.id===id);
 if(action==='new')wizard({},'new');
 if(action==='close')close();
 if(r&&['edit','duplicate','version'].includes(action))wizard(r,action);
 if(action==='tab'){ev.preventDefault();tab=id;render();const active=$('.tabs .active');if(active)active.focus();}
 if(r&&['mechanism','structure','run'].includes(action))entryForm(r,action,Number(index??-1));
 if(action==='up'&&r&&Number(index)>0){
  const steps=[...r.mechanisms],i=Number(index);
  [steps[i-1],steps[i]]=[steps[i],steps[i-1]];
  updateReaction({...r,mechanisms:steps},'Ordem atualizada.');
 }
 if(action==='import-article'){
  const article=searchState.items[Number(index)];
  if(article)refForm(undefined,article);
 }
 if(action==='verify-ref'){
  const ref=data.refs.find(x=>x.id===id);
  if(ref)verifyOnline([ref]);
 }
 if(action==='verify-plan'){
  const plan=data.reactions.find(x=>x.id===id);
  if(plan)verifyOnline(data.refs.filter(ref=>plan.refIds?.includes(ref.id)));
 }
 if(action==='verify-triage'){
  const plan=data.reactions.find(x=>x.id===id);
  if(plan)verifyOnline(data.refs.filter(ref=>{const c=scoreReference(plan,ref);return c.tier||c.linked;}));
 }
 if(action==='apply-protocol'){
  const ref=data.refs.find(x=>x.id===id);
  const reaction=data.reactions.find(x=>x.id===route()[1]);
  const candidate=reaction&&ref&&scoreReference(reaction,ref);
  if(candidate?.eligible){
   const doi=referenceDOI(ref);
   if(validDOI(doi)&&!onlineCache.has(doi.toLowerCase())){verifyOnline([ref]);return;}
   const conditions=Object.fromEntries(protocolFields.filter(([k])=>ref[k]).map(([k])=>[k,ref[k]]));
   const source=validDOI(ref.doi)?'https://doi.org/'+ref.doi:safeURL(ref.url);
   const hypothesis='Testar a transferência do protocolo de '+ref.title+(source?' ('+source+')':'')+'. '+candidate.caveat+' A correspondência das condições e do produto requer conferência no exemplo experimental citado.';
   wizard(reaction,'version',{...conditions,refIds:[...new Set([...(reaction.refIds||[]),ref.id])],hypotheses:[reaction.hypotheses,hypothesis].filter(Boolean).join('\n'),versionNote:'Teste proposto a partir de '+ref.title});
  }
 }
 if(action==='ref')refForm(data.refs.find(x=>x.id===id));
 if(action==='attach'&&r)attach(r);
 if(action==='export-reaction'&&r)exportReaction(r);
 if(action==='delete-reaction'&&r&&confirm('Excluir a reação e todos os seus ensaios e versões?')){
  if(persist({...data,reactions:data.reactions.filter(x=>x!==r)},'Reação excluída.'))location.hash='reacoes';
 }
 if(action==='backup')download('caderno-sintese-backup.json',JSON.stringify({schema:1,...data},null,2),'application/json');
 if(action==='restore')$('#import').click();
 if(action==='remove-examples'&&confirm('Remover todas as reações marcadas como exemplo?')){
  if(persist({...data,reactions:data.reactions.filter(x=>!x.example)},'Exemplos removidos.'))render();
 }
});
function filter(){const q=$('#search').value.toLocaleLowerCase('pt-BR').trim(),status=$('#filter').value;$('#results').innerHTML=cards(data.reactions.filter(r=>(!states.includes(status)||r.status===status)&&[r.title,r.code,r.target,r.reagents].some(x=>String(x||'').toLocaleLowerCase('pt-BR').includes(q))));}
document.addEventListener('input',ev=>{if(ev.target.id==='search')filter();});
document.addEventListener('change',async ev=>{
 const el=ev.target;
 if(el.id==='filter')filter();
 if(el.id==='triage-reaction')location.hash='triagem'+(el.value?'/'+encodeURIComponent(el.value):'');
 if(el.hasAttribute('data-compare')){
  compared=el.checked?[...compared,el.dataset.compare]:compared.filter(x=>x!==el.dataset.compare);
  render();
  [...document.querySelectorAll('[data-compare]')].find(x=>x.dataset.compare===el.dataset.compare)?.focus();
 }
 if(el.id==='import'&&el.files[0]){
  try{
   const x=JSON.parse(await el.files[0].text());
   if(!validBackup(x))throw Error('Formato inválido');
   if(confirm('Substituir os registros atuais pelos dados deste backup?')&&persist({reactions:x.reactions,refs:x.refs},'Backup restaurado.')){compared=[];render();}
  }catch{notify('Arquivo inválido. Selecione um backup JSON gerado pelo caderno.');}
  el.value='';
 }
});
const searchState={query:'',items:[],status:'idle',error:''};
function articleSearch(){
 return head('Pesquisar artigos','Encontre referências para o planejamento das suas reações.')+
 '<section class="panel"><form id="article-search" class="article-search">'+
 field('query','Palavras-chave, título ou DOI',searchState.query,{required:true,placeholder:'Ex.: reductive amination diamines'})+
 '<button class="primary" type="submit" '+(searchState.status==='loading'?'disabled':'')+'>'+icon('search')+'Pesquisar</button></form>'+
 '<p class="note">A busca envia o termo digitado à <a class="link" href="https://www.crossref.org/documentation/retrieve-metadata/rest-api/" target="_blank" rel="noopener noreferrer">Crossref</a>. Use termos bibliográficos ou um DOI público. A busca por palavras retorna até 12 artigos por relevância.</p></section>'+
 '<div id="article-results" aria-live="polite">'+articleResults()+'</div>';
}
function articleResults(){
 if(searchState.status==='idle')return empty('Digite um tema, título ou DOI. Para síntese orgânica, experimente palavras-chave em inglês.');
 if(searchState.status==='loading')return empty('Consultando a Crossref…');
 const fallback='<a class="link" target="_blank" rel="noopener noreferrer" href="https://search.crossref.org/?q='+encodeURIComponent(searchState.query)+'">Pesquisar diretamente na Crossref ↗</a>';
 if(searchState.status==='error'||!searchState.items.length) return '<section class="panel"><p>'+html(searchState.error||'A Crossref não encontrou resultados para esta consulta.')+'</p>'+fallback+'</section>';
 return '<section class="panel"><div class="section-head"><h2>'+searchState.items.length+' '+(searchState.items.length===1?'resultado':'resultados')+'</h2>'+fallback+'</div><p class="hint">Abra o DOI para consultar a publicação. A disponibilidade do texto completo depende da fonte. Preencha as condições experimentais após consultar o artigo.</p>'+
 searchState.items.map((a,i)=>{
  const saved=data.refs.some(r=>doiValue(r.doi).toLowerCase()===a.doi.toLowerCase());
  return '<article class="entry"><h3>'+html(a.title)+'</h3><p class="muted">'+html([a.authors,a.journal,a.year].filter(Boolean).join(' · '))+'</p>'+links(a)+
   '<div class="actions sub">'+(saved?badge('Salvo em Referências','green'):indexed('Salvar em Referências','import-article','',i))+'</div></article>';
 }).join('')+'</section>';
}
function updateSearch(){
 const results=$('#article-results');
 if(!results)return;
 results.innerHTML=articleResults();
 $('#article-search button').disabled=searchState.status==='loading';
}
function articleMetadata(work){
 return {
  kind:'Artigo',verified:'A conferir',doi:doiValue(work.DOI),
  title:work.title?.[0]||'Título não informado pela Crossref',
  authors:(work.author||[]).map(a=>a.name||[a.given,a.family].filter(Boolean).join(' ')).filter(Boolean).join(', '),
  journal:work['container-title']?.[0]||'',
  year:String((work.published||work.issued)?.['date-parts']?.[0]?.[0]||'')
 };
}
document.addEventListener('submit',async ev=>{
 if(ev.target.id!=='article-search')return;
 ev.preventDefault();
 const query=getValues(ev.target).query;
 if(!query||searchState.status==='loading')return;
 const doi=doiValue(query);
 const exact=validDOI(doi);
 const endpoint=exact?'https://api.crossref.org/works/'+encodeURIComponent(doi):
  'https://api.crossref.org/works?'+new URLSearchParams({'query.bibliographic':query,filter:'type:journal-article',rows:'12'});
 Object.assign(searchState,{query,items:[],status:'loading',error:''});
 updateSearch();
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetch(endpoint,{signal:controller.signal,referrerPolicy:'no-referrer',credentials:'omit'});
  if(response.status===429)throw Error('A Crossref limitou as consultas temporariamente. Aguarde um pouco antes de tentar novamente.');
  if(response.status===404&&exact){
   searchState.status='done';
   searchState.error='Este DOI não foi encontrado na Crossref. Ele pode estar registrado em outra agência.';
   return;
  }
  if(!response.ok)throw Error('A Crossref não respondeu à consulta. Tente novamente em instantes.');
  const {message}=await response.json();
  searchState.items=(exact?[message]:message.items).map(articleMetadata).filter(a=>validDOI(a.doi));
  searchState.status='done';
 }catch(err){
  searchState.status='error';
  searchState.error=err.name==='AbortError'?'A consulta demorou mais de 12 segundos. Tente novamente.':
   err instanceof TypeError?'Não foi possível conectar à Crossref. Confira sua conexão ou use o link abaixo.':err.message;
 }finally{
  clearTimeout(timeout);
  updateSearch();
 }
});
const protocolFields=core.slice(2);
const normalizeChemicalText=value=>String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim().replace(/\s+/g,' ');
function scoreReference(reaction,ref){
 const target=normalizeChemicalText(reaction.target);
 const reagents=normalizeChemicalText(reaction.reagents);
 const sameTarget=Boolean(target&&target===normalizeChemicalText(ref.target));
 const sameReagents=Boolean(reagents&&reagents===normalizeChemicalText(ref.reagents));
 const linked=Boolean(reaction.refIds?.includes(ref.id));
 const verified=ref.verified==='Conferida por mim';
 const conditions=protocolFields.filter(([k])=>String(ref[k]||'').trim());
 const hasSource=validDOI(ref.doi)||Boolean(safeURL(ref.url));
 const eligible=Boolean(target&&(sameTarget||sameReagents||linked)&&conditions.length&&hasSource&&verified);
 const tier=sameTarget&&sameReagents?3:sameTarget?2:sameReagents?1:0;
 const match=sameTarget&&sameReagents?'Produto e reagentes coincidem':sameTarget?'Produto-alvo coincide':sameReagents?'Reagentes coincidem':linked?'Referência vinculada manualmente':'Sem correspondência registrada';
 const caveat=tier===3?'Confira estequiometria, identidade dos substratos e procedimento no artigo.':
  tier===2?'Os reagentes podem diferir. Confira a rota e a aplicabilidade ao seu substrato.':
  tier===1?'O produto relatado difere ou está em branco. A formação do produto-alvo é hipotética.':
  'A relação foi indicada manualmente. Confirme a analogia entre substratos e transformação.';
 return {ref,eligible,tier,match,caveat,conditions,hasSource,verified,linked};
}
function triage(id){
 const reaction=data.reactions.find(r=>r.id===id);
 const header=head('Triagem de condições','Priorize protocolos para revisar e testar com base nas suas referências.');
 const select='<section class="panel"><label>Reação de interesse<select id="triage-reaction"><option value="">Selecione uma reação</option>'+
  data.reactions.map(r=>'<option value="'+html(r.id)+'" '+(r.id===id?'selected':'')+'>'+html(r.title+(r.code?' · '+r.code:''))+'</option>').join('')+'</select></label></section>';
 if(!reaction)return header+select+empty('Selecione uma reação com o produto-alvo cadastrado.');
 const candidates=data.refs.map(r=>scoreReference(reaction,r)).filter(c=>c.tier||c.linked);
 candidates.sort((a,b)=>Number(b.eligible)-Number(a.eligible)||b.tier-a.tier||b.conditions.length-a.conditions.length);
 const best=candidates.find(c=>c.eligible);
 const info='<section class="panel"><div class="details-grid">'+detail('Produto-alvo',reaction.target)+detail('Reagentes previstos',reaction.reagents)+'</div><p class="note">A triagem compara os textos cadastrados e considera vínculos manuais. Ela dá prioridade à coincidência de produto e reagentes, depois à cobertura das condições. Rendimento publicado tem caráter informativo. Os resultados são hipóteses para teste, sem previsão de rendimento, validação estrutural ou garantia de sucesso.</p></section>';
 if(!reaction.target)return header+select+info+'<div class="alert">Cadastre o produto-alvo no planejamento para gerar a triagem. <a href="#reacao/'+encodeURIComponent(id)+'">Abrir reação</a></div>';
 const warning=best?'':'<div class="alert">Ainda não há base para propor um protocolo. Cadastre condições de uma fonte conferida com DOI ou link e vincule-a à reação ou preencha produto e reagentes na referência.</div>';
 return header+select+info+warning+(candidates.length?'<div class="actions sub">'+button('Conferir protocolos na web','verify-triage',id,'primary')+'</div>':'')+candidates.map(c=>{
  const r=c.ref;
  const gaps=protocolFields.filter(([k])=>!r[k]).map(([,l])=>l);
  return '<article class="panel"><div class="section-head"><h3>'+html(r.title)+'</h3><div class="row">'+(c===best?badge('Primeiro candidato para revisão','amber'):'')+badge(c.match,c.tier===3?'green':'amber')+'</div></div>'+
   links(r)+'<div class="details-grid sub">'+detail('Produto relatado',r.target)+detail('Reagentes relatados',r.reagents)+detail('Rendimento publicado',yieldText(r))+c.conditions.map(([k,l])=>detail(l,r[k])).join('')+'</div>'+
   '<p class="note">'+html(c.caveat)+'</p>'+
   (gaps.length?'<p class="note"><b>Campos a confirmar</b> '+html(gaps.join(' · '))+'</p>':'')+
   [r.limitations,r.missing,r.hypotheses].filter(Boolean).map(v=>'<p class="note pre">'+html(v)+'</p>').join('')+
   (!c.verified?'<p class="note">Fonte aguardando conferência.</p>':'')+
   verificationPanel(r)+'<div class="actions sub">'+button('Editar referência','ref',r.id)+(c.eligible?button(validDOI(referenceDOI(r))&&!onlineCache.has(referenceDOI(r).toLowerCase())?'Conferir fonte para revisar':'Revisar como nova versão','apply-protocol',r.id,'primary'):'')+'</div></article>';
 }).join('');
}
const verificationFields=[...core,['yield','Rendimento (%)'],['yieldType','Método de determinação do rendimento']];
const onlineCache=new Map();
const onlinePending=new Set();
let verificationQueue=Promise.resolve();
const sourceLink=(label,url)=>'<a class="link" href="'+html(url)+'" target="_blank" rel="noopener noreferrer">'+html(label)+' ↗</a>';
const sourceText=value=>String(value||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/(?:&nbsp;|&#160;)/g,' ');
function referenceDOI(ref){
 return doiValue(ref.doi)||(/^https?:\/\/(?:dx\.)?doi\.org\//i.test(ref.url||'')?doiValue(ref.url):'');
}
function sourceStatus(name,url,status){return {name,url,status};}
async function fetchEvidence(url,format){
 const res=await fetch(url,{signal:AbortSignal.timeout(10000),credentials:'omit',referrerPolicy:'no-referrer'});
 if(res.status===404)return null;
 if(res.status===429)throw Error('Limite temporário de consultas.');
 if(!res.ok)throw Error('Fonte indisponível (HTTP '+res.status+').');
 return format==='xml'?res.text():res.json();
}
async function lookupDOI(doi){
 const cross='https://api.crossref.org/works/'+encodeURIComponent(doi);
 const pmc='https://www.ebi.ac.uk/europepmc/webservices/rest/';
 const query=pmc+'search?'+new URLSearchParams({query:'DOI:"'+doi+'"',format:'json',resultType:'core',pageSize:'10'});
 const report={at:new Date().toISOString(),sources:[],texts:[]};
 const failure=e=>e.name==='TimeoutError'?'Tempo de resposta excedido.':e.name==='TypeError'?'Conexão indisponível.':e.message;
 const crossref=async()=>{
  try{
   const work=(await fetchEvidence(cross))?.message;
   report.sources.push(sourceStatus('Crossref · registro DOI',cross,work?(work.abstract?'DOI e resumo localizados.':'DOI localizado. Resumo indisponível no registro.'):'DOI não localizado nesta base.'));
   if(work){
    report.texts.push({name:'Título na Crossref',text:sourceText(work.title?.[0])});
    if(work.abstract)report.texts.push({name:'Resumo na Crossref',text:sourceText(work.abstract)});
   }
  }catch(e){report.sources.push(sourceStatus('Crossref · registro DOI',cross,failure(e)));}
 };
 const europe=async()=>{
  try{
   const result=(await fetchEvidence(query))?.resultList?.result||[];
   const record=result.find(x=>x.doi?.toLowerCase()===doi.toLowerCase()&&x.isOpenAccess==='Y'&&x.pmcid)||result.find(x=>x.doi?.toLowerCase()===doi.toLowerCase());
   report.sources.push(sourceStatus('Europe PMC · busca por DOI',query,record?(record.abstractText?'Registro e resumo localizados.':'Registro localizado. Resumo indisponível.'):'DOI não localizado nesta base.'));
   if(record?.title)report.texts.push({name:'Título no Europe PMC',text:sourceText(record.title)});
   if(record?.abstractText)report.texts.push({name:'Resumo no Europe PMC',text:sourceText(record.abstractText)});
   if(!record?.pmcid||record.isOpenAccess!=='Y')return;
   const xmlUrl=pmc+encodeURIComponent(record.pmcid)+'/fullTextXML';
   try{
    const xml=await fetchEvidence(xmlUrl,'xml');
    const doc=xml?new DOMParser().parseFromString(xml,'application/xml'):null;
    const body=doc?.querySelector('article > body');
    if(!body){report.sources.push(sourceStatus('Europe PMC · texto integral',xmlUrl,'Texto integral indisponível para esta consulta.'));return;}
    for(const el of body.querySelectorAll('p, tr')){
     if(el.closest('ref-list, table-wrap-foot'))continue;
     const section=el.closest('sec')?.querySelector(':scope > title')?.textContent?.trim();
     const table=el.closest('table-wrap')?.querySelector(':scope > label')?.textContent?.trim();
     report.texts.push({name:'Texto integral no Europe PMC'+(table||section?' · '+(table||section):''),text:el.textContent});
    }
    report.sources.push(sourceStatus('Europe PMC · texto integral',xmlUrl,'Parágrafos e linhas de tabelas consultados. Suplementos externos exigem leitura manual.'));
   }catch(e){report.sources.push(sourceStatus('Europe PMC · texto integral',xmlUrl,failure(e)));}
  }catch(e){report.sources.push(sourceStatus('Europe PMC · busca por DOI',query,failure(e)));}
 };
 await Promise.all([crossref(),europe()]);
 return report;
}
function verifyOnline(refs){
 const jobs=new Map();
 for(const ref of refs){
  const doi=referenceDOI(ref);
  if(validDOI(doi)&&!onlinePending.has(doi.toLowerCase()))jobs.set(doi.toLowerCase(),doi);
 }
 if(!jobs.size){notify(refs.some(r=>validDOI(referenceDOI(r)))?'Consulta em andamento.':'Informe um DOI válido para a consulta automática.');return;}
 for(const key of jobs.keys())onlinePending.add(key);
 render();
 for(const [key,doi] of jobs){
  verificationQueue=verificationQueue.catch(()=>{}).then(async()=>{
   try{onlineCache.set(key,await lookupDOI(doi));}
   finally{onlinePending.delete(key);if(!modal.open)render();}
  });
 }
}
function textMatch(value,report,fieldName){
 const needle=normalizeChemicalText(value).replace(/\s*([°%])\s*/g,'$1');
 if(needle.length<3||!/[\p{L}\p{N}]/u.test(needle)||!report)return [];
 const escaped=needle.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const pattern=new RegExp('(^|[^\\p{L}\\p{N}])'+escaped+'(?![\\p{L}\\p{N}])','u');
 return [...new Set(report.texts.filter(t=>{
  if((fieldName==='yield'||fieldName==='temperature'||fieldName==='time')&&t.name.startsWith('Título'))return false;
  return pattern.test(normalizeChemicalText(t.text).replace(/\s*([°%])\s*/g,'$1'));
 }).map(t=>t.name))].slice(0,3);
}
function webField(ref,key,value){
 if(value===''||value==null)return {label:'Dado faltante',style:'amber',notes:[]};
 const doi=referenceDOI(ref).toLowerCase();
 const report=onlineCache.get(doi);
 const mentions=textMatch(key==='yield'?String(value)+'%':value,report,key);
 const locator=String(ref['evidence_'+key]||'').trim();
 const manual=ref.verified==='Conferida por mim'&&locator&&(validDOI(doi)||safeURL(ref.url));
 const notes=[...mentions.map(x=>'Menção em '+x),...(locator?['Localização anotada: '+locator]:[])];
 if(manual)return {label:'Conferido manualmente',style:'green',notes};
 if(mentions.length)return {label:'Menção localizada · contexto a conferir',style:'amber',notes};
 return {label:report?'Não localizado · incerto':'Sem conferência web · incerto',style:'amber',notes};
}
function verificationPanel(ref){
 const doi=referenceDOI(ref);
 const key=doi.toLowerCase();
 const report=onlineCache.get(key);
 const pending=onlinePending.has(key);
 return '<details class="audit sub" '+(report||pending?'open':'')+'><summary>Conferência das evidências</summary>'+
 '<p class="hint">A consulta envia somente o DOI às bases. Uma menção textual pode pertencer a outro exemplo. O mesmo produto, substrato e procedimento precisam ser conferidos no artigo ou suplemento.</p>'+
 (validDOI(doi)?button(pending?'Consultando as fontes…':'Conferir na web','verify-ref',ref.id,'link').replace('type="button"',pending?'type="button" disabled':'type="button"'):'<p class="hint">Sem DOI, use o link oficial e registre o local de cada dado no documento.</p>')+
 (report?'<p class="note">Consulta nesta sessão · '+html(new Date(report.at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))+'</p><ul class="audit-sources">'+report.sources.map(s=>'<li>'+sourceLink(s.name,s.url)+' · '+html(s.status)+'</li>').join('')+'</ul>':'')+
 '<div class="table-wrap"><table><thead><tr><th>Campo</th><th>Valor registrado</th><th>Evidência e incerteza</th></tr></thead><tbody>'+
 verificationFields.map(([k,l])=>{
  const value=ref[k];
  const status=webField(ref,k,value);
  return '<tr><th scope="row">'+html(l)+'</th><td>'+html(value!==''&&value!=null?(k==='yield'?yieldText(ref):value):'—')+'</td><td>'+badge(status.label,status.style)+status.notes.map(n=>'<div class="note">'+html(n)+'</div>').join('')+'</td></tr>';
 }).join('')+'</tbody></table></div></details>';
}
function planningVerification(plan,review=false){
 const refs=data.refs.filter(ref=>plan.refIds?.includes(ref.id));
 return '<section class="panel"><h2>Evidências do planejamento</h2><p class="hint">A conferência cruza os valores atuais com as referências vinculadas. Mesmo com uma condição publicada, a transferência para esta reação continua sendo uma hipótese até o teste em bancada.</p>'+
 (review?'':refs.length?button('Conferir referências na web','verify-plan',plan.id,'link')+' <a class="link" href="#reacao/'+encodeURIComponent(plan.id)+'" data-action="tab" data-id="Literatura">Ver fontes e métodos</a>':'<p class="hint">Vincule fontes na aba Literatura para conferir os dados. Os valores sem fonte ficam marcados como incertos.</p>')+
 '<div class="table-wrap"><table><thead><tr><th>Campo</th><th>Evidência para o valor planejado</th></tr></thead><tbody>'+
 core.map(([k,l])=>{
  const value=plan[k];
  const matches=value?refs.filter(ref=>normalizeChemicalText(ref[k])===normalizeChemicalText(value)):[];
  const reviewed=matches.filter(ref=>webField(ref,k,ref[k]).style==='green');
  const seen=matches.filter(ref=>textMatch(value,onlineCache.get(referenceDOI(ref).toLowerCase()),k).length);
  const status=!value?'Dado faltante':reviewed.length?'Conferido na fonte por você':seen.length?'Menção localizada · contexto a conferir':'Sem evidência conferida · incerto';
  return '<tr><th scope="row">'+html(l)+'</th><td>'+badge(status,reviewed.length?'green':'amber')+
   (reviewed.length?reviewed:seen.length?seen:matches).map(ref=>'<div class="note">'+html(ref.title)+links(ref)+'</div>').join('')+'</td></tr>';
 }).join('')+'</tbody></table></div></section>';
}
function productRecord(plan){
 const cid=String(plan.targetCID||'');
 return /^\d{1,12}$/.test(cid)&&plan.target&&plan.target===plan.targetImageName&&validImage(plan.targetImage)?cid:'';
}
function structureSummary(plan){
 const reagent=structureEditor.preview(plan.reagentDrawing);
 const target=structureEditor.preview(plan.targetDrawing);
 const cid=productRecord(plan);
 const targetName=plan.target||'Produto-alvo';
 const image=cid?'<img class="structure-img" alt="'+html('Representação 2D de '+targetName)+'" src="'+html(plan.targetImage)+'"><p class="note">Estrutura de referência · '+sourceLink('PubChem CID '+cid,'https://pubchem.ncbi.nlm.nih.gov/compound/'+cid)+'. Confira a identidade e a estereoquímica para a reação.</p>':'';
 return (reagent?'<section class="structure-preview"><h3>Estruturas desenhadas dos reagentes</h3>'+reagent+'</section>':'')+
 '<section class="structure-preview"><h3>Estrutura do produto-alvo</h3>'+(target?target+'<p class="note">Esboço desenhado no planejamento.</p>':'')+image+
 (target||image?'<p class="note">Estrutura esperada. A identidade do produto obtido depende da caracterização experimental.</p>':'<p class="muted">Estrutura ainda não registrada. Desenhe o produto ou consulte o PubChem ao editar a identificação.</p>')+'</section>';
}
function pubchemControls(plan){
 const hidden=(name,value)=>'<input type="hidden" name="'+name+'" value="'+html(value||'')+'">';
 return '<details class="audit wide"><summary>Gerar imagem do produto pelo PubChem</summary><p class="hint">A consulta envia ao PubChem o nome público digitado aqui. Se preferir manter o composto local, use o editor de desenho. Em caso de múltiplos registros, escolha o CID depois de conferir a identidade.</p>'+
 '<div class="grid">'+field('publicCompound','Nome público ou CID do produto','',{placeholder:'Ex.: 1,4-diaminobutane ou CID 1045',wide:true})+'</div>'+
 '<div class="chem-lookup sub"><button type="button" data-pubchem="search">Consultar PubChem</button><button type="button" data-pubchem="clear">Remover imagem</button><div data-pubchem-picks></div></div>'+
 hidden('targetCID',plan.targetCID)+hidden('targetImageName',plan.targetImageName)+hidden('targetImage',plan.targetImage)+
 '<div class="note" role="status" data-pubchem-status>'+ (productRecord(plan)?html('Imagem disponível · CID '+plan.targetCID):'')+'</div></details>';
}
async function getPubchem(path){
 const response=await fetch('https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/'+path,{signal:AbortSignal.timeout(12000),credentials:'omit',referrerPolicy:'no-referrer'});
 if(response.status===404)throw Error('O PubChem não encontrou esse registro. Tente um CID ou desenhe a estrutura.');
 if(!response.ok)throw Error('O PubChem está indisponível para esta consulta. Tente novamente em instantes.');
 return response;
}
document.addEventListener('click',async event=>{
 const action=event.target.closest('[data-pubchem]');
 if(!action)return;
 const form=action.closest('form');
 const target=form.elements.target;
 const input=form.elements.publicCompound;
 const status=form.querySelector('[data-pubchem-status]');
 const picks=form.querySelector('[data-pubchem-picks]');
 if(action.dataset.pubchem==='clear'){
  const inProgress=Array.from(form.querySelectorAll('[data-pubchem]')).some(button=>button.disabled);
  if(inProgress){status.textContent='Aguarde o fim da consulta para remover a imagem.';return;}
  for(const key of ['targetCID','targetImageName','targetImage'])form.elements[key].value='';
  picks.innerHTML='';
  status.textContent='Imagem removida.';
  return;
 }
 if(!target.value.trim()){status.textContent='Preencha primeiro o campo Produto-alvo.';return;}
 const name=input.value.trim();
 if(!name){status.textContent='Informe um nome público ou CID para consultar.';return;}
 const planName=target.value.trim();
 action.disabled=true;status.textContent='Consultando o PubChem…';
 try{
  let cid=action.dataset.cid;
  if(!cid){
   picks.innerHTML='';
   const explicit=name.match(/^(?:CID\s*)?(\d{1,12})$/i);
   if(explicit)cid=explicit[1];
   else{
    const json=await (await getPubchem('name/'+encodeURIComponent(name)+'/cids/JSON')).json();
    const ids=(json.IdentifierList?.CID||[]).filter(i=>Number.isSafeInteger(i)&&i>0);
    if(!ids.length)throw Error('Nenhum CID localizado.');
    if(ids.length>1){
     picks.innerHTML=ids.slice(0,8).map(i=>'<span class="row">'+sourceLink('Conferir CID '+i,'https://pubchem.ncbi.nlm.nih.gov/compound/'+i)+'<button type="button" data-pubchem="choose" data-cid="'+i+'">Usar CID '+i+'</button></span>').join('');
     status.textContent='Há '+ids.length+' registros. Confira a identidade e escolha um CID'+(ids.length>8?' entre os oito exibidos ou informe o CID correto no campo acima.':'.');
     return;
    }
    cid=String(ids[0]);
   }
  }
  const image=await (await getPubchem('cid/'+encodeURIComponent(cid)+'/PNG?image_size=300x300')).blob();
  if(image.size>350000)throw Error('Imagem acima do limite local de 350 KB.');
  const encoded=await fileData(image);
  if(!validImage(encoded))throw Error('O PubChem não retornou uma imagem válida.');
  if(target.value.trim()!==planName||input.value.trim()!==name){status.textContent='O produto ou a consulta mudou. Faça a busca novamente.';return;}
  form.elements.targetCID.value=cid;
  form.elements.targetImageName.value=planName;
  form.elements.targetImage.value=encoded;
  status.textContent='Imagem disponível na revisão final · PubChem CID '+cid;
 }catch(e){
  status.textContent=e.name==='TimeoutError'||e instanceof TypeError?'Não foi possível conectar ao PubChem nesta consulta. Use o editor local ou tente novamente.':e.message;
 }finally{action.disabled=false;}
});
render();
