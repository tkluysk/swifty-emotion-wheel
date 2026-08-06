(async function () {
  const SVG_NS = "http://www.w3.org/2000/svg";
  const CX = 400, CY = 400;
  const R_CORE = 130;
  const R_MID = 260;
  const R_OUTER = 395;
  const R_CENTER_HOLE = 55;

  const svg = document.getElementById("wheel");
  const panelEmpty = document.getElementById("panel-empty");
  const panelSong = document.getElementById("panel-song");
  const breadcrumbEl = document.getElementById("breadcrumb");
  const feelingEl = document.getElementById("song-feeling");
  const titleEl = document.getElementById("song-title");
  const albumEl = document.getElementById("song-album");
  const artEl = document.getElementById("song-art");
  const player = document.getElementById("player");

  let selectedSegment = null;

  const res = await fetch("data/wheel.json");
  const data = await res.json();

  // live Spotify metadata (album art, verified title), keyed by track id.
  // Falls back silently to the static data/wheel.json values if unset or unreachable.
  const liveMetadata = {};
  const metadataUrl = window.SPOTIFY_METADATA_URL;
  if (metadataUrl) {
    const allIds = [];
    for (const core of data.core) {
      for (const mid of core.mid) {
        for (const outer of mid.outer) allIds.push(outer.spotifyId);
      }
    }
    fetch(`${metadataUrl}?ids=${allIds.join(",")}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json?.tracks) return;
        for (const track of json.tracks) {
          if (track) liveMetadata[track.id] = track;
        }
        if (selectedSegment) showSong(selectedSegment.dataset);
      })
      .catch(() => {
        // no-op: static data already renders fine without live metadata
      });
  }

  function polar(cx, cy, r, angleDeg) {
    const a = ((angleDeg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
  }

  function arcPath(r1, r2, startAngle, endAngle) {
    const [x1, y1] = polar(CX, CY, r1, startAngle);
    const [x2, y2] = polar(CX, CY, r1, endAngle);
    const [x3, y3] = polar(CX, CY, r2, endAngle);
    const [x4, y4] = polar(CX, CY, r2, startAngle);
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return [
      `M ${x1} ${y1}`,
      `A ${r1} ${r1} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${r2} ${r2} 0 ${largeArc} 0 ${x4} ${y4}`,
      "Z",
    ].join(" ");
  }

  function makeEl(tag, attrs) {
    const el = document.createElementNS(SVG_NS, tag);
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
    return el;
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) + amt;
    let g = ((n >> 8) & 0xff) + amt;
    let b = (n & 0xff) + amt;
    r = Math.max(0, Math.min(255, r));
    g = Math.max(0, Math.min(255, g));
    b = Math.max(0, Math.min(255, b));
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  function addLabel(r1, r2, startAngle, endAngle, text, extraClass, maxFont) {
    const midAngle = (startAngle + endAngle) / 2;
    const midR = (r1 + r2) / 2;
    const [x, y] = polar(CX, CY, midR, midAngle);
    // radial orientation: text runs along the spoke (90deg from tangential).
    // flip 180deg on the lower half so it isn't upside down.
    let rot = midAngle + 90;
    if (midAngle > 0 && midAngle < 180) rot += 180;

    // shrink font to fit the available radial band length + arc width
    const arcLen = ((endAngle - startAngle) * Math.PI / 180) * midR;
    const bandWidth = r2 - r1;
    const approxCharWidth = 0.62;
    const fontFromBand = bandWidth / Math.max(text.length * approxCharWidth, 1);
    const fontFromArc = arcLen * 0.85;
    const fontSize = Math.max(6, Math.min(maxFont, fontFromBand, fontFromArc));

    const label = makeEl("text", {
      x, y,
      class: "segment-label" + (extraClass ? " " + extraClass : ""),
      "text-anchor": "middle",
      "dominant-baseline": "middle",
      "font-size": fontSize.toFixed(1),
      transform: `rotate(${rot}, ${x}, ${y})`,
    });
    label.textContent = text;
    return label;
  }

  // count total outer leaves per core, to size angles proportionally
  let totalOuterLeaves = 0;
  for (const core of data.core) {
    for (const mid of core.mid) totalOuterLeaves += mid.outer.length;
  }

  let angleCursor = 0;

  for (const core of data.core) {
    const coreLeafCount = core.mid.reduce((sum, m) => sum + m.outer.length, 0);
    const coreAngleSpan = (coreLeafCount / totalOuterLeaves) * 360;
    const coreStart = angleCursor;
    const coreEnd = angleCursor + coreAngleSpan;

    // core ring segment
    const coreColor = core.color;
    const corePath = makeEl("path", {
      d: arcPath(0, R_CORE, coreStart, coreEnd),
      fill: coreColor,
      class: "segment",
    });
    corePath.dataset.level = "core";
    svg.appendChild(corePath);
    svg.appendChild(addLabel(R_CENTER_HOLE, R_CORE, coreStart, coreEnd, core.name, "core-label", 15));

    let midCursor = coreStart;
    for (const mid of core.mid) {
      const midLeafCount = mid.outer.length;
      const midAngleSpan = (midLeafCount / coreLeafCount) * coreAngleSpan;
      const midStart = midCursor;
      const midEnd = midCursor + midAngleSpan;
      const midColor = shade(coreColor, 12);

      const midPath = makeEl("path", {
        d: arcPath(R_CORE, R_MID, midStart, midEnd),
        fill: midColor,
        class: "segment",
      });
      svg.appendChild(midPath);
      svg.appendChild(addLabel(R_CORE, R_MID, midStart, midEnd, mid.name, "", 12.5));

      let outerCursor = midStart;
      const outerAngleSpan = midAngleSpan / midLeafCount;
      for (const outer of mid.outer) {
        const outerStart = outerCursor;
        const outerEnd = outerCursor + outerAngleSpan;
        const outerColor = shade(coreColor, 30);

        const outerPath = makeEl("path", {
          d: arcPath(R_MID, R_OUTER, outerStart, outerEnd),
          fill: outerColor,
          class: "segment",
          tabindex: "0",
          role: "button",
          "aria-label": `${outer.name}: ${outer.song}`,
        });
        outerPath.dataset.feeling = outer.name;
        outerPath.dataset.song = outer.song;
        outerPath.dataset.album = outer.album;
        outerPath.dataset.spotifyId = outer.spotifyId;
        outerPath.dataset.core = core.name;
        outerPath.dataset.mid = mid.name;

        const select = () => {
          if (selectedSegment) selectedSegment.classList.remove("selected");
          outerPath.classList.add("selected");
          selectedSegment = outerPath;
          showSong(outerPath.dataset);
        };
        outerPath.addEventListener("click", select);
        outerPath.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            select();
          }
        });

        svg.appendChild(outerPath);
        svg.appendChild(addLabel(R_MID, R_OUTER, outerStart, outerEnd, outer.name, "", 12.5));

        outerCursor = outerEnd;
      }

      midCursor = midEnd;
    }

    angleCursor = coreEnd;
  }

  svg.appendChild(makeEl("circle", { cx: CX, cy: CY, r: R_CENTER_HOLE, class: "center-hole" }));

  function showSong(ds) {
    panelEmpty.hidden = true;
    panelSong.hidden = false;
    const live = liveMetadata[ds.spotifyId];

    breadcrumbEl.textContent = `${ds.core} → ${ds.mid}`;
    feelingEl.textContent = ds.feeling;
    titleEl.textContent = live?.name ?? ds.song;
    albumEl.textContent = live?.album ?? ds.album;

    if (live?.albumArtUrl) {
      artEl.src = live.albumArtUrl;
      artEl.alt = `${titleEl.textContent} album art`;
      artEl.hidden = false;
    } else {
      artEl.hidden = true;
    }

    player.src = `https://open.spotify.com/embed/track/${ds.spotifyId}?utm_source=generator`;
  }
})();
