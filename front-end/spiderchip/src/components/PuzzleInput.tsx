import InputIcon from "../assets/images/input-icon.png";
import { useEffect, useRef } from "react";
import "./PuzzleInput.css";
import MonacoEditor, { OnMount } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';

interface CodeEditorProps {
    initialValue: string;
    onChange(value: string): void;
    executedLine?: number;
}

const PuzzleInput: React.FC<CodeEditorProps> = ({ initialValue, onChange, executedLine }) => {
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const decorationRef = useRef<string[]>([]);

    const onEditorDidMount: OnMount = (editor, _) => {
        editorRef.current = editor;
        editor.onDidChangeModelContent(() => {
            onChange(editor.getValue());
        });

        editor.getModel()?.updateOptions({ tabSize: 2 });
    }

    useEffect(() => {
        if (!editorRef.current || typeof executedLine !== "number") return;

        const editor = editorRef.current;
        const model = editor.getModel();
        if (!model) return;

        // Clear previous decoration and set new one
        decorationRef.current = editor.deltaDecorations(
            decorationRef.current,
            [
                {
                    range: new monaco.Range(executedLine, 1, executedLine, 1),
                    options: {
                        isWholeLine: true,
                        className: "executed-line-highlight"
                    }
                }
            ]
        );
    }, [executedLine]);

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