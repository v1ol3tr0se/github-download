interface Release {
	tag_name: string;
	assets: Asset[];
}

interface RepoFile {
	name: string;
	type: string;
	download_url: string;
}

const ROOT = /^\/([^/]+)\/([^/]+)\/?$/;

function button(): HTMLButtonElement {
	const b = document.createElement("button");
	b.id = "gh-big-download";
	b.type = "button";
	b.append("DOWNLOAD", document.createElement("small"));
	return b;
}

function size(bytes: number): string {
	return bytes < 1048576 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

async function api<T>(url: string): Promise<T | null> {
	const res = await fetch(`https://api.github.com/repos/${url}`);
	if (res.status === 404) return null;
	if (!res.ok) throw new Error(String(res.status));
	return res.json();
}

async function save(url: string, name: string): Promise<void> {
	const blob = await (await fetch(url)).blob();
	const a = document.createElement("a");
	a.href = URL.createObjectURL(blob);
	a.download = name;
	document.body.append(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
}

async function download(b: HTMLElement): Promise<void> {
	const m = location.pathname.match(ROOT);
	const note = b.querySelector("small");
	if (!m || !note) return;
	const nwo = `${m[1]}/${m[2]}`;
	note.textContent = "finding the right file…";
	try {
		const release =
			(await api<Release>(`${nwo}/releases/latest`)) ?? (await api<Release[]>(`${nwo}/releases?per_page=1`))?.[0];
		const asset = release ? pick(release.assets, navigator.userAgent) : null;
		if (asset) {
			note.textContent = `${asset.name} · ${size(asset.size)}`;
			location.assign(asset.browser_download_url);
			return;
		}
		const files = (await api<RepoFile[]>(`${nwo}/contents`)) ?? [];
		const name = deliverable(
			files.filter((f) => f.type === "file").map((f) => f.name),
			m[2],
		);
		const file = files.find((f) => f.name === name);
		if (file) {
			note.textContent = file.name;
			await save(file.download_url, file.name);
			return;
		}
		note.textContent = `${release ? release.tag_name : "latest"} source code`;
		location.assign(
			`https://github.com/${nwo}/archive/${release ? `refs/tags/${encodeURI(release.tag_name)}` : "HEAD"}.zip`,
		);
	} catch {
		location.assign(`https://github.com/${nwo}/releases/latest`);
	}
}

function sync(): void {
	const frame = document.getElementById("repo-content-turbo-frame");
	const skip = document.getElementById("code-view-repo-link");
	const b = document.getElementById("gh-big-download");
	if ((frame || skip) && ROOT.test(location.pathname)) {
		if (b) return;
		if (frame) frame.prepend(button());
		else skip?.after(button());
	} else {
		b?.remove();
	}
}

document.addEventListener("click", (e) => {
	const b = e.target instanceof Element ? e.target.closest<HTMLElement>("#gh-big-download") : null;
	if (b) download(b);
});
new MutationObserver(sync).observe(document.documentElement, { childList: true, subtree: true });
sync();
