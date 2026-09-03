#!/usr/bin/env python3
"""
GitHub Model Context Protocol (MCP) Server
===========================================
A complete, standalone, production-ready MCP server for GitHub.

Supports:
- Standard MCP protocol (version 2024-11-05)
- Transports:
    - stdio:  Reads JSON-RPC lines from stdin, writes to stdout
    - http:   Runs standalone HTTP JSON-RPC endpoint (--http --port 8001)
- Authentication:
    - GITHUB_TOKEN / GITHUB_PAT environment variable, or passed via auth_token / --token
    - Public repository operations work even without a token

Available Tools:
1.  github_search_repositories      - Search GitHub repositories with query, sort, limit
2.  github_get_repository           - Get detailed repo metadata, stats, default branch
3.  github_list_issues              - List issues in a repository (open/closed/all)
4.  github_get_issue                - Get specific issue details and discussion
5.  github_create_issue             - Create a new issue with title, body, labels
6.  github_list_pull_requests       - List pull requests in a repo
7.  github_get_pull_request         - Get pull request details and diff status
8.  github_get_file_contents        - Read file or directory contents at branch/tag/sha
9.  github_create_or_update_file    - Create or update file content in a repository
10. github_list_commits             - List commit history for a repo or branch
11. github_get_user                 - Get public or authenticated GitHub user profile
12. github_list_branches            - List branches in a repository
13. github_create_branch            - Create a new Git branch from a base branch
14. github_search_code              - Search code across GitHub repositories
15. Extended GitHub tools (Issues, PRs, Reviews, Actions, Labels, Gists, Org/User Repos, Security Alerts)

Usage:
  # Stdio mode (for MCP clients / subprocesses)
  python github_mcp.py

  # HTTP mode (standalone daemon)
  python github_mcp.py --http --port 8001

  # Test single tool from command line
  python github_mcp.py --test search_repositories query="fastapi stars:>1000"
"""

from __future__ import annotations

import argparse
import asyncio
import base64
import json
import os
import sys
import time
from typing import Any, Optional

import httpx

# ── Protocol Constants ────────────────────────────────────────────────────────
PROTOCOL_VERSION = "2024-11-05"
SERVER_NAME = "github-mcp-server"
SERVER_VERSION = "1.0.0"
DEFAULT_GITHUB_API = "https://api.github.com"


# ── GitHub Client Helper ──────────────────────────────────────────────────────
class GitHubClient:
    def __init__(self, token: Optional[str] = None, api_base: Optional[str] = None):
        self.token = token or os.environ.get("GITHUB_TOKEN") or os.environ.get("GITHUB_PAT") or ""
        self.api_base = (api_base or os.environ.get("GITHUB_API_URL") or DEFAULT_GITHUB_API).rstrip("/")
        self._cached_login: Optional[str] = None

    async def get_current_user_login(self) -> str:
        """Dynamically fetch the authenticated username directly from the connected PAT token."""
        if not self._cached_login:
            try:
                data = await self.get("user")
                if isinstance(data, dict) and data.get("login"):
                    self._cached_login = str(data["login"])
            except Exception:
                pass
        return self._cached_login or ""

    def _headers(self, custom_token: Optional[str] = None) -> dict[str, str]:
        raw_token = custom_token or self.token or ""
        # Clean and sanitize token: remove newlines, carriage returns, quotes, non-ascii
        clean_token = "".join(c for c in str(raw_token).strip().strip("'\"") if 32 <= ord(c) <= 126).strip()
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": f"MCPier-GitHub-MCP/{SERVER_VERSION}",
            "X-GitHub-Api-Version": "2022-11-28",
        }
        if clean_token:
            headers["Authorization"] = f"Bearer {clean_token}"
        return headers

    async def get(self, path: str, params: Optional[dict] = None, token: Optional[str] = None) -> Any:
        url = f"{self.api_base}/{path.lstrip('/')}"
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.get(url, params=params, headers=self._headers(token))
            if resp.status_code >= 400:
                raise RuntimeError(f"GitHub API Error [{resp.status_code}]: {resp.text}")
            return resp.json()

    async def post(self, path: str, json_data: dict, token: Optional[str] = None) -> Any:
        url = f"{self.api_base}/{path.lstrip('/')}"
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.post(url, json=json_data, headers=self._headers(token))
            if resp.status_code >= 400:
                raise RuntimeError(f"GitHub API Error [{resp.status_code}]: {resp.text}")
            return resp.json()

    async def put(self, path: str, json_data: dict, token: Optional[str] = None) -> Any:
        url = f"{self.api_base}/{path.lstrip('/')}"
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.put(url, json=json_data, headers=self._headers(token))
            if resp.status_code >= 400:
                raise RuntimeError(f"GitHub API Error [{resp.status_code}]: {resp.text}")
            return resp.json()

    async def patch(self, path: str, json_data: dict, token: Optional[str] = None) -> Any:
        url = f"{self.api_base}/{path.lstrip('/')}"
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.patch(url, json=json_data, headers=self._headers(token))
            if resp.status_code >= 400:
                raise RuntimeError(f"GitHub API Error [{resp.status_code}]: {resp.text}")
            if not resp.content:
                return True
            return resp.json()

    async def delete(self, path: str, token: Optional[str] = None) -> Any:
        url = f"{self.api_base}/{path.lstrip('/')}"
        async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
            resp = await client.delete(url, headers=self._headers(token))
            if resp.status_code >= 400:
                raise RuntimeError(f"GitHub API Error [{resp.status_code}]: {resp.text}")
            return True


_PLACEHOLDER_OWNERS = {
    "<authenticated_user>",
    "<user>",
    "<owner>",
    "<username>",
    "authenticated_user",
    "user",
    "owner",
    "username",
    "me",
    "current_user",
    "{authenticated_user}",
    "{user}",
    "{owner}",
    "{username}",
}


async def _resolve_authenticated_owner(client: GitHubClient, raw_owner: str) -> str:
    if not raw_owner:
        return ""

    candidate = str(raw_owner).strip().strip("'\"")
    norm = candidate.lower()
    if norm in _PLACEHOLDER_OWNERS:
        authed = await client.get_current_user_login()
        if authed:
            return authed
    return candidate


async def _sanitize_tool_arguments(client: GitHubClient, arguments: dict[str, Any]) -> dict[str, Any]:
    if not isinstance(arguments, dict):
        return arguments

    cleaned = dict(arguments)
    for key in ("owner", "username"):
        if key in cleaned:
            cleaned[key] = await _resolve_authenticated_owner(client, str(cleaned[key]))

    if "owner" in cleaned and cleaned["owner"] and cleaned.get("repo"):
        repo = str(cleaned["repo"]).strip()
        if "/" in repo:
            owner_part, repo_part = repo.split("/", 1)
            if not cleaned["owner"] or cleaned["owner"].lower() == owner_part.lower():
                cleaned["owner"] = owner_part.strip()
                cleaned["repo"] = repo_part.strip()

    return cleaned


# ── Helper for Owner/Repo Auto-Resolution ────────────────────────────────────
async def _resolve_owner_repo(client: GitHubClient, args: dict) -> tuple[str, str]:
    """Smartly resolve owner and repo, auto-detecting authenticated user if omitted."""
    raw_owner = (args.get("owner") or "").strip()
    raw_repo = (args.get("repo") or "").strip()

    # If repo has an explicit owner/repo pair, split it before resolving the authenticated user.
    if "/" in raw_repo:
        parts = raw_repo.split("/", 1)
        raw_owner = parts[0].strip()
        raw_repo = parts[1].strip()

    raw_owner = await _resolve_authenticated_owner(client, raw_owner)

    # If owner is missing, or owner matches repo (model guessed owner = repo name), auto-resolve from authenticated user
    if not raw_owner or raw_owner.lower() == raw_repo.lower():
        try:
            authed_login = await client.get_current_user_login()
            if authed_login:
                raw_owner = authed_login
        except Exception:
            pass

    if not raw_owner or not raw_repo:
        raise ValueError("Parameters 'owner' and 'repo' are required (e.g. owner='username', repo='my-repo')")

    return raw_owner, raw_repo


# ── MCP Tool Implementations ─────────────────────────────────────────────────
async def tool_search_repositories(client: GitHubClient, args: dict) -> str:
    query = args.get("query", "")
    if not query:
        raise ValueError("Parameter 'query' is required")
    sort = args.get("sort", "stars")
    order = args.get("order", "desc")
    limit = min(int(args.get("limit", 10)), 30)

    data = await client.get("search/repositories", params={"q": query, "sort": sort, "order": order, "per_page": limit})
    items = data.get("items", [])
    results = []
    for item in items:
        results.append({
            "full_name": item.get("full_name"),
            "description": item.get("description"),
            "stars": item.get("stargazers_count"),
            "forks": item.get("forks_count"),
            "language": item.get("language"),
            "url": item.get("html_url"),
            "default_branch": item.get("default_branch"),
            "updated_at": item.get("updated_at"),
        })
    return json.dumps({"total_count": data.get("total_count", 0), "repositories": results}, indent=2)


async def tool_get_repository(client: GitHubClient, args: dict) -> str:
    owner, repo = await _resolve_owner_repo(client, args)

    data = await client.get(f"repos/{owner}/{repo}")
    info = {
        "full_name": data.get("full_name"),
        "description": data.get("description"),
        "homepage": data.get("homepage"),
        "stars": data.get("stargazers_count"),
        "watchers": data.get("watchers_count"),
        "forks": data.get("forks_count"),
        "open_issues": data.get("open_issues_count"),
        "default_branch": data.get("default_branch"),
        "topics": data.get("topics", []),
        "visibility": data.get("visibility"),
        "license": data.get("license", {}).get("name") if data.get("license") else None,
        "clone_url": data.get("clone_url"),
        "created_at": data.get("created_at"),
        "updated_at": data.get("updated_at"),
    }
    return json.dumps(info, indent=2)


async def tool_list_issues(client: GitHubClient, args: dict) -> str:
    owner = args.get("owner", "")
    repo = args.get("repo", "")
    if not owner or not repo:
        raise ValueError("Parameters 'owner' and 'repo' are required")
    state = args.get("state", "open")
    limit = min(int(args.get("limit", 10)), 50)

    data = await client.get(f"repos/{owner}/{repo}/issues", params={"state": state, "per_page": limit})
    issues = []
    for item in data:
        if "pull_request" in item and not args.get("include_prs", False):
            continue
        issues.append({
            "number": item.get("number"),
            "title": item.get("title"),
            "user": item.get("user", {}).get("login"),
            "state": item.get("state"),
            "comments": item.get("comments"),
            "created_at": item.get("created_at"),
            "labels": [label.get("name") for label in item.get("labels", [])],
            "url": item.get("html_url"),
        })
    return json.dumps(issues, indent=2)


async def tool_get_issue(client: GitHubClient, args: dict) -> str:
    owner = args.get("owner", "")
    repo = args.get("repo", "")
    issue_number = args.get("issue_number")
    if not owner or not repo or not issue_number:
        raise ValueError("Parameters 'owner', 'repo', and 'issue_number' are required")

    data = await client.get(f"repos/{owner}/{repo}/issues/{issue_number}")
    issue_details = {
        "number": data.get("number"),
        "title": data.get("title"),
        "body": data.get("body"),
        "user": data.get("user", {}).get("login"),
        "state": data.get("state"),
        "comments": data.get("comments"),
        "created_at": data.get("created_at"),
        "updated_at": data.get("updated_at"),
        "labels": [label.get("name") for label in data.get("labels", [])],
        "url": data.get("html_url"),
    }
    return json.dumps(issue_details, indent=2)


async def tool_create_issue(client: GitHubClient, args: dict) -> str:
    owner = args.get("owner", "")
    repo = args.get("repo", "")
    title = args.get("title", "")
    if not owner or not repo or not title:
        raise ValueError("Parameters 'owner', 'repo', and 'title' are required")

    payload: dict[str, Any] = {
        "title": title,
        "body": args.get("body", ""),
    }
    if args.get("labels"):
        payload["labels"] = args.get("labels")
    if args.get("assignees"):
        payload["assignees"] = args.get("assignees")

    data = await client.post(f"repos/{owner}/{repo}/issues", payload)
    return json.dumps({
        "status": "created",
        "number": data.get("number"),
        "title": data.get("title"),
        "url": data.get("html_url"),
    }, indent=2)


async def tool_list_pull_requests(client: GitHubClient, args: dict) -> str:
    owner = args.get("owner", "")
    repo = args.get("repo", "")
    if not owner or not repo:
        raise ValueError("Parameters 'owner' and 'repo' are required")
    state = args.get("state", "open")
    limit = min(int(args.get("limit", 10)), 30)

    data = await client.get(f"repos/{owner}/{repo}/pulls", params={"state": state, "per_page": limit})
    prs = []
    for item in data:
        prs.append({
            "number": item.get("number"),
            "title": item.get("title"),
            "user": item.get("user", {}).get("login"),
            "state": item.get("state"),
            "draft": item.get("draft", False),
            "head": item.get("head", {}).get("ref"),
            "base": item.get("base", {}).get("ref"),
            "created_at": item.get("created_at"),
            "url": item.get("html_url"),
        })
    return json.dumps(prs, indent=2)


async def tool_get_pull_request(client: GitHubClient, args: dict) -> str:
    owner = args.get("owner", "")
    repo = args.get("repo", "")
    pull_number = args.get("pull_number")
    if not owner or not repo or not pull_number:
        raise ValueError("Parameters 'owner', 'repo', and 'pull_number' are required")

    data = await client.get(f"repos/{owner}/{repo}/pulls/{pull_number}")
    pr_details = {
        "number": data.get("number"),
        "title": data.get("title"),
        "body": data.get("body"),
        "user": data.get("user", {}).get("login"),
        "state": data.get("state"),
        "mergeable": data.get("mergeable"),
        "merged": data.get("merged", False),
        "additions": data.get("additions"),
        "deletions": data.get("deletions"),
        "changed_files": data.get("changed_files"),
        "head": data.get("head", {}).get("ref"),
        "base": data.get("base", {}).get("ref"),
        "url": data.get("html_url"),
    }
    return json.dumps(pr_details, indent=2)


async def tool_get_file_contents(client: GitHubClient, args: dict) -> str:
    owner = args.get("owner", "")
    repo = args.get("repo", "")
    path = args.get("path", "")
    ref = args.get("ref", "main")
    if not owner or not repo or not path:
        raise ValueError("Parameters 'owner', 'repo', and 'path' are required")

    data = await client.get(f"repos/{owner}/{repo}/contents/{path.lstrip('/')}", params={"ref": ref})

    if isinstance(data, list):
        entries = []
        for item in data:
            entries.append({
                "name": item.get("name"),
                "path": item.get("path"),
                "type": item.get("type"),
                "size": item.get("size"),
            })
        return json.dumps({"type": "directory", "path": path, "entries": entries}, indent=2)

    content_b64 = data.get("content", "")
    encoding = data.get("encoding", "")
    if encoding == "base64" and content_b64:
        try:
            decoded = base64.b64decode(content_b64).decode("utf-8")
            return json.dumps({
                "type": "file",
                "name": data.get("name"),
                "path": data.get("path"),
                "size": data.get("size"),
                "sha": data.get("sha"),
                "content": decoded,
            }, indent=2)
        except Exception:
            return json.dumps({
                "type": "binary_file",
                "name": data.get("name"),
                "path": data.get("path"),
                "size": data.get("size"),
                "sha": data.get("sha"),
                "download_url": data.get("download_url"),
            }, indent=2)

    return json.dumps(data, indent=2)


async def tool_create_or_update_file(client: GitHubClient, args: dict) -> str:
    owner = args.get("owner", "")
    repo = args.get("repo", "")
    path = args.get("path", "")
    message = args.get("message", "Update file via MCPier")
    content = args.get("content", "")
    branch = args.get("branch", "main")
    sha = args.get("sha")

    if not owner or not repo or not path or not content:
        raise ValueError("Parameters 'owner', 'repo', 'path', and 'content' are required")

    b64_content = base64.b64encode(content.encode("utf-8")).decode("utf-8")
    payload: dict[str, Any] = {
        "message": message,
        "content": b64_content,
        "branch": branch,
    }
    if sha:
        payload["sha"] = sha

    data = await client.put(f"repos/{owner}/{repo}/contents/{path.lstrip('/')}", payload)
    return json.dumps({
        "status": "committed",
        "commit_sha": data.get("commit", {}).get("sha"),
        "content_path": data.get("content", {}).get("path"),
    }, indent=2)


async def tool_list_commits(client: GitHubClient, args: dict) -> str:
    owner = args.get("owner", "")
    repo = args.get("repo", "")
    if not owner or not repo:
        raise ValueError("Parameters 'owner' and 'repo' are required")
    branch = args.get("branch")
    limit = min(int(args.get("limit", 10)), 50)

    params: dict[str, Any] = {"per_page": limit}
    if branch:
        params["sha"] = branch

    data = await client.get(f"repos/{owner}/{repo}/commits", params=params)
    commits = []
    for item in data:
        commits.append({
            "sha": item.get("sha")[:7],
            "full_sha": item.get("sha"),
            "author": item.get("commit", {}).get("author", {}).get("name"),
            "date": item.get("commit", {}).get("author", {}).get("date"),
            "message": item.get("commit", {}).get("message"),
            "url": item.get("html_url"),
        })
    return json.dumps(commits, indent=2)


async def tool_get_user(client: GitHubClient, args: dict) -> str:
    username = args.get("username")
    path = f"users/{username}" if username else "user"
    data = await client.get(path)
    user_info = {
        "login": data.get("login"),
        "name": data.get("name"),
        "company": data.get("company"),
        "bio": data.get("bio"),
        "public_repos": data.get("public_repos"),
        "followers": data.get("followers"),
        "following": data.get("following"),
        "html_url": data.get("html_url"),
        "created_at": data.get("created_at"),
    }
    return json.dumps(user_info, indent=2)


async def tool_list_branches(client: GitHubClient, args: dict) -> str:
    owner, repo = await _resolve_owner_repo(client, args)

    data = await client.get(f"repos/{owner}/{repo}/branches", params={"per_page": 50})
    branches = []
    for item in data:
        branches.append({
            "name": item.get("name"),
            "commit_sha": item.get("commit", {}).get("sha")[:7],
            "protected": item.get("protected", False),
        })
    return json.dumps(branches, indent=2)


async def tool_create_branch(client: GitHubClient, args: dict) -> str:
    owner, repo = await _resolve_owner_repo(client, args)
    branch = args.get("branch", "").strip()
    from_branch = args.get("from_branch", "").strip()
    if not branch:
        raise ValueError("Parameter 'branch' is required")

    base_sha = None
    candidates = [from_branch] if from_branch else ["main", "master"]
    for candidate in candidates:
        if not candidate:
            continue
        try:
            base_data = await client.get(f"repos/{owner}/{repo}/git/ref/heads/{candidate}")
            base_sha = base_data.get("object", {}).get("sha")
            if base_sha:
                break
        except Exception:
            continue

    if not base_sha:
        try:
            repo_data = await client.get(f"repos/{owner}/{repo}")
            default_b = repo_data.get("default_branch", "main")
            base_data = await client.get(f"repos/{owner}/{repo}/git/ref/heads/{default_b}")
            base_sha = base_data.get("object", {}).get("sha")
        except Exception:
            pass

    if not base_sha:
        raise RuntimeError(f"Could not find base branch for repository '{owner}/{repo}'. Please check repository name.")

    payload = {
        "ref": f"refs/heads/{branch}",
        "sha": base_sha,
    }
    data = await client.post(f"repos/{owner}/{repo}/git/refs", payload)
    return json.dumps({
        "status": "created",
        "owner": owner,
        "repo": repo,
        "branch": branch,
        "ref": data.get("ref"),
        "sha": data.get("object", {}).get("sha"),
    }, indent=2)


async def tool_delete_branch(client: GitHubClient, args: dict) -> str:
    owner, repo = await _resolve_owner_repo(client, args)
    branch = args.get("branch", "").strip()
    if not branch:
        raise ValueError("Parameter 'branch' is required")
    ref_head = branch.removeprefix("refs/heads/").removeprefix("heads/").strip()
    await client.delete(f"repos/{owner}/{repo}/git/refs/heads/{ref_head}")
    return json.dumps({
        "status": "deleted",
        "owner": owner,
        "repo": repo,
        "branch": ref_head,
        "ref": f"refs/heads/{ref_head}",
    }, indent=2)


async def tool_search_code(client: GitHubClient, args: dict) -> str:
    query = args.get("query", "")
    if not query:
        raise ValueError("Parameter 'query' is required")
    owner = args.get("owner")
    repo = args.get("repo")
    limit = min(int(args.get("limit", 10)), 30)

    q = query
    if owner and repo:
        q += f" repo:{owner}/{repo}"
    elif owner:
        q += f" user:{owner}"

    data = await client.get("search/code", params={"q": q, "per_page": limit})
    items = []
    for item in data.get("items", []):
        items.append({
            "name": item.get("name"),
            "path": item.get("path"),
            "repo": item.get("repository", {}).get("full_name"),
            "url": item.get("html_url"),
        })
    return json.dumps({"total_count": data.get("total_count", 0), "results": items}, indent=2)


# ── Extended GitHub REST Tool Implementations ─────────────────────────────────
def _req(args: dict, *names: str):
    vals = [args.get(n) for n in names]
    if any(v is None or v == "" for v in vals):
        raise ValueError("Required parameters: " + ", ".join(names))
    return vals

async def _repo(client: GitHubClient, args: dict):
    raw_owner = (args.get("owner") or "").strip()
    raw_repo = (args.get("repo") or "").strip()

    if "/" in raw_repo:
        parts = raw_repo.split("/", 1)
        raw_owner = parts[0].strip()
        raw_repo = parts[1].strip()

    raw_owner = await _resolve_authenticated_owner(client, raw_owner)

    if (not raw_owner or raw_owner.lower() == raw_repo.lower()) and raw_repo:
        authed_login = await client.get_current_user_login()
        if authed_login:
            raw_owner = authed_login

    if not raw_owner or not raw_repo:
        raise ValueError("Parameters 'owner' and 'repo' are required")

    return str(raw_owner), str(raw_repo)

async def _simple_get(client, args, path, params=None):
    return json.dumps(await client.get(path, params=params), indent=2)

async def _simple_post(client, args, path, payload):
    return json.dumps(await client.post(path, payload), indent=2)

async def _simple_patch(client, args, path, payload):
    return json.dumps(await client.patch(path, payload), indent=2)

async def tool_github_api_request(client: GitHubClient, args: dict) -> str:
    method, path = _req(args, "method", "path")
    method = str(method).upper()
    params = args.get("params") or None
    body = args.get("body") or {}
    if method == "GET": data = await client.get(path, params=params)
    elif method == "POST": data = await client.post(path, body)
    elif method == "PUT": data = await client.put(path, body)
    elif method == "PATCH": data = await client.patch(path, body)
    elif method == "DELETE": data = await client.delete(path)
    else: raise ValueError("method must be GET, POST, PUT, PATCH, or DELETE")
    return json.dumps(data, indent=2)

async def tool_update_issue(client, args):
    o, r = await _repo(client, args)
    n = _req(args, "issue_number")[0]
    payload = {k: args[k] for k in ("title", "body", "state", "state_reason", "assignees", "labels", "milestone") if k in args}
    return await _simple_patch(client, args, f"repos/{o}/{r}/issues/{n}", payload)

async def tool_list_issue_comments(client, args):
    o, r = await _repo(client, args)
    n = _req(args, "issue_number")[0]
    return await _simple_get(client, args, f"repos/{o}/{r}/issues/{n}/comments", {"per_page": min(int(args.get("limit", 30)), 100)})

async def tool_create_issue_comment(client, args):
    o, r = await _repo(client, args)
    n = _req(args, "issue_number")[0]
    body = _req(args, "body")[0]
    return await _simple_post(client, args, f"repos/{o}/{r}/issues/{n}/comments", {"body": body})

async def tool_list_labels(client, args):
    o, r = await _repo(client, args)
    return await _simple_get(client, args, f"repos/{o}/{r}/labels", {"per_page": 100})

async def tool_create_label(client, args):
    o, r = await _repo(client, args)
    name, color = _req(args, "name", "color")
    return await _simple_post(client, args, f"repos/{o}/{r}/labels", {"name": name, "color": color, "description": args.get("description", "")})

async def tool_update_label(client, args):
    o, r = await _repo(client, args)
    name = _req(args, "name")[0]
    payload = {k: args[k] for k in ("new_name", "color", "description") if k in args}
    return await _simple_patch(client, args, f"repos/{o}/{r}/labels/{name}", payload)

async def tool_delete_label(client, args):
    o, r = await _repo(client, args)
    name = _req(args, "name")[0]
    return json.dumps(await client.delete(f"repos/{o}/{r}/labels/{name}"), indent=2)

async def tool_create_pull_request(client, args):
    o, r = await _repo(client, args)
    title, head, base = _req(args, "title", "head", "base")
    p = {"title": title, "head": head, "base": base, "body": args.get("body", "")}
    for k in ("draft", "maintainer_can_modify", "issue"):
        if k in args: p[k] = args[k]
    return await _simple_post(client, args, f"repos/{o}/{r}/pulls", p)

async def tool_update_pull_request(client, args):
    o, r = await _repo(client, args)
    n = _req(args, "pull_number")[0]
    p = {k: args[k] for k in ("title", "body", "state", "base", "maintainer_can_modify") if k in args}
    return await _simple_patch(client, args, f"repos/{o}/{r}/pulls/{n}", p)

async def tool_merge_pull_request(client, args):
    o, r = await _repo(client, args)
    n = _req(args, "pull_number")[0]
    p = {k: args[k] for k in ("commit_title", "commit_message", "merge_method", "sha") if k in args}
    return json.dumps(await client.put(f"repos/{o}/{r}/pulls/{n}/merge", p), indent=2)

async def tool_list_pr_files(client, args):
    o, r = await _repo(client, args)
    n = _req(args, "pull_number")[0]
    return await _simple_get(client, args, f"repos/{o}/{r}/pulls/{n}/files", {"per_page": 100})

async def tool_list_pr_reviews(client, args):
    o, r = await _repo(client, args)
    n = _req(args, "pull_number")[0]
    return await _simple_get(client, args, f"repos/{o}/{r}/pulls/{n}/reviews", {"per_page": 100})

async def tool_create_pr_review(client, args):
    o, r = await _repo(client, args)
    n = _req(args, "pull_number")[0]
    p = {k: args[k] for k in ("body", "event", "commit_id", "comments") if k in args}
    return await _simple_post(client, args, f"repos/{o}/{r}/pulls/{n}/reviews", p)

async def tool_list_workflows(client, args):
    o, r = await _repo(client, args)
    return await _simple_get(client, args, f"repos/{o}/{r}/actions/workflows", {"per_page": 100})

async def tool_list_workflow_runs(client, args):
    o, r = await _repo(client, args)
    return await _simple_get(client, args, f"repos/{o}/{r}/actions/runs", {"per_page": min(int(args.get("limit", 30)), 100)})

async def tool_dispatch_workflow(client, args):
    o, r = await _repo(client, args)
    workflow, ref = _req(args, "workflow_id", "ref")
    await client.post(f"repos/{o}/{r}/actions/workflows/{workflow}/dispatches", {"ref": ref, "inputs": args.get("inputs", {})})
    return json.dumps({"status": "dispatched"}, indent=2)

async def tool_rerun_workflow(client, args):
    o, r = await _repo(client, args)
    run = _req(args, "run_id")[0]
    await client.post(f"repos/{o}/{r}/actions/runs/{run}/rerun", {})
    return json.dumps({"status": "rerun_requested"}, indent=2)

async def tool_cancel_workflow(client, args):
    o, r = await _repo(client, args)
    run = _req(args, "run_id")[0]
    await client.post(f"repos/{o}/{r}/actions/runs/{run}/cancel", {})
    return json.dumps({"status": "cancel_requested"}, indent=2)

async def tool_list_dependabot_alerts(client, args):
    o, r = await _repo(client, args)
    return await _simple_get(client, args, f"repos/{o}/{r}/dependabot/alerts", {"per_page": 100})

async def tool_list_code_scanning_alerts(client, args):
    o, r = await _repo(client, args)
    return await _simple_get(client, args, f"repos/{o}/{r}/code-scanning/alerts", {"per_page": 100})

async def tool_list_secret_scanning_alerts(client, args):
    o, r = await _repo(client, args)
    return await _simple_get(client, args, f"repos/{o}/{r}/secret-scanning/alerts", {"per_page": 100})

async def tool_list_notifications(client, args):
    return await _simple_get(client, args, "notifications", {"all": str(bool(args.get("all", False))).lower(), "per_page": 100})

async def tool_mark_notifications_read(client, args):
    await client.put("notifications", {"last_read_at": args.get("last_read_at")})
    return json.dumps({"status": "marked_read"}, indent=2)

async def tool_list_gists(client, args):
    return await _simple_get(client, args, "gists", {"per_page": 100})

async def tool_create_gist(client, args):
    files = _req(args, "files")[0]
    return await _simple_post(client, args, "gists", {"description": args.get("description", ""), "public": bool(args.get("public", False)), "files": files})

async def tool_get_gist(client, args):
    gist_id = _req(args, "gist_id")[0]
    return await _simple_get(client, args, f"gists/{gist_id}")

async def tool_list_stargazers(client, args):
    o, r = await _repo(client, args)
    return await _simple_get(client, args, f"repos/{o}/{r}/stargazers", {"per_page": 100})

async def tool_list_org_repositories(client, args):
    org = _req(args, "org")[0]
    return await _simple_get(client, args, f"orgs/{org}/repos", {"per_page": 100})

async def tool_list_org_members(client, args):
    org = _req(args, "org")[0]
    return await _simple_get(client, args, f"orgs/{org}/members", {"per_page": 100})

async def tool_list_user_repositories(client, args):
    username = args.get("username")
    path = f"users/{username}/repos" if username else "user/repos"
    return await _simple_get(client, args, path, {"per_page": 100})

async def tool_create_repository(client, args):
    name = _req(args, "name")[0]
    p = {"name": name, "description": args.get("description", "")}
    for k in ("private", "has_issues", "has_projects", "has_wiki", "auto_init", "gitignore_template", "license_template"):
        if k in args: p[k] = args[k]
    return await _simple_post(client, args, "user/repos", p)

async def tool_delete_repository(client, args):
    o, r = await _repo(client, args)
    return json.dumps(await client.delete(f"repos/{o}/{r}"), indent=2)

async def tool_fork_repository(client, args):
    o, r = await _repo(client, args)
    p = {k: args[k] for k in ("organization", "name", "default_branch_only") if k in args}
    return await _simple_post(client, args, f"repos/{o}/{r}/forks", p)


EXTENDED_TOOLS = [
    ("github_api_request", "Generic authenticated GitHub REST API request for supported endpoints.", tool_github_api_request, {"method": {"type": "string", "enum": ["GET", "POST", "PUT", "PATCH", "DELETE"]}, "path": {"type": "string"}, "params": {"type": "object"}, "body": {"type": "object"}}, ["method", "path"]),
    ("github_update_issue", "Update, close, or reopen an issue.", tool_update_issue, {"owner": {"type": "string"}, "repo": {"type": "string"}, "issue_number": {"type": "integer"}, "title": {"type": "string"}, "body": {"type": "string"}, "state": {"type": "string"}, "state_reason": {"type": "string"}, "assignees": {"type": "array", "items": {"type": "string"}}, "labels": {"type": "array", "items": {"type": "string"}}, "milestone": {"type": "integer"}}, ["owner", "repo", "issue_number"]),
    ("github_list_issue_comments", "List comments on an issue.", tool_list_issue_comments, {"owner": {"type": "string"}, "repo": {"type": "string"}, "issue_number": {"type": "integer"}, "limit": {"type": "integer"}}, ["owner", "repo", "issue_number"]),
    ("github_create_issue_comment", "Create an issue comment.", tool_create_issue_comment, {"owner": {"type": "string"}, "repo": {"type": "string"}, "issue_number": {"type": "integer"}, "body": {"type": "string"}}, ["owner", "repo", "issue_number", "body"]),
    ("github_list_labels", "List repository labels.", tool_list_labels, {"owner": {"type": "string"}, "repo": {"type": "string"}}, ["owner", "repo"]),
    ("github_create_label", "Create a repository label.", tool_create_label, {"owner": {"type": "string"}, "repo": {"type": "string"}, "name": {"type": "string"}, "color": {"type": "string"}, "description": {"type": "string"}}, ["owner", "repo", "name", "color"]),
    ("github_update_label", "Update a repository label.", tool_update_label, {"owner": {"type": "string"}, "repo": {"type": "string"}, "name": {"type": "string"}, "new_name": {"type": "string"}, "color": {"type": "string"}, "description": {"type": "string"}}, ["owner", "repo", "name"]),
    ("github_delete_label", "Delete a repository label.", tool_delete_label, {"owner": {"type": "string"}, "repo": {"type": "string"}, "name": {"type": "string"}}, ["owner", "repo", "name"]),
    ("github_create_pull_request", "Create a pull request.", tool_create_pull_request, {"owner": {"type": "string"}, "repo": {"type": "string"}, "title": {"type": "string"}, "head": {"type": "string"}, "base": {"type": "string"}, "body": {"type": "string"}, "draft": {"type": "boolean"}}, ["owner", "repo", "title", "head", "base"]),
    ("github_update_pull_request", "Update or close a pull request.", tool_update_pull_request, {"owner": {"type": "string"}, "repo": {"type": "string"}, "pull_number": {"type": "integer"}, "title": {"type": "string"}, "body": {"type": "string"}, "state": {"type": "string"}, "base": {"type": "string"}}, ["owner", "repo", "pull_number"]),
    ("github_merge_pull_request", "Merge a pull request.", tool_merge_pull_request, {"owner": {"type": "string"}, "repo": {"type": "string"}, "pull_number": {"type": "integer"}, "merge_method": {"type": "string"}, "commit_title": {"type": "string"}, "commit_message": {"type": "string"}, "sha": {"type": "string"}}, ["owner", "repo", "pull_number"]),
    ("github_list_pull_request_files", "List changed files in a pull request.", tool_list_pr_files, {"owner": {"type": "string"}, "repo": {"type": "string"}, "pull_number": {"type": "integer"}}, ["owner", "repo", "pull_number"]),
    ("github_list_pull_request_reviews", "List reviews for a pull request.", tool_list_pr_reviews, {"owner": {"type": "string"}, "repo": {"type": "string"}, "pull_number": {"type": "integer"}}, ["owner", "repo", "pull_number"]),
    ("github_create_pull_request_review", "Create an approve/request-changes/comment review.", tool_create_pr_review, {"owner": {"type": "string"}, "repo": {"type": "string"}, "pull_number": {"type": "integer"}, "body": {"type": "string"}, "event": {"type": "string", "enum": ["APPROVE", "REQUEST_CHANGES", "COMMENT"]}, "comments": {"type": "array", "items": {"type": "object"}}}, ["owner", "repo", "pull_number"]),
    ("github_list_workflows", "List GitHub Actions workflows.", tool_list_workflows, {"owner": {"type": "string"}, "repo": {"type": "string"}}, ["owner", "repo"]),
    ("github_list_workflow_runs", "List GitHub Actions workflow runs.", tool_list_workflow_runs, {"owner": {"type": "string"}, "repo": {"type": "string"}, "limit": {"type": "integer"}}, ["owner", "repo"]),
    ("github_dispatch_workflow", "Trigger a workflow dispatch.", tool_dispatch_workflow, {"owner": {"type": "string"}, "repo": {"type": "string"}, "workflow_id": {"type": "string"}, "ref": {"type": "string"}, "inputs": {"type": "object"}}, ["owner", "repo", "workflow_id", "ref"]),
    ("github_rerun_workflow", "Request rerun of a workflow run.", tool_rerun_workflow, {"owner": {"type": "string"}, "repo": {"type": "string"}, "run_id": {"type": "integer"}}, ["owner", "repo", "run_id"]),
    ("github_cancel_workflow", "Cancel a workflow run.", tool_cancel_workflow, {"owner": {"type": "string"}, "repo": {"type": "string"}, "run_id": {"type": "integer"}}, ["owner", "repo", "run_id"]),
    ("github_list_dependabot_alerts", "List Dependabot alerts.", tool_list_dependabot_alerts, {"owner": {"type": "string"}, "repo": {"type": "string"}}, ["owner", "repo"]),
    ("github_list_code_scanning_alerts", "List code scanning alerts.", tool_list_code_scanning_alerts, {"owner": {"type": "string"}, "repo": {"type": "string"}}, ["owner", "repo"]),
    ("github_list_secret_scanning_alerts", "List secret scanning alerts.", tool_list_secret_scanning_alerts, {"owner": {"type": "string"}, "repo": {"type": "string"}}, ["owner", "repo"]),
    ("github_list_notifications", "List authenticated user notifications.", tool_list_notifications, {"all": {"type": "boolean"}}, []),
    ("github_mark_notifications_read", "Mark notifications as read.", tool_mark_notifications_read, {"last_read_at": {"type": "string"}}, []),
    ("github_list_gists", "List authenticated user's gists.", tool_list_gists, {}, []),
    ("github_create_gist", "Create a gist.", tool_create_gist, {"description": {"type": "string"}, "public": {"type": "boolean"}, "files": {"type": "object"}}, ["files"]),
    ("github_get_gist", "Get a gist.", tool_get_gist, {"gist_id": {"type": "string"}}, ["gist_id"]),
    ("github_list_stargazers", "List repository stargazers.", tool_list_stargazers, {"owner": {"type": "string"}, "repo": {"type": "string"}}, ["owner", "repo"]),
    ("github_list_org_repositories", "List organization repositories.", tool_list_org_repositories, {"org": {"type": "string"}}, ["org"]),
    ("github_list_org_members", "List organization members.", tool_list_org_members, {"org": {"type": "string"}}, ["org"]),
    ("github_list_user_repositories", "List repositories for a user or the authenticated user.", tool_list_user_repositories, {"username": {"type": "string"}}, []),
    ("github_create_repository", "Create a repository for the authenticated user.", tool_create_repository, {"name": {"type": "string"}, "description": {"type": "string"}, "private": {"type": "boolean"}, "auto_init": {"type": "boolean"}}, ["name"]),
    ("github_delete_repository", "Delete a repository.", tool_delete_repository, {"owner": {"type": "string"}, "repo": {"type": "string"}}, ["owner", "repo"]),
    ("github_fork_repository", "Fork a repository.", tool_fork_repository, {"owner": {"type": "string"}, "repo": {"type": "string"}, "organization": {"type": "string"}, "name": {"type": "string"}}, ["owner", "repo"]),
]

# ── MCP Tool Registry & Schemas ───────────────────────────────────────────────
TOOLS_REGISTRY = [
    {
        "name": "github_search_repositories",
        "description": "Search public and private GitHub repositories matching a keyword query.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query keywords (e.g. 'mcp stars:>500 language:python')"},
                "sort": {"type": "string", "enum": ["stars", "forks", "updated"], "default": "stars"},
                "order": {"type": "string", "enum": ["desc", "asc"], "default": "desc"},
                "limit": {"type": "integer", "description": "Max results to return (default 10, max 30)", "default": 10},
            },
            "required": ["query"],
        },
        "handler": tool_search_repositories,
    },
    {
        "name": "github_get_repository",
        "description": "Get detailed metadata, stars, forks, default branch, and license for a repository.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner": {"type": "string", "description": "Repository owner or organization (e.g. 'octocat')"},
                "repo": {"type": "string", "description": "Repository name (e.g. 'Hello-World')"},
            },
            "required": ["owner", "repo"],
        },
        "handler": tool_get_repository,
    },
    {
        "name": "github_list_issues",
        "description": "List open or closed issues in a repository with labels and comment counts.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner": {"type": "string", "description": "Repository owner"},
                "repo": {"type": "string", "description": "Repository name"},
                "state": {"type": "string", "enum": ["open", "closed", "all"], "default": "open"},
                "limit": {"type": "integer", "description": "Number of issues to return", "default": 10},
            },
            "required": ["owner", "repo"],
        },
        "handler": tool_list_issues,
    },
    {
        "name": "github_get_issue",
        "description": "Get the full body, state, author, and metadata of a specific issue.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner": {"type": "string", "description": "Repository owner"},
                "repo": {"type": "string", "description": "Repository name"},
                "issue_number": {"type": "integer", "description": "Issue number (#ID)"},
            },
            "required": ["owner", "repo", "issue_number"],
        },
        "handler": tool_get_issue,
    },
    {
        "name": "github_create_issue",
        "description": "Create a new issue in a GitHub repository.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner": {"type": "string", "description": "Repository owner"},
                "repo": {"type": "string", "description": "Repository name"},
                "title": {"type": "string", "description": "Issue title"},
                "body": {"type": "string", "description": "Markdown body content"},
                "labels": {"type": "array", "items": {"type": "string"}, "description": "List of label names"},
            },
            "required": ["owner", "repo", "title"],
        },
        "handler": tool_create_issue,
    },
    {
        "name": "github_list_pull_requests",
        "description": "List pull requests in a repository with head/base branches and draft status.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner": {"type": "string", "description": "Repository owner"},
                "repo": {"type": "string", "description": "Repository name"},
                "state": {"type": "string", "enum": ["open", "closed", "all"], "default": "open"},
                "limit": {"type": "integer", "description": "Number of PRs to return", "default": 10},
            },
            "required": ["owner", "repo"],
        },
        "handler": tool_list_pull_requests,
    },
    {
        "name": "github_get_pull_request",
        "description": "Get pull request details including diff stats, mergeable status, and body.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner": {"type": "string", "description": "Repository owner"},
                "repo": {"type": "string", "description": "Repository name"},
                "pull_number": {"type": "integer", "description": "Pull Request number (#ID)"},
            },
            "required": ["owner", "repo", "pull_number"],
        },
        "handler": tool_get_pull_request,
    },
    {
        "name": "github_get_file_contents",
        "description": "Read file contents (decoded UTF-8 text) or list directory entries at a path and git ref.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner": {"type": "string", "description": "Repository owner"},
                "repo": {"type": "string", "description": "Repository name"},
                "path": {"type": "string", "description": "Path to file or folder (e.g. 'src/index.ts')"},
                "ref": {"type": "string", "description": "Git branch, tag, or commit SHA (default 'main')", "default": "main"},
            },
            "required": ["owner", "repo", "path"],
        },
        "handler": tool_get_file_contents,
    },
    {
        "name": "github_create_or_update_file",
        "description": "Create or modify a file in a repository by writing content and creating a commit.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner": {"type": "string", "description": "Repository owner"},
                "repo": {"type": "string", "description": "Repository name"},
                "path": {"type": "string", "description": "Path where the file should be created/updated"},
                "message": {"type": "string", "description": "Commit message"},
                "content": {"type": "string", "description": "Plain text content to write to the file"},
                "branch": {"type": "string", "description": "Target branch (default 'main')", "default": "main"},
                "sha": {"type": "string", "description": "Existing file blob SHA (required when updating an existing file)"},
            },
            "required": ["owner", "repo", "path", "content"],
        },
        "handler": tool_create_or_update_file,
    },
    {
        "name": "github_list_commits",
        "description": "List commit history for a repository or branch.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner": {"type": "string", "description": "Repository owner"},
                "repo": {"type": "string", "description": "Repository name"},
                "branch": {"type": "string", "description": "Branch name or commit SHA"},
                "limit": {"type": "integer", "description": "Number of commits to return", "default": 10},
            },
            "required": ["owner", "repo"],
        },
        "handler": tool_list_commits,
    },
    {
        "name": "github_get_user",
        "description": "Get GitHub user profile details (repos count, bio, followers).",
        "inputSchema": {
            "type": "object",
            "properties": {
                "username": {"type": "string", "description": "GitHub username (leave empty for authenticated user)"},
            },
        },
        "handler": tool_get_user,
    },
    {
        "name": "github_list_branches",
        "description": "List all branches in a repository.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner": {"type": "string", "description": "Repository owner (optional, auto-resolved from authenticated user if omitted)"},
                "repo": {"type": "string", "description": "Repository name"},
            },
            "required": ["repo"],
        },
        "handler": tool_list_branches,
    },
    {
        "name": "github_create_branch",
        "description": "Create a new Git branch in a repository from an existing base branch.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner": {"type": "string", "description": "Repository owner (optional, auto-resolved from authenticated user if omitted)"},
                "repo": {"type": "string", "description": "Repository name"},
                "branch": {"type": "string", "description": "Name for the new branch"},
                "from_branch": {"type": "string", "description": "Base branch to branch off of (default 'main')", "default": "main"},
            },
            "required": ["repo", "branch"],
        },
        "handler": tool_create_branch,
    },
    {
        "name": "github_delete_branch",
        "description": "Delete a Git branch in a repository. Use this whenever asked to delete or remove a branch.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "owner": {"type": "string", "description": "Repository owner (optional, auto-resolved from authenticated user if omitted)"},
                "repo": {"type": "string", "description": "Repository name"},
                "branch": {"type": "string", "description": "Name of the branch to delete"},
            },
            "required": ["repo", "branch"],
        },
        "handler": tool_delete_branch,
    },
    {
        "name": "github_search_code",
        "description": "Search code across GitHub repositories with query terms.",
        "inputSchema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Code search query (e.g. 'FastAPI auth filename:auth.py')"},
                "owner": {"type": "string", "description": "Optional repository owner filter"},
                "repo": {"type": "string", "description": "Optional repository name filter"},
                "limit": {"type": "integer", "description": "Number of results", "default": 10},
            },
            "required": ["query"],
        },
        "handler": tool_search_code,
    },
]

# Register all extended tools into the tools registry
for _name, _desc, _handler, _props, _required in EXTENDED_TOOLS:
    TOOLS_REGISTRY.append({
        "name": _name,
        "description": _desc,
        "inputSchema": {"type": "object", "properties": _props, "required": _required},
        "handler": _handler,
    })


# ── MCP Server Protocol Core ──────────────────────────────────────────────────
class GitHubMcpServer:
    def __init__(self, token: Optional[str] = None):
        self.client = GitHubClient(token=token)

    async def handle_request(self, msg: dict) -> Optional[dict]:
        method = msg.get("method")
        msg_id = msg.get("id")
        params = msg.get("params", {})

        if method == "initialize":
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {
                    "protocolVersion": PROTOCOL_VERSION,
                    "capabilities": {
                        "tools": {"listChanged": False},
                        "resources": {"subscribe": False, "listChanged": False},
                    },
                    "serverInfo": {
                        "name": SERVER_NAME,
                        "version": SERVER_VERSION,
                    },
                },
            }

        elif method == "notifications/initialized":
            return None

        elif method == "ping":
            return {"jsonrpc": "2.0", "id": msg_id, "result": {}}

        elif method == "tools/list":
            tools_list = [
                {
                    "name": t["name"],
                    "description": t["description"],
                    "inputSchema": t["inputSchema"],
                }
                for t in TOOLS_REGISTRY
            ]
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "result": {"tools": tools_list},
            }

        elif method == "tools/call":
            tool_name = params.get("name")
            arguments = params.get("arguments", {})

            matched = next((t for t in TOOLS_REGISTRY if t["name"] == tool_name), None)
            if not matched:
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "error": {
                        "code": -32601,
                        "message": f"Tool '{tool_name}' not found",
                    },
                }

            try:
                arguments = await _sanitize_tool_arguments(self.client, arguments)
                result_text = await matched["handler"](self.client, arguments)
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "content": [
                            {"type": "text", "text": result_text}
                        ]
                    },
                }
            except Exception as exc:
                return {
                    "jsonrpc": "2.0",
                    "id": msg_id,
                    "result": {
                        "isError": True,
                        "content": [
                            {"type": "text", "text": f"Error executing tool '{tool_name}': {exc}"}
                        ]
                    },
                }

        else:
            return {
                "jsonrpc": "2.0",
                "id": msg_id,
                "error": {
                    "code": -32601,
                    "message": f"Method '{method}' not recognized",
                },
            }


# ── Transports ────────────────────────────────────────────────────────────────
async def run_stdio(token: Optional[str] = None):
    """Run MCP server over standard input / output (stdio transport)."""
    server = GitHubMcpServer(token=token)
    loop = asyncio.get_running_loop()
    reader = asyncio.StreamReader()
    protocol = asyncio.StreamReaderProtocol(reader)
    await loop.connect_read_pipe(lambda: protocol, sys.stdin)

    while True:
        line = await reader.readline()
        if not line:
            break
        raw = line.decode("utf-8").strip()
        if not raw:
            continue

        try:
            req = json.loads(raw)
            resp = await server.handle_request(req)
            if resp is not None:
                sys.stdout.write(json.dumps(resp) + "\n")
                sys.stdout.flush()
        except json.JSONDecodeError:
            err = {"jsonrpc": "2.0", "id": None, "error": {"code": -32700, "message": "Parse error"}}
            sys.stdout.write(json.dumps(err) + "\n")
            sys.stdout.flush()


def run_http(host: str = "0.0.0.0", port: int = 8001, token: Optional[str] = None):
    """Run lightweight HTTP MCP server."""
    from http.server import HTTPServer, BaseHTTPRequestHandler

    server_instance = GitHubMcpServer(token=token)

    class McpHttpHandler(BaseHTTPRequestHandler):
        def do_POST(self):
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)

            auth = self.headers.get("Authorization", "")
            if auth.startswith("Bearer "):
                server_instance.client.token = auth[7:].strip()

            try:
                req = json.loads(body.decode("utf-8"))
                resp = asyncio.run(server_instance.handle_request(req))
                if resp is None:
                    resp = {}

                resp_bytes = json.dumps(resp).encode("utf-8")
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(resp_bytes)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(resp_bytes)
            except Exception as e:
                err_bytes = json.dumps({"jsonrpc": "2.0", "id": None, "error": {"code": -32603, "message": str(e)}}).encode("utf-8")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(err_bytes)

        def do_OPTIONS(self):
            self.send_response(204)
            self.send_header("Access-Control-Allow-Origin", "*")
            self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
            self.end_headers()

    httpd = HTTPServer((host, port), McpHttpHandler)
    print(f"[{SERVER_NAME}] HTTP MCP Server listening on http://{host}:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping HTTP MCP Server.")


# ── Entrypoint ────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="GitHub Model Context Protocol (MCP) Server")
    parser.add_argument("--http", action="store_true", help="Run as HTTP JSON-RPC server")
    parser.add_argument("--host", type=str, default="0.0.0.0", help="HTTP host to bind")
    parser.add_argument("--port", type=int, default=8001, help="HTTP port to bind")
    parser.add_argument("--token", type=str, default=None, help="GitHub Personal Access Token (PAT)")
    parser.add_argument("--test", type=str, default=None, help="Test a specific tool name directly")
    args, unknown = parser.parse_known_args()

    if args.test:
        cli_args = {}
        for item in unknown:
            if "=" in item:
                k, v = item.split("=", 1)
                cli_args[k.strip("-")] = v

        server = GitHubMcpServer(token=args.token)
        req = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "tools/call",
            "params": {"name": f"github_{args.test.replace('github_', '')}", "arguments": cli_args},
        }
        resp = asyncio.run(server.handle_request(req))
        print(json.dumps(resp, indent=2))
        return

    if args.http:
        run_http(host=args.host, port=args.port, token=args.token)
    else:
        asyncio.run(run_stdio(token=args.token))


if __name__ == "__main__":
    main()
