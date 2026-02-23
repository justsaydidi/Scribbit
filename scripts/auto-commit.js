#!/usr/bin/env node
/**
 * Auto-commit watcher for Scribbit
 * Runs every 30 minutes, commits changes, pushes, and updates DECISIONS.md
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
const DECISIONS_FILE = path.join(__dirname, '..', 'DECISIONS.md');

function run(cmd) {
    try {
        return execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch (err) {
        return null;
    }
}

function hasChanges() {
    const status = run('git status --porcelain');
    return status && status.length > 0;
}

function getChangedFiles() {
    const status = run('git status --porcelain');
    if (!status) return [];
    
    return status.split('\n').map(line => {
        const status = line.substring(0, 2).trim();
        const file = line.substring(3);
        return { status, file };
    });
}

function generateCommitMessage(changes) {
    const categories = {
        docs: [],
        src: [],
        styles: [],
        other: []
    };
    
    changes.forEach(({ status, file }) => {
        if (file.startsWith('docs/') || file.endsWith('.md')) {
            categories.docs.push(file);
        } else if (file.startsWith('src/')) {
            categories.src.push(file);
        } else if (file.includes('.css') || file.includes('.scss')) {
            categories.styles.push(file);
        } else {
            categories.other.push(file);
        }
    });
    
    const parts = [];
    
    if (categories.src.length > 0) {
        parts.push(`app changes in ${categories.src.length} file${categories.src.length > 1 ? 's' : ''}`);
    }
    if (categories.docs.length > 0) {
        parts.push(`docs (${categories.docs.length})`);
    }
    if (categories.styles.length > 0) {
        parts.push(`styles (${categories.styles.length})`);
    }
    if (categories.other.length > 0) {
        parts.push(`config (${categories.other.length})`);
    }
    
    if (parts.length === 0) {
        return 'chore: auto-commit changes';
    }
    
    return `auto: ${parts.join(', ')}`;
}

function formatDate() {
    return new Date().toISOString().split('T')[0];
}

function formatTime() {
    return new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function updateDecisions(commitHash, commitMessage, changes) {
    let content = '';
    try {
        content = fs.readFileSync(DECISIONS_FILE, 'utf8');
    } catch (err) {
        content = '# Decision Log\n\nThis file tracks key product and engineering decisions with brief context.\nAdd new entries at the top.\n';
    }
    
    const lines = content.split('\n');
    const headerEndIndex = lines.findIndex((line, i) => i > 0 && line.startsWith('## '));
    const insertIndex = headerEndIndex === -1 ? lines.length : headerEndIndex;
    
    const fileList = changes.slice(0, 5).map(c => c.file).join(', ') + (changes.length > 5 ? ` +${changes.length - 5} more` : '');
    
    const entry = `## ${formatDate()} ${formatTime()} - Auto-commit
- Decision: ${commitMessage}
- Context: Automated commit during development session.
- Files: ${fileList}
- Commit: ${commitHash}

`;
    
    lines.splice(insertIndex, 0, entry);
    fs.writeFileSync(DECISIONS_FILE, lines.join('\n'));
}

function commit() {
    if (!hasChanges()) {
        console.log(`[${new Date().toLocaleTimeString()}] No changes to commit`);
        return false;
    }
    
    const changes = getChangedFiles();
    const message = generateCommitMessage(changes);
    
    console.log(`[${new Date().toLocaleTimeString()}] Committing ${changes.length} file${changes.length > 1 ? 's' : ''}...`);
    
    run('git add -A');
    run(`git commit -m "${message}"`);
    
    const hash = run('git rev-parse --short HEAD');
    
    updateDecisions(hash, message, changes);
    
    run('git add DECISIONS.md');
    run(`git commit -m "docs: update DECISIONS.md with auto-commit log"`);
    
    console.log(`[${new Date().toLocaleTimeString()}] Pushing to remote...`);
    run('git push');
    
    console.log(`[${new Date().toLocaleTimeString()}] Done. Commit: ${hash}`);
    return true;
}

console.log('='.repeat(50));
console.log('Scribbit Auto-Commit Watcher');
console.log('='.repeat(50));
console.log(`Interval: every 30 minutes`);
console.log(`Started at: ${new Date().toLocaleString()}`);
console.log('Press Ctrl+C to stop');
console.log('='.repeat(50));
console.log('');

commit();

setInterval(commit, INTERVAL_MS);
