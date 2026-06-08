import { MutableRefObject } from "react";
import { Droppable } from "react-beautiful-dnd";
import { Layout } from "antd";
const { Sider } = Layout;

import { FileLine } from "./FileLine";

interface ExplorerSidebarProps {
  viewTree: DiskItem | null;
  setFocusedPath: React.Dispatch<React.SetStateAction<string>>;
  deleteList: Array<D3HierarchyDiskItem>;
  setDeleteList: React.Dispatch<React.SetStateAction<Array<D3HierarchyDiskItem>>>;
  deleteMap: MutableRefObject<Map<string, boolean>>;
  deleteState: { isDeleting: boolean; total: number; current: number };
  setDeleteState: React.Dispatch<React.SetStateAction<{ isDeleting: boolean; total: number; current: number }>>;
  d3Chart: any;
}

const ExplorerSidebar = ({
  viewTree,
  setFocusedPath,
  deleteList,
  setDeleteList,
  deleteMap,
  deleteState,
  setDeleteState,
  d3Chart,
}: ExplorerSidebarProps) => {
  return (
    <Sider className="bg-inherit">
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
  );
};

export default ExplorerSidebar;
