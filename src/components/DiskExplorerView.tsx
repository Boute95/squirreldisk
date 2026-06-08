import { MutableRefObject } from "react";
import { DragDropContext, Droppable } from "react-beautiful-dnd";
import { ResponsiveTreeMap, ComputedNode } from "@nivo/treemap";
import { patternSquaresDef } from "@nivo/core";

import { FileLine } from "./FileLine";
import ToolBar from "./ToolBar";
import FileContextMenu from "./FileContextMenu";
import { Layout } from "antd";
const { Header, Content, Sider } = Layout;

(window as any).LockDNDEdgeScrolling = () => true;

interface DiskExplorerViewProps {
  // Navigation handlers (computed in parent)
  onFolderUp: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onTrash: () => void;

  // Refresh state and handlers
  isRefreshing: boolean;
  refreshStatus: { items: number; total: number } | null;
  onRefresh: () => void;
  onCancelRefresh: () => void;

  // Tree data
  viewTree: DiskItem | null;

  // File navigation (from parent state)
  setFocusedPath: React.Dispatch<React.SetStateAction<string>>;

  // Delete zone state and handlers
  deleteList: Array<D3HierarchyDiskItem>;
  setDeleteList: React.Dispatch<React.SetStateAction<Array<D3HierarchyDiskItem>>>;
  deleteMap: MutableRefObject<Map<string, boolean>>;
  deleteState: { isDeleting: boolean; total: number; current: number };
  setDeleteState: React.Dispatch<React.SetStateAction<{ isDeleting: boolean; total: number; current: number }>>;

  // Treemap / context menu
  d3Chart: any;
  contextNode: ComputedNode<DiskItem> | null;
  setContextNode: (node: ComputedNode<DiskItem> | null) => void;
}

const DiskExplorerView = ({
  onFolderUp,
  onPrevious,
  onNext,
  onTrash,
  isRefreshing,
  refreshStatus,
  onRefresh,
  onCancelRefresh,
  viewTree,
  setFocusedPath,
  deleteList,
  setDeleteList,
  deleteMap,
  deleteState,
  setDeleteState,
  d3Chart,
  contextNode,
  setContextNode,
}: DiskExplorerViewProps) => {
  const selPath = contextNode?.data.id ?? "";

  return (
    <Layout>
      <Header className={"pt-0 pl-2 h-10 flex flex-col items-start bg-white/20"}>
        <ToolBar
          onFolderUp={onFolderUp}
          onPrevious={onPrevious}
          onNext={onNext}
          onTrash={onTrash}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          refreshStatus={refreshStatus}
          onCancelRefresh={onCancelRefresh}
        />
      </Header>

      <Layout>
        <DragDropContext
          onDragEnd={(result) => { }}
        >
          <Sider>
            {/* {focusedPath && parentNode && (
                          <ParentFolder parentPath={parentNode}></ParentFolder>
                       )} */}
            <Droppable droppableId="filelist">
              {(provided) => (
                <div
                  className="overflow-y-auto"
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
                  className="pt-1"
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
                          let successful: Array<D3HierarchyDiskItem> = [];
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
          </Sider>

          <FileContextMenu path={selPath}>
            <div className="h-full w-full" onContextMenu={(e) => { if (!contextNode) { e.preventDefault(); e.stopPropagation(); } }} onMouseLeave={() => setContextNode(null)}>
              {viewTree && (
                <ResponsiveTreeMap
                  data={viewTree}
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
        </DragDropContext>
      </Layout>
    </Layout>
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

export default DiskExplorerView;
