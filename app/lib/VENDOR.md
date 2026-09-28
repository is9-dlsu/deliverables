# Vendored libraries

Three files, 16.4 KB together, pinned here on 2026-09-28 with Ethan's approval. Nothing is
fetched at runtime: the officers' page loads only files from its own origin.

**Why pinned rather than loaded from a CDN.** The app is a link that thirteen officers open on
their phones once a week, often on university wifi. A CDN outage, a DNS failure or a school
network that blocks a domain would break every link at once, and the failure would arrive as a
blank page. Pinning also means a later president can read every byte the page runs.

**Why a framework at all, given it is a list of checkboxes.** Optimistic ticking, a sixty
second undo countdown per item and a network that drops mid-request are three pieces of state
that have to stay in step. Preact plus htm is 16 KB and no build step; writing that by hand is
more of our code and more places to get it wrong.

| File | Upstream | Version | Bytes |
|---|---|---|---|
| `preact.module.js` | `cdn.jsdelivr.net/npm/preact@10.24.3/dist/preact.module.js` | 10.24.3 | 11,429 |
| `hooks.module.js` | `cdn.jsdelivr.net/npm/preact@10.24.3/hooks/dist/hooks.module.js` | 10.24.3 | 3,741 |
| `htm.module.js` | `cdn.jsdelivr.net/npm/htm@3.1.1/dist/htm.module.js` | 3.1.1 | 1,207 |

## The one edit, and why

`hooks.module.js` ships importing the bare specifier `"preact"`, which a browser cannot
resolve on its own. Exactly one string was changed:

```
from"preact"   ->   from"./preact.module.js"
```

sha256 before `896fc8e546b96c3fca29743b493293820ad4e76396fd36ff05f18a52eaf303e1`
sha256 after  `66d649cc2f76c6f038737b495dd2102f7f3c4a9aee1b8b01eb1ee87e293e13b4`

`preact.module.js` and `htm.module.js` are untouched.

**The alternative was an import map, and it was rejected deliberately.** An import map would
have kept all three byte identical, but it needs Safari 16.4, released March 2023. Some
officers will be on older iPhones that cannot update, and for them the page would fail to load
with no explanation. One rewritten string costs less than excluding a student from their own
deliverables list.

## Updating

Fetch the new version, apply the same one line change to `hooks.module.js`, record the hashes
above, and open the app on a phone before issuing links. There is no lockfile and no install
step to run, by design: `git clone` is the whole setup.
