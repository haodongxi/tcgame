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
    battlefield-bg.png       水墨战场背景
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
