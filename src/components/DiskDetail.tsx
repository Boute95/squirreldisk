import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
   diskItemToD3Hierarchy,
   itemMap,
   depthCutForTreeView,
   subTreeFromPath,
   markLeafs,
   getNode,
} from "../pruneData";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { ComputedNode } from "@nivo/treemap";
import { message } from "antd";

import ScanProgressView from "./ScanProgressView";
import DiskExplorerView from "./DiskExplorerView";

const Scanning = () => {
   let {
      state: { disk, used, fullscan },
   } = useLocation() as any;

   const navigate = useNavigate();
   const fullTree = useRef<DiskItem | null>(null);
   const [viewTree, setViewTree] = useState<DiskItem | null>(null);
   const [parentNode, setParentNode] = useState<DiskItem | null>(null);
   const maxDepth = 3;
   const baseDataD3Hierarchy = useRef<D3HierarchyDiskItem | null>(null);
   const [focusedPath, setFocusedPath] = useState<string>("/");
   const [pathHistory, setPathHistory] = useState<string[]>(["/"]);
   const [currentHistoryIndex, setCurrentHistoryIndex] = useState<number>(0);
   const [trashPath, setTrashPath] = useState<string>("");
   const [hoveredItem, setHoveredItem] = useState<DiskItem | null>(null);
   const [contextNode, setContextNode] = useState<ComputedNode<DiskItem> | null>(null);
   const d3Chart = useRef(null) as any;
   const [view, setView] = useState("loading");
   const [bytesProcessed, setByteProcessed] = useState(0);
   const [status, setStatus]: any = useState();
   const [deleteState, setDeleteState] = useState({
      isDeleting: false,
      total: 0,
      current: 0,
   });
   const [deleteList, setDeleteList] = useState<Array<D3HierarchyDiskItem>>([]);
   const deleteMap = useRef<Map<string, boolean>>(new Map());

   // Partial scan state
   const [isRefreshing, setIsRefreshing] = useState(false);
   const [refreshStatus, setRefreshStatus] = useState<{ items: number; total: number } | null>(null);
   const [knownFolderSize, setKnownFolderSize] = useState<number>(0);

   const goUpOneFolder = () => {
      if (focusedPath === "/") return;
      const parts = focusedPath.split("/");
      if (parts.length > 2) {
         parts.pop();
         setFocusedPath(parts.join("/"));
      } else {
         setFocusedPath("/");
      }
   };

   const goPreviousPath = () => {
      if (currentHistoryIndex > 0) {
         setCurrentHistoryIndex(currentHistoryIndex - 1);
         setFocusedPath(pathHistory[currentHistoryIndex - 1]);
      }
   };

   const goNextPath = () => {
      if (currentHistoryIndex < pathHistory.length - 1) {
         setCurrentHistoryIndex(currentHistoryIndex + 1);
         setFocusedPath(pathHistory[currentHistoryIndex + 1]);
      }
   };

   const goToTrash = () => {
      if (!trashPath) return;
      setFocusedPath(trashPath);
      handleRefresh(trashPath);
   };

   const inTrash = trashPath && focusedPath ? focusedPath.startsWith(trashPath) : false;

   const handleEmptyTrash = async () => {
      try {
         await invoke("empty_trash", { diskMountPoint: disk });
         message.success("Trash emptied successfully");
         if (inTrash) {
            handleRefresh();
         }
      } catch (err) {
         message.error(`Failed to empty trash: ${err}`);
      }
   };

   useEffect(() => {
      invoke<string>("get_trash_path", { diskMountPoint: disk }).then((path) => {
         setTrashPath(path);
      }).catch(() => {
         setTrashPath("");
      });
   }, [disk]);

   useEffect(() => {
      if (fullTree.current) {
         return;
      }
      const unlisten = listen("scan_status", (event: any) => {
         setStatus(event.payload);
      });
      const unlisten2 = listen("scan_completed", (event: any) => {
         fullTree.current = JSON.parse(event.payload).tree;
         if (fullTree.current) {
            markLeafs(fullTree.current);
         }
         setFocusedPath(fullTree.current?.id!);
         const mapped = itemMap(fullTree.current);
         baseDataD3Hierarchy.current = diskItemToD3Hierarchy(mapped as any);
         setView("disk");
      });
      invoke("start_scanning", { path: disk, ratio: fullscan ? "0" : "0.001" });
      return () => {
         unlisten.then((f) => f());
         unlisten2.then((f) => f());
         invoke("stop_scanning", { path: disk });
         //   worker.current!.postMessage({ type: "stop" });
      };
   }, [disk, setStatus]);

   useEffect(() => {
      if (isRefreshing) {
         const unlistenStatus = listen("scan_status", (event: any) => {
            setRefreshStatus(event.payload);
         });
         const unlistenCompleted = listen("scan_partial_completed", (event: any) => {
            try {
               const result = JSON.parse(event.payload);
               if (result && result.tree) {
                  mergePartialScanIntoTree(result.tree);
               }
            } catch (e) {
               console.error("Failed to parse partial scan result:", e);
            } finally {
               setIsRefreshing(false);
               setRefreshStatus(null);
            }
         });
         return () => {
            unlistenStatus.then((f) => f());
            unlistenCompleted.then((f) => f());
         };
      }
   }, [isRefreshing]);

   const mergePartialScanIntoTree = (scannedSubtree: DiskItem) => {
      if (!fullTree.current) return;

      const pathParts = focusedPath.startsWith("/") ? focusedPath.slice(1).split("/") : focusedPath.split("/");
      const targetNode = getNode(fullTree.current, pathParts);
      if (!targetNode) {
         console.warn("Could not find node at path:", focusedPath);
         return;
      }
      const newChildren = (scannedSubtree.children || []).map((child: DiskItem) =>
         fixNodeIds(child, targetNode.id)
      );
      targetNode.children = newChildren;
      targetNode.size = scannedSubtree.size;
      recalcAncestors(fullTree.current, pathParts);

      if (fullTree.current) {
         markLeafs(fullTree.current);
      }

      setViewTree(depthCutForTreeView(getCurrentRootNode(), maxDepth));
   };

   const fixNodeIds = (node: DiskItem, parentId: string): DiskItem => {
      const fixed = { ...node };
      fixed.id = parentId + "/" + fixed.name;
      if (fixed.children && fixed.children.length > 0) {
         fixed.children = fixed.children.map((child: DiskItem) =>
            fixNodeIds(child, fixed.id)
         );
      }
      return fixed;
   };

   const recalcAncestors = (root: DiskItem, pathParts: string[]): void => {
      let current: DiskItem | null = root;
      for (let i = 0; i < pathParts.length - 1; i++) {
         if (!current || !current.children) return;
         const childNode: DiskItem | undefined = current.children.find((c: any) => c.name === pathParts[i + 1]);
         if (!childNode) return;
         current.size = current.children.reduce((sum, child) => sum + (child.size || 0), 0);
         current = childNode;
      }
   };

   const getCurrentRootNode = (): DiskItem => {
      if (!fullTree.current) return fullTree.current!;
      if (focusedPath === "/") return fullTree.current;
      const subTree = subTreeFromPath(fullTree.current, focusedPath.substring(1).split("/"));
      return subTree || fullTree.current;
   };

   const handleRefresh = (path?: string) => {
      const targetPath = typeof path === 'string' ? path : focusedPath;
      if (!fullTree.current || !targetPath) return;
      setIsRefreshing(true);
      setRefreshStatus(null);

      const folderSize = targetPath === "/"
        ? fullTree.current.size
        : getNode(fullTree.current, targetPath.slice(1).split("/"))?.size ?? 0;
      setKnownFolderSize(folderSize);

      const pathToScan = targetPath === "/" ? disk : `${disk}${targetPath}`;
      invoke("refresh_folder", { path: pathToScan });
   };

   const handleCancelRefresh = () => {
      setIsRefreshing(false);
      setRefreshStatus(null);
      invoke("stop_refresh_folder");
   };

   useEffect(() => {
      if (fullTree.current?.children.length) {
         let currentRootNode = fullTree.current;
         if (focusedPath) {
            const subTree = subTreeFromPath(
               fullTree.current,
               focusedPath.substring(1).split("/")
            );
            if (subTree) {
               currentRootNode = subTree;
            }
            const parentPath =
               focusedPath === "/"
                  ? fullTree.current
                  : getNode(
                       fullTree.current,
                       focusedPath.substring(1).split("/").slice(0, -1)
                    );
            setParentNode(parentPath || null);

            const currentIndex = pathHistory.indexOf(focusedPath);
            if (currentIndex !== -1 && currentIndex !== currentHistoryIndex) {
               setCurrentHistoryIndex(currentIndex);
               const newHistory = pathHistory.slice(0, currentIndex + 1);
               setPathHistory(newHistory);
            } else if (currentIndex === -1) {
               const newHistory = [
                  ...pathHistory.slice(0, currentHistoryIndex + 1),
                  focusedPath,
               ];
               setPathHistory(newHistory);
               setCurrentHistoryIndex(newHistory.length - 1);
            }
         } else {
            setParentNode(fullTree.current);
         }
         setViewTree(depthCutForTreeView(currentRootNode, maxDepth));
      }
   }, [focusedPath]);

   return (
      <>
         {view === "loading" && status && (
            <ScanProgressView disk={disk} used={used} status={status} onBack={() => navigate("/")} />
         )}
         {view === "disk" && (
            <DiskExplorerView
               onFolderUp={goUpOneFolder}
               onPrevious={goPreviousPath}
               onNext={goNextPath}
               onTrash={goToTrash}
               inTrash={inTrash}
               onEmptyTrash={handleEmptyTrash}
               isRefreshing={isRefreshing}
               refreshStatus={refreshStatus}
               onRefresh={handleRefresh}
               onCancelRefresh={handleCancelRefresh}
               knownFolderSize={knownFolderSize}
               viewTree={viewTree}
               setFocusedPath={setFocusedPath}
               deleteList={deleteList}
               setDeleteList={setDeleteList}
               deleteMap={deleteMap}
               deleteState={deleteState}
               setDeleteState={setDeleteState}
               d3Chart={d3Chart}
               contextNode={contextNode}
               setContextNode={setContextNode}
            />
         )}
      </>
   );
};

export default Scanning;
