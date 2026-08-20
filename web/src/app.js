// Created by haodongsheng
const app = document.querySelector('#app');
const SAVE_KEY = 'luanshi-mvp-save-v1';
const RUN_SAVE_KEY = 'luanshi-run-save-v1';
const RUN_SAVE_VERSION = 1;

const heroes = {
  zhangfei: { name: '张飞', mark: '张', maxHp: 750, passive: '狂怒：受到伤害时叠加 1 层，每层武技伤害 +5%。', rage: true, skillIds: ['roar', 'bridge', 'yandang'] },
  zhugeliang: { name: '诸葛亮', mark: '诸', maxHp: 600, passive: '神机：打出计策牌时叠加神机，计策效果逐步增强。', skillIds: ['formation', 'fire', 'foresight'] },
  zhaoyun: { name: '赵云', mark: '赵', maxHp: 680, passive: '龙胆：每打出 3 张牌，自动追加一次 40 点攻击。', skillIds: ['charge', 'rescue', 'seven'] }
};

const cards = {
  spear: { name: '挺矛直刺', cost: 1, type: 'attack', art: '⚔', desc: '造成 55 伤害', effect: s => hit(s, valueFor('spear', 55, 70)) },
  guard: { name: '列阵防御', cost: 1, type: 'skill', art: '🛡', desc: '获得 40 护甲', effect: s => { const n = valueFor('guard', 40, 55); s.player.block += n; log(`列阵防御：获得 ${n} 护甲。`); } },
  train: { name: '厉兵秣马', cost: 1, type: 'skill', art: '卷', desc: '抽 2 张牌', effect: s => { const n = valueFor('train', 2, 3); draw(s, n); log(`厉兵秣马：额外抽取 ${n} 张牌。`); } },
  ration: { name: '干粮', cost: 0, type: 'skill', art: '米', desc: '回复 30 兵力', effect: s => { const amount = valueFor('ration', 30, 45); const n = Math.min(amount, s.player.maxHp - s.player.hp); s.player.hp += n; log(`干粮：回复 ${n} 兵力。`); } },
  sweep: { name: '横扫千军', cost: 2, type: 'attack', art: '戟', desc: '造成 80 伤害', effect: s => hit(s, valueFor('sweep', 80, 105)) },
  roar: { name: '咆哮突进', cost: 1, type: 'attack', art: '怒', desc: '造成 60 伤害，获得 2 层狂怒', effect: s => { hit(s, valueFor('roar', 60, 80)); const n = upgraded('roar') ? 3 : 2; s.player.rage += n; log(`咆哮突进：狂怒 +${n}。`); } },
  bridge: { name: '据水断桥', cost: 2, type: 'skill', art: '桥', desc: '获得 50 护甲；每 3 狂怒额外 +10', effect: s => { const bonus = Math.floor(s.player.rage / 3) * 10; s.player.block += 50 + bonus; log(`据水断桥：获得 ${50 + bonus} 护甲。`); } },
  yandang: { name: '燕人咆哮', cost: 3, type: 'attack', art: '吼', desc: '造成 220 伤害，每层狂怒追加 12', effect: s => { hit(s, 220 + s.player.rage * 12); log(`燕人咆哮：消耗 ${s.player.rage} 层狂怒。`); s.player.rage = 0; } },
  formation: { name: '八阵图', cost: 1, type: 'skill', strategy: true, art: '阵', desc: '获得 30 护甲，神机 +2', effect: s => { s.player.block += 30; s.player.mystery = Math.min(mysteryCap(), s.player.mystery + 2); log('八阵图：神机 +2。'); } },
  fire: { name: '火攻', cost: 2, type: 'attack', strategy: true, art: '火', desc: '造成 80 伤害，附加灼烧', effect: s => { hit(s, 80); s.enemy.burn = (s.enemy.burn || 0) + 2; log('火攻：敌人获得 2 层灼烧。'); } },
  foresight: { name: '神机妙算', cost: 3, type: 'attack', strategy: true, art: '策', desc: '造成 160 伤害，神机越高越强', effect: s => hit(s, 160) },
  charge: { name: '龙胆冲阵', cost: 1, type: 'attack', art: '龙', desc: '造成 50 伤害，抽 1 张牌', effect: s => { hit(s, 50); draw(s, 1); } },
  rescue: { name: '单骑救主', cost: 2, type: 'skill', art: '骑', desc: '获得 60 护甲，本回合免伤一次', effect: s => { s.player.block += 60; s.player.evade = true; log('单骑救主：获得 60 护甲。'); } },
  seven: { name: '七进七出', cost: 3, type: 'attack', art: '七', desc: '连续攻击 4 次，每次 45 伤害', effect: s => { for (let i = 0; i < 4; i++) { if (s.enemy.hp > 0) hit(s, 45); } } }
};

const routeColumns = [
  [{ id: 'battle', label: '遭遇战', mark: '⚔', desc: '熟悉战场，获得牌和铢钱' }],
  [{ id: 'battle', label: '遭遇战', mark: '⚔', desc: '普通敌军，稳定收益' }, { id: 'event', label: '军帐事件', mark: '策', desc: '一次选择，换取代价或收益' }],
  [{ id: 'shop', label: '黑市', mark: '市', desc: '用铢钱购买或删去一张牌' }, { id: 'rest', label: '休整', mark: '息', desc: '回复兵力或升级一张牌' }],
  [{ id: 'elite', label: '精英战', mark: '将', desc: '高风险，额外获得虎符' }],
  [{ id: 'boss', label: 'Boss', mark: '董', desc: '击破董卓亲军，完成本局' }]
];

const relics = {
  sunzi: { name: '《孙子兵法》', mark: '策', desc: '每场战斗第一回合气力 +1' },
  qinggang: { name: '青釭剑', mark: '剑', desc: '每场战斗第一次武技伤害 +10' },
  ration: { name: '行军干粮', mark: '粮', desc: '每场战斗开始回复 20 兵力' }
};
const souls = {
  zhouchang: { name: '周仓', mark: '周', desc: '武技伤害 +5%' },
  xushu: { name: '徐庶', mark: '徐', desc: '计策伤害 +10%' },
  liaohua: { name: '廖化', mark: '廖', desc: '最大兵力 +80' }
};

let state = { screen: 'title', heroId: null, node: 0, meta: loadMeta(), run: null, battle: null, selectedCard: null, reward: null, busy: false };
function loadMeta() { try { return { shards: 0, talisman: 0, talents: { sharpBlade: 0 }, ...JSON.parse(localStorage.getItem(SAVE_KEY)) }; } catch { return { shards: 0, talisman: 0, talents: { sharpBlade: 0 } }; } }
function saveMeta() { localStorage.setItem(SAVE_KEY, JSON.stringify(state.meta)); }
function loadRunSave() { try { const save = JSON.parse(localStorage.getItem(RUN_SAVE_KEY)); return save?.version === RUN_SAVE_VERSION ? save : null; } catch { return null; } }
function saveRun() { if (!state.run || !['map','battle','event','shop','rest'].includes(state.screen)) return; localStorage.setItem(RUN_SAVE_KEY, JSON.stringify({ version: RUN_SAVE_VERSION, screen: state.screen, heroId: state.heroId, node: state.node, run: state.run, battle: state.battle, selectedCard: state.selectedCard, reward: state.reward })); }
function clearRunSave() { localStorage.removeItem(RUN_SAVE_KEY); }
function hasRunSave() { return Boolean(loadRunSave()); }
function continueRun() { const save = loadRunSave(); if (!save) return; state = { ...state, screen: save.screen, heroId: save.heroId, node: save.node, run: save.run, battle: save.battle, selectedCard: save.selectedCard, reward: save.reward }; render(); }
function defaultDeck() { return ['spear','spear','guard','guard','train','ration','sweep', ...heroes[state.heroId].skillIds]; }
function upgraded(id) { return Boolean(state.run?.upgraded?.[id]); }
function valueFor(id, normal, improved) { return upgraded(id) ? improved : normal; }
function hasSoul(id) { return Boolean(state.run?.souls?.includes(id)); }
function activeBonds() { const bonds = []; if (state.heroId === 'zhangfei' && hasSoul('zhouchang')) bonds.push('主仆相随'); if (state.heroId === 'zhugeliang' && hasSoul('xushu')) bonds.push('荐才相知'); return bonds; }
function mysteryCap() { return activeBonds().includes('荐才相知') ? 10 : 8; }
function maxHpForHero() { return heroes[state.heroId].maxHp + (state.meta.talents?.sharpBlade || 0) * 50 + (hasSoul('liaohua') ? 80 : 0); }
function soulDamageBonus(card) { let bonus = 0; if (card?.type === 'attack' && hasSoul('zhouchang')) bonus += 0.05; if (card?.strategy && hasSoul('xushu')) bonus += 0.10; if (state.heroId === 'zhangfei' && activeBonds().includes('主仆相随') && card?.type === 'attack') bonus += 0.10; return bonus; }
function descriptionFor(id) { return upgraded(id) ? ({ spear: '造成 70 伤害', guard: '获得 55 护甲', train: '抽 3 张牌', ration: '回复 45 兵力', sweep: '造成 105 伤害', roar: '造成 80 伤害，狂怒 +3' }[id] || cards[id].desc) : cards[id].desc; }
function log(message) { if (state.battle) state.battle.logs.push(message); }
function freshBattle(enemyIndex = 0) {
  const hero = heroes[state.heroId];
  const deck = state.run.deck;
  const enemyData = [{ name: '黄巾校尉', hp: 260, attack: 35 }, { name: '虎牢守将', hp: 520, attack: 55 }, { name: '董卓亲军', hp: 900, attack: 75 }][enemyIndex];
  const maxHp = maxHpForHero();
  state.battle = { turn: 1, energy: state.run.relics.includes('sunzi') ? 4 : 3, player: { name: hero.name, hp: Math.min(state.run.hp ?? maxHp, maxHp), maxHp, block: 0, rage: 0, mystery: 0, dragon: 0, played: 0, evade: false }, enemy: { ...enemyData, maxHp: enemyData.hp, block: 0, burn: 0, berserk: false }, drawPile: shuffle(deck), hand: [], discard: [], logs: [], enemyIndex, relicTriggered: false };
  draw(state.battle, 5);
  if (state.run.relics.includes('ration')) { state.battle.player.hp = Math.min(maxHp, state.battle.player.hp + 20); log('行军干粮：战斗开始回复 20 兵力。'); }
  log(`第 1 回合：${enemyData.name}正在观察你的阵势。`); log('敌方意图：' + intentText(state.battle));
}
function shuffle(input) { return [...input].sort(() => Math.random() - .5); }
function draw(s, count) { for (let i=0; i<count; i++) { if (!s.drawPile.length) { s.drawPile = shuffle(s.discard); s.discard = []; } if (s.drawPile.length) s.hand.push(s.drawPile.pop()); } }
function hit(s, raw) { const card = cards[state.selectedCard]; const weaponBonus = state.run.relics.includes('qinggang') && card?.type === 'attack' && !s.relicTriggered ? 10 : 0; if (weaponBonus) { s.relicTriggered = true; log('青釭剑：本场第一次武技伤害 +10。'); } const rageBonus = state.heroId === 'zhangfei' ? s.player.rage * 0.05 : 0; const strategyBonus = state.heroId === 'zhugeliang' && card?.strategy ? s.player.mystery * 0.04 : 0; const soulBonus = soulDamageBonus(card); const damage = Math.round((raw + weaponBonus) * (1 + rageBonus + strategyBonus + soulBonus)); const blocked = Math.min(s.enemy.block, damage); s.enemy.block -= blocked; s.enemy.hp = Math.max(0, s.enemy.hp - (damage - blocked)); if (strategyBonus) log(`神机：计策伤害 +${Math.round(strategyBonus * 100)}%。`); if (soulBonus) log(`将魂/羁绊：伤害 +${Math.round(soulBonus * 100)}%。`); log(`${card?.name || '攻击'}造成 ${damage - blocked} 伤害${blocked ? `（被护甲抵消 ${blocked}）` : ''}${upgraded(state.selectedCard) ? '（强化）' : ''}。`); }
function enemyAttack(s) { const eliteBonus = s.enemyIndex === 1 ? Math.floor((s.turn - 1) / 3) * 20 : 0; const bossBonus = s.enemyIndex === 2 && s.enemy.hp <= s.enemy.maxHp * 0.5 ? 1.2 : 1; return Math.round((s.enemy.attack + eliteBonus) * bossBonus); }
function intentText(s) { return s.turn % 2 ? `攻击 ${enemyAttack(s)}` : `获得 20 护甲`; }
function enemyAct(s) { if (s.enemy.burn) { s.enemy.hp = Math.max(0, s.enemy.hp - s.enemy.burn * 12); log(`灼烧造成 ${s.enemy.burn * 12} 伤害。`); s.enemy.burn--; } if (s.enemyIndex === 1 && s.turn > 1 && s.turn % 3 === 0) log('虎牢守将：蓄势完成，攻击强化。'); if (s.enemyIndex === 2 && !s.enemy.berserk && s.enemy.hp <= s.enemy.maxHp * 0.5) { s.enemy.berserk = true; log('董卓亲军进入暴走：攻击 +20%。'); } if (s.turn % 2) { if (s.player.evade) { log('单骑救主抵消了本次攻击。'); s.player.evade = false; } else { const attack = enemyAttack(s); const blocked = Math.min(s.player.block, attack); s.player.block -= blocked; const damage = attack - blocked; s.player.hp -= damage; log(`${s.enemy.name}攻击，造成 ${damage} 伤害。`); if (state.heroId === 'zhangfei' && damage > 0) s.player.rage = Math.min(10, s.player.rage + (s.player.hp < s.player.maxHp * 0.5 ? 2 : 1)); } } else { s.enemy.block += 20; log(`${s.enemy.name}获得 20 护甲。`); } }
function playCard(index) { const s = state.battle; const id = s.hand[index]; const card = cards[id]; if (state.busy || !card || s.energy < card.cost || s.enemy.hp <= 0) return; state.busy = true; document.querySelector(`.hand [data-index="${index}"]`)?.classList.add('is-playing'); window.setTimeout(() => resolvePlayCard(index), 220); }
function resolvePlayCard(index) { const s = state.battle; const id = s.hand[index]; const card = cards[id]; if (!card || s.energy < card.cost || s.enemy.hp <= 0) { state.busy = false; render(); return; } state.selectedCard = id; s.energy -= card.cost; s.hand.splice(index, 1); s.discard.push(id); if (state.heroId === 'zhugeliang' && card.strategy) { s.player.mystery = Math.min(mysteryCap(), s.player.mystery + 1); log(`神机：计策牌触发，当前 ${s.player.mystery}/${mysteryCap()} 层。`); } card.effect(s); s.player.played++; if (state.heroId === 'zhaoyun') { s.player.dragon = (s.player.dragon + 1) % 3; if (s.player.dragon === 0) { hit(s, 40); log('龙胆连击：追加 40 伤害。'); } } if (s.enemy.hp <= 0) { state.reward = { type: s.enemyIndex === 1 ? 'relic' : 'card' }; } state.busy = false; render(); }
function endTurn() { const s = state.battle; if (!s || s.enemy.hp <= 0) return; state.selectedCard = null; s.discard.push(...s.hand); s.hand = []; enemyAct(s); if (s.player.hp <= 0) { clearRunSave(); state.run = null; state.screen = 'result'; state.meta.shards += 12; saveMeta(); render(); return; } if (s.enemy.hp <= 0) { state.reward = { type: s.enemyIndex === 1 ? 'relic' : 'card' }; render(); return; } s.turn++; s.energy = 3; s.player.block = 0; draw(s, 5); log(`第 ${s.turn} 回合开始。敌方意图：${intentText(s)}。`); render(); }
function chooseReward(id) {
  if (id) state.run.deck.push(id);
  state.run.hp = state.battle.player.hp;
  state.run.gold += 25 + state.node * 10;
  state.reward = false;
  if (state.node >= routeColumns.length - 1) {
    state.screen = 'result'; state.meta.shards += 30; state.meta.talisman += 1; saveMeta(); clearRunSave();
  } else { state.node++; state.screen = 'map'; }
  render();
}
function chooseRelic(id) { if (!state.run.relics.includes(id)) state.run.relics.push(id); state.reward = { type: 'card' }; render(); }
function advanceNode() { state.node++; state.screen = state.node >= routeColumns.length ? 'result' : 'map'; if (state.screen === 'result') clearRunSave(); render(); }
function startRun() { clearRunSave(); state.screen = 'heroes'; state.heroId = null; state.node = 0; state.run = null; state.battle = null; state.reward = null; render(); }
function beginBattle(type = 'battle') {
  const enemyIndex = type === 'boss' ? 2 : type === 'elite' ? 1 : 0;
  freshBattle(enemyIndex); state.screen = 'battle'; render();
}
function enterNode(type) {
  if (type === 'battle' || type === 'elite' || type === 'boss') return beginBattle(type);
  state.screen = type; render();
}
function eventChoice(choice) {
  if (choice === 'supplies') { state.run.gold += 55; }
  if (choice === 'recruit') { state.run.deck.push('guard'); state.run.hp = Math.max(1, state.run.hp - 25); }
  if (choice === 'scout') { state.run.deck.push('train'); }
  if (choice === 'soul') obtainSoul();
  advanceNode();
}
function obtainSoul() { const available = Object.keys(souls).filter(id => !state.run.souls.includes(id)); if (state.run.souls.length >= 2 || !available.length) { state.run.gold += 15; return; } state.run.souls.push(available[Math.floor(Math.random() * available.length)]); }
function shopBuy(id, price) { if (state.run.gold < price) return; state.run.gold -= price; state.run.deck.push(id); render(); }
function shopRemove(index) { if (state.run.deck.length <= 8) return; state.run.deck.splice(index, 1); state.run.gold += 10; render(); }
function buyTalent(id) {
  if (id !== 'sharpBlade') return;
  const level = state.meta.talents?.sharpBlade || 0;
  const costs = [40, 80, 140];
  if (level >= 3 || state.meta.shards < costs[level]) return;
  state.meta.shards -= costs[level]; state.meta.talents.sharpBlade = level + 1; saveMeta(); render();
}
function restChoice(choice) {
  if (choice === 'heal') state.run.hp = Math.min(maxHpForHero(), state.run.hp + 70);
  if (choice === 'thin') { const index = state.run.deck.findIndex(id => ['spear','guard','ration'].includes(id)); if (index >= 0) state.run.deck.splice(index, 1); }
  if (choice === 'upgrade') { const id = state.run.deck.find(id => ['spear','guard','train','ration','sweep','roar'].includes(id)); if (id) state.run.upgraded[id] = true; }
  advanceNode();
}
function render() { const handScroll = document.querySelector('.hand')?.scrollLeft || 0; saveRun(); app.innerHTML = state.screen === 'title' ? titleView() : state.screen === 'heroes' ? heroView() : state.screen === 'map' ? mapView() : state.screen === 'battle' ? battleView() : state.screen === 'event' ? eventView() : state.screen === 'shop' ? shopView() : state.screen === 'rest' ? restView() : state.screen === 'camp' ? campView() : resultView(); bind(); const hand = document.querySelector('.hand'); if (hand) hand.scrollLeft = handScroll; }
function shell(content) { return `<div class="game-shell"><div class="screen">${content}</div></div>`; }
function resources() { return `<div class="resources"><span class="resource">兵革残片 ${state.meta.shards}</span><span class="resource">将校虎符 ${state.meta.talisman}</span>${state.run ? `<span class="resource">铢钱 ${state.run.gold}</span>` : ''}</div>`; }
function topbar() { return `<header class="topbar"><div class="brand">乱世行军</div>${resources()}</header>`; }
function titleView() { const saved = hasRunSave(); return shell(`${topbar()}<section class="title"><h1>乱世行军</h1><p>三国 · 肉鸽 · 牌局</p></section><section class="intro-panel"><h2>一局十五分钟的行军</h2><p>选择一名主将，沿着战场路线推进，用每一次出牌决定生死。战败并非终点，带回的兵革残片会留在中军大帐。</p><div class="actions">${saved?'<button class="primary" data-action="continue">继续出征</button>':''}<button class="${saved?'secondary':'primary'}" data-action="start">${saved?'重新开始':'开始出征'}</button><button class="secondary" data-action="camp">中军大帐</button></div>${saved?'<p class="save-hint">已保存未完成的行军，可随时继续。</p>':''}</section>`); }
function heroView() { return shell(`${topbar()}<h2 class="section-title">选择主将</h2><div class="hero-grid">${Object.entries(heroes).map(([id,h]) => `<article class="hero-card ${state.heroId===id?'selected':''}" data-hero="${id}"><div class="hero-mark">${h.mark}</div><div><h3>${h.name}</h3><p>${h.passive}</p></div></article>`).join('')}</div><div class="actions"><button class="primary" data-action="confirm-hero" ${state.heroId?'':'disabled'}>整军出发</button></div>`); }
function mapView() { const options = routeColumns[state.node] || []; return shell(`${topbar()}<section class="map-card"><h2>第一章 · 黄巾乱起</h2><p style="text-align:center;color:#6b5b42">主将：${heroes[state.heroId].name}　·　行军进度 ${state.node}/${routeColumns.length - 1}</p><div class="map-line">${routeColumns.map((column,i)=>`<div class="node ${i<state.node?'done':''} ${i===state.node?'active':''}"><button disabled>${i<state.node?'✓':i===state.node?'⚔':'·'}</button><small>${column[0].label}</small></div>`).join('')}</div><h3 class="route-heading">选择下一处行军节点</h3><div class="route-options">${options.map(option=>`<button class="route-option" data-node-type="${option.id}"><span class="route-mark">${option.mark}</span><span><b>${option.label}</b><small>${option.desc}</small></span><span>›</span></button>`).join('')}</div></section>`); }
function eventView() { return shell(`${topbar()}<section class="map-card node-page"><h2>军帐事件 · 断粮关</h2><p>夜色将深，前方斥候带回三条消息。你要用什么方式处理这场意外？</p><div class="choice-list"><button class="route-option" data-event="supplies"><span class="route-mark">粮</span><span><b>接济难民</b><small>获得 55 铢钱，声望暂且不论。</small></span><span>›</span></button><button class="route-option" data-event="recruit"><span class="route-mark">兵</span><span><b>招募乡勇</b><small>牌组加入列阵防御，但损失 25 兵力。</small></span><span>›</span></button><button class="route-option" data-event="scout"><span class="route-mark">策</span><span><b>派人侦察</b><small>牌组加入厉兵秣马，准备下一场战斗。</small></span><span>›</span></button><button class="route-option" data-event="soul"><span class="route-mark">魂</span><span><b>结识旧部</b><small>获得一枚未拥有将魂；槽位已满时改得 15 铢钱。</small></span><span>›</span></button></div></section>`); }
function shopView() { const offers = [['sweep',45],['train',35],['ration',25]]; const removals = state.run.deck.map((id,i)=>`<button class="remove-card" data-remove-index="${i}" ${state.run.deck.length<=8?'disabled':''}>${cards[id].name} <span>删去 +10</span></button>`).join(''); return shell(`${topbar()}<section class="map-card node-page"><h2>黑市 · 洛阳旧营</h2><p>铢钱：<b>${state.run.gold}</b>　购买一张牌，或花时间精简牌组。</p><div class="shop-grid">${offers.map(([id,price])=>`<button class="shop-offer" data-buy-id="${id}" data-buy-price="${price}"><span class="route-mark">${cards[id].art}</span><b>${cards[id].name}</b><small>${cards[id].desc}</small><em>${price} 铢钱</em></button>`).join('')}</div><h3 class="route-heading">删去一张牌（至少保留 8 张）</h3><div class="remove-list">${removals}</div><div class="actions"><button class="primary" data-action="leave-node">离开黑市</button></div></section>`); }
function restView() { return shell(`${topbar()}<section class="map-card node-page"><h2>休整 · 山中古驿</h2><p>篝火尚暖。你可以恢复兵力，精简牌组，或强化一张核心牌。</p><div class="choice-list"><button class="route-option" data-rest="heal"><span class="route-mark">药</span><span><b>休养生息</b><small>回复 70 兵力，不超过上限。</small></span><span>›</span></button><button class="route-option" data-rest="thin"><span class="route-mark">简</span><span><b>轻装行军</b><small>移除一张基础牌，下一回合更容易抽到核心牌。</small></span><span>›</span></button><button class="route-option" data-rest="upgrade"><span class="route-mark">锻</span><span><b>打磨战法</b><small>强化一张基础牌，本局同名牌都会变强。</small></span><span>›</span></button></div></section>`); }
function campView() { const level = state.meta.talents?.sharpBlade || 0; const costs = [40, 80, 140]; const cost = costs[level]; return shell(`${topbar()}<section class="map-card node-page"><h2>中军大帐 · 韬略阁</h2><p>永久材料会在每次出征后保留。当前锐兵等级：<b>${level}/3</b></p><div class="talent-card"><span class="route-mark">锐</span><div><h3>锐兵</h3><p>所有主将兵力上限与初始兵力 +${level * 50}。</p><small>${level >= 3 ? '已达到最高等级' : `下一等级消耗 ${cost} 兵革残片`}</small></div><button class="primary" data-talent="sharpBlade" ${level >= 3 || state.meta.shards < cost ? 'disabled' : ''}>${level >= 3 ? '已满级' : '升级'}</button></div><div class="actions"><button class="secondary" data-action="back-title">返回</button></div></section>`); }
function cardView(id, index, reward=false) { const c=cards[id]; const mark = upgraded(id) ? ' · 强化' : ''; return `<button class="card ${c.type} ${upgraded(id)?'enhanced':''} ${state.selectedCard===id&&!reward?'selected':''}" style="--deal-index:${index}" data-card="${id}" data-index="${index}"><span class="cost">${c.cost}</span><div class="card-art">${c.art}</div><strong>${c.name}${mark}</strong><small>${descriptionFor(id)}</small></button>`; }
function relicView() { return state.run.relics.map(id=>`<span class="relic-chip" title="${relics[id].desc}">${relics[id].mark} ${relics[id].name}</span>`).join(''); }
function soulView() { return state.run.souls.map(id=>`<span class="soul-chip" title="${souls[id].desc}">${souls[id].mark} ${souls[id].name}</span>`).join(''); }
function battleView() { const s=state.battle, p=s.player, e=s.enemy; const mechanism = state.heroId==='zhangfei' ? `狂怒 ${p.rage}层` : state.heroId==='zhugeliang' ? `神机 ${p.mystery}/${mysteryCap()}层` : `龙胆 ${p.dragon}/3`; return shell(`<div class="battle-screen">${topbar()}<section class="enemy-bar"><div class="avatar">${s.enemyIndex===2?'董':'敌'}</div><div><div class="enemy-name">${e.name}${e.berserk?' · 暴走':''}</div><div class="hp-text">兵力 ${e.hp}/${e.maxHp}</div><div class="bar"><span style="width:${Math.max(0,e.hp/e.maxHp*100)}%"></span></div></div><div class="intent">下回合<br><b>${intentText(s)}</b></div></section><section class="log-panel"><h2>战斗日志</h2>${s.logs.slice(-8).map(x=>`<div class="log-line">${x}</div>`).join('')}</section><section class="player-panel"><div class="avatar">${heroes[state.heroId].mark}</div><div><div class="player-heading"><b>${p.name}</b><span>兵力 ${p.hp}/${p.maxHp}</span></div><div class="bar"><span style="width:${Math.max(0,p.hp/p.maxHp*100)}%"></span></div><div class="stats"><span class="stat">护甲 <b>${p.block}</b></span><span class="stat">气力 <b>${s.energy}/3</b></span><span class="stat">${mechanism}</span></div>${activeBonds().length?`<div class="relic-row"><span class="bond-chip">羁绊：${activeBonds().join('、')}</span></div>`:''}${state.run.souls.length?`<div class="relic-row">${soulView()}</div>`:''}${state.run.relics.length?`<div class="relic-row">${relicView()}</div>`:''}</div></section><section class="hand-area"><div class="hand-title"><span>‹ 手牌 ›</span><span>${s.hand.length} 张</span></div><div class="hand">${s.hand.map((id,i)=>cardView(id,i)).join('')}</div><div class="battle-actions"><span class="turn">第 ${s.turn} 回合 · 点击卡牌查看并打出</span><button class="primary" data-action="end" ${e.hp<=0?'disabled':''}>结束回合</button></div></section></div>${state.reward?rewardModal():''}`); }
function rewardModal() { const cardOptions = ['sweep','train','ration']; if (state.reward.type === 'relic') return `<div class="modal-backdrop"><div class="modal"><h2>精英战胜利 · 选择遗物</h2><p style="text-align:center;color:#6b5b42">遗物会影响本局后续所有战斗。</p><div class="relic-grid">${Object.entries(relics).map(([id,r])=>`<button class="relic-offer" data-relic="${id}"><span class="route-mark">${r.mark}</span><b>${r.name}</b><small>${r.desc}</small></button>`).join('')}</div></div></div>`; return `<div class="modal-backdrop"><div class="modal"><h2>战斗胜利 · 选择战利品</h2><p style="text-align:center;color:#6b5b42">带走一张牌，或空手继续行军。</p><div class="reward-grid">${cardOptions.map((id,i)=>cardView(id,i,true)).join('')}</div><div class="actions"><button class="secondary" data-action="skip-reward">跳过</button></div></div></div>`; }
function resultView() { const win = state.node >= 3; return shell(`${topbar()}<section class="result-card"><h2>${win?'凯旋入帐':'兵败暂退'}</h2><p style="text-align:center;color:#554b3b;line-height:1.8">${win?'你击破了董卓亲军，黄巾军暂退。':'战场风云未定，带回的残片仍能用于下一次整军。'}</p><div class="stats" style="justify-content:center;margin:20px 0"><span class="stat">本局获得兵革残片 <b>${win?'30':'12'}</b></span><span class="stat">永久总计 <b>${state.meta.shards}</b></span></div><div class="actions"><button class="primary" data-action="start">再次出征</button></div></section>`); }
function bind() {
  document.querySelectorAll('[data-action="start"]').forEach(b=>b.onclick=startRun);
  document.querySelector('[data-action="continue"]')?.addEventListener('click',continueRun);
  document.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>{state.heroId=b.dataset.hero;render();});
  document.querySelector('[data-action="confirm-hero"]')?.addEventListener('click',()=>{state.run={deck:defaultDeck(),gold:80,hp:maxHpForHero(),relics:[],souls:[],upgraded:{}};state.screen='map';render();});
  document.querySelector('[data-action="battle"]')?.addEventListener('click',()=>enterNode('battle'));
  document.querySelectorAll('[data-node-type]').forEach(b=>b.onclick=()=>enterNode(b.dataset.nodeType));
  document.querySelector('[data-action="end"]')?.addEventListener('click',endTurn);
  document.querySelector('[data-action="skip-reward"]')?.addEventListener('click',()=>chooseReward(null));
  document.querySelectorAll('[data-card]').forEach(b=>b.onclick=()=>state.reward?chooseReward(b.dataset.card):playCard(Number(b.dataset.index)));
  document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>eventChoice(b.dataset.event));
  document.querySelectorAll('[data-buy-id]').forEach(b=>b.onclick=()=>shopBuy(b.dataset.buyId,Number(b.dataset.buyPrice)));
  document.querySelectorAll('[data-remove-index]').forEach(b=>b.onclick=()=>shopRemove(Number(b.dataset.removeIndex)));
  document.querySelector('[data-action="leave-node"]')?.addEventListener('click',advanceNode);
  document.querySelectorAll('[data-rest]').forEach(b=>b.onclick=()=>restChoice(b.dataset.rest));
  document.querySelectorAll('[data-relic]').forEach(b=>b.onclick=()=>chooseRelic(b.dataset.relic));
  document.querySelector('[data-action="camp"]')?.addEventListener('click',()=>{state.screen='camp';render();});
  document.querySelector('[data-action="back-title"]')?.addEventListener('click',()=>{state.screen='title';render();});
  document.querySelectorAll('[data-talent]').forEach(b=>b.onclick=()=>buyTalent(b.dataset.talent));
}
render();
