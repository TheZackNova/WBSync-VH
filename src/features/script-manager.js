import { escapeHtml } from '../utils.js';
import { createDraggableList } from './draggable.js';
import { isManageScriptCollapsed } from './settings.js';

let $manageScriptGlobalList;
let $manageScriptPresetList;
let $manageScriptCharacterList;
let $manageScriptEditPanel;
let currentScripts = [];
let currentScriptId = '';
let currentScriptType = '';
let renderDebounceTimer = null;
let saveOrderDebounceTimer = null;
let draggableInstances = {};

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

  initDraggableLists();
}

function initDraggableLists() {
  const configs = [
    {
      $container: $manageScriptGlobalList,
      type: 'global',
      getItems: () => window.TavernHelper.getScriptTrees({ type: 'global' }) || [],
    },
    {
      $container: $manageScriptPresetList,
      type: 'preset',
      getItems: () => window.TavernHelper.getScriptTrees({ type: 'preset' }) || [],
    },
    {
      $container: $manageScriptCharacterList,
      type: 'character',
      getItems: () => window.TavernHelper.getScriptTrees({ type: 'character' }) || [],
    },
  ];

  configs.forEach(config => {
    draggableInstances[config.type] = createDraggableList({
      $container: config.$container,
      itemSelector: '.wb-sync-manage-script-item',
      getItems: config.getItems,
      setItems: () => {},
      onReorder: (items) => updateScriptsOrder(config.type, items),
    });
  });
}

function debouncedRender() {
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
  renderDebounceTimer = setTimeout(() => {
    renderManageScriptLists();
  }, 100);
}

export function renderManageScriptLists() {
  if (!window.TavernHelper) {
    const msg = '<div class="wb-sync-empty-msg">TavernHelper 未加载</div>';
    $manageScriptGlobalList.html(msg);
    $manageScriptPresetList.html(msg);
    $manageScriptCharacterList.html(msg);
    return;
  }

  const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
  
  const $characterCard = $('.wb-sync-manage-script-card-header[data-target="wb-sync-manage-script-character-list"]').closest('.wb-sync-manage-script-card');
  if (isCharacterSelected) {
    $characterCard.show();
  } else {
    $characterCard.hide();
  }

  try {
    const globalScripts = window.TavernHelper.getScriptTrees({ type: 'global' }) || [];
    const presetScripts = window.TavernHelper.getScriptTrees({ type: 'preset' }) || [];
    const characterScripts = window.TavernHelper.getScriptTrees({ type: 'character' }) || [];

    renderScriptList($manageScriptGlobalList, globalScripts, 'global');
    renderScriptList($manageScriptPresetList, presetScripts, 'preset');
    
    if (isCharacterSelected) {
      renderScriptList($manageScriptCharacterList, characterScripts, 'character');
    }
  } catch (e) {
    console.error('加载脚本失败:', e);
    $manageScriptGlobalList.html('<div class="wb-sync-empty-msg">加载失败</div>');
    $manageScriptPresetList.html('<div class="wb-sync-empty-msg">加载失败</div>');
    $manageScriptCharacterList.html('<div class="wb-sync-empty-msg">加载失败</div>');
  }
}

function renderScriptList($container, scripts, type) {
  if (scripts.length === 0) {
    $container.html('<div class="wb-sync-empty-msg">没有脚本。</div>');
    return;
  }

  const fragment = document.createDocumentFragment();
  scripts.forEach(script => {
    const div = document.createElement('div');
    div.className = 'wb-sync-manage-script-item';
    div.setAttribute('data-script-id', script.id);
    div.setAttribute('draggable', 'true');
    div.innerHTML = `
      <div class="wb-sync-manage-script-info">
        <input type="checkbox" class="wb-sync-manage-script-enabled" ${script.enabled !== false ? 'checked' : ''}>
        <span class="wb-sync-manage-script-name">${escapeHtml(script.name || '未命名脚本')}</span>
      </div>
      <div class="wb-sync-manage-script-actions">
        <button class="wb-sync-button wb-sync-btn-small wb-sync-manage-script-delete">删除</button>
      </div>
    `;
    fragment.appendChild(div);
  });
  $container.empty().append(fragment);
}

async function toggleScriptEnabled(scriptId, type, isEnabled) {
  try {
    await window.TavernHelper.updateScriptTreesWith(scripts => {
      const script = scripts.find(s => s.id === scriptId);
      if (script) script.enabled = isEnabled;
      return scripts;
    }, { type: type });
    toastr.success(isEnabled ? '已启用脚本' : '已禁用脚本');
  } catch (e) {
    toastr.error('更新失败：' + e.message);
    renderManageScriptLists();
  }
}

async function openScriptEditPanel(scriptId, type) {
  try {
    const scripts = await window.TavernHelper.getScriptTrees({ type: type }) || [];
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

    $manageScriptEditPanel.removeClass('collapsed').show();
    $manageScriptEditPanel.find('.wb-sync-manage-script-edit-title').text(`编辑${type === 'global' ? '全局' : type === 'preset' ? '预设' : '角色'}脚本`);
  } catch (e) {
    toastr.error('加载脚本失败：' + e.message);
  }
}

function hideScriptEditPanel() {
  $manageScriptEditPanel.removeClass('collapsed').hide();
  currentScriptId = '';
  currentScriptType = '';
}

async function handleSaveScript() {
  if (!currentScriptId || !currentScriptType) return;

  try {
    await window.TavernHelper.updateScriptTreesWith(scripts => {
      const script = scripts.find(s => s.id === currentScriptId);
      if (script) {
        script.name = $('#wb-sync-manage-script-name').val();
        script.content = $('#wb-sync-manage-script-content').val();
        script.info = $('#wb-sync-manage-script-info').val();
        script.enabled = $('#wb-sync-manage-script-enabled').is(':checked');
      }
      return scripts;
    }, { type: currentScriptType });

    toastr.success('保存成功！');
    hideScriptEditPanel();
    renderManageScriptLists();
  } catch (e) {
    toastr.error('保存失败：' + e.message);
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
  if (!confirm('确定删除此脚本？')) return;

  try {
    await window.TavernHelper.updateScriptTreesWith(scripts => {
      return scripts.filter(s => s.id !== scriptId);
    }, { type: type });

    toastr.success('删除成功');
    renderManageScriptLists();
    if (currentScriptId === scriptId) hideScriptEditPanel();
  } catch (e) {
    toastr.error('删除失败：' + e.message);
  }
}

function updateScriptsOrder(type, scripts) {
  if (saveOrderDebounceTimer) clearTimeout(saveOrderDebounceTimer);
  
  saveOrderDebounceTimer = setTimeout(async () => {
    try {
      await window.TavernHelper.updateScriptTreesWith(() => {
        return scripts;
      }, { type: type });
      
      toastr.success('排序已更新');
      renderManageScriptLists();
    } catch (e) {
      toastr.error('更新排序失败：' + e.message);
    }
  }, 300);
}

export function cleanup() {
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
  if (saveOrderDebounceTimer) clearTimeout(saveOrderDebounceTimer);
  Object.values(draggableInstances).forEach(instance => {
    if (instance) instance.destroy();
  });
  draggableInstances = {};
}