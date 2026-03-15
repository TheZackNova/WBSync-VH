jQuery(async () => {
  try {
    await import('./src/main.js');
  } catch (e) {
    console.error('[世界书同步器] 模块加载失败:', e);
  }
});
