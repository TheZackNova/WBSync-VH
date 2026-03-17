const STORAGE_KEY_VERSION = 'wb-sync-version';
const extensionFolderPath = 'scripts/extensions/third-party/WBSync';

export async function checkUpdateStatus() {
  try {
    const manifest = await $.getJSON(`/${extensionFolderPath}/manifest.json`);
    const currentVersion = manifest.version;
    const savedVersion = localStorage.getItem(STORAGE_KEY_VERSION);

    if (!savedVersion) {
      return { hasUpdate: true, isNewInstall: true, version: currentVersion };
    } else if (savedVersion !== currentVersion) {
      return { hasUpdate: true, isNewInstall: false, version: currentVersion };
    }
    return { hasUpdate: false };
  } catch (e) {
    console.error('[世界书同步器] 检查更新状态失败:', e);
    return { hasUpdate: false };
  }
}

export function executeUpdate(status) {
  if (status.isNewInstall) {
    toastr.success('世界书同步器安装已完成5秒后刷新网页');
  } else {
    toastr.success('世界书同步器更新已完成5秒后刷新网页');
  }
  localStorage.setItem(STORAGE_KEY_VERSION, status.version);
  setTimeout(() => {
    window.location.reload();
  }, 5000);
}
