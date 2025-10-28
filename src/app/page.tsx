import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <main className="flex flex-col items-center justify-center px-6 py-20 max-w-2xl text-center">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-6">
          Video Chat Analysis Dashboard
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          视频聊天数据分析仪表板
        </p>
        
        <div className="w-full max-w-md">
          <Link
            href="/upload"
            className="block px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 
              transition-colors duration-200 text-lg font-semibold shadow-lg"
          >
            上传 CSV 文件
          </Link>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-4 w-full max-w-2xl">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              功能特性
            </h2>
            <ul className="text-left text-gray-600 dark:text-gray-400 space-y-2">
              <li>• 上传 CSV 文件并自动解析</li>
              <li>• 自动提取 room_id 字段</li>
              <li>• 显示去重前后的统计数据</li>
              <li>• 可视化展示所有唯一的 room_id</li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
