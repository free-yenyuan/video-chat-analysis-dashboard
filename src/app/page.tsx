'use client';

import { useState } from 'react';
import Papa from 'papaparse';

interface CSVData {
  room_id: string;
  url?: string;
  create_time?: string;
  [key: string]: string | undefined;
}

interface RoomDetail {
  jpgUrls: Array<{ url: string; create_time: string }>;
  mp3Urls: Array<{ url: string; create_time: string }>;
  totalRows: number;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [allData, setAllData] = useState<CSVData[]>([]);
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const [uniqueRoomIds, setUniqueRoomIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string>('');
  const [stats, setStats] = useState<{
    total: number;
    unique: number;
    duplicates: number;
  } | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [roomDetails, setRoomDetails] = useState<RoomDetail | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError('请上传CSV文件');
        return;
      }
      setFile(selectedFile);
      setError('');
      // 重置之前的数据
      setAllData([]);
      setRoomIds([]);
      setUniqueRoomIds([]);
      setStats(null);
      setSelectedRoomId(null);
      setRoomDetails(null);
    }
  };

  const handleUpload = () => {
    if (!file) {
      setError('请先选择一个文件');
      return;
    }

    setIsProcessing(true);
    setError('');

    // 读取文件内容
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        if (!e.target?.result) {
          setError('文件读取失败：无法获取文件内容');
          setIsProcessing(false);
          return;
        }

        const text = e.target.result as string;
        
        if (!text || text.trim() === '') {
          setError('文件内容为空');
          setIsProcessing(false);
          return;
        }
        
        // 使用PapaParse解析CSV
        Papa.parse<CSVData>(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => {
            try {
              // 检查是否有room_id字段
              if (results.data.length === 0) {
                setError('CSV文件为空或没有有效数据');
                setIsProcessing(false);
                return;
              }

              const firstRow = results.data[0];
              if (!firstRow || !firstRow.room_id) {
                setError('CSV文件中没有找到room_id字段');
                setIsProcessing(false);
                return;
              }

              // 保存所有数据
              const allDataRows = results.data;
              
              // 提取所有room_id
              const allRoomIds = allDataRows
                .map(row => row.room_id)
                .filter(id => id && id.trim() !== '');

              // 去重
              const uniqueIds = Array.from(new Set(allRoomIds));

              // 计算统计信息
              const stats = {
                total: allRoomIds.length,
                unique: uniqueIds.length,
                duplicates: allRoomIds.length - uniqueIds.length
              };

              setAllData(allDataRows);
              setRoomIds(allRoomIds);
              setUniqueRoomIds(uniqueIds);
              setStats(stats);
              setIsProcessing(false);
            } catch (err) {
              setError('解析CSV文件时出错: ' + (err instanceof Error ? err.message : '未知错误'));
              setIsProcessing(false);
            }
          },
          error: (error) => {
            setError('CSV解析失败: ' + error.message);
            setIsProcessing(false);
          }
        });
      } catch (err) {
        setError('读取文件时发生错误: ' + (err instanceof Error ? err.message : '未知错误'));
        setIsProcessing(false);
      }
    };

    reader.onerror = (event) => {
      const error = event.target?.error;
      const errorMsg = error ? `错误代码: ${error.code}, ${error.message}` : '无法读取文件';
      setError(`读取文件失败: ${errorMsg}`);
      setIsProcessing(false);
    };

    reader.onabort = () => {
      setError('文件读取被中断');
      setIsProcessing(false);
    };

    // 使用UTF-8编码读取文件
    reader.readAsText(file, 'UTF-8');
  };

  const handleRoomIdClick = (roomId: string) => {
    // 筛选出该room_id的所有数据
    const roomData = allData.filter(row => row.room_id === roomId);
    
    // 分离jpg和mp3的url
    const jpgUrls: Array<{ url: string; create_time: string }> = [];
    const mp3Urls: Array<{ url: string; create_time: string }> = [];
    
    roomData.forEach(row => {
      if (row.url) {
        const url = row.url;
        const createTime = row.create_time || '';
        
        if (url.toLowerCase().endsWith('.jpg') || url.toLowerCase().endsWith('.jpeg')) {
          jpgUrls.push({ url, create_time: createTime });
        } else if (url.toLowerCase().endsWith('.mp3')) {
          mp3Urls.push({ url, create_time: createTime });
        }
      }
    });
    
    // 按create_time排序
    jpgUrls.sort((a, b) => {
      if (!a.create_time && !b.create_time) return 0;
      if (!a.create_time) return 1;
      if (!b.create_time) return -1;
      return a.create_time.localeCompare(b.create_time);
    });
    
    mp3Urls.sort((a, b) => {
      if (!a.create_time && !b.create_time) return 0;
      if (!a.create_time) return 1;
      if (!b.create_time) return -1;
      return a.create_time.localeCompare(b.create_time);
    });
    
    setRoomDetails({
      jpgUrls,
      mp3Urls,
      totalRows: roomData.length
    });
    setSelectedRoomId(roomId);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">
          CSV 文件上传与分析
        </h1>

        {/* 文件上传区域 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              选择CSV文件
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500
                file:mr-4 file:py-2 file:px-4
                file:rounded-md file:border-0
                file:text-sm file:font-semibold
                file:bg-blue-50 file:text-blue-700
                hover:file:bg-blue-100
                dark:file:bg-blue-900 dark:file:text-blue-300"
            />
            {file && (
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                已选择: {file.name}
              </p>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={!file || isProcessing}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 
              disabled:bg-gray-400 disabled:cursor-not-allowed
              transition-colors duration-200"
          >
            {isProcessing ? '处理中...' : '解析文件'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          )}
        </div>

        {/* 统计信息 */}
        {stats && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              统计信息
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">总数量</div>
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {stats.total}
                </div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">去重后数量</div>
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {stats.unique}
                </div>
              </div>
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg">
                <div className="text-sm text-gray-600 dark:text-gray-400">重复数量</div>
                <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                  {stats.duplicates}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 去重后的 room_id 列表 */}
        {uniqueRoomIds.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              去重后的 Room ID 列表 ({uniqueRoomIds.length} 个)
            </h2>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {uniqueRoomIds.map((id, index) => (
                  <button
                    key={index}
                    onClick={() => handleRoomIdClick(id)}
                    className={`p-3 rounded-md text-sm font-mono transition-all duration-200 ${
                      selectedRoomId === id
                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:scale-105'
                    }`}
                  >
                    {id}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Room ID 详细信息 */}
        {roomDetails && selectedRoomId && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Room ID: {selectedRoomId}
              </h2>
              <button
                onClick={() => {
                  setSelectedRoomId(null);
                  setRoomDetails(null);
                }}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                关闭
              </button>
            </div>

            <div className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              总行数: {roomDetails.totalRows} | 
              JPG数量: {roomDetails.jpgUrls.length} | 
              MP3数量: {roomDetails.mp3Urls.length}
            </div>

            {/* JPG 列表 */}
            {roomDetails.jpgUrls.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  JPG 图片列表 (按时间排序)
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {roomDetails.jpgUrls.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border-l-4 border-blue-500"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {item.create_time || '无时间信息'}
                        </span>
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded">
                          JPG
                        </span>
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                      >
                        {item.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* MP3 列表 */}
            {roomDetails.mp3Urls.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  MP3 音频列表 (按时间排序)
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {roomDetails.mp3Urls.map((item, index) => (
                    <div
                      key={index}
                      className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md border-l-4 border-green-500"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                          {item.create_time || '无时间信息'}
                        </span>
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded">
                          MP3
                        </span>
                      </div>
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-600 dark:text-green-400 hover:underline break-all"
                      >
                        {item.url}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {roomDetails.jpgUrls.length === 0 && roomDetails.mp3Urls.length === 0 && (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                该 Room ID 没有找到 JPG 或 MP3 的 URL
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
