import React from 'react';
import { Button, Flex, Divider, Progress } from "antd";
import { MdDriveFolderUpload, MdDelete, MdRefresh } from "react-icons/md";
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
   onCancelRefresh
}) => {
   const progressPercent = refreshStatus && refreshStatus.total > 0
      ? Math.round((refreshStatus.items / refreshStatus.total) * 100)
      : 0;

  return (
    <Flex gap="small" className={`items-center ${className}`}>
      <Flex gap="small">
        <Button icon={<span className="flex items-center"><TiArrowLeft className="text-3xl" /></span>} type="text" shape="circle" title="Previous" onClick={onPrevious} />
        <Button icon={<span className="flex items-center"><TiArrowRight className="text-3xl" /></span>} type="text" shape="circle" title="Next" onClick={onNext} />
      </Flex>
      <Divider type="vertical" />
      <Button icon={<span className="flex items-center"><MdDriveFolderUpload className="text-2xl" /></span>} type="text" shape="circle" title="Folder Up" onClick={onFolderUp} />
      <Divider type="vertical" />
      <Button
        icon={<span className="flex items-center"><MdRefresh className={`text-2xl ${isRefreshing ? 'animate-spin' : ''}`} /></span>}
        type="text"
        shape="circle"
        title="Refresh Folder"
        onClick={onRefresh}
      />
      {isRefreshing && onCancelRefresh && (
        <>
          <Divider type="vertical" />
          <Button
            icon={<span className="flex items-center"><span className="text-xs font-bold">✕</span></span>}
            type="text"
            shape="circle"
            title="Cancel Refresh"
            onClick={onCancelRefresh}
            style={{ color: '#ff4d4f' }}
          />
        </>
      )}
      <Divider type="vertical" />
      <Button icon={<span className="flex items-center"><MdDelete className="text-2xl" /></span>} type="text" shape="circle" title="Trash" onClick={onTrash} />
      <Progress
        percent={progressPercent}
        status="active"
        strokeWidth={4}
        showInfo={false}
      />
    </Flex>
  );
};

export default ToolBar;
