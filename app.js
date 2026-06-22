// ===== Gig-Dex — concert collection app =====
// Data persisted in localStorage. No backend required.

const STORAGE_KEY = "gigdex.gigs.v1";
const WISHLIST_KEY = "gigdex.wishlist.v1";

/** @typedef {{id:string, artist:string, date:string, venue:string, city:string, image:string, rating:number, notes:string}} Gig */

/** @type {Gig[]} */
let gigs = load();
/** @type {Gig[]} */
let wishlist = loadWishlist();

// ----- DOM refs -----
const grid = document.getElementById("grid");
const statsEl = document.getElementById("stats");
const emptyState = document.getElementById("emptyState");
const searchInput = document.getElementById("searchInput");
const sortSelect = document.getElementById("sortSelect");

// Wishlist refs
const wishGrid = document.getElementById("wishGrid");
const wishEmptyState = document.getElementById("wishEmptyState");
const wishSearch = document.getElementById("wishSearch");
const wishSort = document.getElementById("wishSort");

const modalOverlay = document.getElementById("modalOverlay");
const modalTitle = document.getElementById("modalTitle");
const gigForm = document.getElementById("gigForm");
const ratingInput = document.getElementById("ratingInput");
const ratingField = ratingInput.closest(".field");
const deleteBtn = document.getElementById("deleteBtn");
const moveBtn = document.getElementById("moveBtn");

const fields = {
  id: document.getElementById("gigId"),
  artist: document.getElementById("artistInput"),
  date: document.getElementById("dateInput"),
  venue: document.getElementById("venueInput"),
  city: document.getElementById("cityInput"),
  image: document.getElementById("imageInput"),
  notes: document.getElementById("notesInput"),
};

let currentRating = 0;
// Which list the modal is currently operating on: "collection" | "wishlist".
let currentList = "collection";

// ----- Persistence -----
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : seed();
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(gigs));
}

function loadWishlist() {
  try {
    const raw = localStorage.getItem(WISHLIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveWishlist() {
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(wishlist));
}

function seed() {
  // A couple of example gigs so the app isn't empty on first run.
  return [
    {
      id: uid(),
      artist: "Arctic Monkeys",
      date: "2023-09-12",
      venue: "Accor Arena",
      city: "Paris",
      image: "",
      rating: 5,
      notes: "Incredible encore.",
    },
    {
      id: uid(),
      artist: "Tame Impala",
      date: "2022-07-04",
      venue: "Roskilde",
      city: "Roskilde",
      image: "",
      rating: 4,
      notes: "",
    },
  ];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ----- Helpers -----
function timesSeen(artist) {
  const key = artist.trim().toLowerCase();
  return gigs.filter((g) => g.artist.trim().toLowerCase() === key).length;
}

function initials(name) {
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(iso) {
  if (!iso) return "Date unknown";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function starString(rating) {
  const full = "★".repeat(rating);
  const empty = "☆".repeat(5 - rating);
  return { full, empty };
}

// ----- Rendering -----
function render() {
  const term = searchInput.value.trim().toLowerCase();
  let list = gigs.filter((g) => {
    if (!term) return true;
    return (
      g.artist.toLowerCase().includes(term) ||
      (g.venue || "").toLowerCase().includes(term) ||
      (g.city || "").toLowerCase().includes(term)
    );
  });

  list = sortList(list, sortSelect.value);

  grid.innerHTML = "";
  emptyState.hidden = gigs.length !== 0;

  for (const gig of list) {
    grid.appendChild(buildTile(gig));
  }

  renderStats();
}

function sortList(list, mode) {
  const sorted = [...list];
  switch (mode) {
    case "oldest":
      sorted.sort((a, b) => (a.date || "").localeCompare(b.date || ""));
      break;
    case "artist":
      sorted.sort((a, b) => a.artist.localeCompare(b.artist));
      break;
    case "rating":
      sorted.sort((a, b) => b.rating - a.rating);
      break;
    case "seen":
      sorted.sort((a, b) => timesSeen(b.artist) - timesSeen(a.artist));
      break;
    case "recent":
    default:
      sorted.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }
  return sorted;
}

function buildTile(gig) {
  const tile = document.createElement("article");
  tile.className = "tile";
  tile.addEventListener("click", () => openModal(gig));

  // Image area
  const imgWrap = document.createElement("div");
  imgWrap.className = "tile-img";
  if (gig.image) {
    const img = document.createElement("img");
    img.src = gig.image;
    img.alt = gig.artist;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      imgWrap.innerHTML = "";
      imgWrap.appendChild(makeInitials(gig.artist));
    });
    imgWrap.appendChild(img);
  } else {
    imgWrap.appendChild(makeInitials(gig.artist));
  }

  const seen = timesSeen(gig.artist);
  if (seen > 1) {
    const badge = document.createElement("span");
    badge.className = "seen-badge";
    badge.textContent = `Seen ${seen}×`;
    imgWrap.appendChild(badge);
  }

  // Body
  const body = document.createElement("div");
  body.className = "tile-body";

  const artist = document.createElement("h3");
  artist.className = "tile-artist";
  artist.textContent = gig.artist;

  const meta = document.createElement("div");
  meta.className = "tile-meta";
  const dateLine = document.createElement("span");
  dateLine.textContent = formatDate(gig.date);
  const venueLine = document.createElement("span");
  venueLine.textContent = [gig.venue, gig.city].filter(Boolean).join(" · ") || "Venue unknown";
  meta.append(dateLine, venueLine);

  const stars = document.createElement("div");
  stars.className = "tile-stars";
  const { full, empty } = starString(gig.rating);
  stars.append(document.createTextNode(full));
  const emptySpan = document.createElement("span");
  emptySpan.className = "empty";
  emptySpan.textContent = empty;
  stars.appendChild(emptySpan);

  body.append(artist, meta, stars);
  tile.append(imgWrap, body);
  return tile;
}

function makeInitials(name) {
  const span = document.createElement("span");
  span.className = "tile-initials";
  span.textContent = initials(name) || "?";
  return span;
}

function renderStats() {
  const total = gigs.length;
  const uniqueArtists = new Set(gigs.map((g) => g.artist.trim().toLowerCase())).size;
  const rated = gigs.filter((g) => g.rating > 0);
  const avg = rated.length
    ? (rated.reduce((s, g) => s + g.rating, 0) / rated.length).toFixed(1)
    : "–";

  const items = [
    { value: total, label: "Gigs" },
    { value: uniqueArtists, label: "Artists" },
    { value: avg, label: "Avg rating" },
  ];

  statsEl.innerHTML = "";
  for (const it of items) {
    const card = document.createElement("div");
    card.className = "stat-card";
    const v = document.createElement("div");
    v.className = "stat-value";
    v.textContent = it.value;
    const l = document.createElement("div");
    l.className = "stat-label";
    l.textContent = it.label;
    card.append(v, l);
    statsEl.appendChild(card);
  }
}

// ----- Wishlist rendering -----
function renderWishlist() {
  const term = wishSearch.value.trim().toLowerCase();
  let list = wishlist.filter((g) => {
    if (!term) return true;
    return (
      g.artist.toLowerCase().includes(term) ||
      (g.venue || "").toLowerCase().includes(term) ||
      (g.city || "").toLowerCase().includes(term)
    );
  });

  list = sortWishlist(list, wishSort.value);

  wishGrid.innerHTML = "";
  wishEmptyState.hidden = wishlist.length !== 0;

  for (const gig of list) {
    wishGrid.appendChild(buildWishTile(gig));
  }
}

function sortWishlist(list, mode) {
  const sorted = [...list];
  switch (mode) {
    case "latest":
      sorted.sort((a, b) => (b.date || "").localeCompare(a.date || ""));
      break;
    case "artist":
      sorted.sort((a, b) => a.artist.localeCompare(b.artist));
      break;
    case "soonest":
    default:
      // Empty dates sink to the bottom.
      sorted.sort((a, b) => (a.date || "9999").localeCompare(b.date || "9999"));
  }
  return sorted;
}

function buildWishTile(gig) {
  const tile = document.createElement("article");
  tile.className = "tile";
  tile.addEventListener("click", () => openModal(gig, "wishlist"));

  const imgWrap = document.createElement("div");
  imgWrap.className = "tile-img";
  if (gig.image) {
    const img = document.createElement("img");
    img.src = gig.image;
    img.alt = gig.artist;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      imgWrap.innerHTML = "";
      imgWrap.appendChild(makeInitials(gig.artist));
    });
    imgWrap.appendChild(img);
  } else {
    imgWrap.appendChild(makeInitials(gig.artist));
  }

  const body = document.createElement("div");
  body.className = "tile-body";

  const artist = document.createElement("h3");
  artist.className = "tile-artist";
  artist.textContent = gig.artist;

  const meta = document.createElement("div");
  meta.className = "tile-meta";
  const dateLine = document.createElement("span");
  dateLine.textContent = formatDate(gig.date);
  const venueLine = document.createElement("span");
  venueLine.textContent =
    [gig.venue, gig.city].filter(Boolean).join(" · ") || "Venue unknown";
  meta.append(dateLine, venueLine);

  body.append(artist, meta);
  tile.append(imgWrap, body);
  return tile;
}

// ----- Modal -----
function openModal(gig, list = "collection") {
  currentList = list;
  const isWish = list === "wishlist";
  gigForm.reset();
  // Rating only makes sense for gigs you've actually seen.
  ratingField.hidden = isWish;
  if (gig) {
    modalTitle.textContent = isWish ? "Edit Wish" : "Edit Gig";
    fields.id.value = gig.id;
    fields.artist.value = gig.artist;
    fields.date.value = gig.date;
    fields.venue.value = gig.venue;
    fields.city.value = gig.city;
    fields.image.value = gig.image;
    fields.notes.value = gig.notes;
    setRating(gig.rating || 0);
    deleteBtn.hidden = false;
    moveBtn.hidden = !isWish;
  } else {
    modalTitle.textContent = isWish ? "Add Wish" : "Add Gig";
    fields.id.value = "";
    setRating(0);
    deleteBtn.hidden = true;
    moveBtn.hidden = true;
  }
  modalOverlay.hidden = false;
}

function closeModal() {
  modalOverlay.hidden = true;
}

function setRating(value) {
  currentRating = value;
  ratingInput.querySelectorAll(".star").forEach((star) => {
    star.classList.toggle("active", Number(star.dataset.value) <= value);
  });
}

// ----- Events -----
document.getElementById("addBtn").addEventListener("click", () => openModal(null));
document.getElementById("emptyAddBtn").addEventListener("click", () => openModal(null));
document.getElementById("wishAddBtn").addEventListener("click", () => openModal(null, "wishlist"));
document.getElementById("wishEmptyAddBtn").addEventListener("click", () => openModal(null, "wishlist"));
document.getElementById("modalClose").addEventListener("click", closeModal);
document.getElementById("cancelBtn").addEventListener("click", closeModal);

modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !modalOverlay.hidden) closeModal();
});

ratingInput.addEventListener("click", (e) => {
  const star = e.target.closest(".star");
  if (!star) return;
  const value = Number(star.dataset.value);
  // Click same star twice to clear.
  setRating(value === currentRating ? 0 : value);
});

searchInput.addEventListener("input", render);
sortSelect.addEventListener("change", render);

wishSearch.addEventListener("input", renderWishlist);
wishSort.addEventListener("change", renderWishlist);

gigForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {
    artist: fields.artist.value.trim(),
    date: fields.date.value,
    venue: fields.venue.value.trim(),
    city: fields.city.value.trim(),
    image: fields.image.value.trim(),
    rating: currentRating,
    notes: fields.notes.value.trim(),
  };
  if (!data.artist) return;

  const list = currentList === "wishlist" ? wishlist : gigs;
  const id = fields.id.value;
  if (id) {
    const item = list.find((g) => g.id === id);
    if (item) Object.assign(item, data);
  } else {
    list.push({ id: uid(), ...data });
  }
  persistAndRender();
  closeModal();
});

deleteBtn.addEventListener("click", () => {
  const id = fields.id.value;
  if (!id) return;
  const label = currentList === "wishlist" ? "wish" : "gig";
  if (!confirm(`Delete this ${label}?`)) return;
  if (currentList === "wishlist") {
    wishlist = wishlist.filter((g) => g.id !== id);
  } else {
    gigs = gigs.filter((g) => g.id !== id);
  }
  persistAndRender();
  closeModal();
});

// Move a wishlist item into the collection (e.g. once you've seen the show).
moveBtn.addEventListener("click", () => {
  const id = fields.id.value;
  if (!id || currentList !== "wishlist") return;
  const item = wishlist.find((g) => g.id === id);
  if (!item) return;
  wishlist = wishlist.filter((g) => g.id !== id);
  gigs.push({ ...item, rating: item.rating || 0 });
  persistAndRender();
  closeModal();
});

function persistAndRender() {
  save();
  saveWishlist();
  render();
  renderWishlist();
  renderTrophies();
}

// ----- Export / Import -----
const importFile = document.getElementById("importFile");

document.getElementById("exportBtn").addEventListener("click", exportJson);
document.getElementById("importBtn").addEventListener("click", () => importFile.click());
importFile.addEventListener("change", importJson);

function exportJson() {
  const payload = {
    app: "gigdex",
    version: 1,
    exportedAt: new Date().toISOString(),
    gigs,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `gigdex-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importJson(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      const incoming = Array.isArray(parsed) ? parsed : parsed.gigs;
      if (!Array.isArray(incoming)) throw new Error("No gigs array found");

      const cleaned = incoming
        .filter((g) => g && typeof g.artist === "string" && g.artist.trim())
        .map((g) => ({
          id: typeof g.id === "string" ? g.id : uid(),
          artist: String(g.artist).trim(),
          date: typeof g.date === "string" ? g.date : "",
          venue: typeof g.venue === "string" ? g.venue : "",
          city: typeof g.city === "string" ? g.city : "",
          image: typeof g.image === "string" ? g.image : "",
          rating: Number(g.rating) >= 0 && Number(g.rating) <= 5 ? Number(g.rating) : 0,
          notes: typeof g.notes === "string" ? g.notes : "",
        }));

      if (!cleaned.length) {
        alert("No valid gigs found in that file.");
        return;
      }

      const replace = confirm(
        `Found ${cleaned.length} gig(s).\n\nOK = replace your current collection.\nCancel = merge with it.`
      );

      if (replace) {
        gigs = cleaned;
      } else {
        const existingIds = new Set(gigs.map((g) => g.id));
        for (const g of cleaned) {
          if (existingIds.has(g.id)) g.id = uid();
          gigs.push(g);
        }
      }
      save();
      render();
      alert(`Imported ${cleaned.length} gig(s).`);
    } catch (err) {
      alert("Could not import file: " + err.message);
    } finally {
      importFile.value = "";
    }
  };
  reader.readAsText(file);
}

// ----- Tabs -----
const tabs = document.querySelectorAll(".tab");
const panels = {
  collection: document.getElementById("tab-collection"),
  wishlist: document.getElementById("tab-wishlist"),
  trophies: document.getElementById("tab-trophies"),
  releases: document.getElementById("tab-releases"),
  news: document.getElementById("tab-news"),
};
let releasesLoaded = false;
let newsLoaded = false;

tabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    tabs.forEach((t) => t.classList.toggle("active", t === tab));
    const target = tab.dataset.tab;
    for (const [name, panel] of Object.entries(panels)) {
      panel.hidden = name !== target;
    }
    if (target === "releases" && !releasesLoaded) {
      loadReleases();
    }
    if (target === "news" && !newsLoaded) {
      loadNews();
    }
    if (target === "trophies") {
      renderTrophies();
    }
  });
});

// ----- New Releases (Metal Archives) -----
const releaseGrid = document.getElementById("releaseGrid");
const releaseStatus = document.getElementById("releaseStatus");
const releaseSearch = document.getElementById("releaseSearch");
const releaseTypeSelect = document.getElementById("releaseType");
const releaseGenreSelect = document.getElementById("releaseGenre");
const releaseYearEl = document.getElementById("releaseYear");
const currentYear = new Date().getFullYear();

/** @type {Array<{band:string,bandUrl:string,album:string,albumUrl:string,type:string,genre:string,date:string,year:number}>} */
let releases = [];

releaseYearEl.textContent = currentYear;
document.getElementById("releaseRefresh").addEventListener("click", loadReleases);
releaseSearch.addEventListener("input", renderReleases);
releaseTypeSelect.addEventListener("change", renderReleases);
releaseGenreSelect.addEventListener("change", loadReleases);

// MusicBrainz is a free, CORS-enabled music database (no API key needed).
// We query metal-tagged release-groups first released in the current year.
// Cover art comes from the Cover Art Archive. Works on static hosts like GitHub Pages.
const MB_ENDPOINT = "https://musicbrainz.org/ws/2/release-group/";

async function loadReleases() {
  releasesLoaded = true;
  const genre = releaseGenreSelect.value;
  releaseStatus.className = "release-status";
  releaseStatus.textContent = `Loading ${genre} releases from MusicBrainz…`;
  releaseGrid.innerHTML = "";
  try {
    const query =
      `tag:"${genre}" AND firstreleasedate:[${currentYear}-01-01 TO ${currentYear}-12-31]`;
    const url =
      MB_ENDPOINT +
      "?query=" +
      encodeURIComponent(query) +
      "&fmt=json&limit=100";

    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error("HTTP " + res.status);
    const data = await res.json();

    const groups = data["release-groups"] || [];
    releases = groups
      .map((g) => ({
        id: g.id,
        band: (g["artist-credit"] || []).map((a) => a.name).join(", ") || "Unknown",
        album: g.title || "Untitled",
        type: g["primary-type"] || "Release",
        date: g["first-release-date"] || "",
        year: parseYear(g["first-release-date"]),
      }))
      .filter((r) => r.year === currentYear)
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));

    releaseStatus.textContent = releases.length
      ? ""
      : `No ${currentYear} ${genre} releases found.`;
    renderReleases();
  } catch (err) {
    releaseStatus.className = "release-status error";
    releaseStatus.textContent =
      "Could not load releases from MusicBrainz (" + err.message + "). Try Refresh in a moment.";
  }
}

function parseYear(dateStr) {
  const m = /(\d{4})/.exec(dateStr || "");
  return m ? Number(m[1]) : 0;
}

function renderReleases() {
  const term = releaseSearch.value.trim().toLowerCase();
  const typeFilter = releaseTypeSelect.value;

  const list = releases.filter((r) => {
    const type = r.type.toLowerCase();
    if (typeFilter === "full-length" && type !== "album") return false;
    if (typeFilter === "ep" && type !== "ep") return false;
    if (!term) return true;
    return (
      r.band.toLowerCase().includes(term) ||
      r.album.toLowerCase().includes(term)
    );
  });

  releaseGrid.innerHTML = "";
  for (const r of list) {
    releaseGrid.appendChild(buildReleaseTile(r));
  }
  if (releases.length && !list.length) {
    releaseStatus.className = "release-status";
    releaseStatus.textContent = "No releases match your filter.";
  } else if (releases.length) {
    releaseStatus.textContent = "";
  }
}

function buildReleaseTile(r) {
  const tile = document.createElement("article");
  tile.className = "tile";

  const imgWrap = document.createElement("div");
  imgWrap.className = "tile-img";

  const badge = document.createElement("span");
  badge.className = "release-date-badge";
  badge.textContent = r.date;

  // Cover Art Archive front image for the release-group (may 404 if none on file).
  const img = document.createElement("img");
  img.src = `https://coverartarchive.org/release-group/${r.id}/front-250`;
  img.alt = r.album;
  img.loading = "lazy";
  img.addEventListener("error", () => {
    imgWrap.innerHTML = "";
    imgWrap.appendChild(makeInitials(r.band));
    imgWrap.appendChild(badge);
  });
  imgWrap.appendChild(img);
  imgWrap.appendChild(badge);

  const body = document.createElement("div");
  body.className = "tile-body";

  const type = document.createElement("span");
  type.className = "tile-type";
  type.textContent = r.type || "Release";

  const band = document.createElement("h3");
  band.className = "tile-artist";
  band.textContent = r.band;

  const meta = document.createElement("div");
  meta.className = "tile-meta";
  const album = document.createElement("span");
  album.textContent = r.album;
  meta.append(album);

  const addBtn = document.createElement("button");
  addBtn.className = "btn btn-ghost tile-add-btn";
  addBtn.textContent = "+ Add to my gigs";
  addBtn.addEventListener("click", () => {
    openModal(null);
    fields.artist.value = r.band;
  });

  body.append(type, band, meta, addBtn);
  tile.append(imgWrap, body);
  return tile;
}

// ----- Hellfest News (RSS via CORS-friendly JSON proxy) -----
// rss2json converts any RSS feed to JSON and sends CORS headers, so this works
// from a static host like GitHub Pages without a backend.
const RSS2JSON = "https://api.rss2json.com/v1/api.json?rss_url=";
const HELLFEST_FEED = "https://www.hellfest.fr/feed/";
const GOOGLE_NEWS_FEED =
  "https://news.google.com/rss/search?q=Hellfest&hl=fr&gl=FR&ceid=FR:fr";

const newsList = document.getElementById("newsList");
const newsStatus = document.getElementById("newsStatus");
const newsSearch = document.getElementById("newsSearch");
const newsSourceSelect = document.getElementById("newsSource");

/** @type {Array<{title:string,link:string,snippet:string,date:string,image:string,source:string}>} */
let newsItems = [];

document.getElementById("newsRefresh").addEventListener("click", loadNews);
newsSearch.addEventListener("input", renderNews);
newsSourceSelect.addEventListener("change", renderNews);

async function fetchFeed(url, sourceLabel) {
  const res = await fetch(RSS2JSON + encodeURIComponent(url));
  if (!res.ok) throw new Error("HTTP " + res.status);
  const data = await res.json();
  if (data.status !== "ok") throw new Error(data.message || "Feed error");
  return (data.items || []).map((it) => ({
    title: it.title || "",
    link: it.link || "",
    snippet: stripHtml(it.description || it.content || ""),
    date: it.pubDate || "",
    image: it.thumbnail || it.enclosure?.link || "",
    source: sourceLabel,
  }));
}

async function loadNews() {
  newsLoaded = true;
  newsStatus.className = "release-status";
  newsStatus.textContent = "Chargement des actualités…";
  newsList.innerHTML = "";

  const results = await Promise.allSettled([
    fetchFeed(HELLFEST_FEED, "hellfest"),
    fetchFeed(GOOGLE_NEWS_FEED, "google"),
  ]);

  newsItems = [];
  const errors = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") newsItems.push(...r.value);
    else errors.push(i === 0 ? "Site Hellfest" : "Google News");
  });

  newsItems.sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!newsItems.length) {
    newsStatus.className = "release-status error";
    newsStatus.textContent =
      "Impossible de charger les actualités (" + errors.join(", ") + ").";
  } else {
    newsStatus.textContent = errors.length
      ? `Source indisponible : ${errors.join(", ")}.`
      : "";
  }
  renderNews();
}

function renderNews() {
  const term = newsSearch.value.trim().toLowerCase();
  const source = newsSourceSelect.value;

  const list = newsItems.filter((n) => {
    if (source !== "all" && n.source !== source) return false;
    if (!term) return true;
    return (
      n.title.toLowerCase().includes(term) ||
      n.snippet.toLowerCase().includes(term)
    );
  });

  newsList.innerHTML = "";
  for (const n of list) {
    newsList.appendChild(buildNewsCard(n));
  }
  if (newsItems.length && !list.length) {
    newsStatus.className = "release-status";
    newsStatus.textContent = "Aucune actualité ne correspond au filtre.";
  } else if (newsItems.length) {
    newsStatus.textContent = "";
  }
}

function buildNewsCard(n) {
  const card = document.createElement("a");
  card.className = "news-card";
  card.href = n.link;
  card.target = "_blank";
  card.rel = "noopener noreferrer";

  if (n.image) {
    const img = document.createElement("img");
    img.className = "news-thumb";
    img.src = n.image;
    img.alt = "";
    img.loading = "lazy";
    img.addEventListener("error", () => img.remove());
    card.appendChild(img);
  }

  const body = document.createElement("div");
  body.className = "news-body";

  const title = document.createElement("div");
  title.className = "news-title";
  title.textContent = n.title;

  const snippet = document.createElement("div");
  snippet.className = "news-snippet";
  snippet.textContent = n.snippet;

  const meta = document.createElement("div");
  meta.className = "news-meta";
  const badge = document.createElement("span");
  badge.className = "news-badge";
  badge.textContent = n.source === "hellfest" ? "Hellfest" : "Google News";
  const date = document.createElement("span");
  date.textContent = formatNewsDate(n.date);
  meta.append(badge, date);

  body.append(title, snippet, meta);
  card.appendChild(body);
  return card;
}

function stripHtml(html) {
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  return (tmp.textContent || "").trim();
}

function formatNewsDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

// ----- Trophies / Achievements -----
const trophyGrid = document.getElementById("trophyGrid");
const trophyScoreEl = document.getElementById("trophyScore");
const trophyBarFill = document.getElementById("trophyBarFill");
const trophySub = document.getElementById("trophySub");

// Each trophy reports {done, current, target} so we can show partial progress.
// Most thresholds use a goal so the mini progress bar fills as you get closer.
const TROPHIES = [
  {
    icon: "🎟️",
    name: "First Blood",
    desc: "Log your very first gig.",
    test: (s) => goal(s.total, 1),
  },
  {
    icon: "🤘",
    name: "Regular",
    desc: "See 10 concerts.",
    test: (s) => goal(s.total, 10),
  },
  {
    icon: "🔥",
    name: "Road Warrior",
    desc: "See 50 concerts.",
    test: (s) => goal(s.total, 50),
  },
  {
    icon: "🏟️",
    name: "Centurion",
    desc: "See 100 concerts.",
    test: (s) => goal(s.total, 100),
  },
  {
    icon: "🎸",
    name: "Crowd Surfer",
    desc: "Discover 25 different artists.",
    test: (s) => goal(s.uniqueArtists, 25),
  },
  {
    icon: "💞",
    name: "Super Fan",
    desc: "See the same artist 3+ times.",
    test: (s) => goal(s.maxSeen, 3),
  },
  {
    icon: "👑",
    name: "Die Hard",
    desc: "See the same artist 5+ times.",
    test: (s) => goal(s.maxSeen, 5),
  },
  {
    icon: "⭐",
    name: "Critic",
    desc: "Rate 10 gigs.",
    test: (s) => goal(s.rated, 10),
  },
  {
    icon: "💯",
    name: "Perfectionist",
    desc: "Give a perfect 5-star rating.",
    test: (s) => goal(s.fiveStars, 1),
  },
  {
    icon: "🌍",
    name: "Globetrotter",
    desc: "See gigs in 5 different cities.",
    test: (s) => goal(s.uniqueCities, 5),
  },
  {
    icon: "🗺️",
    name: "Explorer",
    desc: "Play 10 different venues.",
    test: (s) => goal(s.uniqueVenues, 10),
  },
  {
    icon: "📅",
    name: "Marathon",
    desc: "Catch 3 gigs in a single month.",
    test: (s) => goal(s.bestMonth, 3),
  },
  {
    icon: "🎆",
    name: "Festival Spirit",
    desc: "Catch 2 gigs on the very same day.",
    test: (s) => goal(s.bestDay, 2),
  },
  {
    icon: "🕰️",
    name: "Veteran",
    desc: "Span 5 calendar years of gig-going.",
    test: (s) => goal(s.yearSpan, 5),
  },
  {
    icon: "📜",
    name: "Note Taker",
    desc: "Write notes on 5 gigs.",
    test: (s) => goal(s.withNotes, 5),
  },
  {
    icon: "🖼️",
    name: "Curator",
    desc: "Add cover images to 5 gigs.",
    test: (s) => goal(s.withImages, 5),
  },
  {
    icon: "🌠",
    name: "Dreamer",
    desc: "Add 5 shows to your wishlist.",
    test: (s) => goal(s.wishCount, 5),
  },
];

// Helper that returns a uniform progress object.
function goal(current, target) {
  return { done: current >= target, current: Math.min(current, target), target };
}

function computeStats() {
  const total = gigs.length;
  const uniqueArtists = new Set(gigs.map((g) => g.artist.trim().toLowerCase())).size;
  const uniqueCities = new Set(
    gigs.map((g) => (g.city || "").trim().toLowerCase()).filter(Boolean)
  ).size;
  const uniqueVenues = new Set(
    gigs.map((g) => (g.venue || "").trim().toLowerCase()).filter(Boolean)
  ).size;

  // Most times a single artist has been seen.
  const seenCounts = {};
  for (const g of gigs) {
    const k = g.artist.trim().toLowerCase();
    seenCounts[k] = (seenCounts[k] || 0) + 1;
  }
  const maxSeen = Object.values(seenCounts).reduce((m, n) => Math.max(m, n), 0);

  const rated = gigs.filter((g) => g.rating > 0).length;
  const fiveStars = gigs.filter((g) => g.rating === 5).length;
  const withNotes = gigs.filter((g) => (g.notes || "").trim()).length;
  const withImages = gigs.filter((g) => (g.image || "").trim()).length;

  // Date-based stats.
  const months = {};
  const days = {};
  const years = new Set();
  for (const g of gigs) {
    if (!g.date) continue;
    months[g.date.slice(0, 7)] = (months[g.date.slice(0, 7)] || 0) + 1;
    days[g.date] = (days[g.date] || 0) + 1;
    years.add(g.date.slice(0, 4));
  }
  const bestMonth = Object.values(months).reduce((m, n) => Math.max(m, n), 0);
  const bestDay = Object.values(days).reduce((m, n) => Math.max(m, n), 0);
  const yearList = [...years].map(Number).filter(Boolean);
  const yearSpan = yearList.length ? Math.max(...yearList) - Math.min(...yearList) + 1 : 0;

  return {
    total,
    uniqueArtists,
    uniqueCities,
    uniqueVenues,
    maxSeen,
    rated,
    fiveStars,
    withNotes,
    withImages,
    bestMonth,
    bestDay,
    yearSpan,
    wishCount: wishlist.length,
  };
}

function renderTrophies() {
  const stats = computeStats();
  const results = TROPHIES.map((t) => ({ ...t, ...t.test(stats) }));
  const earned = results.filter((r) => r.done).length;
  const pct = Math.round((earned / results.length) * 100);

  trophyScoreEl.textContent = pct + "%";
  trophyBarFill.style.width = pct + "%";
  trophySub.textContent = `${earned} of ${results.length} trophies unlocked`;

  trophyGrid.innerHTML = "";
  for (const r of results) {
    trophyGrid.appendChild(buildTrophyCard(r));
  }
}

function buildTrophyCard(r) {
  const card = document.createElement("article");
  card.className = "trophy-card " + (r.done ? "earned" : "locked");

  const icon = document.createElement("span");
  icon.className = "trophy-icon";
  icon.textContent = r.done ? r.icon : "🔒";

  const name = document.createElement("div");
  name.className = "trophy-name";
  name.textContent = r.name;

  const desc = document.createElement("div");
  desc.className = "trophy-desc";
  desc.textContent = r.desc;

  const status = document.createElement("div");
  status.className = "trophy-status";
  status.textContent = r.done ? "Unlocked" : `${r.current} / ${r.target}`;

  card.append(icon, name, desc, status);

  if (!r.done && r.target > 1) {
    const mini = document.createElement("div");
    mini.className = "trophy-progress-mini";
    const fill = document.createElement("span");
    fill.style.width = Math.round((r.current / r.target) * 100) + "%";
    mini.appendChild(fill);
    card.appendChild(mini);
  }

  return card;
}

// ----- Init -----
render();
renderWishlist();
