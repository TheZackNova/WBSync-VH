const STORAGE_KEY_VERSION = 'wb-sync-version';
const extensionBaseUrl = new URL('../../', import.meta.url);

export async function checkUpdateStatus() {
  try {
    const manifest = await $.getJSON(new URL('manifest.json', extensionBaseUrl).href);
    const currentVersion = manifest.version;
    const savedVersion = localStorage.getItem(STORAGE_KEY_VERSION);

    if (!savedVersion) {
      return { hasUpdate: true, isNewInstall: true, version: currentVersion };
    } else if (savedVersion !== currentVersion) {
      return { hasUpdate: true, isNewInstall: false, version: currentVersion };
    }
    return { hasUpdate: false };
  } catch (e) {
    console.error('[Đồng bộ Sổ thế giới] Kiểm tra trạng thái cập nhật thất bại:', e);
    return { hasUpdate: false };
  }
}

export function executeUpdate(status) {
  if (status.isNewInstall) {
    toastr.success('Đồng bộ Sổ thế giới đã cài đặt xong, trang sẽ tự làm mới sau 5 giây');
  } else {
    toastr.success('Đồng bộ Sổ thế giới đã cập nhật xong, trang sẽ tự làm mới sau 5 giây');
  }
  localStorage.setItem(STORAGE_KEY_VERSION, status.version);
  setTimeout(() => {
    window.location.reload();
  }, 5000);
}
