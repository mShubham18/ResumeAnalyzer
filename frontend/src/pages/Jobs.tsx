import { FormEvent, useEffect, useState } from "react";
import { fetchJobSuggestions, searchJobs } from "../lib/api";
import type { JobListing, JobPortalResult, JobSuggestion, LocationSuggestion } from "../types";

export default function JobsPage() {
  const [jobQuery, setJobQuery] = useState("Software Engineer");
  const [locationQuery, setLocationQuery] = useState("Bangalore");
  const [experienceId, setExperienceId] = useState("all");
  const [jobSuggestions, setJobSuggestions] = useState<JobSuggestion[]>([]);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [experienceRanges, setExperienceRanges] = useState<Array<{ id: string; text: string }>>([]);
  const [results, setResults] = useState<JobListing[]>([]);
  const [portalResults, setPortalResults] = useState<JobPortalResult[]>([]);

  useEffect(() => {
    const loadSuggestions = async () => {
      const data = await fetchJobSuggestions({ query: jobQuery, location_query: locationQuery });
      setJobSuggestions(data.job_suggestions || []);
      setLocationSuggestions(data.location_suggestions || []);
      setExperienceRanges(data.experience_ranges || []);
    };
    void loadSuggestions();
  }, [jobQuery, locationQuery]);

  const runSearch = async (event: FormEvent) => {
    event.preventDefault();
    const data = await searchJobs({
      job_title: jobQuery,
      location: locationQuery,
      experience_id: experienceId,
    });
    setResults(data.jobs || []);
    setPortalResults(data.portals || []);
  };

  return (
    <section>
      <header className="page-head">
        <h2>Job Suggestions</h2>
        <p>Search across multiple portals using your role/location filters.</p>
      </header>

      <form className="panel form-grid" onSubmit={runSearch}>
        <label>
          Job title or skill
          <input value={jobQuery} onChange={(e) => setJobQuery(e.target.value)} />
        </label>

        <label>
          Location
          <input value={locationQuery} onChange={(e) => setLocationQuery(e.target.value)} />
        </label>

        <label>
          Experience range
          <select value={experienceId} onChange={(e) => setExperienceId(e.target.value)}>
            {(experienceRanges || []).map((exp) => (
              <option key={exp.id} value={exp.id}>
                {exp.text}
              </option>
            ))}
          </select>
        </label>

        <button className="btn btn-primary" type="submit">
          Search Jobs
        </button>
      </form>

      <div className="grid-2">
        <div className="panel">
          <h3>Job Suggestions</h3>
          <ul>
            {(jobSuggestions || []).map((item) => (
              <li key={item.text}>
                {item.icon} {item.text}
              </li>
            ))}
          </ul>
        </div>

        <div className="panel">
          <h3>Location Suggestions</h3>
          <ul>
            {(locationSuggestions || []).map((item) => (
              <li key={`${item.type}-${item.text}`}>
                {item.icon} {item.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="panel">
        <h3>Live Job Listings</h3>
        {results.length ? (
          <div className="jobs-grid">
            {results.map((item) => (
              <article key={`${item.source}-${item.id}`} className="panel job-card">
                <h4>{item.title}</h4>
                <p className="muted">Company: {item.company}</p>
                <p>
                  {item.location} {item.job_type ? `• ${item.job_type}` : ""}
                </p>
                <a href={item.url} target="_blank" rel="noreferrer" className="job-link">
                  Open Job
                </a>
              </article>
            ))}
          </div>
        ) : (
          <p>No live jobs found for this query yet. Try broader role/location terms.</p>
        )}
      </div>

      <div className="panel">
        <h3>Portal Links (Fallback)</h3>
        <ul className="portal-list">
          {portalResults.map((item) => (
            <li key={item.portal}>
              <a href={item.url} target="_blank" rel="noreferrer">
                {item.portal}: {item.title}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
