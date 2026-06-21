import {
  创建界面市场,
  推进界面市场,
  提交界面市价单,
  读取界面模型,
  创建智能分析资料,
} from './市场/界面适配层.js';

export function 创建新市场(随机种子) {
  return 创建界面市场({ 随机种子 });
}

export function 推进一步(状态) {
  const 日志 = 推进界面市场(状态);
  return 读取界面模型(状态).日志.at(-1) || 日志;
}

export function 玩家市价交易(状态, 方向, 数量) {
  const 结果 = 提交界面市价单(状态, 方向, 数量);
  if (!结果.成功) return { 成功: false, 原因: 结果.原因 };

  return {
    成功: true,
    日志: 读取界面模型(状态).日志.at(-1),
  };
}

export function 读取账户概况(状态) {
  const 账户 = 读取界面模型(状态).账户;
  return {
    持仓市值: 账户.持仓市值,
    总资产: 账户.总资产,
    浮动盈亏: 账户.浮动盈亏,
    总盈亏: 账户.总盈亏,
  };
}

export function 读取界面数据(状态) {
  return 读取界面模型(状态);
}

export function 创建分析资料(状态, 最近条数 = 80) {
  return 创建智能分析资料(状态, 最近条数);
}

export function 格式化市场时间(时间) {
  return new Date(时间).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}
