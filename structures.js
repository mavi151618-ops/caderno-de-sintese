'use strict';
const structureEditor=(()=>{
 const elements=['C','N','O','S','P','F','Cl','Br','I','B','Si','H','Na','K','Mg','Li'];
 const width=480,height=220;
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const blank=()=>({atoms:[],bonds:[]});
 function parse(value){
  try{
   const g=JSON.parse(value);
   if(!g||!Array.isArray(g.atoms)||!Array.isArray(g.bonds)||g.atoms.length>100||g.bonds.length>200)return blank();
   if(!g.atoms.every(a=>a&&elements.includes(a.el)&&[-2,-1,0,1,2].includes(a.charge)&&Number.isFinite(a.x)&&a.x>=0&&a.x<=width&&Number.isFinite(a.y)&&a.y>=0&&a.y<=height))return blank();
   if(!g.bonds.every(b=>b&&g.atoms[b.a]&&g.atoms[b.b]&&Number.isInteger(b.a)&&Number.isInteger(b.b)&&b.a!==b.b&&[1,2,3].includes(b.order)))return blank();
   return g;
  }catch{return blank();}
 }
 function visual(g,active=-1){
  const lines=g.bonds.map(({a,b,order})=>{
   const A=g.atoms[a],B=g.atoms[b],dx=B.x-A.x,dy=B.y-A.y,d=Math.hypot(dx,dy);
   if(d<1)return '';
   return Array.from({length:order},(_,i)=>{
    const offset=(i-(order-1)/2)*4, ox=-dy/d*offset,oy=dx/d*offset;
    return '<line x1="'+(A.x+ox)+'" y1="'+(A.y+oy)+'" x2="'+(B.x+ox)+'" y2="'+(B.y+oy)+'"/>';
   }).join('');
  }).join('');
  const atoms=g.atoms.map((a,i)=>{
   const charge=a.charge===0?'':(Math.abs(a.charge)>1?Math.abs(a.charge):'')+(a.charge>0?'+':'−');
   const label=a.el+charge;
   return '<g data-atom="'+i+'" transform="translate('+a.x+' '+a.y+')"><circle r="14" class="'+(i===active?'selected-atom':'')+'"/><text font-size="14" text-anchor="middle" dominant-baseline="central">'+label+'</text></g>';
  }).join('');
  return '<g class="structure-bonds">'+lines+'</g><g class="structure-atoms">'+atoms+'</g>';
 }
 function svgInner(g,editable=false){
  if(!editable&&!g.atoms.length)return '';
  return '<svg class="chem-svg'+(editable?' chem-canvas':'')+'" viewBox="0 0 '+width+' '+height+'" aria-label="'+(editable?'Área de desenho molecular':'Estrutura molecular desenhada')+'" role="img">'+visual(g)+'</svg>';
 }
 function preview(value){return svgInner(parse(value));}
 function markup(name,value,label){
  const g=parse(value);
  return '<details class="audit chem-editor wide" data-editor><summary>'+escape(label)+(g.atoms.length?' · '+g.atoms.length+' átomos':'')+'</summary>'+
   '<p class="hint">Escolha o elemento e clique na área para adicionar átomos. Para ligar, selecione dois átomos. Clique novamente num par ligado para trocar a ordem.</p>'+
   '<input type="hidden" name="'+escape(name)+'" value="'+escape(value||'')+'">'+
   '<div class="chem-controls"><label>Modo<select data-mode><option value="atom">Átomo</option><option value="bond">Ligação</option><option value="move">Mover átomo</option><option value="erase">Apagar átomo</option></select></label>'+
   '<label>Elemento<select data-element>'+elements.map(v=>'<option>'+v+'</option>').join('')+'</select></label>'+
   '<label>Carga<select data-charge><option>0</option><option>1</option><option>-1</option><option>2</option><option>-2</option></select></label>'+
   '<label>Ordem<select data-order><option value="1">Simples</option><option value="2">Dupla</option><option value="3">Tripla</option></select></label></div>'+
   svgInner(g,true)+'<div class="actions sub"><button type="button" data-chem-command="ring">Adicionar anel de seis átomos</button><button type="button" data-chem-command="undo">Desfazer</button></div>'+
   '<p class="note">O desenho é um esboço 2D. Use uma referência estrutural para estereoquímica e confira a valência no composto final.</p></details>';
 }
 const state=new WeakMap();
 function read(editor){
  if(!state.has(editor)){
   const input=editor.querySelector('input[type=hidden]');
   state.set(editor,{g:parse(input.value),input,previous:[],selected:-1,svg:editor.querySelector('svg')});
  }
  return state.get(editor);
 }
 function redraw(s){s.svg.innerHTML=visual(s.g,s.selected);}
 function save(s,change){
  s.previous.push(JSON.stringify(s.g));if(s.previous.length>60)s.previous.shift();
  change();s.selected=-1;s.input.value=s.g.atoms.length?JSON.stringify(s.g):'';redraw(s);
 }
 document.addEventListener('change',e=>{
  if(!e.target.matches('[data-mode]'))return;
  const s=read(e.target.closest('[data-editor]'));s.selected=-1;redraw(s);
 });
 document.addEventListener('click',e=>{
  const editor=e.target.closest('[data-editor]');
  if(!editor)return;
  const command=e.target.closest('[data-chem-command]')?.dataset.chemCommand;
  const svg=e.target.closest('.chem-canvas');
  if(!command&&!svg)return;
  const s=read(editor),g=s.g;
  if(command==='undo'){
   if(s.previous.length){s.g=parse(s.previous.pop());s.input.value=s.g.atoms.length?JSON.stringify(s.g):'';s.selected=-1;redraw(s);}
   return;
  }
  if(command==='ring'){
   if(g.atoms.length>94||g.bonds.length>194)return;
   save(s,()=>{
    const first=g.atoms.length, cx=85+(first%20)*14;
    for(let i=0;i<6;i++){
     const angle=i*Math.PI/3;
     g.atoms.push({el:'C',charge:0,x:cx+35*Math.cos(angle),y:110+35*Math.sin(angle)});
     g.bonds.push({a:first+i,b:first+(i+1)%6,order:1});
    }
   });
   return;
  }
  const hit=e.target.closest('[data-atom]'),index=hit?Number(hit.dataset.atom):-1;
  const position=new DOMPoint(e.clientX,e.clientY).matrixTransform(svg.getScreenCTM().inverse());
  if(position.x<0||position.y<0||position.x>width||position.y>height)return;
  const x=Math.min(width-15,Math.max(15,Math.round(position.x))),y=Math.min(height-15,Math.max(15,Math.round(position.y)));
  const mode=editor.querySelector('[data-mode]').value;
  if(mode==='atom'){
   const el=editor.querySelector('[data-element]').value,charge=Number(editor.querySelector('[data-charge]').value);
   if(index>=0){save(s,()=>Object.assign(g.atoms[index],{el,charge}));return;}
   if(g.atoms.length<100)save(s,()=>g.atoms.push({el,charge,x,y}));
  }
  if(mode==='erase'&&index>=0)save(s,()=>{
   g.atoms.splice(index,1);
   g.bonds=g.bonds.filter(b=>b.a!==index&&b.b!==index).map(b=>({...b,a:b.a>index?b.a-1:b.a,b:b.b>index?b.b-1:b.b}));
  });
  if(mode==='move'){
   if(index>=0){s.selected=index;redraw(s);}
   else if(s.selected>=0)save(s,()=>Object.assign(g.atoms[s.selected],{x,y}));
  }
  if(mode==='bond'&&index>=0){
   if(s.selected<0||s.selected===index){s.selected=s.selected===index?-1:index;redraw(s);return;}
   const a=s.selected,b=index,order=Number(editor.querySelector('[data-order]').value);
   const existing=g.bonds.find(v=>v.a===a&&v.b===b||v.b===a&&v.a===b);
   if(existing||g.bonds.length<200)save(s,()=>{if(existing)existing.order=order;else g.bonds.push({a,b,order});});
  }
 });
 return {markup,preview};
})();
