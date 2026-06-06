import { useEffect, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import diskIcon from "../assets/harddisk.png";
import {
   buildFullPath,
   diskItemToD3Hierarchy,
   itemMap,
   depthCutForTreeView,
   subTreeFromPath,
   markLeafs,
} from "../pruneData";
import { FileLine } from "./FileLine";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { remove } from "@tauri-apps/plugin-fs";
import { ResponsiveTreeMap, ComputedNode } from "@nivo/treemap";
import { patternSquaresDef } from "@nivo/core";
import { getNode } from "../pruneData";
import ToolBar from "./ToolBar";
import FileContextMenu from "./FileContextMenu";

(window as any).LockDNDEdgeScrolling = () => true;

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

   const selPath = contextNode?.data.id ?? "";

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
      // Navigate to trash folder - treat it like entering a directory
      setFocusedPath(trashPath);
   };

   // Get trash path for this disk on mount
   useEffect(() => {
      invoke("get_trash_path", { diskMountPoint: disk }).then((path: string) => {
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

   // useEffect(() => {
   //    if (view == "disk") {
   //       const rootDir = baseDataD3Hierarchy.current!;
   //       setFocusedDirectory(rootDir);
   //    }
   // }, [view]);

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

   // Avoid progress bar going to the star due to undetectable fs hardlinks
   const cappedTotal = Math.min(status ? status.total : 0, used);

   return (
      <>
         {view == "loading" && status && (
            <div className="flex-1 flex flex-col justify-center items-center justify-items-center">
               <img src={diskIcon} className="w-16 h-16"></img>
               <div className="w-2/3">
                  <div className="mt-5 mb-1 text-base text-center font-medium text-white">
                     Scanning {disk} {((cappedTotal / used) * 100).toFixed(2)}
                     %
                     <br />
                     {/* <span className="text-sm">{itemPath}</span> */}
                  </div>
                  <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
                     <div
                        className="bg-blue-600 h-2.5 rounded-full"
                        style={{
                           width: ((cappedTotal / used) * 100).toFixed(2) + "%",
                        }}
                     ></div>
                  </div>
               </div>
               <button
                  onClick={() => navigate("/")}
                  className="mt-6 relative inline-flex items-center justify-center p-0.5 mb-2 mr-2 overflow-hidden text-sm font-medium  rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white text-white focus:ring-4 focus:ring-blue-300 focus:ring-blue-800"
               >
                  <span className="relative px-5 py-2.5 transition-all ease-in duration-75  bg-gray-900 rounded-md group-hover:bg-opacity-0">
                     Back
                  </span>
               </button>
            </div>
         )}
         {view == "disk" && (
            <div className="grid grid-rows-[2.5rem_1fr] flex-1">
               <ToolBar
                  className="px-3"
                  onFolderUp={goUpOneFolder}
                  onPrevious={goPreviousPath}
                  onNext={goNextPath}
                  onTrash={goToTrash}
               />
               <div className="flex">
                  <DragDropContext
                     onDragEnd={(result) => {}}
                     // onDragEnd={(result) => {
                     //    console.log(result);
                     //    if (result.destination?.droppableId !== "deletelist") {
                     //       return;
                     //    }
                     //    const item = focusedPath!.children!.find(
                     //       (i) => i.data.id === result.draggableId
                     //    );
                     //    setDeleteList((val) => {
                     //       if (!val.find((e) => e.data.id === item!.data.id)) {
                     //          deleteMap.current.set(item!.data.id, true);

                     //          return [...val, item!];
                     //       } else {
                     //          return val;
                     //       }
                     //    });
                     // }}
                  >
                     <div className="flex flex-1">
                          <FileContextMenu path={selPath}>
                             <div className="flex-1 flex" onContextMenu={(e) => { if (!contextNode) { e.preventDefault(); e.stopPropagation(); } }} onMouseLeave={() => setContextNode(null)}>
                                {viewTree && (
                                   <ResponsiveTreeMap
                                      data={viewTree!}
                                      identity="name"
                                      value="data"
                                      valueFormat=".03s"
                                      labelTextColor={{
                                         from: "color",
                                         modifiers: [["darker", 2]],
                                      }}
                                      parentLabelTextColor={{
                                         from: "color",
                                         modifiers: [["darker", 3]],
                                      }}
                                      colors={{ scheme: "accent" }}
                                      nodeOpacity={0.9}
                                      label={(node) =>
                                         `${node.id} (${humanFileSize(node.value, true)})`
                                      }
                                      labelSkipSize={60}
                                      parentLabel={(node) =>
                                         `${node.id} (${humanFileSize(node.value, true)})`
                                      }
                                      onMouseEnter={(node) => setContextNode(node as ComputedNode<DiskItem>)}
                                      onClick={(node) => {
                                          console.log("click");
                                          setFocusedPath(node.data.id);
                                       }}
                                      defs={[
                                         patternSquaresDef("pattern", {
                                            size: 2,
                                            padding: 4,
                                            stagger: false,
                                            background: "#ffffff",
                                            color: "#c0bfbc99",
                                         }),
                                      ]}
                                      fill={[
                                         { match: (node) => node.data.isLeaf, id: "pattern" },
                                      ]}
                                   />
                                )}
                             </div>
                          </FileContextMenu>

                         <div className="w-1/3 p-4 flex flex-col">
                           {/* {focusedPath && parentNode && (
                              <ParentFolder parentPath={parentNode}></ParentFolder>
                           )} */}
                           <Droppable droppableId="filelist">
                              {(provided) => (
                                 <div
                                    className="overflow-y-auto"
                                    style={{ flex: "1 1 auto", height: 100 }}
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                 >
                                    {viewTree && (
                                       <FileLine
                                          className="py-2 bg-white/20"
                                          item={viewTree}
                                          index={0}
                                          setFocusedPath={setFocusedPath}
                                       />
                                    )}
                                    <>
                                       {viewTree?.children?.map((c, index) => (
                                          <FileLine
                                             className="pl-8"
                                             key={index}
                                             item={c}
                                             index={index}
                                             setFocusedPath={setFocusedPath}
                                          ></FileLine>
                                       ))}
                                    </>
                                    {provided.placeholder}
                                 </div>
                              )}
                           </Droppable>
                           <Droppable droppableId="deletelist">
                              {(provided) => (
                                 <div
                                    className="pt-1 flex-initial"
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                 >
                                    <div className="rounded-lg border	border-gray-500	border-dashed p-2 text-gray-500 text-center mb-0">
                                       {deleteList.length == 0 && (
                                          <>Drag file and folders here to delete</>
                                       )}
                                       {deleteList.length > 0 && (
                                          <div>
                                             <div>
                                                {deleteList.length} files selected -{" "}
                                                <a
                                                   href="#"
                                                   className="underline underline-offset-2"
                                                   onClick={() => {
                                                      setDeleteList([]);
                                                      deleteMap.current.clear();
                                                   }}
                                                >
                                                   Clear Selection
                                                </a>
                                             </div>
                                          </div>
                                       )}
                                       <div>{provided.placeholder}</div>
                                       {deleteList.length > 0 && (
                                          <button
                                             onClick={async () => {
                                                setDeleteState({
                                                   isDeleting: true,
                                                   total: deleteList.length,
                                                   current: 0,
                                                });
                                                // Avvio spinner
                                                let successful: Array<D3HierarchyDiskItem> =
                                                   [];
                                                // Cancello (errori li scarto da eliminare quindi vengono tenuti)
                                                // for (let node of deleteList) {
                                                //    const nodePath = buildFullPath(node)
                                                //       .replace("\\/", "/")
                                                //       .replace("\\", "/");
                                                //    try {
                                                //       //   await window.electron.diskUtils.rimraf(
                                                //       //     nodePath
                                                //       //   );
                                                //       //   if (
                                                //       //     node.children &&
                                                //       //     node.children.length > 0
                                                //       //   ) {
                                                //       // Workaroound: Since sometimes if the tree has some trimmed leafs a folder has no children
                                                //       removeDir(nodePath, {
                                                //          recursive: true,
                                                //       }).catch((err) =>
                                                //          removeFile(nodePath).catch(
                                                //             (err2) =>
                                                //                console.error(err, err2)
                                                //          )
                                                //       );
                                                //       //   } else {
                                                //       //     removeFile(nodePath).catch((err) => console.error(err));
                                                //       //   }
                                                //       successful.push(node);
                                                //       setDeleteState((prev) => ({
                                                //          ...prev,
                                                //          current: prev.current + 1,
                                                //       }));
                                                //    } catch (e) {
                                                //       console.error(e);
                                                //    }
                                                // }
                                                // Una volta finito aggiorno il grafico
                                                d3Chart.current.deleteNodes(successful);
                                                setDeleteState((prev) => ({
                                                   isDeleting: false,
                                                   total: 0,
                                                   current: 0,
                                                }));
                                                setDeleteList([]);
                                                deleteMap.current.clear();
                                             }}
                                             type="button"
                                             disabled={deleteState.isDeleting}
                                             className="text-white w-full mt-3 bg-gradient-to-r from-red-600 via-red-700 to-red-600 hover:bg-gradient-to-br focus:ring-4 focus:ring-red-300 focus:ring-red-800 shadow-sm shadow-red-500/50 shadow-lg shadow-red-800/80 font-medium rounded-lg text-sm px-5 py-2.5 text-center mr-2 mb-2"
                                          >
                                             {deleteState.isDeleting
                                                ? "Deleting " +
                                                  deleteState.current +
                                                  " of " +
                                                  deleteState.total
                                                : "Delete"}
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              )}
                           </Droppable>
                        </div>
                     </div>
                   </DragDropContext>
                 </div>
             </div>
          )}
      </>
   );
};

function humanFileSize(bytes: number, si = false, dp = 1) {
   const thresh = si ? 1000 : 1024;

   if (Math.abs(bytes) < thresh) {
      return bytes + " B";
   }

   const units = si
      ? ["kB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"]
      : ["KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB"];
   let u = -1;
   const r = 10 ** dp;

   do {
      bytes /= thresh;
      ++u;
   } while (Math.round(Math.abs(bytes) * r) / r >= thresh && u < units.length - 1);

   return bytes.toFixed(dp) + " " + units[u];
}

export default Scanning;
