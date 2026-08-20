import re

with open('index.css', 'r') as f:
    css = f.read()

# Replace :root tokens with a simple import or just clear the old ones if they conflict.
# But actually, codesensei-tokens.css is loaded. We just need to update index.css global styles and nav styles.
# Let's just rewrite the entire index.css to be a clean file that uses codesensei-tokens.css!

new_css = """
/* ============================================================
   CodeSensei — Warm Slate × Neural Bloom (Landing)
   ============================================================ */

/* Reset & Base */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body, #root {
  height: 100%;
  background: var(--cs-bg);
  color: var(--cs-text-secondary);
  font-family: var(--cs-font-ui);
  font-size: var(--cs-text-md);
  line-height: var(--cs-leading-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

::selection {
  background: var(--cs-accent-subtle);
  color: var(--cs-text-primary);
}

:focus-visible {
  outline: 2px solid var(--cs-accent);
  outline-offset: 3px;
}

/* Landing Page */
.cs-landing {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--cs-bg);
}

.cs-landing-hero {
  position: relative;
  height: calc(100vh - 60px);
  overflow: hidden;
}

.cs-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  height: 60px;
  background: rgba(249, 248, 246, 0.85); /* --cs-bg */
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--cs-border);
}

.cs-nav-inner {
  height: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--cs-space-5);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--cs-space-4);
}

.cs-nav-left {
  display: flex;
  align-items: center;
  gap: var(--cs-space-3);
  cursor: pointer;
  user-select: none;
}

/* Neural Bloom Logo */
.cs-logo {
  width: 32px;
  height: 32px;
  border-radius: var(--cs-radius-full);
  display: grid;
  place-items: center;
  background: var(--cs-accent-subtle);
  border: 1px solid var(--cs-accent-border);
  color: var(--cs-accent);
  font-family: var(--cs-font-ui);
  font-size: var(--cs-text-lg);
  font-weight: var(--cs-weight-bold);
  position: relative;
}

.cs-nav-center {
  display: flex;
  align-items: center;
  gap: var(--cs-space-2);
}

.cs-nav-link {
  padding: var(--cs-space-2) var(--cs-space-4);
  font-size: var(--cs-text-sm);
  color: var(--cs-text-secondary);
  border-radius: var(--cs-radius-sm);
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  font-family: var(--cs-font-ui);
  transition: all var(--cs-duration-fast) var(--cs-ease-default);
}

.cs-nav-link:hover {
  color: var(--cs-text-primary);
  background: var(--cs-surface-2);
}

.cs-nav-link--active {
  color: var(--cs-text-primary);
  background: var(--cs-surface-2);
  border-color: var(--cs-border-mid);
}

.cs-nav-right {
  display: flex;
  align-items: center;
  gap: var(--cs-space-4);
}

.cs-status-pill {
  display: inline-flex;
  align-items: center;
  gap: var(--cs-space-2);
  padding: var(--cs-space-1) var(--cs-space-3);
  border-radius: var(--cs-radius-full);
  font-size: var(--cs-text-xs);
  color: var(--cs-text-muted);
  background: var(--cs-surface-1);
  border: 1px solid var(--cs-border);
  white-space: nowrap;
}

.cs-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: var(--cs-radius-full);
  background: var(--cs-accent);
  animation: cs-pulse 2s ease-in-out infinite;
}

@keyframes cs-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(0.8); }
}

.cs-new-project {
  padding: var(--cs-space-2) var(--cs-space-4);
  border-radius: var(--cs-radius-sm);
  font-size: var(--cs-text-sm);
  font-weight: var(--cs-weight-medium);
  color: #fff;
  background: var(--cs-accent);
  border: none;
  cursor: pointer;
  font-family: var(--cs-font-ui);
  transition: background var(--cs-duration-fast) var(--cs-ease-default);
}

.cs-new-project:hover { background: var(--cs-accent-hover); }

/* App Layout overrides for new theme */
.app-layout {
  background: var(--cs-bg);
}

.main-content {
  padding-top: calc(60px + var(--cs-space-6)) !important;
  max-width: 1400px;
  margin: 0 auto;
}

/* Scrollbar */
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: var(--cs-border-mid); border-radius: var(--cs-radius-full); }
::-webkit-scrollbar-thumb:hover { background: var(--cs-text-muted); }

/* Glass card overrides */
.glass-card, .glass-card-xl {
  background: #ffffff;
  border: var(--cs-border-width) solid var(--cs-border);
  border-radius: var(--cs-radius-xl);
  padding: var(--cs-space-6);
  box-shadow: none; /* explicitly no shadows */
}

/* Overwrite the stats row and other landing elements */
.text-hero {
  font-family: var(--cs-font-ui);
  font-size: 64px;
  font-weight: var(--cs-weight-bold);
  letter-spacing: var(--cs-tracking-tight);
  color: var(--cs-text-primary);
  line-height: var(--cs-leading-tight);
}

.text-body {
  font-family: var(--cs-font-ui);
  font-size: var(--cs-text-lg);
  color: var(--cs-text-secondary);
}

.btn-primary {
  background: var(--cs-accent);
  color: #fff;
  border: none;
}
.btn-primary:hover { background: var(--cs-accent-hover); }

.bento-grid {
  display: grid;
  gap: var(--cs-space-6);
  height: 100%;
  overflow-y: auto;
  padding: var(--cs-space-4);
  grid-template-columns: 1.8fr 1fr 1fr;
  grid-template-rows: auto auto auto;
}
.bento-full { grid-column: 1 / -1; }
.bento-2col { grid-column: span 2; }

/* Keep agent pipeline layout but clean up */
.agent-pipeline {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--cs-space-2);
  padding: var(--cs-space-6) 0;
  width: 100%;
  overflow-x: auto;
}

.agent-node {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--cs-space-3);
  z-index: 2;
}

.agent-hex {
  width: 52px;
  height: 52px;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--cs-radius-full);
}

.agent-name {
  font-family: var(--cs-font-ui);
  font-size: var(--cs-text-xs);
  font-weight: var(--cs-weight-medium);
  color: var(--cs-text-secondary);
  text-transform: uppercase;
  letter-spacing: var(--cs-tracking-label);
}

.agent-connector {
  flex: 1;
  height: 2px;
  min-width: 30px;
  background: var(--cs-border);
  position: relative;
  top: -12px;
}
.agent-connector--complete {
  background: var(--cs-accent);
}

"""

with open('index.css', 'w') as f:
    f.write(new_css)

print("Updated index.css")
