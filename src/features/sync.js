import { getAllLorebooks, createLorebookEntries, getChatMessages } from '../api.js';
import { escapeHtml, escapeRegExp } from '../utils.js';
import { isDefaultCollapse } from './settings.js';

export let extractedCards = [];

let $targetWbSelect;
let $tagStart;
let $tagEnd;
let $floorInput;
let $cardsContainer;
let $batchMode;
let $batchPosition;
let $batchDepthContainer;
let $batchDepth;
let $batchPreventIn;
let $batchPreventOut;

export function initSync() {
  $targetWbSelect = $('#wb-sync-target-wb');
  $tagStart = $('#wb-sync-tag-start');
  $tagEnd = $('#wb-sync-tag-end');
  $floorInput = $('#wb-sync-floor');
  $cardsContainer = $('#wb-sync-cards-container');
  $batchMode = $('#wb-sync-batch-mode');
  $batchPosition = $('#wb-sync-batch-position');
  $batchDepthContainer = $('#wb-sync-batch-depth-container');
  $batchDepth = $('#wb-sync-batch-depth');
  $batchPreventIn = $('#wb-sync-batch-prevent-in');
  $batchPreventOut = $('#wb-sync-batch-prevent-out');

  $('#wb-sync-extract-btn').on('click', extractMessages);
  $('#wb-sync-apply-batch-btn').on('click', applyBatchSettings);
  
  $batchPosition.on('change', function () {
    const val = $(this).val();
    $batchDepthContainer.css(
      'display',
      val !== '' && parseInt(val) >= 6 && parseInt(val) <= 8 ? 'flex' : 'none',
    );
  });

  $('#wb-sync-sync-all-btn').on('click', async function () {
    await syncEntries(extractedCards, $(this));
    setTimeout(
      () =>
        $(this)
          .prop('disabled', false)
          .html('<i class="fa-solid fa-cloud-arrow-up"></i> 一键同步全部'),
      2000,
    );
  });

  $cardsContainer.on('change', 'input, select, textarea', function () {
    const $target = $(this);
    const $card = $target.closest('.wb-sync-card');
    const id = $card.data('id');
    const cardData = extractedCards.find(c => c.id === id);
    if (!cardData) return;

    if ($target.hasClass('card-name')) cardData.name = $target.val();
    else if ($target.hasClass('card-keys')) cardData.keys = $target.val();
    else if ($target.hasClass('card-content')) cardData.content = $target.val();
    else if ($target.hasClass('card-mode')) cardData.mode = $target.val();
    else if ($target.hasClass('card-depth')) cardData.depth = parseInt($target.val()) || 0;
    else if ($target.hasClass('card-prevent-in')) cardData.preventIncoming = $target.is(':checked');
    else if ($target.hasClass('card-prevent-out')) cardData.preventOutgoing = $target.is(':checked');
    else if ($target.hasClass('card-position')) {
      const val = $target.val();
      cardData.position = val;
      $card
        .find('.card-depth-row')
        .css('display', parseInt(val) >= 6 && parseInt(val) <= 8 ? 'flex' : 'none');
    }
  });

  $cardsContainer.on('click', '.sync-single-btn', async function () {
    const $card = $(this).closest('.wb-sync-card');
    const id = $card.data('id');
    const cardData = extractedCards.find(c => c.id === id);
    if (cardData) {
      await syncEntries([cardData], $(this));
    }
  });

  $cardsContainer.on('click', '.delete-card-btn', function () {
    const $card = $(this).closest('.wb-sync-card');
    const id = $card.data('id');
    removeCard(id);
  });

  $cardsContainer.on('click', '.wb-sync-card-header', function () {
    const $content = $(this).siblings('.wb-sync-card-content');
    const $icon = $(this).find('.wb-sync-collapse-icon');
    if ($content.is(':visible')) {
      $content.slideUp(200);
      $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    } else {
      $content.slideDown(200);
      $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    }
  });
}

export async function populateSyncWorldbooks() {
  try {
    const books = await getAllLorebooks();
    $targetWbSelect.empty().append('<option value="">-- 请选择目标世界书 --</option>');
    books.forEach(book => $targetWbSelect.append(`<option value="${escapeHtml(book.file_name)}">${escapeHtml(book.name)}</option>`));
  } catch (error) {
    $targetWbSelect.empty().append('<option value="">加载失败</option>');
  }
}

function parseFloorInput(input) {
  if (!input || input.trim() === '') {
    return [-1];
  }
  return input.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n));
}

async function fetchMessages(floors) {
  const messages = [];
  for (const floor of floors) {
    const msgs = await getChatMessages(floor);
    if (msgs && msgs.length > 0) {
      messages.push(msgs[0].message);
    }
  }
  return messages;
}

function extractTextWithTags(text, startTag, endTag) {
  const regexStr = `${escapeRegExp(startTag)}([\\s\\S]*?)${escapeRegExp(endTag)}`;
  const regex = new RegExp(regexStr, 'g');
  let match;
  const extractedTexts = [];
  while ((match = regex.exec(text)) !== null) {
    extractedTexts.push(match[1].trim());
  }
  return extractedTexts;
}

export async function extractContentFromMessage(startTag, endTag, floorInput) {
  if (!startTag || !endTag) {
    toastr.warning('请填写起始和结束标签');
    return null;
  }
  try {
    const floors = parseFloorInput(floorInput);
    const messages = await fetchMessages(floors);
    
    if (messages.length === 0) {
      toastr.warning('未找到指定楼层的消息');
      return null;
    }

    let allExtractedTexts = [];
    for (const msgText of messages) {
      const texts = extractTextWithTags(msgText, startTag, endTag);
      allExtractedTexts = allExtractedTexts.concat(texts);
    }

    if (allExtractedTexts.length === 0) {
      toastr.info(`未找到被 ${startTag} 和 ${endTag} 包裹的内容`);
      return null;
    }
    return allExtractedTexts;
  } catch (error) {
    toastr.error('提取失败: ' + error.message);
    return null;
  }
}

export async function extractMessages() {
  const startTag = $tagStart.val();
  const endTag = $tagEnd.val();
  const floorInput = $floorInput.val();

  const extractedTexts = await extractContentFromMessage(startTag, endTag, floorInput);
  if (!extractedTexts) return;

  extractedCards = extractedTexts.map((text, index) => parseExtractedText(text, index));
  renderCards();
  toastr.success(`成功提取 ${extractedCards.length} 个条目`);
}

export function parseExtractedText(text, index) {
  let name = `提取条目 ${index + 1}`,
    keys = '',
    content = text;
  const lines = text.split('\n'),
    contentLines = [];
  for (let line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('名称:') || trimmed.startsWith('名称：')) name = trimmed.substring(3).trim();
    else if (trimmed.startsWith('关键字:') || trimmed.startsWith('关键字：')) keys = trimmed.substring(4).trim();
    else contentLines.push(line);
  }
  if (name !== `提取条目 ${index + 1}` || keys !== '') content = contentLines.join('\n').trim();

  return {
    id: Date.now() + index,
    name,
    keys,
    content,
    mode: 'selective',
    position: '4',
    depth: 4,
    preventIncoming: false,
    preventOutgoing: false,
  };
}

export function renderCards() {
  if (extractedCards.length === 0) {
      $cardsContainer.html('<div class="wb-sync-empty-msg">没有提取到任何条目。</div>');
      return;
  }

  let cardsHtml = '';
  const defaultCollapse = isDefaultCollapse();
  extractedCards.forEach(card => {
      const isDepthVisible = parseInt(card.position) >= 6 && parseInt(card.position) <= 8;
      const contentStyle = defaultCollapse ? 'display: none; padding: 15px;' : 'padding: 15px;';
      const iconClass = defaultCollapse ? 'fa-chevron-down' : 'fa-chevron-up';
      cardsHtml += `
          <div class="wb-sync-card" data-id="${card.id}" style="border: 1px solid var(--wb-sync-border); border-radius: 5px; background: rgba(0,0,0,0.2); overflow: hidden;">
              <div class="wb-sync-card-header" style="padding: 10px 15px; background: rgba(0,0,0,0.3); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-weight: bold;">${escapeHtml(card.name)}</span>
                  <i class="fa-solid ${iconClass} wb-sync-collapse-icon"></i>
              </div>
              <div class="wb-sync-card-content" style="${contentStyle}">
                  <div class="wb-sync-card-row"><span class="wb-sync-card-label">名称</span><input type="text" class="wb-sync-card-input card-name" value="${escapeHtml(card.name)}"></div>
                  <div class="wb-sync-card-row" style="margin-top: 10px;"><span class="wb-sync-card-label">关键字</span><input type="text" class="wb-sync-card-input card-keys" value="${escapeHtml(card.keys)}" placeholder="逗号分隔"></div>
                  <div class="wb-sync-card-row col" style="margin-top: 10px;"><span class="wb-sync-card-label">内容</span><textarea class="wb-sync-card-textarea card-content">${escapeHtml(card.content)}</textarea></div>
                  <div style="border-top: 1px solid var(--wb-sync-card-border); margin: 5px 0;"></div>
                  <div class="wb-sync-card-row">
                      <span class="wb-sync-card-label">触发模式</span>
                      <select class="wb-sync-card-select card-mode">
                          <option value="constant" ${card.mode === 'constant' ? 'selected' : ''}>常驻 (蓝灯)</option>
                          <option value="selective" ${card.mode === 'selective' ? 'selected' : ''}>条件触发 (绿灯)</option>
                      </select>
                  </div>
                  <div class="wb-sync-card-row">
                      <span class="wb-sync-card-label">插入位置</span>
                      <select class="wb-sync-card-select card-position">
                          <option value="0" ${card.position == 0 ? 'selected' : ''}>角色定义之前</option>
                          <option value="1" ${card.position == 1 ? 'selected' : ''}>角色定义之后</option>
                          <option value="2" ${card.position == 2 ? 'selected' : ''}>示例消息前 (↑EM)</option>
                          <option value="3" ${card.position == 3 ? 'selected' : ''}>示例消息后 (↓EM)</option>
                          <option value="4" ${card.position == 4 ? 'selected' : ''}>作者说明之前</option>
                          <option value="5" ${card.position == 5 ? 'selected' : ''}>作者说明之后</option>
                          <option value="6" ${card.position == 6 ? 'selected' : ''}>@D◆[系统]在深度</option>
                          <option value="7" ${card.position == 7 ? 'selected' : ''}>@D[用户]在深度</option>
                          <option value="8" ${card.position == 8 ? 'selected' : ''}>@D[AI]在深度</option>
                      </select>
                  </div>
                  <div class="wb-sync-card-row card-depth-row" style="display: ${isDepthVisible ? 'flex' : 'none'};">
                      <span class="wb-sync-card-label">插入深度</span><input type="number" class="wb-sync-card-input card-depth" value="${card.depth}" min="0">
                  </div>
                  <div class="wb-sync-card-row">
                      <span class="wb-sync-card-label">递归设置</span>
                      <div style="display: flex; gap: 10px;">
                          <label class="wb-sync-checkbox-label"><input type="checkbox" class="card-prevent-in" ${card.preventIncoming ? 'checked' : ''}> 不可被递归</label>
                          <label class="wb-sync-checkbox-label"><input type="checkbox" class="card-prevent-out" ${card.preventOutgoing ? 'checked' : ''}> 防止进一步递归</label>
                      </div>
                  </div>
                  <div class="wb-sync-card-actions">
                      <button class="wb-sync-button wb-sync-btn-small sync-single-btn">同步此条目</button>
                      <button class="wb-sync-button wb-sync-btn-small abandon delete-card-btn">删除</button>
                  </div>
              </div>
          </div>
      `;
  });

  $cardsContainer.html(cardsHtml);
}

export function applyBatchSettings() {
  const mode = $batchMode.val(),
    pos = $batchPosition.val(),
    dep = $batchDepth.val();
  const pIn = $batchPreventIn.is(':checked'),
    pOut = $batchPreventOut.is(':checked');
  let updated = false;
  extractedCards.forEach(c => {
    if (mode !== '') {
      c.mode = mode;
      updated = true;
    }
    if (pos !== '') {
      c.position = pos;
      updated = true;
    }
    if (dep !== '') {
      c.depth = parseInt(dep) || 0;
      updated = true;
    }
    c.preventIncoming = pIn;
    c.preventOutgoing = pOut;
    updated = true;
  });
  if (updated) {
    renderCards();
    toastr.success('批量设置已应用');
  }
}

export function buildEntryData(cardData) {
  const isConstant = cardData.mode === 'constant';
  let positionObj = { type: 'before_author_note', order: 100 };
  const posInt = parseInt(cardData.position);
  if (posInt === 0) positionObj.type = 'before_character_definition';
  else if (posInt === 1) positionObj.type = 'after_character_definition';
  else if (posInt === 2) positionObj.type = 'before_example_messages';
  else if (posInt === 3) positionObj.type = 'after_example_messages';
  else if (posInt === 4) positionObj.type = 'before_author_note';
  else if (posInt === 5) positionObj.type = 'after_author_note';
  else if (posInt >= 6 && posInt <= 8) {
    positionObj.type = 'at_depth';
    positionObj.depth = parseInt(cardData.depth) || 4;
    if (posInt === 6) positionObj.role = 'system';
    else if (posInt === 7) positionObj.role = 'user';
    else if (posInt === 8) positionObj.role = 'assistant';
  }
  let keysArray =
    !isConstant && cardData.keys
      ? cardData.keys
          .split(',')
          .map(k => k.trim())
          .filter(k => k)
      : [];
  return {
    name: cardData.name || '未命名条目',
    content: cardData.content || '',
    enabled: true,
    strategy: { type: isConstant ? 'constant' : 'selective', keys: keysArray, scan_depth: 'same_as_global' },
    position: positionObj,
    probability: 100,
    recursion: {
      prevent_incoming: cardData.preventIncoming || false,
      prevent_outgoing: cardData.preventOutgoing || false,
      delay_until: null,
    },
    effect: { sticky: null, cooldown: null, delay: null },
  };
}

export async function syncEntries(cardsToSync, $btn = null) {
  const targetWb = $targetWbSelect.val();
  if (!targetWb) return toastr.warning('请先选择目标世界书');
  if (cardsToSync.length === 0) return toastr.warning('没有可同步的条目');
  if ($btn) $btn.prop('disabled', true).text('同步中...');
  try {
    const newEntries = cardsToSync.map(c => buildEntryData(c));
    await createLorebookEntries(targetWb, newEntries);
    toastr.success(`成功同步 ${newEntries.length} 个条目`);
    if ($btn) $btn.text('已同步').css({ 'border-color': 'var(--wb-sync-primary)', color: 'var(--wb-sync-primary)' });
  } catch (e) {
    toastr.error(`同步失败: ${e.message}`);
    if ($btn)
      $btn
        .prop('disabled', false)
        .text('同步失败')
        .css({ 'border-color': 'var(--wb-sync-danger)', color: 'var(--wb-sync-danger)' });
  }
}

export function removeCard(id) {
  extractedCards = extractedCards.filter(c => c.id !== id);
  renderCards();
}
