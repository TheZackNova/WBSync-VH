import { escapeHtml } from '../utils.js';
import { isManageScriptCollapsed } from './settings.js';
import { getScriptTrees, updateScriptTreesWith } from '../api.js';

let $manageScriptGlobalList;
let $manageScriptPresetList;
let $manageScriptCharacterList;
let $manageScriptEditPanel;
let currentScripts = [];
let currentScriptId = '';
let currentScriptType = '';
let renderDebounceTimer = null;

export function initManageScripts() {
  $manageScriptGlobalList = $('#wb-sync-manage-script-global-list');
  $manageScriptPresetList = $('#wb-sync-manage-script-preset-list');
  $manageScriptCharacterList = $('#wb-sync-manage-script-character-list');
  $manageScriptEditPanel = $('#wb-sync-manage-script-edit-panel');

  $('#wb-sync-manage-script-refresh-btn').on('click', debouncedRender);
  $('#wb-sync-manage-script-save-btn').on('click', handleSaveScript);
  $('#wb-sync-manage-script-cancel-btn').on('click', hideScriptEditPanel);

  $('#wb-sync-manage-script-edit-panel .wb-sync-edit-panel-header').on('click', function(e) {
    if ($(e.target).closest('.wb-sync-card-header-actions').length) return;
    const $panel = $(this).closest('.wb-sync-edit-panel-collapsible');
    $panel.toggleClass('collapsed');
  });

  $('#wb-sync-manage-script-view').on('click', '.wb-sync-manage-script-card-header', function() {
    const targetId = $(this).data('target');
    if (targetId && targetId.startsWith('wb-sync-manage-script')) {
      const $card = $(this).closest('.wb-sync-manage-script-card');
      $card.toggleClass('collapsed');
      const isCollapsed = $card.hasClass('collapsed');
      localStorage.setItem(`wb-sync-script-card-${targetId}`, isCollapsed ? 'collapsed' : 'expanded');
    }
  });

  restoreScriptCardStates();

  $('#wb-sync-manage-script-view').on('click', '.wb-sync-manage-script-item', function(e) {
    if ($(e.target).hasClass('wb-sync-manage-script-enabled') || 
        $(e.target).closest('.wb-sync-manage-script-actions').length) {
      return;
    }
    const scriptId = $(this).data('script-id');
    const type = $(this).closest('.wb-sync-manage-script-card-content').attr('id').replace('wb-sync-manage-script-', '').replace('-list', '');
    openScriptEditPanel(scriptId, type);
  });

  $('#wb-sync-manage-script-view').on('change', '.wb-sync-manage-script-enabled', function(e) {
    e.stopPropagation();
    const scriptId = $(this).closest('.wb-sync-manage-script-item').data('script-id');
    const isEnabled = $(this).is(':checked');
    const type = $(this).closest('.wb-sync-manage-script-card-content').attr('id').replace('wb-sync-manage-script-', '').replace('-list', '');
    toggleScriptEnabled(scriptId, type, isEnabled);
  });

  $('#wb-sync-manage-script-view').on('click', '.wb-sync-manage-script-delete', function(e) {
    e.stopPropagation();
    const scriptId = $(this).closest('.wb-sync-manage-script-item').data('script-id');
    const type = $(this).closest('.wb-sync-manage-script-card-content').attr('id').replace('wb-sync-manage-script-', '').replace('-list', '');
    deleteScript(scriptId, type);
  });

  $('#wb-sync-manage-script-view').on('click', '.wb-sync-manage-script-download', function(e) {
    e.stopPropagation();
    const scriptId = $(this).closest('.wb-sync-manage-script-item').data('script-id');
    const type = $(this).closest('.wb-sync-manage-script-card-content').attr('id').replace('wb-sync-manage-script-', '').replace('-list', '');
    downloadScript(scriptId, type);
  });
}

function debouncedRender() {
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
  renderDebounceTimer = setTimeout(() => {
    renderManageScriptLists();
  }, 100);
}

export async function renderManageScriptLists() {
  try {
    const globalScripts = await getScriptTrees({ type: 'global' }) || [];
    const presetScripts = await getScriptTrees({ type: 'preset' }) || [];
    const characterScripts = await getScriptTrees({ type: 'character' }) || [];

    renderScriptList($manageScriptGlobalList, globalScripts, 'global');
    renderScriptList($manageScriptPresetList, presetScripts, 'preset');
    renderScriptList($manageScriptCharacterList, characterScripts, 'character');
  } catch (e) {
    console.error('Tải script thất bại:', e);
    $manageScriptGlobalList.html('<div class="wb-sync-empty-msg">Tải thất bại</div>');
    $manageScriptPresetList.html('<div class="wb-sync-empty-msg">Tải thất bại</div>');
    $manageScriptCharacterList.html('<div class="wb-sync-empty-msg">Tải thất bại</div>');
  }
}

function renderScriptList($container, scripts, type) {
  if (scripts.length === 0) {
    $container.html('<div class="wb-sync-empty-msg">Không có script.</div>');
    return;
  }

  const fragment = document.createDocumentFragment();
  scripts.forEach(script => {
    const div = document.createElement('div');
    div.className = 'wb-sync-manage-script-item';
    div.setAttribute('data-script-id', script.id);
    div.innerHTML = `
      <div class="wb-sync-manage-script-info">
        <input type="checkbox" class="wb-sync-manage-script-enabled" ${script.enabled !== false ? 'checked' : ''}>
        <span class="wb-sync-manage-script-name">${escapeHtml(script.name || 'Script chưa có tên')}</span>
      </div>
      <div class="wb-sync-manage-script-actions">
        <button class="wb-sync-button wb-sync-btn-small wb-sync-manage-script-download">⬇️ Tải xuống</button>
        <button class="wb-sync-button wb-sync-btn-small wb-sync-manage-script-delete">Xóa</button>
      </div>
    `;
    fragment.appendChild(div);
  });
  $container.empty().append(fragment);
}

async function toggleScriptEnabled(scriptId, type, isEnabled) {
  try {
    await updateScriptTreesWith(scripts => {
      const script = scripts.find(s => s.id === scriptId);
      if (script) script.enabled = isEnabled;
      return scripts;
    }, { type: type });
    toastr.success(isEnabled ? 'Đã bật script' : 'Đã tắt script');
  } catch (e) {
    toastr.error('Cập nhật thất bại: ' + e.message);
    renderManageScriptLists();
  }
}

async function openScriptEditPanel(scriptId, type) {
  try {
    const scripts = await getScriptTrees({ type: type }) || [];
    const script = scripts.find(s => s.id === scriptId);
    if (!script) return;

    currentScripts = scripts;
    currentScriptId = scriptId;
    currentScriptType = type;

    $('#wb-sync-manage-script-id').val(script.id);
    $('#wb-sync-manage-script-name').val(script.name || '');
    $('#wb-sync-manage-script-content').val(script.content || '');
    $('#wb-sync-manage-script-info').val(script.info || '');
    $('#wb-sync-manage-script-enabled').prop('checked', script.enabled !== false);

    $manageScriptEditPanel.show();
    $manageScriptEditPanel.find('.wb-sync-manage-script-edit-title').text(`Sửa script ${type === 'global' ? 'Toàn cục' : type === 'preset' ? 'Preset' : 'Nhân vật'}`);
  } catch (e) {
    toastr.error('Tải script thất bại: ' + e.message);
  }
}

function hideScriptEditPanel() {
  $manageScriptEditPanel.hide();
  currentScriptId = '';
  currentScriptType = '';
}

async function handleSaveScript() {
  if (!currentScriptId || !currentScriptType) return;

  try {
    await updateScriptTreesWith(scripts => {
      const script = scripts.find(s => s.id === currentScriptId);
      if (script) {
        script.name = $('#wb-sync-manage-script-name').val();
        script.content = $('#wb-sync-manage-script-content').val();
        script.info = $('#wb-sync-manage-script-info').val();
        script.enabled = $('#wb-sync-manage-script-enabled').is(':checked');
      }
      return scripts;
    }, { type: currentScriptType });

    toastr.success('Lưu thành công!');
    hideScriptEditPanel();
    renderManageScriptLists();
  } catch (e) {
    toastr.error('Lưu thất bại: ' + e.message);
  }
}

function restoreScriptCardStates() {
  const cards = [
    'wb-sync-manage-script-global-list',
    'wb-sync-manage-script-preset-list',
    'wb-sync-manage-script-character-list'
  ];

  const defaultCollapsed = isManageScriptCollapsed();

  cards.forEach(cardId => {
    const savedState = localStorage.getItem(`wb-sync-script-card-${cardId}`);
    if (savedState === 'collapsed' || (savedState === null && defaultCollapsed)) {
      $(`.wb-sync-manage-script-card-header[data-target="${cardId}"]`).closest('.wb-sync-manage-script-card').addClass('collapsed');
    }
  });
}

async function deleteScript(scriptId, type) {
  if (!confirm('Xác nhận xóa script này?')) return;

  try {
    await updateScriptTreesWith(scripts => {
      return scripts.filter(s => s.id !== scriptId);
    }, { type: type });

    toastr.success('Xóa thành công');
    renderManageScriptLists();
    if (currentScriptId === scriptId) hideScriptEditPanel();
  } catch (e) {
    toastr.error('Xóa thất bại: ' + e.message);
  }
}

async function downloadScript(scriptId, type) {
  try {
    const scripts = await getScriptTrees({ type: type }) || [];
    const script = scripts.find(s => s.id === scriptId);
    if (!script) return toastr.error('Không tìm thấy script');

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(script, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `Script Trợ lý Tavern-${script.name || 'Script chưa có tên'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  } catch (e) {
    toastr.error('Tải xuống thất bại: ' + e.message);
  }
}
