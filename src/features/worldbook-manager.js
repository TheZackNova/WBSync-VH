import { getAllLorebooks, getLorebookEntries, setLorebookEntries, getLorebookSettings, getTavernHelper } from '../api.js';
import { escapeHtml } from '../utils.js';
import { isManageWbCollapsed } from './settings.js';

let $manageWbList;
let $manageWbEntriesList;
let $manageWbEditPanel;
let currentEntries = [];
let currentBookName = '';
let renderDebounceTimer = null;

export function initManageWorldbook() {
  $manageWbList = $('#wb-sync-manage-wb-list');
  $manageWbEntriesList = $('#wb-sync-manage-wb-entries-list');
  $manageWbEditPanel = $('#wb-sync-manage-wb-edit-panel');

  $('#wb-sync-manage-wb-refresh-btn').on('click', debouncedRender);
  $('#wb-sync-manage-wb-create-btn').on('click', handleCreateWorldbook);
  $('#wb-sync-manage-wb-delete-btn').on('click', handleDeleteSelectedWorldbooks);
  $('#wb-sync-manage-wb-select-all-btn').on('click', toggleSelectAllWorldbooks);

  $('#wb-sync-manage-wb-entry-create-btn').on('click', handleCreateEntry);
  $('#wb-sync-manage-wb-entry-delete-btn').on('click', handleDeleteSelectedEntries);
  $('#wb-sync-manage-wb-entry-select-all-btn').on('click', toggleSelectAllEntries);
  $('#wb-sync-manage-wb-save-entry-btn').on('click', handleSaveEntry);
  $('#wb-sync-manage-wb-cancel-entry-btn').on('click', hideEntryEditPanel);

  $('#wb-sync-manage-wb-view').on('click', '.wb-sync-manage-script-card-header', function() {
    const targetId = $(this).data('target');
    if (targetId && targetId.startsWith('wb-sync-manage-wb')) {
      const $card = $(this).closest('.wb-sync-manage-script-card');
      $card.toggleClass('collapsed');
      const isCollapsed = $card.hasClass('collapsed');
      localStorage.setItem(`wb-sync-wb-card-${targetId}`, isCollapsed ? 'collapsed' : 'expanded');
    }
  });

  restoreWbCardStates();

  $('#wb-sync-manage-wb-view').on('click', '.wb-sync-manage-wb-item', function(e) {
    if ($(e.target).hasClass('wb-sync-manage-wb-checkbox') || 
        $(e.target).closest('.wb-sync-manage-wb-actions').length) {
      return;
    }
    const bookName = $(this).data('book-name');
    loadWorldbookEntries(bookName);
  });

  $('#wb-sync-manage-wb-view').on('change', '.wb-sync-manage-wb-checkbox', function(e) {
    e.stopPropagation();
    const bookName = $(this).closest('.wb-sync-manage-wb-item').data('book-name');
    const isChecked = $(this).is(':checked');
    toggleWorldbookEnabled(bookName, isChecked);
  });

  $('#wb-sync-manage-wb-view').on('click', '.wb-sync-manage-wb-delete', function(e) {
    e.stopPropagation();
    const bookName = $(this).closest('.wb-sync-manage-wb-item').data('book-name');
    deleteSingleWorldbook(bookName);
  });

  $('#wb-sync-manage-wb-view').on('click', '.wb-sync-manage-entry-item', function(e) {
    if ($(e.target).hasClass('wb-sync-manage-entry-checkbox') || 
        $(e.target).closest('.wb-sync-manage-entry-actions').length) {
      return;
    }
    const uid = $(this).data('uid');
    openEntryEditPanel(uid);
  });

  $('#wb-sync-manage-wb-view').on('click', '.wb-sync-manage-entry-delete', function(e) {
    e.stopPropagation();
    const uid = $(this).closest('.wb-sync-manage-entry-item').data('uid');
    deleteSingleEntry(uid);
  });

  $('#wb-sync-manage-wb-entry-position').on('change', function() {
    const val = $(this).val();
    $('#wb-sync-manage-wb-entry-depth-container').css('display', val.startsWith('at_depth') ? 'flex' : 'none');
  });
}

function debouncedRender() {
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
  renderDebounceTimer = setTimeout(() => {
    renderManageWorldbookList();
  }, 100);
}

export async function renderManageWorldbookList() {
  $manageWbList.html('<div class="wb-sync-empty-msg">加载中...</div>');
  try {
    const [books, settings] = await Promise.all([getAllLorebooks(), getLorebookSettings()]);
    const enabledBooks = new Set(settings.selected_global_lorebooks);

    if (books.length === 0) {
      $manageWbList.html('<div class="wb-sync-empty-msg">未找到任何世界书。</div>');
      return;
    }

    const fragment = document.createDocumentFragment();
    books.forEach(book => {
      const isEnabled = enabledBooks.has(book.file_name);
      const div = document.createElement('div');
      div.className = 'wb-sync-manage-wb-item';
      div.setAttribute('data-book-name', book.file_name);
      div.innerHTML = `
        <div class="wb-sync-manage-wb-info">
          <input type="checkbox" class="wb-sync-manage-wb-checkbox" ${isEnabled ? 'checked' : ''} title="启用/禁用">
          <span class="wb-sync-manage-wb-name">${escapeHtml(book.name)}</span>
        </div>
        <div class="wb-sync-manage-wb-actions">
          <button class="wb-sync-button wb-sync-btn-small wb-sync-manage-wb-delete">删除</button>
        </div>
      `;
      fragment.appendChild(div);
    });

    $manageWbList.empty().append(fragment);
  } catch (e) {
    $manageWbList.html(`<div class="wb-sync-empty-msg" style="color:red;">加载失败：${e.message}</div>`);
  }
}

async function toggleWorldbookEnabled(bookName, isEnabled) {
  try {
    const curSettings = await getLorebookSettings();
    let enabled = curSettings.selected_global_lorebooks || [];

    if (isEnabled) {
      if (!enabled.includes(bookName)) enabled.push(bookName);
    } else {
      enabled = enabled.filter(n => n !== bookName);
    }

    await setLorebookSettings({ selected_global_lorebooks: enabled });
    toastr.success(isEnabled ? '已启用世界书' : '已禁用世界书');
  } catch (e) {
    toastr.error('更新失败：' + e.message);
    renderManageWorldbookList();
  }
}

async function loadWorldbookEntries(bookName) {
  currentBookName = bookName;
  $manageWbEntriesList.html('<div class="wb-sync-empty-msg">加载中...</div>');
  $manageWbList.find('.wb-sync-manage-wb-item').removeClass('active');
  $manageWbList.find(`[data-book-name="${escapeHtml(bookName)}"]`).addClass('active');
  hideEntryEditPanel();

  try {
    const entries = await getLorebookEntries(bookName);
    const savedOrder = JSON.parse(localStorage.getItem(`wb-sync-entries-order-${bookName}`) || '[]');
    
    if (savedOrder.length > 0) {
      const entryMap = new Map();
      entries.forEach(entry => entryMap.set(String(entry.uid), entry));
      const sortedEntries = [];
      savedOrder.forEach(uid => {
        const entry = entryMap.get(String(uid));
        if (entry) sortedEntries.push(entry);
      });
      entries.forEach(entry => {
        if (!sortedEntries.find(e => e.uid === entry.uid)) {
          sortedEntries.push(entry);
        }
      });
      currentEntries = sortedEntries;
    } else {
      entries.sort((a, b) => {
        const orderA = a.position?.order ?? a.order ?? 100;
        const orderB = b.position?.order ?? b.order ?? 100;
        return orderA - orderB;
      });
      currentEntries = entries;
    }

    if (currentEntries.length === 0) {
      $manageWbEntriesList.html('<div class="wb-sync-empty-msg">该世界书没有条目。</div>');
      return;
    }

    renderEntriesList(currentEntries);
  } catch (e) {
    $manageWbEntriesList.html(`<div class="wb-sync-empty-msg" style="color:red;">加载失败：${e.message}</div>`);
  }
}

function getPositionLabel(entry) {
  const pos = entry.position || {};
  const type = pos.type || 'before_author_note';
  const labels = {
    'before_character_definition': '角色定义之前',
    'after_character_definition': '角色定义之后',
    'before_example_messages': '示例消息前',
    'after_example_messages': '示例消息后',
    'before_author_note': '作者说明之前',
    'after_author_note': '作者说明之后',
    'at_depth': `@D${pos.depth || 4}`
  };
  return labels[type] || type;
}

function renderEntriesList(entries) {
  const fragment = document.createDocumentFragment();
  entries.forEach(entry => {
    const isConstant = entry.type === 'constant' || (entry.strategy && entry.strategy.type === 'constant');
    const typeLabel = isConstant ? '<span class="wb-sync-badge wb-sync-badge-blue">蓝灯</span>' : '<span class="wb-sync-badge wb-sync-badge-green">绿灯</span>';
    const posLabel = getPositionLabel(entry);
    const order = entry.position?.order || entry.order || 100;
    const prob = entry.probability !== undefined ? entry.probability : 100;
    const div = document.createElement('div');
    div.className = 'wb-sync-manage-entry-item';
    div.setAttribute('data-uid', entry.uid);
    div.innerHTML = `
      <div class="wb-sync-manage-entry-info">
        <input type="checkbox" class="wb-sync-manage-entry-checkbox" data-uid="${entry.uid}">
        ${typeLabel}
        <span class="wb-sync-manage-entry-name">${escapeHtml(entry.comment || entry.name || `UID:${entry.uid}`)}</span>
        <span class="wb-sync-entry-meta" style="margin-left: 10px; color: var(--wb-sync-text-muted); font-size: 0.85em;">
          ${posLabel} · 顺序${order} · 概率${prob}%
        </span>
      </div>
      <div class="wb-sync-manage-entry-actions">
        <button class="wb-sync-button wb-sync-btn-small wb-sync-manage-entry-delete">删除</button>
      </div>
    `;
    fragment.appendChild(div);
  });
  $manageWbEntriesList.empty().append(fragment);
}

function openEntryEditPanel(uid) {
  const entry = currentEntries.find(e => e.uid == uid);
  if (!entry) return;

  $('#wb-sync-manage-wb-entry-uid').val(entry.uid);
  $('#wb-sync-manage-wb-entry-name').val(entry.comment || entry.name || '');
  
  const keys = entry.strategy && entry.strategy.keys ? entry.strategy.keys : (entry.key || []);
  $('#wb-sync-manage-wb-entry-keys').val(keys.join(', '));
  $('#wb-sync-manage-wb-entry-content').val(entry.content || '');

  const mode = entry.strategy && entry.strategy.type ? entry.strategy.type : (entry.type === 'constant' ? 'constant' : 'selective');
  $('#wb-sync-manage-wb-entry-mode').val(mode);

  let posVal = 'before_author_note';
  let showDepth = false;
  if (entry.position && entry.position.type) {
    if (entry.position.type === 'at_depth') {
      posVal = `at_depth_${entry.position.role || 'system'}`;
      $('#wb-sync-manage-wb-entry-depth').val(entry.position.depth || 4);
      showDepth = true;
    } else {
      posVal = entry.position.type;
    }
  }
  $('#wb-sync-manage-wb-entry-position').val(posVal);
  $('#wb-sync-manage-wb-entry-depth-container').css('display', showDepth ? 'flex' : 'none');

  $('#wb-sync-manage-wb-entry-order').val(entry.position && entry.position.order !== undefined ? entry.position.order : (entry.order || 100));
  $('#wb-sync-manage-wb-entry-prob').val(entry.probability !== undefined ? entry.probability : 100);

  const pIn = entry.recursion ? entry.recursion.prevent_incoming : (entry.prevent_recursion || false);
  const pOut = entry.recursion ? entry.recursion.prevent_outgoing : (entry.prevent_recursion || false);
  $('#wb-sync-manage-wb-entry-prevent-in').prop('checked', pIn);
  $('#wb-sync-manage-wb-entry-prevent-out').prop('checked', pOut);

  $manageWbEditPanel.show();
}

function hideEntryEditPanel() {
  $manageWbEditPanel.hide();
  $('#wb-sync-manage-wb-entry-uid').val('');
}

async function handleSaveEntry() {
  const uid = $('#wb-sync-manage-wb-entry-uid').val();
  if (!uid || !currentBookName) return;

  try {
    const entries = await getLorebookEntries(currentBookName);
    const idx = entries.findIndex(e => e.uid == uid);
    if (idx === -1) throw new Error('找不到条目');

    const e = entries[idx];
    e.comment = $('#wb-sync-manage-wb-entry-name').val();
    e.name = e.comment;
    e.content = $('#wb-sync-manage-wb-entry-content').val();

    const keysStr = $('#wb-sync-manage-wb-entry-keys').val();
    const keysArr = keysStr ? keysStr.split(',').map(k => k.trim()).filter(k => k) : [];

    if (!e.strategy) e.strategy = {};
    e.strategy.type = $('#wb-sync-manage-wb-entry-mode').val();
    e.strategy.keys = keysArr;
    e.type = e.strategy.type === 'constant' ? 'constant' : 'Normal';
    e.key = keysArr;

    const posVal = $('#wb-sync-manage-wb-entry-position').val();
    if (!e.position || typeof e.position !== 'object') e.position = { order: e.order || 100 };

    if (posVal.startsWith('at_depth')) {
      e.position.type = 'at_depth';
      e.position.role = posVal.split('_')[2];
      e.position.depth = parseInt($('#wb-sync-manage-wb-entry-depth').val()) || 4;
    } else {
      e.position.type = posVal;
    }

    e.position.order = parseInt($('#wb-sync-manage-wb-entry-order').val()) || 100;
    e.order = e.position.order;
    e.probability = parseInt($('#wb-sync-manage-wb-entry-prob').val());
    if (isNaN(e.probability)) e.probability = 100;

    if (!e.recursion) e.recursion = {};
    e.recursion.prevent_incoming = $('#wb-sync-manage-wb-entry-prevent-in').is(':checked');
    e.recursion.prevent_outgoing = $('#wb-sync-manage-wb-entry-prevent-out').is(':checked');

    await setLorebookEntries(currentBookName, entries);
    toastr.success('保存成功！');
    hideEntryEditPanel();
    loadWorldbookEntries(currentBookName);
  } catch (e) {
    toastr.error('保存失败：' + e.message);
  }
}

async function handleCreateEntry() {
  if (!currentBookName) return toastr.warning('请先选择世界书');
  
  const name = prompt('请输入条目名称：');
  if (!name) return;

  try {
    const entries = await getLorebookEntries(currentBookName);
    const newEntry = {
      name: name,
      comment: name,
      content: '',
      enabled: true,
      strategy: { type: 'selective', keys: [], scan_depth: 'same_as_global' },
      position: { type: 'before_author_note', order: 100 },
      probability: 100,
      recursion: { prevent_incoming: false, prevent_outgoing: false, delay_until: null },
      effect: { sticky: null, cooldown: null, delay: null },
    };
    entries.push(newEntry);
    await setLorebookEntries(currentBookName, entries);
    toastr.success('创建成功！');
    loadWorldbookEntries(currentBookName);
  } catch (e) {
    toastr.error('创建失败：' + e.message);
  }
}

function restoreWbCardStates() {
  const cards = [
    'wb-sync-manage-wb-books-card',
    'wb-sync-manage-wb-entries-card'
  ];

  const defaultCollapsed = isManageWbCollapsed();

  cards.forEach(cardId => {
    const savedState = localStorage.getItem(`wb-sync-wb-card-${cardId}`);
    if (savedState === 'collapsed' || (savedState === null && defaultCollapsed)) {
      $(`.wb-sync-manage-script-card-header[data-target="${cardId}"]`).closest('.wb-sync-manage-script-card').addClass('collapsed');
    }
  });
}

async function handleCreateWorldbook() {
  const name = prompt('请输入新世界书的名称：');
  if (!name || !name.trim()) return;
  try {
    const api = await getTavernHelper();
    await api.createWorldbook(name.trim());
    toastr.success(`世界书 "${name}" 创建成功！`);
    renderManageWorldbookList();
  } catch (e) {
    toastr.error(`创建失败：${e.message}`);
  }
}

async function deleteSingleWorldbook(bookName) {
  if (!confirm(`确定删除世界书 "${bookName}"？`)) return;
  try {
    const api = await getTavernHelper();
    await api.deleteWorldbook(bookName);
    toastr.success('删除成功');
    renderManageWorldbookList();
    $manageWbEntriesList.html('<div class="wb-sync-empty-msg">请先在左侧选择世界书。</div>');
    hideEntryEditPanel();
    currentBookName = '';
    currentEntries = [];
  } catch (e) {
    toastr.error('删除失败：' + e.message);
  }
}

async function handleDeleteSelectedWorldbooks() {
  const selected = $manageWbList.find('.wb-sync-manage-wb-checkbox:checked').closest('.wb-sync-manage-wb-item');
  if (selected.length === 0) return toastr.warning('请选择要删除的世界书');
  
  const bookNames = selected.map((_, el) => $(el).data('book-name')).get();
  if (!confirm(`确定删除 ${bookNames.length} 个世界书？`)) return;

  try {
    const api = await getTavernHelper();
    for (const name of bookNames) {
      await api.deleteWorldbook(name);
    }
    toastr.success('删除成功');
    renderManageWorldbookList();
    $manageWbEntriesList.html('<div class="wb-sync-empty-msg">请先在左侧选择世界书。</div>');
    hideEntryEditPanel();
    currentBookName = '';
    currentEntries = [];
  } catch (e) {
    toastr.error('删除失败：' + e.message);
  }
}

function toggleSelectAllWorldbooks() {
  const checkboxes = $manageWbList.find('.wb-sync-manage-wb-checkbox');
  const allChecked = checkboxes.length === checkboxes.filter(':checked').length;
  checkboxes.prop('checked', !allChecked);
}

async function deleteSingleEntry(uid) {
  if (!currentBookName) return;
  if (!confirm('确定删除此条目？')) return;

  try {
    const api = await getTavernHelper();
    await api.deleteWorldbookEntries(currentBookName, entry => entry.uid === parseInt(uid), { render: 'debounced' });
    toastr.success('删除成功');
    loadWorldbookEntries(currentBookName);
  } catch (e) {
    toastr.error('删除失败：' + e.message);
  }
}

async function handleDeleteSelectedEntries() {
  if (!currentBookName) return toastr.warning('请先选择世界书');
  
  const selected = $manageWbEntriesList.find('.wb-sync-manage-entry-checkbox:checked');
  if (selected.length === 0) return toastr.warning('请选择要删除的条目');

  const uids = selected.map((_, el) => parseInt($(el).data('uid'))).get();
  if (!confirm(`确定删除 ${uids.length} 个条目？`)) return;

  try {
    const api = await getTavernHelper();
    await api.deleteWorldbookEntries(currentBookName, entry => uids.includes(entry.uid), { render: 'debounced' });
    toastr.success('删除成功');
    loadWorldbookEntries(currentBookName);
  } catch (e) {
    toastr.error('删除失败：' + e.message);
  }
}

function toggleSelectAllEntries() {
  const checkboxes = $manageWbEntriesList.find('.wb-sync-manage-entry-checkbox');
  const allChecked = checkboxes.length === checkboxes.filter(':checked').length;
  checkboxes.prop('checked', !allChecked);
}

export function cleanup() {
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
}