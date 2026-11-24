# Physics homework platform

A static site on GitHub Pages (`index.html`, the `bank-*.js` question banks and `config.js`), with student work,
classes and accounts stored in a Supabase database.

- **Students** log in with their student number and a 4-digit PIN. Work saves as they go and follows them to any device.
- **Teachers** log in with a password. The first account (admin) needs the one-time setup code.
- `supabase/schema.sql` sets up the database: private tables, login checks, lockout after 8 wrong attempts,
  and functions the site calls. Only those functions are reachable with the public key in `config.js`.
- No names are needed: use student numbers in class lists.

## Question generators

`generators/` holds the stand-alone A-level question generators (one HTML page per topic) with a links page at `generators/index.html`, so students can open them in any browser, including on iPads.
