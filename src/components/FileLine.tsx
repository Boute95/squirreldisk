import prettyBytes from "pretty-bytes";
import { buildFullPath } from "../pruneData";
import { getIconForFile, getIconForFolder } from "vscode-icons-js";
import { Draggable } from "react-beautiful-dnd";
import FileContextMenu from "./FileContextMenu";

interface FileLineProps {
  item: DiskItem;
  index: number;
  className?: string;
  setFocusedPath?: (path: string) => void;
}

const mul = window.OS_TYPE === "windows" ? 1024 : 1000;
export const FileLine = ({
  item,
  index,
  className = "",
  setFocusedPath,
}: FileLineProps) => {
  const path = buildFullPath(item);

  return (
    <Draggable draggableId={item.id} index={index}>
      {(provided) => (
        <FileContextMenu path={path}>
          <div
            className={`p-2 text-white flex justify-between rounded-md mt-1 hover:bg-black/20 ${className}`}
            onClick={() => {
               if (setFocusedPath && item.id) {
                 setFocusedPath(item.id);
               }
             }}
             {...provided.draggableProps}
             {...provided.dragHandleProps}
             ref={provided.innerRef}
          >
            <img
              className="h-4 w-4 basis-1/12 mr-3"
              src={
                item.isLeaf
                  ? "/fileicons/" +
                    (getIconForFile(item.name) || "default_file.svg")
                  : "/fileicons/" + getIconForFolder(item.name)
              }
            />
            <div className="truncate basis-8/12 flex-1 shrink text-xs">
              {item.name}
            </div>
            <div className="flex-1 basis-3/12 text-right text-xs">
              {item &&
                ((item.value ?? item.size) / mul / mul / mul).toFixed(2)}{" "}
              GB
            </div>
          </div>
        </FileContextMenu>
      )}
    </Draggable>
  );
};
