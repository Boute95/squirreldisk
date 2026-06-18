import { MutableRefObject } from "react";
import { DragDropContext } from "react-beautiful-dnd";
import { ResponsiveTreeMap, ComputedNode } from "@nivo/treemap";
import { patternSquaresDef } from "@nivo/core";

import ToolBar from "./ToolBar";
import FileContextMenu from "./FileContextMenu";
import ExplorerSidebar from "./ExplorerSidebar";
import { Layout, Progress } from "antd";
const { Header } = Layout;

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
  knownFolderSize?: number;

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
  knownFolderSize,
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
      <Header className={"pt-0 pl-2 h-10 flex flex-row items-start bg-white/20"}>
        <ToolBar
          onFolderUp={onFolderUp}
          onPrevious={onPrevious}
          onNext={onNext}
          onTrash={onTrash}
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          refreshStatus={refreshStatus}
          onCancelRefresh={onCancelRefresh}
          knownFolderSize={knownFolderSize}
        />
      </Header>

      <Layout>
        <DragDropContext onDragEnd={() => {}}>
          <ExplorerSidebar
            viewTree={viewTree}
            setFocusedPath={setFocusedPath}
            deleteList={deleteList}
            setDeleteList={setDeleteList}
            deleteMap={deleteMap}
            deleteState={deleteState}
            setDeleteState={setDeleteState}
            d3Chart={d3Chart}
          />

          <FileContextMenu path={selPath}>
            <div className="h-full w-full" onContextMenu={(e) => { if (!contextNode) { e.preventDefault(); e.stopPropagation(); } }} onClick={() => setContextNode(null)}>
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
