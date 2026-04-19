import { apiUrl } from './apiUrl';

export async function fetchAllRepos() {
  let repoList;
  try {
    const repoRes = await fetch(apiUrl('/api/git-repos'));
    if (!repoRes.ok) throw new Error('No git-repos endpoint');
    const data = await repoRes.json();
    repoList = data.repos || [];
  } catch {
    // 回退：旧服务器没有 /api/git-repos，用 /api/git-status 兼容单仓库
    try {
      const statusRes = await fetch(apiUrl('/api/git-status'));
      if (!statusRes.ok) return [];
      const data = await statusRes.json();
      return [{ name: '.', path: '.', isRoot: true, changes: data.changes || [], insertions: data.insertions || 0, deletions: data.deletions || 0 }];
    } catch {
      return [];
    }
  }
  const results = await Promise.all(
    repoList.map(async (repo) => {
      try {
        const statusRes = await fetch(apiUrl(`/api/git-status?repo=${encodeURIComponent(repo.path)}`));
        if (!statusRes.ok) return { ...repo, changes: [] };
        const data = await statusRes.json();
        return { ...repo, changes: data.changes || [], insertions: data.insertions || 0, deletions: data.deletions || 0 };
      } catch {
        return { ...repo, changes: [], insertions: 0, deletions: 0 };
      }
    })
  );
  return results;
}
