// A COPY OF THIS FILE, NAMED endpoint.js, IS WHAT CONNECTS THE PAGE TO THE SHEET.
//
// endpoint.js is NOT in this repository and must never be. The repo is public, because a free
// GitHub organization cannot publish Pages from a private one, and SPEC section 3 says no URL
// that matters is ever committed. The /exec address is not a secret in the cryptographic
// sense, tokens are the only real gate, but publishing it invites anyone to probe it and there
// is nothing to gain by making that easy.
//
// To connect the page, create app/endpoint.js beside this file with one line:
//
//   window.IS9WD_ENDPOINT = 'https://script.google.com/macros/s/AKfyc.../exec';
//
// Get that address from the Sheet: IS9 Deliverables > Copy the endpoint URL. It is the same
// value stored in IS9WD_ENDPOINT_URL on _Engine, so the emails and the page cannot disagree.
//
// .gitignore already excludes app/endpoint.js. If git ever offers to commit it, something is
// wrong: stop and check, rather than committing and deleting it afterwards, because a deleted
// file stays in the history.
window.IS9WD_ENDPOINT = 'PASTE_THE_EXEC_URL_HERE';
