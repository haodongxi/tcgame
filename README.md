# 乱世行军 · 三国肉鸽卡牌 MVP

> Created by: haodongsheng

## 项目结构

```text
doc/                         策划、UI 与 MVP 技术文档
img/                         原始 UI 参考图
web/
  index.html                 Web 入口
  src/
    app.js                   游戏状态与交互逻辑
    styles.css               视觉样式与响应式布局
  public/assets/
    battlefield-bg.webp      水墨战场背景
```

## 本地查看

可以直接打开 `web/index.html`。

如果使用静态服务器，从项目根目录启动后访问 `web/index.html`，例如：

```bash
python3 -m http.server 4173
```

然后打开 `http://localhost:4173/web/`。

## 当前 MVP

- 三名主将选择
- 三段战斗路线
- 抽牌、出牌、结束回合
- 敌方意图、护甲、兵力
- 张飞狂怒、诸葛亮神机、赵云龙胆
- 战斗奖励与胜负结算
- `localStorage` 永久材料存档
- 遗物、卡牌强化与中军大帐锐兵天赋
- 张飞狂怒、诸葛亮神机、赵云龙胆与精英/Boss 行为差异
- 将魂获取、将魂被动与主将羁绊
- 当前局自动存档与刷新后继续出征
- 三章路线、章节 Boss 独有机制、状态徽标与路径回顾
- 章节结算、成就、永久统计和可切换卡背

本阶段暂不包含音效、线上部署或微信小程序适配。

## 验收检查

```bash
/Users/haodongsheng/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --check web/src/app.js
git diff --check
npm test
```

冒烟测试位于 [`test/smoke.js`](test/smoke.js)，当前有 36 个用例，覆盖入口、三名主将和初始牌组、三章路线、地图进度、节点分支、抽牌/洗牌、费用与伤害、遗物、将魂/羁绊、多敌人、普通敌人和 Boss 机制、奖励流程、局外成长、存档兼容、资源路径、卡牌选择状态、选中动画、攻击目标确认、自用卡牌轻量浮层、出牌后详情清理、战斗页面禁止纵向滚动、手机竖屏紧凑布局与显示约束。以后每次新增功能或修复 Bug，都必须同步增加或调整对应测试，并在交付前运行 `npm test`。

详细版本记录见 `doc/MVP10三章路线与GitHub静态资源修复.md` 至 `doc/最终文档校对与MVP收尾.md`。

## 响应式适配

- 手机：竖屏单手操作，手牌横向滑动，适配安全区和 375px 起步宽度。
- 平板：保留竖屏信息层级，卡牌和日志按可用空间缩放。
- 电脑：内容最大宽度限制在舒适范围，增加日志高度、卡牌尺寸和左右留白，避免界面被拉伸。
