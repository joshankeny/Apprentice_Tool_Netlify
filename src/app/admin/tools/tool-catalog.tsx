"use client";

import { useState } from "react";
import Link from "next/link";
import { CatalogTrades } from "./catalog-trades";
import { TOOL_STATUSES, type ToolStatus, type ToolTrades } from "./tool-fields";

type CatalogTool = {
  id: string;
  formalName: string;
  commonName: string | null;
  family: string;
  status: ToolStatus;
  imageUrl: string;
  version: string;
  trades: ToolTrades;
};

export function ToolCatalog({ tools }: { tools: CatalogTool[] }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const query = search.trim().toLowerCase();
  const visibleTools = tools.filter((tool) =>
    (!status || tool.status === status) &&
    [tool.formalName, tool.commonName ?? "", tool.family].some((value) => value.toLowerCase().includes(query))
  );

  return (
    <section className="card grid" aria-label="Tools">
      <div className="grid admin-filters">
        <label>
          Search tools
          <input
            type="search"
            placeholder="Name or family"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          Filter by status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">All statuses</option>
            {Object.entries(TOOL_STATUSES).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="muted admin-count" aria-live="polite">
        {visibleTools.length} of {tools.length} tools
      </p>
      <p className="muted admin-count">A tool with all three trades set to Unset is General.</p>
      {visibleTools.length ? (
        <div className="admin-table-wrap">
          <table className="table admin-tool-table">
            <thead>
              <tr>
                <th scope="col">Photo</th>
                <th scope="col">Tool</th>
                <th scope="col">Family</th>
                <th scope="col">Status</th>
                <th scope="col">Trades</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {visibleTools.map((tool) => (
                <tr key={tool.id}>
                  <td>
                    {tool.imageUrl
                      ? <img className="admin-tool-thumb" src={tool.imageUrl} alt="" loading="lazy" />
                      : <span className="muted">No photo</span>}
                  </td>
                  <th scope="row">
                    {tool.formalName}
                    {tool.commonName && <span className="muted admin-common-name">{tool.commonName}</span>}
                  </th>
                  <td>{tool.family}</td>
                  <td>{TOOL_STATUSES[tool.status]}</td>
                  <td><CatalogTrades toolId={tool.id} toolName={tool.formalName} version={tool.version} trades={tool.trades} /></td>
                  <td>
                    <Link
                      href={`/admin/tools/${tool.id}/edit`}
                      className="button secondary"
                      aria-label={`Edit ${tool.formalName}`}
                    >
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="muted admin-count">{tools.length ? "No tools match these filters." : "There are no tools in the catalog yet."}</p>
      )}
    </section>
  );
}
