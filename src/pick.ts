type Os = "linux" | "windows" | "mac" | "android";
type Arch = "x64" | "arm64" | "arm" | "x86" | "other" | "universal";

interface Asset {
	name: string;
	size: number;
	download_count: number;
	browser_download_url: string;
}

interface Platform {
	os: Os;
	arch: Arch;
}

const OS: Record<Os | "other", RegExp> = {
	windows: /(?<![a-z])(win(dows|32|64)?|msvc|mingw\w*|w64)(?![a-z])|\.(exe|msi|msix|appx)$/,
	mac: /(?<![a-z])mac(os(x)?)?(?![a-z])|darwin|osx|apple|\.(dmg|pkg)$/,
	linux: /linux|appimage|ubuntu|debian|fedora|opensuse|centos|flatpak|\.(deb|rpm|snap)$/,
	android: /android|^(?!.*linux).*\.(apk|aab)$/,
	other: /bsd|dragonfly|illumos|solaris|aix|haiku|\.ipa$/,
};

const ARCH: [Arch, RegExp][] = [
	["x64", /x86[_-]?64|amd64|x64|win64|intel/],
	["arm64", /aarch64|arm64|armv8/],
	["arm", /(?<![a-z])arm(v[5-7]\w*|hf|el|eabi\w*)?(?![a-z0-9])/],
	["x86", /(?<![a-z0-9])(i[3-6]86|x86|386|ia32|win32)(?![a-z0-9])/],
	["other", /ppc|s390|riscv|loong|mips|sparc/],
	["universal", /universal/],
];

const FORMATS: Record<Os, RegExp[]> = {
	linux: [/appimage/, /^[^.]+$|\.(tar\.\w+|tgz|zip)$/, /\.deb$/, /\.rpm$/, /\.jar$/],
	windows: [/\.(exe|msi|msix|appx)$/, /\.(zip|7z)$/, /\.jar$/],
	mac: [/\.(dmg|pkg)$/, /\.(zip|tar\.\w+|tgz)$/, /^[^.]+$|\.jar$/],
	android: [/\.apk$/],
};

const JUNK =
	/\.(sha\d*|sha\d+sum|md5|sig|asc|pem|crt|minisig|sbom|spdx|json|ya?ml|txt|md|blockmap|zsync|b3|intoto\.jsonl|pub|key|xml|nupkg|delta)$|checksums?|sha\d+sums|^releases$|filesforjar|(?<![a-z])(debug\w*|dbg|symbols?|pdb|src|sources?(only)?|translations?|completions?)(?![a-z])/;

function platformOf(ua: string): Platform {
	const os: Os = /Windows/.test(ua)
		? "windows"
		: /Android/.test(ua)
			? "android"
			: /Mac OS X|Macintosh/.test(ua)
				? "mac"
				: "linux";
	const arch: Arch = os === "mac" || os === "android" || /aarch64|arm64/i.test(ua) ? "arm64" : "x64";
	return { os, arch };
}

function score(name: string, { os, arch }: Platform): number {
	const n = name.toLowerCase();
	if (JUNK.test(n)) return -1;
	const oses = (Object.keys(OS) as (keyof typeof OS)[]).filter((o) => OS[o].test(n));
	if (oses.includes("other") || (oses.length && !oses.includes(os))) return -1;
	let a = ARCH.find(([, re]) => re.test(n))?.[0];
	if (a === "arm" && os === "mac") a = "arm64";
	const rosetta = os === "mac" && a === "x64";
	if (a && a !== arch && a !== "universal" && !rosetta) return -1;
	const formats = FORMATS[os];
	const f = formats.findIndex((re) => re.test(n));
	if (!oses.length && (f < 0 || /^[^.]+$/.test(n))) return -1;
	return (oses.length ? 1000 : 0) + (f < 0 ? 0 : formats.length - f) * 10 + (rosetta ? 0 : 1);
}

function pick<T extends Pick<Asset, "name" | "download_count">>(assets: T[], ua: string): T | null {
	const platform = platformOf(ua);
	let best: T | null = null;
	let bestScore = -1;
	for (const asset of assets) {
		const s = score(asset.name, platform);
		if (s > bestScore || (best && s === bestScore && s >= 0 && asset.download_count > best.download_count)) {
			best = asset;
			bestScore = s;
		}
	}
	return best;
}
