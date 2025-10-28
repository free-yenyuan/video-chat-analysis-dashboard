'use client';

import { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';

interface CSVData {
  room_id: string;
  url?: string;
  content?: string;
  create_time?: string;
  user_id?: string;
  uid?: string;
  [key: string]: string | undefined;
}

interface RoomIdWithOrder {
  roomId: string;
  order: number;
}

interface ChatMessage {
  uid: string;
  message: string;
  create_time: string;
  audioUrl?: string;
}

interface RoomDetail {
  jpgUrls: Array<{ url: string; create_time: string }>;
  mp3Urls: Array<{ url: string; create_time: string }>;
  chatMessages: ChatMessage[];
  riskLabelNames: string[];
  userIds: string[];
  durationMinutes: number;
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
  const [filterUserId, setFilterUserId] = useState<string | null>(null);
  const [filteredRoomIds, setFilteredRoomIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [roomsWithOrder, setRoomsWithOrder] = useState<RoomIdWithOrder[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const detailContainerRef = useRef<HTMLDivElement>(null);

  // 切换room_id时滚动详情页面到顶部，并重置聊天记录滚动位置
  useEffect(() => {
    if (selectedRoomId && detailContainerRef.current) {
      // 重置聊天记录容器滚动位置
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = 0;
      }
      // 滚动详情容器到视口顶部
      setTimeout(() => {
        detailContainerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [selectedRoomId]);

  // 生成基于UID的固定颜色
  const getColorForUid = (uid: string): string => {
    const colors = [
      { bg: 'bg-blue-500', border: 'border-blue-500', darkBg: 'dark:bg-blue-600' },
      { bg: 'bg-green-500', border: 'border-green-500', darkBg: 'dark:bg-green-600' },
      { bg: 'bg-purple-500', border: 'border-purple-500', darkBg: 'dark:bg-purple-600' },
      { bg: 'bg-orange-500', border: 'border-orange-500', darkBg: 'dark:bg-orange-600' },
      { bg: 'bg-pink-500', border: 'border-pink-500', darkBg: 'dark:bg-pink-600' },
      { bg: 'bg-indigo-500', border: 'border-indigo-500', darkBg: 'dark:bg-indigo-600' },
      { bg: 'bg-teal-500', border: 'border-teal-500', darkBg: 'dark:bg-teal-600' },
      { bg: 'bg-red-500', border: 'border-red-500', darkBg: 'dark:bg-red-600' },
    ];
    
    // 简单哈希函数
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index].bg + ' ' + colors[index].darkBg;
  };

  const getBorderColorForUid = (uid: string): string => {
    const colors = [
      'border-blue-500',
      'border-green-500',
      'border-purple-500',
      'border-orange-500',
      'border-pink-500',
      'border-indigo-500',
      'border-teal-500',
      'border-red-500',
    ];
    
    let hash = 0;
    for (let i = 0; i < uid.length; i++) {
      hash = uid.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const index = Math.abs(hash) % colors.length;
    return colors[index];
  };

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
      setRoomsWithOrder([]);
      setStats(null);
      setSelectedRoomId(null);
      setRoomDetails(null);
      setSortOrder('asc');
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

              // 自动为每个唯一的room_id分配order（从1开始连续数字）
              const uniqueRoomIdsSet = Array.from(new Set(allRoomIds));
              
              // 按房间ID的顺序分配order（1, 2, 3, ...）
              const roomsWithOrderData: RoomIdWithOrder[] = uniqueRoomIdsSet.map((roomId, index) => ({
                roomId,
                order: index + 1
              }));

              setAllData(allDataRows);
              setRoomIds(allRoomIds);
              setUniqueRoomIds(uniqueIds);
              setRoomsWithOrder(roomsWithOrderData);
              setStats(stats);
              setIsProcessing(false);
            } catch (err) {
              setError('解析CSV文件时出错: ' + (err instanceof Error ? err.message : '未知错误'));
              setIsProcessing(false);
            }
          },
          error: (error: any) => {
            setError('CSV解析失败: ' + error?.message || '未知错误');
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
    const chatMessages: ChatMessage[] = [];
    
    // 第一遍遍历：创建时间到音频URL的映射
    const audioUrlMap = new Map<string, string>();
    const mp3BaseUrls = new Set<string>(); // 用于存储唯一的音频基础URL
    
    roomData.forEach(row => {
      if (row.url) {
        const url = row.url;
        const urlLower = url.toLowerCase();
        const createTime = row.create_time || '';
        
        // 检查是否是图片（.jpg, .jpeg）
        if (urlLower.endsWith('.jpg') || urlLower.endsWith('.jpeg') || urlLower.includes('.jpg') || urlLower.includes('.jpeg')) {
          jpgUrls.push({ url, create_time: createTime });
        } 
        // 检查是否是音频（.mp3）- 支持URL中的查询参数
        else if (urlLower.includes('.mp3')) {
          // 提取基础URL（去掉查询参数）
          const baseUrl = url.split('?')[0]; // 取?之前的部分
          
          // 如果该基础URL还未添加过
          if (!mp3BaseUrls.has(baseUrl)) {
            mp3BaseUrls.add(baseUrl);
            mp3Urls.push({ url: baseUrl, create_time: createTime });
          }
          
          // 构建音频URL映射（使用基础URL，避免重复）
          if (createTime) {
            audioUrlMap.set(createTime, baseUrl);
          }
        }
      }
    });
    
    // 第二遍遍历：处理聊天记录并匹配音频
    roomData.forEach(row => {
      // 处理聊天记录（content不为空且不是"NULL"且user_id存在）
      const userId = row.user_id || row.uid; // 兼容两种字段名
      const content = row.content?.trim();
      
      if (content && content !== '' && content.toUpperCase() !== 'NULL' && userId && userId.trim() !== '') {
        const createTime = row.create_time || '';
        chatMessages.push({
          uid: userId,
          message: content,
          create_time: createTime,
          audioUrl: audioUrlMap.get(createTime) // 匹配对应时间的音频
        });
      }
    });
    
    // 提取并去重risk_label_name
    const riskLabelNamesSet = new Set<string>();
    roomData.forEach(row => {
      const riskLabel = (row as any).risk_label_name;
      if (riskLabel && riskLabel.trim() !== '' && riskLabel.toUpperCase() !== 'NULL') {
        riskLabelNamesSet.add(riskLabel.trim());
      }
    });
    const riskLabelNames = Array.from(riskLabelNamesSet).sort();
    
    // 提取并去重该房间的所有user_id
    const userIdsSet = new Set<string>();
    roomData.forEach(row => {
      const userId = row.user_id || row.uid;
      if (userId && userId.trim() !== '') {
        userIdsSet.add(userId.trim());
      }
    });
    const userIds = Array.from(userIdsSet).sort();
    
    // 计算时长（以分钟为单位）
    let durationMinutes = 0;
    const validTimes = roomData
      .map(row => row.create_time)
      .filter(time => time && time.trim() !== '')
      .map(time => {
        try {
          return new Date(time!).getTime();
        } catch {
          return NaN;
        }
      })
      .filter(timestamp => !isNaN(timestamp))
      .sort((a, b) => a - b);
    
    if (validTimes.length >= 2) {
      const startTime = validTimes[0];
      const endTime = validTimes[validTimes.length - 1];
      durationMinutes = Math.round((endTime - startTime) / (1000 * 60)); // 转换为分钟
    }
    
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
    
    // 聊天记录按时间排序
    chatMessages.sort((a, b) => {
      if (!a.create_time && !b.create_time) return 0;
      if (!a.create_time) return 1;
      if (!b.create_time) return -1;
      return a.create_time.localeCompare(b.create_time);
    });
    
    setRoomDetails({
      jpgUrls,
      mp3Urls,
      chatMessages,
      riskLabelNames,
      userIds,
      durationMinutes,
      totalRows: roomData.length
    });
    setSelectedRoomId(roomId);
  };

  // 根据user_id筛选room_id
  const handleFilterByUser = (userId: string) => {
    if (!userId) {
      setFilterUserId(null);
      setFilteredRoomIds([]);
      return;
    }

    setFilterUserId(userId);
    
    // 从所有数据中找出包含该user_id的所有room_id
    const roomSet = new Set<string>();
    allData.forEach(row => {
      const rowUserId = row.user_id || row.uid;
      if (rowUserId && rowUserId.trim() === userId.trim()) {
        roomSet.add(row.room_id);
      }
    });
    
    setFilteredRoomIds(Array.from(roomSet).sort());
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
        {roomsWithOrder.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                房间列表 (按 Order 排序, {roomsWithOrder.length} 个)
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortOrder('asc')}
                  className={`px-4 py-2 text-sm rounded-md transition-all ${
                    sortOrder === 'asc'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  正序
                </button>
                <button
                  onClick={() => setSortOrder('desc')}
                  className={`px-4 py-2 text-sm rounded-md transition-all ${
                    sortOrder === 'desc'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  倒序
                </button>
              </div>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {(sortOrder === 'asc' ? roomsWithOrder : [...roomsWithOrder].reverse()).map((room, index) => (
                  <button
                    key={index}
                    onClick={() => handleRoomIdClick(room.roomId)}
                    className={`p-3 rounded-md text-sm font-mono transition-all duration-200 ${
                      selectedRoomId === room.roomId
                        ? 'bg-blue-600 text-white shadow-lg scale-105'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:scale-105'
                    }`}
                    title={`Room ID: ${room.roomId}`}
                  >
                    {room.order}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Room ID 详细信息 */}
        {roomDetails && selectedRoomId && (
          <div ref={detailContainerRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
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
              时长: {roomDetails.durationMinutes} 分钟 | 
              JPG数量: {roomDetails.jpgUrls.length} | 
              MP3数量: {roomDetails.mp3Urls.length} | 
              聊天记录: {roomDetails.chatMessages?.length || 0} | 
              Risk Label: {roomDetails.riskLabelNames?.length || 0} 种
            </div>

            {/* 根据User ID筛选 */}
            {roomDetails.userIds && roomDetails.userIds.length > 0 && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    按用户筛选 Room ID:
                  </label>
                  <select
                    value={filterUserId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value) {
                        handleFilterByUser(value);
                      } else {
                        setFilterUserId(null);
                        setFilteredRoomIds([]);
                      }
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">-- 选择用户 --</option>
                    {roomDetails.userIds.map((uid) => (
                      <option key={uid} value={uid}>
                        {uid}
                      </option>
                    ))}
                  </select>
                  {filterUserId && (
                    <button
                      onClick={() => {
                        setFilterUserId(null);
                        setFilteredRoomIds([]);
                      }}
                      className="px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600"
                    >
                      清除筛选
                    </button>
                  )}
                </div>
                
                {filteredRoomIds.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      包含用户 <span className="font-semibold">{filterUserId}</span> 的 Room ID ({filteredRoomIds.length} 个):
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {filteredRoomIds.map((id, index) => (
                        <button
                          key={index}
                          onClick={() => handleRoomIdClick(id)}
                          className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-md text-sm font-mono hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                        >
                          {id}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Risk Label统计 */}
            {roomDetails.riskLabelNames && roomDetails.riskLabelNames.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Risk Label 标签 (去重)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {roomDetails.riskLabelNames.map((label, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-sm font-medium"
                    >
                      {label}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 聊天记录列表 */}
            {roomDetails.chatMessages && roomDetails.chatMessages.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  聊天记录 (按时间排序)
                </h3>
                <div ref={chatContainerRef} className="space-y-2 max-h-96 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                  {roomDetails.chatMessages.map((msg, index) => (
                    <div
                      key={index}
                      className={`bg-white dark:bg-gray-800 rounded-lg p-3 border-l-4 ${getBorderColorForUid(msg.uid)} shadow-sm`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`flex-shrink-0 w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold ${getColorForUid(msg.uid)}`}>
                          {msg.uid.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900 dark:text-white text-sm">
                              {msg.uid}
                            </span>
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {msg.create_time || '无时间信息'}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300 break-words">
                            {msg.message}
                          </p>
                        </div>
                        {msg.audioUrl && (
                          <div className="flex-shrink-0">
                            <audio
                              controls
                              className="h-8 w-64 max-w-full"
                              preload="none"
                            >
                              <source src={msg.audioUrl} type="audio/mpeg" />
                              您的浏览器不支持音频播放。
                            </audio>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JPG 列表 */}
            {roomDetails.jpgUrls.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  JPG 图片列表 (按时间排序)
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-96 overflow-y-auto">
                  {roomDetails.jpgUrls.map((item, index) => (
                    <div
                      key={index}
                      className="relative group"
                    >
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block"
                      >
                        <img
                          src={item.url}
                          alt={`图片 ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg shadow-md hover:shadow-xl transition-all cursor-pointer border border-gray-200 dark:border-gray-600"
                          loading="lazy"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.style.display = 'none';
                            const errorDiv = document.createElement('div');
                            errorDiv.className = 'text-sm text-red-500 py-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center';
                            errorDiv.textContent = '加载失败';
                            img.parentElement?.appendChild(errorDiv);
                          }}
                        />
                      </a>
                      <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                        JPG
                      </div>
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

