import { HEROES, SAVE_KEY } from './content.js';

const VERSION='0.9.0';
const META_KEY='threecountry:campaign-story:v3';
const V2_KEY='threecountry:story-director:v2';
let queued=false;
let modalOpen=false;

const SCENES=[
  {id:'xiahou-oath',screen:'hub',priority:90,speaker:'xiahou',requiresV2:'war-council',eyebrow:'OFFICER ARC · 창업의 맹세',title:'하후돈이 홀로 남아 출전 명부를 바라본다',text:'오랜 동료에게 선봉을 맡기는 것은 신뢰인가, 위험을 떠넘기는 것인가. 조조의 한마디가 두 사람의 관계를 바꾼다.',choices:[
    {id:'trust',label:'“내 등을 맡길 사람은 그대뿐이다.”',hint:'조조↔하후돈 신뢰 +3 · 하후돈 보호막 +8',relation:['cao','xiahou',3],battle:{hero:'xiahou',shield:8}},
    {id:'restraint',label:'“이번에는 중군에서 병사를 지켜라.”',hint:'군율 +1 · 하후돈 방어 +3',traits:{discipline:1},battle:{hero:'xiahou',defense:3}},
    {id:'challenge',label:'“관우를 넘어서야 진짜 선봉이다.”',hint:'결단 +2 · 하후돈 공격 +4',traits:{boldness:2},battle:{hero:'xiahou',attack:4}}
  ]},
  {id:'guo-fever',screen:'deployment',priority:88,speaker:'guo',requiresV2:'refugee-road',eyebrow:'OFFICER ARC · 식지 않는 열',title:'곽가가 기침을 감춘 채 진류 지도를 펼친다',text:'정찰 정보는 완성됐지만 책사의 손은 뜨겁다. 출전을 강행할지, 후방에서 지휘할지, 순욱에게 계획을 나눌지 정해야 한다.',choices:[
    {id:'front',label:'곽가를 전장에 동행시킨다',hint:'곽가 공격 +5 · 최대 HP -8',relation:['cao','guo',2],battle:{hero:'guo',attack:5,maxHp:-8}},
    {id:'rear',label:'후방 지휘소에서 쉬게 한다',hint:'곽가 22 회복 · 군율 +1',traits:{discipline:1},battle:{hero:'guo',heal:22}},
    {id:'share',label:'순욱과 작전 문서를 나누게 한다',hint:'곽가·순욱 기술력 +1 · 지략 +2',traits:{cunning:2},battle:{heroes:['guo','xun'],skill:1}}
  ]},
  {id:'village-bell',screen:'battle',priority:86,speaker:'dian',turn:2,eyebrow:'BATTLE STORY · 마을의 종',title:'서쪽 마을에서 구조를 알리는 종이 울린다',text:'적의 우회부대가 주민 쪽으로 향한다. 전위가 길을 틀어 막을 수 있지만 중앙의 조조가 노출된다.',choices:[
    {id:'rescue',label:'전위를 마을로 보내 주민을 구한다',hint:'명성 +10 · 전위 보호막 +16 · 인의 +2',resources:{fame:10},traits:{benevolence:2},battle:{hero:'dian',shield:16}},
    {id:'hold',label:'중앙 호위를 유지한다',hint:'조조·전위 방어 +3 · 군율 +2',traits:{discipline:2},battle:{heroes:['cao','dian'],defense:3}},
    {id:'bait',label:'마을길을 미끼로 적을 유인한다',hint:'적 선봉 이동 봉쇄 · 지략 +2',traits:{cunning:2},battle:{enemyFrontRoot:1}}
  ]},
  {id:'zhang-roar',screen:'battle',priority:84,speaker:'zhang',turn:4,requiresAlive:'zhang',eyebrow:'RIVAL SCENE · 장판의 호통',title:'장비의 호통이 하천 건너까지 울린다',text:'아군 병사들의 발이 잠시 멈춘다. 맞서 외칠지, 방패를 세울지, 조용히 측면을 파고들지 선택한다.',choices:[
    {id:'answer',label:'하후돈이 전열 앞으로 나선다',hint:'하후돈 공격 +5 · 사기 저하 무효',relation:['xiahou','zhang',-1],battle:{hero:'xiahou',attack:5,shield:6}},
    {id:'brace',label:'전군에 방어 명령을 내린다',hint:'아군 전원 방어 +2 · 군율 +2',traits:{discipline:2},battle:{allDefense:2}},
    {id:'flank',label:'조조 기병이 측면으로 우회한다',hint:'조조 이동·공격 강화 · 결단 +2',traits:{boldness:2},battle:{hero:'cao',attack:4,speed:2}}
  ]},
  {id:'guan-mercy',screen:'battle',priority:92,speaker:'guan',requiresLow:'guan',eyebrow:'RIVAL SCENE · 의리의 선택',title:'관우의 말이 비틀거리지만 그는 창을 거두지 않는다',text:'궁지에 몰린 적장을 몰아붙일지, 퇴로를 열어 명예를 지킬지, 직접 설득할지 선택한다.',choices:[
    {id:'finish',label:'기회를 놓치지 않고 총공격한다',hint:'아군 공격 +4 · 명성 -5 · 결단 +2',resources:{fame:-5},traits:{boldness:2},battle:{allAttack:4}},
    {id:'road',label:'퇴로를 열고 주민 피해를 막는다',hint:'명성 +12 · 인의 +3 · 관우 이동 봉쇄',resources:{fame:12},traits:{benevolence:3},battle:{hero:'guan',root:1}},
    {id:'parley',label:'조조가 직접 관우에게 말을 건다',hint:'조조↔관우 관계 +2 · 지략 +1',relation:['cao','guan',2],traits:{cunning:1},battle:{hero:'guan',attack:-3}}
  ]},
  {id:'liu-parley',screen:'battle',priority:80,speaker:'liu',turn:7,requiresAlive:'liu',eyebrow:'BOSS SCENE · 두 군주의 담판',title:'유비가 잠시 공격을 멈추고 협상을 청한다',text:'유비는 진류 주민의 안전을 조건으로 철수할 수 있다고 말한다. 받아들이면 피를 줄이지만 완전한 승리는 멀어진다.',choices:[
    {id:'truce',label:'주민 안전을 보장하고 길을 연다',hint:'명성 +16 · 인의 +3 · 유비 공격 -5',resources:{fame:16},traits:{benevolence:3},relation:['cao','liu',2],battle:{hero:'liu',attack:-5,root:1}},
    {id:'proof',label:'무기를 내려놓고 일대일 담판한다',hint:'조조·유비 보호막 +12 · 지략 +2',traits:{cunning:2},relation:['cao','liu',1],battle:{heroes:['cao','liu'],shield:12}},
    {id:'reject',label:'지금 끝내야 한다며 공격을 명한다',hint:'아군 공격 +4 · 결단 +3',traits:{boldness:3},relation:['cao','liu',-2],battle:{allAttack:4}}
  ]},
  {id:'prisoner-road',screen:'result',priority:90,speaker:'xun',requiresVictory:true,requiresV2:'after-battle-law',eyebrow:'AFTERMATH · 포로와 부상병',title:'성문 밖에 양군의 부상자와 포로가 모였다',text:'승리한 뒤의 첫 명령은 장수보다 백성이 오래 기억한다. 치료, 등용, 교환 가운데 하나를 택해야 한다.',choices:[
    {id:'heal-all',label:'적아를 가리지 않고 부상자를 치료한다',hint:'군량 -90 · 명성 +18 · 인의 +3',resources:{grain:-90,fame:18},traits:{benevolence:3},flag:'heal-all'},
    {id:'recruit',label:'재능 있는 포로에게 등용을 제안한다',hint:'금 -100 · 지략 +2 · 등용 분기',resources:{gold:-100},traits:{cunning:2},flag:'prisoner-recruit'},
    {id:'exchange',label:'포로를 군량과 교환한다',hint:'군량 +160 · 군율 +1',resources:{grain:160},traits:{discipline:1},flag:'prisoner-exchange'}
  ]},
  {id:'night-camp',screen:'hub',priority:36,speaker:'cao',requiresCleared:true,requiresScene:'prisoner-road',eyebrow:'EPILOGUE · 진류의 첫 밤',title:'새 깃발 아래 첫 야영불이 켜졌다',text:'장수들은 다음 전쟁을 준비하지만, 조조는 오늘의 선택이 세력의 모습을 바꾸기 시작했음을 안다.',choices:[
    {id:'companions',label:'장수들과 함께 야영불에 앉는다',hint:'핵심 장수 관계 +1 · 인의 +1',traits:{benevolence:1},relations:[['cao','xiahou',1],['cao','guo',1],['cao','dian',1]],flag:'camp-companions'},
    {id:'records',label:'곽가와 전투 기록을 밤새 검토한다',hint:'지략 +3 · 다음 장 첩보 분기',traits:{cunning:3},relation:['cao','guo',2],flag:'camp-records'},
    {id:'inspection',label:'직접 성벽과 보급 창고를 순찰한다',hint:'군율 +2 · 결단 +1',traits:{discipline:2,boldness:1},relation:['cao','xiahou',1],flag:'camp-inspection'}
  ]}
];

const parse=(value,fallback)=>{try{return value?JSON.parse(value):fallback}catch{return fallback}};
const readSave=()=>parse(localStorage.getItem(SAVE_KEY),null);
const writeSave=(save)=>{try{localStorage.setItem(SAVE_KEY,JSON.stringify(save));return true}catch{return false}};
const readV2=()=>parse(localStorage.getItem(V2_KEY),{completed:{}});
function readMeta(){const raw=parse(localStorage.getItem(META_KEY),{});return {version:VERSION,completed:raw.completed||{},flags:Array.isArray(raw.flags)?raw.flags:[],traits:{benevolence:0,cunning:0,discipline:0,boldness:0,...(raw.traits||{})},relations:raw.relations||{},chronicle:Array.isArray(raw.chronicle)?raw.chronicle:[]};}
const writeMeta=(meta)=>{try{localStorage.setItem(META_KEY,JSON.stringify(meta))}catch{}}
const esc=(value)=>String(value??'').replace(/[&<>"']/g,(char)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[char]));
const screen=()=>document.querySelector('.result-screen')?'result':document.querySelector('.battle-screen,.battlefield-shell')?'battle':document.querySelector('.deployment-screen')?'deployment':document.querySelector('.hub-screen')?'hub':'';
const alive=(save,id)=>save?.battle?.units?.find((unit)=>unit.heroId===id&&!unit.dead&&unit.hp>0);
const low=(save,id)=>{const unit=alive(save,id);return !!unit&&unit.hp/unit.maxHp<=.42;};
function condition(scene,save,meta,v2){
  if(scene.screen!==screen()||meta.completed[scene.id])return false;
  if(scene.requiresV2&&!v2.completed?.[scene.requiresV2])return false;
  if(scene.requiresScene&&!meta.completed[scene.requiresScene])return false;
  if(scene.turn&&(!save?.battle||save.battle.turn<scene.turn||save.battle.phase!=='player'))return false;
  if(scene.requiresAlive&&!alive(save,scene.requiresAlive))return false;
  if(scene.requiresLow&&!low(save,scene.requiresLow))return false;
  if(scene.requiresVictory&&save?.battle?.result?.outcome!=='victory')return false;
  if(scene.requiresCleared&&!save?.chapterCleared)return false;
  return true;
}
function nextScene(){const save=readSave(),meta=readMeta(),v2=readV2();return SCENES.filter((scene)=>condition(scene,save,meta,v2)).sort((a,b)=>b.priority-a.priority)[0]||null;}
function relationKey(a,b){return [a,b].sort().join(':');}
function applyRelation(meta,change){if(!change)return;const [a,b,value]=change,key=relationKey(a,b);meta.relations[key]=(meta.relations[key]||0)+value;}
function resource(save,values={}){if(!save?.resources)return;for(const [key,value] of Object.entries(values))save.resources[key]=Math.max(0,(save.resources[key]||0)+value);}
function addStatus(unit,key,amount,turns=2){if(!unit)return;unit.status=unit.status||{};if(['shield','root'].includes(key))unit.status[key]=Math.max(0,(unit.status[key]||0)+amount);else unit.status[key]={amount,turns};}
function applyBattle(save,effect={}){
  const battle=save?.battle;if(!battle)return;const players=battle.units.filter((u)=>u.team==='player'&&!u.dead&&u.hp>0),enemies=battle.units.filter((u)=>u.team==='enemy'&&!u.dead&&u.hp>0);const find=(id)=>battle.units.find((u)=>u.heroId===id&&!u.dead&&u.hp>0);
  const targets=effect.heroes?.map(find).filter(Boolean)||(effect.hero?[find(effect.hero)].filter(Boolean):[]);
  for(const unit of targets){if(effect.heal)unit.hp=Math.min(unit.maxHp,unit.hp+effect.heal);if(effect.maxHp){unit.maxHp=Math.max(40,unit.maxHp+effect.maxHp);unit.hp=Math.min(unit.hp,unit.maxHp);}if(effect.attack)addStatus(unit,'attackUp',effect.attack);if(effect.defense)addStatus(unit,'defenseUp',effect.defense);if(effect.speed)addStatus(unit,'speedUp',effect.speed);if(effect.shield)addStatus(unit,'shield',effect.shield);if(effect.root)addStatus(unit,'root',effect.root);if(effect.skill)unit.skill=Math.min(unit.skillMax,unit.skill+effect.skill);}
  if(effect.allAttack)players.forEach((u)=>addStatus(u,'attackUp',effect.allAttack));if(effect.allDefense)players.forEach((u)=>addStatus(u,'defenseUp',effect.allDefense));if(effect.enemyFrontRoot)enemies.sort((a,b)=>a.x-b.x).slice(0,2).forEach((u)=>addStatus(u,'root',effect.enemyFrontRoot));
}
function choose(scene,choice){const save=readSave(),meta=readMeta();resource(save,choice.resources);applyBattle(save,choice.battle);applyRelation(meta,choice.relation);(choice.relations||[]).forEach((change)=>applyRelation(meta,change));for(const [key,value] of Object.entries(choice.traits||{}))meta.traits[key]=(meta.traits[key]||0)+value;if(choice.flag&&!meta.flags.includes(choice.flag))meta.flags.push(choice.flag);meta.completed[scene.id]=choice.id;meta.chronicle.unshift({at:Date.now(),scene:scene.title,choice:choice.label,turn:save?.battle?.turn||null});meta.chronicle=meta.chronicle.slice(0,60);if(save?.battle?.log)save.battle.log.unshift({turn:save.battle.turn,tone:'story',text:`${scene.title} — ${choice.label}`});writeSave(save);writeMeta(meta);closeModal();setTimeout(()=>location.reload(),160);}
function portrait(id){const hero=HEROES[id];return hero?`<svg class="hero-portrait story" viewBox="0 0 180 220" role="img" aria-label="${esc(hero.name)}"></svg>`:'';}
function card(scene){return `<section class="cstory3-card" data-cstory3-card><div>${portrait(scene.speaker)}</div><article><small>${esc(scene.eyebrow)}</small><h3>${esc(scene.title)}</h3><p>${esc(scene.text)}</p><button data-cstory3-open="${scene.id}" type="button">선택 장면 열기 <b>→</b></button></article></section>`;}
function inject(){document.querySelectorAll('[data-cstory3-card]').forEach((node)=>node.remove());if(document.querySelector('.cstory3-modal,.sd2-modal,.v4-event-modal'))return;const scene=nextScene();if(!scene)return;const target=scene.screen==='hub'?document.querySelector('.commercial-growth-section,.facility-section,.hub-screen'):scene.screen==='deployment'?document.querySelector('.deployment-layout,.deployment-screen'):scene.screen==='battle'?document.querySelector('.battle-sidebar,.battlefield-shell'):document.querySelector('.result-grid,.result-screen');if(target)target.insertAdjacentHTML(scene.screen==='battle'?'afterbegin':'afterend',card(scene));}
function openScene(id){if(modalOpen)return;const scene=SCENES.find((entry)=>entry.id===id);if(!scene)return;modalOpen=true;const node=document.createElement('div');node.className='cstory3-modal';node.dataset.sceneId=scene.id;node.innerHTML=`<div class="cstory3-backdrop" data-cstory3-close></div><section><header><div><small>${esc(scene.eyebrow)}</small><b>${esc(scene.title)}</b></div><button data-cstory3-close type="button">×</button></header><main><aside>${portrait(scene.speaker)}<span>${esc(HEROES[scene.speaker]?.name||scene.speaker)}</span></aside><article><p>${esc(scene.text)}</p><div>${scene.choices.map((choice)=>`<button data-cstory3-choice="${choice.id}" type="button"><b>${esc(choice.label)}</b><span>${esc(choice.hint)}</span></button>`).join('')}</div></article></main><footer><span>자원·관계·전투 상태와 다음 분기에 저장됩니다.</span><button data-cstory3-close type="button">나중에 결정</button></footer></section>`;document.body.append(node);requestAnimationFrame(()=>node.classList.add('show'));}
function journal(){if(modalOpen)return;modalOpen=true;const meta=readMeta(),relations=Object.entries(meta.relations).sort((a,b)=>b[1]-a[1]);const node=document.createElement('div');node.className='cstory3-modal journal';node.innerHTML=`<div class="cstory3-backdrop" data-cstory3-close></div><section><header><div><small>RELATIONSHIP CHRONICLE</small><b>장수 관계와 장면 기록</b></div><button data-cstory3-close type="button">×</button></header><main class="journal-main"><section><h3>관계 변화</h3><div class="cstory3-relations">${relations.map(([key,value])=>`<article><span>${key.split(':').map((id)=>HEROES[id]?.name||id).join(' ↔ ')}</span><i><b style="width:${clampRelation(value)}%"></b></i><strong>${value>0?'+':''}${value}</strong></article>`).join('')||'<p>아직 관계 변화가 없습니다.</p>'}</div><h3>분기 표식</h3><div class="cstory3-flags">${meta.flags.map((flag)=>`<span>${esc(flag)}</span>`).join('')||'<i>아직 없습니다.</i>'}</div></section><section><h3>최근 장면</h3><ol>${meta.chronicle.map((entry)=>`<li><small>${entry.turn?`${entry.turn}턴`:'전략 장면'}</small><b>${esc(entry.scene)}</b><p>${esc(entry.choice)}</p></li>`).join('')||'<li><p>기록된 선택이 없습니다.</p></li>'}</ol></section></main><footer><span>${Object.keys(meta.completed).length}/${SCENES.length}개 추가 장면 완료</span><button data-cstory3-close type="button">돌아가기</button></footer></section>`;document.body.append(node);requestAnimationFrame(()=>node.classList.add('show'));}
function clampRelation(value){return Math.max(5,Math.min(100,50+value*10));}
function closeModal(){const node=document.querySelector('.cstory3-modal');if(!node)return;node.classList.remove('show');setTimeout(()=>{node.remove();modalOpen=false;},210);}
function tools(){document.querySelectorAll('.utility-bar:not([data-cstory3-tools])').forEach((bar)=>{bar.dataset.cstory3Tools='1';(bar.lastElementChild||bar).insertAdjacentHTML('afterbegin','<button class="icon-button cstory3-shortcut" data-cstory3-journal aria-label="장수 관계와 장면 기록">傳</button>');});}
function enhance(){queued=false;document.documentElement.classList.add('campaign-story-v3-ready');tools();inject();const meta=readMeta();window.__campaignStoryV3={ready:true,version:VERSION,sceneCount:SCENES.length,completed:Object.keys(meta.completed).length,relationshipCount:Object.keys(meta.relations).length,flags:[...meta.flags]};}
function schedule(){if(queued)return;queued=true;requestAnimationFrame(enhance);}
document.addEventListener('click',(event)=>{const target=event.target instanceof Element?event.target:null;if(!target)return;const opener=target.closest('[data-cstory3-open]');if(opener){event.preventDefault();openScene(opener.dataset.cstory3Open);return;}if(target.closest('[data-cstory3-journal]')){event.preventDefault();journal();return;}const choiceNode=target.closest('[data-cstory3-choice]');if(choiceNode){event.preventDefault();const modal=choiceNode.closest('.cstory3-modal'),scene=SCENES.find((entry)=>entry.id===modal?.dataset.sceneId),choice=scene?.choices.find((entry)=>entry.id===choiceNode.dataset.cstory3Choice);if(scene&&choice)choose(scene,choice);return;}if(target.closest('[data-cstory3-close]')){event.preventDefault();closeModal();}},true);
new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});schedule();
