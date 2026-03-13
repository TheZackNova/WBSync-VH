// SillyTavern 插件：世界书同步器 (整合版)
// 作者：倾心
// 版本：1.0.0

jQuery(async () => {
  const MODULE_NAME = '世界书同步器';
  const extensionFolderPath = `scripts/extensions/third-party/WBSync`;

  // --- 1. 状态变量 ---
  const PRESET_STORAGE_KEY = 'wb_sync_presets';
  const STORAGE_KEY_BUTTON_POS = 'wb-sync-btn-pos';
  const STORAGE_KEY_TAG_START = 'wb-sync-tag-start-val';
  const STORAGE_KEY_TAG_END = 'wb-sync-tag-end-val';
  const STORAGE_KEY_LAST_VIEW = 'wb-sync-last-view';

  let mainView,
    selectView,
    modifyView,
    deleteView,
    transferView,
    syncView,
    duplicateView,
    renameView,
    frontendView,
    createRegexView,
    createScriptView,
    scriptSyncView,
    readmeView,
    loader;
  let bookList, presetListContainer, overlay;
  let worldbookListContainer, constantEntriesContainer, normalEntriesContainer;

  // 修改条目视图
  let modifyWbSelect,
    modifyEntrySelect,
    modifyUserPrompt,
    modifyAiResponse,
    modifyContent,
    modifySubmitBtn,
    modifySaveBtn;
  // 迁移视图
  let transSourceSelect, transTargetSelect, transEntriesContainer, transBtn;

  // 同步器视图 (我们的核心功能)
  let extractedCards = [];
  let $cardsContainer, $targetWbSelect;

  // --- 2. 工具函数 & API 封装 ---
  const escapeHtml = unsafe => {
    if (unsafe === null || typeof unsafe === 'undefined') return '';
    // 使用 jQuery 的 text() 方法来安全地转义 HTML
    return $('<div>').text(String(unsafe)).html();
  };

  const delay = ms => new Promise(res => setTimeout(res, ms));

  async function waitForTavernHelper(retries = 10, interval = 300) {
    for (let i = 0; i < retries; i++) {
      if (window.TavernHelper && typeof window.TavernHelper.getLorebooks === 'function') {
        return window.TavernHelper;
      }
      await delay(interval);
    }
    throw new Error('TavernHelper API 未加载，请确保已安装并启用 JS-Slash-Runner 扩展。');
  }

  let tavernHelperApi;

  async function getAllLorebooks() {
    if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
    const names = await tavernHelperApi.getLorebooks();
    return names.map(name => ({ name, file_name: name }));
  }

  async function getLorebookSettings() {
    if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
    return await tavernHelperApi.getLorebookSettings();
  }

  async function setLorebookSettings(settings) {
    if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
    await tavernHelperApi.setLorebookSettings(settings);
  }

  async function getLorebookEntries(bookName) {
    if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
    return await tavernHelperApi.getLorebookEntries(bookName);
  }

  async function setLorebookEntries(bookName, entries) {
    if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
    await tavernHelperApi.replaceLorebookEntries(bookName, entries);
  }

  async function createLorebookEntry(bookName, entryData) {
    if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
    return await tavernHelperApi.createLorebookEntry(bookName, entryData);
  }

  // --- 3. 视图管理 ---
  function showPopup() {
    if (overlay) overlay.css('display', 'flex');
    const lastView = localStorage.getItem(STORAGE_KEY_LAST_VIEW);
    if (lastView && lastView !== 'wb-sync-main-view') {
      showSubView(lastView);
    } else {
      showMainView();
    }
  }

  function showLoader() {
    if(loader) loader.show();
  }

  function hideLoader() {
    if(loader) loader.hide();
  }

  function closePopup() {
    if (overlay) overlay.hide();
  }

  function showMainView() {
    mainView.show();
    [
      selectView,
      modifyView,
      deleteView,
      transferView,
      syncView,
      duplicateView,
      renameView,
      frontendView,
      createRegexView,
      createScriptView,
      scriptSyncView,
    ].forEach(v => v && v.hide());
    renderPresets();

    $('#wb-sync-header-title').text('世界书同步器 - 主菜单');
    $('#wb-sync-popup-back-btn').hide();
    localStorage.setItem(STORAGE_KEY_LAST_VIEW, 'wb-sync-main-view');

    // 检查是否在角色卡中，以决定是否显示角色/局部相关的导入按钮
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $('#wb-sync-main-import-script-character-btn').show();
      $('#wb-sync-main-import-regex-character-btn').show();
    } else {
      $('#wb-sync-main-import-script-character-btn').hide();
      $('#wb-sync-main-import-regex-character-btn').hide();
    }
  }

  async function showSubView(viewId) {
    mainView.hide();
    [
      selectView,
      modifyView,
      deleteView,
      transferView,
      syncView,
      duplicateView,
      renameView,
      frontendView,
      createRegexView,
      createScriptView,
      scriptSyncView,
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
    if (viewId === 'wb-sync-readme-view') {
      title = '📄 插件说明';
      loadReadme();
    }

    $('#wb-sync-header-title').text(title);
    $('#wb-sync-popup-back-btn').show();
    $(`#${viewId}`).show();
    localStorage.setItem(STORAGE_KEY_LAST_VIEW, viewId);
  }

  // --- 4. 悬浮球与入口管理 ---
  function initFloatingButton() {
    const $btn = $('#wb-sync-floating-btn');

    function enforceBounds() {
      if (!$btn.length) return;
      const maxLeft = $(window).width() - $btn.outerWidth();
      const maxTop = $(window).height() - $btn.outerHeight();
      let pos = $btn.position();
      let newLeft = Math.max(0, Math.min(pos.left, maxLeft));
      let newTop = Math.max(0, Math.min(pos.top, maxTop));
      $btn.css({ left: `${newLeft}px`, top: `${newTop}px`, right: 'auto', bottom: 'auto' });
    }

    const savedPos = JSON.parse(localStorage.getItem(STORAGE_KEY_BUTTON_POS));
    if (savedPos) {
      $btn.css({ top: savedPos.top, left: savedPos.left, right: 'auto', bottom: 'auto' });
      // 延迟一下确保DOM渲染完毕后再限制边界
      setTimeout(enforceBounds, 100);
    } else {
      $btn.css({ bottom: '20px', right: '20px' });
    }

    $(window).on('resize', enforceBounds);

    let isDragging = false,
      offset = { x: 0, y: 0 },
      wasDragged = false;

    $btn.on('mousedown touchstart', e => {
      isDragging = true;
      wasDragged = false;
      const touch = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
      const rect = $btn[0].getBoundingClientRect();
      offset = { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    });

    $(document).on('mousemove touchmove', e => {
      if (!isDragging) return;
      wasDragged = true;
      e.preventDefault();
      const touch = e.originalEvent.touches ? e.originalEvent.touches[0] : e;
      let newLeft = touch.clientX - offset.x;
      let newTop = touch.clientY - offset.y;
      const maxLeft = $(window).width() - $btn.outerWidth();
      const maxTop = $(window).height() - $btn.outerHeight();
      $btn.css({
        left: `${Math.max(0, Math.min(newLeft, maxLeft))}px`,
        top: `${Math.max(0, Math.min(newTop, maxTop))}px`,
        right: 'auto',
        bottom: 'auto',
      });
    });

    $(document).on('mouseup touchend', () => {
      if (!isDragging) return;
      isDragging = false;
      localStorage.setItem(STORAGE_KEY_BUTTON_POS, JSON.stringify({ top: $btn.css('top'), left: $btn.css('left') }));
    });

    $btn.on('click', e => {
      if (wasDragged) e.preventDefault();
      else showPopup();
    });
  }

  // --- 5. 全局世界书 & 预设逻辑 ---
  async function renderWorldBooks() {
    bookList.empty().append('<p>加载中...</p>');
    try {
      const [allBooks, settings] = await Promise.all([getAllLorebooks(), getLorebookSettings()]);
      const enabledBooks = new Set(settings.selected_global_lorebooks);

      if (allBooks.length === 0) {
        bookList.html('<p>未找到任何世界书。</p>');
        return;
      }

      const buttonsHtml = allBooks.map(book => {
        const isEnabled = enabledBooks.has(book.file_name);
        return `<button class="wb-sync-book-button ${isEnabled ? 'selected' : ''}" data-book-filename="${escapeHtml(book.file_name)}">${escapeHtml(book.name)}</button>`;
      }).join('');

      bookList.html(buttonsHtml);

    } catch (e) {
      bookList.empty().append(`<p style="color:red;">加载失败: ${e.message}</p>`);
    }
  }

  function getPresets() {
    return JSON.parse(localStorage.getItem(PRESET_STORAGE_KEY)) || [];
  }
  function savePreset(preset) {
    const presets = getPresets();
    const idx = presets.findIndex(p => p.name === preset.name);
    if (idx > -1) presets[idx] = preset;
    else presets.push(preset);
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(presets));
  }
  function deletePreset(name) {
    localStorage.setItem(PRESET_STORAGE_KEY, JSON.stringify(getPresets().filter(p => p.name !== name)));
    renderPresets();
  }
  function renderPresets() {
    const presets = getPresets();
    presetListContainer.empty().hide();
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
      presetListContainer.append(item);
    });
    presetListContainer.show();
  }

  // --- 6. 删除视图逻辑 ---
  async function renderDeleteView() {
    try {
      const books = await getAllLorebooks();
      worldbookListContainer.empty();
      if (books.length === 0) return worldbookListContainer.append('<p>没有找到世界书。</p>');
      books.forEach(b => {
        const btn = $('<button></button>')
          .addClass('wb-sync-book-button')
          .text(b.name)
          .data('book-name', b.file_name)
          .on('click', function () {
            $(this).toggleClass('selected');
            loadEntriesForSelectedBooks();
          });
        worldbookListContainer.append(btn);
      });
    } catch (e) {
      toastr.error('加载失败');
    }
    loadEntriesForSelectedBooks();
  }

  async function loadEntriesForSelectedBooks() {
    constantEntriesContainer.empty();
    normalEntriesContainer.empty();
    const selectedBooks = worldbookListContainer.find('.selected');
    if (selectedBooks.length === 0) {
      constantEntriesContainer.html('<p class="wb-sync-no-tasks">请先选择世界书。</p>');
      normalEntriesContainer.html('');
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
                const buttonHtml = `<button class="wb-sync-book-button" data-uid="${e.uid}" data-book-name="${escapeHtml(bookName)}">${escapeHtml(e.comment || `UID:${e.uid}`)}</button>`;
                if (e.type === 'constant') {
                    constantHtml += buttonHtml;
                } else {
                    normalHtml += buttonHtml;
                }
            });
        });

        constantEntriesContainer.html(constantHtml || '<p class="wb-sync-no-tasks">无蓝灯条目。</p>');
        normalEntriesContainer.html(normalHtml || '<p class="wb-sync-no-tasks">无绿灯条目。</p>');

    } catch (e) {
        toastr.error('加载条目失败: ' + e.message);
        constantEntriesContainer.html('<p style="color:red;">加载失败</p>');
        normalEntriesContainer.html('');
    }
  }

  async function handleDeleteWorldbooks() {
    const selected = worldbookListContainer
      .find('.selected')
      .map((_, el) => $(el).data('book-name'))
      .get();
    if (selected.length === 0) return toastr.warning('请选择要删除的世界书');
    if (confirm(`确定永久删除 ${selected.length} 个世界书？`)) {
      try {
        if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
        for (const name of selected) await tavernHelperApi.deleteLorebook(name);
        toastr.success('删除成功');
        renderDeleteView();
      } catch (e) {
        toastr.error('删除失败');
      }
    }
  }

  async function handleDeleteEntries() {
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
        if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
        for (const b in toDelete) await tavernHelperApi.deleteLorebookEntries(b, toDelete[b]);
        toastr.success('删除成功');
        loadEntriesForSelectedBooks();
      } catch (e) {
        toastr.error('删除失败');
      }
    }
  }

  // --- 7. 迁移视图逻辑 ---
  async function populateTransferSelects() {
    transEntriesContainer.html('<p class="wb-sync-no-tasks">请先选择源世界书。</p>');
    try {
      const books = await getAllLorebooks();
      const ph = '<option value="">--请选择世界书--</option>';
      transSourceSelect.empty().append(ph);
      transTargetSelect.empty().append(ph);
      books.forEach(b => {
        const opt = `<option value="${escapeHtml(b.file_name)}">${escapeHtml(b.name)}</option>`;
        transSourceSelect.append(opt);
        transTargetSelect.append(opt);
      });
    } catch (e) {
      toastr.error('加载失败');
    }
  }

  async function renderSourceEntries() {
    const src = transSourceSelect.val();
    if (!src) return transEntriesContainer.html('<p class="wb-sync-no-tasks">请先选择源世界书。</p>');
    transEntriesContainer.html('<p>加载中...</p>');
    try {
      const entries = await getLorebookEntries(src);
      transEntriesContainer.data('entries', entries).empty();
      if (entries.length === 0) return transEntriesContainer.html('<p class="wb-sync-no-tasks">无条目。</p>');
      entries.forEach(e => {
        const id = `trans-entry-${e.uid}`;
        transEntriesContainer.append(`
                    <div class="wb-sync-checkbox-item">
                        <input type="checkbox" id="${id}" value="${e.uid}">
                        <label for="${id}">${escapeHtml(e.comment || `UID:${e.uid}`)}</label>
                    </div>
                `);
      });
    } catch (e) {
      transEntriesContainer.html('<p style="color:red;">加载失败</p>');
    }
  }

  async function handleTransferEntries() {
    const src = transSourceSelect.val(),
      tgt = transTargetSelect.val();
    const uids = transEntriesContainer
      .find('input:checked')
      .map((_, el) => $(el).val())
      .get();
    if (!src || !tgt) return toastr.warning('请选择源和目标');
    if (src === tgt) return toastr.warning('源和目标不能相同');
    if (uids.length === 0) return toastr.warning('请选择条目');

    showLoader();
    transBtn.prop('disabled', true).text('迁移中...');
    try {
      const all = transEntriesContainer.data('entries') || [];
      const toTrans = all.filter(e => uids.includes(String(e.uid)));

      // 使用 Promise.all 并行创建条目
      const createPromises = toTrans.map(e => {
        const newE = { ...e };
        delete newE.uid;
        return createLorebookEntry(tgt, newE);
      });
      await Promise.all(createPromises);

      toastr.success(`成功迁移 ${toTrans.length} 个条目`);
      transEntriesContainer.find('input:checked').prop('checked', false);
    } catch (e) {
      toastr.error(`迁移失败: ${e.message}`);
    } finally {
      hideLoader();
      transBtn.prop('disabled', false).text('执行迁移');
    }
  }

  // --- 7.5 复制视图逻辑 ---
  async function populateDuplicateSelect() {
    try {
      const books = await getAllLorebooks();
      const $select = $('#wb-sync-dup-source-select');
      $select.empty().append('<option value="">--请选择源世界书--</option>');
      books.forEach(b => $select.append(`<option value="${escapeHtml(b.file_name)}">${escapeHtml(b.name)}</option>`));
    } catch (e) {
      toastr.error('加载失败');
    }
  }

  async function handleDuplicateWorldbook() {
    const source = $('#wb-sync-dup-source-select').val();
    const target = $('#wb-sync-dup-target-input').val().trim();
    if (!source) return toastr.warning('请选择源世界书');
    if (!target) return toastr.warning('请输入新世界书名称');

    showLoader();
    const $btn = $('#wb-sync-duplicate-submit-btn');
    $btn.prop('disabled', true).text('复制中...');
    try {
      if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
      const entries = await getLorebookEntries(source);

      // 创建新世界书
      await tavernHelperApi.createLorebook(target);

      // 复制条目 (去除 uid 让系统重新生成)
      const newEntries = entries.map(e => {
        const newE = { ...e };
        delete newE.uid;
        return newE;
      });

      // 写入新世界书
      await tavernHelperApi.replaceLorebookEntries(target, newEntries);

      toastr.success(`成功复制世界书为 "${target}"`);
      $('#wb-sync-dup-target-input').val('');
    } catch (e) {
      toastr.error(`复制失败: ${e.message}`);
    } finally {
      hideLoader();
      $btn.prop('disabled', false).text('确认复制');
    }
  }

  // --- 7.6 重命名视图逻辑 ---
  async function populateRenameSelect() {
    try {
      const books = await getAllLorebooks();
      const $select = $('#wb-sync-rename-source-select');
      $select.empty().append('<option value="">--请选择要重命名的世界书--</option>');
      books.forEach(b => $select.append(`<option value="${escapeHtml(b.file_name)}">${escapeHtml(b.name)}</option>`));
    } catch (e) {
      toastr.error('加载世界书列表失败');
    }
  }

  async function handleRenameWorldbook() {
    const source = $('#wb-sync-rename-source-select').val();
    const newName = $('#wb-sync-rename-target-input').val().trim();
    if (!source) return toastr.warning('请选择要重命名的世界书');
    if (!newName) return toastr.warning('请输入新名称');

    showLoader();
    const $btn = $('#wb-sync-rename-submit-btn');
    $btn.prop('disabled', true).text('重命名中...');
    try {
      if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
      // TavernHelper 没有直接重命名的 API，所以我们通过 复制 -> 删除 的方式实现
      const entries = await getLorebookEntries(source);
      await tavernHelperApi.createLorebook(newName);
      const newEntries = entries.map(e => {
        const newE = { ...e };
        delete newE.uid;
        return newE;
      });
      await tavernHelperApi.replaceLorebookEntries(newName, newEntries);
      await tavernHelperApi.deleteLorebook(source);

      toastr.success(`成功将 "${source}" 重命名为 "${newName}"`);
      $('#wb-sync-rename-target-input').val('');
      // 重新填充下拉列表
      await populateRenameSelect();
    } catch (e) {
      toastr.error(`重命名失败: ${e.message}`);
    } finally {
      hideLoader();
      $btn.prop('disabled', false).text('确认修改');
    }
  }

  // --- 8. 修改视图逻辑 ---
  async function populateModifyWorldbookSelect() {
    try {
      const books = await getAllLorebooks();
      modifyWbSelect.empty().append('<option value="">--请选择世界书--</option>');
      books.forEach(b =>
        modifyWbSelect.append(`<option value="${escapeHtml(b.file_name)}">${escapeHtml(b.name)}</option>`),
      );
      modifyEntrySelect.empty().append('<option value="">--先选择世界书--</option>');
    } catch (e) {
      modifyWbSelect.empty().append('<option value="">加载失败</option>');
    }
  }

  async function populateModifyEntrySelect() {
    const book = modifyWbSelect.val();
    modifyContent.val('');
    if (!book) return modifyEntrySelect.empty().append('<option value="">--先选择世界书--</option>');
    modifyEntrySelect.empty().append('<option value="">加载中...</option>');
    try {
      const entries = await getLorebookEntries(book);
      modifyEntrySelect.data('entries', entries).empty();
      if (entries.length === 0) return modifyEntrySelect.append('<option value="">无条目</option>');
      modifyEntrySelect.append('<option value="">--选择条目--</option>');
      entries.forEach(e =>
        modifyEntrySelect.append(`<option value="${e.uid}">${escapeHtml(e.comment || `UID:${e.uid}`)}</option>`),
      );
    } catch (e) {
      modifyEntrySelect.empty().append('<option value="">加载失败</option>');
    }
  }

  function handleModifyEntryChange() {
    const uid = modifyEntrySelect.val(),
      entries = modifyEntrySelect.data('entries') || [];
    const $details = $('#wb-sync-modify-details');

    if (uid) {
      const e = entries.find(x => x.uid == uid);
      if (e) {
        $('#wb-sync-mod-name').val(e.name || e.comment || '');
        $('#wb-sync-mod-keys').val(
          e.strategy && e.strategy.keys ? e.strategy.keys.join(', ') : e.key ? e.key.join(', ') : '',
        );
        $('#wb-sync-mod-content').val(e.content || '');

        const mode = e.strategy && e.strategy.type ? e.strategy.type : e.type === 'constant' ? 'constant' : 'selective';
        $('#wb-sync-mod-mode').val(mode);

        let posVal = 'before_author_note';
        let showDepth = false;

        if (e.position && e.position.type) {
          if (e.position.type === 'at_depth') {
            posVal = `at_depth_${e.position.role || 'system'}`;
            $('#wb-sync-mod-depth').val(e.position.depth || 4);
            showDepth = true;
          } else {
            posVal = e.position.type;
          }
        } else if (e.position !== undefined) {
          // 兼容旧版数字 position
          const p = parseInt(e.position);
          if (p === 0) posVal = 'before_character_definition';
          else if (p === 1) posVal = 'after_character_definition';
          else if (p === 2) posVal = 'before_example_messages';
          else if (p === 3) posVal = 'after_example_messages';
          else if (p === 4) posVal = 'before_author_note';
          else if (p === 5) posVal = 'after_author_note';
          else if (p >= 6 && p <= 8) {
            posVal = p === 6 ? 'at_depth_system' : p === 7 ? 'at_depth_user' : 'at_depth_assistant';
            $('#wb-sync-mod-depth').val(e.depth || 4);
            showDepth = true;
          }
        }

        $('#wb-sync-mod-position').val(posVal);
        $('#wb-sync-mod-depth-container').css('display', showDepth ? 'flex' : 'none');

        $('#wb-sync-mod-order').val(e.position && e.position.order !== undefined ? e.position.order : e.order || 100);
        $('#wb-sync-mod-prob').val(e.probability !== undefined ? e.probability : 100);

        const pIn = e.recursion ? e.recursion.prevent_incoming : e.prevent_recursion || false;
        const pOut = e.recursion ? e.recursion.prevent_outgoing : e.prevent_recursion || false;
        $('#wb-sync-mod-prevent-in').prop('checked', pIn);
        $('#wb-sync-mod-prevent-out').prop('checked', pOut);

        $details.css('display', 'flex');
      }
    } else {
      $details.hide();
    }
  }

  async function handleManualSave() {
    const book = modifyWbSelect.val(),
      uid = modifyEntrySelect.val();
    if (!book || !uid) return alert('请选择世界书和条目');
    try {
      let entries = await getLorebookEntries(book);
      const idx = entries.findIndex(e => e.uid == uid);
      if (idx === -1) throw new Error('找不到条目');

      const e = entries[idx];
      e.name = $('#wb-sync-mod-name').val();
      e.comment = e.name; // 兼容旧版显示
      e.content = $('#wb-sync-mod-content').val();

      const keysStr = $('#wb-sync-mod-keys').val();
      const keysArr = keysStr
        ? keysStr
            .split(',')
            .map(k => k.trim())
            .filter(k => k)
        : [];

      if (!e.strategy) e.strategy = {};
      e.strategy.type = $('#wb-sync-mod-mode').val();
      e.strategy.keys = keysArr;
      e.type = e.strategy.type === 'constant' ? 'constant' : 'Normal'; // 兼容旧版
      e.key = keysArr; // 兼容旧版

      const posVal = $('#wb-sync-mod-position').val();
      if (!e.position || typeof e.position !== 'object') e.position = { order: e.order || 100 };

      if (posVal.startsWith('at_depth')) {
        e.position.type = 'at_depth';
        e.position.role = posVal.split('_')[2];
        e.position.depth = parseInt($('#wb-sync-mod-depth').val()) || 4;
      } else {
        e.position.type = posVal;
      }

      e.position.order = parseInt($('#wb-sync-mod-order').val()) || 100;
      e.order = e.position.order; // 兼容旧版

      e.probability = parseInt($('#wb-sync-mod-prob').val());
      if (isNaN(e.probability)) e.probability = 100;

      if (!e.recursion) e.recursion = {};
      e.recursion.prevent_incoming = $('#wb-sync-mod-prevent-in').is(':checked');
      e.recursion.prevent_outgoing = $('#wb-sync-mod-prevent-out').is(':checked');

      await setLorebookEntries(book, entries);
      alert('保存成功！');
      modifyEntrySelect.data('entries', entries);
    } catch (e) {
      alert(`保存失败: ${e.message}`);
    }
  }

  function extractAndCleanJson(rawText) {
    if (!rawText) return '';
    const match = rawText.match(/```json\s*([\s\S]*?)\s*```/);
    let jsonStr = match ? match[1] : rawText;
    if (!match) {
      const first = jsonStr.indexOf('['),
        last = jsonStr.lastIndexOf(']');
      if (first !== -1 && last > first) jsonStr = jsonStr.substring(first, last + 1);
    }
    return jsonStr
      .trim()
      .replace(
        /"content":\s*"((?:[^"\\]|\\.)*)"/g,
        (m, val) => `"${'content'}": "${val.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`,
      );
  }

  async function handleSubmitModification() {
    const book = modifyWbSelect.val(),
      uid = modifyEntrySelect.val(),
      prompt = modifyUserPrompt.val().trim();
    if (!book) return alert('请选择世界书');
    if (!prompt) return alert('请输入要求');
    modifyAiResponse.val('处理中...');
    modifySubmitBtn.prop('disabled', true);
    let rawRes = '';
    try {
      if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
      const entries = await getLorebookEntries(book);
      const whole = JSON.stringify(entries, null, 2);
      let finalPrompt = `你是一个专业的SillyTavern世界书JSON数据工程师。\n输出必须是纯净的JSON，包裹在 \`\`\`json ... \`\`\` 中。\n绝对不能修改 uid 和 type。\n\n`;
      if (uid) {
        const target = entries.find(e => e.uid == uid);
        finalPrompt += `修改以下条目:\n\`\`\`json\n${JSON.stringify(target, null, 2)}\n\`\`\`\n要求: ${prompt}`;
      } else {
        finalPrompt += `修改整个世界书:\n\`\`\`json\n${whole}\n\`\`\`\n要求: ${prompt}`;
      }
      rawRes = await tavernHelperApi.generateRaw({
        ordered_prompts: [{ role: 'user', content: finalPrompt }],
        max_new_tokens: 4096,
      });
      modifyAiResponse.val(rawRes);
      const cleaned = extractAndCleanJson(rawRes);
      if (!cleaned) throw new Error('无法提取JSON');
      const updated = JSON.parse(cleaned);
      let newEntries = [];
      if (uid) {
        const idx = entries.findIndex(e => e.uid == uid);
        entries[idx] = { ...entries[idx], ...updated, uid: entries[idx].uid, type: entries[idx].type };
        newEntries = entries;
      } else {
        if (!Array.isArray(updated)) throw new Error('返回的不是数组');
        newEntries = updated;
      }
      await setLorebookEntries(book, newEntries);
      alert('更新成功！');
    } catch (e) {
      alert(`失败: ${e.message}`);
    } finally {
      modifySubmitBtn.prop('disabled', false);
    }
  }

  // --- 10. 世界书同步器 (我们的核心逻辑) ---
  async function populateSyncWorldbooks() {
    try {
      const books = await getAllLorebooks();
      $targetWbSelect.empty().append('<option value="">-- 请选择目标世界书 --</option>');
      books.forEach(book => $targetWbSelect.append(`<option value="${escapeHtml(book.file_name)}">${escapeHtml(book.name)}</option>`));
    } catch (error) {
      $targetWbSelect.empty().append('<option value="">加载失败</option>');
    }
  }

  async function extractContentFromMessage(startTag, endTag) {
    if (!startTag || !endTag) {
        toastr.warning('请填写起始和结束标签');
        return null;
    }
    try {
        if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
        const messages = await tavernHelperApi.getChatMessages({ amount: 1 });
        if (!messages || messages.length === 0) {
            toastr.warning('未找到最新消息');
            return null;
        }

        const lastMessage = messages[0].message;
        const regexStr = `${escapeRegExp(startTag)}([\\s\\S]*?)${escapeRegExp(endTag)}`;
        const regex = new RegExp(regexStr, 'g');

        let match;
        const extractedTexts = [];
        while ((match = regex.exec(lastMessage)) !== null) {
            extractedTexts.push(match[1].trim());
        }

        if (extractedTexts.length === 0) {
            toastr.info(`未找到被 ${startTag} 和 ${endTag} 包裹的内容`);
            return null;
        }
        return extractedTexts;
    } catch (error) {
        toastr.error('提取失败: ' + error.message);
        return null;
    }
  }

  async function extractMessages() {
    const startTag = $('#wb-sync-tag-start').val();
    const endTag = $('#wb-sync-tag-end').val();

    const extractedTexts = await extractContentFromMessage(startTag, endTag);
    if (!extractedTexts) return;

    extractedCards = extractedTexts.map((text, index) => parseExtractedText(text, index));
    renderCards();
    toastr.success(`成功提取 ${extractedCards.length} 个条目`);
  }

  function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function parseExtractedText(text, index) {
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

  function renderCards() {
    if (extractedCards.length === 0) {
        $cardsContainer.html('<div class="wb-sync-empty-msg">没有提取到任何条目。</div>');
        return;
    }

    const cardsHtml = extractedCards.map(card => {
        const isDepthVisible = parseInt(card.position) >= 6 && parseInt(card.position) <= 8;
        return `
            <div class="wb-sync-card" data-id="${card.id}">
                <div class="wb-sync-card-row"><span class="wb-sync-card-label">名称</span><input type="text" class="wb-sync-card-input card-name" value="${escapeHtml(card.name)}"></div>
                <div class="wb-sync-card-row"><span class="wb-sync-card-label">关键字</span><input type="text" class="wb-sync-card-input card-keys" value="${escapeHtml(card.keys)}" placeholder="逗号分隔"></div>
                <div class="wb-sync-card-row col"><span class="wb-sync-card-label">内容</span><textarea class="wb-sync-card-textarea card-content">${escapeHtml(card.content)}</textarea></div>
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
        `;
    }).join('');

    $cardsContainer.html(cardsHtml);
  }

  function applyBatchSettings() {
    const mode = $('#wb-sync-batch-mode').val(),
      pos = $('#wb-sync-batch-position').val(),
      dep = $('#wb-sync-batch-depth').val();
    const pIn = $('#wb-sync-batch-prevent-in').is(':checked'),
      pOut = $('#wb-sync-batch-prevent-out').is(':checked');
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

  function buildEntryData(cardData) {
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

  async function syncEntries(cardsToSync, $btn = null) {
    const targetWb = $targetWbSelect.val();
    if (!targetWb) return toastr.warning('请先选择目标世界书');
    if (cardsToSync.length === 0) return toastr.warning('没有可同步的条目');
    if ($btn) $btn.prop('disabled', true).text('同步中...');
    try {
      if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
      const newEntries = cardsToSync.map(c => buildEntryData(c));
      await tavernHelperApi.createLorebookEntries(targetWb, newEntries);
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

  // --- 11. 初始化 ---
  async function init() {
    try {
      const html = await $.get(`/${extensionFolderPath}/panel.html`);
      $('body').append(html);

      // DOM 引用
      loader = $('#wb-sync-loader');
      mainView = $('#wb-sync-main-view');
      selectView = $('#wb-sync-select-view');
      modifyView = $('#wb-sync-modify-view');
      deleteView = $('#wb-sync-delete-view');
      transferView = $('#wb-sync-transfer-view');
      syncView = $('#wb-sync-sync-view');
      duplicateView = $('#wb-sync-duplicate-view');
      renameView = $('#wb-sync-rename-view');
      readmeView = $('#wb-sync-readme-view');
      frontendView = $('#wb-sync-frontend-view');
      scriptSyncView = $('#wb-sync-script-sync-view');
      createRegexView = $('#wb-sync-create-regex-view');
      createScriptView = $('#wb-sync-create-script-view');

      bookList = $('#wb-sync-book-list');
      presetListContainer = $('#wb-sync-preset-list-container');
      overlay = $('#wb-sync-popup-overlay');

      worldbookListContainer = $('#wb-sync-worldbook-list-container');
      constantEntriesContainer = $('#wb-sync-constant-entries-container');
      normalEntriesContainer = $('#wb-sync-normal-entries-container');

      modifyWbSelect = $('#wb-sync-worldbook-select');
      modifyEntrySelect = $('#wb-sync-entry-select');
      modifyUserPrompt = $('#wb-sync-user-prompt');
      modifyAiResponse = $('#wb-sync-ai-response');
      modifyContent = $('#wb-sync-selected-entry-content');
      modifySubmitBtn = $('#wb-sync-submit-modification-btn');

      transSourceSelect = $('#wb-sync-source-worldbook-select');
      transTargetSelect = $('#wb-sync-target-worldbook-select');
      transEntriesContainer = $('#wb-sync-source-entries-container');
      transBtn = $('#wb-sync-transfer-entries-btn');

      $cardsContainer = $('#wb-sync-cards-container');
      $targetWbSelect = $('#wb-sync-target-wb');

      // 绑定事件
      $('#wb-sync-popup-close-button').on('click touchend', closePopup);
      $('#wb-sync-popup-back-btn').on('click touchend', showMainView);
      overlay.on('click', function (e) {
        if (e.target === this) closePopup();
      });
      $('#wb-sync-popup').on('click', e => e.stopPropagation());

      // 卡片折叠逻辑 (使用事件委托确保动态内容也能生效)
      $('#wb-sync-popup').on('click', '.wb-sync-section-header:has(.wb-sync-collapse-icon)', function () {
        const $content = $(this).closest('.wb-sync-section').find('.wb-sync-section-content');
        const $icon = $(this).find('.wb-sync-collapse-icon');
        if ($content.is(':visible')) {
          $content.slideUp(200);
          $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
        } else {
          $content.slideDown(200);
          $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
        }
      });

      // 主菜单按钮事件
      $('#wb-sync-select-book-btn').on('click', () => showSubView('wb-sync-select-view'));
      $('#wb-sync-load-preset-btn').on('click', () => presetListContainer.slideToggle());
      $('#wb-sync-goto-delete-btn').on('click', () => showSubView('wb-sync-delete-view'));
      $('#wb-sync-goto-modify-btn').on('click', () => showSubView('wb-sync-modify-view'));
      $('#wb-sync-goto-transfer-btn').on('click', () => showSubView('wb-sync-transfer-view'));
      $('#wb-sync-goto-duplicate-btn').on('click', () => showSubView('wb-sync-duplicate-view'));
      $('#wb-sync-goto-rename-btn').on('click', () => showSubView('wb-sync-rename-view'));
      $('#wb-sync-goto-frontend-btn').on('click', () => showSubView('wb-sync-frontend-view'));
      $('#wb-sync-goto-script-sync-btn').on('click', () => showSubView('wb-sync-script-sync-view'));
      $('#wb-sync-goto-create-regex-btn').on('click', () => showSubView('wb-sync-create-regex-view'));
      $('#wb-sync-goto-create-script-btn').on('click', () => showSubView('wb-sync-create-script-view'));
      $('#wb-sync-goto-readme-btn').on('click', () => showSubView('wb-sync-readme-view'));

      const README_CONTENT = `# 世界书同步器 (Worldbook Synchronizer)

这是一个为 SillyTavern 设计的强大世界书管理与同步插件，旨在提供一个比默认编辑器更高效、更直观的工作流程。

## ✨ 核心功能

### 1. ⚡ 世界书同步器
*   **智能提取**：通过自定义的起始和结束标签（如 \`<wb>\` 和 \`</wb>\`），自动从最新一楼的聊天记录中提取 AI 生成的世界书设定。
*   **卡片式编辑**：提取的内容会自动生成独立的卡片，您可以直观地修改条目的名称、关键字、内容。
*   **高级设置**：支持修改条目的触发模式（常驻/条件触发）、插入位置（角色定义前后、深度插入等）、插入深度、递归设置等高级属性。
*   **批量操作**：提供批量设置功能，一键统一所有提取条目的属性，并支持一键同步到目标世界书。

### 2. 📚 世界书管理
*   **选择启用**：在独立的面板中快速勾选、取消勾选需要全局启用的世界书。
*   **方案保存与加载**：将常用的世界书组合保存为方案，一键加载，方便在不同场景间切换。
*   **新建世界书**：快速创建新的空白世界书。
*   **修改名称**：安全地重命名世界书，插件会自动处理内容的迁移。
*   **复制世界书**：一键克隆现有的世界书，方便您在不同聊天中进行分支测试或备份。
*   **删除世界书与条目**：提供直观的列表，支持批量勾选并永久删除不需要的世界书或特定条目。条目按“蓝灯（常驻）”和“绿灯（条件触发）”分类显示，一目了然。
*   **条目迁移**：轻松将一个世界书中的特定条目批量复制/迁移到另一个世界书中，方便整合和重组您的世界观设定。

### 3. 📝 修改世界书条目
*   无需打开繁琐的默认世界书编辑器，直接在插件面板中选择世界书和条目进行快速修改。
*   支持修改条目的所有核心属性和高级设置。
*   **AI 辅助修改**：输入您的修改要求，让 AI 自动为您重写或润色条目内容（需配置好 AI 模型）。

### 4. 🛠️ 脚本与正则工具
*   **创建/导入正则脚本**：在插件内直接创建复杂的正则脚本，或从文件导入。支持配置所有原生正则脚本选项，并可选择导入到全局、预设或角色中。
*   **创建/导入酒馆助手脚本**：直接编写或导入酒馆助手脚本，并可选择导入到全局、预设或角色脚本库。
*   **前端同步器**：通过自定义标签提取 AI 生成的 HTML/CSS/JS 前端代码，并可在安全的沙盒环境中实时预览渲染效果。
*   **脚本同步器**：通过自定义标签从聊天记录中提取 JS/TS 代码，并快速导入为酒馆助手脚本。

## 🚀 使用说明
1.  点击页面右下角的悬浮球 <i class="fa-solid fa-book-atlas"></i> 打开主菜单。
2.  在主菜单中选择您需要的功能模块。
3.  插件会记住您上次关闭时的界面，方便您继续操作。
4.  所有设置（如提取标签、选择的世界书等）都会自动保存在您的浏览器中，下次打开无需重新配置。`;

      function loadReadme() {
        try {
            let htmlContent = '';
            if (window.showdown) {
                const converter = new window.showdown.Converter();
                htmlContent = `<div style="text-align: left; padding: 10px;">${converter.makeHtml(README_CONTENT)}</div>`;
            } else {
                htmlContent = `<pre style="white-space: pre-wrap; font-family: monospace; text-align: left;">${escapeHtml(README_CONTENT)}</pre>`;
            }
            $('#wb-sync-readme-content').html(htmlContent);
        } catch (e) {
            console.error(e);
            $('#wb-sync-readme-content').html('<p style="color:red;">无法加载插件说明: ' + e.message + '</p>');
        }
      }

      $('#wb-sync-duplicate-submit-btn').on('click', handleDuplicateWorldbook);
      $('#wb-sync-rename-submit-btn').on('click', handleRenameWorldbook);

      const handleCreateWorldbook = async callback => {
        const name = prompt('请输入新世界书的名称：');
        if (!name || !name.trim()) return;
        try {
          if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
          await tavernHelperApi.createLorebook(name.trim());
          toastr.success(`世界书 "${name}" 创建成功！`);
          if (callback) await callback(name.trim());
        } catch (e) {
          toastr.error(`创建失败: ${e.message}`);
        }
      };

      $('#wb-sync-create-wb-btn').on('click', () => handleCreateWorldbook());

      $('#wb-sync-sync-create-wb-btn').on('click', () =>
        handleCreateWorldbook(async newName => {
          await populateSyncWorldbooks();
          $('#wb-sync-target-wb').val(newName);
        }),
      );

      $('#wb-sync-goto-sync-btn').on('click', () => showSubView('wb-sync-sync-view'));

      $('#wb-sync-save-preset-btn').on('click', () => {
        const name = prompt('请输入方案名称：');
        if (!name) return;
        const books = $('.wb-sync-book-button.selected')
          .map((_, el) => $(el).data('book-filename'))
          .get();
        if (books.length === 0) return alert('请至少选择一个世界书！');
        savePreset({ name, books });
        alert('保存成功！');
        showMainView();
      });

      // 删除视图事件 (事件委托)
      worldbookListContainer.on('click', '.wb-sync-book-button', function () {
          $(this).toggleClass('selected');
          loadEntriesForSelectedBooks();
      });
      constantEntriesContainer.on('click', '.wb-sync-book-button', function () {
          $(this).toggleClass('selected');
      });
      normalEntriesContainer.on('click', '.wb-sync-book-button', function () {
          $(this).toggleClass('selected');
      });
      $('#wb-sync-delete-worldbook-btn').on('click', handleDeleteWorldbooks);
      $('#wb-sync-delete-entry-btn').on('click', handleDeleteEntries);

      // 修改视图事件
      modifyWbSelect.on('change', populateModifyEntrySelect);
      modifyEntrySelect.on('change', handleModifyEntryChange);
      $('#wb-sync-save-manual-changes-btn').on('click', handleManualSave);
      modifySubmitBtn.on('click', handleSubmitModification);

      $('#wb-sync-mod-position').on('change', function () {
        const val = $(this).val();
        $('#wb-sync-mod-depth-container').css('display', val.startsWith('at_depth') ? 'flex' : 'none');
      });

      transSourceSelect.on('change', renderSourceEntries);
      transBtn.on('click', handleTransferEntries);

      function getRegexObjFromUI(prefix) {
        const htmlContent = $(`#wb-sync-${prefix}-content`).val();
        if (!htmlContent) return null;

        const scriptName = $(`#wb-sync-${prefix}-script-name`).val().trim() || '新前端脚本';
        const findRegex = $(`#wb-sync-${prefix}-find-regex`).val() || '<打开面板>';

        const placementInts = [];
        $(`.wb-sync-${prefix}-placement-cb:checked`).each(function () {
          placementInts.push(parseInt($(this).val()));
        });
        if (placementInts.length === 0) placementInts.push(2); // Default to AI Output if none selected

        const isDisabled = $(`#wb-sync-${prefix}-disabled`).is(':checked');
        const runOnEdit = $(`#wb-sync-${prefix}-run-on-edit`).is(':checked');
        const substituteRegex = parseInt($(`#wb-sync-${prefix}-substitute-regex`).val()) || 0;

        const markdownOnly = $(`#wb-sync-${prefix}-markdown-only`).is(':checked');
        const promptOnly = $(`#wb-sync-${prefix}-prompt-only`).is(':checked');

        const minDepthStr = $(`#wb-sync-${prefix}-min-depth`).val();
        const minDepth = minDepthStr !== '' ? parseInt(minDepthStr) : null;

        const maxDepthStr = $(`#wb-sync-${prefix}-max-depth`).val();
        const maxDepth = maxDepthStr !== '' ? parseInt(maxDepthStr) : null;

        const trimStringsRaw = $(`#wb-sync-${prefix}-trim-strings`).val() || '';
        const trimStrings = trimStringsRaw
          .split('\n')
          .map(s => s.trim())
          .filter(s => s !== '');

        const regexObj = {
          id: generateUUID(),
          scriptName: scriptName,
          findRegex: findRegex,
          replaceString: htmlContent,
          trimStrings: trimStrings,
          placement: placementInts,
          disabled: isDisabled,
          markdownOnly: markdownOnly,
          promptOnly: promptOnly,
          runOnEdit: runOnEdit,
          substituteRegex: substituteRegex,
          minDepth: minDepth,
          maxDepth: maxDepth,
        };

        if (!regexObj.replaceString.startsWith('```')) {
          regexObj.replaceString = '```html\n' + regexObj.replaceString + '\n```';
        }
        return regexObj;
      }

      function convertToTavernRegex(regexObj) {
        return {
          id: regexObj.id,
          script_name: regexObj.scriptName,
          enabled: !regexObj.disabled,
          find_regex: regexObj.findRegex,
          replace_string: regexObj.replaceString,
          trim_strings: regexObj.trimStrings.join('\n'),
          source: {
            user_input: regexObj.placement.includes(1),
            ai_output: regexObj.placement.includes(2),
            slash_command: regexObj.placement.includes(4),
            world_info: regexObj.placement.includes(3),
            reasoning: regexObj.placement.includes(5),
          },
          destination: {
            display: regexObj.markdownOnly,
            prompt: regexObj.promptOnly,
          },
          run_on_edit: regexObj.runOnEdit,
          min_depth: regexObj.minDepth,
          max_depth: regexObj.maxDepth,
        };
      }

      function convertToTavernHelperScript(regexObj) {
        return {
          type: 'script',
          enabled: !regexObj.disabled,
          name: regexObj.scriptName,
          id: regexObj.id,
          content: regexObj.replaceString,
          info: '由世界书同步器创建',
          button: {
            enabled: false,
            buttons: [],
          },
          data: {},
        };
      }

      $('#wb-sync-cr-import-global-btn').on('click', async () => {
        const regexObj = getRegexObjFromUI('cr');
        if (!regexObj) return toastr.warning('没有可导入的内容');
        try {
          if (!window.TavernHelper) throw new Error('TavernHelper 未加载');
          const tavernRegex = convertToTavernRegex(regexObj);
          await window.TavernHelper.updateTavernRegexesWith(
            regexes => {
              regexes.push(tavernRegex);
              return regexes;
            },
            { type: 'global' },
          );
          toastr.success('成功导入至全局正则脚本！');
        } catch (e) {
          toastr.error(`导入失败: ${e.message}`);
        }
      });

      $('#wb-sync-cr-import-preset-btn').on('click', async () => {
        const regexObj = getRegexObjFromUI('cr');
        if (!regexObj) return toastr.warning('没有可导入的内容');
        try {
          if (!window.TavernHelper) throw new Error('TavernHelper 未加载');
          const tavernRegex = convertToTavernRegex(regexObj);
          await window.TavernHelper.updateTavernRegexesWith(
            regexes => {
              regexes.push(tavernRegex);
              return regexes;
            },
            { type: 'preset', name: 'in_use' },
          );
          toastr.success('成功导入至预设正则脚本！');
        } catch (e) {
          toastr.error(`导入失败: ${e.message}`);
        }
      });

      $('#wb-sync-cr-import-character-btn').on('click', async () => {
        const regexObj = getRegexObjFromUI('cr');
        if (!regexObj) return toastr.warning('没有可导入的内容');
        try {
          if (!window.TavernHelper) throw new Error('TavernHelper 未加载');
          const tavernRegex = convertToTavernRegex(regexObj);
          await window.TavernHelper.updateTavernRegexesWith(
            regexes => {
              regexes.push(tavernRegex);
              return regexes;
            },
            { type: 'character', name: 'current' },
          );
          toastr.success('成功导入至局部正则脚本！');
        } catch (e) {
          toastr.error(`导入失败: ${e.message}`);
        }
      });

      $('#wb-sync-cr-download-btn').on('click', () => {
        const regexObj = getRegexObjFromUI('cr');
        if (!regexObj) return toastr.warning('没有可下载的内容');

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(regexObj, null, 4));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', 'regex-' + regexObj.scriptName + '.json');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toastr.success('下载成功！');
      });

      // 导入正则脚本 (子页面)
      $('#wb-sync-cr-load-btn').on('click', () => {
        $('#wb-sync-cr-file-input').click();
      });

      $('#wb-sync-cr-file-input').on('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            const data = JSON.parse(e.target.result);

            // 填充 UI
            $('#wb-sync-cr-script-name').val(data.scriptName || data.script_name || '');
            $('#wb-sync-cr-find-regex').val(data.findRegex || data.find_regex || '');

            // 提取内容 (去除 ```html 包装)
            let content = data.replaceString || data.replace_string || '';
            content = content.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '');
            $('#wb-sync-cr-content').val(content);

            // 填充修剪掉
            let trimStrings = '';
            if (Array.isArray(data.trimStrings)) {
              trimStrings = data.trimStrings.join('\n');
            } else if (typeof data.trim_strings === 'string') {
              trimStrings = data.trim_strings;
            }
            $('#wb-sync-cr-trim-strings').val(trimStrings);

            // 填充作用范围
            $('.wb-sync-cr-placement-cb').prop('checked', false);
            let placements = data.placement || [];
            if (data.source) {
              if (data.source.user_input) placements.push(1);
              if (data.source.ai_output) placements.push(2);
              if (data.source.world_info) placements.push(3);
              if (data.source.slash_command) placements.push(4);
              if (data.source.reasoning) placements.push(5);
            }
            placements.forEach(val => {
              $(`.wb-sync-cr-placement-cb[value="${val}"]`).prop('checked', true);
            });

            // 其他选项
            $('#wb-sync-cr-disabled').prop('checked', data.disabled || data.enabled === false);
            $('#wb-sync-cr-run-on-edit').prop('checked', data.runOnEdit || data.run_on_edit || false);
            $('#wb-sync-cr-substitute-regex').val(data.substituteRegex || 0);

            // 短暂 & 深度
            $('#wb-sync-cr-markdown-only').prop(
              'checked',
              data.markdownOnly || (data.destination && data.destination.display) || false,
            );
            $('#wb-sync-cr-prompt-only').prop(
              'checked',
              data.promptOnly || (data.destination && data.destination.prompt) || false,
            );
            $('#wb-sync-cr-min-depth').val(data.minDepth || data.min_depth || '');
            $('#wb-sync-cr-max-depth').val(data.maxDepth || data.max_depth || '');

            toastr.success('正则脚本导入成功！');
          } catch (err) {
            toastr.error('解析 JSON 文件失败: ' + err.message);
          }
          // 清空 input 以便下次可以选择同一个文件
          $('#wb-sync-cr-file-input').val('');
        };
        reader.readAsText(file);
      });

      // 主菜单 - 导入正则脚本
      $('#wb-sync-main-import-regex-btn').on('click', () => {
        const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
        if (isCharacterSelected) {
          $('#wb-sync-main-import-regex-character-btn').show();
        } else {
          $('#wb-sync-main-import-regex-character-btn').hide();
        }
        $('#wb-sync-main-import-regex-options').slideToggle();
      });

      let currentRegexImportTarget = '';
      $('#wb-sync-main-import-regex-global-btn').on('click', () => {
        currentRegexImportTarget = 'global';
        $('#wb-sync-main-regex-file-input').click();
      });
      $('#wb-sync-main-import-regex-preset-btn').on('click', () => {
        currentRegexImportTarget = 'preset';
        $('#wb-sync-main-regex-file-input').click();
      });
      $('#wb-sync-main-import-regex-character-btn').on('click', () => {
        currentRegexImportTarget = 'character';
        $('#wb-sync-main-regex-file-input').click();
      });

      $('#wb-sync-main-regex-file-input').on('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function (e) {
          try {
            const data = JSON.parse(e.target.result);
            if (!window.TavernHelper) throw new Error('TavernHelper 未加载');

            // 确保数据格式正确 (如果是旧格式，可能需要转换，这里假设导入的是标准格式)
            const tavernRegex = data.id ? data : convertToTavernRegex(data); // 简单判断

            let targetOpt = { type: 'global' };
            if (currentRegexImportTarget === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
            if (currentRegexImportTarget === 'character') targetOpt = { type: 'character', name: 'current' };

            await window.TavernHelper.updateTavernRegexesWith(regexes => {
              regexes.push(tavernRegex);
              return regexes;
            }, targetOpt);
            toastr.success(
              `成功导入至${currentRegexImportTarget === 'global' ? '全局' : currentRegexImportTarget === 'preset' ? '预设' : '局部'}正则脚本！`,
            );
            $('#wb-sync-main-import-regex-options').slideUp();
          } catch (err) {
            toastr.error('导入失败: ' + err.message);
          }
          $('#wb-sync-main-regex-file-input').val('');
        };
        reader.readAsText(file);
      });

      // 脚本同步器事件
      $('#wb-sync-ss-extract-btn').on('click', async () => {
        const startTag = $('#wb-sync-ss-tag-start').val();
        const endTag = $('#wb-sync-ss-tag-end').val();

        const extractedTexts = await extractContentFromMessage(startTag, endTag);
        if (!extractedTexts) return;

        let finalContent = extractedTexts.join('\n\n');
        $('#wb-sync-ss-content').val(finalContent);
        toastr.success('提取成功');
      });

      function generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
          let r = (Math.random() * 16) | 0,
            v = c == 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }

      function getScriptSyncObjFromUI() {
        const content = $('#wb-sync-ss-content').val();
        if (!content) return null;

        const scriptName = $('#wb-sync-ss-script-name').val().trim() || '新助手脚本';
        const isDisabled = $('#wb-sync-ss-disabled').is(':checked');
        const info = $('#wb-sync-ss-info').val() || '';

        return {
          type: 'script',
          enabled: !isDisabled,
          name: scriptName,
          id: generateUUID(),
          content: content,
          info: info,
          button: {
            enabled: false,
            buttons: [],
          },
          data: {},
        };
      }

      $('#wb-sync-ss-import-global-script-btn').on('click', async () => {
        const scriptObj = getScriptSyncObjFromUI();
        if (!scriptObj) return toastr.warning('没有可导入的内容');
        try {
          if (!window.TavernHelper) throw new Error('TavernHelper 未加载');
          await window.TavernHelper.updateScriptTreesWith(
            scripts => {
              scripts.push(scriptObj);
              return scripts;
            },
            { type: 'global' },
          );
          toastr.success('成功导入至全局脚本库！');
        } catch (e) {
          toastr.error(`导入失败: ${e.message}`);
        }
      });

      $('#wb-sync-ss-import-preset-script-btn').on('click', async () => {
        const scriptObj = getScriptSyncObjFromUI();
        if (!scriptObj) return toastr.warning('没有可导入的内容');
        try {
          if (!window.TavernHelper) throw new Error('TavernHelper 未加载');
          await window.TavernHelper.updateScriptTreesWith(
            scripts => {
              scripts.push(scriptObj);
              return scripts;
            },
            { type: 'preset' },
          );
          toastr.success('成功导入至预设脚本库！');
        } catch (e) {
          toastr.error(`导入失败: ${e.message}`);
        }
      });

      $('#wb-sync-ss-import-character-script-btn').on('click', async () => {
        const scriptObj = getScriptSyncObjFromUI();
        if (!scriptObj) return toastr.warning('没有可导入的内容');
        try {
          if (!window.TavernHelper) throw new Error('TavernHelper 未加载');
          await window.TavernHelper.updateScriptTreesWith(
            scripts => {
              scripts.push(scriptObj);
              return scripts;
            },
            { type: 'character' },
          );
          toastr.success('成功导入至角色脚本库！');
        } catch (e) {
          toastr.error(`导入失败: ${e.message}`);
        }
      });

      $('#wb-sync-ss-download-btn').on('click', () => {
        const scriptObj = getScriptSyncObjFromUI();
        if (!scriptObj) return toastr.warning('没有可下载的内容');

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scriptObj, null, 4));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', '酒馆助手脚本-' + scriptObj.name + '.json');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toastr.success('下载成功！');
      });

      // 前端同步器事件
      $('#wb-sync-fe-extract-btn').on('click', async () => {
        const startTag = $('#wb-sync-fe-tag-start').val();
        const endTag = $('#wb-sync-fe-tag-end').val();

        const extractedTexts = await extractContentFromMessage(startTag, endTag);
        if (!extractedTexts) return;

        let finalContent = extractedTexts.join('\n\n');
        if (!finalContent.startsWith('```')) {
            finalContent = '```html\n' + finalContent + '\n```';
        }
        $('#wb-sync-fe-content').val(finalContent);
        toastr.success('提取成功');
      });

      $('#wb-sync-fe-render-btn').on('click', () => {
        let htmlContent = $('#wb-sync-fe-content').val();
        if (!htmlContent) return toastr.warning('没有可渲染的内容');

        // 去除可能存在的 markdown 代码块标记
        htmlContent = htmlContent.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '');

        const iframe = $('<iframe>', {
          srcdoc: htmlContent,
          style: 'width: 100%; height: 400px; border: none;',
        });
        $('#wb-sync-fe-preview-container').empty().append(iframe).show();
      });

      $('#wb-sync-fe-import-global-btn').on('click', async () => {
        const regexObj = getRegexObjFromUI('fe');
        if (!regexObj) return toastr.warning('没有可导入的内容');
        try {
          if (!window.TavernHelper) throw new Error('TavernHelper 未加载');
          const tavernRegex = convertToTavernRegex(regexObj);
          await window.TavernHelper.updateTavernRegexesWith(
            regexes => {
              regexes.push(tavernRegex);
              return regexes;
            },
            { type: 'global' },
          );
          toastr.success('成功导入至全局正则脚本！');
        } catch (e) {
          toastr.error(`导入失败: ${e.message}`);
        }
      });

      $('#wb-sync-fe-import-preset-btn').on('click', async () => {
        const regexObj = getRegexObjFromUI('fe');
        if (!regexObj) return toastr.warning('没有可导入的内容');
        try {
          if (!window.TavernHelper) throw new Error('TavernHelper 未加载');
          const tavernRegex = convertToTavernRegex(regexObj);
          await window.TavernHelper.updateTavernRegexesWith(
            regexes => {
              regexes.push(tavernRegex);
              return regexes;
            },
            { type: 'preset', name: 'in_use' },
          );
          toastr.success('成功导入至预设正则脚本！');
        } catch (e) {
          toastr.error(`导入失败: ${e.message}`);
        }
      });

      $('#wb-sync-fe-import-character-btn').on('click', async () => {
        const regexObj = getRegexObjFromUI('fe');
        if (!regexObj) return toastr.warning('没有可导入的内容');
        try {
          if (!window.TavernHelper) throw new Error('TavernHelper 未加载');
          const tavernRegex = convertToTavernRegex(regexObj);
          await window.TavernHelper.updateTavernRegexesWith(
            regexes => {
              regexes.push(tavernRegex);
              return regexes;
            },
            { type: 'character', name: 'current' },
          );
          toastr.success('成功导入至局部正则脚本！');
        } catch (e) {
          toastr.error(`导入失败: ${e.message}`);
        }
      });

      $('#wb-sync-fe-download-btn').on('click', () => {
        const regexObj = getRegexObjFromUI('fe');
        if (!regexObj) return toastr.warning('没有可下载的内容');

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(regexObj, null, 4));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', 'regex-' + regexObj.scriptName + '.json');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toastr.success('下载成功！');
      });

      // 创建酒馆助手脚本事件
      function getScriptObjFromUI() {
        const content = $('#wb-sync-cs-content').val();
        if (!content) return null;

        const scriptName = $('#wb-sync-cs-script-name').val().trim() || '新助手脚本';
        const isDisabled = $('#wb-sync-cs-disabled').is(':checked');
        const info = $('#wb-sync-cs-info').val() || '';

        function generateUUID() {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            let r = (Math.random() * 16) | 0,
              v = c == 'x' ? r : (r & 0x3) | 0x8;
            return v.toString(16);
          });
        }

        return {
          type: 'script',
          enabled: !isDisabled,
          name: scriptName,
          id: generateUUID(),
          content: content,
          info: info,
          button: {
            enabled: false,
            buttons: [],
          },
          data: {},
        };
      }

      $('#wb-sync-cs-import-global-script-btn').on('click', async () => {
        const scriptObj = getScriptObjFromUI();
        if (!scriptObj) return toastr.warning('没有可导入的内容');
        try {
          if (!window.TavernHelper) throw new Error('TavernHelper 未加载');
          await window.TavernHelper.updateScriptTreesWith(
            scripts => {
              scripts.push(scriptObj);
              return scripts;
            },
            { type: 'global' },
          );
          toastr.success('成功导入至全局脚本库！');
        } catch (e) {
          toastr.error(`导入失败: ${e.message}`);
        }
      });

      $('#wb-sync-cs-import-preset-script-btn').on('click', async () => {
        const scriptObj = getScriptObjFromUI();
        if (!scriptObj) return toastr.warning('没有可导入的内容');
        try {
          if (!window.TavernHelper) throw new Error('TavernHelper 未加载');
          await window.TavernHelper.updateScriptTreesWith(
            scripts => {
              scripts.push(scriptObj);
              return scripts;
            },
            { type: 'preset' },
          );
          toastr.success('成功导入至预设脚本库！');
        } catch (e) {
          toastr.error(`导入失败: ${e.message}`);
        }
      });

      $('#wb-sync-cs-import-character-script-btn').on('click', async () => {
        const scriptObj = getScriptObjFromUI();
        if (!scriptObj) return toastr.warning('没有可导入的内容');
        try {
          if (!window.TavernHelper) throw new Error('TavernHelper 未加载');
          await window.TavernHelper.updateScriptTreesWith(
            scripts => {
              scripts.push(scriptObj);
              return scripts;
            },
            { type: 'character' },
          );
          toastr.success('成功导入至角色脚本库！');
        } catch (e) {
          toastr.error(`导入失败: ${e.message}`);
        }
      });

      $('#wb-sync-cs-download-btn').on('click', () => {
        const scriptObj = getScriptObjFromUI();
        if (!scriptObj) return toastr.warning('没有可下载的内容');

        const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scriptObj, null, 4));
        const downloadAnchorNode = document.createElement('a');
        downloadAnchorNode.setAttribute('href', dataStr);
        downloadAnchorNode.setAttribute('download', '酒馆助手脚本-' + scriptObj.name + '.json');
        document.body.appendChild(downloadAnchorNode);
        downloadAnchorNode.click();
        downloadAnchorNode.remove();
        toastr.success('下载成功！');
      });

      // 导入酒馆助手脚本 (子页面)
      $('#wb-sync-cs-load-btn').on('click', () => {
        $('#wb-sync-cs-file-input').click();
      });

      $('#wb-sync-cs-file-input').on('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function (e) {
          try {
            const data = JSON.parse(e.target.result);

            // 填充 UI
            $('#wb-sync-cs-script-name').val(data.name || '');
            $('#wb-sync-cs-content').val(data.content || '');
            $('#wb-sync-cs-disabled').prop('checked', data.enabled === false);

            toastr.success('助手脚本导入成功！');
          } catch (err) {
            toastr.error('解析 JSON 文件失败: ' + err.message);
          }
          // 清空 input 以便下次可以选择同一个文件
          $('#wb-sync-cs-file-input').val('');
        };
        reader.readAsText(file);
      });

      // 主菜单 - 导入酒馆助手脚本
      $('#wb-sync-main-import-script-btn').on('click', () => {
        const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
        if (isCharacterSelected) {
          $('#wb-sync-main-import-script-character-btn').show();
        } else {
          $('#wb-sync-main-import-script-character-btn').hide();
        }
        $('#wb-sync-main-import-script-options').slideToggle();
      });

      let currentScriptImportTarget = '';
      $('#wb-sync-main-import-script-global-btn').on('click', () => {
        currentScriptImportTarget = 'global';
        $('#wb-sync-main-script-file-input').click();
      });
      $('#wb-sync-main-import-script-preset-btn').on('click', () => {
        currentScriptImportTarget = 'preset';
        $('#wb-sync-main-script-file-input').click();
      });
      $('#wb-sync-main-import-script-character-btn').on('click', () => {
        currentScriptImportTarget = 'character';
        $('#wb-sync-main-script-file-input').click();
      });

      $('#wb-sync-main-script-file-input').on('change', function (e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function (e) {
          try {
            const data = JSON.parse(e.target.result);
            if (!window.TavernHelper) throw new Error('TavernHelper 未加载');

            // 确保数据格式正确
            const scriptObj =
              data.type === 'script'
                ? data
                : {
                    type: 'script',
                    enabled: data.enabled !== false,
                    name: data.name || '导入的脚本',
                    id:
                      data.id ||
                      'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                        let r = (Math.random() * 16) | 0,
                          v = c == 'x' ? r : (r & 0x3) | 0x8;
                        return v.toString(16);
                      }),
                    content: data.content || '',
                    info: data.info || '由世界书同步器导入',
                    button: data.button || { enabled: false, buttons: [] },
                    data: data.data || {},
                  };

            let targetOpt = { type: 'global' };
            if (currentScriptImportTarget === 'preset') targetOpt = { type: 'preset' };
            if (currentScriptImportTarget === 'character') targetOpt = { type: 'character' };

            await window.TavernHelper.updateScriptTreesWith(scripts => {
              scripts.push(scriptObj);
              return scripts;
            }, targetOpt);
            toastr.success(
              `成功导入至${currentScriptImportTarget === 'global' ? '全局' : currentScriptImportTarget === 'preset' ? '预设' : '角色'}脚本库！`,
            );
            $('#wb-sync-main-import-script-options').slideUp();
          } catch (err) {
            toastr.error('导入失败: ' + err.message);
          }
          $('#wb-sync-main-script-file-input').val('');
        };
        reader.readAsText(file);
      });

      // 同步器事件
      const $tagStart = $('#wb-sync-tag-start');
      const $tagEnd = $('#wb-sync-tag-end');

      // 恢复保存的标签
      const savedTagStart = localStorage.getItem(STORAGE_KEY_TAG_START);
      const savedTagEnd = localStorage.getItem(STORAGE_KEY_TAG_END);
      if (savedTagStart) $tagStart.val(savedTagStart);
      if (savedTagEnd) $tagEnd.val(savedTagEnd);

      // 监听标签变化并保存
      $tagStart.on('change input', function () {
        localStorage.setItem(STORAGE_KEY_TAG_START, $(this).val());
      });
      $tagEnd.on('change input', function () {
        localStorage.setItem(STORAGE_KEY_TAG_END, $(this).val());
      });

      // 世界书选择视图 (事件委托)
      bookList.on('click', '.wb-sync-book-button', async function () {
        const $this = $(this);
        const bookFilename = $this.data('book-filename');
        const isSelected = $this.hasClass('selected');

        // 立即更新UI，提供即时反馈
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
          // 如果API调用失败，则恢复UI状态
          $this.toggleClass('selected');
          toastr.error('更新世界书状态失败');
        }
      });

      // 同步器事件 (事件委托)
      $cardsContainer.on('change', 'input, select, textarea', function() {
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
              $card.find('.card-depth-row').css('display', parseInt(val) >= 6 && parseInt(val) <= 8 ? 'flex' : 'none');
          }
      });

      $cardsContainer.on('click', '.sync-single-btn', async function() {
          const $card = $(this).closest('.wb-sync-card');
          const id = $card.data('id');
          const cardData = extractedCards.find(c => c.id === id);
          if (cardData) {
              await syncEntries([cardData], $(this));
          }
      });

      $cardsContainer.on('click', '.delete-card-btn', function() {
          const $card = $(this).closest('.wb-sync-card');
          const id = $card.data('id');
          extractedCards = extractedCards.filter(c => c.id !== id);
          renderCards(); // Re-render after deletion
      });

      $('#wb-sync-extract-btn').on('click', extractMessages);
      $('#wb-sync-apply-batch-btn').on('click', applyBatchSettings);
      $('#wb-sync-batch-position').on('change', function () {
        const val = $(this).val();
        $('#wb-sync-batch-depth-container').css(
          'display',
          val !== '' && parseInt(val) >= 6 && parseInt(val) <= 8 ? 'flex' : 'none',
        );
      });
      $('#wb-sync-sync-all-btn').on('click', async function () {
        await syncEntries(extractedCards, $(this));
        setTimeout(
          () => $(this).prop('disabled', false).html('<i class="fa-solid fa-cloud-arrow-up"></i> 一键同步全部'),
          2000,
        );
      });

      initFloatingButton();

      showMainView();
      console.log(`[${MODULE_NAME}] 初始化完成`);
    } catch (e) {
      console.error(`[${MODULE_NAME}] 初始化失败:`, e);
    }
  }

  init();
});
