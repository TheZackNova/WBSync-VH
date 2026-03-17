import { generateUUID } from '../utils.js';
import { extractContentFromMessage } from './sync.js';
import { isDefaultCollapse } from './settings.js';
import { updateTavernRegexesWith, updateScriptTreesWith } from '../api.js';

export let extractedFrontendCards = [];
export let extractedScriptCards = [];

let $crImportGlobalBtn;
let $crImportPresetBtn;
let $crImportCharacterBtn;
let $crDownloadBtn;
let $crLoadBtn;
let $crFileInput;

let $mainImportRegexBtn;
let $mainImportRegexOptions;
let $mainImportRegexGlobalBtn;
let $mainImportRegexPresetBtn;
let $mainImportRegexCharacterBtn;
let $mainRegexFileInput;

let $ssExtractBtn;
let $ssCardsContainer;

let $feExtractBtn;
let $feCardsContainer;

let $csImportGlobalScriptBtn;
let $csImportPresetScriptBtn;
let $csImportCharacterScriptBtn;
let $csDownloadBtn;
let $csLoadBtn;
let $csFileInput;

let $mainImportScriptBtn;
let $mainImportScriptOptions;
let $mainImportScriptGlobalBtn;
let $mainImportScriptPresetBtn;
let $mainImportScriptCharacterBtn;
let $mainScriptFileInput;

let currentRegexImportTarget = '';
let currentScriptImportTarget = '';

export function initScripts() {
  $crImportGlobalBtn = $('#wb-sync-cr-import-global-btn');
  $crImportPresetBtn = $('#wb-sync-cr-import-preset-btn');
  $crImportCharacterBtn = $('#wb-sync-cr-import-character-btn');
  $crDownloadBtn = $('#wb-sync-cr-download-btn');
  $crLoadBtn = $('#wb-sync-cr-load-btn');
  $crFileInput = $('#wb-sync-cr-file-input');

  $mainImportRegexBtn = $('#wb-sync-main-import-regex-btn');
  $mainImportRegexOptions = $('#wb-sync-main-import-regex-options');
  $mainImportRegexGlobalBtn = $('#wb-sync-main-import-regex-global-btn');
  $mainImportRegexPresetBtn = $('#wb-sync-main-import-regex-preset-btn');
  $mainImportRegexCharacterBtn = $('#wb-sync-main-import-regex-character-btn');
  $mainRegexFileInput = $('#wb-sync-main-regex-file-input');

  $ssExtractBtn = $('#wb-sync-ss-extract-btn');
  $ssCardsContainer = $('#wb-sync-ss-cards-container');

  $feExtractBtn = $('#wb-sync-fe-extract-btn');
  $feCardsContainer = $('#wb-sync-fe-cards-container');

  $csImportGlobalScriptBtn = $('#wb-sync-cs-import-global-script-btn');
  $csImportPresetScriptBtn = $('#wb-sync-cs-import-preset-script-btn');
  $csImportCharacterScriptBtn = $('#wb-sync-cs-import-character-script-btn');
  $csDownloadBtn = $('#wb-sync-cs-download-btn');
  $csLoadBtn = $('#wb-sync-cs-load-btn');
  $csFileInput = $('#wb-sync-cs-file-input');

  $mainImportScriptBtn = $('#wb-sync-main-import-script-btn');
  $mainImportScriptOptions = $('#wb-sync-main-import-script-options');
  $mainImportScriptGlobalBtn = $('#wb-sync-main-import-script-global-btn');
  $mainImportScriptPresetBtn = $('#wb-sync-main-import-script-preset-btn');
  $mainImportScriptCharacterBtn = $('#wb-sync-main-import-script-character-btn');
  $mainScriptFileInput = $('#wb-sync-main-script-file-input');

  $crImportGlobalBtn.on('click', () => handleRegexImport('cr', 'global'));
  $crImportPresetBtn.on('click', () => handleRegexImport('cr', 'preset'));
  $crImportCharacterBtn.on('click', () => handleRegexImport('cr', 'character'));
  $crDownloadBtn.on('click', () => handleRegexDownload('cr'));
  $crLoadBtn.on('click', () => $crFileInput.click());
  $crFileInput.on('change', e => handleRegexFileLoad(e, 'cr'));

  $mainImportRegexBtn.on('click', () => {
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $mainImportRegexCharacterBtn.show();
    } else {
      $mainImportRegexCharacterBtn.hide();
    }
    $mainImportRegexOptions.slideToggle();
  });

  $mainImportRegexGlobalBtn.on('click', () => {
    currentRegexImportTarget = 'global';
    $mainRegexFileInput.click();
  });
  $mainImportRegexPresetBtn.on('click', () => {
    currentRegexImportTarget = 'preset';
    $mainRegexFileInput.click();
  });
  $mainImportRegexCharacterBtn.on('click', () => {
    currentRegexImportTarget = 'character';
    $mainRegexFileInput.click();
  });

  $mainRegexFileInput.on('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const data = JSON.parse(e.target.result);

        const tavernRegex = data.id ? data : {
          id: data.id || generateUUID(),
          script_name: data.scriptName || data.script_name || data.name || '未命名正则',
          enabled: data.disabled !== undefined ? !data.disabled : (data.enabled !== false),
          find_regex: data.findRegex || data.find_regex || '<打开面板>',
          replace_string: data.replaceString || data.replace_string || data.content || '',
          trim_strings: Array.isArray(data.trimStrings) ? data.trimStrings.join('\n') : (data.trim_strings || ''),
          source: data.source || {
            user_input: false,
            ai_output: true,
            slash_command: false,
            world_info: false,
            reasoning: false,
          },
          destination: data.destination || {
            display: true,
            prompt: false,
          },
          run_on_edit: data.runOnEdit || data.run_on_edit || false,
          min_depth: data.minDepth || data.min_depth || null,
          max_depth: data.maxDepth || data.max_depth || null,
        };

        let targetOpt = { type: 'global' };
        if (currentRegexImportTarget === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
        if (currentRegexImportTarget === 'character') targetOpt = { type: 'character', name: 'current' };

        await updateTavernRegexesWith(regexes => {
          regexes.push(tavernRegex);
          return regexes;
        }, targetOpt);
        toastr.success(
          `成功导入至${currentRegexImportTarget === 'global' ? '全局' : currentRegexImportTarget === 'preset' ? '预设' : '局部'}正则脚本！`,
        );
        $mainImportRegexOptions.slideUp();
      } catch (err) {
        toastr.error('导入失败: ' + err.message);
      }
      $mainRegexFileInput.val('');
    };
    reader.readAsText(file);
  });

  $ssExtractBtn.on('click', () => handleExtractScript('ss'));
  $ssCardsContainer.on('click', '.ss-import-global-btn', function () {
    handleScriptImport('ss', 'global', $(this).data('id'));
  });
  $ssCardsContainer.on('click', '.ss-import-preset-btn', function () {
    handleScriptImport('ss', 'preset', $(this).data('id'));
  });
  $ssCardsContainer.on('click', '.ss-import-character-btn', function () {
    handleScriptImport('ss', 'character', $(this).data('id'));
  });
  $ssCardsContainer.on('click', '.ss-download-btn', function () {
    handleScriptDownload('ss', $(this).data('id'));
  });
  $ssCardsContainer.on('click', '.ss-delete-btn', function () {
    removeScriptCard($(this).data('id'));
  });
  $ssCardsContainer.on('click', '.wb-sync-card-header', function () {
    const $content = $(this).siblings('.wb-sync-card-content');
    const $icon = $(this).find('.wb-sync-collapse-icon');
    if ($content.is(':visible')) {
      $content.slideUp(200);
      $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    } else {
      $content.slideDown(200);
      $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    }
  });

  $feExtractBtn.on('click', handleExtractFrontend);
  $feCardsContainer.on('click', '.fe-import-global-btn', function () {
    handleRegexImport('fe', 'global', $(this).data('id'));
  });
  $feCardsContainer.on('click', '.fe-import-preset-btn', function () {
    handleRegexImport('fe', 'preset', $(this).data('id'));
  });
  $feCardsContainer.on('click', '.fe-import-character-btn', function () {
    handleRegexImport('fe', 'character', $(this).data('id'));
  });
  $feCardsContainer.on('click', '.fe-download-btn', function () {
    handleRegexDownload('fe', $(this).data('id'));
  });
  $feCardsContainer.on('click', '.fe-render-btn', function () {
    handleFrontendRender($(this).data('id'));
  });
  $feCardsContainer.on('click', '.fe-delete-btn', function () {
    removeFrontendCard($(this).data('id'));
  });
  $feCardsContainer.on('click', '.wb-sync-card-header', function () {
    const $content = $(this).siblings('.wb-sync-card-content');
    const $icon = $(this).find('.wb-sync-collapse-icon');
    if ($content.is(':visible')) {
      $content.slideUp(200);
      $icon.removeClass('fa-chevron-up').addClass('fa-chevron-down');
    } else {
      $content.slideDown(200);
      $icon.removeClass('fa-chevron-down').addClass('fa-chevron-up');
    }
  });

  $csImportGlobalScriptBtn.on('click', () => handleScriptImport('cs', 'global'));
  $csImportPresetScriptBtn.on('click', () => handleScriptImport('cs', 'preset'));
  $csImportCharacterScriptBtn.on('click', () => handleScriptImport('cs', 'character'));
  $csDownloadBtn.on('click', () => handleScriptDownload('cs'));
  $csLoadBtn.on('click', () => $csFileInput.click());
  $csFileInput.on('change', e => handleScriptFileLoad(e, 'cs'));

  $mainImportScriptBtn.on('click', () => {
    const isCharacterSelected = SillyTavern.getContext().characterId !== undefined;
    if (isCharacterSelected) {
      $mainImportScriptCharacterBtn.show();
    } else {
      $mainImportScriptCharacterBtn.hide();
    }
    $mainImportScriptOptions.slideToggle();
  });

  $mainImportScriptGlobalBtn.on('click', () => {
    currentScriptImportTarget = 'global';
    $mainScriptFileInput.click();
  });
  $mainImportScriptPresetBtn.on('click', () => {
    currentScriptImportTarget = 'preset';
    $mainScriptFileInput.click();
  });
  $mainImportScriptCharacterBtn.on('click', () => {
    currentScriptImportTarget = 'character';
    $mainScriptFileInput.click();
  });

  $mainScriptFileInput.on('change', function (e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function (e) {
      try {
        const data = JSON.parse(e.target.result);

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

        await updateScriptTreesWith(scripts => {
          scripts.push(scriptObj);
          return scripts;
        }, targetOpt);
        toastr.success(
          `成功导入至${currentScriptImportTarget === 'global' ? '全局' : currentScriptImportTarget === 'preset' ? '预设' : '角色'}脚本库！`,
        );
        $mainImportScriptOptions.slideUp();
      } catch (err) {
        toastr.error('导入失败: ' + err.message);
      }
      $mainScriptFileInput.val('');
    };
    reader.readAsText(file);
  });
}

export function getRegexObjFromUI(prefix, cardId = null) {
  const suffix = cardId ? `-${cardId}` : '';
  const htmlContent = $(`#wb-sync-${prefix}-content${suffix}`).val() || '';
  if (prefix !== 'cr' && !htmlContent) return null;

  const scriptNameInput = $(`#wb-sync-${prefix}-script-name${suffix}`).val();
  const scriptNameTrimmed = scriptNameInput ? scriptNameInput.trim() : '';
  if (prefix === 'cr' && !scriptNameTrimmed) return { error: '请输入名称' };

  const scriptName = scriptNameTrimmed || '新前端脚本';
  const findRegex = $(`#wb-sync-${prefix}-find-regex${suffix}`).val() || '<打开面板>';

  const placementInts = [];
  $(`.wb-sync-${prefix}-placement-cb${suffix}:checked`).each(function () {
    placementInts.push(parseInt($(this).val()));
  });
  if (placementInts.length === 0) placementInts.push(2);

  const isDisabled = $(`#wb-sync-${prefix}-disabled${suffix}`).is(':checked');
  const runOnEdit = $(`#wb-sync-${prefix}-run-on-edit${suffix}`).is(':checked');
  const substituteRegex = parseInt($(`#wb-sync-${prefix}-substitute-regex${suffix}`).val()) || 0;

  const markdownOnly = $(`#wb-sync-${prefix}-markdown-only${suffix}`).is(':checked');
  const promptOnly = $(`#wb-sync-${prefix}-prompt-only${suffix}`).is(':checked');

  const minDepthStr = $(`#wb-sync-${prefix}-min-depth${suffix}`).val();
  const minDepth = minDepthStr !== '' ? parseInt(minDepthStr) : null;

  const maxDepthStr = $(`#wb-sync-${prefix}-max-depth${suffix}`).val();
  const maxDepth = maxDepthStr !== '' ? parseInt(maxDepthStr) : null;

  const trimStringsRaw = $(`#wb-sync-${prefix}-trim-strings${suffix}`).val() || '';
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

export function convertToTavernRegex(regexObj) {
  const placement = regexObj.placement || [];
  return {
    id: regexObj.id,
    script_name: regexObj.scriptName,
    enabled: !regexObj.disabled,
    find_regex: regexObj.findRegex,
    replace_string: regexObj.replaceString,
    trim_strings: regexObj.trimStrings ? regexObj.trimStrings.join('\n') : '',
    source: {
      user_input: placement.includes(1),
      ai_output: placement.includes(2),
      slash_command: placement.includes(4),
      world_info: placement.includes(3),
      reasoning: placement.includes(5),
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

export function getScriptSyncObjFromUI(prefix, cardId = null) {
  const suffix = cardId ? `-${cardId}` : '';
  const content = $(`#wb-sync-${prefix}-content${suffix}`).val() || '';
  if (prefix !== 'cs' && !content) return null;

  const scriptNameInput = $(`#wb-sync-${prefix}-script-name${suffix}`).val();
  const scriptNameTrimmed = scriptNameInput ? scriptNameInput.trim() : '';
  if (prefix === 'cs' && !scriptNameTrimmed) return { error: '请输入名称' };

  const scriptName = scriptNameTrimmed || '新助手脚本';
  const isDisabled = $(`#wb-sync-${prefix}-disabled${suffix}`).is(':checked');
  const info = $(`#wb-sync-${prefix}-info${suffix}`).val() || '';

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

export async function handleRegexImport(prefix, targetType, cardId = null) {
  const regexObj = getRegexObjFromUI(prefix, cardId);
  if (!regexObj) return toastr.warning('没有可导入的内容');
  if (regexObj.error) return toastr.warning(regexObj.error);
  try {
    const tavernRegex = convertToTavernRegex(regexObj);
    
    let targetOpt = { type: targetType };
    if (targetType === 'preset') targetOpt = { type: 'preset', name: 'in_use' };
    if (targetType === 'character') targetOpt = { type: 'character', name: 'current' };

    await updateTavernRegexesWith(
      regexes => {
        regexes.push(tavernRegex);
        return regexes;
      },
      targetOpt,
    );
    const typeName = targetType === 'global' ? '全局' : targetType === 'preset' ? '预设' : '局部';
    toastr.success(`成功导入至${typeName}正则脚本！`);
  } catch (e) {
    toastr.error(`导入失败: ${e.message}`);
  }
}

export function handleRegexDownload(prefix, cardId = null) {
  const regexObj = getRegexObjFromUI(prefix, cardId);
  if (!regexObj) return toastr.warning('没有可下载的内容');
  if (regexObj.error) return toastr.warning(regexObj.error);

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(regexObj, null, 4));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', 'regex-' + regexObj.scriptName + '.json');
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  toastr.success('下载成功！');
}

export function handleRegexFileLoad(e, prefix) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      $(`#wb-sync-${prefix}-script-name`).val(data.scriptName || data.script_name || '');
      $(`#wb-sync-${prefix}-find-regex`).val(data.findRegex || data.find_regex || '');

      let content = data.replaceString || data.replace_string || '';
      content = content.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '');
      $(`#wb-sync-${prefix}-content`).val(content);

      let trimStrings = '';
      if (Array.isArray(data.trimStrings)) {
        trimStrings = data.trimStrings.join('\n');
      } else if (typeof data.trim_strings === 'string') {
        trimStrings = data.trim_strings;
      }
      $(`#wb-sync-${prefix}-trim-strings`).val(trimStrings);

      $(`.wb-sync-${prefix}-placement-cb`).prop('checked', false);
      let placements = data.placement || [];
      if (data.source) {
        if (data.source.user_input) placements.push(1);
        if (data.source.ai_output) placements.push(2);
        if (data.source.world_info) placements.push(3);
        if (data.source.slash_command) placements.push(4);
        if (data.source.reasoning) placements.push(5);
      }
      placements.forEach(val => {
        $(`.wb-sync-${prefix}-placement-cb[value="${val}"]`).prop('checked', true);
      });

      $(`#wb-sync-${prefix}-disabled`).prop('checked', data.disabled || data.enabled === false);
      $(`#wb-sync-${prefix}-run-on-edit`).prop('checked', data.runOnEdit || data.run_on_edit || false);
      $(`#wb-sync-${prefix}-substitute-regex`).val(data.substituteRegex || 0);

      $(`#wb-sync-${prefix}-markdown-only`).prop(
        'checked',
        data.markdownOnly || (data.destination && data.destination.display) || false,
      );
      $(`#wb-sync-${prefix}-prompt-only`).prop(
        'checked',
        data.promptOnly || (data.destination && data.destination.prompt) || false,
      );
      $(`#wb-sync-${prefix}-min-depth`).val(data.minDepth || data.min_depth || '');
      $(`#wb-sync-${prefix}-max-depth`).val(data.maxDepth || data.max_depth || '');

      toastr.success('正则脚本导入成功！');
    } catch (err) {
      toastr.error('解析 JSON 文件失败: ' + err.message);
    }
    $(`#wb-sync-${prefix}-file-input`).val('');
  };
  reader.readAsText(file);
}

export async function handleScriptImport(prefix, targetType, cardId = null) {
  const scriptObj = getScriptSyncObjFromUI(prefix, cardId);
  if (!scriptObj) return toastr.warning('没有可导入的内容');
  if (scriptObj.error) return toastr.warning(scriptObj.error);
  try {
    await updateScriptTreesWith(
      scripts => {
        scripts.push(scriptObj);
        return scripts;
      },
      { type: targetType },
    );
    const typeName = targetType === 'global' ? '全局' : targetType === 'preset' ? '预设' : '角色';
    toastr.success(`成功导入至${typeName}脚本库！`);
  } catch (e) {
    toastr.error(`导入失败: ${e.message}`);
  }
}

export function handleScriptDownload(prefix, cardId = null) {
  const scriptObj = getScriptSyncObjFromUI(prefix, cardId);
  if (!scriptObj) return toastr.warning('没有可下载的内容');
  if (scriptObj.error) return toastr.warning(scriptObj.error);

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(scriptObj, null, 4));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute('href', dataStr);
  downloadAnchorNode.setAttribute('download', '酒馆助手脚本-' + scriptObj.name + '.json');
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
  toastr.success('下载成功！');
}

export function handleScriptFileLoad(e, prefix) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);

      $(`#wb-sync-${prefix}-script-name`).val(data.name || '');
      $(`#wb-sync-${prefix}-content`).val(data.content || '');
      $(`#wb-sync-${prefix}-disabled`).prop('checked', data.enabled === false);

      toastr.success('助手脚本导入成功！');
    } catch (err) {
      toastr.error('解析 JSON 文件失败: ' + err.message);
    }
    $(`#wb-sync-${prefix}-file-input`).val('');
  };
  reader.readAsText(file);
}

export async function handleExtractScript(prefix, wrapInCodeBlock = false) {
  const startTag = $(`#wb-sync-${prefix}-tag-start`).val();
  const endTag = $(`#wb-sync-${prefix}-tag-end`).val();
  const floorInput = $(`#wb-sync-${prefix}-floor`).val();

  const extractedTexts = await extractContentFromMessage(startTag, endTag, floorInput);
  if (!extractedTexts) return;

  extractedScriptCards = extractedTexts.map((text, index) => {
    let finalContent = text;
    if (wrapInCodeBlock && !finalContent.startsWith('```')) {
      finalContent = '```html\n' + finalContent + '\n```';
    }
    return {
      id: Date.now() + index,
      content: finalContent,
      name: `提取脚本 ${index + 1}`
    };
  });
  
  renderScriptCards(prefix);
  toastr.success(`成功提取 ${extractedScriptCards.length} 个脚本`);
}

export async function handleExtractFrontend() {
  const startTag = $('#wb-sync-fe-tag-start').val();
  const endTag = $('#wb-sync-fe-tag-end').val();
  const floorInput = $('#wb-sync-fe-floor').val();

  const extractedTexts = await extractContentFromMessage(startTag, endTag, floorInput);
  if (!extractedTexts) return;

  extractedFrontendCards = extractedTexts.map((text, index) => {
    return {
      id: Date.now() + index,
      content: text,
      name: `提取前端 ${index + 1}`
    };
  });

  renderFrontendCards();
  toastr.success(`成功提取 ${extractedFrontendCards.length} 个前端代码`);
}

export function addFrontendCard(cardData) {
  extractedFrontendCards.unshift(cardData);
}

export function handleFrontendRender(cardId) {
  const $container = $(`#wb-sync-fe-preview-container-${cardId}`);
  const $btn = $(`.fe-render-btn[data-id="${cardId}"]`);
  
  if ($container.is(':visible')) {
    $container.empty().hide();
    $btn.html('👁️ 渲染前端');
    return;
  }

  let htmlContent = $(`#wb-sync-fe-content-${cardId}`).val();
  if (!htmlContent) return toastr.warning('没有可渲染的内容');

  htmlContent = htmlContent.replace(/^```(?:html)?\n?/i, '').replace(/\n?```$/i, '');

  const iframe = $('<iframe>', {
    srcdoc: htmlContent,
    style: 'width: 100%; height: 400px; border: none;',
  });
  $container.empty().append(iframe).show();
  $btn.html('🙈 取消渲染');
}

export function removeFrontendCard(id) {
  extractedFrontendCards = extractedFrontendCards.filter(c => c.id !== id);
  renderFrontendCards();
}

export function removeScriptCard(id) {
  extractedScriptCards = extractedScriptCards.filter(c => c.id !== id);
  renderScriptCards('ss');
}

export function renderFrontendCards() {
  if (extractedFrontendCards.length === 0) {
    $feCardsContainer.html('<div class="wb-sync-empty-msg">没有提取到任何前端代码。</div>');
    return;
  }

  let html = '';
  const defaultCollapse = isDefaultCollapse();
  extractedFrontendCards.forEach(card => {
    const contentStyle = defaultCollapse ? 'display: none; padding: 15px;' : 'padding: 15px;';
    const iconClass = defaultCollapse ? 'fa-chevron-down' : 'fa-chevron-up';
    html += `
    <div class="wb-sync-card" data-id="${card.id}" style="border: 1px solid var(--wb-sync-border); border-radius: 5px; background: rgba(0,0,0,0.2); overflow: hidden;">
      <div class="wb-sync-card-header" style="padding: 10px 15px; background: rgba(0,0,0,0.3); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold;">${card.name}</span>
        <i class="fa-solid ${iconClass} wb-sync-collapse-icon"></i>
      </div>
      <div class="wb-sync-card-content" style="${contentStyle}">
        <div class="wb-sync-row">
          <div class="wb-sync-group" style="flex: 1">
            <span class="wb-sync-label">脚本名称:</span>
            <input type="text" id="wb-sync-fe-script-name-${card.id}" class="wb-sync-input" style="width: 100%" value="${card.name}" />
          </div>
          <div class="wb-sync-group" style="flex: 1">
            <span class="wb-sync-label">查找正则:</span>
            <input type="text" id="wb-sync-fe-find-regex-${card.id}" class="wb-sync-input" style="width: 100%" value="<打开面板>" />
          </div>
        </div>
        <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 10px">
          <div style="display: flex; flex-direction: column; gap: 5px">
            <span class="wb-sync-label" style="font-weight: bold">作用范围</span>
            <label class="wb-sync-checkbox-label"><input type="checkbox" class="wb-sync-fe-placement-cb-${card.id}" value="1" /> 用户输入</label>
            <label class="wb-sync-checkbox-label"><input type="checkbox" class="wb-sync-fe-placement-cb-${card.id}" value="2" checked /> AI输出</label>
            <label class="wb-sync-checkbox-label"><input type="checkbox" class="wb-sync-fe-placement-cb-${card.id}" value="4" /> 快捷命令</label>
            <label class="wb-sync-checkbox-label"><input type="checkbox" class="wb-sync-fe-placement-cb-${card.id}" value="3" /> 世界信息</label>
            <label class="wb-sync-checkbox-label"><input type="checkbox" class="wb-sync-fe-placement-cb-${card.id}" value="5" /> 推理</label>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px">
            <span class="wb-sync-label" style="font-weight: bold">其他选项</span>
            <label class="wb-sync-checkbox-label"><input type="checkbox" id="wb-sync-fe-disabled-${card.id}" /> 已禁用</label>
            <label class="wb-sync-checkbox-label"><input type="checkbox" id="wb-sync-fe-run-on-edit-${card.id}" checked /> 在编辑时运行</label>
            <span class="wb-sync-label" style="font-weight: bold; margin-top: 5px">正则表达式查找时的宏</span>
            <select id="wb-sync-fe-substitute-regex-${card.id}" class="wb-sync-select" style="width: 120px">
              <option value="0" selected>不替换</option>
              <option value="1">替换</option>
            </select>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px">
            <span class="wb-sync-label" style="font-weight: bold">短暂</span>
            <label class="wb-sync-checkbox-label"><input type="checkbox" id="wb-sync-fe-markdown-only-${card.id}" checked /> 仅格式显示</label>
            <label class="wb-sync-checkbox-label"><input type="checkbox" id="wb-sync-fe-prompt-only-${card.id}" /> 仅格式提示词</label>
            <div style="display: flex; gap: 10px; margin-top: 5px">
              <div style="display: flex; flex-direction: column; gap: 2px">
                <span class="wb-sync-label">最小深度</span>
                <input type="number" id="wb-sync-fe-min-depth-${card.id}" class="wb-sync-input" style="width: 70px" placeholder="无限" />
              </div>
              <div style="display: flex; flex-direction: column; gap: 2px">
                <span class="wb-sync-label">最大深度</span>
                <input type="number" id="wb-sync-fe-max-depth-${card.id}" class="wb-sync-input" style="width: 70px" placeholder="无限" />
              </div>
            </div>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; margin-top: 10px;">
          <span class="wb-sync-label">修剪掉:</span>
          <textarea id="wb-sync-fe-trim-strings-${card.id}" class="wb-sync-textarea" style="min-height: 60px; margin-bottom: 10px" placeholder="在替换之前全局修剪正则表达式匹配中任何不需要的部分。用回车键分隔每个元素。"></textarea>
          <span class="wb-sync-label">替换为 (提取的 HTML 代码):</span>
          <textarea id="wb-sync-fe-content-${card.id}" class="wb-sync-textarea" style="min-height: 150px; font-family: monospace">${card.content}</textarea>
        </div>
        <div class="wb-sync-actions" style="justify-content: flex-end; margin-top: 10px">
          <button class="wb-sync-button fe-import-global-btn" data-id="${card.id}">导入至全局正则</button>
          <button class="wb-sync-button fe-import-preset-btn" data-id="${card.id}">导入至预设正则</button>
          <button class="wb-sync-button fe-import-character-btn" data-id="${card.id}">导入至局部正则</button>
          <button class="wb-sync-button fe-render-btn" data-id="${card.id}">👁️ 渲染前端</button>
          <button class="wb-sync-button wb-sync-btn-primary fe-download-btn" data-id="${card.id}">⬇️ 下载成正则脚本</button>
          <button class="wb-sync-button wb-sync-btn-small abandon fe-delete-btn" data-id="${card.id}">🗑️ 删除</button>
        </div>
        <div id="wb-sync-fe-preview-container-${card.id}" style="display: none; margin-top: 15px; border: 1px solid var(--wb-sync-border); border-radius: 5px; padding: 10px; background: #fff; color: #000; overflow: auto; min-height: 300px;"></div>
      </div>
    </div>
  `;
  });

  $feCardsContainer.html(html);
}

export function renderScriptCards(prefix) {
  const $container = $(`#wb-sync-${prefix}-cards-container`);
  if (extractedScriptCards.length === 0) {
    $container.html('<div class="wb-sync-empty-msg">没有提取到任何脚本代码。</div>');
    return;
  }

  let html = '';
  const defaultCollapse = isDefaultCollapse();
  extractedScriptCards.forEach(card => {
    const contentStyle = defaultCollapse ? 'display: none; padding: 15px;' : 'padding: 15px;';
    const iconClass = defaultCollapse ? 'fa-chevron-down' : 'fa-chevron-up';
    html += `
    <div class="wb-sync-card" data-id="${card.id}" style="border: 1px solid var(--wb-sync-border); border-radius: 5px; background: rgba(0,0,0,0.2); overflow: hidden;">
      <div class="wb-sync-card-header" style="padding: 10px 15px; background: rgba(0,0,0,0.3); cursor: pointer; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-weight: bold;">${card.name}</span>
        <i class="fa-solid ${iconClass} wb-sync-collapse-icon"></i>
      </div>
      <div class="wb-sync-card-content" style="${contentStyle}">
        <div class="wb-sync-row">
          <div class="wb-sync-group" style="flex: 1">
            <span class="wb-sync-label">脚本名称:</span>
            <input type="text" id="wb-sync-${prefix}-script-name-${card.id}" class="wb-sync-input" style="width: 100%" value="${card.name}" />
          </div>
        </div>
        <div style="display: flex; gap: 20px; flex-wrap: wrap; margin-top: 10px">
          <div style="display: flex; flex-direction: column; gap: 5px">
            <label class="wb-sync-checkbox-label"><input type="checkbox" id="wb-sync-${prefix}-disabled-${card.id}" /> 已禁用</label>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; margin-top: 10px;">
          <span class="wb-sync-label">提取的脚本内容 (JS/TS):</span>
          <textarea id="wb-sync-${prefix}-content-${card.id}" class="wb-sync-textarea" style="min-height: 150px; font-family: monospace">${card.content}</textarea>
          <span class="wb-sync-label" style="margin-top: 10px">作者备注:</span>
          <textarea id="wb-sync-${prefix}-info-${card.id}" class="wb-sync-textarea" style="min-height: 60px" placeholder="脚本备注，例如作者名、版本和注意事项等，支持简单的 markdown 和 html"></textarea>
        </div>
        <div class="wb-sync-actions" style="justify-content: flex-end; margin-top: 10px; flex-wrap: wrap">
          <button class="wb-sync-button ss-import-global-btn" data-id="${card.id}" style="background-color: var(--wb-sync-primary); color: #000; opacity: 1">导入至全局脚本库</button>
          <button class="wb-sync-button ss-import-preset-btn" data-id="${card.id}" style="background-color: var(--wb-sync-primary); color: #000; opacity: 1">导入至预设脚本库</button>
          <button class="wb-sync-button ss-import-character-btn" data-id="${card.id}" style="background-color: var(--wb-sync-primary); color: #000; opacity: 1">导入至角色脚本库</button>
          <button class="wb-sync-button wb-sync-btn-primary ss-download-btn" data-id="${card.id}" style="opacity: 1">⬇️ 下载脚本</button>
          <button class="wb-sync-button wb-sync-btn-small abandon ss-delete-btn" data-id="${card.id}">🗑️ 删除</button>
        </div>
      </div>
    </div>
  `;
  });

  $container.html(html);
}
