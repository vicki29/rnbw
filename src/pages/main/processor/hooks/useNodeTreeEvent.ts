import { useContext, useEffect } from "react";

import morphdom from "morphdom";
import { useDispatch } from "react-redux";

import { LogAllow } from "@_constants/global";
import { RootNodeUid } from "@_constants/main";
import {
  parseFile,
  PreserveRnbwNode,
  StageNodeIdAttr,
  writeFile,
} from "@_node/file";
import { getSubNodeUidsByBfs } from "@_node/helpers";
import { TNodeTreeData } from "@_node/types";
import { MainContext } from "@_redux/main";
import {
  setDoingFileAction,
  setFileTreeNodes,
  setInitialFileUidToOpen,
  setPrevFileUid,
} from "@_redux/main/fileTree";
import {
  expandNodeTreeNodes,
  focusNodeTreeNode,
  selectNodeTreeNodes,
  setExpandedNodeTreeNodes,
  setNodeTree,
  setSelectedNodeUids,
  setValidNodeTree,
} from "@_redux/main/nodeTree";
import { setIframeSrc, setNeedToReloadIframe } from "@_redux/main/stageView";
import { useAppState } from "@_redux/useAppState";

import {
  getNeedToExpandNodeUids,
  getNodeUidToBeSelectedAtFirst,
  getPreViewPath,
  markChangedFolders,
} from "../helpers";
import { setCurrentCommand } from "@_redux/main/cmdk";

export const useNodeTreeEvent = () => {
  const dispatch = useDispatch();
  const {
    currentCommand,

    fileTree,
    initialFileUidToOpen,
    currentFileUid,
    prevFileUid,

    currentFileContent,
    selectedNodeUids,

    validNodeTree,
    nExpandedItems,

    syncConfigs,
  } = useAppState();
  const { addRunningActions, removeRunningActions } = useContext(MainContext);

  useEffect(() => {
    /* LogAllow &&
      console.log("useNodeTreeEvent - selectedNodeUids", {
        selectedNodeUids,
        currentFileContent,
      }); */

    // focus node
    dispatch(
      focusNodeTreeNode(
        selectedNodeUids.length > 0
          ? selectedNodeUids[selectedNodeUids.length - 1]
          : "",
      ),
    );
    // select nodes
    dispatch(selectNodeTreeNodes(selectedNodeUids));
    // expand nodes
    dispatch(
      expandNodeTreeNodes(
        getNeedToExpandNodeUids(validNodeTree, selectedNodeUids),
      ),
    );
  }, [selectedNodeUids]);

  /* useEffect(() => {
    // validate expanded node uids
    const _expandedItems = nExpandedItems.filter(
      (uid) => validNodeTree[uid] && validNodeTree[uid].isEntity === false,
    );
    dispatch(setExpandedNodeTreeNodes([..._expandedItems]));
  }, [validNodeTree]); */

  useEffect(() => {
    /* LogAllow &&
      console.log("useNodeTreeEvent - currentFileContent", {
        selectedNodeUids,
        currentFileContent,
      }); */

    // validate
    if (!fileTree[currentFileUid]) return;

    addRunningActions(["processor-update"]);

    // parse new file content
    const file = structuredClone(fileTree[currentFileUid]);
    const fileData = file.data;
    const { contentInApp, nodeTree } = parseFile(
      fileData.ext,
      currentFileContent,
    );
    fileData.content = currentFileContent;
    fileData.contentInApp = contentInApp;
    fileData.changed = fileData.content !== fileData.orgContent;

    if (fileData.changed && file.parentUid) {
      markChangedFolders(fileTree, file, dispatch);
    }
    
    // when "Save" while text-editing, we need to call "Save" command after file-content updated.
    // after fileTree has been updated exactly. so when "Save" while text-editing, we first call "SaveForce"
    if (currentCommand?.action === "SaveForce") {
      dispatch(setCurrentCommand({ action: "Save" }));
    }

    // sync file-tree
    dispatch(setFileTreeNodes([file]));
    (async () => {
      // update idb
      dispatch(setDoingFileAction(true));
      try {
        const previewPath = getPreViewPath(fileTree, file, fileData);
        await writeFile(previewPath, fileData.contentInApp as string);
        if (fileData.ext === "html") {
          dispatch(setIframeSrc(`rnbw${previewPath}`));
        }
      } catch (err) {}
      dispatch(setDoingFileAction(false));
    })();

    // ---
    // code-view is already synced
    // ---

    // sync node-tree
    (() => {
      dispatch(setNodeTree(nodeTree));

      // build valid-node-tree
      const _nodeTree = structuredClone(nodeTree);
      const _validNodeTree: TNodeTreeData = {};
      const uids = getSubNodeUidsByBfs(RootNodeUid, _nodeTree);
      uids.reverse();
      uids.map((uid) => {
        const node = _nodeTree[uid];
        if (!node.data.valid) return;

        node.children = node.children.filter(
          (c_uid) => _nodeTree[c_uid].data.valid,
        );
        node.isEntity = node.children.length === 0;
        _validNodeTree[uid] = node;
      });
      dispatch(setValidNodeTree(_validNodeTree));

      // select initial-node
      if (initialFileUidToOpen !== "" && fileTree[initialFileUidToOpen]) {
        // it's a new project
        LogAllow && console.log("it's a new project");
        dispatch(setInitialFileUidToOpen(""));
        const uid = getNodeUidToBeSelectedAtFirst(_validNodeTree);
        dispatch(setSelectedNodeUids([uid]));
      } else if (prevFileUid !== currentFileUid) {
        // it's a new file
        LogAllow && console.log("it's a new file");
        const uid = getNodeUidToBeSelectedAtFirst(_validNodeTree);
        dispatch(setSelectedNodeUids([uid]));
      }
    })();

    // sync stage-view
    if (prevFileUid !== currentFileUid) {
      // reload if it's a new file.
      LogAllow && console.log("need to refresh iframe");
      dispatch(setNeedToReloadIframe(true));
    } else {
      // dom-diff using morph
      if (fileData.ext === "html") {
        const iframe: any = document.getElementById("iframeId");
        if (iframe) {
          const iframeDoc = iframe.contentDocument;
          const iframeHtml = iframeDoc.getElementsByTagName("html")[0];
          const updatedHtml = contentInApp;
          if (!iframeHtml || !updatedHtml) return;

          let nodeUidToFocus = "";
          morphdom(iframeHtml, updatedHtml, {
            onBeforeElUpdated: function (fromEl, toEl) {
              //check if the node is script or style
              if (
                fromEl.nodeName === "SCRIPT" ||
                fromEl.nodeName === "LINK" ||
                fromEl.nodeName === "STYLE"
              ) {
                if (fromEl.outerHTML === toEl.outerHTML) {
                  return false;
                } else {
                  let fromOuter = fromEl.outerHTML;
                  let toOuter = toEl.outerHTML;
                  return false;
                }
              }
              const fromElRnbwId = fromEl.getAttribute(StageNodeIdAttr);
              nodeUidToFocus = syncConfigs?.matchIds?.[0] || "";
              if (toEl.nodeName.includes("-")) return false;
              if (
                syncConfigs?.matchIds &&
                !!fromElRnbwId &&
                syncConfigs.matchIds.includes(fromElRnbwId)
              ) {
                return true;
              } else if (fromEl.isEqualNode(toEl)) {
                return false;
              } else if (toEl.nodeName === "HTML") {
                //copy the attributes
                for (let i = 0; i < fromEl.attributes.length; i++) {
                  toEl.setAttribute(
                    fromEl.attributes[i].name,
                    fromEl.attributes[i].value,
                  );
                }
                if (fromEl.isEqualNode(toEl)) return false;
              }
              return true;
            },
            onElUpdated: function (el) {
              if (el.nodeName === "HTML") {
                //copy the attributes
                for (let i = 0; i < el.attributes.length; i++) {
                  iframeHtml.setAttribute(
                    el.attributes[i].name,
                    el.attributes[i].value,
                  );
                }
              }
            },
            onBeforeNodeDiscarded: function (node: Node) {
              const elementNode = node as Element;
              const ifPreserveNode = elementNode.getAttribute
                ? elementNode.getAttribute(PreserveRnbwNode)
                : false;
              if (ifPreserveNode) {
                return false;
              }
              //script and style should not be discarded
              if (
                elementNode.nodeName === "SCRIPT" ||
                elementNode.nodeName === "LINK" ||
                elementNode.nodeName === "STYLE"
              ) {
                return false;
              }

              return true;
            },
          });
        }
      }
    }

    // update prevFileUid
    if (prevFileUid !== currentFileUid) {
      dispatch(setPrevFileUid(currentFileUid));
    }

    removeRunningActions(["processor-update"]);
  }, [currentFileContent]);
};
