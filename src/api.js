import { delay } from './utils.js';

let tavernHelperApi;

export async function waitForTavernHelper(retries = 10, interval = 300) {
  for (let i = 0; i < retries; i++) {
    if (window.TavernHelper && typeof window.TavernHelper.getLorebooks === 'function') {
      return window.TavernHelper;
    }
    await delay(interval);
  }
  throw new Error('TavernHelper API 未加载，请确保已安装并启用 JS-Slash-Runner 扩展。');
}

export async function getTavernHelper() {
  if (!tavernHelperApi) tavernHelperApi = await waitForTavernHelper();
  return tavernHelperApi;
}

export async function getAllLorebooks() {
  const api = await getTavernHelper();
  const names = await api.getLorebooks();
  return names.map(name => ({ name, file_name: name }));
}

export async function getLorebookSettings() {
  const api = await getTavernHelper();
  return await api.getLorebookSettings();
}

export async function setLorebookSettings(settings) {
  const api = await getTavernHelper();
  await api.setLorebookSettings(settings);
}

export async function getLorebookEntries(bookName) {
  const api = await getTavernHelper();
  return await api.getLorebookEntries(bookName);
}

export async function setLorebookEntries(bookName, entries) {
  const api = await getTavernHelper();
  await api.replaceLorebookEntries(bookName, entries);
}

export async function createLorebookEntry(bookName, entryData) {
  const api = await getTavernHelper();
  return await api.createLorebookEntry(bookName, entryData);
}
