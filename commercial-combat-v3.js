const VERSION = '0.9.0';
const MOTION_STATES = ['idle','walk','attack','skill','hit','guard','counter','critical','victory','retreat'];
const HERO_STYLE = {
  cao:{name:'조조',style:'sword',quote:'빈틈은 기다리는 것이 아니라 만들어내는 것이다.'},
  xiahou:{name:'하후돈',style:'spear',quote:'내 뒤로는 단 한 걸음도 물러나지 않는다.'},
  dian:{name:'전위',style:'heavy',quote:'군주께 닿으려면 먼저 나를 넘어라.'},
  xun:{name:'순욱',style:'rune',quote:'이긴 뒤에도 남을 질서를 세우겠습니다.'},
  guo:{name:'곽가',style:'rune',quote:'지금 움직이면 적은 아직 답을 고르지 못합니다.'},
  xu:{name:'허저',style:'shield',quote:'중군은 여기서 무너지지 않는다.'},
  liu:{name:'유비',style:'dual',quote:'백성을 지키지 못한 승리는 승리가 아니오.'},
  guan:{name:'관우',style:'guandao',quote:'약속을 저버린 승리라면 필요 없소.'},
  zhang:{name:'장비',style:'spear',quote:'첫 충격으로 전열을 깨뜨리겠소!'},
  zhao:{name:'조운',style:'spear',quote:'퇴로는 남아 있습니다. 제가 열겠습니다.'},
  'soldier-spear':{name:'창병대',style:'spear',quote:''},
  'soldier-archer':{name:'궁병대',style:'arrow',quote:''},
};

let scheduled = false;
let lastSnapshot = new Map();
let lastPhase = '';
let activeIntent = null;
let frameSamples = [];
let lastFrameAt = 0;
let reducedFx = false;
const timers = new Set();

const clamp = (value,min,max) => Math.min(max,Math.max(min,value));
const esc = (value) => String(value ?? '').replace(/[&<>"']/g,(char)=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[char]));
const center = (rect) => ({ x:rect.left+rect.width/2, y:rect.top+rect.height/2 });
const wait = (ms) => new Promise((resolve)=>{ const timer=setTimeout(()=>{timers.delete(timer);resolve();},ms);timers.add(timer); });

function layer(){
  let node=document.querySelector('#ccv3-layer');
  if(!node){ node=document.createElement('div');node.id='ccv3-layer';node.className='ccv3-layer';document.body.append(node); }
  return node;
}
function battlefield(){return document.querySelector('.battle-grid,.battlefield-grid,.battle-map,.battlefield-shell');}
function selectedUnit(){return document.querySelector('.battle-unit.player.selected[data-commercial-hero-id],.battle-unit.player.selected');}
function heroId(unit){return unit?.dataset.commercialHeroId||unit?.querySelector('svg[data-hero-id]')?.dataset.heroId||'';}
function mode(){
  const active=document.querySelector('.command-grid button.active[data-action],.battle-command-panel button.active[data-action],[data-mobile-command-panel] button.active[data-action]');
  const action=active?.dataset.action||'';
  if(action.includes('skill'))return 'skill';
  if(action.includes('attack'))return 'attack';
  if(action.includes('guard'))return 'guard';
  if(action.includes('move'))return 'move';
  return '';
}
function cloneUnit(unit,state){
  const rect=unit.getBoundingClientRect();
  const id=heroId(unit);
  const overlay=document.createElement('div');
  overlay.className=`ccv3-unit-overlay ${state}`;
  overlay.dataset.heroId=id;
  Object.assign(overlay.style,{left:`${rect.left}px`,top:`${rect.top}px`,width:`${rect.width}px`,height:`${rect.height}px`});
  const source=unit.querySelector('svg[data-commercial-art-v2],svg.hero-portrait');
  if(source){overlay.innerHTML=source.outerHTML;const svg=overlay.querySelector('svg');if(svg)svg.dataset.state=state;}
  else overlay.innerHTML=`<span>${esc(HERO_STYLE[id]?.name||id)}</span>`;
  layer().append(overlay);
  return {overlay,rect,id};
}
function setUnitState(unit,state,duration=0){
  const svg=unit?.querySelector('svg[data-commercial-art-v2],svg.hero-portrait');
  if(!svg)return;
  svg.dataset.state=state;
  if(duration)setTimeout(()=>{if(svg.isConnected)svg.dataset.state='idle';},duration);
}
function pathFrames(from,to,steps=7){
  const dx=to.x-from.x,dy=to.y-from.y;
  const frames=[];
  for(let index=0;index<=steps;index+=1){
    const progress=index/steps;
    const hop=Math.sin(progress*Math.PI*steps)*Math.min(5,Math.hypot(dx,dy)/35);
    const lean=clamp(dx/100,-4,4)*(1-Math.abs(.5-progress));
    frames.push({transform:`translate(${dx*progress}px,${dy*progress-hop}px) rotate(${lean}deg)`,offset:progress});
  }
  return frames;
}
function dustAt(x,y,index=0){
  if(reducedFx)return;
  const dust=document.createElement('i');
  dust.className='ccv3-dust';
  dust.style.left=`${x}px`;dust.style.top=`${y}px`;dust.style.setProperty('--delay',`${index*22}ms`);
  layer().append(dust);setTimeout(()=>dust.remove(),620+index*22);
}
function createTrail(from,to,style='slash'){
  if(reducedFx)return null;
  const node=document.createElement('div');
  node.className=`ccv3-trail ${style}`;
  const dx=to.x-from.x,dy=to.y-from.y,length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
  Object.assign(node.style,{left:`${from.x}px`,top:`${from.y}px`,width:`${length}px`,transform:`rotate(${angle}deg)`});
  layer().append(node);setTimeout(()=>node.remove(),900);return node;
}
function impactAt(x,y,type='slash',label=''){
  const node=document.createElement('div');node.className=`ccv3-impact ${type}`;node.style.left=`${x}px`;node.style.top=`${y}px`;
  node.innerHTML=`<i></i><i></i><i></i><b></b>${label?`<strong>${esc(label)}</strong>`:''}`;
  layer().append(node);setTimeout(()=>node.remove(),920);
  document.body.classList.add('ccv3-hitstop');setTimeout(()=>document.body.classList.remove('ccv3-hitstop'),88);
  battlefield()?.classList.add('ccv3-shake');setTimeout(()=>battlefield()?.classList.remove('ccv3-shake'),340);
}
function projectile(from,to,style){
  const projectileNode=document.createElement('div');projectileNode.className=`ccv3-projectile ${style}`;projectileNode.style.left=`${from.x}px`;projectileNode.style.top=`${from.y}px`;
  projectileNode.innerHTML=style==='rune'?'<b>策</b>':'<i></i>';
  layer().append(projectileNode);
  const dx=to.x-from.x,dy=to.y-from.y,angle=Math.atan2(dy,dx)*180/Math.PI;
  const animation=projectileNode.animate([{transform:`translate(0,0) rotate(${angle}deg) scale(.72)`,opacity:.2},{transform:`translate(${dx*.46}px,${dy*.46-9}px) rotate(${angle}deg) scale(1.08)`,opacity:1},{transform:`translate(${dx}px,${dy}px) rotate(${angle}deg) scale(.84)`,opacity:.8}],{duration:style==='rune'?560:430,easing:'cubic-bezier(.2,.72,.18,1)',fill:'forwards'});
  animation.finished.finally(()=>{impactAt(to.x,to.y,style==='rune'?'magic':'pierce');projectileNode.remove();});
}
function skillCutin(id){
  const hero=HERO_STYLE[id];if(!hero)return;
  const cut=document.createElement('div');cut.className='ccv3-skill-cutin';cut.innerHTML=`<div><svg class="hero-portrait story" viewBox="0 0 180 220" aria-label="${esc(hero.name)}"></svg></div><article><small>TACTICAL ARTS</small><b>${esc(hero.name)}</b><p>“${esc(hero.quote)}”</p></article><i></i>`;
  layer().append(cut);requestAnimationFrame(()=>cut.classList.add('show'));setTimeout(()=>cut.classList.add('leave'),860);setTimeout(()=>cut.remove(),1250);
}
async function animateMove(unit,targetCell){
  const {overlay,rect}=cloneUnit(unit,'walk');const target=targetCell.getBoundingClientRect();const from=center(rect),to=center(target);unit.classList.add('ccv3-ghost');
  const animation=overlay.animate(pathFrames({x:0,y:0},{x:to.x-from.x,y:to.y-from.y},7),{duration:reducedFx?260:710,easing:'cubic-bezier(.18,.76,.24,1)',fill:'forwards'});
  for(let i=1;i<=6;i+=1)setTimeout(()=>dustAt(from.x+(to.x-from.x)*i/7,from.y+(to.y-from.y)*i/7,i),i*(reducedFx?30:86));
  await animation.finished.catch(()=>{});overlay.remove();unit.classList.remove('ccv3-ghost');
}
async function animateStrike(unit,target,kind){
  const {overlay,rect,id}=cloneUnit(unit,kind);const targetRect=target.getBoundingClientRect();const from=center(rect),to=center(targetRect);const style=HERO_STYLE[id]?.style||'sword';unit.classList.add('ccv3-ghost');
  if(kind==='skill')skillCutin(id);
  if(style==='arrow'||style==='rune'){
    overlay.animate([{transform:'translate(0,0) scale(1)'},{transform:'translate(-4px,1px) scale(.96)'},{transform:'translate(2px,-2px) scale(1.04)'},{transform:'translate(0,0) scale(1)'}],{duration:kind==='skill'?760:470,easing:'ease-out'});
    await wait(kind==='skill'?460:190);projectile(from,to,style);
  }else{
    const dx=to.x-from.x,dy=to.y-from.y,reach=clamp(Math.hypot(dx,dy)*.48,24,92),ratio=reach/Math.max(1,Math.hypot(dx,dy));
    const moveX=dx*ratio,moveY=dy*ratio;
    const frames=[{transform:'translate(0,0) scale(1)',offset:0},{transform:`translate(${-moveX*.12}px,${-moveY*.12}px) scale(.95)`,offset:.18},{transform:`translate(${moveX*.72}px,${moveY*.72}px) scale(1.08)`,offset:.52},{transform:`translate(${moveX}px,${moveY}px) scale(1.12)`,offset:.64},{transform:'translate(0,0) scale(1)',offset:1}];
    overlay.animate(frames,{duration:kind==='skill'?850:610,easing:'cubic-bezier(.18,.8,.16,1)',fill:'forwards'});
    await wait(kind==='skill'?500:340);createTrail(from,to,style==='guandao'||style==='spear'?'thrust':'slash');impactAt(to.x,to.y,kind==='skill'?'critical':style==='heavy'||style==='shield'?'heavy':'slash',kind==='skill'?'技':'');
  }
  await wait(kind==='skill'?520:430);overlay.remove();unit.classList.remove('ccv3-ghost');
}
function animateGuard(unit){setUnitState(unit,'guard',760);const rect=unit.getBoundingClientRect(),pos=center(rect);impactAt(pos.x,pos.y,'guard','守');}
function onIntent(event){
  const target=event.target instanceof Element?event.target:null;if(!target)return;
  const unit=selectedUnit();if(!unit||unit.classList.contains('acted'))return;
  const currentMode=mode();const cell=target.closest('.battle-cell.reachable,.battle-cell[data-x][data-y]');const enemy=target.closest('.battle-unit.enemy');
  if(!currentMode&&enemy)return;
  if(currentMode==='move'&&cell){activeIntent={kind:'move',heroId:heroId(unit),at:Date.now()};animateMove(unit,cell);}
  else if((currentMode==='attack'||currentMode==='skill')&&enemy){activeIntent={kind:currentMode,heroId:heroId(unit),at:Date.now()};animateStrike(unit,enemy,currentMode);}
  else if(currentMode==='guard'){activeIntent={kind:'guard',heroId:heroId(unit),at:Date.now()};animateGuard(unit);}
}
function snapshot(){
  const map=new Map();document.querySelectorAll('.battle-unit[data-unit],.battle-unit[data-id]').forEach((unit)=>{
    const key=unit.dataset.unit||unit.dataset.id;if(!key)return;
    const text=unit.querySelector('.unit-label span,.unit-hp-text')?.textContent||'';const values=text.match(/(\d+)\s*\/\s*(\d+)/);
    const hp=values?Number(values[1]):Number(unit.dataset.hp||0),maxHp=values?Number(values[2]):Number(unit.dataset.maxHp||0);
    map.set(key,{unit,hp,maxHp,rect:unit.getBoundingClientRect(),id:heroId(unit),team:unit.classList.contains('enemy')?'enemy':'player'});
  });return map;
}
function floatingNumber(entry,delta){
  if(!delta)return;const pos=center(entry.rect),node=document.createElement('strong');node.className=`ccv3-number ${delta>0?'heal':'damage'}`;node.style.left=`${pos.x}px`;node.style.top=`${pos.y-10}px`;node.textContent=delta>0?`+${delta}`:`${delta}`;layer().append(node);setTimeout(()=>node.remove(),1100);
}
function compareSnapshot(next){
  const damaged=[];
  for(const [key,current] of next){
    const before=lastSnapshot.get(key);if(!before)continue;const delta=current.hp-before.hp;if(delta){floatingNumber(current,delta);if(delta<0){damaged.push({current,delta});setUnitState(current.unit,'hit',470);const p=center(current.rect);impactAt(p.x,p.y,Math.abs(delta)>(current.maxHp||100)*.25?'critical':'hit',Math.abs(delta)>(current.maxHp||100)*.25?'CRIT':'');}}
  }
  if(damaged.length>=2){const teams=new Set(damaged.map(({current})=>current.team));if(teams.size>1)phaseBanner('반격 발생','COUNTER ATTACK','counter');}
  for(const [key,before] of lastSnapshot){if(next.has(key))continue;const pos=center(before.rect);impactAt(pos.x,pos.y,'retreat','退');}
  lastSnapshot=next;
}
function phaseText(){
  const candidates=['.phase-banner','.battle-phase','.turn-banner','.battle-status strong','.battle-header h2'];
  for(const selector of candidates){const text=document.querySelector(selector)?.textContent?.trim();if(text)return text;}
  return '';
}
function phaseBanner(title,subtitle='TACTICAL PHASE',tone='player'){
  if(document.querySelector('.ccv3-phase'))return;
  const node=document.createElement('div');node.className=`ccv3-phase ${tone}`;node.innerHTML=`<small>${esc(subtitle)}</small><b>${esc(title)}</b><i></i>`;layer().append(node);requestAnimationFrame(()=>node.classList.add('show'));setTimeout(()=>node.classList.add('leave'),850);setTimeout(()=>node.remove(),1260);
}
function checkPhase(){const text=phaseText();if(!text||text===lastPhase)return;lastPhase=text;if(/적|enemy/i.test(text))phaseBanner('적군 행동','ENEMY PHASE','enemy');else if(/승리|victory/i.test(text))phaseBanner('전투 승리','VICTORY','victory');else if(/패배|퇴각|defeat/i.test(text))phaseBanner('전열 재정비','RETREAT','enemy');else phaseBanner('아군 행동','PLAYER PHASE','player');}
function hud(){
  const host=document.querySelector('.battle-screen,.battlefield-shell');if(!host||host.querySelector('[data-ccv3-hud]'))return;
  const node=document.createElement('div');node.className='ccv3-hud';node.dataset.ccv3Hud='1';node.innerHTML=`<div><small>TACTICAL CAMERA</small><b>전장 지휘 모드</b></div><button data-ccv3-fx type="button">연출 강</button><button data-ccv3-focus type="button">전장 전체</button>`;
  host.insertAdjacentElement('afterbegin',node);
}
function enhance(){
  scheduled=false;document.documentElement.classList.add('commercial-combat-v3-ready');hud();checkPhase();compareSnapshot(snapshot());
  window.__commercialCombatV3={ready:true,version:VERSION,states:[...MOTION_STATES],effects:['path-move','dust','slash','thrust','arrow','rune','hitstop','camera-shake','damage-number','counter','skill-cutin','phase-banner'],animationFrames:8,reducedFx,metrics:{fps:frameSamples.length?Math.round(frameSamples.reduce((a,b)=>a+b,0)/frameSamples.length):0,lastIntent:activeIntent}};
}
function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(enhance);}
function sampleFrame(now){if(lastFrameAt){const delta=now-lastFrameAt;if(delta>0&&delta<1000){frameSamples.push(1000/delta);if(frameSamples.length>120)frameSamples.shift();}}lastFrameAt=now;requestAnimationFrame(sampleFrame);}

document.addEventListener('pointerdown',onIntent,true);
document.addEventListener('click',(event)=>{const target=event.target instanceof Element?event.target:null;if(!target)return;if(target.closest('[data-ccv3-fx]')){reducedFx=!reducedFx;target.closest('[data-ccv3-fx]').textContent=reducedFx?'연출 절약':'연출 강';document.documentElement.classList.toggle('ccv3-reduced',reducedFx);schedule();}if(target.closest('[data-ccv3-focus]')){const field=battlefield();field?.classList.toggle('ccv3-overview');target.closest('[data-ccv3-focus]').textContent=field?.classList.contains('ccv3-overview')?'확대 보기':'전장 전체';}},true);
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true,attributes:true,attributeFilter:['class','style','data-hp']});
requestAnimationFrame(sampleFrame);schedule();
