import { useState } from 'react';

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language = 'text' }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // Try to detect if it's JSON and format it
  let displayCode = code;
  let displayLanguage = language;

  if (language === 'text' || language === 'json') {
    try {
      const parsed = JSON.parse(code);
      displayCode = JSON.stringify(parsed, null, 2);
      displayLanguage = 'json';
    } catch {
      // Not JSON, keep original
    }
  }

  return (
    <div className="relative group">
      {/* Header */}
      <div className="bg-app-card rounded-t-lg px-3 py-1.5 flex items-center justify-between border border-b-0 border-app-border">
        <span className="text-[10px] text-text-muted uppercase">
          {displayLanguage}
        </span>
        <button
          onClick={handleCopy}
          className="text-[10px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1"
        >
          {copied ? (
            <>
              <span>✓</span>
              <span>Copied</span>
            </>
          ) : (
            <>
              <span>📋</span>
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code content */}
      <div className="code-block rounded-t-none border border-app-border overflow-x-auto">
        <pre className="text-xs leading-relaxed">
          <code className={`language-${displayLanguage}`}>
            {highlightCode(displayCode, displayLanguage)}
          </code>
        </pre>
      </div>
    </div>
  );
}

/**
 * Simple syntax highlighting (basic implementation)
 * For production, consider using a library like Prism.js or highlight.js
 */
function highlightCode(code: string, language: string): React.ReactNode {
  if (language === 'json') {
    return highlightJSON(code);
  }
  return code;
}

function highlightJSON(code: string): React.ReactNode {
  // Simple JSON highlighting
  const highlighted = code
    .replace(
      /"([^"]+)":/g,
      '<span class="text-accent-purple">"$1"</span>:'
    )
    .replace(
      /: "([^"]+)"/g,
      ': <span class="text-accent-green">"$1"</span>'
    )
    .replace(
      /: (true|false)/g,
      ': <span class="text-accent-blue">$1</span>'
    )
    .replace(
      /: (\d+)/g,
      ': <span class="text-accent-yellow">$1</span>'
    )
    .replace(
      /: (null)/g,
      ': <span class="text-accent-red">$1</span>'
    );

  return <span dangerouslySetInnerHTML={{ __html: highlighted }} />;
}
