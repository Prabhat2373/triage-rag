CREATE TABLE IF NOT EXISTS github_connections (
  org_id integer PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  owner text NOT NULL,
  repo text NOT NULL,
  label text NOT NULL DEFAULT ''
);
