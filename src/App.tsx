import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  ChartColumnIncreasing,
  Check,
  ChevronDown,
  CircleHelp,
  Clock3,
  Gamepad2,
  Home,
  LibraryBig,
  ListFilter,
  LogOut,
  Plus,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import type { User } from "firebase/auth";
import type { Game, Play, PlayType, WorkspaceData } from "./types";
import { readDemoWorkspace, saveDemoWorkspace } from "./data/demo";
import { firebaseConfigured } from "./lib/firebase-config";
import { bggImagePageUrl, parseCoverImageUrl } from "./lib/image-url";
import type { ImportProgress } from "./lib/repository";
import {
  mergeImportedWorkspace,
  prepareWorkbookImport,
  readWorkbook,
  type WorkbookImport,
} from "./lib/workbook";
import { buildGameSummaries, normalizeName, summarizeCollection } from "./lib/stats";

type Section = "Overview" | "Collection" | "Plays" | "Insights";
type CollectionSort = "name" | "plays" | "hours" | "cost" | "rating" | "lastPlayed";

const navigation: Array<{ label: Section; icon: typeof Home }> = [
  { label: "Overview", icon: Home },
  { label: "Collection", icon: LibraryBig },
  { label: "Plays", icon: Clock3 },
  { label: "Insights", icon: ChartColumnIncreasing },
];

const currency = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR", maximumFractionDigits: 2 });
const shortDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" });

function today(): string {
  const date = new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function formatHours(hours: number): string {
  return `${hours.toLocaleString("en-IE", { maximumFractionDigits: 1 })} h`;
}

function recordId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`;
}

function formatPlayDate(value: string): string {
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? value : shortDate.format(date);
}

function targetPlays(summary: ReturnType<typeof buildGameSummaries>[number], target: number): number | undefined {
  const netCost = (summary.game.purchasePrice ?? 0) - (summary.game.salePrice ?? 0);
  if (netCost <= 0) return 0;
  const average = summary.averageDuration || summary.game.defaultDurationHours || 0;
  if (!average) return undefined;
  return Math.max(0, Math.ceil((netCost / target - summary.hours) / average));
}

function GameCover({ game, small = false }: { game: Game; small?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => setImageFailed(false), [game.coverUrl]);
  const seed = [...game.name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  const palettes = [
    ["#192248", "#d4eb47", "#f06b4d"],
    ["#153e42", "#f5a64a", "#f7e8ce"],
    ["#4c1f51", "#f2cb47", "#f07a68"],
    ["#174c6e", "#c5e85c", "#e7f2ef"],
    ["#453224", "#e06d4d", "#e8d96d"],
  ];
  const [ink, accent, light] = palettes[seed % palettes.length];
  if (game.coverUrl && !imageFailed) {
    return <img className={`game-cover${small ? " game-cover--small" : ""}`} src={game.coverUrl} alt={`${game.name} box cover`} loading="lazy" onError={() => setImageFailed(true)} />;
  }
  return (
    <svg
      className={`game-cover${small ? " game-cover--small" : ""}`}
      viewBox="0 0 120 156"
      role="img"
      aria-label={`Illustrative cover for ${game.name}`}
    >
      <rect width="120" height="156" fill={ink} />
      <path d={`M0 ${24 + seed % 30} L120 ${seed % 45} L120 92 L0 120 Z`} fill={accent} />
      <circle cx={28 + seed % 62} cy={83 + seed % 29} r={13 + (seed % 17)} fill={light} />
      <path d={`M0 137 Q${22 + seed % 42} 98 62 136 T120 120 V156 H0Z`} fill={ink} opacity=".82" />
      <text x="9" y="18" fill={light} fontSize="5" letterSpacing="1.1">LUDUS / SAMPLE</text>
      <text x="9" y="145" fill="white" fontSize="7" fontWeight="700">{game.name.slice(0, 20).toUpperCase()}</text>
      <title>Illustrative, not official game artwork</title>
    </svg>
  );
}

function App() {
  const [section, setSection] = useState<Section>("Overview");
  const [user, setUser] = useState<User | null>(null);
  const [demoMode, setDemoMode] = useState(!firebaseConfigured);
  const [signedOut, setSignedOut] = useState(false);
  const [data, setData] = useState<WorkspaceData>(() => readDemoWorkspace());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [quickLogOpen, setQuickLogOpen] = useState(false);
  const [gameFormOpen, setGameFormOpen] = useState(false);
  const [gameFormName, setGameFormName] = useState("");
  const [gameFormDuration, setGameFormDuration] = useState("1");
  const [gameFormSolo, setGameFormSolo] = useState(false);
  const [gameFormImageLink, setGameFormImageLink] = useState("");
  const [query, setQuery] = useState("");
  const [playsQuery, setPlaysQuery] = useState("");
  const [playsYear, setPlaysYear] = useState("all");
  const [ownedOnly, setOwnedOnly] = useState(true);
  const [collectionSort, setCollectionSort] = useState<CollectionSort>("name");
  const [expandedGame, setExpandedGame] = useState("");
  const [pendingImport, setPendingImport] = useState<WorkbookImport | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null);
  const [logGameId, setLogGameId] = useState("");
  const [logGameSearch, setLogGameSearch] = useState("");
  const [logDate, setLogDate] = useState(today);
  const [logDuration, setLogDuration] = useState("1");
  const [logType, setLogType] = useState<PlayType>("multiplayer");
  const [logPlayers, setLogPlayers] = useState("2");
  const [logScore, setLogScore] = useState("");
  const [logNotes, setLogNotes] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const cloudUserId = demoMode ? undefined : user?.uid;

  useEffect(() => {
    if (!firebaseConfigured) return;
    let active = true;
    let unsubscribe: (() => void) | undefined;
    import("./lib/firebase")
      .then(({ auth }) => {
        if (!auth || !active) return;
        return import("firebase/auth").then(({ onAuthStateChanged }) => {
          if (active) {
            unsubscribe = onAuthStateChanged(auth, (nextUser) => {
              setUser(nextUser);
              setSignedOut(!nextUser);
              setDemoMode(false);
              setError("");
            });
          }
        });
      })
      .catch((reason: unknown) => {
        setError(`Could not initialize Firebase: ${reason instanceof Error ? reason.message : String(reason)}`);
      });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => {
    if (demoMode) {
      try {
        saveDemoWorkspace(data);
      } catch {
        setError("This browser could not save the preview locally. Export your data before closing this tab.");
      }
    }
  }, [data, demoMode]);

  useEffect(() => {
    if (!cloudUserId) return;
    setIsLoading(true);
    setError("");
    const received = new Set<string>();
    let active = true;
    let subscriptions: Array<() => void> = [];
    import("./lib/repository")
      .then(({ subscribeToUserData }) => {
        if (!active) return;
        subscriptions = (["games", "plays", "rankings"] as const).map((kind) =>
          subscribeToUserData(
            cloudUserId,
            kind,
            (records) => {
              setData((current) => ({ ...current, [kind]: records } as WorkspaceData));
              received.add(kind);
              if (received.size >= 3) setIsLoading(false);
            },
            (reason) => {
              setError(`Could not sync ${kind}: ${reason.message}`);
              setIsLoading(false);
            },
          ),
        );
      })
      .catch((reason: unknown) => {
        setError(`Could not load cloud storage: ${reason instanceof Error ? reason.message : String(reason)}`);
        setIsLoading(false);
      });
    return () => {
      active = false;
      subscriptions.forEach((unsubscribe) => unsubscribe());
    };
  }, [cloudUserId]);

  const summary = useMemo(() => summarizeCollection(data), [data]);
  const gamesById = useMemo(() => new Map(data.games.map((game) => [game.id, game])), [data.games]);
  const sortedGames = useMemo(
    () => [...summary.games].sort((a, b) => {
      switch (collectionSort) {
        case "plays": return b.plays - a.plays || a.game.name.localeCompare(b.game.name);
        case "hours": return b.hours - a.hours || a.game.name.localeCompare(b.game.name);
        case "cost": return (a.costPerHour ?? Infinity) - (b.costPerHour ?? Infinity) || a.game.name.localeCompare(b.game.name);
        case "rating": return (b.game.rating ?? 0) - (a.game.rating ?? 0) || a.game.name.localeCompare(b.game.name);
        case "lastPlayed": return (b.lastPlayed ?? "").localeCompare(a.lastPlayed ?? "") || a.game.name.localeCompare(b.game.name);
        default: return a.game.name.localeCompare(b.game.name);
      }
    }),
    [summary.games, collectionSort],
  );
  const sortedPlays = useMemo(
    () => [...data.plays].sort((a, b) => b.date.localeCompare(a.date)),
    [data.plays],
  );
  const years = useMemo(
    () => [...new Set(data.plays.map((play) => play.date.slice(0, 4)))].sort((a, b) => b.localeCompare(a)),
    [data.plays],
  );

  async function handleGoogleSignIn() {
    try {
      const [{ auth, googleProvider }, { signInWithPopup }] = await Promise.all([
        import("./lib/firebase"),
        import("firebase/auth"),
      ]);
      if (!auth) throw new Error("Add the Firebase web configuration to .env.local before enabling Google sign-in.");
      await signInWithPopup(auth, googleProvider);
    } catch (reason) {
      setError(`Google sign-in failed: ${reason instanceof Error ? reason.message : String(reason)}`);
    }
  }

  async function handleSignOut() {
    try {
      const [{ auth }, { signOut }] = await Promise.all([
        import("./lib/firebase"),
        import("firebase/auth"),
      ]);
      if (!auth) throw new Error("Firebase is not configured.");
      await signOut(auth);
      setData(readDemoWorkspace());
      setSection("Overview");
    } catch (reason) {
      setError(`Could not sign out: ${reason instanceof Error ? reason.message : String(reason)}`);
    }
  }

  function openDemo() {
    setData(readDemoWorkspace());
    setDemoMode(true);
    setSignedOut(false);
    setSection("Overview");
  }

  async function saveRecord(kind: "games" | "plays", record: Game | Play) {
    if (cloudUserId) {
      const { saveUserRecord } = await import("./lib/repository");
      await saveUserRecord(cloudUserId, kind, record);
    } else {
      setData((current) => {
        if (kind === "games") {
          const game = record as Game;
          return {
            ...current,
            games: current.games.some((item) => item.id === game.id)
              ? current.games.map((item) => item.id === game.id ? game : item)
              : [...current.games, game],
          };
        }
        const play = record as Play;
        return {
          ...current,
          plays: current.plays.some((item) => item.id === play.id)
            ? current.plays.map((item) => item.id === play.id ? play : item)
            : [play, ...current.plays],
        };
      });
    }
  }

  async function handleLogPlay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const game = gamesById.get(logGameId);
    if (!game) {
      setError("Choose a game before saving this play.");
      return;
    }
    const durationHours = Number(logDuration);
    if (!Number.isFinite(durationHours) || durationHours <= 0) {
      setError("Enter a play duration greater than zero.");
      return;
    }
    const play: Play = {
      id: recordId("play"),
      gameId: game.id,
      gameName: game.name,
      date: logDate,
      durationHours,
      playType: logType,
      players: logType === "solo" ? 1 : Number(logPlayers) || undefined,
      score: logScore.trim() || undefined,
      notes: logNotes.trim() || undefined,
    };
    try {
      await saveRecord("plays", play);
      setNotice(`Play logged: ${game.name}`);
      setError("");
      setLogScore("");
      setLogNotes("");
      setLogDate(today());
      setLogDuration(String(game.defaultDurationHours ?? 1));
      setQuickLogOpen(false);
    } catch (reason) {
      setError(`Could not save this play: ${reason instanceof Error ? reason.message : String(reason)}`);
    }
  }

  async function handleAddGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = gameFormName.trim();
    if (!name) {
      setError("Enter a game name.");
      return;
    }
    if (data.games.some((game) => normalizeName(game.name) === normalizeName(name))) {
      setError(`“${name}” is already in your collection.`);
      return;
    }
    const duration = Number(gameFormDuration);
    if (!Number.isFinite(duration) || duration <= 0) {
      setError("Enter a typical duration greater than zero.");
      return;
    }
    const coverUrl = gameFormImageLink.trim()
      ? parseCoverImageUrl(gameFormImageLink)
      : undefined;
    if (gameFormImageLink.trim() && !coverUrl) {
      setError("Enter a secure direct image URL. A BoardGameGeek /image/ID page is not a direct image.");
      return;
    }
    try {
      await saveRecord("games", {
        id: recordId("game"),
        name,
        owned: true,
        solo: gameFormSolo,
        defaultDurationHours: duration,
        coverUrl,
      });
      setGameFormName("");
      setGameFormDuration("1");
      setGameFormSolo(false);
      setGameFormImageLink("");
      setGameFormOpen(false);
      setError("");
      setNotice(`${name} added to your collection.`);
    } catch (reason) {
      setError(`Could not add this game: ${reason instanceof Error ? reason.message : String(reason)}`);
    }
  }

  async function handleSaveImageLink(game: Game, link: string) {
    const coverUrl = link.trim() ? parseCoverImageUrl(link) : undefined;
    if (link.trim() && !coverUrl) {
      setError("Enter a secure direct image URL. A BoardGameGeek /image/ID page is not a direct image.");
      return;
    }
    try {
      await saveRecord("games", { ...game, coverUrl });
      setError("");
      setNotice(coverUrl ? `Cover image saved for ${game.name}.` : `Cover image removed from ${game.name}.`);
    } catch (reason) {
      setError(`Could not update ${game.name}: ${reason instanceof Error ? reason.message : String(reason)}`);
    }
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setIsParsing(true);
    setPendingImport(null);
    setImportProgress(null);
    setError("");
    try {
      const imported = await readWorkbook(file);
      if (
        imported.data.games.length === 0 &&
        imported.data.plays.length === 0 &&
        imported.data.rankings.length === 0 &&
        imported.skippedPlayRows.length === 0
      ) {
        throw new Error("No collection or yearly play records were found. Check that the workbook has an Overview sheet and year sheets with Date, Name, and Duration columns.");
      }
      setPendingImport(imported);
    } catch (reason) {
      setError(`Could not read this workbook: ${reason instanceof Error ? reason.message : String(reason)}`);
    } finally {
      setIsParsing(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function confirmImport() {
    if (!pendingImport) return;
    const importData = prepareWorkbookImport(pendingImport, data);
    setImportProgress({ completed: 0, total: importData.games.length + importData.plays.length + importData.rankings.length });
    try {
      if (cloudUserId) {
        const { importUserWorkspace } = await import("./lib/repository");
        await importUserWorkspace(cloudUserId, importData, setImportProgress);
      }
      setData((current) => mergeImportedWorkspace(current, importData));
      setNotice(`Imported ${importData.games.length.toLocaleString()} games and ${importData.plays.length.toLocaleString()} plays from ${pendingImport.sourceName}.`);
      setPendingImport(null);
      setImportProgress(null);
      setError("");
    } catch (reason) {
      setError(`Import stopped before completion. You can retry safely: ${reason instanceof Error ? reason.message : String(reason)}`);
    }
  }

  function exportWorkspace() {
    const payload = JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2);
    const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `ludus-ephemeris-export-${today()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setNotice("Your archive has been exported as JSON.");
  }

  if (firebaseConfigured && signedOut && !demoMode) {
    return (
      <div className="signin-screen">
        <div className="signin-card">
          <div className="brand-mark brand-mark--large"><Gamepad2 size={26} /></div>
          <p className="signin-kicker">LUDUS EPHEMERIS</p>
          <h1>Your games.<br />Your record.</h1>
          <p className="signin-copy">Sign in with Google to open your private collection and play history.</p>
          <button className="button button--primary signin-button" onClick={handleGoogleSignIn}>Continue with Google</button>
          <button className="text-button signin-preview" onClick={openDemo}>Explore a sample archive</button>
          <p className="signin-footnote">Sample data stays in this browser. Your signed-in records are private to your account.</p>
          {error && <p className="form-error" role="alert">{error}</p>}
        </div>
      </div>
    );
  }

  const filteredGames = sortedGames.filter((summaryItem) => {
    const matchesText = summaryItem.game.name.toLowerCase().includes(query.toLowerCase());
    return matchesText && (!ownedOnly || summaryItem.game.owned);
  });
  const filteredPlays = sortedPlays.filter((play) => {
    const matchesText = play.gameName.toLowerCase().includes(playsQuery.toLowerCase());
    return matchesText && (playsYear === "all" || play.date.startsWith(playsYear));
  });

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setSection("Overview"); }}>
          <span className="brand-mark"><Gamepad2 size={20} strokeWidth={2.2} /></span>
          <span className="brand-type"><strong>Ludus</strong><small>EPHEMERIS</small></span>
        </a>
        <div className="sidebar-label">YOUR ARCHIVE</div>
        <nav className="sidebar-nav" aria-label="Main navigation">
          {navigation.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item${section === label ? " nav-item--active" : ""}`}
              onClick={() => setSection(label)}
              aria-current={section === label ? "page" : undefined}
            >
              <Icon size={18} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Plays" && <span className="nav-count">{data.plays.length.toLocaleString()}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-lower">
          <div className="side-note">
            <span className="side-note-icon"><Sparkles size={15} /></span>
            <div><strong>One more for the log?</strong><span>Keep the story going.</span></div>
            <button aria-label="Log a play" onClick={() => { setSection("Overview"); setQuickLogOpen(true); }}><Plus size={16} /></button>
          </div>
          <div className="account-row">
            <div className="avatar">{user?.displayName?.slice(0, 1) ?? "L"}</div>
            <div className="account-copy">
              <strong>{demoMode ? "Sample archive" : user?.displayName ?? user?.email ?? "Your account"}</strong>
              <span>{demoMode ? "Preview mode · local only" : "Private account"}</span>
            </div>
            {!demoMode && <button className="icon-button" aria-label="Sign out" onClick={handleSignOut}><LogOut size={15} /></button>}
          </div>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar">
          <div className="breadcrumb"><span>Archive</span><ArrowRight size={13} /><strong>{section}</strong></div>
          <div className="topbar-right">
            <span className={`connection-state${demoMode ? " connection-state--demo" : ""}`}>
              <span className="connection-dot" />{demoMode ? "Sample data" : isLoading ? "Syncing" : "Synced"}
            </span>
            {firebaseConfigured && demoMode && <button className="button button--quiet button--small" onClick={handleGoogleSignIn}>Sign in</button>}
            {!firebaseConfigured && <button className="help-link" onClick={() => setNotice("To connect your private account, add Firebase web credentials to .env.local and enable Google sign-in in Firebase Console.")}><CircleHelp size={15} /> Setup</button>}
          </div>
        </header>

        {(error || notice) && (
          <div className={`notice-bar${error ? " notice-bar--error" : ""}`} role={error ? "alert" : "status"}>
            <span>{error || notice}</span>
            <button aria-label="Dismiss message" onClick={() => { setError(""); setNotice(""); }}><X size={16} /></button>
          </div>
        )}

        <div className="page-content">
          {section === "Overview" && (
            <OverviewPage
              data={data}
              summary={summary}
              gamesById={gamesById}
              quickLogOpen={quickLogOpen}
              setQuickLogOpen={setQuickLogOpen}
              setLogGameId={setLogGameId}
              logGameSearch={logGameSearch}
              setLogGameSearch={setLogGameSearch}
              logDate={logDate}
              setLogDate={setLogDate}
              logDuration={logDuration}
              setLogDuration={setLogDuration}
              logType={logType}
              setLogType={setLogType}
              logPlayers={logPlayers}
              setLogPlayers={setLogPlayers}
              logScore={logScore}
              setLogScore={setLogScore}
              logNotes={logNotes}
              setLogNotes={setLogNotes}
              onLogPlay={handleLogPlay}
              setSection={setSection}
              setPlaysYear={setPlaysYear}
            />
          )}
          {section === "Collection" && (
            <CollectionPage
              summaries={filteredGames}
              allSummaries={sortedGames}
              totalGames={data.games.length}
              ownedOnly={ownedOnly}
              setOwnedOnly={setOwnedOnly}
              collectionSort={collectionSort}
              setCollectionSort={setCollectionSort}
              query={query}
              setQuery={setQuery}
              expandedGame={expandedGame}
              setExpandedGame={setExpandedGame}
              gameFormOpen={gameFormOpen}
              setGameFormOpen={setGameFormOpen}
              gameFormName={gameFormName}
              setGameFormName={setGameFormName}
              gameFormDuration={gameFormDuration}
              setGameFormDuration={setGameFormDuration}
              gameFormSolo={gameFormSolo}
              setGameFormSolo={setGameFormSolo}
              gameFormImageLink={gameFormImageLink}
              setGameFormImageLink={setGameFormImageLink}
              onAddGame={handleAddGame}
              onSaveImageLink={handleSaveImageLink}
              fileInput={fileInput}
              onFile={handleFile}
              isParsing={isParsing}
              pendingImport={pendingImport}
              importProgress={importProgress}
              onConfirmImport={confirmImport}
              onCancelImport={() => { setPendingImport(null); setImportProgress(null); }}
              onExport={exportWorkspace}
              demoMode={demoMode}
            />
          )}
          {section === "Plays" && (
            <PlaysPage
              plays={filteredPlays}
              years={years}
              query={playsQuery}
              setQuery={setPlaysQuery}
              year={playsYear}
              setYear={setPlaysYear}
              gamesById={gamesById}
              onLog={() => { setSection("Overview"); setQuickLogOpen(true); }}
            />
          )}
          {section === "Insights" && <InsightsPage data={data} summary={summary} />}
          <footer className="page-footer">
            <span>Ludus Ephemeris <span className="footer-dot">·</span> Keep the good games close.</span>
            <span>{demoMode ? "Preview archive — sample records only" : "Your archive is private to your account"}</span>
          </footer>
        </div>
      </main>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navigation.map(({ label, icon: Icon }) => (
          <button key={label} className={section === label ? "mobile-nav-item mobile-nav-item--active" : "mobile-nav-item"} onClick={() => setSection(label)}>
            <Icon size={18} /><span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

function OverviewPage({
  data,
  summary,
  gamesById,
  quickLogOpen,
  setQuickLogOpen,
  setLogGameId,
  logGameSearch,
  setLogGameSearch,
  logDate,
  setLogDate,
  logDuration,
  setLogDuration,
  logType,
  setLogType,
  logPlayers,
  setLogPlayers,
  logScore,
  setLogScore,
  logNotes,
  setLogNotes,
  onLogPlay,
  setSection,
  setPlaysYear,
}: {
  data: WorkspaceData;
  summary: ReturnType<typeof summarizeCollection>;
  gamesById: Map<string, Game>;
  quickLogOpen: boolean;
  setQuickLogOpen: (open: boolean) => void;
  setLogGameId: (id: string) => void;
  logGameSearch: string;
  setLogGameSearch: (name: string) => void;
  logDate: string;
  setLogDate: (date: string) => void;
  logDuration: string;
  setLogDuration: (duration: string) => void;
  logType: PlayType;
  setLogType: (type: PlayType) => void;
  logPlayers: string;
  setLogPlayers: (players: string) => void;
  logScore: string;
  setLogScore: (score: string) => void;
  logNotes: string;
  setLogNotes: (notes: string) => void;
  onLogPlay: (event: FormEvent<HTMLFormElement>) => void;
  setSection: (section: Section) => void;
  setPlaysYear: (year: string) => void;
}) {
  const currentYear = String(new Date().getFullYear());
  const currentYearSummary = summary.years.find((item) => item.year === Number(currentYear));
  const recentPlays = [...data.plays].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const currentTop = buildGameSummaries(data.games, data.plays.filter((play) => play.date.startsWith(currentYear)))
    .sort((a, b) => b.plays - a.plays).slice(0, 4);
  const chartYears = summary.years.slice(-12);

  return (
    <>
      <div className="page-heading page-heading--overview">
        <div>
          <h1>Your games, in motion.</h1>
          <p>A living record of the games you bring to the table.</p>
        </div>
        <div className="heading-actions">
          <button className="button button--primary" onClick={() => setQuickLogOpen(!quickLogOpen)}>
            <Plus size={17} /> Log a play
          </button>
          <button className="button button--outline" onClick={() => setSection("Collection")}>Browse collection <ArrowUpRight size={15} /></button>
        </div>
      </div>

      {quickLogOpen && (
        <section className="quick-log-panel" aria-labelledby="quick-log-title">
          <div className="quick-log-heading">
            <div><span className="section-index">QUICK ENTRY</span><h2 id="quick-log-title">Add a play to the record</h2></div>
            <button className="icon-button" aria-label="Close play form" onClick={() => setQuickLogOpen(false)}><X size={17} /></button>
          </div>
          <form onSubmit={onLogPlay} className="quick-log-form">
            <label className="field field--game"><span>Game</span>
              <input
                list="quick-log-games"
                value={logGameSearch}
                onChange={(event) => {
                  const name = event.target.value;
                  setLogGameSearch(name);
                  const selected = data.games.find(
                    (game) => game.owned && normalizeName(game.name) === normalizeName(name),
                  );
                  setLogGameId(selected?.id ?? "");
                }}
                placeholder="Search your games…"
                autoComplete="off"
                required
              />
              <datalist id="quick-log-games">
                {[...data.games].filter((game) => game.owned).sort((a, b) => a.name.localeCompare(b.name)).map((game) => (
                  <option value={game.name} key={game.id} />
                ))}
              </datalist>
            </label>
            <label className="field"><span>Date</span><input type="date" value={logDate} onChange={(event) => setLogDate(event.target.value)} required /></label>
            <label className="field"><span>Duration · hours</span><input type="number" min="0.05" step="0.05" value={logDuration} onChange={(event) => setLogDuration(event.target.value)} required /></label>
            <label className="field"><span>Players</span>
              <select value={logType} onChange={(event) => setLogType(event.target.value as PlayType)}>
                <option value="solo">Solo</option><option value="multiplayer">Multiplayer</option><option value="unknown">Not sure</option>
              </select>
            </label>
            {logType === "multiplayer" && <label className="field"><span>Player count</span><input type="number" min="2" step="1" value={logPlayers} onChange={(event) => setLogPlayers(event.target.value)} /></label>}
            <label className="field"><span>Score <em>optional</em></span><input value={logScore} onChange={(event) => setLogScore(event.target.value)} placeholder="e.g. 82 points" /></label>
            <label className="field field--notes"><span>Notes <em>optional</em></span><input value={logNotes} onChange={(event) => setLogNotes(event.target.value)} placeholder="Who played, scenario, result…" /></label>
            <div className="quick-log-submit"><button className="button button--primary" type="submit"><Check size={16} /> Save play</button></div>
          </form>
        </section>
      )}

      <section className="overview-metrics" aria-label="Collection highlights">
        <div className="metric-item metric-item--lead">
          <span className="metric-label">ALL-TIME PLAYS</span>
          <strong>{summary.totalPlays.toLocaleString()}</strong>
          <span className="metric-sub">{formatHours(summary.totalHours)} at the table</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">IN {currentYear}</span>
          <strong>{currentYearSummary?.plays.toLocaleString() ?? "0"}</strong>
          <span className="metric-sub">{formatHours(currentYearSummary?.hours ?? 0)} played</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">IN YOUR COLLECTION</span>
          <strong>{summary.ownedGames.toLocaleString()}</strong>
          <span className="metric-sub">of {summary.totalGames.toLocaleString()} titles</span>
        </div>
        <div className="metric-item">
          <span className="metric-label">YET TO HIT THE TABLE</span>
          <strong>{summary.unplayedGames.toLocaleString()}</strong>
          <span className="metric-sub">games with no logged plays</span>
        </div>
      </section>

      <section className="chart-section">
        <div className="section-heading">
          <div><span className="section-index">PLAY RHYTHM</span><h2>Every year adds a new chapter.</h2></div>
          <button className="text-link" onClick={() => setSection("Insights")}>Explore all insights <ArrowRight size={15} /></button>
        </div>
        <div className="activity-chart-wrap">
          <div className="chart-callout">
            <span className="chart-callout-label">THIS YEAR</span>
            <strong>{currentYearSummary?.plays ?? 0}</strong>
            <span>plays recorded</span>
          </div>
          <div className="activity-chart">
            <ChartFrame years={chartYears} onYearClick={(year) => { setPlaysYear(String(year)); setSection("Plays"); }} />
          </div>
        </div>
        <div className="chart-footnote"><span><i className="legend-dot" /> Plays logged each year</span><span>{summary.years[0]?.year ?? "—"}—{currentYear}</span></div>
      </section>

      <div className="overview-lower">
        <section className="recent-section">
          <div className="section-heading section-heading--compact">
            <div><span className="section-index">FROM THE LOG</span><h2>Recent plays</h2></div>
            <button className="text-link" onClick={() => setSection("Plays")}>Full play history <ArrowRight size={15} /></button>
          </div>
          {recentPlays.length ? (
            <div className="recent-list">
              {recentPlays.map((play) => (
                <button className="recent-row" key={play.id} onClick={() => setSection("Plays")}>
                  <GameCover game={gamesById.get(play.gameId ?? "") ?? { id: play.id, name: play.gameName, owned: false }} small />
                  <span className="recent-game"><strong>{play.gameName}</strong><small>{play.notes || play.score || (play.playType === "solo" ? "Solo session" : "Table session")}</small></span>
                  <span className="recent-meta"><strong>{formatHours(play.durationHours)}</strong><small>{formatPlayDate(play.date)}</small></span>
                  <ArrowUpRight className="recent-arrow" size={15} />
                </button>
              ))}
            </div>
          ) : <EmptyState title="No plays logged yet" text="Add your first session and your play history will start taking shape." />}
        </section>
        <section className="top-games-section">
          <div className="section-heading section-heading--compact">
            <div><span className="section-index">MOST PLAYED · {currentYear}</span><h2>On repeat</h2></div>
            <button className="text-link" onClick={() => setSection("Insights")}>View rankings <ArrowRight size={15} /></button>
          </div>
          {currentTop.some((entry) => entry.plays > 0) ? (
            <div className="top-games-list">
              {currentTop.filter((entry) => entry.plays > 0).map((entry, index) => (
                <button className="top-game-row" key={entry.game.id} onClick={() => setSection("Collection")}>
                  <span className="ranking-number">{String(index + 1).padStart(2, "0")}</span>
                  <GameCover game={entry.game} small />
                  <span className="top-game-copy"><strong>{entry.game.name}</strong><small>{formatHours(entry.hours)} played</small></span>
                  <span className="play-count">{entry.plays}<small>plays</small></span>
                </button>
              ))}
            </div>
          ) : <EmptyState title="Your next favourite starts here" text="Log a play to see which games are getting to the table." />}
        </section>
      </div>
    </>
  );
}

function ChartFrame({
  years,
  metric = "plays",
  onYearClick,
}: {
  years: Array<{ year: number; plays: number; hours: number }>;
  metric?: "plays" | "hours";
  onYearClick: (year: number) => void;
}) {
  const maximum = Math.max(1, ...years.map((item) => metric === "plays" ? item.plays : item.hours));
  const ticks = Array.from({ length: 5 }, (_, index) => Math.round(maximum * (4 - index) / 4));
  return (
    <div className="chart-stage">
      <div className="chart-y-labels" aria-hidden="true">{ticks.map((tick, index) => (
        <span key={index}>{metric === "hours" ? tick.toLocaleString("en-IE", { maximumFractionDigits: 1 }) : tick}</span>
      ))}</div>
      <div className="chart-bars">
        <div className="chart-grid" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        {years.map((item) => (
          <button
            type="button"
            className="chart-bar-group"
            key={item.year}
            aria-label={`${item.year}: ${item.plays} plays, ${formatHours(item.hours)}. Open play history.`}
            onClick={() => onYearClick(item.year)}
          >
            <span className="bar-tooltip">{metric === "plays" ? `${item.plays} plays` : formatHours(item.hours)}</span>
            <i className="chart-bar" style={{ height: `${Math.max(3, ((metric === "plays" ? item.plays : item.hours) / maximum) * 100)}%` }} />
            <span className="chart-year">{item.year}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function CollectionPage({
  summaries,
  allSummaries,
  totalGames,
  ownedOnly,
  setOwnedOnly,
  collectionSort,
  setCollectionSort,
  query,
  setQuery,
  expandedGame,
  setExpandedGame,
  gameFormOpen,
  setGameFormOpen,
  gameFormName,
  setGameFormName,
  gameFormDuration,
  setGameFormDuration,
  gameFormSolo,
  setGameFormSolo,
  gameFormImageLink,
  setGameFormImageLink,
  onAddGame,
  onSaveImageLink,
  fileInput,
  onFile,
  isParsing,
  pendingImport,
  importProgress,
  onConfirmImport,
  onCancelImport,
  onExport,
  demoMode,
}: {
  summaries: ReturnType<typeof buildGameSummaries>;
  allSummaries: ReturnType<typeof buildGameSummaries>;
  totalGames: number;
  ownedOnly: boolean;
  setOwnedOnly: (owned: boolean) => void;
  collectionSort: CollectionSort;
  setCollectionSort: (sort: CollectionSort) => void;
  query: string;
  setQuery: (query: string) => void;
  expandedGame: string;
  setExpandedGame: (id: string) => void;
  gameFormOpen: boolean;
  setGameFormOpen: (open: boolean) => void;
  gameFormName: string;
  setGameFormName: (name: string) => void;
  gameFormDuration: string;
  setGameFormDuration: (duration: string) => void;
  gameFormSolo: boolean;
  setGameFormSolo: (solo: boolean) => void;
  gameFormImageLink: string;
  setGameFormImageLink: (link: string) => void;
  onAddGame: (event: FormEvent<HTMLFormElement>) => void;
  onSaveImageLink: (game: Game, link: string) => void;
  fileInput: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | undefined) => void;
  isParsing: boolean;
  pendingImport: WorkbookImport | null;
  importProgress: ImportProgress | null;
  onConfirmImport: () => void;
  onCancelImport: () => void;
  onExport: () => void;
  demoMode: boolean;
}) {
  const recordCount = pendingImport
    ? pendingImport.data.games.length + pendingImport.data.plays.length +
      pendingImport.data.rankings.length
    : 0;

  return (
    <>
      <div className="page-heading">
        <div><h1>Your collection.</h1><p>One place for every game, every play, every hour.</p></div>
        <div className="heading-actions">
          <button className="button button--quiet" onClick={onExport}><ArrowDownToLine size={16} /> Export JSON</button>
          <button className="button button--outline" onClick={() => fileInput.current?.click()} disabled={isParsing}><Upload size={15} /> {isParsing ? "Reading workbook…" : "Import workbook"}</button>
          <input ref={fileInput} className="visually-hidden" type="file" accept=".xlsx,.xlsm" onChange={(event) => onFile(event.target.files?.[0])} />
          <button className="button button--primary" onClick={() => setGameFormOpen(!gameFormOpen)}><Plus size={16} /> Add a game</button>
        </div>
      </div>

      {demoMode && <div className="inline-info"><Sparkles size={16} /><span>This preview uses sample records. Import your workbook here to explore your own archive in this browser.</span></div>}
      {pendingImport && (
        <section className="import-review" aria-labelledby="import-review-title">
          <div className="import-review-top">
            <div className="import-icon"><BookOpen size={19} /></div>
            <div className="import-review-title"><h2 id="import-review-title">Workbook ready to import</h2><p>{pendingImport.sourceName}</p></div>
            <button className="icon-button" aria-label="Cancel import" onClick={onCancelImport}><X size={17} /></button>
          </div>
          <div className="import-counts">
            <div><strong>{pendingImport.data.games.length.toLocaleString()}</strong><span>collection titles</span></div>
            <div><strong>{pendingImport.data.plays.length.toLocaleString()}</strong><span>plays across {pendingImport.years.length} years</span></div>
            <div><strong>{pendingImport.data.rankings.length.toLocaleString()}</strong><span>historical ranking entries</span></div>
          </div>
          {(pendingImport.missingCatalogGames.length > 0 || pendingImport.duplicateGameNames.length > 0 || pendingImport.skippedPlayRows.length > 0) && (
            <div className="import-warning">
              <strong>Review import notes</strong>
              {pendingImport.missingCatalogGames.length > 0 && <p>{pendingImport.missingCatalogGames.length} game names appear in play logs but not in the Overview catalog. They’ll be added as unowned titles so their plays remain linked.</p>}
              {pendingImport.duplicateGameNames.length > 0 && <p>{pendingImport.duplicateGameNames.length} duplicate catalog names were found. Each source row will be retained for review.</p>}
              {pendingImport.skippedPlayRows.length > 0 && <p>{pendingImport.skippedPlayRows.length} play rows with a game name were skipped because their date or duration was missing or invalid.</p>}
              <ul>
                {[...pendingImport.missingCatalogGames, ...pendingImport.duplicateGameNames].slice(0, 6).map((name, index) => <li key={`${name}-${index}`}>{name}</li>)}
                {pendingImport.skippedPlayRows.slice(0, 6).map((row) => <li key={`${row.sheet}-${row.row}`}>{row.sheet} row {row.row} · {row.gameName}: {row.reason}</li>)}
              </ul>
            </div>
          )}
          <p className="import-preserve">Legacy fields are preserved. Formula-derived values are recalculated from source records; historical ranks remain separate.</p>
          {importProgress ? (
            <div className="import-progress"><span>Importing {importProgress.completed.toLocaleString()} of {importProgress.total.toLocaleString()} records</span><progress value={importProgress.completed} max={Math.max(importProgress.total, 1)} /></div>
          ) : (
            <div className="import-actions"><button className="button button--quiet" onClick={onCancelImport}>Cancel</button><button className="button button--primary" onClick={onConfirmImport} disabled={recordCount === 0}><Check size={16} /> {recordCount > 0 ? "Import and merge" : "No valid records"}</button></div>
          )}
        </section>
      )}

      {gameFormOpen && (
        <form className="add-game-form" onSubmit={onAddGame}>
          <div className="form-heading"><div><span className="section-index">NEW TITLE</span><h2>Add a game</h2></div><button type="button" className="icon-button" aria-label="Close form" onClick={() => setGameFormOpen(false)}><X size={17} /></button></div>
          <label className="field"><span>Game name</span><input autoFocus value={gameFormName} onChange={(event) => setGameFormName(event.target.value)} placeholder="Enter the title" required /></label>
          <label className="field"><span>Typical duration · hours</span><input type="number" min="0.05" step="0.05" value={gameFormDuration} onChange={(event) => setGameFormDuration(event.target.value)} required /></label>
          <label className="field"><span>Cover image URL <em>optional</em></span><input type="url" value={gameFormImageLink} onChange={(event) => setGameFormImageLink(event.target.value)} placeholder="https://cf.geekdo-images.com/…" /><small className="image-url-hint">Paste the direct image address, not the BGG /image/ID page link.</small></label>
          <label className="check-field"><input type="checkbox" checked={gameFormSolo} onChange={(event) => setGameFormSolo(event.target.checked)} /><span>Supports solo play</span></label>
          <div className="form-actions"><button className="button button--primary" type="submit">Add to collection</button></div>
        </form>
      )}

      <div className="collection-toolbar">
        <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search your games…" aria-label="Search games" /></label>
        <div className="collection-filters">
          <button className={`filter-pill${ownedOnly ? " filter-pill--active" : ""}`} onClick={() => setOwnedOnly(!ownedOnly)}><ListFilter size={14} /> {ownedOnly ? "Owned" : "All titles"} <ChevronDown size={13} /></button>
          <label className="collection-sort"><span>Sort</span><select value={collectionSort} onChange={(event) => setCollectionSort(event.target.value as CollectionSort)} aria-label="Sort collection">
            <option value="name">Name</option><option value="plays">Most played</option><option value="hours">Most hours</option><option value="cost">Lowest cost/hour</option><option value="rating">Highest rating</option><option value="lastPlayed">Recently played</option>
          </select></label>
          <span className="results-count">{summaries.length.toLocaleString()} of {totalGames.toLocaleString()} titles</span>
        </div>
      </div>

      {summaries.length > 0 ? (
        <div className="collection-table-wrap">
          <table className="collection-table">
            <thead><tr><th>GAME</th><th>PLAYS</th><th>TIME PLAYED</th><th>COST / HOUR</th><th>RATING</th><th aria-label="Open details" /></tr></thead>
            <tbody>
              {summaries.map((item) => (
                <FragmentRow
                  key={item.game.id}
                  item={item}
                  expanded={expandedGame === item.game.id}
                  onToggle={() => setExpandedGame(expandedGame === item.game.id ? "" : item.game.id)}
                  onSaveImageLink={onSaveImageLink}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title={query ? "No games match that search" : "Your collection is waiting"} text={query ? "Try another title or clear the search." : "Add a game or import the workbook that holds your collection."} />
      )}
      <p className="list-footnote"><span className="footnote-mark" /> {allSummaries.filter((item) => item.game.owned).length.toLocaleString()} owned <span>·</span> {allSummaries.filter((item) => item.plays === 0).length.toLocaleString()} unplayed</p>
    </>
  );
}

function FragmentRow({
  item,
  expanded,
  onToggle,
  onSaveImageLink,
}: {
  item: ReturnType<typeof buildGameSummaries>[number];
  expanded: boolean;
  onToggle: () => void;
  onSaveImageLink: (game: Game, link: string) => void;
}) {
  const [imageLink, setImageLink] = useState(item.game.coverUrl ?? "");
  const bggImageUrl = bggImagePageUrl(item.game.imageId ?? "");
  useEffect(() => {
    setImageLink(item.game.coverUrl ?? "");
  }, [item.game.coverUrl]);

  return (
    <>
      <tr className={`collection-row${expanded ? " collection-row--expanded" : ""}`}>
        <td><button className="game-cell" onClick={onToggle}><GameCover game={item.game} small /><span><strong>{item.game.name}</strong><small>{item.game.solo ? "Solo-capable" : item.game.owned ? "In collection" : "Played title · not marked owned"}</small></span></button></td>
        <td className="numeric-cell">{item.plays.toLocaleString()}</td>
        <td className="numeric-cell">{formatHours(item.hours)}</td>
        <td className="numeric-cell">{item.costPerHour === undefined ? "—" : `${currency.format(item.costPerHour)} / h`}</td>
        <td><span className="rating-cell">{item.game.rating ? `${item.game.rating}/10` : "—"}</span></td>
        <td><button className="row-arrow" aria-label={`${expanded ? "Close" : "Open"} ${item.game.name} details`} onClick={onToggle}><ArrowUpRight size={16} /></button></td>
      </tr>
      {expanded && (
        <tr className="detail-row"><td colSpan={6}>
          <div className="game-detail">
            <GameCover game={item.game} />
            <div className="game-detail-main">
              <span className="section-index">GAME RECORD</span>
              <h3>{item.game.name}</h3>
              <p>{item.game.owned ? (item.game.location || "In your collection") : "Played title not marked as owned"}{item.game.purchaseDate ? ` · Added ${formatPlayDate(item.game.purchaseDate)}` : ""}</p>
              {bggImageUrl && (
                <a className="external-record-link" href={bggImageUrl} target="_blank" rel="noreferrer">
                  Open image on BoardGameGeek <ArrowUpRight size={13} />
                </a>
              )}
              <form className="game-image-form" onSubmit={(event) => {
                event.preventDefault();
                onSaveImageLink(item.game, imageLink);
              }}>
                <label className="field">
                  <span>Cover image URL <em>optional</em></span>
                  <input
                    type="url"
                    value={imageLink}
                    onChange={(event) => setImageLink(event.target.value)}
                    placeholder="https://cf.geekdo-images.com/…"
                  />
                  <small className="image-url-hint">Open the BGG image above, right-click the large image, choose “Copy image address,” then paste it here.</small>
                </label>
                <button className="button button--outline button--small" type="submit">Save cover</button>
              </form>
              <div className="detail-stats">
                <div><span>Plays</span><strong>{item.plays}</strong></div>
                <div><span>Hours</span><strong>{formatHours(item.hours)}</strong></div>
                <div><span>Average</span><strong>{formatHours(item.averageDuration)}</strong></div>
                <div><span>Last played</span><strong>{item.lastPlayed ? formatPlayDate(item.lastPlayed) : "Never"}</strong></div>
              </div>
              {item.game.purchasePrice !== undefined && (
                <div className="target-estimates"><span>Estimated plays to reach cost per hour</span>{[20, 10, 5, 2, 1].map((target) => <span className="target-chip" key={target}>€{target} <b>{targetPlays(item, target) ?? "—"}</b></span>)}</div>
              )}
            </div>
          </div>
        </td></tr>
      )}
    </>
  );
}

function PlaysPage({
  plays,
  years,
  query,
  setQuery,
  year,
  setYear,
  gamesById,
  onLog,
}: {
  plays: Play[];
  years: string[];
  query: string;
  setQuery: (query: string) => void;
  year: string;
  setYear: (year: string) => void;
  gamesById: Map<string, Game>;
  onLog: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div><h1>The play log.</h1><p>Every session, kept in order.</p></div>
        <button className="button button--primary" onClick={onLog}><Plus size={16} /> Log a play</button>
      </div>
      <div className="plays-summary-strip">
        <span><strong>{plays.length.toLocaleString()}</strong> entries in view</span>
        <span><CalendarDays size={15} /> {year === "all" ? "All years" : year}</span>
      </div>
      <div className="plays-toolbar">
        <label className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a game in your log…" aria-label="Search play history" /></label>
        <label className="select-field"><span>Year</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">All years</option>{years.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      </div>
      {plays.length ? (
        <div className="play-log">
          <div className="play-log-head"><span>DATE</span><span>GAME</span><span>PLAYERS</span><span>DURATION</span><span>NOTES / SCORE</span></div>
          {plays.map((play) => (
            <article className="play-log-row" key={play.id}>
              <time dateTime={play.date}>{formatPlayDate(play.date)}</time>
              <div className="play-log-game"><GameCover game={gamesById.get(play.gameId ?? "") ?? { id: play.id, name: play.gameName, owned: false }} small /><strong>{play.gameName}</strong></div>
              <span className="play-type">{play.playType === "solo" ? "Solo" : play.playType === "multiplayer" ? `${play.players ?? "Multi"} players` : "Unspecified"}</span>
              <strong className="duration-value">{formatHours(play.durationHours)}</strong>
              <span className="play-notes">{play.score || play.notes || "—"}</span>
            </article>
          ))}
        </div>
      ) : <EmptyState title={query ? "No plays found" : "The log is empty"} text={query ? "Try a different search or year." : "Your next game night is the first page."} />}
    </>
  );
}

function InsightsPage({ data, summary }: { data: WorkspaceData; summary: ReturnType<typeof summarizeCollection> }) {
  const [rankMode, setRankMode] = useState<"plays" | "hours" | "pc100">("plays");
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const availableYears = summary.years.map((item) => String(item.year)).sort((a, b) => b.localeCompare(a));
  const yearlyPlays = data.plays.filter((play) => year === "all" || play.date.startsWith(year));
  const ranking = buildGameSummaries(data.games, yearlyPlays).sort((a, b) =>
    rankMode === "plays" ? b.plays - a.plays : rankMode === "hours" ? b.hours - a.hours : b.pc100Score - a.pc100Score,
  ).filter((item) => rankMode === "pc100" ? item.pc100Score > 0 : item.plays > 0).slice(0, 10);

  return (
    <>
      <div className="page-heading">
        <div><h1>The bigger picture.</h1><p>Patterns emerge when you let the numbers play.</p></div>
        <label className="select-field"><span>Year</span><select value={year} onChange={(event) => setYear(event.target.value)}><option value="all">All time</option>{availableYears.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
      </div>
      <section className="insights-summary">
        <div><span>PLAYED</span><strong>{year === "all" ? summary.totalPlays.toLocaleString() : yearlyPlays.length.toLocaleString()}</strong><small>{year === "all" ? "all-time sessions" : `${year} sessions`}</small></div>
        <div><span>TIME AT THE TABLE</span><strong>{formatHours(year === "all" ? summary.totalHours : yearlyPlays.reduce((sum, play) => sum + play.durationHours, 0))}</strong><small>logged play time</small></div>
        <div><span>COLLECTION SPEND</span><strong>{currency.format(summary.totalPurchaseSpend)}</strong><small>purchase prices recorded</small></div>
        <div><span>NO PLAYS YET</span><strong>{summary.unplayedGames}</strong><small>titles still waiting</small></div>
      </section>
      <section className="insight-chart-panel">
        <div className="section-heading"><div><span className="section-index">YEAR-BY-YEAR</span><h2>Time at the table.</h2></div><span className="chart-unit">HOURS PLAYED</span></div>
        <div className="wide-chart"><ChartFrame years={summary.years} metric="hours" onYearClick={(value) => setYear(String(value))} /></div>
      </section>
      <section className="rankings-panel">
        <div className="section-heading">
          <div><span className="section-index">THE LEADERBOARD</span><h2>Games with a story to tell.</h2></div>
          <div className="segmented-control" role="group" aria-label="Ranking metric">
            <button className={rankMode === "plays" ? "selected" : ""} onClick={() => setRankMode("plays")}>Plays</button>
            <button className={rankMode === "hours" ? "selected" : ""} onClick={() => setRankMode("hours")}>Hours</button>
            <button className={rankMode === "pc100" ? "selected" : ""} onClick={() => setRankMode("pc100")}>PC100</button>
          </div>
        </div>
        <div className="ranking-list">
          {ranking.map((item, index) => (
            <div className="ranking-list-row" key={item.game.id}>
              <span className="ranking-number">{String(index + 1).padStart(2, "0")}</span>
              <GameCover game={item.game} small />
              <strong>{item.game.name}</strong>
              <span className="ranking-metric">{rankMode === "plays" ? `${item.plays} plays` : rankMode === "hours" ? formatHours(item.hours) : `${item.pc100Score.toFixed(1)} pts`}</span>
              <div className="rank-track"><i style={{ width: `${Math.max(4, (rankMode === "plays" ? item.plays / (ranking[0]?.plays || 1) : rankMode === "hours" ? item.hours / (ranking[0]?.hours || 1) : item.pc100Score / (ranking[0]?.pc100Score || 1)) * 100)}%` }} /></div>
            </div>
          ))}
          {!ranking.length && <EmptyState title="No ranking data yet" text="Log plays to build rankings from your own records." />}
        </div>
        <details className="scoring-note">
          <summary>How the PC100 score works <ChevronDown size={15} /></summary>
          <p>PC100 uses recency-adjusted solo play time, cost per hour, your rating, and your desire to play again. Imported plays without an explicit solo/multiplayer marker are left unclassified rather than guessed. The score is a starting point and its weights can be tuned.</p>
        </details>
      </section>
    </>
  );
}

function EmptyState({ title, text }: { title: string; text: string }) {
  return <div className="empty-state"><span className="empty-mark"><BookOpen size={19} /></span><strong>{title}</strong><p>{text}</p></div>;
}

export default App;
