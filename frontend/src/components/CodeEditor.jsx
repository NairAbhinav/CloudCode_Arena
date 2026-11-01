import React from 'react';
import Editor from '@monaco-editor/react';
import { Play, Send, RotateCcw, Loader2 } from 'lucide-react';

export const LANGUAGE_META = {
  python: { label: 'Python 3', monacoLang: 'python', ext: '.py', file: 'solution.py' },
  c: { label: 'C (GCC)', monacoLang: 'c', ext: '.c', file: 'solution.c' },
  cpp: { label: 'C++ (G++ 17)', monacoLang: 'cpp', ext: '.cpp', file: 'solution.cpp' },
  java: { label: 'Java 17', monacoLang: 'java', ext: '.java', file: 'Solution.java' },
  javascript: { label: 'JavaScript (Node)', monacoLang: 'javascript', ext: '.js', file: 'solution.js' }
};

export default function CodeEditor({
  code,
  onChange,
  onReset,
  onRun,
  onSubmit,
  language = 'python',
  onLanguageChange,
  supportedLanguages = ['python', 'c', 'cpp', 'java', 'javascript'],
  isRunning = false,
  isSubmitting = false,
  readOnly = false
}) {
  const handleEditorMount = (editor, monaco) => {
    // Monaco editor options ensure standard copy, cut, paste and context menu are enabled
    editor.updateOptions({
      contextmenu: true,
      copyWithSyntaxHighlighting: true
    });
  };

  const activeLangMeta = LANGUAGE_META[language] || LANGUAGE_META.python;

  return (
    <div className="flex flex-col h-full bg-[#111827] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
      {/* Editor Header / Action Toolbar */}
      <div className="bg-[#161f30] px-4 py-2.5 border-b border-gray-800 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-2">
          <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
          <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>

          {/* Language Selector Dropdown */}
          <div className="flex items-center ml-2 bg-[#0e1626] border border-gray-700/80 rounded-lg px-2.5 py-1">
            <label htmlFor="code-lang-select" className="text-[10px] text-gray-400 mr-2 uppercase font-bold tracking-wider">
              Language:
            </label>
            <select
              id="code-lang-select"
              value={language}
              onChange={(e) => onLanguageChange && onLanguageChange(e.target.value)}
              disabled={isRunning || isSubmitting || readOnly}
              className="bg-transparent text-xs font-semibold text-indigo-400 focus:outline-none cursor-pointer"
            >
              {supportedLanguages.map((langKey) => (
                <option key={langKey} value={langKey} className="bg-gray-900 text-gray-200">
                  {LANGUAGE_META[langKey]?.label || langKey}
                </option>
              ))}
            </select>
          </div>

          <span className="text-[11px] font-mono text-gray-400 ml-1 hidden sm:inline-block">
            {activeLangMeta.file}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-2">
          {onReset && (
            <button
              onClick={onReset}
              disabled={isRunning || isSubmitting || readOnly}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-gray-400 hover:text-white hover:bg-gray-700/50 transition-colors disabled:opacity-50"
              title="Reset starter code"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}

          {onRun && (
            <button
              onClick={onRun}
              disabled={isRunning || isSubmitting || readOnly}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-gray-800 hover:bg-gray-700 text-indigo-400 border border-indigo-500/30 hover:border-indigo-400 shadow-sm transition-all disabled:opacity-50"
            >
              {isRunning ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-indigo-400" />
                  <span>Run Code</span>
                </>
              )}
            </button>
          )}

          {onSubmit && (
            <button
              onClick={onSubmit}
              disabled={isRunning || isSubmitting || readOnly}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white shadow-md shadow-indigo-600/30 transition-all disabled:opacity-50 hover:scale-[1.02]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Submit</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Monaco Editor Canvas */}
      <div className="flex-1 w-full min-h-[350px]">
        <Editor
          height="100%"
          defaultLanguage={activeLangMeta.monacoLang}
          language={activeLangMeta.monacoLang}
          value={code}
          onChange={(val) => onChange && onChange(val || '')}
          onMount={handleEditorMount}
          theme="vs-dark"
          options={{
            readOnly,
            fontSize: 14,
            fontFamily: "'Fira Code', 'Courier New', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 4,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            lineNumbers: 'on',
            lineDecorationsWidth: 10,
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            smoothScrolling: true,
            padding: { top: 12, bottom: 12 }
          }}
        />
      </div>
    </div>
  );
}
