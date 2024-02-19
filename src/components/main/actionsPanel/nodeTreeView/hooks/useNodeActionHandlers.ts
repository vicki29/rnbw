import { useCallback, useContext } from "react";

import { useDispatch } from "react-redux";

import { LogAllow } from "@_constants/global";
import { TNode, TNodeUid } from "@_node/types";
import { MainContext } from "@_redux/main";
import { useAppState } from "@_redux/useAppState";
import { NodeActions } from "@_node/apis";
import { elementsCmdk } from "@_pages/main/helper";
import { TCmdkGroupData } from "@_types/main";

export const useNodeActionHandlers = () => {
  const dispatch = useDispatch();
  const {
    nodeTree,
    validNodeTree,
    nFocusedItem: focusedItem,
    nSelectedItems: selectedItems,
    formatCode,
    cmdkSearchContent,
  } = useAppState();
  const {
    htmlReferenceData,
    monacoEditorRef,
    setIsContentProgrammaticallyChanged,
  } = useContext(MainContext);

  const onAddNode = useCallback(
    (actionName: string) => {
      if (selectedItems.length === 0) return;
      const selectedNodes = selectedItems.map((uid) => nodeTree[uid]);
      if (
        selectedNodes.some(
          (node: TNode) => !node || !node.data || !node.data.sourceCodeLocation,
        )
      ) {
        LogAllow &&
          console.error("Selected nodes or source code location is undefined");
        return;
      }

      const codeViewInstance = monacoEditorRef.current;
      const codeViewInstanceModel = codeViewInstance?.getModel();
      if (!codeViewInstance || !codeViewInstanceModel) {
        LogAllow &&
          console.error(
            `Monaco Editor ${!codeViewInstance ? "" : "Model"} is undefined`,
          );
        return;
      }

      let selectedUids = [...selectedItems];
      const nodeToAdd = actionName.split("-").slice(1).join("-");
      const data: TCmdkGroupData = {
        Files: [],
        Elements: [],
        Recent: [],
      };

      const checkAddingAllowed = (uid: string) => {
        elementsCmdk({
          nodeTree,
          nFocusedItem: uid,
          htmlReferenceData,
          data,
          cmdkSearchContent,
          groupName: "Add",
        });
        return Object.values(data["Elements"]).some(
          (obj) => obj["Context"] === nodeToAdd,
        );
      };

      const allowedArray = selectedNodes.map(
        (selectedNode: TNode, i: number) => {
          let addingAllowed = checkAddingAllowed(selectedNode.uid);
          if (!addingAllowed && selectedNode.parentUid) {
            selectedUids[i] = selectedNode.parentUid;
            addingAllowed = checkAddingAllowed(selectedNode.parentUid);
          }
          return addingAllowed;
        },
      );
      if (allowedArray.includes(false)) return;

      setIsContentProgrammaticallyChanged(true);
      NodeActions.add({
        dispatch,
        actionName,
        referenceData: htmlReferenceData,
        nodeTree,
        codeViewInstanceModel,
        selectedItems: selectedUids,
        formatCode,
        fb: () => setIsContentProgrammaticallyChanged(false),
      });
    },
    [nodeTree, focusedItem, htmlReferenceData, cmdkSearchContent],
  );
  const onCut = useCallback(async () => {
    if (selectedItems.length === 0) return;

    const codeViewInstance = monacoEditorRef.current;
    const codeViewInstanceModel = codeViewInstance?.getModel();
    if (!codeViewInstance || !codeViewInstanceModel) {
      LogAllow &&
        console.error(
          `Monaco Editor ${!codeViewInstance ? "" : "Model"} is undefined`,
        );
      return;
    }

    setIsContentProgrammaticallyChanged(true);
    await NodeActions.cut({
      dispatch,
      nodeTree,
      selectedUids: selectedItems,
      codeViewInstanceModel,
      formatCode,
      fb: () => setIsContentProgrammaticallyChanged(false),
    });
  }, [selectedItems, nodeTree]);
  const onCopy = useCallback(async () => {
    if (selectedItems.length === 0) return;

    const codeViewInstance = monacoEditorRef.current;
    const codeViewInstanceModel = codeViewInstance?.getModel();
    if (!codeViewInstance || !codeViewInstanceModel) {
      LogAllow &&
        console.error(
          `Monaco Editor ${!codeViewInstance ? "" : "Model"} is undefined`,
        );
      return;
    }

    setIsContentProgrammaticallyChanged(true);
    await NodeActions.copy({
      dispatch,
      nodeTree,
      selectedUids: selectedItems,
      codeViewInstanceModel,
      cb: () => setIsContentProgrammaticallyChanged(false),
    });
  }, [selectedItems, nodeTree]);

  const onPaste = useCallback(
    async (
      { spanPaste }: { spanPaste?: boolean } = {
        spanPaste: false,
      },
    ) => {
      const focusedNode = validNodeTree[focusedItem];
      if (!focusedNode || !focusedNode.data.sourceCodeLocation) {
        LogAllow &&
          console.error("Focused node or source code location is undefined");
        return;
      }

      const codeViewInstance = monacoEditorRef.current;
      const codeViewInstanceModel = codeViewInstance?.getModel();
      if (!codeViewInstance || !codeViewInstanceModel) {
        LogAllow &&
          console.error(
            `Monaco Editor ${!codeViewInstance ? "" : "Model"} is undefined`,
          );
        return;
      }

      setIsContentProgrammaticallyChanged(true);
      await NodeActions.paste({
        dispatch,
        nodeTree: validNodeTree,
        targetUid: focusedItem,
        codeViewInstanceModel,
        spanPaste,
        formatCode,
        fb: () => setIsContentProgrammaticallyChanged(false),
      });
    },
    [validNodeTree, focusedItem],
  );

  const onDelete = useCallback(() => {
    if (selectedItems.length === 0) return;

    const codeViewInstance = monacoEditorRef.current;
    const codeViewInstanceModel = codeViewInstance?.getModel();
    if (!codeViewInstance || !codeViewInstanceModel) {
      LogAllow &&
        console.error(
          `Monaco Editor ${!codeViewInstance ? "" : "Model"} is undefined`,
        );
      return;
    }

    setIsContentProgrammaticallyChanged(true);
    NodeActions.remove({
      dispatch,
      nodeTree,
      selectedUids: selectedItems,
      codeViewInstanceModel,
      formatCode,
      fb: () => setIsContentProgrammaticallyChanged(false),
    });
  }, [selectedItems, nodeTree]);
  const onDuplicate = useCallback(() => {
    if (selectedItems.length === 0) return;

    const codeViewInstance = monacoEditorRef.current;
    const codeViewInstanceModel = codeViewInstance?.getModel();
    if (!codeViewInstance || !codeViewInstanceModel) {
      LogAllow &&
        console.error(
          `Monaco Editor ${!codeViewInstance ? "" : "Model"} is undefined`,
        );
      return;
    }

    setIsContentProgrammaticallyChanged(true);
    NodeActions.duplicate({
      dispatch,
      nodeTree,
      selectedUids: selectedItems,
      codeViewInstanceModel,
      formatCode,
      fb: () => setIsContentProgrammaticallyChanged(false),
    });
  }, [selectedItems, nodeTree]);
  const onMove = useCallback(
    ({
      selectedUids,
      targetUid,
      isBetween = false,
      position = 0,
    }: {
      selectedUids: TNodeUid[];
      targetUid: TNodeUid;
      isBetween: boolean;
      position: number;
    }) => {
      const codeViewInstance = monacoEditorRef.current;
      const codeViewInstanceModel = codeViewInstance?.getModel();
      if (!codeViewInstance || !codeViewInstanceModel) {
        LogAllow &&
          console.error(
            `Monaco Editor ${!codeViewInstance ? "" : "Model"} is undefined`,
          );
        return;
      }

      setIsContentProgrammaticallyChanged(true);
      NodeActions.move({
        dispatch,
        nodeTree,
        selectedUids,
        targetUid,
        isBetween,
        position,
        codeViewInstanceModel,
        formatCode,
        fb: () => setIsContentProgrammaticallyChanged(false),
      });
    },
    [nodeTree],
  );
  const onTurnInto = useCallback(
    (actionName: string) => {
      const focusedNode = nodeTree[focusedItem];
      if (!focusedNode) return;

      const codeViewInstance = monacoEditorRef.current;
      const codeViewInstanceModel = codeViewInstance?.getModel();
      if (!codeViewInstance || !codeViewInstanceModel) {
        LogAllow &&
          console.error(
            `Monaco Editor ${!codeViewInstance ? "" : "Model"} is undefined`,
          );
        return;
      }

      setIsContentProgrammaticallyChanged(true);
      NodeActions.rename({
        dispatch,
        actionName,
        referenceData: htmlReferenceData,
        nodeTree,
        targetUid: focusedItem,
        codeViewInstanceModel,
        formatCode,
        fb: () => setIsContentProgrammaticallyChanged(false),
      });
    },
    [nodeTree, focusedItem],
  );
  const onGroup = useCallback(() => {
    if (selectedItems.length === 0) return;

    const codeViewInstance = monacoEditorRef.current;
    const codeViewInstanceModel = codeViewInstance?.getModel();
    if (!codeViewInstance || !codeViewInstanceModel) {
      LogAllow &&
        console.error(
          `Monaco Editor ${!codeViewInstance ? "" : "Model"} is undefined`,
        );
      return;
    }

    setIsContentProgrammaticallyChanged(true);
    NodeActions.group({
      dispatch,
      nodeTree: validNodeTree,
      selectedUids: selectedItems,
      codeViewInstanceModel,
      formatCode,
      fb: () => setIsContentProgrammaticallyChanged(false),
    });
  }, [selectedItems, validNodeTree]);
  const onUngroup = useCallback(() => {
    if (selectedItems.length === 0) return;

    const codeViewInstance = monacoEditorRef.current;
    const codeViewInstanceModel = codeViewInstance?.getModel();
    if (!codeViewInstance || !codeViewInstanceModel) {
      LogAllow &&
        console.error(
          `Monaco Editor ${!codeViewInstance ? "" : "Model"} is undefined`,
        );
      return;
    }

    setIsContentProgrammaticallyChanged(true);
    NodeActions.ungroup({
      dispatch,
      nodeTree: validNodeTree,
      selectedUids: selectedItems,
      codeViewInstanceModel,
      formatCode,
      fb: () => setIsContentProgrammaticallyChanged(false),
    });
  }, [selectedItems, validNodeTree]);

  return {
    onAddNode,
    onCut,
    onCopy,
    onPaste,
    onDelete,
    onDuplicate,
    onMove,
    onTurnInto,
    onGroup,
    onUngroup,
  };
};
