import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { test } from "node:test";
import { runInNewContext } from "node:vm";

type Named = { name: string; download_count: number };
type PickFn = (assets: Named[], ua: string) => Named | null;
type DeliverableFn = (names: string[], repo: string) => string | null;

const source = stripTypeScriptTypes(readFileSync(new URL("../src/pick.ts", import.meta.url), "utf8"));
const { pick, deliverable }: { pick: PickFn; deliverable: DeliverableFn } = runInNewContext(
	`${source};({ pick, deliverable })`,
);

const UA = {
	linux: "Mozilla/5.0 (X11; Linux x86_64; rv:153.0) Gecko/20100101 Firefox/153.0",
	windows: "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:153.0) Gecko/20100101 Firefox/153.0",
	mac: "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:153.0) Gecko/20100101 Firefox/153.0",
	android: "Mozilla/5.0 (Android 14; Mobile; rv:153.0) Gecko/153.0 Firefox/153.0",
};
type Os = keyof typeof UA;

const fixture = (repo: string): Named[] =>
	JSON.parse(readFileSync(new URL(`fixtures/${repo}.json`, import.meta.url), "utf8")).assets ?? [];
const picked = (repo: string, os: Os) => pick(fixture(repo), UA[os])?.name ?? null;
const one = (name: string, os: Os) => pick([{ name, download_count: 1 }], UA[os])?.name ?? null;

test("picks the right build from real releases", () => {
	assert.equal(picked("obsidianmd_obsidian-releases", "linux"), "Obsidian-1.14.5.AppImage");
	assert.equal(picked("BurntSushi_ripgrep", "windows"), "ripgrep-15.2.0-x86_64-pc-windows-msvc.zip");
	assert.equal(picked("BurntSushi_ripgrep", "mac"), "ripgrep-15.2.0-aarch64-apple-darwin.tar.gz");
	assert.equal(picked("fastfetch-cli_fastfetch", "mac"), "fastfetch-macos-universal.tar.gz");
	assert.equal(picked("mpv-player_mpv", "mac"), "mpv-v0.41.0-macos-26-arm.zip");
	assert.equal(picked("alacritty_alacritty", "windows"), "Alacritty-v0.17.0-installer.msi");
	assert.equal(
		picked("flameshot-org_flameshot", "linux"),
		"flameshot-v14.0+git0.da6121bd-artifact-appimage-x86_64.zip",
	);
	assert.equal(picked("yt-dlp_yt-dlp", "linux"), "yt-dlp_linux");
});

test("falls back to the source zip when nothing fits", () => {
	assert.equal(picked("mpv-player_mpv", "linux"), null);
	assert.equal(picked("alacritty_alacritty", "linux"), null);
	assert.equal(picked("torvalds_linux", "linux"), null);
});

test("skips files that are not the app", () => {
	assert.equal(one("retroarch-sourceonly-1.22.2.tar.xz", "linux"), null);
	assert.equal(one("translations.zip", "linux"), null);
	assert.equal(one("linuxFilesForJar.zip", "linux"), null);
	assert.equal(one("completions-0.23.5.tar.gz", "mac"), null);
	assert.equal(one("k9s_linux_arm64.apk", "android"), null);
	assert.equal(one("sourcegit-2026.23.linux.amd64.AppImage", "linux"), "sourcegit-2026.23.linux.amd64.AppImage");
});

test("takes a plain file from the release when that is the whole app", () => {
	for (const os of ["linux", "windows", "mac"] as const) {
		assert.equal(one("float.theme.css", os), "float.theme.css");
		assert.equal(one("float.js", os), "float.js");
	}
	assert.equal(
		pick(
			[
				{ name: "tool-linux-x86_64.AppImage", download_count: 1 },
				{ name: "install.js", download_count: 99 },
			],
			UA.linux,
		)?.name,
		"tool-linux-x86_64.AppImage",
	);
});

test("finds an installable file in the repo root", () => {
	const root = [".editorconfig", "README.md", "biome.json", "build.ts", "float.js", "package.json"];
	assert.equal(deliverable(root, "float-spicetify"), "float.js");
	assert.equal(deliverable(["README.md", "catppuccin.user.css", "index.js"], "userstyles"), "catppuccin.user.css");
	assert.equal(deliverable(["README.md", "biome.json", "package.json"], "clawd"), null);
	assert.equal(deliverable(["index.js", "README.md"], "some-lib"), null);
});
