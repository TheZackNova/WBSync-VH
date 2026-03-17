import { escapeHtml } from '../utils.js';
import { isManageRegexCollapsed } from './settings.js';
import { getTavernRegexes, updateTavernRegexesWith } from '../api.js';

let $manageRegexGlobalList;
let $manageRegexPresetList;
let $manageRegexCharacterList;
let $manageRegexEditPanel;
let currentRegexes = [];
let currentRegexId = '';
let currentRegexType = '';
let renderDebounceTimer = null;

export function initManageRegex() {
  $manageRegexGlobalList = $('#wb-sync-manage-regex-global-list');
  $manageRegexPresetList = $('#wb-sync-manage-regex-preset-list');
  $manageRegexCharacterList = $('#wb-sync-manage-regex-character-list');
  $manageRegexEditPanel = $('#wb-sync-manage-regex-edit-panel');

  $('#wb-sync-manage-regex-refresh-btn').on('click', debouncedRender);
  $('#wb-sync-manage-regex-save-btn').on('click', handleSaveRegex);
  $('#wb-sync-manage-regex-cancel-btn').on('click', hideRegexEditPanel);
  $('#wb-sync-manage-regex-render-btn').on('click', handleRenderToFrontend);

  $('#wb-sync-manage-regex-edit-panel .wb-sync-edit-panel-header').on('click', function(e) {
    if ($(e.target).closest('.wb-sync-card-header-actions').length) return;
    const $panel = $(this).closest('.wb-sync-edit-panel-collapsible');
    $panel.toggleClass('collapsed');
  });

  $('#wb-sync-manage-regex-view').on('click', '.wb-sync-manage-script-card-header', function() {
    const targetId = $(this).data('target');
    if (targetId && targetId.startsWith('wb-sync-manage-regex')) {
      const $card = $(this).closest('.wb-sync-manage-script-card');
      $card.toggleClass('collapsed');
      const isCollapsed = $card.hasClass('collapsed');
      localStorage.setItem(`wb-sync-regex-card-${targetId}`, isCollapsed ? 'collapsed' : 'expanded');
    }
  });

  restoreRegexCardStates();

  $('#wb-sync-manage-regex-view').on('click', '.wb-sync-manage-regex-item', function(e) {
    if ($(e.target).hasClass('wb-sync-manage-regex-enabled') || 
        $(e.target).closest('.wb-sync-manage-regex-actions').length) {
      return;
    }
    const regexId = $(this).data('regex-id');
    const type = $(this).closest('.wb-sync-manage-script-card-content').attr('id').replace('wb-sync-manage-regex-', '').replace('-list', '');
    openRegexEditPanel(regexId, type);
  });

  $('#wb-sync-manage-regex-view').on('change', '.wb-sync-manage-regex-enabled', function(e) {
    e.stopPropagation();
    const regexId = $(this).closest('.wb-sync-manage-regex-item').data('regex-id');
    const isEnabled = $(this).is(':checked');
    const type = $(this).closest('.wb-sync-manage-script-card-content').attr('id').replace('wb-sync-manage-regex-', '').replace('-list', '');
    toggleRegexEnabled(regexId, type, isEnabled);
  });

  $('#wb-sync-manage-regex-view').on('click', '.wb-sync-manage-regex-delete', function(e) {
    e.stopPropagation();
    const regexId = $(this).closest('.wb-sync-manage-regex-item').data('regex-id');
    const type = $(this).closest('.wb-sync-manage-script-card-content').attr('id').replace('wb-sync-manage-regex-', '').replace('-list', '');
    deleteRegex(regexId, type);
  });

  $('#wb-sync-manage-regex-view').on('click', '.wb-sync-manage-regex-download', function(e) {
    e.stopPropagation();
    const regexId = $(this).closest('.wb-sync-manage-regex-item').data('regex-id');
    const type = $(this).closest('.wb-sync-manage-script-card-content').attr('id').replace('wb-sync-manage-regex-', '').replace('-list', '');
    downloadRegex(regexId, type);
  });

  $('#wb-sync-manage-regex-substitute-regex').on('change', function() {
    const val = $(this).val();
    $('#wb-sync-manage-regex-min-depth-container').css('display', val === '1' ? 'flex' : 'none');
    $('#wb-sync-manage-regex-max-depth-container').css('display', val === '1' ? 'flex' : 'none');
  });
}

function debouncedRender() {
  if (renderDebounceTimer) clearTimeout(renderDebounceTimer);
  renderDebounceTimer = setTimeout(() => {
    renderManageRegexLists();
  }, 100);
}

export async function renderManageRegexLists() {
  try {
    const globalRegexes = await getTavernRegexes({ type: 'global' }) || [];
    const presetRegexes = await getTavernRegexes({ type: 'preset', name: 'in_use' }) || [];
    const characterRegexes = await getTavernRegexes({ type: 'character', name: 'current' }) || [];

    renderRegexList($manageRegexGlobalList, globalRegexes, 'global');
    renderRegexList($manageRegexPresetList, presetRegexes, 'preset');
    renderRegexList($manageRegexCharacterList, characterRegexes, 'character');
  } catch (e) {
    console.error('加载正则失败:', e);
    $manageRegexGlobalList.html('<div class="wb-sync-empty-msg">加载失败</div>');
    $manageRegexPresetList.html('<div class="wb-sync-empty-msg">加载失败</div>');
    $manageRegexCharacterList.html('<div class="wb-sync-empty-msg">加载失败</div>');
  }
}

function renderRegexList($container, regexes, type) {
  if (regexes.length === 0) {
    $container.html('<div class="wb-sync-empty-msg">没有正则脚本。</div>');
    return;
  }

  const fragment = document.createDocumentFragment();
  regexes.forEach(regex => {
    const div = document.createElement('div');
    div.className = 'wb-sync-manage-regex-item';
    div.setAttribute('data-regex-id', regex.id);
    div.innerHTML = `
      <div class="wb-sync-manage-regex-info">
        <input type="checkbox" class="wb-sync-manage-regex-enabled" ${regex.enabled !== false ? 'checked' : ''}>
        <span class="wb-sync-manage-regex-name">${escapeHtml(regex.script_name || '未命名正则')}</span>
      </div>
      <div class="wb-sync-manage-regex-actions">
        <button class="wb-sync-button wb-sync-btn-small wb-sync-manage-regex-download">⬇️ 下载成正则脚本</button>
        <button class="wb-sync-button wb-sync-btn-small wb-sync-manage-regex-delete">删除</button>
      </div>
    `;
    fragment.appendChild(div);
  });
  $container.empty().append(fragment);
}

async function toggleRegexEnabled(regexId, type, isEnabled) {
  try {
    let targetOpt = { type: type };
    if (type === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
    if (type === 'character') targetOpt = { type: 'character', name: 'current' };

    await updateTavernRegexesWith(regexes => {
      const regex = regexes.find(r => r.id === regexId);
      if (regex) regex.enabled = isEnabled;
      return regexes;
    }, targetOpt);
    toastr.success(isEnabled ? '已启用正则' : '已禁用正则');
  } catch (e) {
    toastr.error('更新失败: ' + e.message);
    renderManageRegexLists();
  }
}

async function openRegexEditPanel(regexId, type) {
  try {
    let targetOpt = { type: type };
    if (type === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
    if (type === 'character') targetOpt = { type: 'character', name: 'current' };

    const regexes = await getTavernRegexes(targetOpt) || [];
    const regex = regexes.find(r => r.id === regexId);

    if (!regex) return;

    currentRegexes = regexes;
    currentRegexId = regexId;
    currentRegexType = type;

    $('#wb-sync-manage-regex-id').val(regex.id);
    $('#wb-sync-manage-regex-script-name').val(regex.script_name || '');
    $('#wb-sync-manage-regex-find-regex').val(regex.find_regex || '');
    $('#wb-sync-manage-regex-replace-string').val(regex.replace_string || '');
    $('#wb-sync-manage-regex-trim-strings').val(regex.trim_strings || '');
    $('#wb-sync-manage-regex-enabled').prop('checked', regex.enabled !== false);
    $('#wb-sync-manage-regex-run-on-edit').prop('checked', regex.run_on_edit || false);
    $('#wb-sync-manage-regex-substitute-regex').val(regex.substitute_regex || 0);
    $('#wb-sync-manage-regex-min-depth').val(regex.min_depth || '');
    $('#wb-sync-manage-regex-max-depth').val(regex.max_depth || '');

    $('.wb-sync-manage-regex-placement-cb').prop('checked', false);
    if (regex.source) {
      $('.wb-sync-manage-regex-placement-cb[value="1"]').prop('checked', regex.source.user_input);
      $('.wb-sync-manage-regex-placement-cb[value="2"]').prop('checked', regex.source.ai_output);
      $('.wb-sync-manage-regex-placement-cb[value="4"]').prop('checked', regex.source.slash_command);
      $('.wb-sync-manage-regex-placement-cb[value="3"]').prop('checked', regex.source.world_info);
      $('.wb-sync-manage-regex-placement-cb[value="5"]').prop('checked', regex.source.reasoning);
    }

    $('#wb-sync-manage-regex-markdown-only').prop('checked', regex.destination ? regex.destination.display : false);
    $('#wb-sync-manage-regex-prompt-only').prop('checked', regex.destination ? regex.destination.prompt : false);

    $('#wb-sync-manage-regex-min-depth-container').css('display', regex.substitute_regex === 1 ? 'flex' : 'none');
    $('#wb-sync-manage-regex-max-depth-container').css('display', regex.substitute_regex === 1 ? 'flex' : 'none');

    $manageRegexEditPanel.show();
    $manageRegexEditPanel.find('.wb-sync-manage-regex-edit-title').text(`编辑${type === 'global' ? '全局' : type === 'preset' ? '预设' : '局部'}正则`);
  } catch (e) {
    toastr.error('加载正则失败: ' + e.message);
  }
}

function hideRegexEditPanel() {
  $manageRegexEditPanel.hide();
  currentRegexId = '';
  currentRegexType = '';
}

async function handleSaveRegex() {
  if (!currentRegexId || !currentRegexType) return;

  try {
    let targetOpt = { type: currentRegexType };
    if (currentRegexType === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
    if (currentRegexType === 'character') targetOpt = { type: 'character', name: 'current' };

    await updateTavernRegexesWith(regexes => {
      const regex = regexes.find(r => r.id === currentRegexId);
      if (regex) {
        regex.script_name = $('#wb-sync-manage-regex-script-name').val();
        regex.find_regex = $('#wb-sync-manage-regex-find-regex').val();
        regex.replace_string = $('#wb-sync-manage-regex-replace-string').val();
        regex.trim_strings = $('#wb-sync-manage-regex-trim-strings').val();
        regex.enabled = $('#wb-sync-manage-regex-enabled').is(':checked');
        regex.run_on_edit = $('#wb-sync-manage-regex-run-on-edit').is(':checked');
        regex.substitute_regex = parseInt($('#wb-sync-manage-regex-substitute-regex').val()) || 0;
        regex.min_depth = $('#wb-sync-manage-regex-min-depth').val() !== '' ? parseInt($('#wb-sync-manage-regex-min-depth').val()) : null;
        regex.max_depth = $('#wb-sync-manage-regex-max-depth').val() !== '' ? parseInt($('#wb-sync-manage-regex-max-depth').val()) : null;

        regex.source = {
          user_input: $('.wb-sync-manage-regex-placement-cb[value="1"]').is(':checked'),
          ai_output: $('.wb-sync-manage-regex-placement-cb[value="2"]').is(':checked'),
          slash_command: $('.wb-sync-manage-regex-placement-cb[value="4"]').is(':checked'),
          world_info: $('.wb-sync-manage-regex-placement-cb[value="3"]').is(':checked'),
          reasoning: $('.wb-sync-manage-regex-placement-cb[value="5"]').is(':checked'),
        };

        regex.destination = {
          display: $('#wb-sync-manage-regex-markdown-only').is(':checked'),
          prompt: $('#wb-sync-manage-regex-prompt-only').is(':checked'),
        };
      }
      return regexes;
    }, targetOpt);

    toastr.success('保存成功！');
    hideRegexEditPanel();
    renderManageRegexLists();
  } catch (e) {
    toastr.error('保存失败: ' + e.message);
  }
}

function restoreRegexCardStates() {
  const cards = [
    'wb-sync-manage-regex-global-list',
    'wb-sync-manage-regex-preset-list',
    'wb-sync-manage-regex-character-list'
  ];

  const defaultCollapsed = isManageRegexCollapsed();

  cards.forEach(cardId => {
    const savedState = localStorage.getItem(`wb-sync-regex-card-${cardId}`);
    if (savedState === 'collapsed' || (savedState === null && defaultCollapsed)) {
      $(`.wb-sync-manage-script-card-header[data-target="${cardId}"]`).closest('.wb-sync-manage-script-card').addClass('collapsed');
    }
  });
}

function handleRenderToFrontend() {
  const $container = $('#wb-sync-manage-regex-preview-container');
  const $btn = $('#wb-sync-manage-regex-render-btn');

  if ($container.is(':visible')) {
    $container.empty().hide();
    $btn.html('👁️ 渲染');
    return;
  }

  let htmlContent = $('#wb-sync-manage-regex-replace-string').val();
  if (!htmlContent) {
    toastr.warning('没有可渲染的内容');
    return;
  }

  htmlContent = htmlContent.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '');

  const iframe = $('<iframe>', {
    srcdoc: htmlContent,
    style: 'width: 100%; height: 400px; border: none;',
  });
  $container.empty().append(iframe).show();
  $btn.html('🙈 取消渲染');
}

async function deleteRegex(regexId, type) {
  if (!confirm('确定删除此正则脚本？')) return;

  try {
    let targetOpt = { type: type };
    if (type === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
    if (type === 'character') targetOpt = { type: 'character', name: 'current' };

    await updateTavernRegexesWith(regexes => {
      return regexes.filter(r => r.id !== regexId);
    }, targetOpt);

    toastr.success('删除成功');
    renderManageRegexLists();
    if (currentRegexId === regexId) hideRegexEditPanel();
  } catch (e) {
    toastr.error('删除失败: ' + e.message);
  }
}

async function downloadRegex(regexId, type) {
  try {
    let targetOpt = { type: type };
    if (type === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
    if (type === 'character') targetOpt = { type: 'character', name: 'current' };

    const regexes = await getTavernRegexes(targetOpt) || [];
    const regex = regexes.find(r => r.id === regexId);
    if (!regex) return toastr.error('找不到正则脚本');

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(regex, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `regex-${regex.script_name || '未命名正则'}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  } catch (e) {
    toastr.error('下载失败: ' + e.message);
  }
}
