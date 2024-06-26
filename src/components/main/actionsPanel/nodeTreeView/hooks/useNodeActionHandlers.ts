import { useCallback, useContext, useMemo } from "react";

import { useDispatch } from "react-redux";
import { toast } from "react-toastify";

import { LogAllow } from "@_constants/global";
import { TNode, TNodeUid } from "@_node/types";
import { MainContext } from "@_redux/main";
import { useAppState } from "@_redux/useAppState";
import { NodeActions } from "@_node/apis";
import { RootNodeUid } from "@_constants/main";
import { isPastingAllowed } from "../helpers";
import { setIsContentProgrammaticallyChanged } from "@_redux/main/reference";
import { getObjKeys } from "@_pages/main/helper";

export const useNodeActionHandlers = () => {
  const dispatch = useDispatch();
  const {
    validNodeTree,
    nFocusedItem: focusedItem,
    nSelectedItemsObj,
    formatCode,
    copiedNodeDisplayName,
    htmlReferenceData,
  } = useAppState();
  const { monacoEditorRef } = useContext(MainContext);

  const selectedItems = useMemo(
    () => getObjKeys(nSelectedItemsObj),
    [nSelectedItemsObj],
  );

  const onAddNode = useCallback(
    (actionName: string) => {
      if (selectedItems.length === 0) return;
      const selectedNodes = selectedItems.map((uid) => validNodeTree[uid]);
      const nodeToAdd = actionName.split("-").slice(1).join("-");
      if (
        selectedNodes.some(
          (node: TNode) =>
            !node ||
            !node.data ||
            !node.data.sourceCodeLocation ||
            node.parentUid == RootNodeUid,
        )
      ) {
        toast("Selected nodes or source code location is undefined", {
          type: "error",
        });
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

      const { isAllowed, selectedUids } = isPastingAllowed({
        selectedItems,
        htmlReferenceData,
        nodeToAdd: [nodeToAdd],
        validNodeTree,
      });
      if (!isAllowed) {
        toast("Adding not allowed", {
          type: "error",
        });
        return;
      }

      dispatch(setIsContentProgrammaticallyChanged(true));
      NodeActions.add({
        dispatch,
        actionName,
        referenceData: htmlReferenceData,
        validNodeTree,
        codeViewInstanceModel,
        selectedItems: selectedUids,
        formatCode,
        fb: () => dispatch(setIsContentProgrammaticallyChanged(false)),
      });
    },
    [focusedItem, htmlReferenceData, validNodeTree],
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

    dispatch(setIsContentProgrammaticallyChanged(true));
    await NodeActions.cut({
      dispatch,
      validNodeTree,
      selectedUids: selectedItems,
      codeViewInstanceModel,
      formatCode,
      fb: () => dispatch(setIsContentProgrammaticallyChanged(false)),
    });
  }, [selectedItems, validNodeTree]);
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

    dispatch(setIsContentProgrammaticallyChanged(true));
    await NodeActions.copy({
      dispatch,
      validNodeTree,
      selectedUids: selectedItems,
      codeViewInstanceModel,
      cb: () => dispatch(setIsContentProgrammaticallyChanged(false)),
    });
  }, [selectedItems, validNodeTree]);

  const onPaste = useCallback(
    async (
      { spanPaste }: { spanPaste?: boolean } = {
        spanPaste: false,
      },
    ) => {
      const focusedNode = validNodeTree[focusedItem];
      if (
        !focusedNode ||
        !focusedNode.data.sourceCodeLocation ||
        focusedNode?.parentUid === RootNodeUid
      ) {
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

      const { isAllowed, selectedUids } = isPastingAllowed({
        selectedItems: [focusedItem],
        htmlReferenceData,
        nodeToAdd: copiedNodeDisplayName,
        validNodeTree,
      });
      if (!isAllowed) {
        toast("Pasting not allowed", {
          type: "error",
        });
        return;
      }

      dispatch(setIsContentProgrammaticallyChanged(true));
      await NodeActions.paste({
        dispatch,
        validNodeTree,
        targetUid: selectedUids[0],
        codeViewInstanceModel,
        spanPaste,
        formatCode,
        fb: () => dispatch(setIsContentProgrammaticallyChanged(false)),
      });
    },
    [validNodeTree, focusedItem, copiedNodeDisplayName, htmlReferenceData],
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

    if (
      selectedItems.some((uid) =>
        ["html", "head", "body"].includes(validNodeTree[uid].displayName),
      )
    ) {
      LogAllow && console.error("Deleting nodes not allowed");
      return;
    }

    dispatch(setIsContentProgrammaticallyChanged(true));
    NodeActions.remove({
      dispatch,
      validNodeTree,
      selectedUids: selectedItems,
      codeViewInstanceModel,
      formatCode,
      fb: () => dispatch(setIsContentProgrammaticallyChanged(false)),
    });
  }, [selectedItems, validNodeTree]);
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

    dispatch(setIsContentProgrammaticallyChanged(true));
    NodeActions.duplicate({
      dispatch,
      validNodeTree,
      selectedUids: selectedItems,
      codeViewInstanceModel,
      formatCode,
      fb: () => dispatch(setIsContentProgrammaticallyChanged(false)),
    });
  }, [selectedItems, validNodeTree]);
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

      const nodeToAdd = selectedUids.map(
        (uid) => `Node-<${validNodeTree[uid]?.displayName}>`,
      );

      const {
        isAllowed,
        selectedUids: targetUids,
        skipPosition,
      } = isPastingAllowed({
        selectedItems: [targetUid],
        htmlReferenceData,
        nodeToAdd,
        validNodeTree,
        isMove: true,
      });

      if (!isAllowed) {
        toast("Pasting not allowed", {
          type: "error",
        });
        return;
      }

      dispatch(setIsContentProgrammaticallyChanged(true));
      NodeActions.move({
        dispatch,
        validNodeTree,
        selectedUids,
        targetUid: targetUids[0],
        isBetween: skipPosition ? false : isBetween,
        position: skipPosition ? 0 : position,
        codeViewInstanceModel,
        formatCode,
        fb: () => dispatch(setIsContentProgrammaticallyChanged(false)),
      });
    },
    [validNodeTree],
  );
  const onTurnInto = useCallback(
    (actionName: string) => {
      const focusedNode = validNodeTree[focusedItem];
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

      dispatch(setIsContentProgrammaticallyChanged(true));
      NodeActions.rename({
        dispatch,
        actionName,
        referenceData: htmlReferenceData,
        validNodeTree,
        targetUid: focusedItem,
        codeViewInstanceModel,
        formatCode,
        fb: () => dispatch(setIsContentProgrammaticallyChanged(false)),
      });
    },
    [validNodeTree, focusedItem],
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

    dispatch(setIsContentProgrammaticallyChanged(true));
    NodeActions.group({
      dispatch,
      validNodeTree,
      selectedUids: selectedItems,
      codeViewInstanceModel,
      formatCode,
      fb: () => dispatch(setIsContentProgrammaticallyChanged(false)),
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

    dispatch(setIsContentProgrammaticallyChanged(true));
    NodeActions.ungroup({
      dispatch,
      validNodeTree,
      selectedUids: selectedItems,
      codeViewInstanceModel,
      formatCode,
      fb: () => dispatch(setIsContentProgrammaticallyChanged(false)),
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
