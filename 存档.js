// 保持旧数据库名称，以便已存在的浏览器本地世界线仍可恢复。
const 数据库名称 = '华辰工业市场存档';
const 数据表名称 = '市场数据';
const 当前存档键 = '当前存档';
const 备用存档键 = '华辰工业市场存档备份';
const 当前导出格式 = '中国黄金模拟市场存档';
const 旧导出格式 = '华辰工业市场存档';

let 数据库承诺 = null;

function 可用数据库() {
  return typeof indexedDB !== 'undefined';
}

function 深拷贝(数据) {
  return JSON.parse(JSON.stringify(数据));
}

function 是当前中国黄金状态(数据) {
  return Boolean(
    数据
    && typeof 数据 === 'object'
    && 数据.版本 === 2
    && 数据.系统
    && 数据.变量
    && 数据.交易者
    && 数据.结构
    && 数据.历史
    && Array.isArray(数据.历史.价格序列)
    && Array.isArray(数据.历史.日志),
  );
}

function 打开数据库() {
  if (!可用数据库()) return Promise.resolve(null);
  if (数据库承诺) return 数据库承诺;

  数据库承诺 = new Promise((完成, 失败) => {
    const 请求 = indexedDB.open(数据库名称, 1);
    请求.onupgradeneeded = () => {
      const 数据库 = 请求.result;
      if (!数据库.objectStoreNames.contains(数据表名称)) 数据库.createObjectStore(数据表名称);
    };
    请求.onsuccess = () => 完成(请求.result);
    请求.onerror = () => 失败(请求.error);
  });
  return 数据库承诺;
}

function 写入备用存档(数据) {
  try {
    localStorage.setItem(备用存档键, JSON.stringify(数据));
  } catch {
    // 浏览器拒绝存储时，主程序仍可继续运行。
  }
}

function 读取备用存档() {
  try {
    const 原文 = localStorage.getItem(备用存档键);
    return 原文 ? JSON.parse(原文) : null;
  } catch {
    return null;
  }
}

export async function 保存市场(状态) {
  const 存档 = 深拷贝({ ...状态, 最后保存时间: new Date().toISOString() });
  写入备用存档(存档);
  try {
    const 数据库 = await 打开数据库();
    if (!数据库) return true;
    await new Promise((完成, 失败) => {
      const 事务 = 数据库.transaction(数据表名称, 'readwrite');
      事务.objectStore(数据表名称).put(存档, 当前存档键);
      事务.oncomplete = () => 完成();
      事务.onerror = () => 失败(事务.error);
      事务.onabort = () => 失败(事务.error);
    });
    return true;
  } catch {
    return false;
  }
}

export async function 读取市场() {
  try {
    const 数据库 = await 打开数据库();
    if (!数据库) return 读取备用存档();
    const 存档 = await new Promise((完成, 失败) => {
      const 事务 = 数据库.transaction(数据表名称, 'readonly');
      const 请求 = 事务.objectStore(数据表名称).get(当前存档键);
      请求.onsuccess = () => 完成(请求.result || null);
      请求.onerror = () => 失败(请求.error);
    });
    return 存档 || 读取备用存档();
  } catch {
    return 读取备用存档();
  }
}

export async function 清除市场存档() {
  try {
    localStorage.removeItem(备用存档键);
  } catch {
    // 无需阻断后续清除。
  }
  try {
    const 数据库 = await 打开数据库();
    if (!数据库) return true;
    await new Promise((完成, 失败) => {
      const 事务 = 数据库.transaction(数据表名称, 'readwrite');
      事务.objectStore(数据表名称).delete(当前存档键);
      事务.oncomplete = () => 完成();
      事务.onerror = () => 失败(事务.error);
    });
    return true;
  } catch {
    return false;
  }
}

export function 导出市场存档(状态) {
  const 内容 = JSON.stringify({
    存档格式: 当前导出格式,
    状态版本: 2,
    导出时间: new Date().toISOString(),
    数据: 状态,
  }, null, 2);
  const 文件 = new Blob([内容], { type: 'application/json;charset=utf-8' });
  const 地址 = URL.createObjectURL(文件);
  const 链接 = document.createElement('a');
  链接.href = 地址;
  链接.download = `中国黄金模拟市场存档_${new Date().toLocaleDateString('zh-CN').replaceAll('/', '-')}.json`;
  document.body.appendChild(链接);
  链接.click();
  链接.remove();
  URL.revokeObjectURL(地址);
}

export async function 导入市场存档(文件) {
  let 原文;
  let 存档;
  try {
    原文 = await 文件.text();
    存档 = JSON.parse(原文);
  } catch {
    throw new Error('存档文件无法解析为 JSON。');
  }

  if (存档?.存档格式 === 旧导出格式) {
    throw new Error('这是旧版华辰工业存档，不能导入中国黄金新引擎。请保留原文件。');
  }
  const 数据 = 存档?.存档格式 === 当前导出格式 ? 存档.数据 : 存档;
  if (!是当前中国黄金状态(数据)) {
    throw new Error('该文件不是完整的中国黄金模拟市场存档。');
  }
  return 深拷贝(数据);
}
