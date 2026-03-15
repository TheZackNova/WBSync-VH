import { setLorebookSettings } from '../api.js';
import { escapeHtml } from '../utils.js';

const PRESET_STORAGE_KEY = 'wb_sync_presets';

let $presetListContainer;

export function initPresets() {
  $presetListContainer = $('#wb-sync-preset-list-container');
  
  $('#wb-sync-save-preset-btn').on('click', () => {
    const name = prompt('请输入方案名称：');
    if (!name) return;
    const books = $('.wb-sync-book-button.selected')
      .map((_, el) => $(el).data('book-filename'))
      .get();
    if (books.length === 0) return alert('请至少选择一个世界书！');
    savePreset({ name, books });
    alert('保存成功！');
    renderPresets();
  });
}

export function getPresets() {
  return JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY)) || [];
}

export function savePreset(preset) {
  const presets = getPresets();
  const idx = presets.findIndex(p => p.name === preset.name);
  if (idx > -1) presets[idx] = preset;
  else presets.push(preset);
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
}

export function deletePreset(name) {
  localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(getPresets().filter(p => p.name !== name)));
  renderPresets();
}

export function renderPresets() {
  if (!$presetListContainer) $presetListContainer = $('#wb-sync-preset-list-container');
  const presets = getPresets();
  $presetListContainer.empty().hide();
  if (presets.length === 0) return;
  presets.forEach(p => {
    const item = $(
      `<div class="wb-sync-preset-item"><span>${escapeHtml(p.name)}</span><div><button class="wb-sync-delete-preset-btn">&times;</button></div></div>`,
    );
    item.on('click', async e => {
      if (!$(e.target).hasClass('wb-sync-delete-preset-btn')) {
        try {
          await setLorebookSettings({ selected_global_lorebooks: [] });
          await setLorebookSettings({ selected_global_lorebooks: p.books });
          toastr.success('预设加载成功！');
        } catch (err) {
          toastr.error('加载失败');
        }
      }
    });
    item.find('.wb-sync-delete-preset-btn').on('click', e => {
      e.stopPropagation();
      if (confirm(`确定删除预设 "${p.name}"?`)) deletePreset(p.name);
    });
    $presetListContainer.append(item);
  });
  $presetListContainer.show();
}
