import { getAllLorebooks, getLorebookSettings, setLorebookSettings, getLorebookEntries, getTavernHelper } from '../api.js';
import { escapeHtml } from '../utils.js';
import { showLoader, hideLoader } from '../ui.js';
import { loadEntriesForSelectedBooks } from './entries.js';

let $bookList;
let $worldbookListContainer;
let $dupSourceSelect;
let $dupTargetInput;
let $dupSubmitBtn;
let $renameSourceSelect;
let $renameTargetInput;
let $renameSubmitBtn;

export function initWorldbook() {
  $bookList = $('#wb-sync-book-list');
  $worldbookListContainer = $('#wb-sync-worldbook-list-container');
  $dupSourceSelect = $('#wb-sync-dup-source-select');
  $dupTargetInput = $('#wb-sync-dup-target-input');
  $dupSubmitBtn = $('#wb-sync-duplicate-submit-btn');
  $renameSourceSelect = $('#wb-sync-rename-source-select');
  $renameTargetInput = $('#wb-sync-rename-target-input');
  $renameSubmitBtn = $('#wb-sync-rename-submit-btn');

  $('#wb-sync-delete-worldbook-btn').on('click', handleDeleteWorldbooks);
  $dupSubmitBtn.on('click', handleDuplicateWorldbook);
  $renameSubmitBtn.on('click', handleRenameWorldbook);

  $bookList.on('click', '.wb-sync-book-button', async function () {
    const $this = $(this);
    const bookFilename = $this.data('book-filename');
    const isSelected = $this.hasClass('selected');

    $this.toggleClass('selected');

    try {
      const curSettings = await getLorebookSettings();
      let enabled = curSettings.selected_global_lorebooks || [];

      if (isSelected) {
        enabled = enabled.filter(n => n !== bookFilename);
      } else if (!enabled.includes(bookFilename)) {
        enabled.push(bookFilename);
      }

      await setLorebookSettings({ selected_global_lorebooks: enabled });
    } catch (e) {
      $this.toggleClass('selected');
      toastr.error('更新世界书状态失败');
    }
  });

  $worldbookListContainer.on('click', '.wb-sync-book-button', function () {
    $(this).toggleClass('selected');
    loadEntriesForSelectedBooks();
  });
}

export async function renderWorldBooks() {
  $bookList.empty().append('<p>加载中...</p>');
  try {
    const [allBooks, settings] = await Promise.all([getAllLorebooks(), getLorebookSettings()]);
    const enabledBooks = new Set(settings.selected_global_lorebooks);

    if (allBooks.length === 0) {
      $bookList.html('<p>未找到任何世界书。</p>');
      return;
    }

    const buttonsHtml = allBooks.map(book => {
      const isEnabled = enabledBooks.has(book.file_name);
      return `<button class="wb-sync-book-button ${isEnabled ? 'selected' : ''}" data-book-filename="${escapeHtml(book.file_name)}">${escapeHtml(book.name)}</button>`;
    }).join('');

    $bookList.html(buttonsHtml);

  } catch (e) {
    $bookList.empty().append(`<p style="color:red;">加载失败: ${e.message}</p>`);
  }
}

export async function renderDeleteView() {
  try {
    const books = await getAllLorebooks();
    $worldbookListContainer.empty();
    if (books.length === 0) return $worldbookListContainer.append('<p>没有找到世界书。</p>');
    let html = '';
    books.forEach(b => {
      html += `<button class="wb-sync-book-button" data-book-name="${escapeHtml(b.file_name)}">${escapeHtml(b.name)}</button>`;
    });
    $worldbookListContainer.html(html);
  } catch (e) {
    toastr.error('加载失败');
  }
  loadEntriesForSelectedBooks();
}

export async function handleDeleteWorldbooks() {
  const selected = $worldbookListContainer
    .find('.selected')
    .map((_, el) => $(el).data('book-name'))
    .get();
  if (selected.length === 0) return toastr.warning('请选择要删除的世界书');
  if (confirm(`确定永久删除 ${selected.length} 个世界书？`)) {
    try {
      const api = await getTavernHelper();
      for (const name of selected) await api.deleteLorebook(name);
      toastr.success('删除成功');
      renderDeleteView();
    } catch (e) {
      toastr.error('删除失败');
    }
  }
}

export async function populateDuplicateSelect() {
  try {
    const books = await getAllLorebooks();
    $dupSourceSelect.empty().append('<option value="">--请选择源世界书--</option>');
    books.forEach(b => $dupSourceSelect.append(`<option value="${escapeHtml(b.file_name)}">${escapeHtml(b.name)}</option>`));
  } catch (e) {
    toastr.error('加载失败');
  }
}

export async function handleDuplicateWorldbook() {
  const source = $dupSourceSelect.val();
  const target = $dupTargetInput.val().trim();
  if (!source) return toastr.warning('请选择源世界书');
  if (!target) return toastr.warning('请输入新世界书名称');

  showLoader();
  $dupSubmitBtn.prop('disabled', true).text('复制中...');
  try {
    const api = await getTavernHelper();
    const entries = await getLorebookEntries(source);

    await api.createLorebook(target);

    const newEntries = entries.map(e => {
      const newE = { ...e };
      delete newE.uid;
      return newE;
    });

    await api.replaceLorebookEntries(target, newEntries);

    toastr.success(`成功复制世界书为 "${target}"`);
    $dupTargetInput.val('');
  } catch (e) {
    toastr.error(`复制失败: ${e.message}`);
  } finally {
    hideLoader();
    $dupSubmitBtn.prop('disabled', false).text('确认复制');
  }
}

export async function populateRenameSelect() {
  try {
    const books = await getAllLorebooks();
    $renameSourceSelect.empty().append('<option value="">--请选择要重命名的世界书--</option>');
    books.forEach(b => $renameSourceSelect.append(`<option value="${escapeHtml(b.file_name)}">${escapeHtml(b.name)}</option>`));
  } catch (e) {
    toastr.error('加载世界书列表失败');
  }
}

export async function handleRenameWorldbook() {
  const source = $renameSourceSelect.val();
  const newName = $renameTargetInput.val().trim();
  if (!source) return toastr.warning('请选择要重命名的世界书');
  if (!newName) return toastr.warning('请输入新名称');

  showLoader();
  $renameSubmitBtn.prop('disabled', true).text('重命名中...');
  try {
    const api = await getTavernHelper();
    const entries = await getLorebookEntries(source);
    await api.createLorebook(newName);
    const newEntries = entries.map(e => {
      const newE = { ...e };
      delete newE.uid;
      return newE;
    });
    await api.replaceLorebookEntries(newName, newEntries);
    await api.deleteLorebook(source);

    toastr.success(`成功将 "${source}" 重命名为 "${newName}"`);
    $renameTargetInput.val('');
    await populateRenameSelect();
  } catch (e) {
    toastr.error(`重命名失败: ${e.message}`);
  } finally {
    hideLoader();
    $renameSubmitBtn.prop('disabled', false).text('确认修改');
  }
}

export async function handleCreateWorldbook(callback) {
  const name = prompt('请输入新世界书的名称：');
  if (!name || !name.trim()) return;
  try {
    const api = await getTavernHelper();
    await api.createLorebook(name.trim());
    toastr.success(`世界书 "${name}" 创建成功！`);
    if (callback) await callback(name.trim());
  } catch (e) {
    toastr.error(`创建失败: ${e.message}`);
  }
}
