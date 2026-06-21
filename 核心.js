import {
  创建界面市场,
  推进界面市场,
  提交界面市价单,
  读取界面模型,
  创建智能分析资料,
} from './市场/界面适配层.js';
import {
  提交玩家限价订单,
  撤销玩家限价订单,
  读取玩家全部限价委托,
} from './市场/玩家订单网关.js';
import { 初始化交易制度状态 } from './市场/制度执行器.js';

function 读取扩展界面模型(状态) {
  初始化交易制度状态(状态);
  const 原模型 = 读取界面模型(状态);
  const 委托 = 读取玩家全部限价委托(状态);
  return Object.freeze({
    ...原模型,
    市场: {
      ...原模型.市场,
      集合竞价中: Boolean(状态.结构.交易制度.集合竞价中),
      集合竞价可撤单: Boolean(状态.结构.交易制度.集合竞价可撤单),
      当前时分: 状态.结构.交易制度.当前时分,
    },
    委托,
  });
}

export function 创建新市场(随机种子) {
  return 创建界面市场({ 随机种子 });
}

export function 推进一步(状态) {
  const 日志 = 推进界面市场(状态);
  return 读取扩展界面模型(状态).日志.at(-1) || 日志;
}

export function 玩家市价交易(状态, 方向, 数量) {
  const 结果 = 提交界面市价单(状态, 方向, 数量);
  if (!结果.成功) return { 成功: false, 原因: 结果.原因 };
  return { 成功: true, 日志: 读取扩展界面模型(状态).日志.at(-1) };
}

export function 玩家限价交易(状态, 方向, 数量, 价格) {
  const 结果 = 提交玩家限价订单(状态, 方向, 数量, 价格);
  if (!结果.成功) return { 成功: false, 原因: 结果.原因 };
  return {
    成功: true,
    订单: 结果.订单,
    撮合结果: 结果.撮合结果,
    日志: 读取扩展界面模型(状态).日志.at(-1),
  };
}

export function 撤销限价委托(状态, 编号) {
  const 结果 = 撤销玩家限价订单(状态, 编号);
  if (!结果.成功) return { 成功: false, 原因: 结果.原因 };
  return { 成功: true, 订单: 结果.订单, 日志: 读取扩展界面模型(状态).日志.at(-1) };
}

export function 读取账户概况(状态) {
  const 账户 = 读取扩展界面模型(状态).账户;
  return {
    持仓市值: 账户.持仓市值,
    总资产: 账户.总资产,
    浮动盈亏: 账户.浮动盈亏,
    总盈亏: 账户.总盈亏,
  };
}

export function 读取界面数据(状态) {
  return 读取扩展界面模型(状态);
}

export function 创建分析资料(状态, 最近条数 = 80) {
  const 资料 = 创建智能分析资料(状态, 最近条数);
  return Object.freeze({
    ...资料,
    玩家待处理委托: 读取玩家全部限价委托(状态).待处理,
    集合竞价状态: {
      当前时分: 状态.结构.交易制度.当前时分,
      集合竞价中: 状态.结构.交易制度.集合竞价中,
      集合竞价可撤单: 状态.结构.交易制度.集合竞价可撤单,
      最近结果: 状态.结构.集合竞价.最近结果,
    },
  });
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
