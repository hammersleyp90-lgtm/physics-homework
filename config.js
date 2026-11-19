// Where the site's database lives. The key is Supabase's public ("publishable") key: it is meant to be in the page,
// and on its own it can only call the login-checked functions in supabase/schema.sql.
window.HW_CONFIG = window.HW_CONFIG_OVERRIDE || (/^(localhost|127\.0\.0\.1)$/.test(location.hostname)
  ? { url: location.origin, key: 'local-test' }
  : { url: 'https://nkmhlriqeaepxoixfmae.supabase.co', key: 'sb_publishable_9l0NTBkeFT2_xqwqgE32DA_jpo2HP5Q' });
