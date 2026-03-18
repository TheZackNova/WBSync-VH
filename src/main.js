import { initEntries } from "./features/entries.js";
import { initScripts } from "./features/scripts.js";
import { initSettings } from "./features/settings.js";
import { initSync } from "./features/sync.js";
import { initWorldbook, handleCreateWorldbook } from "./features/worldbook.js";
import { initPresets } from "./features/presets.js";
import { populateSyncWorldbooks } from "./features/sync.js";
import { initManageWorldbook, renderManageWorldbookList } from "./features/manage-worldbook.js";
import { initManageScripts, renderManageScriptLists } from "./features/manage-scripts.js";
import { initManageRegex, renderManageRegexLists } from "./features/manage-regex.js";
import { checkUpdateStatus, executeUpdate } from "./features/update.js";
import {
  closePopup,
  elements,
  initUIElements,
  showMainView,
  showSubView,
} from "./ui.js";

const MODULE_NAME = "Đồng bộ Sổ thế giới";
const extensionFolderPath = `scripts/extensions/third-party/WBSync`;

export const STORAGE_KEY_TAG_START = "wb-sync-tag-start-val";
export const STORAGE_KEY_TAG_END = "wb-sync-tag-end-val";

async function init() {
  try {
    const html = await $.get(`/${extensionFolderPath}/panel.html`);
    $("body").append(html);

    initUIElements();

    $("#wb-sync-popup-close-button").on("click touchend", closePopup);
    $("#wb-sync-popup-back-btn").on("click touchend", showMainView);
    elements.overlay.on("click", function (e) {
      if (e.target === this) closePopup();
    });
    $("#wb-sync-popup").on("click", (e) => e.stopPropagation());

    $("#wb-sync-popup").on(
      "click",
      ".wb-sync-section-header:has(.wb-sync-collapse-icon)",
      function () {
        const $content = $(this)
          .closest(".wb-sync-section")
          .find(".wb-sync-section-content");
        const $icon = $(this).find(".wb-sync-collapse-icon");
        if ($content.is(":visible")) {
          $content.slideUp(200);
          $icon.removeClass("fa-chevron-up").addClass("fa-chevron-down");
        } else {
          $content.slideDown(200);
          $icon.removeClass("fa-chevron-down").addClass("fa-chevron-up");
        }
      },
    );

    $("#wb-sync-select-book-btn").on("click", () =>
      showSubView("wb-sync-select-view"),
    );
    $("#wb-sync-load-preset-btn").on("click", () =>
      $("#wb-sync-preset-list-container").slideToggle(),
    );
    $("#wb-sync-goto-delete-btn").on("click", () =>
      showSubView("wb-sync-delete-view"),
    );
    $("#wb-sync-goto-modify-btn").on("click", () =>
      showSubView("wb-sync-modify-view"),
    );
    $("#wb-sync-goto-transfer-btn").on("click", () =>
      showSubView("wb-sync-transfer-view"),
    );
    $("#wb-sync-goto-duplicate-btn").on("click", () =>
      showSubView("wb-sync-duplicate-view"),
    );
    $("#wb-sync-goto-rename-btn").on("click", () =>
      showSubView("wb-sync-rename-view"),
    );
    $("#wb-sync-goto-frontend-btn").on("click", () =>
      showSubView("wb-sync-frontend-view"),
    );
    $("#wb-sync-goto-script-sync-btn").on("click", () =>
      showSubView("wb-sync-script-sync-view"),
    );
    $("#wb-sync-goto-create-regex-btn").on("click", () =>
      showSubView("wb-sync-create-regex-view"),
    );
    $("#wb-sync-goto-create-script-btn").on("click", () =>
      showSubView("wb-sync-create-script-view"),
    );
    $("#wb-sync-goto-settings-btn").on("click", () =>
      showSubView("wb-sync-settings-view"),
    );
    $("#wb-sync-goto-sync-btn").on("click", () =>
      showSubView("wb-sync-sync-view"),
    );
    $("#wb-sync-goto-manage-wb-btn").on("click", () =>
      showSubView("wb-sync-manage-wb-view"),
    );
    $("#wb-sync-goto-manage-script-btn").on("click", () =>
      showSubView("wb-sync-manage-script-view"),
    );
    $("#wb-sync-goto-manage-regex-btn").on("click", () =>
      showSubView("wb-sync-manage-regex-view"),
    );

    $("#wb-sync-create-wb-btn").on("click", () => handleCreateWorldbook());

    $("#wb-sync-sync-create-wb-btn").on("click", () =>
      handleCreateWorldbook(async (newName) => {
        await populateSyncWorldbooks();
        $("#wb-sync-target-wb").val(newName);
      }),
    );

    const $tagStart = $("#wb-sync-tag-start");
    const $tagEnd = $("#wb-sync-tag-end");

    const savedTagStart = localStorage.getItem(STORAGE_KEY_TAG_START);
    const savedTagEnd = localStorage.getItem(STORAGE_KEY_TAG_END);
    if (savedTagStart) $tagStart.val(savedTagStart);
    if (savedTagEnd) $tagEnd.val(savedTagEnd);

    $tagStart.on("change input", function () {
      localStorage.setItem(STORAGE_KEY_TAG_START, $(this).val());
    });
    $tagEnd.on("change input", function () {
      localStorage.setItem(STORAGE_KEY_TAG_END, $(this).val());
    });

    initEntries();
    initScripts();
    initSettings();
    initSync();
    initWorldbook();
    initPresets();
    initManageWorldbook();
    initManageScripts();
    initManageRegex();

    showMainView();
    console.log(`[${MODULE_NAME}] Khởi tạo hoàn tất`);
    
    const updateStatus = await checkUpdateStatus();
    if (updateStatus.hasUpdate) {
      if (updateStatus.isNewInstall) {
        executeUpdate(updateStatus);
      } else {
        $("#wb-sync-update-section").show();
        $("#wb-sync-update-btn").on("click", () => executeUpdate(updateStatus));
      }
    }
  } catch (e) {
    console.error(`[${MODULE_NAME}] Khởi tạo thất bại:`, e);
  }
}

init();
