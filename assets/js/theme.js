(() => {
  const root = document.documentElement;
  const key = 'bob-lee-theme';
  const system = window.matchMedia('(prefers-color-scheme: dark)');
  const valid = value => ['light', 'dark'].includes(value) ? value : 'system';
  let preference = 'system';
  try { preference = valid(localStorage.getItem(key)); } catch {}

  function apply() {
    root.dataset.theme = preference === 'system' ? (system.matches ? 'dark' : 'light') : preference;
    const control = document.getElementById('theme-mode');
    if (control) {
      const dark = root.dataset.theme === 'dark';
      const label = `当前${dark ? '深色' : '浅色'}模式（${preference === 'system' ? '跟随系统' : '手动'}），点击切换为${dark ? '浅色' : '深色'}模式`;
      control.setAttribute('aria-label', label);
      control.title = label;
    }
  }

  // Apply before the stylesheet renders to avoid a bright flash on dark pages.
  apply();
  system.addEventListener('change', apply);
  window.addEventListener('storage', event => {
    if (event.key === key || event.key === null) {
      preference = valid(event.newValue);
      apply();
    }
  });
  document.addEventListener('DOMContentLoaded', () => {
    const control = document.getElementById('theme-mode');
    if (!control) return;
    apply();
    control.closest('.theme-switcher').hidden = false;
    control.addEventListener('click', () => {
      const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
      // Returning to the system's appearance also restores automatic changes.
      preference = next === (system.matches ? 'dark' : 'light') ? 'system' : next;
      try {
        if (preference === 'system') localStorage.removeItem(key);
        else localStorage.setItem(key, preference);
      } catch {}
      apply();
    });
  });
})();
