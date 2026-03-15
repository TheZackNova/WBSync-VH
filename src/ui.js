import { getAllLorebooks, getLorebookSettings } from './api.js';
import { escapeHtml } from './utils.js';
import { renderPresets } from './features/presets.js';
import { renderWorldBooks } from './features/worldbook.js';
import { populateModifyWorldbookSelect } from './features/entries.js';
import { populateTransferSelects } from './features/entries.js';
import { populateSyncWorldbooks } from './features/sync.js';
import { populateDuplicateSelect, populateRenameSelect, renderDeleteView } from './features/worldbook.js';

export const STORAGE_KEY_LAST_VIEW = 'wb-sync-last-view';

export let elements = {};

export function initUIElements() {
  elements = {
    loader: $('#wb-sync-loader'),
    mainView: $('#wb-sync-main-view'),
    selectView: $('#wb-sync-select-view'),
    modifyView: $('#wb-sync-modify-view'),
    deleteView: $('#wb-sync-delete-view'),
    transferView: $('#wb-sync-transfer-view'),
    syncView: $('#wb-sync-sync-view'),
    duplicateView: $('#wb-sync-duplicate-view'),
    renameView: $('#wb-sync-rename-view'),
    frontendView: $('#wb-sync-frontend-view'),
    scriptSyncView: $('#wb-sync-script-sync-view'),
    createRegexView: $('#wb-sync-create-regex-view'),
    createScriptView: $('#wb-sync-create-script-view'),
    settingsView: $('#wb-sync-settings-view'),
    overlay: $('#wb-sync-popup-overlay'),
  };
}

export function showLoader() {
  if (elements.loader) elements.loader.show();
}

export function hideLoader() {
  if (elements.loader) elements.loader.hide();
}

export function closePopup() {
  if (elements.overlay) elements.overlay.hide();
}

export function showPopup() {
  if (elements.overlay) elements.overlay.css('display', 'flex');
  const lastView = localStorage.getItem(STORAGE_KEY_LAST_VIEW);
  if (lastView && lastView !== 'wb-sync-main-view') {
    showSubView(lastView);
  } else {
    showMainView();
  }
}

export function showMainView() {
  elements.mainView.show();
  [
    elements.selectView,
    elements.modifyView,
    elements.deleteView,
    elements.transferView,
    elements.syncView,
    elements.duplicateView,
    elements.renameView,
    elements.frontendView,
    elements.createRegexView,
    elements.createScriptView,
    elements.scriptSyncView,
    elements.settingsView,
  ].forEach(v => v && v.hide());
  
  renderPresets();

  $('#wb-sync-header-title').text('世界书同步器 - 主菜单');
  $('#wb-sync-popup-back-btn').hide();
  localStorage.setItem(STORAGE_KEY_LAST_VIEW, 'wb-sync-main-view');

  const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
  if (isCharacterSelected) {
    $('#wb-sync-main-import-script-character-btn').show();
    $('#wb-sync-main-import-regex-character-btn').show();
  } else {
    $('#wb-sync-main-import-script-character-btn').hide();
    $('#wb-sync-main-import-regex-character-btn').hide();
  }
}

export async function showSubView(viewId) {
  elements.mainView.hide();
  [
    elements.selectView,
    elements.modifyView,
    elements.deleteView,
    elements.transferView,
    elements.syncView,
    elements.duplicateView,
    elements.renameView,
    elements.frontendView,
    elements.createRegexView,
    elements.createScriptView,
    elements.scriptSyncView,
    elements.settingsView,
  ].forEach(v => v && v.hide());

  let title = '世界书同步器';
  if (viewId === 'wb-sync-select-view') {
    title = '✅ 选择要启用的世界书';
    renderWorldBooks();
  }
  if (viewId === 'wb-sync-modify-view') {
    title = '📝 修改世界书条目';
    populateModifyWorldbookSelect();
  }
  if (viewId === 'wb-sync-transfer-view') {
    title = '🔄 条目迁移';
    populateTransferSelects();
  }
  if (viewId === 'wb-sync-sync-view') {
    title = '⚡ 世界书同步器';
    populateSyncWorldbooks();
  }
  if (viewId === 'wb-sync-duplicate-view') {
    title = '📑 复制世界书';
    populateDuplicateSelect();
  }
  if (viewId === 'wb-sync-rename-view') {
    title = '✏️ 修改名称';
    populateRenameSelect();
  }
  if (viewId === 'wb-sync-delete-view') {
    title = '🗑️ 删除世界书和条目';
    renderDeleteView();
  }
  if (viewId === 'wb-sync-frontend-view') title = '💻 前端同步器';
  if (viewId === 'wb-sync-script-sync-view') title = '💻 脚本同步器';
  if (viewId === 'wb-sync-create-regex-view') title = '💻 创建正则脚本';
  if (viewId === 'wb-sync-create-script-view') title = '💻 创建酒馆助手脚本';
  if (viewId === 'wb-sync-settings-view') title = '⚙️ 插件设置';

  $('#wb-sync-header-title').text(title);
  $('#wb-sync-popup-back-btn').show();
  $(`#${viewId}`).show();
  localStorage.setItem(STORAGE_KEY_LAST_VIEW, viewId);
}
