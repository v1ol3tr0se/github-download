interface Release {
	tag_name: string;
	assets: Asset[];
}

const ROOT = /^\/([^/]+)\/([^/]+)\/?$/;

function button(): HTMLButtonElement {
	const b = document.createElement("button");
	b.id = "gh-big-download";
	b.type = "button";
	b.append("DOWNLOAD", document.createElement("small"));
	return b;
}

async function download(b: HTMLElement): Promise<void> {
	const m = location.pathname.match(ROOT);
	const note = b.querySelector("small");
	if (!m || !note) return;
	const nwo = `${m[1]}/${m[2]}`;
	note.textContent = "finding the right file…";
	try {
		const api = `https://api.github.com/repos/${nwo}/releases`;
		let res = await fetch(`${api}/latest`);
		if (res.status === 404) res = await fetch(`${api}?per_page=1`);
		if (res.status === 404) {
			location.assign(`https://github.com/${nwo}/archive/HEAD.zip`);
			return;
		}
		if (!res.ok) throw new Error(String(res.status));
		const data: Release | Release[] = await res.json();
		const release = Array.isArray(data) ? data[0] : data;
		const asset = release ? pick(release.assets, navigator.userAgent) : null;
		if (asset) {
			note.textContent = `${asset.name} · ${(asset.size / 1048576).toFixed(1)} MB`;
			location.assign(asset.browser_download_url);
		} else {
			note.textContent = `${release ? release.tag_name : "latest"} source code`;
			location.assign(
				`https://github.com/${nwo}/archive/${release ? `refs/tags/${encodeURI(release.tag_name)}` : "HEAD"}.zip`,
			);
		}
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
