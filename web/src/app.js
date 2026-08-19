// Created by haodongsheng
const app = document.querySelector('#app');
const SAVE_KEY = 'luanshi-mvp-save-v1';

const heroes = {
  zhangfei: { name: '张飞', mark: '张', maxHp: 750, passive: '狂怒：受到伤害时叠加 1 层，每层武技伤害 +5%。', rage: true, skillIds: ['roar', 'bridge', 'yandang'] },
  zhugeliang: { name: '诸葛亮', mark: '诸', maxHp: 600, passive: '神机：打出计策牌时叠加神机，计策效果逐步增强。', skillIds: ['formation', 'fire', 'foresight'] },
  zhaoyun: { name: '赵云', mark: '赵', maxHp: 680, passive: '龙胆：每打出 3 张牌，自动追加一次 40 点攻击。', skillIds: ['charge', 'rescue', 'seven'] }
};

const cards = {
  spear: { name: '挺矛直刺', cost: 1, type: 'attack', art: '⚔', desc: '造成 55 伤害', effect: s => hit(s, 55) },
  guard: { name: '列阵防御', cost: 1, type: 'skill', art: '🛡', desc: '获得 40 护甲', effect: s => { s.player.block += 40; log('列阵防御：获得 40 护甲。'); } },
  train: { name: '厉兵秣马', cost: 1, type: 'skill', art: '卷', desc: '抽 2 张牌', effect: s => { draw(s, 2); log('厉兵秣马：额外抽取 2 张牌。'); } },
  ration: { name: '干粮', cost: 0, type: 'skill', art: '米', desc: '回复 30 兵力', effect: s => { const n = Math.min(30, s.player.maxHp - s.player.hp); s.player.hp += n; log(`干粮：回复 ${n} 兵力。`); } },
  sweep: { name: '横扫千军', cost: 2, type: 'attack', art: '戟', desc: '造成 80 伤害', effect: s => hit(s, 80) },
  roar: { name: '咆哮突进', cost: 1, type: 'attack', art: '怒', desc: '造成 60 伤害，获得 2 层狂怒', effect: s => { hit(s, 60); s.player.rage += 2; log('咆哮突进：狂怒 +2。'); } },
  bridge: { name: '据水断桥', cost: 2, type: 'skill', art: '桥', desc: '获得 50 护甲；每 3 狂怒额外 +10', effect: s => { const bonus = Math.floor(s.player.rage / 3) * 10; s.player.block += 50 + bonus; log(`据水断桥：获得 ${50 + bonus} 护甲。`); } },
  yandang: { name: '燕人咆哮', cost: 3, type: 'attack', art: '吼', desc: '造成 220 伤害，每层狂怒追加 12', effect: s => { hit(s, 220 + s.player.rage * 12); log(`燕人咆哮：消耗 ${s.player.rage} 层狂怒。`); s.player.rage = 0; } },
  formation: { name: '八阵图', cost: 1, type: 'skill', art: '阵', desc: '获得 30 护甲，神机 +2', effect: s => { s.player.block += 30; s.player.mystery += 2; log('八阵图：神机 +2。'); } },
  fire: { name: '火攻', cost: 2, type: 'attack', art: '火', desc: '造成 80 伤害，附加灼烧', effect: s => { hit(s, 80); s.enemy.burn = (s.enemy.burn || 0) + 2; log('火攻：敌人获得 2 层灼烧。'); } },
  foresight: { name: '神机妙算', cost: 3, type: 'attack', art: '策', desc: '造成 160 伤害，神机越高越强', effect: s => hit(s, 160 + s.player.mystery * 8) },
  charge: { name: '龙胆冲阵', cost: 1, type: 'attack', art: '龙', desc: '造成 50 伤害，抽 1 张牌', effect: s => { hit(s, 50); draw(s, 1); } },
  rescue: { name: '单骑救主', cost: 2, type: 'skill', art: '骑', desc: '获得 60 护甲，本回合免伤一次', effect: s => { s.player.block += 60; s.player.evade = true; log('单骑救主：获得 60 护甲。'); } },
  seven: { name: '七进七出', cost: 3, type: 'attack', art: '七', desc: '连续攻击 4 次，每次 45 伤害', effect: s => { for (let i = 0; i < 4; i++) { if (s.enemy.hp > 0) hit(s, 45); } } }
};

let state = { screen: 'title', heroId: null, node: 0, meta: loadMeta(), battle: null, selectedCard: null, reward: null };
function loadMeta() { try { return JSON.parse(localStorage.getItem(SAVE_KEY)) || { shards: 0, talisman: 0 }; } catch { return { shards: 0, talisman: 0 }; } }
function saveMeta() { localStorage.setItem(SAVE_KEY, JSON.stringify(state.meta)); }
function log(message) { if (state.battle) state.battle.logs.push(message); }
function freshBattle(enemyIndex = 0) {
  const hero = heroes[state.heroId];
  const deck = ['spear','spear','guard','guard','train','ration','sweep', ...hero.skillIds];
  const enemyData = [{ name: '黄巾校尉', hp: 260, attack: 35 }, { name: '虎牢守将', hp: 520, attack: 55 }, { name: '董卓亲军', hp: 900, attack: 75 }][enemyIndex];
  state.battle = { turn: 1, energy: 3, player: { name: hero.name, hp: hero.maxHp, maxHp: hero.maxHp, block: 0, rage: 0, mystery: 0, played: 0, evade: false }, enemy: { ...enemyData, maxHp: enemyData.hp, block: 0, burn: 0 }, drawPile: shuffle(deck), hand: [], discard: [], logs: [], enemyIndex };
  draw(state.battle, 5); log(`第 1 回合：${enemyData.name}正在观察你的阵势。`); log('敌方意图：' + intentText(state.battle));
}
function shuffle(input) { return [...input].sort(() => Math.random() - .5); }
function draw(s, count) { for (let i=0; i<count; i++) { if (!s.drawPile.length) { s.drawPile = shuffle(s.discard); s.discard = []; } if (s.drawPile.length) s.hand.push(s.drawPile.pop()); } }
function hit(s, raw) { const bonus = state.heroId === 'zhangfei' ? s.player.rage * 0.05 : 0; const damage = Math.round(raw * (1 + bonus)); const blocked = Math.min(s.enemy.block, damage); s.enemy.block -= blocked; s.enemy.hp = Math.max(0, s.enemy.hp - (damage - blocked)); log(`${cards[state.selectedCard]?.name || '攻击'}造成 ${damage - blocked} 伤害${blocked ? `（被护甲抵消 ${blocked}）` : ''}。`); }
function intentText(s) { return s.turn % 2 ? `攻击 ${s.enemy.attack}` : `获得 20 护甲`; }
function enemyAct(s) { if (s.enemy.burn) { s.enemy.hp = Math.max(0, s.enemy.hp - s.enemy.burn * 12); log(`灼烧造成 ${s.enemy.burn * 12} 伤害。`); s.enemy.burn--; } if (s.turn % 2) { if (s.player.evade) { log('单骑救主抵消了本次攻击。'); s.player.evade = false; } else { const blocked = Math.min(s.player.block, s.enemy.attack); s.player.block -= blocked; const damage = s.enemy.attack - blocked; s.player.hp -= damage; log(`${s.enemy.name}攻击，造成 ${damage} 伤害。`); if (state.heroId === 'zhangfei') s.player.rage = Math.min(10, s.player.rage + 1); } } else { s.enemy.block += 20; log(`${s.enemy.name}获得 20 护甲。`); } }
function playCard(index) { const s = state.battle; const id = s.hand[index]; const card = cards[id]; if (!card || s.energy < card.cost || s.enemy.hp <= 0) return; state.selectedCard = id; s.energy -= card.cost; s.hand.splice(index, 1); s.discard.push(id); card.effect(s); s.player.played++; if (state.heroId === 'zhaoyun' && s.player.played % 3 === 0) { hit(s, 40); log('龙胆连击：追加 40 伤害。'); } if (s.enemy.hp <= 0) { state.reward = true; } render(); }
function endTurn() { const s = state.battle; if (!s || s.enemy.hp <= 0) return; state.selectedCard = null; s.discard.push(...s.hand); s.hand = []; enemyAct(s); if (s.player.hp <= 0) { state.screen = 'result'; state.meta.shards += 12; saveMeta(); render(); return; } if (s.enemy.hp <= 0) { state.reward = true; render(); return; } s.turn++; s.energy = 3; s.player.block = 0; draw(s, 5); log(`第 ${s.turn} 回合开始。敌方意图：${intentText(s)}。`); render(); }
function chooseReward(id) { if (id) state.battle.drawPile.push(id); state.reward = false; state.node++; if (state.node >= 3) { state.screen = 'result'; state.meta.shards += 30; state.meta.talisman += 1; saveMeta(); } else { state.screen = 'map'; } render(); }
function startRun() { state.screen = 'heroes'; state.heroId = null; state.node = 0; render(); }
function beginBattle() { freshBattle(state.node); state.screen = 'battle'; render(); }
function render() { app.innerHTML = state.screen === 'title' ? titleView() : state.screen === 'heroes' ? heroView() : state.screen === 'map' ? mapView() : state.screen === 'battle' ? battleView() : resultView(); bind(); }
function shell(content) { return `<div class="game-shell"><div class="screen">${content}</div></div>`; }
function resources() { return `<div class="resources"><span class="resource">兵革残片 ${state.meta.shards}</span><span class="resource">将校虎符 ${state.meta.talisman}</span></div>`; }
function topbar() { return `<header class="topbar"><div class="brand">乱世行军</div>${resources()}</header>`; }
function titleView() { return shell(`${topbar()}<section class="title"><h1>乱世行军</h1><p>三国 · 肉鸽 · 牌局</p></section><section class="intro-panel"><h2>一局十五分钟的行军</h2><p>选择一名主将，沿着战场路线推进，用每一次出牌决定生死。战败并非终点，带回的兵革残片会留在中军大帐。</p><div class="actions"><button class="primary" data-action="start">开始出征</button></div></section>`); }
function heroView() { return shell(`${topbar()}<h2 class="section-title">选择主将</h2><div class="hero-grid">${Object.entries(heroes).map(([id,h]) => `<article class="hero-card ${state.heroId===id?'selected':''}" data-hero="${id}"><div class="hero-mark">${h.mark}</div><div><h3>${h.name}</h3><p>${h.passive}</p></div></article>`).join('')}</div><div class="actions"><button class="primary" data-action="confirm-hero" ${state.heroId?'':'disabled'}>整军出发</button></div>`); }
function mapView() { const names = ['遭遇战','遭遇战','精英战','Boss']; return shell(`${topbar()}<section class="map-card"><h2>第一章 · 黄巾乱起</h2><p style="text-align:center;color:#6b5b42">主将：${heroes[state.heroId].name}　·　当前节点 ${state.node + 1}/3</p><div class="map-line">${names.map((n,i)=>`<div class="node ${i<state.node?'done':''} ${i===state.node?'active':''}"><button data-node="${i}" ${i!==state.node?'disabled':''}>${i<state.node?'✓':'⚔'}</button><small>${n}</small></div>`).join('')}</div><div class="actions"><button class="primary" data-action="battle" ${state.node<3?'':'disabled'}>${state.node===2?'挑战 Boss':'进入战场'}</button></div></section>`); }
function cardView(id, index, reward=false) { const c=cards[id]; return `<button class="card ${c.type} ${state.selectedCard===id&&!reward?'selected':''}" data-card="${id}" data-index="${index}"><span class="cost">${c.cost}</span><div class="card-art">${c.art}</div><strong>${c.name}</strong><small>${c.desc}</small></button>`; }
function battleView() { const s=state.battle, p=s.player, e=s.enemy; return shell(`<div class="battle-screen">${topbar()}<section class="enemy-bar"><div class="avatar">${s.enemyIndex===2?'董':'敌'}</div><div><div class="enemy-name">${e.name}</div><div class="hp-text">兵力 ${e.hp}/${e.maxHp}</div><div class="bar"><span style="width:${Math.max(0,e.hp/e.maxHp*100)}%"></span></div></div><div class="intent">下回合<br><b>${intentText(s)}</b></div></section><section class="log-panel"><h2>战斗日志</h2>${s.logs.slice(-8).map(x=>`<div class="log-line">${x}</div>`).join('')}</section><section class="player-panel"><div class="avatar">${heroes[state.heroId].mark}</div><div><div class="player-heading"><b>${p.name}</b><span>兵力 ${p.hp}/${p.maxHp}</span></div><div class="bar"><span style="width:${Math.max(0,p.hp/p.maxHp*100)}%"></span></div><div class="stats"><span class="stat">护甲 <b>${p.block}</b></span><span class="stat">气力 <b>${s.energy}/3</b></span><span class="stat">${state.heroId==='zhangfei'?'狂怒':'核心'} <b>${state.heroId==='zhangfei'?p.rage:p.mystery}</b></span></div></div></section><section class="hand-area"><div class="hand-title"><span>‹ 手牌 ›</span><span>${s.hand.length} 张</span></div><div class="hand">${s.hand.map((id,i)=>cardView(id,i)).join('')}</div><div class="battle-actions"><span class="turn">第 ${s.turn} 回合 · 点击卡牌查看并打出</span><button class="primary" data-action="end" ${e.hp<=0?'disabled':''}>结束回合</button></div></section></div>${state.reward?rewardModal():''}`); }
function rewardModal() { const options = ['sweep','train','ration']; return `<div class="modal-backdrop"><div class="modal"><h2>战斗胜利 · 选择战利品</h2><p style="text-align:center;color:#6b5b42">带走一张牌，或空手继续行军。</p><div class="reward-grid">${options.map((id,i)=>cardView(id,i,true)).join('')}</div><div class="actions"><button class="secondary" data-action="skip-reward">跳过</button></div></div></div>`; }
function resultView() { const win = state.node >= 3; return shell(`${topbar()}<section class="result-card"><h2>${win?'凯旋入帐':'兵败暂退'}</h2><p style="text-align:center;color:#554b3b;line-height:1.8">${win?'你击破了董卓亲军，黄巾军暂退。':'战场风云未定，带回的残片仍能用于下一次整军。'}</p><div class="stats" style="justify-content:center;margin:20px 0"><span class="stat">本局获得兵革残片 <b>${win?'30':'12'}</b></span><span class="stat">永久总计 <b>${state.meta.shards}</b></span></div><div class="actions"><button class="primary" data-action="start">再次出征</button></div></section>`); }
function bind() { document.querySelectorAll('[data-action="start"]').forEach(b=>b.onclick=startRun); document.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>{state.heroId=b.dataset.hero;render();}); document.querySelector('[data-action="confirm-hero"]')?.addEventListener('click',()=>{state.screen='map';render();}); document.querySelector('[data-action="battle"]')?.addEventListener('click',beginBattle); document.querySelector('[data-action="end"]')?.addEventListener('click',endTurn); document.querySelector('[data-action="skip-reward"]')?.addEventListener('click',()=>chooseReward(null)); document.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>state.reward?chooseReward(b.dataset.card):playCard(Number(b.dataset.index))); }
render();
