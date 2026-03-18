import { getAllLorebooks, getLorebookSettings } from './api.js';
import { escapeHtml } from './utils.js';
import { renderPresets } from './features/presets.js';
import { renderWorldBooks } from './features/worldbook.js';
import { populateModifyWorldbookSelect } from './features/entries.js';
import { populateTransferSelects } from './features/entries.js';
import { populateSyncWorldbooks } from './features/sync.js';
import { populateDuplicateSelect, populateRenameSelect, renderDeleteView } from './features/worldbook.js';
import { renderManageWorldbookList } from './features/manage-worldbook.js';
import { renderManageScriptLists } from './features/manage-scripts.js';
import { renderManageRegexLists } from './features/manage-regex.js';

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
    manageWbView: $('#wb-sync-manage-wb-view'),
    manageScriptView: $('#wb-sync-manage-script-view'),
    manageRegexView: $('#wb-sync-manage-regex-view'),
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
    elements.manageWbView,
    elements.manageScriptView,
    elements.manageRegexView,
  ].forEach(v => v && v.hide());
  
  renderPresets();

  $('#wb-sync-header-title').text('Đồng bộ Sổ thế giới - Menu chính');
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
    elements.manageWbView,
    elements.manageScriptView,
    elements.manageRegexView,
  ].forEach(v => v && v.hide());

  let title = 'Đồng bộ Sổ thế giới';
  if (viewId === 'wb-sync-select-view') {
    title = '✅ Chọn Sổ thế giới cần bật';
    renderWorldBooks();
  }
  if (viewId === 'wb-sync-modify-view') {
    title = '📝 Chỉnh sửa mục của Sổ thế giới';
    populateModifyWorldbookSelect();
  }
  if (viewId === 'wb-sync-transfer-view') {
    title = '🔄 Chuyển mục';
    populateTransferSelects();
  }
  if (viewId === 'wb-sync-sync-view') {
    title = '⚡ Đồng bộ Sổ thế giới';
    populateSyncWorldbooks();
  }
  if (viewId === 'wb-sync-duplicate-view') {
    title = '📑 Sao chép Sổ thế giới';
    populateDuplicateSelect();
  }
  if (viewId === 'wb-sync-rename-view') {
    title = '✏️ Đổi tên';
    populateRenameSelect();
  }
  if (viewId === 'wb-sync-delete-view') {
    title = '🗑️ Xóa Sổ thế giới và mục';
    renderDeleteView();
  }
  if (viewId === 'wb-sync-frontend-view') title = '💻 Trình đồng bộ frontend';
  if (viewId === 'wb-sync-script-sync-view') title = '💻 Trình đồng bộ script';
  if (viewId === 'wb-sync-create-regex-view') {
    title = '💻 Tạo script regex';
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $('#wb-sync-cr-import-character-btn').show();
    } else {
      $('#wb-sync-cr-import-character-btn').hide();
    }
  }
  if (viewId === 'wb-sync-create-script-view') {
    title = '💻 Tạo script Trợ lý Tavern';
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $('#wb-sync-cs-import-character-script-btn').show();
    } else {
      $('#wb-sync-cs-import-character-script-btn').hide();
    }
  }
  if (viewId === 'wb-sync-settings-view') title = '⚙️ Cài đặt tiện ích';
  if (viewId === 'wb-sync-manage-wb-view') {
    title = '📚 Quản lý Sổ thế giới';
    renderManageWorldbookList();
    $('#wb-sync-manage-wb-refresh-btn').show();
  } else {
    $('#wb-sync-manage-wb-refresh-btn').hide();
  }
  if (viewId === 'wb-sync-manage-script-view') {
    title = '🤖 Quản lý script Trợ lý Tavern';
    renderManageScriptLists();
    $('#wb-sync-manage-script-refresh-btn').show();
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $('#wb-sync-manage-script-character-list').closest('.wb-sync-manage-script-card').show();
    } else {
      $('#wb-sync-manage-script-character-list').closest('.wb-sync-manage-script-card').hide();
    }
  } else {
    $('#wb-sync-manage-script-refresh-btn').hide();
  }
  if (viewId === 'wb-sync-manage-regex-view') {
    title = '📋 Quản lý script regex';
    renderManageRegexLists();
    $('#wb-sync-manage-regex-refresh-btn').show();
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $('#wb-sync-manage-regex-character-list').closest('.wb-sync-manage-script-card').show();
    } else {
      $('#wb-sync-manage-regex-character-list').closest('.wb-sync-manage-script-card').hide();
    }
  } else {
    $('#wb-sync-manage-regex-refresh-btn').hide();
  }

  $('#wb-sync-header-title').text(title);
  $('#wb-sync-popup-back-btn').show();
  $(`#${viewId}`).show();
  localStorage.setItem(STORAGE_KEY_LAST_VIEW, viewId);
}
