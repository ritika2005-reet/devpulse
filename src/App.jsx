import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useState } from "react";
import "./App.css";

const PinContext = createContext();

function pinReducer(state, action) {
  switch (action.type) {
    case "PIN_REPO":
      if (state.some((repo) => repo.id === action.repo.id)) return state;
      return [...state, action.repo];

    case "UNPIN_REPO":
      return state.filter((repo) => repo.id !== action.id);

    default:
      return state;
  }
}

function PinProvider({ children }) {
  const [pins, dispatch] = useReducer(pinReducer, [], () => {
    try {
      return JSON.parse(localStorage.getItem("devpulse-pins")) || [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("devpulse-pins", JSON.stringify(pins));
  }, [pins]);

  return (
    <PinContext.Provider value={{ pins, dispatch }}>
      {children}
    </PinContext.Provider>
  );
}

function useDebounce(value, delay = 500) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function RepoCard({ repo, onTogglePin, pinned }) {
  return (
    <div className="repo-card">
      <div className="repo-top">
        <h3>{repo.name}</h3>

        <button
          className={pinned ? "pin-button pinned" : "pin-button"}
          onClick={() => onTogglePin(repo)}
        >
          {pinned ? "★ Pinned" : "☆ Pin"}
        </button>
      </div>

      <p className="repo-description">
        {repo.description || "No description available."}
      </p>

      <div className="repo-info">
        <span>● {repo.language || "Unknown"}</span>
        <span>★ {repo.stargazers_count}</span>
        <span>⑂ {repo.forks_count}</span>
      </div>

      <a href={repo.html_url} target="_blank" rel="noreferrer">
        View Repository →
      </a>
    </div>
  );
}

function App() {
  const { pins, dispatch } = useContext(PinContext);

  const params = new URLSearchParams(window.location.search);

  const [username, setUsername] = useState(params.get("user") || "");
  const [searchInput, setSearchInput] = useState(params.get("user") || "");
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]);
  const [language, setLanguage] = useState("All");
  const [sort, setSort] = useState(params.get("sort") || "updated");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPins, setShowPins] = useState(false);

  const debouncedSearch = useDebounce(searchInput, 500);

  const token = import.meta.env.VITE_API_TOKEN;

  useEffect(() => {
    const cleanUsername = debouncedSearch.trim();

    setUsername(cleanUsername);

    const url = new URL(window.location.href);

    if (cleanUsername) {
      url.searchParams.set("user", cleanUsername);
    } else {
      url.searchParams.delete("user");
    }

    if (language !== "All") {
      url.searchParams.set("lang", language);
    } else {
      url.searchParams.delete("lang");
    }

    url.searchParams.set("sort", sort);

    window.history.replaceState({}, "", url);
  }, [debouncedSearch, language, sort]);

  useEffect(() => {
    if (!username) {
      setProfile(null);
      setRepos([]);
      return;
    }

    async function fetchGitHubData() {
      setLoading(true);
      setError("");

      try {
        const headers = token
          ? { Authorization: `Bearer ${token}` }
          : {};

        const profileResponse = await fetch(
          `https://api.github.com/users/${username}`,
          { headers }
        );

        if (!profileResponse.ok) {
          throw new Error("GitHub user not found.");
        }

        const profileData = await profileResponse.json();

        const repoResponse = await fetch(
          `https://api.github.com/users/${username}/repos?per_page=100&sort=updated`,
          { headers }
        );

        if (!repoResponse.ok) {
          throw new Error("Could not load repositories.");
        }

        const repoData = await repoResponse.json();

        setProfile(profileData);
        setRepos(repoData);
      } catch (err) {
        setProfile(null);
        setRepos([]);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchGitHubData();
  }, [username, token]);

  useEffect(() => {
    document.title = username
      ? `${username} | DevPulse`
      : "DevPulse | GitHub Inspector";
  }, [username]);

  const languages = useMemo(() => {
    const uniqueLanguages = repos
      .map((repo) => repo.language)
      .filter(Boolean);

    return ["All", ...new Set(uniqueLanguages)];
  }, [repos]);

  const filteredRepos = useMemo(() => {
    let result =
      language === "All"
        ? [...repos]
        : repos.filter((repo) => repo.language === language);

    if (sort === "stars") {
      result.sort((a, b) => b.stargazers_count - a.stargazers_count);
    } else if (sort === "forks") {
      result.sort((a, b) => b.forks_count - a.forks_count);
    } else {
      result.sort(
        (a, b) =>
          new Date(b.updated_at) - new Date(a.updated_at)
      );
    }

    return result;
  }, [repos, language, sort]);

  const togglePin = useCallback(
    (repo) => {
      const alreadyPinned = pins.some((item) => item.id === repo.id);

      dispatch({
        type: alreadyPinned ? "UNPIN_REPO" : "PIN_REPO",
        ...(alreadyPinned ? { id: repo.id } : { repo }),
      });
    },
    [pins, dispatch]
  );

  return (
    <div className="app">
      <header className="header">
        <div>
          <h1>DevPulse</h1>
          <p>GitHub Inspector</p>
        </div>

        <button className="pinboard-button" onClick={() => setShowPins(true)}>
          ★ Pinboard ({pins.length})
        </button>
      </header>

      <main className="container">
        <section className="hero">
          <h2>Explore GitHub Developers</h2>
          <p>
            Search a GitHub username and inspect their repositories.
          </p>

          <div className="search-box">
            <input
              type="text"
              placeholder="Enter GitHub username..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
        </section>

        {loading && (
          <div className="message">
            Loading GitHub data...
          </div>
        )}

        {error && (
          <div className="error">
            {error}
          </div>
        )}

        {profile && !loading && (
          <>
            <section className="profile-card">
              <img
                src={profile.avatar_url}
                alt={profile.login}
                className="avatar"
              />

              <div className="profile-details">
                <h2>{profile.name || profile.login}</h2>
                <p>@{profile.login}</p>
                <p>{profile.bio || "No bio available."}</p>

                <div className="stats">
                  <span>
                    <strong>{profile.followers}</strong> Followers
                  </span>

                  <span>
                    <strong>{profile.following}</strong> Following
                  </span>

                  <span>
                    <strong>{profile.public_repos}</strong> Repositories
                  </span>
                </div>

                <a
                  href={profile.html_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  View GitHub Profile →
                </a>
              </div>
            </section>

            <section className="controls">
              <div>
                <label>Language</label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  {languages.map((lang) => (
                    <option key={lang} value={lang}>
                      {lang}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label>Sort By</label>
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                >
                  <option value="updated">Recently Updated</option>
                  <option value="stars">Most Stars</option>
                  <option value="forks">Most Forks</option>
                </select>
              </div>
            </section>

            <div className="repo-heading">
              <h2>Repositories</h2>
              <span>{filteredRepos.length} found</span>
            </div>

            <section className="repo-grid">
              {filteredRepos.map((repo) => (
                <RepoCard
                  key={repo.id}
                  repo={repo}
                  pinned={pins.some((item) => item.id === repo.id)}
                  onTogglePin={togglePin}
                />
              ))}
            </section>
          </>
        )}

        {!username && !loading && (
          <div className="empty-state">
            <h2>Start exploring</h2>
            <p>
              Enter a GitHub username above to inspect their profile.
            </p>
          </div>
        )}
      </main>

      {showPins && (
        <div className="overlay" onClick={() => setShowPins(false)}>
          <aside
            className="pinboard"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pinboard-header">
              <h2>Pinboard</h2>
              <button onClick={() => setShowPins(false)}>×</button>
            </div>

            {pins.length === 0 ? (
              <p className="empty-pin">
                No repositories pinned yet.
              </p>
            ) : (
              pins.map((repo) => (
                <div className="pinned-repo" key={repo.id}>
                  <div>
                    <h3>{repo.name}</h3>
                    <p>{repo.language || "Unknown language"}</p>
                  </div>

                  <button
                    onClick={() =>
                      dispatch({
                        type: "UNPIN_REPO",
                        id: repo.id,
                      })
                    }
                  >
                    Remove
                  </button>
                </div>
              ))
            )}
          </aside>
        </div>
      )}
    </div>
  );
}

export default function AppWithProvider() {
  return (
    <PinProvider>
      <App />
    </PinProvider>
  );
}