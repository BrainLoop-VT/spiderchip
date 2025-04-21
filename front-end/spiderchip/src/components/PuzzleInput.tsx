import { useEffect, useRef } from "react";
import "./PuzzleInput.css";
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { LineHighlight } from "../types";

interface CodeEditorProps {
    initialValue: string;
    onChange(value: string): void;
    lineHighlights?: LineHighlight[];
}

const PuzzleInput: React.FC<CodeEditorProps> = ({ initialValue, onChange, lineHighlights }) => {
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const decorationsRef = useRef<monaco.editor.IEditorDecorationsCollection | undefined>(undefined);

    const onEditorDidMount: OnMount = (editor, _) => {
        editorRef.current = editor;
        editor.onDidChangeModelContent(() => {
            onChange(editor.getValue());
        });

        editor.getModel()?.updateOptions({ tabSize: 2 });
    }

    useEffect(() => {
        // clear previous decoration and set new one
        decorationsRef.current?.clear();
        if (lineHighlights) {
            decorationsRef.current = editorRef.current?.createDecorationsCollection(lineHighlights.map((x) => {
                return {
                    range: new monaco.Range(x.line, 1, x.line, 1),
                    options: {
                        isWholeLine: true,
                        className: `line-highlight-${x.type}`
                    }
                }
            }
            ));
        }
    }, [lineHighlights]);

    return (
        <div className="input-editor-container">
            <div className="editor-wrapper">
                <MonacoEditor
                    onMount={onEditorDidMount}
                    value={initialValue}
                    theme="vs-light"
                    // language="javascript"
                    height="100%"
                    options={{
                        wordWrap: 'on',
                        minimap: { enabled: false },
                        showUnused: false,
                        folding: false,
                        lineNumbersMinChars: 3,
                        fontSize: 16,
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                    }}
                />
            </div>
        </div>
    )
}

export default PuzzleInput;
