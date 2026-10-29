# github-download ⬇️

i saw a meme, "the world if github had a big ass button that says DOWNLOAD", with one of those shiny future city pictures. so now it has one

it's a small extension for waterfox / firefox that puts a giant green DOWNLOAD button on top of every repo's main page. you click it and you get the file that actually runs on your computer. not the source, not the checksums, not the arm build for a board you don't own

under the button it tells you what it grabbed and how big it is

### how it picks
- looks at the release github marks as latest
- throws out the stuff nobody clicks on purpose: checksums, signatures, debug symbols, source tarballs, shell completions
- keeps whatever matches your os and cpu
- on linux it goes appimage first, then plain binaries and tarballs, then `.deb` / `.rpm`. windows prefers installers, mac prefers `.dmg`
- if two files tie, the one more people downloaded wins (the crowd is usually right)
- if the release is just one plain file, like a theme `.css` or a `.js`, it grabs that

if there's no build for your system it looks in the repo for something installable (a `.user.css`, a `.user.js`, a `.css` / `.js` named like the repo). only then you get the source zip (or the main branch zip if there are no releases at all). kinda like the old green code button, just louder

### installing
it's not on addons.mozilla.org. grab the `.xpi` from [releases](https://github.com/v1ol3tr0se/github-download/releases), or build it yourself:

```shell
yarn install
yarn build
```

then `about:addons` → ⚙ → install add-on from file → the `.xpi`

if firefox says it can't be verified, it's because it isn't signed by mozilla. on normal firefox you can still load it from `about:debugging` → this firefox → load temporary add-on, it just goes away when you close the browser. to keep it installed you need a browser that lets you turn off `xpinstall.signatures.required` (waterfox, librewolf, firefox nightly / developer edition)

### heads up
- it only shows on the repo's main page, not in issues or files
- browsers don't say if a mac is apple silicon or intel, so it assumes apple silicon and falls back to intel builds
- private repos get the main branch zip, github's api can't see them without a login
- github gives you 60 api calls an hour without an account and one click uses one or two. you'd have to really love downloading

the meme was right, honestly
