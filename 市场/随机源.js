/* 确定性随机源：同一随机种子与同一调用顺序必须得到同一条市场世界线。 */

export function 规范化种子(种子) {
  const 数值 = Number(种子);
  if (!Number.isFinite(数值)) return 1;
  return (Math.floor(Math.abs(数值)) >>> 0) || 1;
}

export function 下一个随机数(状态) {
  状态.系统.随机种子 = (状态.系统.随机种子 + 0x6d2b79f5) >>> 0;
  let 值 = 状态.系统.随机种子;
  值 = Math.imul(值 ^ (值 >>> 15), 值 | 1);
  值 ^= 值 + Math.imul(值 ^ (值 >>> 7), 值 | 61);
  return ((值 ^ (值 >>> 14)) >>> 0) / 4294967296;
}

export function 标准正态随机数(状态) {
  const 左 = Math.max(下一个随机数(状态), Number.EPSILON);
  const 右 = 下一个随机数(状态);
  return Math.sqrt(-2 * Math.log(左)) * Math.cos(2 * Math.PI * 右);
}

export function 区间随机数(状态, 最小值, 最大值) {
  return 最小值 + 下一个随机数(状态) * (最大值 - 最小值);
}

export function 伯努利试验(状态, 概率) {
  return 下一个随机数(状态) < Math.max(0, Math.min(1, 概率));
}

export function 加权选择(状态, 候选项) {
  const 总权重 = 候选项.reduce((合计, 项) => 合计 + Math.max(0, 项.权重), 0);
  if (总权重 <= 0) return 候选项[0] || null;

  const 抽样 = 下一个随机数(状态) * 总权重;
  let 累计 = 0;
  for (const 项 of 候选项) {
    累计 += Math.max(0, 项.权重);
    if (抽样 <= 累计) return 项;
  }
  return 候选项[候选项.length - 1] || null;
}
