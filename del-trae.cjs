const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const REPO = 'DG2102005/redcenter';

function ghApi(endpoint, method = 'GET', body = null) {
  let cmd = `gh api repos/${REPO}${endpoint}`;
  if (method !== 'GET') cmd += ` -X ${method}`;
  if (body) {
    const tmpFile = path.join(process.env.TEMP, 'ghb-' + Date.now() + '.json');
    fs.writeFileSync(tmpFile, JSON.stringify(body));
    cmd += ` --input "${tmpFile}"`;
  }
  const out = execSync(cmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  return JSON.parse(out);
}

const head = ghApi('/git/ref/heads/main').object.sha;
console.log('HEAD:', head);
const commit = ghApi(`/git/commits/${head}`);
const baseTree = commit.tree.sha;
console.log('base tree:', baseTree);

// 删除 .trae 目录
const newTree = ghApi('/git/trees', 'POST', {
  base_tree: baseTree,
  tree: [{ path: '.trae', mode: '040000', type: 'tree', sha: null }],
});
console.log('new tree:', newTree.sha);

const newCommit = ghApi('/git/commits', 'POST', {
  message: 'chore: remove .trae directory',
  tree: newTree.sha,
  parents: [head],
});
console.log('new commit:', newCommit.sha);

const ref = ghApi('/git/refs/heads/main', 'PATCH', { sha: newCommit.sha, force: true });
console.log('updated main ->', ref.object.sha);
console.log('DONE');
