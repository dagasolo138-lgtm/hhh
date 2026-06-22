import { 构建可见十档盘口, 读取统一委托流 } from './市场/统一委托流.js';

const 备用存档键 = '华辰工业市场存档备份';
const 盘口容器 = document.querySelector('#十档盘口');
const 自动委托容器 = document.querySelector('#自动委托流');

function 转义(文字) {
  return String(文字 ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function 价格(数值) {
  return `￥${Number(数值 || 0).toLocaleString('zh-CN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

function 数量(数值) {
  return Math.round(Number(数值 || 0)).toLocaleString('zh-CN');
}

function 读取存档状态() {
  try {
    const 原文 = localStorage.getItem(备用存档键);
    return 原文 ? JSON.parse(原文) : null;
  } catch {
    return null;
  }
}

function 行(方向, 档位, 最大数量) {
  const 总量 = Number(档位.数量 || 0);
  const 宽度 = Math.max(3, Math.min(100, 总量 / Math.max(最大数量, 1) * 100));
  const 来源 = [
    档位.做市数量 ? `做市 ${数量(档位.做市数量)}` : '',
    档位.自动挂单数量 ? `自动 ${数量(档位.自动挂单数量)}` : '',
    档位.玩家挂单数量 ? `玩家 ${数量(档位.玩家挂单数量)}` : '',
  ].filter(Boolean).join(' · ');
  const 标签 = `${方向}${档位.档位}`;
  return `<div class="十档行 ${方向 === '卖' ? '卖方行' : '买方行'}">
    <span class="十档标签">${标签}</span>
    <span class="十档价格">${价格(档位.价格)}</span>
    <span class="十档数量">${数量(总量)}</span>
    <span class="十档条"><i style="width:${宽度}%"></i></span>
    <small>${转义(来源 || '—')}</small>
  </div>`;
}

function 渲染盘口(状态) {
  if (!盘口容器) return;
  if (!状态?.变量 || !状态?.订单簿) {
    盘口容器.innerHTML = '<div class="空十档">正在等待市场状态。</div>';
    return;
  }

  const 盘口 = 构建可见十档盘口(状态);
  const 全部 = [...盘口.买方, ...盘口.卖方];
  const 最大数量 = Math.max(1, ...全部.map((档位) => Number(档位.数量 || 0)));
  const 卖方 = [...盘口.卖方].reverse();
  const 买方 = 盘口.买方;

  盘口容器.innerHTML = `
    <div class="十档表头"><span>档位</span><span>价格</span><span>总量</span><span>深度</span><span>来源拆分</span></div>
    <div class="十档卖方">${卖方.map((档位) => 行('卖', 档位, 最大数量)).join('')}</div>
    <div class="十档中轴">中间价 ${价格(盘口.中间价)}　上次成交 ${价格(盘口.上次成交价)}</div>
    <div class="十档买方">${买方.map((档位) => 行('买', 档位, 最大数量)).join('')}</div>
    <p class="十档说明">可见深度 = 做市报价 + 自动订单残余 + 玩家挂单。当前单账户模拟中，玩家自身挂单不作为自己的可成交对手方。</p>
  `;
}

function 渲染自动委托(状态) {
  if (!自动委托容器) return;
  if (!状态?.结构) {
    自动委托容器.innerHTML = '<span>自动委托流尚未生成。</span>';
    return;
  }
  const 流 = 读取统一委托流(状态);
  const 委托 = 流.自动委托;
  if (!委托.length) {
    自动委托容器.innerHTML = '<span>本刻没有自动交易者订单。</span>';
    return;
  }
  自动委托容器.innerHTML = 委托.map((订单) => {
    const 类名 = 订单.方向 === '买入' ? '自动买入' : '自动卖出';
    const 已成交数量 = Number(订单.已成交数量 ?? 订单.成交数量 ?? 0);
    const 申请数量 = Number(订单.数量 ?? 订单.申请数量 ?? 0);
    const 限价 = Number(订单.价格 ?? 订单.限价 ?? 0);
    return `<div class="自动委托卡 ${类名}">
      <b>${转义(订单.来源)}</b>
      <span>${转义(订单.方向)} ${数量(申请数量)}份</span>
      <span>限价 ${价格(限价)}</span>
      <span>成交 ${数量(已成交数量)} / 剩余 ${数量(订单.剩余数量)}</span>
      <small>${转义(订单.状态)}</small>
    </div>`;
  }).join('');
}

let 上次指纹 = '';
function 刷新() {
  const 状态 = 读取存档状态();
  if (!状态) return;
  const 指纹 = [
    状态.最后保存时间 || '',
    状态.系统?.演算序号 || 0,
    状态.结构?.统一委托流?.版本 || 0,
    状态.结构?.玩家冻结资产?.现金 || 0,
    状态.结构?.玩家冻结资产?.份额 || 0,
    状态.订单簿?.版本 || 0,
  ].join(':');
  if (指纹 === 上次指纹) return;
  上次指纹 = 指纹;
  渲染盘口(状态);
  渲染自动委托(状态);
}

刷新();
window.setInterval(刷新, 350);
