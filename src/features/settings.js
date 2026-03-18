import { showPopup } from '../ui.js';

export const STORAGE_KEY_BUTTON_POS = 'wb-sync-btn-pos';
export const STORAGE_KEY_SETTINGS = 'wb-sync-settings';

let $showFloatingBtn;
let $showMagicWandBtn;
let $showQrBtn;
let $defaultCollapseBtn;
let $manageWbCollapsedBtn;
let $manageScriptCollapsedBtn;
let $manageRegexCollapsedBtn;

export function initSettings() {
  $showFloatingBtn = $('#wb-sync-setting-show-floating-btn');
  $showMagicWandBtn = $('#wb-sync-setting-show-magic-wand-btn');
  $showQrBtn = $('#wb-sync-setting-show-qr-btn');
  $defaultCollapseBtn = $('#wb-sync-setting-default-collapse');
  $manageWbCollapsedBtn = $('#wb-sync-setting-manage-wb-collapsed');
  $manageScriptCollapsedBtn = $('#wb-sync-setting-manage-script-collapsed');
  $manageRegexCollapsedBtn = $('#wb-sync-setting-manage-regex-collapsed');

  $showFloatingBtn
    .on('mousedown', function () {
      $(this).data('last-checked', $(this).is(':checked'));
    })
    .on('change', saveSettings);
  $showMagicWandBtn
    .on('mousedown', function () {
      $(this).data('last-checked', $(this).is(':checked'));
    })
    .on('change', saveSettings);
  $showQrBtn
    .on('mousedown', function () {
      $(this).data('last-checked', $(this).is(':checked'));
    })
    .on('change', saveSettings);
  $defaultCollapseBtn.on('change', saveSettings);
  $manageWbCollapsedBtn.on('change', saveSettings);
  $manageScriptCollapsedBtn.on('change', saveSettings);
  $manageRegexCollapsedBtn.on('change', saveSettings);

  loadSettings();
  initFloatingButton();
  initQrMenu();
}

export function initFloatingButton() {
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

export function loadSettings() {
  if (!$showFloatingBtn) {
    $showFloatingBtn = $('#wb-sync-setting-show-floating-btn');
    $showMagicWandBtn = $('#wb-sync-setting-show-magic-wand-btn');
    $showQrBtn = $('#wb-sync-setting-show-qr-btn');
    $defaultCollapseBtn = $('#wb-sync-setting-default-collapse');
    $manageWbCollapsedBtn = $('#wb-sync-setting-manage-wb-collapsed');
    $manageScriptCollapsedBtn = $('#wb-sync-setting-manage-script-collapsed');
    $manageRegexCollapsedBtn = $('#wb-sync-setting-manage-regex-collapsed');
  }

  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
  $showFloatingBtn.prop('checked', settings.showFloatingBtn !== false);
  $showMagicWandBtn.prop('checked', settings.showMagicWandBtn !== false);
  $showQrBtn.prop('checked', settings.showQrBtn !== false);
  $defaultCollapseBtn.prop('checked', settings.defaultCollapse !== false);
  $manageWbCollapsedBtn.prop('checked', settings.manageWbCollapsed === true);
  $manageScriptCollapsedBtn.prop('checked', settings.manageScriptCollapsed === true);
  $manageRegexCollapsedBtn.prop('checked', settings.manageRegexCollapsed === true);
  applySettings(settings);
}

export function saveSettings(event) {
  const $changedCheckbox = $(event.target);
  const settings = {
    showFloatingBtn: $showFloatingBtn.is(':checked'),
    showMagicWandBtn: $showMagicWandBtn.is(':checked'),
    showQrBtn: $showQrBtn.is(':checked'),
    defaultCollapse: $defaultCollapseBtn.is(':checked'),
    manageWbCollapsed: $manageWbCollapsedBtn.is(':checked'),
    manageScriptCollapsed: $manageScriptCollapsedBtn.is(':checked'),
    manageRegexCollapsed: $manageRegexCollapsedBtn.is(':checked'),
  };

  if (!settings.showFloatingBtn && !settings.showMagicWandBtn && !settings.showQrBtn) {
    toastr.warning('Cần giữ lại ít nhất một lối vào tiện ích!');
    $changedCheckbox.prop('checked', true);
    return;
  }

  localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  applySettings(settings);
  toastr.success('Đã lưu cài đặt!');
}

export function isDefaultCollapse() {
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
  return settings.defaultCollapse !== false;
}

export function isManageWbCollapsed() {
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
  return settings.manageWbCollapsed === true;
}

export function isManageScriptCollapsed() {
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
  return settings.manageScriptCollapsed === true;
}

export function isManageRegexCollapsed() {
  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
  return settings.manageRegexCollapsed === true;
}

export function applySettings(settings) {
  $('#wb-sync-floating-btn').toggle(settings.showFloatingBtn !== false);

  const menuId = 'wb-sync-extension-menu-item';
  if (settings.showMagicWandBtn !== false) {
      if ($(`#${menuId}`).length === 0) {
          const menuItemHtml = `
              <div id="${menuId}" class="list-group-item flex-container flexGap5" title="Mở Đồng bộ Sổ thế giới">
                  <i class="fa-solid fa-book-atlas fa-fw"></i>
                  <span>Đồng bộ Sổ thế giới</span>
              </div>
          `;
          $('#extensionsMenu').append(menuItemHtml);
          $(`#${menuId}`).on('click', () => {
              showPopup();
          });
      } else {
          $(`#${menuId}`).show();
      }
  } else {
      $(`#${menuId}`).hide();
  }

  $('#wb-sync-qr-menu-item').toggle(settings.showQrBtn !== false);
}

export function initQrMenu() {
  const qrMenuId = 'wb-sync-qr-menu-item';
  let qrRetryCount = 0;
  const qrInterval = setInterval(() => {
      if ($(`#${qrMenuId}`).length > 0) {
          clearInterval(qrInterval);
          return;
      }

      const $qrBar = $('#quick-reply-btns, .qr--button-row, #qr--button-row, #script-buttons-container, .script-buttons-container').first();

      if ($qrBar.length > 0) {
          const qrItemHtml = `
              <div id="${qrMenuId}" class="menu_button qr--button" title="Mở Đồng bộ Sổ thế giới" style="cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; margin-right: 5px; background: rgba(255,255,255,0.1); border-radius: 5px;">
                  <i class="fa-solid fa-book-atlas"></i>
              </div>
          `;
          $qrBar.append(qrItemHtml);
          $(`#${qrMenuId}`).on('click', () => {
              showPopup();
          });
          const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
          $(`#${qrMenuId}`).toggle(settings.showQrBtn !== false);
          clearInterval(qrInterval);
      } else {
          qrRetryCount++;
          if (qrRetryCount > 20) {
              clearInterval(qrInterval);
              const $sendTextarea = $('#send_textarea, #user_input').first();
              if ($sendTextarea.length > 0) {
                   const qrItemHtml = `
                      <div id="${qrMenuId}" class="menu_button" title="Mở Đồng bộ Sổ thế giới" style="cursor: pointer; display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; margin-bottom: 5px; background: rgba(255,255,255,0.1); border-radius: 5px;">
                          <i class="fa-solid fa-book-atlas"></i>
                      </div>
                  `;
                  $sendTextarea.parent().prepend(qrItemHtml);
                  $(`#${qrMenuId}`).on('click', () => {
                      showPopup();
                  });
                  const settings = JSON.parse(localStorage.getItem(STORAGE_KEY_SETTINGS)) || {};
                  $(`#${qrMenuId}`).toggle(settings.showQrBtn !== false);
              }
          }
      }
  }, 500);
}
