import diskIcon from "../assets/harddisk.png";

interface LoadingDiskViewProps {
  disk: string;
  used: number;
  status: { total: number } | undefined;
  onBack: () => void;
}

const ScanProgressView = ({ disk, used, status, onBack }: LoadingDiskViewProps) => {
  const cappedTotal = Math.min(status?.total ?? 0, used);

  return (
    <div className="flex-1 flex flex-col justify-center items-center justify-items-center">
      <img src={diskIcon} className="w-16 h-16"></img>
      <div className="w-2/3">
        <div className="mt-5 mb-1 text-base text-center font-medium text-white">
          Scanning {disk} {((cappedTotal / used) * 100).toFixed(2)}%
          <br />
        </div>
        <div className="mt-4 w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full"
            style={{ width: ((cappedTotal / used) * 100).toFixed(2) + "%" }}
          ></div>
        </div>
      </div>
      <button
        onClick={onBack}
        className="mt-6 relative inline-flex items-center justify-center p-0.5 mb-2 mr-2 overflow-hidden text-sm font-medium rounded-lg group bg-gradient-to-br from-purple-600 to-blue-500 group-hover:from-purple-600 group-hover:to-blue-500 hover:text-white text-white focus:ring-4 focus:ring-blue-300 focus:ring-blue-800"
      >
        <span className="relative px-5 py-2.5 transition-all ease-in duration-75 bg-gray-900 rounded-md group-hover:bg-opacity-0">
          Back
        </span>
      </button>
    </div>
  );
};

export default ScanProgressView;
