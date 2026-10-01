/**
 * 今天doro是什么结局？（云崽插件版）
 *
 * 数据来自 doro 结局素材（73 张，文件名即结局名）：随机抽取一张结局卡（标题 + 描述 + 插画）。
 * endings.json 定义每个结局的 title / description / image。
 * - 命令：#今日doro / #doro结局 / #抽取doro结局 / #随机doro
 * - #doro全部结局：列出全部结局标题
 * - 不限抽取次数
 * - QQBot 官方端：结局描述用 markdown 引用块，并附「再来一次 / 全部结局」按钮
 * - 其它端：纯文本 + 图片
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import plugin from '../../lib/plugins/plugin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RES_DIR = path.join(__dirname, 'resources');

/** 读取结局数据（失败则空数组） */
function loadEndings() {
  try {
    const raw = fs.readFileSync(path.join(RES_DIR, 'endings.json'), 'utf-8');
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    logger?.error?.(`[doro-today] 读取 endings.json 失败: ${err}`);
    return [];
  }
}

const ENDINGS = loadEndings();

/** 结局插画绝对路径 */
function endingImagePath(item) {
  return path.join(RES_DIR, item.image);
}

/** 随机取一个结局 */
function randomEnding() {
  return ENDINGS[Math.floor(Math.random() * ENDINGS.length)];
}

/** 是否 QQBot 官方端（兼容 TRSS 对象式 adapter 与 Lain 字符串式 e.adapter） */
function isQQBot(e) {
  const adapter = e?.bot?.adapter;
  const name = String(
    e?.adapter || adapter?.name || adapter?.id || (typeof adapter === 'string' ? adapter : '') || ''
  ).toLowerCase();
  return name.includes('qqbot');
}

/** 按钮：再来一次 / 全部结局（仅 QQBot 端使用） */
const DORO_BUTTONS = [
  [{ text: '🔁 再来一次', callback: '今日doro结局', style: 1 }],
  [{ text: '📖 全部结局', callback: '#doro全部结局', style: 4 }],
];

export class DoroToday extends plugin {
  constructor() {
    super({
      name: '今天doro是什么结局',
      dsc: '随机抽取 doro 结局卡',
      event: 'message',
      priority: 5000,
      rule: [
        { reg: '^#?(抽取|随机)?(今日|今天)?doro(的)?结局$', fnc: 'draw' },
        { reg: '^#?doro全部结局$', fnc: 'allEndings' },
      ],
    });
  }

  async draw(e) {
    if (!ENDINGS.length) return e.reply('doro 结局数据为空，请检查插件资源。', true);
    const item = randomEnding();
    const img = endingImagePath(item);

    // 顶部 @ 触发者（QQBot 用官方语法，其它端用 at 段）
    const head = [];
    if (e.isGroup && e.user_id) {
      if (isQQBot(e) && (e.sender?.openid || e.raw?.sender?.openid)) {
        const oid = e.sender?.openid || e.raw?.sender?.openid;
        head.push({ type: 'text', text: `<qqbot-at-user id="${oid}" />\r` });
      } else {
        head.push(segment.at(e.user_id));
      }
    }

    if (isQQBot(e)) {
      // QQBot：正文 + 图片 + markdown 引用块（描述）+ 按钮
      const quote = `\r> 【${item.title}】\r> ${item.description}`;
      return e.reply(
        [...head, '🎲 今日doro结局', segment.image(img), quote, segment.button(...DORO_BUTTONS)],
        true
      );
    }

    // 其它端：纯文本 + 图片
    return e.reply(
      [...head, `🎲 今日doro结局\n\n【${item.title}】\n${item.description}`, segment.image(img)],
      true
    );
  }

  async allEndings(e) {
    if (!ENDINGS.length) return e.reply('doro 结局数据为空，请检查插件资源。', true);
    const titles = ENDINGS.map((it, i) => `${i + 1}. ${it.title}`).join('\n');
    return e.reply(`🐱 doro 全部结局（共 ${ENDINGS.length} 个）：\n\n${titles}`, true);
  }
}
