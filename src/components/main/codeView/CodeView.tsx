import React, {
  useContext,
  useMemo,
  useRef,
} from 'react';

import { showSaveFilePicker } from 'file-system-access';
import * as monaco from 'monaco-editor';
import {
  useDispatch,
  useSelector,
} from 'react-redux';

import { MainContext } from '@_pages/main/context';
import {
  globalGetCurrentFileSelector,
  setGlobalPending,
  updateFileContent,
} from '@_redux/global';
import { verifyPermission } from '@_services/global';
import Editor, { loader } from '@monaco-editor/react';

import { CodeViewProps } from './types';

loader.config({ monaco })

export default function CodeView(props: CodeViewProps) {
  const dispatch = useDispatch()
  const { uid, type, content } = useSelector(globalGetCurrentFileSelector)
  const codeContent = useMemo(() => content, [content])

  const { handlers } = useContext(MainContext)

  const monacoRef = useRef(null);
  function handleEditorDidMount(editor: any, monaco: any) {
    // here is another way to get monaco instance
    // you can also store it in `useRef` for further usage
    monacoRef.current = editor;
  }
  const handleSaveFFContent = async () => {
    // try {
    let handler = handlers[uid]
    console.log(handler)
    if (handler === undefined)
      return;
    if (await verifyPermission(handler) === false) {
      handler = await showSaveFilePicker({ suggestedName: handler.name })
    }
    console.log("permissive")
    dispatch(setGlobalPending(true))
    const writableStream = await (handler as FileSystemFileHandle).createWritable()
    await writableStream.write(content)
    await writableStream.close()
    dispatch(updateFileContent(content))

    // } catch (error) {
    //   console.log(error)
    //   dispatch(setGlobalPending(false))
    // }
  }
  return <>
    <div style={{
      height: "100%",
      width: "calc(100% - 400px)",
      position: "relative",
    }}>
      <button
        style={{
          position: "absolute",
          zIndex: "1",
          top: "0px",
          right: "1rem",
          background: "rgb(23 111 44)",
          color: "white",
          border: "none",
          font: "normal lighter normal 12px Arial",
        }}
        onClick={handleSaveFFContent}
      > Save </button>
      <Editor
        height="100%"
        width="100%"
        defaultLanguage=""
        language={'html'}
        defaultValue=""
        value={codeContent}
        theme="vs-dark"
        onMount={handleEditorDidMount}
        options={{
          // enableBasicAutocompletion: true,
          // enableLiveAutocompletion: true,
          // enableSnippets: true,
          // showLineNumbers: true,
          tabSize: 4,
        }}
      />
    </div>
  </>
}