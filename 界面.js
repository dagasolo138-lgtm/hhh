import {
  创建新市场,
  推进一步,
  玩家市价交易,
  读取账户概况,
  格式化市场时间,
} from './核心.js';
import { 构建分析请求 } from './智能分析.js';
import {
  保存市场,
  读取市场,
  清除市场存档,
  导出市场存档,
  导入市场存档,
} from './存档.js';

let 市场状态 = null;
let 演算计时器 = null;
let 演算间隔 = 1000;
let 保存进行中 = false;
let 等待保存 = false;

const 元素 = {
  股票名称: document.querySelector('#股票名称'),
  市场时间: document.querySelector('#市场时间'),
  市场状态: document.querySelector('#市场状态'),
  当前价格: document.querySelector('#当前价格'),
  当前涨跌: document.querySelector('#当前涨跌'),
  内在价值: document.querySelector('#内在价值'),
  瞬时波动: document.querySelector('#瞬时波动'),
  流动性: document.querySelector('#流动性'),
  买卖价差: document.querySelector('#买卖价差'),
  买一价: document.querySelector('#买一价'),
  卖一价: document.querySelector('#卖一价'),
  现金: document.querySelector('#现金'),
  持仓: document.querySelector('#持仓'),
  持仓成本: document.querySelector('#持仓成本'),
  持仓市值: document.querySelector('#持仓市值'),
  总资产: document.querySelector('#总资产'),
  总盈亏: document.querySelector('#总盈亏'),
  浮动盈亏: document.querySelector('#浮动盈亏'),
  交易数量: document.querySelector('#交易数量'),
  日志区域: document.querySelector('#日志区域'),
  日志筛选: document.querySelector('#日志筛选'),
  运行按钮: document.querySelector('#运行按钮'),
  间隔选择: document.querySelector('#间隔选择'),
  保存提示: document.querySelector('#保存提示'),
  提示条: document.querySelector('#提示条'),
  分析资料: document.querySelector('#分析资料'),
  价格构成: document.querySelector('#价格构成'),
  存档导入: document.querySelector('#存档导入'),
};

function 保留(数值, 位数 = 2) {
  return Number(数值 || 0).toLocaleString('zh-CN', {
    minimumFractionDigits: 位数,
    maximumFractionDigits: 位数,
  });
}

function 百分数(数值, 位数 = 3) {
  const 数 = Number(数值 || 0);
  return `${数 >= 0 ? '+' : ''}${保留(数, 位数)}%`;
}

function 转义(文字) {
  return String(文字 ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function 方向类名(数值) {
  if (数值 > 0) return '上涨';
  if (数值 < 0) return '下跌';
  return '平盘';
}

function 最新市场日志() {
  return [...市场状态.日志].reverse().find((记录) => 记录.类型 === '市场波动') || null;
}

function 显示提示(文字, 类型 = '普通') {
  元素.提示条.textContent = 文字;
  元素.提示条.dataset.类型 = 类型;
  元素.提示条.classList.add('显示');
  window.clearTimeout(显示提示.计时器);
  显示提示.计时器 = window.setTimeout(() => {
    元素.提示条.classList.remove('显示');
  }, 3200);
}

async function 排队保存() {
  if (保存进行中) {
    等待保存 = true;
    return;
  }

  保存进行中 = true;
  const 成功 = await 保存市场(市场状态);
  保存进行中 = false;

  if (成功) {
    元素.保存提示.textContent = `已保存：${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`;
  } else {
    元素.保存提示.textContent = '浏览器未能保存，请及时导出存档。';
  }

  if (等待保存) {
    等待保存 = false;
    排队保存();
  }
}

function 渲染构成() {
  const 日志 = 最新市场日志();
  if (!日志 || !日志.构成) {
    元素.价格构成.innerHTML = '<span>尚未产生市场波动。</span>';
    return;
  }

  const 映射 = [
    ['价值回归', '价值回归'],
    ['趋势跟随', '趋势资金'],
    ['订单冲击', '订单冲击'],
    ['随机波动', '随机扰动'],
    ['事件冲击', '事件冲击'],
  ];

  元素.价格构成.innerHTML = 映射
    .map(([键, 名称]) => {
      const 数值 = 日志.构成[键] * 100;
      return `<div class="构成项">
        <span>${名称}</span>
        <strong class="${方向类名(数值)}">${百分数(数值)}</strong>
      </div>`;
    })
    .join('');
}

function 渲染日志() {
  const 筛选 = 元素.日志筛选.value;
  const 日志 = [...市场状态.日志]
    .reverse()
    .filter((记录) => 筛选 === '全部' || 记录.类型 === 筛选)
    .slice(0, 140);

  if (!日志.length) {
    元素.日志区域.innerHTML = '<div class="空记录">市场尚未开始。第一笔波动会写进这里。</div>';
    return;
  }

  元素.日志区域.innerHTML = 日志
    .map((记录) => {
      const 涨跌 = Number(记录.涨跌幅 || 0);
      const 类型 = 记录.类型 === '玩家成交' ? '你的成交' : '市场波动';
      const 标题 = 记录.类型 === '玩家成交'
        ? `${记录.方向}${记录.数量}股`
        : `${保留(记录.上次价格)} → ${保留(记录.最新价格)}`;

      const 详情 = 记录.类型 === '市场波动'
        ? `
          <div class="日志网格">
            <span>内在价值：<b>${保留(记录.内在价值)}</b></span>
            <span>瞬时波动：<b>${保留(记录.波动率, 3)}%</b></span>
            <span>流动性：<b>${保留(记录.流动性, 3)}</b></span>
            <span>成交量：<b>${Number(记录.成交量).toLocaleString('zh-CN')}</b></span>
          </div>
          <div class="资金行">
            价值 ${记录.资金.价值资金 >= 0 ? '+' : ''}${记录.资金.价值资金}　
            趋势 ${记录.资金.趋势资金 >= 0 ? '+' : ''}${记录.资金.趋势资金}　
            噪声 ${记录.资金.噪声资金 >= 0 ? '+' : ''}${记录.资金.噪声资金}　
            风控 ${记录.资金.风控资金 >= 0 ? '+' : ''}${记录.资金.风控资金}　
            做市 ${记录.资金.做市资金 >= 0 ? '+' : ''}${记录.资金.做市资金}
          </div>
          ${记录.事件 ? `<div class="事件行">事件：${转义(记录.事件.名称)}，冲击 ${百分数(记录.事件.方向 * 记录.事件.强度 * 100)}</div>` : ''}
        `
        : `
          <div class="日志网格">
            <span>成交价：<b>${保留(记录.成交价)}</b></span>
            <span>成交金额：<b>${保留(记录.成交金额)}</b></span>
            <span>订单冲击：<b>${保留(记录.价格冲击, 3)}%</b></span>
          </div>
        `;

      return `
        <details class="日志卡">
          <summary>
            <div>
              <span class="日志类型">${类型}</span>
              <strong>${标题}</strong>
              <small>${格式化市场时间(记录.时间)}</small>
            </div>
            <b class="${方向类名(涨跌)}">${百分数(涨跌)}</b>
          </summary>
          <p>${转义(记录.说明)}</p>
          ${详情}
        </details>`;
    })
    .join('');
}

function 渲染分析资料() {
  const 资料 = 构建分析请求(市场状态, 60).市场资料;
  const 市场 = 资料.市场概况;
  元素.分析资料.textContent =
    `当前市场处于${市场.市场状态}状态；价格${保留(市场.最新价格)}，` +
    `内在价值${保留(市场.内在价值)}，瞬时波动${保留(市场.瞬时波动率, 3)}%，` +
    `流动性${保留(市场.流动性, 3)}。` +
    `智能分析扩展将读取最近日志与此摘要，不能修改市场。`;
}

function 渲染界面() {
  if (!市场状态) return;

  const 市场 = 市场状态.市场;
  const 用户 = 市场状态.用户;
  const 概况 = 读取账户概况(市场状态);
  const 最新 = 最新市场日志();
  const 涨跌 = 最新 ? 最新.涨跌幅 : 0;
  const 价格变化类 = 方向类名(涨跌);

  元素.股票名称.textContent = 市场.名称;
  元素.市场时间.textContent = 格式化市场时间(市场状态.市场时间);
  元素.市场状态.textContent = 市场.状态;
  元素.市场状态.dataset.状态 = 市场.状态;
  元素.当前价格.textContent = `￥${保留(市场.价格)}`;
  元素.当前涨跌.textContent = `${百分数(涨跌)}　${最新?.说明 || '等待首次演算。'}`;
  元素.当前涨跌.className = `涨跌说明 ${价格变化类}`;

  元素.内在价值.textContent = `￥${保留(市场.内在价值)}`;
  元素.瞬时波动.textContent = `${保留(市场.瞬时波动率 * 100, 3)}%`;
  元素.流动性.textContent = 保留(市场.流动性, 3);
  元素.买卖价差.textContent = `${保留(市场.买卖价差 * 100, 3)}%`;
  元素.买一价.textContent = `￥${保留(市场.买一价)}`;
  元素.卖一价.textContent = `￥${保留(市场.卖一价)}`;

  元素.现金.textContent = `￥${保留(用户.现金)}`;
  元素.持仓.textContent = `${用户.持仓.toLocaleString('zh-CN')} 股`;
  元素.持仓成本.textContent = 用户.持仓 ? `￥${保留(用户.持仓成本)}` : '暂无';
  元素.持仓市值.textContent = `￥${保留(概况.持仓市值)}`;
  元素.总资产.textContent = `￥${保留(概况.总资产)}`;
  元素.总盈亏.textContent = `￥${保留(概况.总盈亏)}`;
  元素.总盈亏.className = 方向类名(概况.总盈亏);
  元素.浮动盈亏.textContent = `￥${保留(概况.浮动盈亏)}`;
  元素.浮动盈亏.className = 方向类名(概况.浮动盈亏);

  元素.运行按钮.textContent = 市场状态.已运行 ? '暂停市场' : '启动市场';
  元素.运行按钮.dataset.运行 = String(市场状态.已运行);

  渲染构成();
  渲染日志();
  渲染分析资料();
}

async function 演算一次() {
  const 日志 = 推进一步(市场状态);
  渲染界面();
  排队保存();

  if (日志.事件) {
    显示提示(`市场事件：${日志.事件.名称}`, '事件');
  }
}

function 停止市场() {
  if (演算计时器) {
    window.clearInterval(演算计时器);
    演算计时器 = null;
  }
  if (市场状态) 市场状态.已运行 = false;
}

function 启动市场() {
  if (演算计时器) return;
  市场状态.已运行 = true;
  演算计时器 = window.setInterval(演算一次, 演算间隔);
  渲染界面();
  排队保存();
}

function 重启计时器() {
  if (!市场状态.已运行) return;
  停止市场();
  启动市场();
}

function 处理交易(方向) {
  const 结果 = 玩家市价交易(市场状态, 方向, 元素.交易数量.value);
  if (!结果.成功) {
    显示提示(结果.原因, '警告');
    return;
  }

  渲染界面();
  排队保存();
  显示提示(结果.日志.说明, '成交');
}

async function 复制分析资料() {
  const 资料 = 构建分析请求(市场状态, 80);
  const 原文 = JSON.stringify(资料, null, 2);

  try {
    await navigator.clipboard.writeText(原文);
    显示提示('分析资料已复制，可交给已接入的智能分析员。', '普通');
  } catch {
    const 输入框 = document.createElement('textarea');
    输入框.value = 原文;
    document.body.appendChild(输入框);
    输入框.select();
    document.execCommand('copy');
    输入框.remove();
    显示提示('分析资料已复制，可交给已接入的智能分析员。', '普通');
  }
}

async function 重置市场() {
  const 确认重置 = window.confirm('这会删除当前本地市场并建立一个新市场。现有存档可先导出。确定继续吗？');
  if (!确认重置) return;

  停止市场();
  await 清除市场存档();
  市场状态 = 创建新市场();
  渲染界面();
  await 排队保存();
  显示提示('已建立新的市场世界线。', '普通');
}

async function 处理导入(事件) {
  const 文件 = 事件.target.files?.[0];
  if (!文件) return;

  try {
    停止市场();
    市场状态 = await 导入市场存档(文件);
    市场状态.已运行 = false;
    渲染界面();
    await 排队保存();
    显示提示('存档已导入。', '普通');
  } catch (错误) {
    显示提示(错误?.message || '存档无法读取。', '警告');
  } finally {
    事件.target.value = '';
  }
}

function 绑定事件() {
  元素.运行按钮.addEventListener('click', () => {
    if (市场状态.已运行) {
      停止市场();
      渲染界面();
      排队保存();
    } else {
      启动市场();
    }
  });

  document.querySelector('#推进按钮').addEventListener('click', 演算一次);
  document.querySelector('#买入按钮').addEventListener('click', () => 处理交易('买入'));
  document.querySelector('#卖出按钮').addEventListener('click', () => 处理交易('卖出'));
  document.querySelector('#重置按钮').addEventListener('click', 重置市场);
  document.querySelector('#导出按钮').addEventListener('click', () => 导出市场存档(市场状态));
  document.querySelector('#复制分析按钮').addEventListener('click', 复制分析资料);
  元素.存档导入.addEventListener('change', 处理导入);
  元素.日志筛选.addEventListener('change', 渲染日志);

  元素.间隔选择.addEventListener('change', () => {
    演算间隔 = Number(元素.间隔选择.value);
    重启计时器();
  });

  window.addEventListener('beforeunload', () => {
    if (市场状态) 保存市场(市场状态);
  });
}

async function 初始化() {
  绑定事件();
  const 已存市场 = await 读取市场();
  市场状态 = 已存市场 || 创建新市场();
  市场状态.已运行 = false;
  渲染界面();

  if (已存市场) {
    元素.保存提示.textContent = '已恢复上次本地存档。';
  } else {
    await 排队保存();
  }
}

初始化();
