const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(root, 'web/src/app.js'), 'utf8');
const stylesSource = fs.readFileSync(path.join(root, 'web/src/styles.css'), 'utf8');

function createHarness() {
  const storage = new Map();
  const app = { innerHTML: '', onclick: null };
  const context = {
    console,
    document: {
      querySelector(selector) { return selector === '#app' ? app : null; },
      querySelectorAll() { return []; },
      onkeydown: null
    },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    window: { setTimeout(fn) { fn(); return 1; } },
    Math,
    JSON,
    Date,
    Number,
    Object,
    Array,
    Boolean,
    String,
    parseInt,
    parseFloat
  };
  vm.createContext(context);
  vm.runInContext(appSource, context, { filename: 'web/src/app.js' });
  return { context, app, storage };
}

function run(name, test) {
  try {
    test();
    passed += 1;
    console.log(`✓ ${name}`);
  } catch (error) {
    console.error(`✗ ${name}`);
    throw error;
  }
}

let passed = 0;
const { context, app } = createHarness();
function inVm(body) { return vm.runInContext(`(() => {\n${body}\n})()`, context); }

run('标题页可渲染并提供开始出征入口', () => {
  assert.match(app.innerHTML, /一局十五分钟的行军/);
  assert.match(app.innerHTML, /data-action="start"/);
});

run('三章路线层数与文档定义一致', () => {
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(chapterRoutes.map(route => route.layers))', context)), [15, 17, 19]);
  assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(chapterRouteColumns.map(route => route.length))', context)), [15, 17, 19]);
});

run('地图进度使用 1-based 当前层数并显示完整章节总层数', () => {
  vm.runInContext(`
    state.heroId = 'zhangfei';
    state.chapter = 0;
    state.node = 2;
    state.run = { deck: [], gold: 80, hp: 750, relics: [], souls: [], upgraded: {}, path: [] };
    state.screen = 'map';
    render();
  `, context);
  assert.match(app.innerHTML, /行军进度 3\/15/);
});

run('每局随机序列可复现', () => {
  const values = vm.runInContext(`
    state.run = { seed: 123456, rngState: 123456 };
    const first = [nextRandom(), nextRandom(), nextRandom()];
    state.run.rngState = state.run.seed;
    JSON.stringify({ first, second: [nextRandom(), nextRandom(), nextRandom()] });
  `, context);
  const result = JSON.parse(values);
  assert.deepEqual(result.first, result.second);
  assert.ok(result.first.every(value => value >= 0 && value < 1));
});

run('旧战斗存档补齐新状态字段', () => {
  const normalized = vm.runInContext(`JSON.stringify(normalizeBattle({ enemy: { name: '旧敌人', hp: 10 }, player: {} }))`, context);
  const battle = JSON.parse(normalized);
  assert.equal(battle.player.bleed, 0);
  assert.equal(battle.enemies[0].attackBonus, 0);
});

run('普通敌人治疗机制生效', () => {
  const healedHp = vm.runInContext(`
    state.heroId = 'zhangfei';
    state.run = { relics: [] };
    const healer = cloneEnemy({ name: '术士', hp: 90, attack: 20, healer: true });
    const ally = cloneEnemy({ name: '信徒', hp: 70, attack: 20 });
    ally.hp = 30;
    const healerBattle = { turn: 1, chapter: 0, enemyIndex: 0, player: { hp: 750, maxHp: 750, block: 0, bleed: 0, weak: 0 }, enemies: [healer, ally], targetIndex: 0, enemy: healer, logs: [] };
    enemyAct(healerBattle);
    ally.hp;
  `, context);
  assert.equal(healedHp, 50);
});

run('普通/精英敌人召唤机制生效', () => {
  const enemyCount = vm.runInContext(`
    state.heroId = 'zhangfei';
    state.run = { relics: [] };
    const summoner = cloneEnemy({ name: '召唤者', hp: 100, attack: 20, summon: true });
    const summonBattle = { turn: 2, chapter: 0, enemyIndex: 0, player: { hp: 750, maxHp: 750, block: 0, bleed: 0, weak: 0 }, enemies: [summoner], targetIndex: 0, enemy: summoner, logs: [] };
    enemyAct(summonBattle);
    summonBattle.enemies.length;
  `, context);
  assert.equal(enemyCount, 2);
});

run('流血在敌方回合开始结算并逐层衰减', () => {
  const hpAfterBleed = vm.runInContext(`
    state.heroId = 'zhangfei';
    state.run = { relics: [] };
    const attacker = cloneEnemy({ name: '锐士', hp: 100, attack: 1, bleed: 1 });
    const bleedBattle = { turn: 1, chapter: 0, enemyIndex: 0, player: { hp: 750, maxHp: 750, block: 0, bleed: 0, weak: 0 }, enemies: [attacker], targetIndex: 0, enemy: attacker, logs: [] };
    enemyAct(bleedBattle);
    bleedBattle.turn = 3;
    enemyAct(bleedBattle);
    bleedBattle.player.hp;
  `, context);
  assert.equal(hpAfterBleed, 740);
});

run('路线节点使用固定圆点行与固定文字区', () => {
  assert.match(stylesSource, /\.map-line[^{]*\{[^}]*align-items: start/);
  assert.match(stylesSource, /\.node[^{]*\{[^}]*grid-template-rows: 40px 52px/);
  assert.match(stylesSource, /\.node-types[^{]*\{[^}]*height: 52px/);
});

run('三名主将都有十张初始牌组且专属牌不同', () => {
  const decks = JSON.parse(inVm(`
    const result = {};
    Object.keys(heroes).forEach(id => { state.heroId = id; result[id] = defaultDeck(); });
    return JSON.stringify(result);
  `));
  assert.deepEqual(decks.zhangfei, ['spear', 'spear', 'spear', 'spear', 'spear', 'guard', 'guard', 'guard', 'guard', 'yandang']);
  assert.equal(decks.zhugeliang.length, 10);
  assert.equal(decks.zhaoyun.length, 10);
  assert.notDeepEqual(decks.zhugeliang, decks.zhaoyun);
});

run('基础牌与张飞 18 张专属牌的图片资源全部存在', () => {
  const imagePaths = JSON.parse(inVm(`return JSON.stringify(Object.values(cards).filter(card => card.image).map(card => card.image))`));
  assert.equal(imagePaths.length, 21);
  imagePaths.forEach(image => assert.ok(fs.existsSync(path.join(root, 'web', image.replace(/^\.\//, ''))), image));
});

run('线上图片资源统一使用 WebP 且不残留 PNG', () => {
  const assetRoot = path.join(root, 'web/public/assets');
  const assets = [];
  const visit = directory => fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(target);
    else assets.push(target);
  });
  visit(assetRoot);
  assert.ok(assets.length >= 22);
  assert.ok(assets.every(asset => path.extname(asset) === '.webp'));
  assert.doesNotMatch(appSource, /\.png/);
  assert.doesNotMatch(stylesSource, /\.png/);
});

run('所有路线节点类型都能被节点分发器识别', () => {
  const unknown = JSON.parse(inVm(`return JSON.stringify(chapterRouteColumns.flat(2).filter(option => !['battle','elite','boss','event','shop','rest'].includes(option.id)))`));
  assert.deepEqual(unknown, []);
});

run('新战斗拥有五张起手牌、正确气力和多敌人队伍', () => {
  const result = JSON.parse(inVm(`
    state.heroId = 'zhangfei';
    state.chapter = 0;
    state.run = { deck: defaultDeck(), hp: 750, gold: 80, relics: [], souls: [], upgraded: {}, path: [], seed: 77, rngState: 77 };
    freshBattle(0);
    return JSON.stringify({ hand: state.battle.hand.length, energy: state.battle.energy, enemies: state.battle.enemies.length });
  `));
  assert.equal(result.hand, 5);
  assert.equal(result.energy, 3);
  assert.ok(result.enemies >= 2 && result.enemies <= 4);
});

run('抽牌堆耗尽时会从弃牌堆洗回', () => {
  const result = JSON.parse(inVm(`
    state.run = { seed: 10, rngState: 10 };
    const drawState = { drawPile: [], discard: ['spear'], hand: [] };
    draw(drawState, 1);
    return JSON.stringify(drawState);
  `));
  assert.deepEqual(result, { drawPile: [], discard: [], hand: ['spear'] });
});

run('狂怒有上限且未完全被护甲抵消时会增加', () => {
  const result = JSON.parse(inVm(`
    state.heroId = 'zhangfei';
    state.run = { relics: [] };
    const enemy = cloneEnemy({ name: '敌', hp: 100, attack: 10 });
    const battle = { player: { hp: 750, maxHp: 750, block: 0, rage: 9, rageCap: 10, weak: 0, bleed: 0 }, enemies: [enemy], enemy, targetIndex: 0, enemyIndex: 0, turn: 1, logs: [] };
    enemyStrike(battle, enemy, 10);
    addRage(battle, 99);
    return JSON.stringify({ rage: battle.player.rage, hp: battle.player.hp });
  `));
  assert.deepEqual(result, { rage: 10, hp: 740 });
});

run('青釭剑只强化本场第一次武技伤害', () => {
  const result = JSON.parse(inVm(`
    state.heroId = 'zhangfei';
    state.selectedCard = 'spear';
    state.run = { relics: ['qinggang'], souls: [], upgraded: {} };
    const enemy = cloneEnemy({ name: '敌', hp: 200, attack: 1 });
    const battle = { player: { hp: 750, maxHp: 750, block: 0, rage: 0 }, enemy, enemies: [enemy], targetIndex: 0, relicTriggered: false, logs: [] };
    const first = hit(battle, 40);
    const second = hit(battle, 40);
    return JSON.stringify({ first, second, triggered: battle.relicTriggered });
  `));
  assert.deepEqual(result, { first: 50, second: 40, triggered: true });
});

run('多敌人目标死亡后会自动切换到下一个存活目标', () => {
  const result = JSON.parse(inVm(`
    const defeated = cloneEnemy({ name: '已击破', hp: 0, attack: 1 });
    const alive = cloneEnemy({ name: '存活', hp: 20, attack: 1 });
    const battle = { enemies: [defeated, alive], targetIndex: 0, enemy: defeated };
    syncTarget(battle);
    return JSON.stringify({ index: battle.targetIndex, name: battle.enemy.name });
  `));
  assert.deepEqual(result, { index: 1, name: '存活' });
});

run('精英战攻击会按回合强化', () => {
  const result = JSON.parse(inVm(`
    const enemy = cloneEnemy({ name: '精英', hp: 100, attack: 35 });
    const battle = { enemyIndex: 1, turn: 1 };
    const first = enemyAttack(battle, enemy);
    battle.turn = 4;
    const later = enemyAttack(battle, enemy);
    return JSON.stringify({ first, later });
  `));
  assert.deepEqual(result, { first: 35, later: 55 });
});

run('三章 Boss 核心机制分别触发', () => {
  const result = JSON.parse(inVm(`
    state.heroId = 'zhangfei';
    state.run = { relics: [] };
    const make = (chapter, turn, hp = 1000) => {
      const boss = cloneEnemy({ name: 'Boss', hp: 1000, attack: 20, boss: true });
      boss.hp = hp;
      const battle = { chapter, turn, enemyIndex: 2, player: { hp: 750, maxHp: 750, block: 100, bleed: 0, weak: 0, rage: 0 }, enemies: [boss], targetIndex: 0, enemy: boss, logs: [] };
      state.battle = battle;
      enemyAct(battle);
      return { logs: battle.logs.join('|'), enemies: battle.enemies.length, weak: battle.player.weak, block: battle.player.block, berserk: boss.berserk };
    };
    return JSON.stringify({ zhangbao: make(0, 3), huaxiong: make(1, 2), gaoshun: make(2, 4), low: make(2, 1, 500) });
  `));
  assert.match(result.zhangbao.logs, /黄天符法/);
  assert.equal(result.zhangbao.weak, 1);
  assert.match(result.huaxiong.logs, /斩击/);
  assert.match(result.huaxiong.logs, /破除 50/);
  assert.equal(result.huaxiong.block, 0);
  assert.equal(result.gaoshun.enemies, 3);
  assert.equal(result.low.berserk, true);
});

run('合法路线进入节点并避免重复路径记录，非法节点被拒绝', () => {
  const result = JSON.parse(inVm(`
    state.heroId = 'zhangfei'; state.chapter = 0; state.node = 1;
    state.run = { deck: defaultDeck(), hp: 750, gold: 80, relics: [], souls: [], upgraded: {}, path: [], seed: 1, rngState: 1 };
    state.screen = 'map';
    const invalid = isReachableNode('not-a-node');
    enterNode('event');
    const afterFirst = state.run.path.length;
    state.screen = 'map';
    enterNode('event');
    return JSON.stringify({ invalid, afterFirst, afterSecond: state.run.path.length });
  `));
  assert.deepEqual(result, { invalid: false, afterFirst: 1, afterSecond: 1 });
});

run('事件、商店和休整会正确改变局内状态', () => {
  const result = JSON.parse(inVm(`
    state.heroId = 'zhangfei'; state.chapter = 0; state.node = 1; state.screen = 'event';
    state.run = { deck: defaultDeck(), hp: 700, gold: 80, relics: [], souls: [], upgraded: {}, path: [], seed: 2, rngState: 2 };
    eventChoice('recruit');
    const recruited = { hp: state.run.hp, guards: state.run.deck.filter(id => id === 'guard').length };
    state.screen = 'shop'; state.run.gold = 100; shopBuy('quick', 75); shopRemove(state.run.deck.length - 1);
    const shop = { gold: state.run.gold, quick: state.run.deck.includes('quick') };
    state.screen = 'rest'; state.run.hp = 500; restChoice('heal');
    return JSON.stringify({ recruited, shop, healed: state.run.hp });
  `));
  assert.deepEqual(result.recruited, { hp: 675, guards: 5 });
  assert.deepEqual(result.shop, { gold: 35, quick: false });
  assert.equal(result.healed, 570);
});

run('费用不足时商店购买和删牌操作不会越权', () => {
  const result = JSON.parse(inVm(`
    state.run = { deck: ['spear','guard','yandang'], gold: 10 };
    shopBuy('quick', 75);
    const before = state.run.deck.length;
    shopRemove(0);
    return JSON.stringify({ before, after: state.run.deck.length, gold: state.run.gold });
  `));
  assert.deepEqual(result, { before: 3, after: 3, gold: 10 });
});

run('三种将魂被动和两条羁绊会影响参数', () => {
  const result = JSON.parse(inVm(`
    state.heroId = 'zhangfei'; state.meta.talents = { sharpBlade: 1 }; state.run = { souls: ['zhouchang','liaohua'], upgraded: {} };
    const zhangfei = { hp: maxHpForHero(), bonds: activeBonds(), bonus: soulDamageBonus(cards.spear) };
    state.heroId = 'zhugeliang'; state.run.souls = ['xushu'];
    const zhugeliang = { cap: mysteryCap(), bonus: soulDamageBonus(cards.fire) };
    return JSON.stringify({ zhangfei, zhugeliang });
  `));
  assert.equal(result.zhangfei.hp, 880);
  assert.deepEqual(result.zhangfei.bonds, ['主仆相随']);
  assert.ok(Math.abs(result.zhangfei.bonus - 0.15) < 1e-9);
  assert.equal(result.zhugeliang.cap, 10);
  assert.ok(Math.abs(result.zhugeliang.bonus - 0.1) < 1e-9);
});

run('普通、精英和 Boss 奖励流程分别进入正确下一步', () => {
  const result = JSON.parse(inVm(`
    const setup = type => { state.heroId = 'zhangfei'; state.chapter = 0; state.node = 0; state.screen = 'battle'; state.run = { deck: defaultDeck(), hp: 750, gold: 80, relics: [], souls: [], upgraded: {}, path: [] }; const enemy = cloneEnemy({ name: '敌人', hp: 100, attack: 1 }); state.battle = { turn: 1, energy: 3, player: { hp: 700, maxHp: 750, block: 0, rage: 0, rageCap: 10 }, enemies: [enemy], enemy, targetIndex: 0, enemyIndex: type === 'elite' ? 1 : type === 'boss' ? 2 : 0, logs: [], hand: [], discard: [], drawPile: [] }; state.reward = { type: type === 'elite' ? 'relic' : type === 'boss' ? 'boss-card' : 'card' }; };
    setup('normal'); chooseReward('quick'); const normal = { screen: state.screen, deck: state.run.deck.includes('quick'), reward: state.reward };
    setup('elite'); chooseRelic('sunzi'); const elite = { reward: state.reward, relic: state.run.relics.includes('sunzi') };
    setup('boss'); chooseReward('peerless'); const boss = { reward: state.reward, deck: state.run.deck.includes('peerless') };
    return JSON.stringify({ normal, elite, boss });
  `));
  assert.equal(result.normal.screen, 'map');
  assert.equal(result.normal.deck, true);
  assert.equal(result.elite.relic, true);
  assert.equal(result.elite.reward.type, 'card');
  assert.equal(result.boss.reward.type, 'boss-relic');
  assert.equal(result.boss.deck, true);
});

run('永久统计、成就和卡背奖励只发放一次', () => {
  const result = JSON.parse(inVm(`
    state.meta = { shards: 0, talisman: 0, cardBack: 'gold', talents: { sharpBlade: 0 }, stats: { runs: 0, battlesWon: 0, chaptersCleared: 0, wins: 0 }, achievements: [] };
    for (let i = 0; i < 10; i++) recordBattleWon();
    const afterVeteran = { shards: state.meta.shards, achievements: [...state.meta.achievements] };
    recordBattleWon();
    for (let i = 0; i < 3; i++) recordChapterCleared();
    recordChapterCleared();
    return JSON.stringify({ afterVeteran, shards: state.meta.shards, talisman: state.meta.talisman, chapters: state.meta.stats.chaptersCleared });
  `));
  assert.deepEqual(result.afterVeteran, { shards: 20, achievements: ['veteran'] });
  assert.equal(result.shards, 20);
  assert.equal(result.talisman, 1);
  assert.equal(result.chapters, 4);
});

run('存档版本校验、保存和清理行为正确', () => {
  const result = JSON.parse(inVm(`
    state.run = { deck: ['spear'], gold: 80, hp: 750, relics: [], souls: [], upgraded: {}, path: [] };
    state.screen = 'map'; state.heroId = 'zhangfei'; state.chapter = 0; state.node = 1; saveRun();
    const saved = loadRunSave();
    localStorage.setItem('luanshi-run-save-v1', JSON.stringify({ version: 99 }));
    const invalid = loadRunSave();
    localStorage.setItem('luanshi-run-save-v1', JSON.stringify(saved)); clearRunSave();
    return JSON.stringify({ savedVersion: saved.version, savedNode: saved.node, invalid, cleared: hasRunSave() });
  `));
  assert.deepEqual(result, { savedVersion: 1, savedNode: 1, invalid: null, cleared: false });
});

run('战斗状态徽标、手牌层级和移动端安全布局规则存在', () => {
  assert.match(stylesSource, /\.card\.selected[^}]*z-index:\s*1000/);
  assert.match(stylesSource, /\.card\.selected[^}]*animation:\s*card-select-pop/);
  assert.match(stylesSource, /\.card\.selected[^}]*transform:\s*scale\(1\.035\)/);
  assert.match(stylesSource, /@keyframes card-select-pop/);
  assert.match(stylesSource, /\.card:not\(\.selected\):hover/);
  assert.match(stylesSource, /\.hand[^}]*overflow-x:\s*auto/);
  assert.match(stylesSource, /\.hand[^}]*overflow-y:\s*hidden/);
  assert.match(stylesSource, /prefers-reduced-motion/);
  assert.match(stylesSource, /\.enemy-bar[^}]*z-index:\s*1/);
  assert.match(stylesSource, /\.log-panel[^}]*z-index:\s*2/);
  assert.match(stylesSource, /\.hand-area[^}]*z-index:\s*4/);
});

run('选择牌会切换选中状态并支持再次点击取消', () => {
  const result = JSON.parse(inVm(`
    state.battle = { hand: ['spear'], energy: 3, enemy: { hp: 100 } };
    state.selectedIndex = null;
    state.selectedCard = null;
    state.busy = false;
    playCard(0);
    const selected = { index: state.selectedIndex, card: state.selectedCard };
    playCard(0);
    return JSON.stringify({ selected, cancelled: state.selectedIndex === null && state.selectedCard === null });
  `));
  assert.deepEqual(result, { selected: { index: 0, card: 'spear' }, cancelled: true });
});

run('卡牌展示包含稳定索引、名称和 WebP 图片', () => {
  const cardHtml = vm.runInContext(`cardView('spear', 2)`, context);
  assert.match(cardHtml, /class="card attack/);
  assert.match(cardHtml, /aria-label="挺矛直刺"/);
  assert.match(cardHtml, /data-index="2"/);
  assert.match(cardHtml, /cards\/base\/1\.webp/);
  assert.match(stylesSource, /\.card-image[^}]*object-fit:\s*cover/);
});

console.log(`Smoke tests passed: ${passed}`);
