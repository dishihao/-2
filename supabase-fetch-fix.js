(() => {
  'use strict';
  if (window.__specimenSupabaseFetchFixed) return;
  window.__specimenSupabaseFetchFixed = true;

  const nativeFetch = window.fetch.bind(window);
  window.fetch = function(input, init = {}) {
    try {
      const url = typeof input === 'string' ? input : (input && input.url) || '';
      if (/\.supabase\.co\/rest\/v1\//i.test(url)) {
        const headers = new Headers(init.headers || (input && input.headers) || {});
        const key = headers.get('apikey') || '';
        // Supabase 新版 sb_publishable_ 密钥不是 JWT，只应通过 apikey 发送。
        // 旧版 anon JWT 仍保留 Authorization 头。
        if (key.startsWith('sb_publishable_')) {
          headers.delete('Authorization');
        }
        init = { ...init, headers };
      }
    } catch (_) {}
    return nativeFetch(input, init);
  };
})();
