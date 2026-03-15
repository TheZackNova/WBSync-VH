import { getAllLorebooks, getLorebookEntries, setLorebookEntries, getTavernHelper } from '../api.js';
import { escapeHtml } from '../utils.js';
import { showLoader, hideLoader } from '../ui.js';

let $worldbookListContainer;
let $constantEntriesContainer;
let $normalEntriesContainer;
let $modifyWbSelect;
let $modifyEntrySelect;
let $modifyContent;
let $modifyDetails;
let $modName;
let $modKeys;
let $modContent;
let $modMode;
let $modPosition;
let $modDepthContainer;
let $modDepth;
let $modOrder;
let $modProb;
let $modPreventIn;
let $modPreventOut;
let $transSourceSelect;
let $transTargetSelect;
let $copySourceSelect;
let $copyTargetSelect;
let $transEntriesContainer;
let $copyEntriesContainer;
let $transSelectAllBtn;
let $copySelectAllBtn;
let $transBtn;
let $copyBtn;

export function initEntries() {
  $worldbookListContainer = $('#wb-sync-worldbook-list-container');
  $constantEntriesContainer = $('#wb-sync-constant-entries-container');
  $normalEntriesContainer = $('#wb-sync-normal-entries-container');
  $modifyWbSelect = $('#wb-sync-worldbook-select');
  $modifyEntrySelect = $('#wb-sync-entry-select');
  $modifyContent = $('#wb-sync-selected-entry-content');
  $modifyDetails = $('#wb-sync-modify-details');
  $modName = $('#wb-sync-mod-name');
  $modKeys = $('#wb-sync-mod-keys');
  $modContent = $('#wb-sync-mod-content');
  $modMode = $('#wb-sync-mod-mode');
  $modPosition = $('#wb-sync-mod-position');
  $modDepthContainer = $('#wb-sync-mod-depth-container');
  $modDepth = $('#wb-sync-mod-depth');
  $modOrder = $('#wb-sync-mod-order');
  $modProb = $('#wb-sync-mod-prob');
  $modPreventIn = $('#wb-sync-mod-prevent-in');
  $modPreventOut = $('#wb-sync-mod-prevent-out');
  $transSourceSelect = $('#wb-sync-source-worldbook-select');
  $transTargetSelect = $('#wb-sync-target-worldbook-select');
  $copySourceSelect = $('#wb-sync-copy-source-worldbook-select');
  $copyTargetSelect = $('#wb-sync-copy-target-worldbook-select');
  $transEntriesContainer = $('#wb-sync-source-entries-container');
  $copyEntriesContainer = $('#wb-sync-copy-source-entries-container');
  $transSelectAllBtn = $('#wb-sync-transfer-select-all-btn');
  $copySelectAllBtn = $('#wb-sync-copy-select-all-btn');
  $transBtn = $('#wb-sync-transfer-entries-btn');
  $copyBtn = $('#wb-sync-copy-entries-btn');

  $('#wb-sync-delete-entry-btn').on('click', handleDeleteEntries);
  $modifyWbSelect.on('change', populateModifyEntrySelect);
  $modifyEntrySelect.on('change', handleModifyEntryChange);
  $('#wb-sync-save-manual-changes-btn').on('click', handleManualSave);

  $modPosition.on('change', function () {
    const val = $(this).val();
    $modDepthContainer.css('display', val.startsWith('at_depth') ? 'flex' : 'none');
  });

  $transSourceSelect.on('change', renderSourceEntries);
  $transBtn.on('click', handleTransferEntries);
  $transSelectAllBtn.on('click', () => {
    const checkboxes = $transEntriesContainer.find('input[type="checkbox"]');
    const allChecked = checkboxes.length === checkboxes.filter(':checked').length;
    checkboxes.prop('checked', !allChecked);
  });

  $copySourceSelect.on('change', renderCopySourceEntries);
  $copyBtn.on('click', handleCopyEntries);
  $copySelectAllBtn.on('click', () => {
    const checkboxes = $copyEntriesContainer.find('input[type="checkbox"]');
    const allChecked = checkboxes.length === checkboxes.filter(':checked').length;
    checkboxes.prop('checked', !allChecked);
  });

  $constantEntriesContainer.on('click', '.wb-sync-book-button', function () {
    $(this).toggleClass('selected');
  });
  $normalEntriesContainer.on('click', '.wb-sync-book-button', function () {
    $(this).toggleClass('selected');
  });
}

export async function loadEntriesForSelectedBooks() {
  $constantEntriesContainer.empty();
  $normalEntriesContainer.empty();
  const selectedBooks = $worldbookListContainer.find('.selected');
  if (selectedBooks.length === 0) {
    $constantEntriesContainer.html('<p class="wb-sync-no-tasks">请先选择世界书。</p>');
    $normalEntriesContainer.html('');
    return;
  }

  try {
    const bookNames = selectedBooks.map((_, el) => $(el).data('book-name')).get();
    const allEntriesPromises = bookNames.map(bookName => getLorebookEntries(bookName).then(entries => ({ bookName, entries })));
    const results = await Promise.all(allEntriesPromises);

    let constantHtml = '';
    let normalHtml = '';

    results.forEach(({ bookName, entries }) => {
      entries.forEach(e => {
        const buttonHtml = `<button class="wb-sync-book-button" data-uid="${e.uid}" data-book-name="${escapeHtml(bookName)}" title="${escapeHtml(e.comment || `UID:${e.uid}`)}">${escapeHtml(e.comment || `UID:${e.uid}`)}</button>`;
        if (e.type === 'constant') {
          constantHtml += buttonHtml;
        } else {
          normalHtml += buttonHtml;
        }
      });
    });

    $constantEntriesContainer.html(constantHtml || '<p class="wb-sync-no-tasks">无蓝灯条目。</p>');
    $normalEntriesContainer.html(normalHtml || '<p class="wb-sync-no-tasks">无绿灯条目。</p>');

  } catch (e) {
    toastr.error('加载条目失败: ' + e.message);
    $constantEntriesContainer.html('<p style="color:red;">加载失败</p>');
    $normalEntriesContainer.html('');
  }
}

export async function handleDeleteEntries() {
  const selected = $('#wb-sync-constant-entries-container .selected, #wb-sync-normal-entries-container .selected');
  if (selected.length === 0) return toastr.warning('请选择要删除的条目');
  const toDelete = {};
  selected.each((_, el) => {
    const b = $(el).data('book-name'),
      u = parseInt($(el).data('uid'));
    if (!toDelete[b]) toDelete[b] = [];
    toDelete[b].push(u);
  });
  if (confirm(`确定永久删除 ${selected.length} 个条目？`)) {
    try {
      const api = await getTavernHelper();
      for (const b in toDelete) await api.deleteLorebookEntries(b, toDelete[b]);
      toastr.success('删除成功');
      loadEntriesForSelectedBooks();
    } catch (e) {
      toastr.error('删除失败');
    }
  }
}

export async function populateModifyWorldbookSelect() {
  try {
    const books = await getAllLorebooks();
    $modifyWbSelect.empty().append('<option value="">--请选择世界书--</option>');
    books.forEach(b =>
      $modifyWbSelect.append(`<option value="${escapeHtml(b.file_name)}">${escapeHtml(b.name)}</option>`),
    );
    $modifyEntrySelect.empty().append('<option value="">--先选择世界书--</option>');
  } catch (e) {
    $modifyWbSelect.empty().append('<option value="">加载失败</option>');
  }
}

export async function populateModifyEntrySelect() {
  const book = $modifyWbSelect.val();
  $modifyContent.val('');
  if (!book) return $modifyEntrySelect.empty().append('<option value="">--先选择世界书--</option>');
  $modifyEntrySelect.empty().append('<option value="">加载中...</option>');
  try {
    const entries = await getLorebookEntries(book);
    $modifyEntrySelect.data('entries', entries).empty();
    if (entries.length === 0) return $modifyEntrySelect.append('<option value="">无条目</option>');
    $modifyEntrySelect.append('<option value="">--选择条目--</option>');
    entries.forEach(e =>
      $modifyEntrySelect.append(`<option value="${e.uid}">${escapeHtml(e.comment || `UID:${e.uid}`)}</option>`),
    );
  } catch (e) {
    $modifyEntrySelect.empty().append('<option value="">加载失败</option>');
  }
}

export function handleModifyEntryChange() {
  const uid = $modifyEntrySelect.val(),
    entries = $modifyEntrySelect.data('entries') || [];

  if (uid) {
    const e = entries.find(x => x.uid == uid);
    if (e) {
      $modName.val(e.name || e.comment || '');
      $modKeys.val(
        e.strategy && e.strategy.keys ? e.strategy.keys.join(', ') : e.key ? e.key.join(', ') : '',
      );
      $modContent.val(e.content || '');

      const mode = e.strategy && e.strategy.type ? e.strategy.type : e.type === 'constant' ? 'constant' : 'selective';
      $modMode.val(mode);

      let posVal = 'before_author_note';
      let showDepth = false;

      if (e.position && e.position.type) {
        if (e.position.type === 'at_depth') {
          posVal = `at_depth_${e.position.role || 'system'}`;
          $modDepth.val(e.position.depth || 4);
          showDepth = true;
        } else {
          posVal = e.position.type;
        }
      } else if (e.position !== undefined) {
        const p = parseInt(e.position);
        if (p === 0) posVal = 'before_character_definition';
        else if (p === 1) posVal = 'after_character_definition';
        else if (p === 2) posVal = 'before_example_messages';
        else if (p === 3) posVal = 'after_example_messages';
        else if (p === 4) posVal = 'before_author_note';
        else if (p === 5) posVal = 'after_author_note';
        else if (p >= 6 && p <= 8) {
          posVal = p === 6 ? 'at_depth_system' : p === 7 ? 'at_depth_user' : 'at_depth_assistant';
          $modDepth.val(e.depth || 4);
          showDepth = true;
        }
      }

      $modPosition.val(posVal);
      $modDepthContainer.css('display', showDepth ? 'flex' : 'none');

      $modOrder.val(e.position && e.position.order !== undefined ? e.position.order : e.order || 100);
      $modProb.val(e.probability !== undefined ? e.probability : 100);

      const pIn = e.recursion ? e.recursion.prevent_incoming : e.prevent_recursion || false;
      const pOut = e.recursion ? e.recursion.prevent_outgoing : e.prevent_recursion || false;
      $modPreventIn.prop('checked', pIn);
      $modPreventOut.prop('checked', pOut);

      $modifyDetails.css('display', 'flex');
    }
  } else {
    $modifyDetails.hide();
  }
}

export async function handleManualSave() {
  const book = $modifyWbSelect.val(),
    uid = $modifyEntrySelect.val();
  if (!book || !uid) return alert('请选择世界书和条目');
  try {
    let entries = await getLorebookEntries(book);
    const idx = entries.findIndex(e => e.uid == uid);
    if (idx === -1) throw new Error('找不到条目');

    const e = entries[idx];
    e.name = $modName.val();
    e.comment = e.name;
    e.content = $modContent.val();

    const keysStr = $modKeys.val();
    const keysArr = keysStr
      ? keysStr
          .split(',')
          .map(k => k.trim())
          .filter(k => k)
      : [];

    if (!e.strategy) e.strategy = {};
    e.strategy.type = $modMode.val();
    e.strategy.keys = keysArr;
    e.type = e.strategy.type === 'constant' ? 'constant' : 'Normal';
    e.key = keysArr;

    const posVal = $modPosition.val();
    if (!e.position || typeof e.position !== 'object') e.position = { order: e.order || 100 };

    if (posVal.startsWith('at_depth')) {
      e.position.type = 'at_depth';
      e.position.role = posVal.split('_')[2];
      e.position.depth = parseInt($modDepth.val()) || 4;
    } else {
      e.position.type = posVal;
    }

    e.position.order = parseInt($modOrder.val()) || 100;
    e.order = e.position.order;

    e.probability = parseInt($modProb.val());
    if (isNaN(e.probability)) e.probability = 100;

    if (!e.recursion) e.recursion = {};
    e.recursion.prevent_incoming = $modPreventIn.is(':checked');
    e.recursion.prevent_outgoing = $modPreventOut.is(':checked');

    await setLorebookEntries(book, entries);
    alert('保存成功！');
    $modifyEntrySelect.data('entries', entries);
  } catch (e) {
    alert(`保存失败: ${e.message}`);
  }
}

export async function populateTransferSelects() {
  $transEntriesContainer.html('<p class="wb-sync-no-tasks">请先选择源世界书。</p>');
  $copyEntriesContainer.html('<p class="wb-sync-no-tasks">请先选择源世界书。</p>');
  if ($transSelectAllBtn) $transSelectAllBtn.hide();
  if ($copySelectAllBtn) $copySelectAllBtn.hide();
  try {
    const books = await getAllLorebooks();
    const ph = '<option value="">--请选择世界书--</option>';
    $transSourceSelect.empty().append(ph);
    $transTargetSelect.empty().append(ph);
    $copySourceSelect.empty().append(ph);
    $copyTargetSelect.empty().append(ph);
    books.forEach(b => {
      const opt = `<option value="${escapeHtml(b.file_name)}">${escapeHtml(b.name)}</option>`;
      $transSourceSelect.append(opt);
      $transTargetSelect.append(opt);
      $copySourceSelect.append(opt);
      $copyTargetSelect.append(opt);
    });
  } catch (e) {
    toastr.error('加载失败');
  }
}

export async function renderSourceEntries() {
  const src = $transSourceSelect.val();

  $transTargetSelect.find('option').prop('disabled', false);
  if (src) {
      $transTargetSelect.find(`option[value="${escapeHtml(src)}"]`).prop('disabled', true);
      if ($transTargetSelect.val() === src) $transTargetSelect.val('');
  }

  if (!src) {
      $transSelectAllBtn.hide();
      return $transEntriesContainer.html('<p class="wb-sync-no-tasks">请先选择源世界书。</p>');
  }
  $transEntriesContainer.html('<p>加载中...</p>');
  try {
    const entries = await getLorebookEntries(src);
    $transEntriesContainer.data('entries', entries).empty();
    if (entries.length === 0) {
        $transSelectAllBtn.hide();
        return $transEntriesContainer.html('<p class="wb-sync-no-tasks">无条目。</p>');
    }
    $transSelectAllBtn.show();
    let html = '';
    entries.forEach(e => {
      const id = `trans-entry-${e.uid}`;
      const blueIcon = '<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 2px solid black; background-color: #0078d7; margin-right: 6px; vertical-align: middle;" title="蓝灯 (常驻)"></span>';
      const greenIcon = '<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 2px solid black; background-color: #00cc00; margin-right: 6px; vertical-align: middle;" title="绿灯 (条件触发)"></span>';
      const typeTag = e.type === 'constant' ? blueIcon : greenIcon;
      const displayName = escapeHtml(e.comment || `UID:${e.uid}`);
      html += `
                  <div class="wb-sync-checkbox-item" title="${displayName}">
                      <input type="checkbox" id="${id}" value="${e.uid}">
                      <label for="${id}">${typeTag}${displayName}</label>
                  </div>
              `;
    });
    $transEntriesContainer.html(html);
  } catch (e) {
    $transSelectAllBtn.hide();
    $transEntriesContainer.html('<p style="color:red;">加载失败</p>');
  }
}

export async function renderCopySourceEntries() {
  const src = $copySourceSelect.val();

  $copyTargetSelect.find('option').prop('disabled', false);
  if (src) {
      $copyTargetSelect.find(`option[value="${escapeHtml(src)}"]`).prop('disabled', true);
      if ($copyTargetSelect.val() === src) $copyTargetSelect.val('');
  }

  if (!src) {
      $copySelectAllBtn.hide();
      return $copyEntriesContainer.html('<p class="wb-sync-no-tasks">请先选择源世界书。</p>');
  }
  $copyEntriesContainer.html('<p>加载中...</p>');
  try {
    const entries = await getLorebookEntries(src);
    $copyEntriesContainer.data('entries', entries).empty();
    if (entries.length === 0) {
        $copySelectAllBtn.hide();
        return $copyEntriesContainer.html('<p class="wb-sync-no-tasks">无条目。</p>');
    }
    $copySelectAllBtn.show();
    let html = '';
    entries.forEach(e => {
      const id = `copy-entry-${e.uid}`;
      const blueIcon = '<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 2px solid black; background-color: #0078d7; margin-right: 6px; vertical-align: middle;" title="蓝灯 (常驻)"></span>';
      const greenIcon = '<span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; border: 2px solid black; background-color: #00cc00; margin-right: 6px; vertical-align: middle;" title="绿灯 (条件触发)"></span>';
      const typeTag = e.type === 'constant' ? blueIcon : greenIcon;
      const displayName = escapeHtml(e.comment || `UID:${e.uid}`);
      html += `
                  <div class="wb-sync-checkbox-item" title="${displayName}">
                      <input type="checkbox" id="${id}" value="${e.uid}">
                      <label for="${id}">${typeTag}${displayName}</label>
                  </div>
              `;
    });
    $copyEntriesContainer.html(html);
  } catch (e) {
    $copySelectAllBtn.hide();
    $copyEntriesContainer.html('<p style="color:red;">加载失败</p>');
  }
}

export async function handleTransferEntries() {
  const src = $transSourceSelect.val(),
    tgt = $transTargetSelect.val();
  const uids = $transEntriesContainer
    .find('input:checked')
    .map((_, el) => $(el).val())
    .get();
  if (!src || !tgt) return toastr.warning('请选择源和目标');
  if (src === tgt) return toastr.warning('源和目标不能相同');
  if (uids.length === 0) return toastr.warning('请选择条目');

  showLoader();
  $transBtn.prop('disabled', true).text('迁移中...');
  try {
    const all = $transEntriesContainer.data('entries') || [];
    const toTrans = all.filter(e => uids.includes(String(e.uid)));

    const newEntries = toTrans.map(e => {
      const newE = { ...e };
      delete newE.uid;
      return newE;
    });

    const api = await getTavernHelper();

    await api.createLorebookEntries(tgt, newEntries);
    await api.deleteLorebookEntries(src, uids.map(uid => parseInt(uid)));

    toastr.success(`成功迁移 ${toTrans.length} 个条目`);
    $transEntriesContainer.find('input:checked').prop('checked', false);
    renderSourceEntries();
  } catch (e) {
    toastr.error(`迁移失败: ${e.message}`);
  } finally {
    hideLoader();
    $transBtn.prop('disabled', false).text('执行迁移');
  }
}

export async function handleCopyEntries() {
  const src = $copySourceSelect.val(),
    tgt = $copyTargetSelect.val();
  const uids = $copyEntriesContainer
    .find('input:checked')
    .map((_, el) => $(el).val())
    .get();
  if (!src || !tgt) return toastr.warning('请选择源和目标');
  if (src === tgt) return toastr.warning('源和目标不能相同');
  if (uids.length === 0) return toastr.warning('请选择条目');

  showLoader();
  $copyBtn.prop('disabled', true).text('复制中...');
  try {
    const all = $copyEntriesContainer.data('entries') || [];
    const toCopy = all.filter(e => uids.includes(String(e.uid)));

    const newEntries = toCopy.map(e => {
      const newE = { ...e };
      delete newE.uid;
      return newE;
    });

    const api = await getTavernHelper();

    await api.createLorebookEntries(tgt, newEntries);

    toastr.success(`成功复制 ${toCopy.length} 个条目`);
    $copyEntriesContainer.find('input:checked').prop('checked', false);
  } catch (e) {
    toastr.error(`复制失败: ${e.message}`);
  } finally {
    hideLoader();
    $copyBtn.prop('disabled', false).text('执行复制');
  }
}
