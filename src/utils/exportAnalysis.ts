export function exportAnalysis(
  analysis: any,
  format: 'json' | 'markdown'
) {
  if (!analysis) return;

  let content = '';
  let mime = '';
  let filename = '';

  if (format === 'json') {
    content = JSON.stringify(analysis, null, 2);
    mime = 'application/json';
    filename = 'codesensei-analysis.json';
  }

  if (format === 'markdown') {
    content = `# CodeSensei Analysis

## Summary
${analysis.summary || ''}

## Structure
\`\`\`json
${JSON.stringify(analysis.structure || analysis.structureSummary || {}, null, 2)}
\`\`\`

## Risks
\`\`\`json
${JSON.stringify(analysis.risks || [], null, 2)}
\`\`\`

## Execution Flow
\`\`\`json
${JSON.stringify(analysis.execution || analysis.executionFlow || [], null, 2)}
\`\`\`
`;
    mime = 'text/markdown';
    filename = 'codesensei-analysis.md';
  }

  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    URL.revokeObjectURL(url);
  } catch (e) {
    // Do not throw — keep UI stable
    // eslint-disable-next-line no-console
    console.error('Export failed', e);
  }
}
