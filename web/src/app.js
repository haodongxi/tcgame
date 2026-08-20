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
  spear: { cardId: 'BASE_ATTACK_001', name: '挺矛直刺', cost: 1, type: 'attack', rarity: 'basic', art: '⚔', image: './assets/cards/base/1.png', desc: '造成 40 点武技伤害', effect: s => hit(s, 40) },
  guard: { cardId: 'BASE_DEFEND_001', name: '列阵防御', cost: 1, type: 'skill', rarity: 'basic', art: '🛡', image: './assets/cards/base/2.png', desc: '获得 30 点护甲', effect: s => { s.player.block += 30; log('列阵防御：获得 30 护甲。'); } },
  quick: { cardId: 'BASE_COMMON_001', name: '速攻', cost: 0, type: 'attack', rarity: 'common', art: '⚔', image: './assets/cards/base/3.png', desc: '造成 20 点伤害，抽 1 张牌', effect: s => { hit(s, 20); draw(s, 1); log('速攻：抽 1 张牌。'); } },
  roar: { cardId: 'ZHANGFEI_001', name: '咆哮突进', cost: 1, type: 'attack', rarity: 'basic', art: '怒', image: './assets/cards/zhangfei/1.png', desc: '造成 60 伤害，获得 2 层狂怒', effect: s => { hit(s, 60); addRage(s, 2); log('咆哮突进：狂怒 +2。'); } },
  bridge: { cardId: 'ZHANGFEI_002', name: '据水断桥', cost: 2, type: 'skill', rarity: 'basic', art: '桥', image: './assets/cards/zhangfei/2.png', desc: '获得 50 护甲；消耗 3 层狂怒，每层额外 +10 护甲', effect: s => { const spent = Math.min(3, s.player.rage); s.player.rage -= spent; s.player.block += 50 + spent * 10; log(`据水断桥：获得 ${50 + spent * 10} 护甲。`); } },
  yandang: { cardId: 'ZHANGFEI_003', name: '燕人咆哮', cost: 3, type: 'attack', rarity: 'basic', art: '吼', image: './assets/cards/zhangfei/3.png', desc: '造成 220 伤害，消耗全部狂怒，每层 +12 伤害', effect: s => { const damage = 220 + s.player.rage * 12; hit(s, damage); log(`燕人咆哮：消耗 ${s.player.rage} 层狂怒。`); s.player.rage = 0; } },
  naked: { cardId: 'ZHANGFEI_004', name: '裸衣死战', cost: 1, type: 'attack', rarity: 'common', art: '血', image: './assets/cards/zhangfei/4.png', desc: '失去 50 最大兵力，获得 5 层狂怒，抽 1 张牌', effect: s => { s.player.maxHp = Math.max(1, s.player.maxHp - 50); s.player.hp = Math.min(s.player.hp, s.player.maxHp); addRage(s, 5); draw(s, 1); log('裸衣死战：最大兵力 -50，抽 1 张牌。'); } },
  anger: { cardId: 'ZHANGFEI_005', name: '怒发冲冠', cost: 1, type: 'attack', rarity: 'common', art: '怒', image: './assets/cards/zhangfei/5.png', desc: '获得 3 层狂怒，本回合受到伤害 +10%', effect: s => { addRage(s, 3); s.player.vulnerable = true; log('怒发冲冠：狂怒 +3，本回合承伤提高。'); } },
  bloodDebt: { cardId: 'ZHANGFEI_006', name: '血债血偿', cost: 2, type: 'power', rarity: 'common', art: '血', image: './assets/cards/zhangfei/6.png', desc: '消耗全部狂怒，每层回复 8 兵力', effect: s => { const heal = s.player.rage * 8; s.player.rage = 0; s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal); log(`血债血偿：回复 ${heal} 兵力。`); } },
  peerless: { cardId: 'ZHANGFEI_007', name: '万夫莫当', cost: 2, type: 'attack', rarity: 'rare', art: '将', image: './assets/cards/zhangfei/7.png', desc: '造成 80 伤害；狂怒≥5时附带破甲', effect: s => { hit(s, 80); if (s.player.rage >= 5) s.enemy.armorBreak = 2; log('万夫莫当：满足狂怒条件时附带破甲。'); } },
  earthSmash: { cardId: 'ZHANGFEI_008', name: '裂地猛击', cost: 2, type: 'attack', rarity: 'rare', art: '地', image: './assets/cards/zhangfei/8.png', desc: '造成 90 伤害；狂怒≥7时眩晕 1 回合', effect: s => { hit(s, 90); if (s.player.rage >= 7) s.enemy.stunned = 1; log('裂地猛击：满足狂怒条件时眩晕敌人。'); } },
  frenzySlash: { cardId: 'ZHANGFEI_009', name: '狂刃连斩', cost: 1, type: 'attack', rarity: 'rare', art: '斩', image: './assets/cards/zhangfei/9.png', desc: '消耗 2 层狂怒，连续攻击 3 次，每次 25 伤害', effect: s => { s.player.rage = Math.max(0, s.player.rage - 2); const strikes = s.player.thousandBlades ? 5 : 3; for (let i = 0; i < strikes; i++) if (s.enemy.hp > 0) hit(s, 25); log(`狂刃连斩：攻击 ${strikes} 段。`); } },
  fangFinisher: { cardId: 'ZHANGFEI_010', name: '裂牙补刀', cost: 0, type: 'attack', rarity: 'rare', art: '牙', image: './assets/cards/zhangfei/10.png', desc: '消耗 1 层狂怒，追加 1 次攻击', effect: s => { if (s.player.rage > 0) { s.player.rage--; hit(s, 35); } else log('裂牙补刀：没有狂怒，无法追加攻击。'); } },
  shield: { cardId: 'ZHANGFEI_011', name: '立盾拒敌', cost: 1, type: 'skill', rarity: 'rare', art: '盾', image: './assets/cards/zhangfei/11.png', desc: '获得 25 护甲；本回合受击时额外叠加狂怒', effect: s => { s.player.block += 25; s.player.rageOnHit = true; log('立盾拒敌：获得 25 护甲。'); } },
  counterwall: { cardId: 'ZHANGFEI_012', name: '坚壁反戈', cost: 2, type: 'skill', rarity: 'rare', art: '壁', image: './assets/cards/zhangfei/12.png', desc: '消耗 3 狂怒，获得 40 护甲，本回合受击反弹 30 伤害', effect: s => { const spent = Math.min(3, s.player.rage); s.player.rage -= spent; s.player.block += 40; s.player.reflectDamage = 30; log(`坚壁反戈：获得 40 护甲，消耗 ${spent} 狂怒。`); } },
  bloodRoar: { cardId: 'ZHANGFEI_013', name: '嗜血咆哮', cost: 2, type: 'attack', rarity: 'rare', art: '嗜', image: './assets/cards/zhangfei/13.png', desc: '造成 80 伤害并按伤害吸血', effect: s => { const dealt = hit(s, 80); const heal = Math.round(dealt * (0.2 + s.player.rage * 0.02)); s.player.hp = Math.min(s.player.maxHp, s.player.hp + heal); log(`嗜血咆哮：回复 ${heal} 兵力。`); } },
  bloodRush: { cardId: 'ZHANGFEI_014', name: '狂血奔涌', cost: 1, type: 'power', rarity: 'rare', art: '奔', image: './assets/cards/zhangfei/14.png', desc: '本局兵力低于 50% 时，武技伤害 +10%', effect: s => { s.player.bloodRush = true; log('狂血奔涌：低兵力时获得额外武技伤害。'); } },
  lineage: { cardId: 'ZHANGFEI_015', name: '燕人血脉', cost: 2, type: 'power', rarity: 'legendary', art: '脉', image: './assets/cards/zhangfei/15.png', desc: '本局狂怒上限 15，每层伤害加成提升至 6%', effect: s => { s.player.rageCap = 15; s.player.rageMultiplier = 0.06; log('燕人血脉：狂怒上限提升至 15。'); } },
  thousandBlades: { cardId: 'ZHANGFEI_016', name: '千刃狂潮', cost: 2, type: 'power', rarity: 'legendary', art: '刃', image: './assets/cards/zhangfei/16.png', desc: '本局狂刃连斩攻击段数 +2', effect: s => { s.player.thousandBlades = true; log('千刃狂潮：狂刃连斩强化。'); } },
  onePass: { cardId: 'ZHANGFEI_017', name: '一夫当关', cost: 2, type: 'skill', rarity: 'legendary', art: '关', image: './assets/cards/zhangfei/17.png', desc: '消耗全部狂怒，每层获得 12 护甲，本回合反弹 30% 伤害', effect: s => { const armor = s.player.rage * 12; s.player.rage = 0; s.player.reflectRatio = 0.30; s.player.block += armor; log(`一夫当关：获得 ${armor} 护甲，本回合反弹 30% 伤害。`); } },
  berserk: { cardId: 'ZHANGFEI_018', name: '浴血疯魔', cost: 2, type: 'power', rarity: 'legendary', art: '魔', image: './assets/cards/zhangfei/18.png', desc: '本局兵力低于 50% 时，所有攻击 100% 吸血', effect: s => { s.player.berserk = true; log('浴血疯魔：低兵力时攻击获得强力吸血。'); } },
  train: { name: '厉兵秣马', cost: 1, type: 'skill', art: '卷', desc: '抽 2 张牌', effect: s => { draw(s, 2); log('厉兵秣马：额外抽取 2 张牌。'); } },
  ration: { name: '干粮', cost: 0, type: 'skill', art: '米', desc: '回复 30 兵力', effect: s => { const n = Math.min(30, s.player.maxHp - s.player.hp); s.player.hp += n; log(`干粮：回复 ${n} 兵力。`); } },
  sweep: { name: '横扫千军', cost: 2, type: 'attack', art: '戟', desc: '造成 80 伤害', effect: s => hit(s, 80) },
  formation: { name: '八阵图', cost: 1, type: 'skill', strategy: true, art: '阵', desc: '获得 30 护甲，神机 +2', effect: s => { s.player.block += 30; s.player.mystery = Math.min(mysteryCap(), s.player.mystery + 2); log('八阵图：神机 +2。'); } },
  fire: { name: '火攻', cost: 2, type: 'attack', strategy: true, art: '火', desc: '造成 80 伤害，附加灼烧', effect: s => { hit(s, 80); s.enemy.burn = (s.enemy.burn || 0) + 2; log('火攻：敌人获得 2 层灼烧。'); } },
  foresight: { name: '神机妙算', cost: 3, type: 'attack', strategy: true, art: '策', desc: '造成 160 伤害，神机越高越强', effect: s => hit(s, 160) },
  charge: { name: '龙胆冲阵', cost: 1, type: 'attack', art: '龙', desc: '造成 50 伤害，抽 1 张牌', effect: s => { hit(s, 50); draw(s, 1); } },
  rescue: { name: '单骑救主', cost: 2, type: 'skill', art: '骑', desc: '获得 60 护甲，本回合免伤一次', effect: s => { s.player.block += 60; s.player.evade = true; log('单骑救主：获得 60 护甲。'); } },
  seven: { name: '七进七出', cost: 3, type: 'attack', art: '七', desc: '连续攻击 4 次，每次 45 伤害', effect: s => { for (let i = 0; i < 4; i++) if (s.enemy.hp > 0) hit(s, 45); } }
};

const chapterRoutes = [
  { id: 'zhujun', name: '第一章 · 涿郡平乱', layers: 15, theme: '黄巾贼寇' },
  { id: 'hulao', name: '第二章 · 虎牢鏖兵', layers: 17, theme: '西凉军' },
  { id: 'xuzhou', name: '第三章 · 徐州争锋', layers: 19, theme: '曹军与陷阵营' }
];
const routeColumns = [
  [{ id: 'battle', label: '遭遇战', mark: '⚔', desc: '黄巾小队，胜利后获得三选一牌奖励' }],
  [{ id: 'battle', label: '遭遇战', mark: '⚔', desc: '普通战斗，积累基础构筑' }, { id: 'event', label: '隐士指路', mark: '策', desc: '随机获得升级或承担代价' }],
  [{ id: 'battle', label: '遭遇战', mark: '⚔', desc: '战斗密集路线，适合补齐专属牌' }, { id: 'rest', label: '中军帐', mark: '息', desc: '回复兵力或升级一张牌' }],
  [{ id: 'shop', label: '军械铺', mark: '市', desc: '购买卡牌、升级或删除一张废牌' }, { id: 'battle', label: '遭遇战', mark: '⚔', desc: '继续强化牌组' }],
  [{ id: 'battle', label: '遭遇战', mark: '⚔', desc: '黄巾弓手与刀盾手' }, { id: 'event', label: '流民投奔', mark: '民', desc: '金币与累赘牌之间做选择' }],
  [{ id: 'rest', label: '裁汰营', mark: '删', desc: '免费删除一张基础牌' }, { id: 'battle', label: '遭遇战', mark: '⚔', desc: '战斗换取牌组成长' }],
  [{ id: 'battle', label: '遭遇战', mark: '⚔', desc: '山贼头目与喽啰' }],
  [{ id: 'shop', label: '军械铺', mark: '市', desc: '基础牌 50 金，速攻 75 金' }, { id: 'rest', label: '中军帐', mark: '息', desc: '回复 30% 最大兵力或升级' }],
  [{ id: 'elite', label: '精英敌将', mark: '将', desc: '高风险战斗，保证稀有牌奖励' }],
  [{ id: 'event', label: '粮道遭遇', mark: '粮', desc: '劫粮得金或进入强制战斗' }, { id: 'battle', label: '遭遇战', mark: '⚔', desc: '为 Boss 做最后准备' }],
  [{ id: 'rest', label: '裁汰营', mark: '删', desc: '免费删除一张基础牌' }, { id: 'battle', label: '遭遇战', mark: '⚔', desc: '路线汇合层' }],
  [{ id: 'battle', label: '遭遇战', mark: '⚔', desc: '黄巾术士与信徒' }],
  [{ id: 'shop', label: '军械铺', mark: '市', desc: '为章节 Boss 调整牌组' }, { id: 'rest', label: '中军帐', mark: '息', desc: '回复或升级核心牌' }],
  [{ id: 'elite', label: '精英敌将', mark: '将', desc: '击败程远志或周仓，获得稀有牌' }],
  [{ id: 'boss', label: '章节 Boss', mark: '城', desc: '地公将军张宝，胜利后进入下一章' }]
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

let state = { screen: 'title', heroId: null, node: 0, meta: loadMeta(), run: null, battle: null, selectedCard: null, selectedIndex: null, reward: null, busy: false, animateDeal: false };
function loadMeta() { try { return { shards: 0, talisman: 0, talents: { sharpBlade: 0 }, ...JSON.parse(localStorage.getItem(SAVE_KEY)) }; } catch { return { shards: 0, talisman: 0, talents: { sharpBlade: 0 } }; } }
function saveMeta() { localStorage.setItem(SAVE_KEY, JSON.stringify(state.meta)); }
function loadRunSave() { try { const save = JSON.parse(localStorage.getItem(RUN_SAVE_KEY)); return save?.version === RUN_SAVE_VERSION ? save : null; } catch { return null; } }
function saveRun() { if (!state.run || !['map','battle','event','shop','rest'].includes(state.screen)) return; localStorage.setItem(RUN_SAVE_KEY, JSON.stringify({ version: RUN_SAVE_VERSION, screen: state.screen, heroId: state.heroId, node: state.node, run: state.run, battle: state.battle, selectedCard: state.selectedCard, reward: state.reward })); }
function clearRunSave() { localStorage.removeItem(RUN_SAVE_KEY); }
function hasRunSave() { return Boolean(loadRunSave()); }
function normalizeBattle(battle) { if (!battle) return battle; if (!battle.enemies) battle.enemies = [battle.enemy]; battle.targetIndex = Math.max(0, Math.min(battle.targetIndex ?? 0, battle.enemies.length - 1)); battle.enemy = battle.enemies[battle.targetIndex] || battle.enemies[0]; return battle; }
function continueRun() { const save = loadRunSave(); if (!save) return; state = { ...state, screen: save.screen, heroId: save.heroId, node: save.node, run: save.run, battle: normalizeBattle(save.battle), selectedCard: save.selectedCard, selectedIndex: null, reward: save.reward }; render(); }
function defaultDeck() { if (state.heroId === 'zhangfei') return ['spear','spear','spear','spear','spear','guard','guard','guard','guard','yandang']; return ['spear','spear','guard','guard','train','ration','sweep', ...heroes[state.heroId].skillIds]; }
function upgraded(id) { return Boolean(state.run?.upgraded?.[id]); }
function valueFor(id, normal, improved) { return upgraded(id) ? improved : normal; }
function hasSoul(id) { return Boolean(state.run?.souls?.includes(id)); }
function activeBonds() { const bonds = []; if (state.heroId === 'zhangfei' && hasSoul('zhouchang')) bonds.push('主仆相随'); if (state.heroId === 'zhugeliang' && hasSoul('xushu')) bonds.push('荐才相知'); return bonds; }
function mysteryCap() { return activeBonds().includes('荐才相知') ? 10 : 8; }
function maxHpForHero() { return heroes[state.heroId].maxHp + (state.meta.talents?.sharpBlade || 0) * 50 + (hasSoul('liaohua') ? 80 : 0); }
function soulDamageBonus(card) { let bonus = 0; if (card?.type === 'attack' && hasSoul('zhouchang')) bonus += 0.05; if (card?.strategy && hasSoul('xushu')) bonus += 0.10; if (state.heroId === 'zhangfei' && activeBonds().includes('主仆相随') && card?.type === 'attack') bonus += 0.10; return bonus; }
function addRage(s, amount) { s.player.rage = Math.min(s.player.rageCap || 10, s.player.rage + amount); }
function log(message) { if (state.battle) state.battle.logs.push(message); }
const enemyGroups = {
  normal: [
    [{ name: '黄巾小卒', hp: 80, attack: 25 }, { name: '黄巾小卒', hp: 80, attack: 25 }],
    [{ name: '黄巾弓手', hp: 60, attack: 20 }, { name: '黄巾弓手', hp: 60, attack: 20 }, { name: '黄巾刀盾手', hp: 120, attack: 15, blockGain: 15 }],
    [{ name: '山贼头目', hp: 150, attack: 35 }, { name: '山贼喽啰', hp: 50, attack: 20 }, { name: '山贼喽啰', hp: 50, attack: 20 }],
    [{ name: '黄巾术士', hp: 90, attack: 20, healer: true }, { name: '黄巾信徒', hp: 70, attack: 20 }, { name: '黄巾信徒', hp: 70, attack: 20 }]
  ],
  elite: [
    [{ name: '黄巾渠帅·程远志', hp: 400, attack: 35, summon: true }, { name: '黄巾亲兵', hp: 80, attack: 20 }, { name: '黄巾亲兵', hp: 80, attack: 20 }],
    [{ name: '贼首·周仓', hp: 450, attack: 40, berserker: true }, { name: '山匪刀手', hp: 90, attack: 25 }, { name: '山匪刀手', hp: 90, attack: 25 }]
  ],
  boss: [[{ name: '地公将军·张宝', hp: 800, attack: 55, boss: true }, { name: '黄巾符使', hp: 200, attack: 25, blockGain: 10 }, { name: '黄巾符使', hp: 200, attack: 25, blockGain: 10 }]]
};
function cloneEnemy(enemy) { return { ...enemy, maxHp: enemy.hp, block: 0, burn: 0, berserk: false, stunned: 0 }; }
function enemyGroupFor(index) { const pool = index === 2 ? enemyGroups.boss : index === 1 ? enemyGroups.elite : enemyGroups.normal; return pool[Math.floor(Math.random() * pool.length)].map(cloneEnemy); }
function syncTarget(s, index = s.targetIndex) { const next = s.enemies.findIndex((enemy, i) => enemy.hp > 0 && i === index); const fallback = next >= 0 ? next : s.enemies.findIndex(enemy => enemy.hp > 0); s.targetIndex = fallback >= 0 ? fallback : 0; s.enemy = s.enemies[s.targetIndex]; return s.enemy; }
function freshBattle(enemyIndex = 0) {
  const hero = heroes[state.heroId];
  const deck = state.run.deck;
  const enemies = enemyGroupFor(enemyIndex);
  const maxHp = maxHpForHero();
  state.battle = { turn: 1, energy: state.run.relics.includes('sunzi') ? 4 : 3, player: { name: hero.name, hp: Math.min(state.run.hp ?? maxHp, maxHp), maxHp, block: 0, rage: 0, rageCap: 10, rageMultiplier: 0.05, mystery: 0, dragon: 0, played: 0, attackCardsPlayed: 0, evade: false }, enemies, targetIndex: 0, enemy: enemies[0], drawPile: shuffle(deck), hand: [], discard: [], logs: [], enemyIndex, relicTriggered: false };
  draw(state.battle, 5);
  state.animateDeal = true;
  if (state.run.relics.includes('ration')) { state.battle.player.hp = Math.min(maxHp, state.battle.player.hp + 20); log('行军干粮：战斗开始回复 20 兵力。'); }
  log(`第 1 回合：${enemies.map(enemy => enemy.name).join('、')}正在观察你的阵势。`); log('敌方意图：' + intentText(state.battle));
}
function shuffle(input) { return [...input].sort(() => Math.random() - .5); }
function draw(s, count) { for (let i=0; i<count; i++) { if (!s.drawPile.length) { s.drawPile = shuffle(s.discard); s.discard = []; } if (s.drawPile.length) s.hand.push(s.drawPile.pop()); } }
function hit(s, raw) { const card = cards[state.selectedCard]; const weaponBonus = state.run.relics.includes('qinggang') && card?.type === 'attack' && !s.relicTriggered ? 10 : 0; if (weaponBonus) { s.relicTriggered = true; log('青釭剑：本场第一次武技伤害 +10。'); } const rageBonus = state.heroId === 'zhangfei' ? s.player.rage * (s.player.rageMultiplier || 0.05) : 0; const lowHealthBonus = state.heroId === 'zhangfei' && s.player.bloodRush && s.player.hp < s.player.maxHp * 0.5 ? 0.10 : 0; const strategyBonus = state.heroId === 'zhugeliang' && card?.strategy ? s.player.mystery * 0.04 : 0; const soulBonus = soulDamageBonus(card); const damage = Math.round((raw + weaponBonus) * (1 + rageBonus + lowHealthBonus + strategyBonus + soulBonus)); const ignoresBlock = s.enemy.armorBreak > 0; const blocked = ignoresBlock ? 0 : Math.min(s.enemy.block, damage); s.enemy.block -= blocked; const dealt = damage - blocked; s.enemy.hp = Math.max(0, s.enemy.hp - dealt); if (s.enemy.armorBreak) s.enemy.armorBreak--; if (state.heroId === 'zhangfei' && s.player.berserk && s.player.hp < s.player.maxHp * 0.5) { const heal = Math.min(s.player.maxHp - s.player.hp, dealt); s.player.hp += heal; if (heal) log(`浴血疯魔：回复 ${heal} 兵力。`); } if (strategyBonus) log(`神机：计策伤害 +${Math.round(strategyBonus * 100)}%。`); if (soulBonus) log(`将魂/羁绊：伤害 +${Math.round(soulBonus * 100)}%。`); log(`${card?.name || '攻击'}造成 ${dealt} 伤害${blocked ? `（被护甲抵消 ${blocked}）` : ignoresBlock ? '（破甲）' : ''}${upgraded(state.selectedCard) ? '（强化）' : ''}。`); return dealt; }
function enemyAttack(s, enemy = s.enemy) { const eliteBonus = s.enemyIndex === 1 ? Math.floor((s.turn - 1) / 3) * 20 : 0; const bossBonus = s.enemyIndex === 2 && enemy.hp <= enemy.maxHp * 0.5 ? 1.2 : 1; return Math.round((enemy.attack + eliteBonus) * bossBonus); }
function intentText(s) { const alive = s.enemies?.filter(enemy => enemy.hp > 0) || [s.enemy]; return s.turn % 2 ? `合计攻击 ${alive.reduce((sum, enemy) => sum + enemyAttack(s, enemy), 0)}` : `存活敌人获得护甲`; }
function enemyAct(s) { const alive = (s.enemies || [s.enemy]).filter(enemy => enemy.hp > 0); for (const enemy of alive) { s.enemy = enemy; if (enemy.burn) { enemy.hp = Math.max(0, enemy.hp - enemy.burn * 12); log(`${enemy.name}受到灼烧 ${enemy.burn * 12} 伤害。`); enemy.burn--; } if (enemy.stunned > 0) { log(`${enemy.name}被眩晕，无法行动。`); enemy.stunned--; continue; } if (s.enemyIndex === 1 && s.turn > 1 && s.turn % 3 === 0) log(`${enemy.name}：蓄势完成。`); if (s.enemyIndex === 2 && !enemy.berserk && enemy.hp <= enemy.maxHp * 0.5) { enemy.berserk = true; log(`${enemy.name}进入暴走。`); } if (enemy.hp <= 0) continue; if (s.turn % 2) { if (s.player.evade) { log('单骑救主抵消了本次攻击。'); s.player.evade = false; } else { const attack = enemyAttack(s, enemy) * (s.player.vulnerable ? 1.1 : 1); const blocked = Math.min(s.player.block, attack); s.player.block -= blocked; const damage = Math.round(attack - blocked); s.player.hp -= damage; log(`${enemy.name}攻击，造成 ${damage} 伤害。`); if (damage > 0 && s.player.reflectDamage) { const reflected = Math.min(s.player.reflectDamage, enemy.hp); enemy.hp -= reflected; log(`坚壁反戈：反弹 ${reflected} 伤害。`); } if (damage > 0 && s.player.reflectRatio) { const reflected = Math.min(Math.round(damage * s.player.reflectRatio), enemy.hp); enemy.hp -= reflected; log(`一夫当关：反弹 ${reflected} 伤害。`); } if (state.heroId === 'zhangfei' && damage > 0) { addRage(s, s.player.hp < s.player.maxHp * 0.5 ? 2 : 1); if (s.player.rageOnHit) addRage(s, 1); } } } else { enemy.block += enemy.blockGain || 20; log(`${enemy.name}获得 ${enemy.blockGain || 20} 护甲。`); } } s.player.rageOnHit = false; s.player.reflectDamage = 0; s.player.reflectRatio = 0; s.player.vulnerable = false; syncTarget(s); }
function refreshSelectionVisuals() { document.querySelectorAll('.hand .card').forEach((card, index) => card.classList.toggle('selected', index === state.selectedIndex)); document.querySelector('.hand')?.classList.toggle('has-selection', state.selectedIndex !== null); document.querySelectorAll('[data-target-index]').forEach(target => { target.classList.toggle('selected-target', Number(target.dataset.targetIndex) === state.battle?.targetIndex); target.classList.toggle('is-target', state.selectedIndex !== null && Number(target.dataset.targetIndex) === state.battle?.targetIndex); }); }
function cancelSelection() { if (state.selectedIndex === null) return; state.selectedCard = null; state.selectedIndex = null; refreshSelectionVisuals(); }
function playCard(index) { const s = state.battle; const id = s.hand[index]; const card = cards[id]; if (state.busy || !card || s.energy < card.cost || s.enemy.hp <= 0) return; if (state.selectedIndex === index) return cancelSelection(); state.selectedCard = id; state.selectedIndex = index; refreshSelectionVisuals(); }
function selectTarget(index) { const s = state.battle; if (!s?.enemies?.[index] || s.enemies[index].hp <= 0) return; s.targetIndex = index; s.enemy = s.enemies[index]; refreshSelectionVisuals(); }
function handleTargetClick(index, event) { event.stopPropagation(); selectTarget(index); if (state.selectedIndex !== null) confirmTarget(); }
function confirmTarget() { if (state.selectedIndex === null || state.busy) return; const index = state.selectedIndex; state.busy = true; document.querySelector(`.hand [data-index="${index}"]`)?.classList.add('is-playing'); window.setTimeout(() => resolvePlayCard(index), 220); }
function resolvePlayCard(index) { const s = state.battle; const id = s.hand[index]; const card = cards[id]; if (!card || s.energy < card.cost || s.enemy.hp <= 0) { state.busy = false; cancelSelection(); refreshBattleParts(); return; } s.energy -= card.cost; s.hand.splice(index, 1); s.discard.push(id); if (state.heroId === 'zhugeliang' && card.strategy) { s.player.mystery = Math.min(mysteryCap(), s.player.mystery + 1); log(`神机：计策牌触发，当前 ${s.player.mystery}/${mysteryCap()} 层。`); } card.effect(s); s.player.played++; if (card.type === 'attack') { s.player.attackCardsPlayed++; const threshold = s.player.thousandBlades ? 2 : 3; if (s.player.attackCardsPlayed >= threshold && !s.hand.includes('fangFinisher')) { s.player.attackCardsPlayed = 0; s.hand.push('fangFinisher'); log('裂牙补刀：攻击牌连段完成，生成 1 张裂牙补刀。'); } } if (state.heroId === 'zhaoyun') { s.player.dragon = (s.player.dragon + 1) % 3; if (s.player.dragon === 0) { hit(s, 40); log('龙胆连击：追加 40 伤害。'); } } if (s.enemy.hp <= 0) { log(`${s.enemy.name}已被击破。`); syncTarget(s); } if (!s.enemies.some(enemy => enemy.hp > 0)) state.reward = { type: s.enemyIndex === 1 ? 'relic' : 'card' }; state.busy = false; state.selectedCard = null; state.selectedIndex = null; state.animateDeal = false; state.reward ? render() : refreshBattleParts({ keepHand: true, removedIndex: index }); }
function endTurn() { const s = state.battle; if (!s || !s.enemies.some(enemy => enemy.hp > 0)) return; state.selectedCard = null; state.selectedIndex = null; s.discard.push(...s.hand); s.hand = []; enemyAct(s); if (s.player.hp <= 0) { clearRunSave(); state.run = null; state.screen = 'result'; state.meta.shards += 12; saveMeta(); render(); return; } if (!s.enemies.some(enemy => enemy.hp > 0)) { state.reward = { type: s.enemyIndex === 1 ? 'relic' : 'card' }; render(); return; } s.turn++; s.energy = 3; s.player.block = 0; draw(s, 5); log(`第 ${s.turn} 回合开始。敌方意图：${intentText(s)}。`); state.animateDeal = true; refreshBattleParts(); }
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
  if (choice === 'scout') { state.run.deck.push('quick'); }
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
  if (choice === 'thin') { const index = state.run.deck.findIndex(id => ['spear','guard'].includes(id)); if (index >= 0) state.run.deck.splice(index, 1); }
  if (choice === 'upgrade') { const id = state.run.deck.find(id => ['spear','guard','quick','roar','bridge','yandang'].includes(id)); if (id) state.run.upgraded[id] = true; }
  advanceNode();
}
function render() { const handScroll = document.querySelector('.hand')?.scrollLeft || 0; saveRun(); app.innerHTML = state.screen === 'title' ? titleView() : state.screen === 'heroes' ? heroView() : state.screen === 'map' ? mapView() : state.screen === 'battle' ? battleView() : state.screen === 'event' ? eventView() : state.screen === 'shop' ? shopView() : state.screen === 'rest' ? restView() : state.screen === 'camp' ? campView() : resultView(); bind(); const hand = document.querySelector('.hand'); if (hand) hand.scrollLeft = handScroll; if (state.screen === 'battle') scrollBattleLogToBottom(); state.animateDeal = false; }
function scrollBattleLogToBottom() {
  const logPanel = document.querySelector('#battle-log');
  if (logPanel) logPanel.scrollTop = logPanel.scrollHeight;
}
function refreshBattleParts({ keepHand = false, removedIndex = -1 } = {}) {
  if (state.screen !== 'battle') return render();
  const current = document.querySelector('.battle-screen');
  if (!current) return render();
  const hand = current.querySelector('.hand');
  const handScroll = hand?.scrollLeft || 0;
  const staging = document.createElement('div');
  staging.innerHTML = battleView();
  const next = staging.querySelector('.battle-screen');
  ['enemy-panel', 'battle-log', 'player-panel'].forEach(id => {
    const currentPanel = current.querySelector(`#${id}`);
    const nextPanel = next.querySelector(`#${id}`);
    if (currentPanel && nextPanel) currentPanel.innerHTML = nextPanel.innerHTML;
  });
  const currentHandPanel = current.querySelector('#hand-panel');
  const nextHandPanel = next.querySelector('#hand-panel');
  if (!keepHand && currentHandPanel && nextHandPanel) currentHandPanel.innerHTML = nextHandPanel.innerHTML;
  if (keepHand && hand) {
    hand.querySelector(`[data-index="${removedIndex}"]`)?.remove();
    hand.querySelectorAll('[data-index]').forEach((card, index) => { card.dataset.index = index; });
    const missing = state.battle.hand.length - hand.children.length;
    if (missing > 0) {
      const start = state.battle.hand.length - missing;
      hand.insertAdjacentHTML('beforeend', state.battle.hand.slice(start).map((id, index) => cardView(id, start + index)).join(''));
    }
    currentHandPanel.querySelector('.hand-title span:last-child').textContent = `${state.battle.hand.length} 张`;
  }
  const nextHand = document.querySelector('.hand');
  if (nextHand) nextHand.scrollLeft = handScroll;
  bind();
  scrollBattleLogToBottom();
  saveRun();
  state.animateDeal = false;
}
function shell(content) { return `<div class="game-shell"><div class="screen">${content}</div></div>`; }
function resources() { return `<div class="resources"><span class="resource">兵革残片 ${state.meta.shards}</span><span class="resource">将校虎符 ${state.meta.talisman}</span>${state.run ? `<span class="resource">铢钱 ${state.run.gold}</span>` : ''}</div>`; }
function topbar() { return `<header class="topbar"><div class="brand">乱世行军</div>${resources()}</header>`; }
function titleView() { const saved = hasRunSave(); return shell(`${topbar()}<section class="title"><h1>乱世行军</h1><p>三国 · 肉鸽 · 牌局</p></section><section class="intro-panel"><h2>一局十五分钟的行军</h2><p>选择一名主将，沿着战场路线推进，用每一次出牌决定生死。战败并非终点，带回的兵革残片会留在中军大帐。</p><div class="actions">${saved?'<button class="primary" data-action="continue">继续出征</button>':''}<button class="${saved?'secondary':'primary'}" data-action="start">${saved?'重新开始':'开始出征'}</button><button class="secondary" data-action="camp">中军大帐</button></div>${saved?'<p class="save-hint">已保存未完成的行军，可随时继续。</p>':''}</section>`); }
function heroView() { return shell(`${topbar()}<h2 class="section-title">选择主将</h2><div class="hero-grid">${Object.entries(heroes).map(([id,h]) => `<article class="hero-card ${state.heroId===id?'selected':''}" data-hero="${id}"><div class="hero-mark">${h.mark}</div><div><h3>${h.name}</h3><p>${h.passive}</p></div></article>`).join('')}</div><div class="actions"><button class="primary" data-action="confirm-hero" ${state.heroId?'':'disabled'}>整军出发</button></div>`); }
function mapView() { const options = routeColumns[state.node] || []; const start = Math.max(0, Math.min(state.node - 2, routeColumns.length - 5)); const visible = routeColumns.slice(start, start + 5); return shell(`${topbar()}<section class="map-card"><h2>${chapterRoutes[0].name}</h2><p style="text-align:center;color:#6b5b42">主将：${heroes[state.heroId].name}　·　行军进度 ${state.node}/${routeColumns.length - 1}　·　主题：${chapterRoutes[0].theme}</p><div class="map-line">${visible.map((column,i)=>{const index=start+i;return `<div class="node ${index<state.node?'done':''} ${index===state.node?'active':''}"><button disabled>${index<state.node?'✓':index===state.node?'⚔':'·'}</button><small>${column[0].label}</small></div>`;}).join('')}</div><h3 class="route-heading">选择下一处行军节点</h3><div class="route-options">${options.map(option=>`<button class="route-option" data-node-type="${option.id}"><span class="route-mark">${option.mark}</span><span><b>${option.label}</b><small>${option.desc}</small></span><span>›</span></button>`).join('')}</div></section>`); }
function eventView() { return shell(`${topbar()}<section class="map-card node-page"><h2>军帐事件 · 断粮关</h2><p>夜色将深，前方斥候带回三条消息。你要用什么方式处理这场意外？</p><div class="choice-list"><button class="route-option" data-event="supplies"><span class="route-mark">粮</span><span><b>接济难民</b><small>获得 55 铢钱，声望暂且不论。</small></span><span>›</span></button><button class="route-option" data-event="recruit"><span class="route-mark">兵</span><span><b>招募乡勇</b><small>牌组加入列阵防御，但损失 25 兵力。</small></span><span>›</span></button><button class="route-option" data-event="scout"><span class="route-mark">策</span><span><b>派人侦察</b><small>牌组加入厉兵秣马，准备下一场战斗。</small></span><span>›</span></button><button class="route-option" data-event="soul"><span class="route-mark">魂</span><span><b>结识旧部</b><small>获得一枚未拥有将魂；槽位已满时改得 15 铢钱。</small></span><span>›</span></button></div></section>`); }
function shopView() { const offers = [['spear',50],['quick',75],['roar',60],['bridge',80]]; const removals = state.run.deck.map((id,i)=>`<button class="remove-card" data-remove-index="${i}" ${state.run.deck.length<=8?'disabled':''}>${cards[id].name} <span>删去 +10</span></button>`).join(''); return shell(`${topbar()}<section class="map-card node-page"><h2>军械铺 · 洛阳旧营</h2><p>铢钱：<b>${state.run.gold}</b>　基础牌 50 金，速攻 75 金；也可删除一张牌。</p><div class="shop-grid">${offers.map(([id,price])=>`<button class="shop-offer" data-buy-id="${id}" data-buy-price="${price}"><span class="route-mark">${cards[id].art}</span><b>${cards[id].name}</b><small>${cards[id].rarity === 'basic' ? '基础牌' : '张飞专属牌'}</small><em>${price} 铢钱</em></button>`).join('')}</div><h3 class="route-heading">裁汰一张牌（至少保留 8 张）</h3><div class="remove-list">${removals}</div><div class="actions"><button class="primary" data-action="leave-node">离开军械铺</button></div></section>`); }
function restView() { return shell(`${topbar()}<section class="map-card node-page"><h2>休整 · 山中古驿</h2><p>篝火尚暖。你可以恢复兵力，精简牌组，或强化一张核心牌。</p><div class="choice-list"><button class="route-option" data-rest="heal"><span class="route-mark">药</span><span><b>休养生息</b><small>回复 70 兵力，不超过上限。</small></span><span>›</span></button><button class="route-option" data-rest="thin"><span class="route-mark">简</span><span><b>轻装行军</b><small>移除一张基础牌，下一回合更容易抽到核心牌。</small></span><span>›</span></button><button class="route-option" data-rest="upgrade"><span class="route-mark">锻</span><span><b>打磨战法</b><small>强化一张基础牌，本局同名牌都会变强。</small></span><span>›</span></button></div></section>`); }
function campView() { const level = state.meta.talents?.sharpBlade || 0; const costs = [40, 80, 140]; const cost = costs[level]; return shell(`${topbar()}<section class="map-card node-page"><h2>中军大帐 · 韬略阁</h2><p>永久材料会在每次出征后保留。当前锐兵等级：<b>${level}/3</b></p><div class="talent-card"><span class="route-mark">锐</span><div><h3>锐兵</h3><p>所有主将兵力上限与初始兵力 +${level * 50}。</p><small>${level >= 3 ? '已达到最高等级' : `下一等级消耗 ${cost} 兵革残片`}</small></div><button class="primary" data-talent="sharpBlade" ${level >= 3 || state.meta.shards < cost ? 'disabled' : ''}>${level >= 3 ? '已满级' : '升级'}</button></div><div class="actions"><button class="secondary" data-action="back-title">返回</button></div></section>`); }
function cardView(id, index, reward=false) { const c=cards[id]; const mark = upgraded(id) ? ' · 强化' : ''; const dealClass = !reward && state.animateDeal ? 'deal-card' : ''; const art = c.image ? `<img class="card-image" src="${c.image}" alt="${c.name}">` : `<span class="card-fallback-art">${c.art}</span><strong>${c.name}${mark}</strong>`; return `<button class="card ${c.type} ${dealClass} ${upgraded(id)?'enhanced':''} ${state.selectedIndex===index&&!reward?'selected':''}" aria-label="${c.name}" style="--deal-index:${index}" data-card="${id}" data-index="${index}">${c.image ? art : `<span class="cost">${c.cost}</span>${art}`}</button>`; }
function relicView() { return state.run.relics.map(id=>`<span class="relic-chip" title="${relics[id].desc}">${relics[id].mark} ${relics[id].name}</span>`).join(''); }
function soulView() { return state.run.souls.map(id=>`<span class="soul-chip" title="${souls[id].desc}">${souls[id].mark} ${souls[id].name}</span>`).join(''); }
function battleView() { const s=state.battle, p=s.player, e=s.enemy; const mechanism = state.heroId==='zhangfei' ? `狂怒 ${p.rage}/${p.rageCap || 10}层` : state.heroId==='zhugeliang' ? `神机 ${p.mystery}/${mysteryCap()}层` : `龙胆 ${p.dragon}/3`; return shell(`<div class="battle-screen">${topbar()}<section id="enemy-panel" class="enemy-bar" data-target="enemy"><div class="avatar">${s.enemyIndex===2?'董':'敌'}</div><div><div class="enemy-name">${e.name}${e.berserk?' · 暴走':''}</div><div class="hp-text">兵力 ${e.hp}/${e.maxHp}</div><div class="bar"><span style="width:${Math.max(0,e.hp/e.maxHp*100)}%"></span></div></div><div class="intent">下回合<br><b>${intentText(s)}</b></div></section><section id="battle-log" class="log-panel"><h2>战斗日志</h2>${s.logs.slice(-8).map(x=>`<div class="log-line">${x}</div>`).join('')}</section><section id="player-panel" class="player-panel"><div class="avatar">${heroes[state.heroId].mark}</div><div><div class="player-heading"><b>${p.name}</b><span>兵力 ${p.hp}/${p.maxHp}</span></div><div class="bar"><span style="width:${Math.max(0,p.hp/p.maxHp*100)}%"></span></div><div class="stats"><span class="stat">护甲 <b>${p.block}</b></span><span class="stat">气力 <b>${s.energy}/3</b></span><span class="stat">${mechanism}</span></div>${activeBonds().length?`<div class="relic-row"><span class="bond-chip">羁绊：${activeBonds().join('、')}</span></div>`:''}${state.run.souls.length?`<div class="relic-row">${soulView()}</div>`:''}${state.run.relics.length?`<div class="relic-row">${relicView()}</div>`:''}</div></section><section id="hand-panel" class="hand-area"><div class="hand-title"><span>‹ 手牌 ›</span><span>${s.hand.length} 张</span></div><div class="hand">${s.hand.map((id,i)=>cardView(id,i)).join('')}</div><div class="battle-actions"><span class="turn">第 ${s.turn} 回合 · 先选卡牌，再点击敌方区域出牌</span><button class="primary" data-action="end" ${e.hp<=0?'disabled':''}>结束回合</button></div></section></div>${state.reward?rewardModal():''}`); }
function enemyPanelView(s) { return `<section id="enemy-panel" class="enemy-group" aria-label="敌方单位">${s.enemies.map((enemy,index)=>`<button class="enemy-bar ${enemy.hp <= 0 ? 'defeated' : ''} ${index === s.targetIndex ? 'selected-target' : ''}" data-target-index="${index}" ${enemy.hp <= 0 ? 'disabled' : ''}><div class="avatar">${s.enemyIndex===2?'将':'敌'}</div><div><div class="enemy-name">${enemy.name}</div><div class="hp-text">兵力 ${enemy.hp}/${enemy.maxHp}</div><div class="bar"><span style="width:${Math.max(0,enemy.hp/enemy.maxHp*100)}%"></span></div></div><div class="intent">${enemy.hp > 0 ? (s.turn % 2 ? `攻击 ${enemyAttack(s, enemy)}` : `护甲 +${enemy.blockGain || 20}`) : '已击破'}</div></button>`).join('')}</section>`; }
function battleView() { const s=state.battle, p=s.player; const mechanism = state.heroId==='zhangfei' ? `狂怒 ${p.rage}/${p.rageCap || 10}层` : state.heroId==='zhugeliang' ? `神机 ${p.mystery}/${mysteryCap()}层` : `龙胆 ${p.dragon}/3`; return shell(`<div class="battle-screen">${topbar()}${enemyPanelView(s)}<section id="battle-log" class="log-panel"><h2>战斗日志</h2>${s.logs.slice(-8).map(x=>`<div class="log-line">${x}</div>`).join('')}</section><section id="player-panel" class="player-panel"><div class="avatar">${heroes[state.heroId].mark}</div><div><div class="player-heading"><b>${p.name}</b><span>兵力 ${p.hp}/${p.maxHp}</span></div><div class="bar"><span style="width:${Math.max(0,p.hp/p.maxHp*100)}%"></span></div><div class="stats"><span class="stat">护甲 <b>${p.block}</b></span><span class="stat">气力 <b>${s.energy}/3</b></span><span class="stat">${mechanism}</span></div>${activeBonds().length?`<div class="relic-row"><span class="bond-chip">羁绊：${activeBonds().join('、')}</span></div>`:''}${state.run.souls.length?`<div class="relic-row">${soulView()}</div>`:''}${state.run.relics.length?`<div class="relic-row">${relicView()}</div>`:''}</div></section><section id="hand-panel" class="hand-area"><div class="hand-title"><span>‹ 手牌 ›</span><span>${s.hand.length} 张</span></div><div class="hand">${s.hand.map((id,i)=>cardView(id,i)).join('')}</div><div class="battle-actions"><span class="turn">第 ${s.turn} 回合 · 先选卡牌，再点击敌方目标出牌</span><button class="primary" data-action="end">结束回合</button></div></section></div>${state.reward?rewardModal():''}`); }
function rewardModal() { const cardOptions = ['quick','roar','bridge']; if (state.reward.type === 'relic') return `<div class="modal-backdrop"><div class="modal"><h2>精英战胜利 · 选择遗物</h2><p style="text-align:center;color:#6b5b42">遗物会影响本局后续所有战斗。</p><div class="relic-grid">${Object.entries(relics).map(([id,r])=>`<button class="relic-offer" data-relic="${id}"><span class="route-mark">${r.mark}</span><b>${r.name}</b><small>${r.desc}</small></button>`).join('')}</div></div></div>`; return `<div class="modal-backdrop"><div class="modal"><h2>战斗胜利 · 选择战利品</h2><p style="text-align:center;color:#6b5b42">基础牌与张飞普通专属牌组成当前奖励池。</p><div class="reward-grid">${cardOptions.map((id,i)=>cardView(id,i,true)).join('')}</div><div class="actions"><button class="secondary" data-action="skip-reward">跳过</button></div></div></div>`; }
function resultView() { const win = state.node >= 3; return shell(`${topbar()}<section class="result-card"><h2>${win?'凯旋入帐':'兵败暂退'}</h2><p style="text-align:center;color:#554b3b;line-height:1.8">${win?'你击破了董卓亲军，黄巾军暂退。':'战场风云未定，带回的残片仍能用于下一次整军。'}</p><div class="stats" style="justify-content:center;margin:20px 0"><span class="stat">本局获得兵革残片 <b>${win?'30':'12'}</b></span><span class="stat">永久总计 <b>${state.meta.shards}</b></span></div><div class="actions"><button class="primary" data-action="start">再次出征</button></div></section>`); }
function bind() {
  document.querySelectorAll('[data-action="start"]').forEach(b=>b.onclick=startRun);
  document.querySelector('[data-action="continue"]')?.addEventListener('click',continueRun);
  document.querySelectorAll('[data-hero]').forEach(b=>b.onclick=()=>{state.heroId=b.dataset.hero;render();});
  document.querySelector('[data-action="confirm-hero"]')?.addEventListener('click',()=>{state.run={deck:defaultDeck(),gold:80,hp:maxHpForHero(),relics:[],souls:[],upgraded:{}};state.screen='map';render();});
  document.querySelector('[data-action="battle"]')?.addEventListener('click',()=>enterNode('battle'));
  document.querySelectorAll('[data-node-type]').forEach(b=>b.onclick=()=>enterNode(b.dataset.nodeType));
  document.querySelector('[data-action="end"]')?.addEventListener('click',endTurn);
  document.querySelectorAll('[data-target-index]').forEach(target=>target.onclick=event=>handleTargetClick(Number(target.dataset.targetIndex),event));
  document.querySelector('[data-action="skip-reward"]')?.addEventListener('click',()=>chooseReward(null));
  document.querySelectorAll('[data-card]').forEach(b=>b.onclick=event=>{event.stopPropagation();state.reward?chooseReward(b.dataset.card):playCard(Number(b.dataset.index));});
  document.querySelectorAll('[data-event]').forEach(b=>b.onclick=()=>eventChoice(b.dataset.event));
  document.querySelectorAll('[data-buy-id]').forEach(b=>b.onclick=()=>shopBuy(b.dataset.buyId,Number(b.dataset.buyPrice)));
  document.querySelectorAll('[data-remove-index]').forEach(b=>b.onclick=()=>shopRemove(Number(b.dataset.removeIndex)));
  document.querySelector('[data-action="leave-node"]')?.addEventListener('click',advanceNode);
  document.querySelectorAll('[data-rest]').forEach(b=>b.onclick=()=>restChoice(b.dataset.rest));
  document.querySelectorAll('[data-relic]').forEach(b=>b.onclick=()=>chooseRelic(b.dataset.relic));
  document.querySelector('[data-action="camp"]')?.addEventListener('click',()=>{state.screen='camp';render();});
  document.querySelector('[data-action="back-title"]')?.addEventListener('click',()=>{state.screen='title';render();});
  document.querySelectorAll('[data-talent]').forEach(b=>b.onclick=()=>buyTalent(b.dataset.talent));
  app.onclick = event => { if (state.selectedIndex !== null && !event.target.closest('.card, [data-target-index]')) cancelSelection(); };
  document.onkeydown = event => { if (event.key === 'Escape') cancelSelection(); };
  refreshSelectionVisuals();
}
render();
