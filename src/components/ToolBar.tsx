import React, { useEffect } from 'react';
import { Button, Flex, Divider, Progress, Popconfirm } from "antd";
import { MdDriveFolderUpload, MdDelete, MdRefresh, MdClose, MdRestore, MdDeleteSweep } from "react-icons/md";
import { TiArrowLeft, TiArrowRight } from "react-icons/ti";

interface ToolBarProps {
   className?: string;
   onFolderUp?: () => void;
   onPrevious?: () => void;
   onNext?: () => void;
   onTrash?: () => void;
   onRefresh?: () => void;
   isRefreshing?: boolean;
   refreshStatus?: { items: number; total: number } | null;
   onCancelRefresh?: () => void;
   knownFolderSize?: number;
   inTrash?: boolean;
   onRestore?: () => void;
   onEmptyTrash?: () => void;
}

const ToolBar: React.FC<ToolBarProps> = ({ 
   className, 
   onFolderUp, 
   onPrevious, 
   onNext, 
   onTrash, 
   onRefresh,
   isRefreshing,
   refreshStatus,
   onCancelRefresh,
   knownFolderSize,
   inTrash,
   onRestore,
   onEmptyTrash
}) => {

useEffect(() => {
  console.log(refreshStatus)
}, [refreshStatus])

  return (
    <Flex gap="small" className={`items-center ${className}`}>
      <Flex gap="small">
        <Button icon={<span className="flex items-center"><TiArrowLeft className="text-3xl" /></span>} type="text" shape="circle" title="Previous" onClick={onPrevious} />
        <Button icon={<span className="flex items-center"><TiArrowRight className="text-3xl" /></span>} type="text" shape="circle" title="Next" onClick={onNext} />
      </Flex>
      <Divider type="vertical" />
      <Button icon={<span className="flex items-center"><MdDriveFolderUpload className="text-2xl" /></span>} type="text" shape="circle" title="Folder Up" onClick={onFolderUp} />
      <Divider type="vertical" />
      {!isRefreshing && (
        <Button
          icon={<span className="flex items-center"><MdRefresh className="text-2xl" /></span>}
          type="text"
          shape="circle"
          title="Refresh Folder"
          onClick={onRefresh}
        />
      )}
      {isRefreshing && onCancelRefresh && (
        <>
          <Progress
            percent={refreshStatus && knownFolderSize && knownFolderSize > 0 ? Math.round((refreshStatus.total / knownFolderSize) * 100) : 0}

            type="circle"
            size={24}
            strokeWidth={18}
            format={() => (
              <Button
                type="text"
                size="small"
                icon={<MdClose className="text-lg" />}
                onClick={onCancelRefresh}
                title="Cancel Refresh"
                aria-label="Cancel Refresh"
                className="flex items-center justify-center w-full h-full"
              />
            )}
          />
        </>
      )}
      <Divider type="vertical" />
      <Button icon={<span className="flex items-center"><MdDelete className="text-2xl" /></span>} type="text" shape="circle" title="Trash" onClick={onTrash} />
      {inTrash && (
        <>
          <Divider type="vertical" />
          <Button icon={<MdRestore className="text-xl" />} type="text" title="Restore" onClick={onRestore}>
            Restore
          </Button>
          <Popconfirm
            title="Empty Trash"
            description="Are you sure you want to permanently delete all items in the trash?"
            onConfirm={onEmptyTrash}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Button icon={<MdDeleteSweep className="text-xl" />} danger type="text" title="Empty Trash">
              Empty trash
            </Button>
          </Popconfirm>
        </>
      )}
    </Flex>
  );
};

export default ToolBar;
