---
aliases: ["/tech/fireworks/"]
title: 用 Canvas 点亮一场烟花
date: 2026-09-27T12:00:00+08:00
description: 从发射轨迹到粒子扩散，用 Canvas 2D 实现可点击、可调节大小的烟花效果。
tags: [Canvas, JavaScript]
demo: demos/fireworks/
---
点击画面，烟花会从底部升起，在点击的位置附近散开。右上角的滑块可以改变爆炸时的粒子数量和大小。

## 从轨迹到爆炸

发射过程由 `Firework` 对象管理：它记录当前位置、目标位置与最近的轨迹点。每一帧朝目标移动，并用最近八个位置绘制尾迹。当距离目标小于阈值时，发射阶段结束，进入爆炸阶段。

## 一颗粒子的生命周期

每颗 `Particle` 保存位置、速度、颜色、大小和剩余寿命。更新位置时，垂直速度增加一个小的重力分量，形成向下弯曲的轨迹。

```javascript
this.x += this.vx;
this.y += this.vy;
this.vy += 0.02;
this.life -= 1;
```

第一代粒子在寿命末期有概率触发第二次爆炸，让一次点击产生层次不同的光点。

## 为什么会留下光的尾巴

动画使用 `requestAnimationFrame` 持续绘制。每帧用半透明黑色覆盖画面，让之前的光点逐渐暗下去，而不是瞬间清空整个画布。

页面可以独立运行，不需要服务端或额外的 JavaScript 库。
