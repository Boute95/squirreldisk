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
      <div>
         <Flex gap="small" align="center" className={`bg-white/20 ${className}`}>
            <Flex gap="small">
               <Button icon={<TiArrowLeft size={28} />} type="text" title="Previous" onClick={onPrevious} />
               <Button icon={<TiArrowRight size={28} />} type="text" title="Next" onClick={onNext} />
            </Flex>
            <Divider type="vertical" />
            <Button icon={<MdDriveFolderUpload size={28}/>} type="text" title="Folder Up" onClick={onFolderUp} />
            <Divider type="vertical" />
            <Button 
               icon={<MdRefresh size={28} className={isRefreshing ? 'animate-spin' : ''} />} 
               type="text" 
               title="Refresh Folder" 
               onClick={onRefresh}
            />
            {isRefreshing && onCancelRefresh && (
               <>
                  <Divider type="vertical" />
                  <Button 
                     icon={<span className="text-xs font-bold">✕</span>} 
                     type="text" 
                     title="Cancel Refresh" 
                     onClick={onCancelRefresh}
                     style={{ color: '#ff4d4f' }}
                  />
               </>
            )}
            <Divider type="vertical" />
            <Button icon={<MdDelete size={28}/>} type="text" title="Trash" onClick={onTrash} />
         </Flex>
         {isRefreshing && refreshStatus && (
            <div className="px-3 pb-1">
               <Progress
                  percent={progressPercent}
                  status="active"
                  strokeWidth={4}
                  showInfo={false}
               />
            </div>
         )}
      </div>
   );
};

export default ToolBar;
