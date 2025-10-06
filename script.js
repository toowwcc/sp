// 视频存储数组
let videos = [];
let currentVideoUrl = '';
let db = null;
let isAdminMode = false;
let adminAuthenticated = false;

// IndexedDB 初始化
function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open('VideoShareDB', 2);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };
        
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            
            // 创建普通视频存储对象仓库
            if (!db.objectStoreNames.contains('videos')) {
                const videoStore = db.createObjectStore('videos', { keyPath: 'id' });
                videoStore.createIndex('title', 'title', { unique: false });
                videoStore.createIndex('uploadTime', 'uploadTime', { unique: false });
            }
            
            // 创建管理员视频存储对象仓库
            if (!db.objectStoreNames.contains('adminVideos')) {
                const adminVideoStore = db.createObjectStore('adminVideos', { keyPath: 'id' });
                adminVideoStore.createIndex('title', 'title', { unique: false });
                adminVideoStore.createIndex('uploadTime', 'uploadTime', { unique: false });
            }
        };
    });
}



// 显示管理员登录界面
function showAdminLogin() {
    const body = document.body;
    body.innerHTML = `
        <div class="admin-login-container">
            <div class="admin-login-box">
                <h2>管理员登录</h2>
                <input type="password" id="adminPassword" placeholder="请输入管理员密码" />
                <button onclick="verifyAdminPassword()">登录</button>
                <button onclick="exitAdminMode()">返回普通模式</button>
            </div>
        </div>
        <style>
            .admin-login-container {
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .admin-login-box {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                text-align: center;
                min-width: 300px;
            }
            .admin-login-box h2 {
                margin-bottom: 30px;
                color: #333;
            }
            .admin-login-box input {
                width: 100%;
                padding: 12px;
                margin-bottom: 20px;
                border: 1px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
                box-sizing: border-box;
            }
            .admin-login-box button {
                width: 100%;
                padding: 12px;
                margin: 5px 0;
                border: none;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                transition: background-color 0.3s;
            }
            .admin-login-box button:first-of-type {
                background: #667eea;
                color: white;
            }
            .admin-login-box button:first-of-type:hover {
                background: #5a6fd8;
            }
            .admin-login-box button:last-of-type {
                background: #f0f0f0;
                color: #333;
            }
            .admin-login-box button:last-of-type:hover {
                background: #e0e0e0;
            }
        </style>
    `;
}

// 验证管理员密码
async function verifyAdminPassword() {
    const password = document.getElementById('adminPassword').value;
    if (password === '254565') {
        adminAuthenticated = true;
        
        try {
            // 确保数据库已初始化
            if (!db) {
                console.log('重新初始化数据库...');
                await initDB();
            }
            
            // 恢复原始页面结构
            await restoreOriginalInterface();
            
            // 初始化管理员功能
            initializeUpload();
            initializeSearch();
            await loadVideos();
            displayVideos();
            addAdminIndicator();
            
            console.log('管理员模式初始化完成');
        } catch (error) {
            console.error('管理员模式初始化失败:', error);
            alert('管理员模式初始化失败，请刷新页面重试');
        }
    } else {
        alert('密码错误！');
        document.getElementById('adminPassword').value = '';
    }
}

// 恢复原始页面界面
async function restoreOriginalInterface() {
    // 创建原始页面结构
    document.body.innerHTML = `
        <div class="container">
            <header>
                <h1>视频共享网站</h1>
                <div class="search-container">
                    <input type="text" id="searchInput" placeholder="搜索视频...">
                    <button onclick="searchVideos()">搜索</button>
                </div>
            </header>

            <main>
                <!-- 上传区域 -->
                <section class="upload-section">
                    <h2>上传视频</h2>
                    <div class="upload-area" id="uploadArea">
                        <input type="file" id="videoFile" accept="video/*" style="display: none;">
                        <div class="upload-content">
                            <div class="upload-icon">📹</div>
                            <p>点击或拖拽视频文件到这里</p>
                            <p class="upload-hint">支持 MP4, AVI, MOV 等格式</p>
                        </div>
                    </div>
                    <div class="upload-form" id="uploadForm" style="display: none;">
                        <input type="text" id="videoTitle" placeholder="视频标题" required>
                        <textarea id="videoDescription" placeholder="视频描述"></textarea>
                        <button onclick="uploadVideo()">上传视频</button>
                        <button onclick="cancelUpload()">取消</button>
                    </div>
                </section>

                <!-- 视频列表 -->
                <section class="video-section">
                    <h2>视频列表</h2>
                    <div class="video-grid" id="videoGrid">
                        <!-- 视频卡片将在这里动态生成 -->
                    </div>
                </section>
            </main>

            <!-- 视频播放模态框 -->
            <div class="modal" id="videoModal">
                <div class="modal-content">
                    <span class="close" onclick="closeModal()">&times;</span>
                    <div class="video-player">
                        <video id="modalVideo" controls>
                            <source src="" type="video/mp4">
                            您的浏览器不支持视频播放。
                        </video>
                    </div>
                    <div class="video-info">
                        <h3 id="modalTitle"></h3>
                        <p id="modalDescription"></p>
                        <button id="downloadBtn" onclick="downloadVideo()" style="display: none;">下载视频</button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// 退出管理员模式
function exitAdminMode() {
    window.location.href = window.location.pathname;
}

// 显示管理视频界面
function showManageVideos() {
    // 创建管理视频模态框
    let manageModal = document.getElementById('manageModal');
    if (!manageModal) {
        manageModal = document.createElement('div');
        manageModal.id = 'manageModal';
        manageModal.className = 'modal';
        manageModal.innerHTML = `
            <div class="modal-content" style="max-width: 90%; max-height: 90%; overflow-y: auto;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; padding: 20px; border-bottom: 1px solid #ddd;">
                    <h2>📋 视频管理</h2>
                    <span class="close" onclick="closeManageModal()" style="font-size: 28px; cursor: pointer;">&times;</span>
                </div>
                <div class="manage-search" style="padding: 20px; border-bottom: 1px solid #ddd;">
                    <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 15px;">
                        <input type="text" id="manageSearchInput" placeholder="搜索视频..." style="flex: 1; padding: 10px;" onkeypress="if(event.key==='Enter') searchManageVideos()" oninput="searchManageVideos()">
                        <button onclick="searchManageVideos()" style="padding: 10px 20px;">搜索</button>
                        <button onclick="clearManageSearch()" style="padding: 10px 20px;">清空</button>
                    </div>
                    <div style="display: flex; align-items: center; gap: 10px; font-size: 14px;">
                        <span>排序:</span>
                        <select id="manageSortSelect" onchange="sortManageVideos()" style="padding: 5px 10px;">
                            <option value="uploadTime-desc">上传时间 (最新)</option>
                            <option value="uploadTime-asc">上传时间 (最早)</option>
                            <option value="title-asc">标题 (A-Z)</option>
                            <option value="title-desc">标题 (Z-A)</option>
                            <option value="size-desc">文件大小 (大到小)</option>
                            <option value="size-asc">文件大小 (小到大)</option>
                        </select>
                    </div>
                </div>
                <div class="manage-stats" id="manageStats" style="padding: 15px 20px; background: #f8f9fa; border-bottom: 1px solid #ddd; font-size: 14px; color: #666;">
                    <!-- 视频统计信息将在这里显示 -->
                </div>
                <div class="manage-video-list" id="manageVideoList" style="padding: 20px;">
                    <!-- 管理视频列表将在这里生成 -->
                </div>
            </div>
        `;
        document.body.appendChild(manageModal);
    }
    
    manageModal.style.display = 'block';
    
    // 添加点击外部关闭功能
    manageModal.onclick = function(event) {
        if (event.target === manageModal) {
            closeManageModal();
        }
    };
    
    loadManageVideos();
    
    // 添加ESC键关闭功能
    const handleEscKey = function(event) {
        if (event.key === 'Escape') {
            closeManageModal();
            document.removeEventListener('keydown', handleEscKey);
        }
    };
    document.addEventListener('keydown', handleEscKey);
}

// 关闭管理视频模态框
function closeManageModal() {
    const manageModal = document.getElementById('manageModal');
    if (manageModal) {
        manageModal.style.display = 'none';
        // 移除事件监听器
        manageModal.onclick = null;
    }
}

// 加载管理视频列表
async function loadManageVideos() {
    const manageVideoList = document.getElementById('manageVideoList');
    if (!manageVideoList) return;
    
    // 显示加载状态
    manageVideoList.innerHTML = '<div style="text-align: center; padding: 40px; color: #666;"><div style="font-size: 24px; margin-bottom: 10px;">⏳</div>正在加载视频...</div>';
    
    try {
        // 管理员模式需要加载所有视频（包括普通用户上传的视频）
        await loadAllVideosForManage();
        sortManageVideos(); // 应用排序
    } catch (error) {
        console.error('加载管理视频失败:', error);
        manageVideoList.innerHTML = '<div style="text-align: center; padding: 40px; color: #e74c3c;"><div style="font-size: 24px; margin-bottom: 10px;">❌</div>加载视频失败</div>';
    }
}

// 显示管理视频列表
function displayManageVideos(videosToShow) {
    const manageVideoList = document.getElementById('manageVideoList');
    const manageStats = document.getElementById('manageStats');
    if (!manageVideoList) return;
    
    // 更新统计信息
    if (manageStats) {
        const totalSize = videosToShow.reduce((sum, video) => sum + (video.fileSize || 0), 0);
        const searchInput = document.getElementById('manageSearchInput');
        const isSearching = searchInput && searchInput.value.trim();
        
        manageStats.innerHTML = `
            📊 ${isSearching ? '搜索结果: ' : '总计: '}${videosToShow.length} 个视频
            ${videosToShow.length > 0 ? ` | 总大小: ${formatFileSize(totalSize)}` : ''}
            ${isSearching ? ` | <span style="color: #3498db;">搜索关键词: "${searchInput.value.trim()}"</span>` : ''}
        `;
    }
    
    if (videosToShow.length === 0) {
        const searchInput = document.getElementById('manageSearchInput');
        const isSearching = searchInput && searchInput.value.trim();
        manageVideoList.innerHTML = `<div style="text-align: center; padding: 40px; color: #666;">
            <div style="font-size: 48px; margin-bottom: 20px;">${isSearching ? '🔍' : '📁'}</div>
            <p>${isSearching ? '没有找到匹配的视频' : '暂无视频'}</p>
            ${isSearching ? '<p style="margin-top: 10px; font-size: 14px;">尝试使用不同的关键词搜索</p>' : ''}
        </div>`;
        return;
    }
    
    manageVideoList.innerHTML = videosToShow.map(video => `
        <div class="manage-video-item" style="border: 1px solid #ddd; margin-bottom: 15px; padding: 15px; border-radius: 8px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 10px 0; color: #333;">${video.title}</h4>
                    <p style="margin: 0 0 10px 0; color: #666;">${video.description || '暂无描述'}</p>
                    <div style="font-size: 0.9em; color: #999;">
                        <span>文件大小: ${formatFileSize(video.fileSize)}</span> | 
                        <span>上传时间: ${video.uploadTime}</span>
                    </div>
                </div>
                <div style="display: flex; gap: 10px; margin-left: 20px;">
                    <button onclick="watchVideoInManage(${video.id})" 
                            style="padding: 8px 16px; background: #3498db; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        观看
                    </button>
                    <button onclick="deleteVideoInManage(${video.id})" 
                            style="padding: 8px 16px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        删除
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

// 搜索防抖动定时器
let searchTimeout = null;

// 搜索管理视频
function searchManageVideos() {
    // 清除之前的定时器
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // 设置新的定时器，300ms后执行搜索
    searchTimeout = setTimeout(() => {
        const searchInput = document.getElementById('manageSearchInput');
        if (!searchInput) return;
        
        const searchTerm = searchInput.value.toLowerCase().trim();
        
        if (!searchTerm) {
            displayManageVideos(videos);
            return;
        }
        
        // 先应用排序，再过滤
        sortManageVideos();
    }, 300);
}

// 清空管理搜索
function clearManageSearch() {
    const searchInput = document.getElementById('manageSearchInput');
    if (searchInput) {
        searchInput.value = '';
        sortManageVideos(); // 应用当前排序
    }
}

// 在管理界面观看视频
async function watchVideoInManage(videoId) {
    try {
        closeManageModal();
        await openVideoModalForManage(videoId);
    } catch (error) {
        console.error('观看视频失败:', error);
        alert('视频加载失败，请重试');
    }
}

// 在管理界面删除视频
async function deleteVideoInManage(videoId) {
    if (confirm('确定要删除这个视频吗？')) {
        try {
            await deleteVideoFromAllStores(videoId);
            await loadManageVideos(); // 重新加载管理视频列表
        } catch (error) {
            console.error('删除视频失败:', error);
            alert('删除视频失败');
        }
    }
}

// 排序管理视频
function sortManageVideos() {
    const sortSelect = document.getElementById('manageSortSelect');
    if (!sortSelect) return;
    
    const [sortBy, sortOrder] = sortSelect.value.split('-');
    
    let sortedVideos = [...videos];
    
    sortedVideos.sort((a, b) => {
        let valueA, valueB;
        
        switch (sortBy) {
            case 'uploadTime':
                valueA = new Date(a.uploadTime);
                valueB = new Date(b.uploadTime);
                break;
            case 'title':
                valueA = a.title.toLowerCase();
                valueB = b.title.toLowerCase();
                break;
            case 'size':
                valueA = a.fileSize || 0;
                valueB = b.fileSize || 0;
                break;
            default:
                return 0;
        }
        
        if (sortOrder === 'asc') {
            return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
        } else {
            return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
        }
    });
    
    // 如果有搜索条件，需要重新过滤
    const searchInput = document.getElementById('manageSearchInput');
    if (searchInput && searchInput.value.trim()) {
        const searchTerm = searchInput.value.toLowerCase().trim();
        sortedVideos = sortedVideos.filter(video => 
            video.title.toLowerCase().includes(searchTerm) ||
            (video.description && video.description.toLowerCase().includes(searchTerm)) ||
            video.fileName.toLowerCase().includes(searchTerm)
        );
    }
    
    displayManageVideos(sortedVideos);
}

// 初始化管理员界面
async function initAdminInterface() {
    // 不需要重新加载，直接初始化
    return;
}

// 添加管理员模式标识
function addAdminIndicator() {
    const header = document.querySelector('h1');
    if (header) {
        header.innerHTML = '🔒 管理员视频库';
        header.style.color = '#e74c3c';
    }
    
    // 添加管理视频按钮
    const container = document.querySelector('.container');
    if (container) {
        const manageButton = document.createElement('button');
        manageButton.textContent = '管理视频';
        manageButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 180px;
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
            font-size: 14px;
        `;
        manageButton.onclick = showManageVideos;
        document.body.appendChild(manageButton);
        
        // 添加退出管理员模式按钮
        const exitButton = document.createElement('button');
        exitButton.textContent = '退出管理员模式';
        exitButton.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #e74c3c;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 5px;
            cursor: pointer;
            z-index: 1000;
            font-size: 14px;
        `;
        exitButton.onclick = exitAdminMode;
        document.body.appendChild(exitButton);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await initDB();
        
        // 检查是否为管理员模式
        const urlParams = new URLSearchParams(window.location.search);
        isAdminMode = urlParams.has('admin');
        
        if (isAdminMode) {
            // 显示管理员登录界面
            showAdminLogin();
        } else {
            // 普通模式初始化
            initializeUpload();
            initializeSearch();
            await loadVideos();
            displayVideos();
        }
    } catch (error) {
        console.error('初始化失败:', error);
        alert('数据库初始化失败，请刷新页面重试');
    }
});

// 初始化上传功能
function initializeUpload() {
    const uploadArea = document.getElementById('uploadArea');
    const videoFile = document.getElementById('videoFile');

    // 点击上传区域
    uploadArea.addEventListener('click', () => {
        videoFile.click();
    });

    // 文件选择事件
    videoFile.addEventListener('change', handleFileSelect);

    // 拖拽事件
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].type.startsWith('video/')) {
            videoFile.files = files;
            handleFileSelect();
        }
    });
}

// 处理文件选择
function handleFileSelect() {
    const file = document.getElementById('videoFile').files[0];
    if (file && file.type.startsWith('video/')) {
        document.getElementById('uploadArea').style.display = 'none';
        document.getElementById('uploadForm').style.display = 'block';
        document.getElementById('videoTitle').value = file.name.replace(/\.[^/.]+$/, "");
    }
}

// 上传视频
async function uploadVideo() {
    const file = document.getElementById('videoFile').files[0];
    const title = document.getElementById('videoTitle').value.trim();
    const description = document.getElementById('videoDescription').value.trim();

    if (!file || !title) {
        alert('请选择视频文件并输入标题！');
        return;
    }

    try {
        // 显示上传进度
        const uploadBtn = document.querySelector('#uploadForm button');
        const originalText = uploadBtn.textContent;
        uploadBtn.textContent = '上传中...';
        uploadBtn.disabled = true;

        // 将文件转换为 ArrayBuffer 以便存储到 IndexedDB
        const arrayBuffer = await file.arrayBuffer();
        
        // 创建视频对象
        const video = {
            id: Date.now(),
            title: title,
            description: description,
            fileName: file.name,
            fileType: file.type,
            fileSize: file.size,
            uploadTime: new Date().toLocaleString('zh-CN'),
            fileData: arrayBuffer // 存储文件的二进制数据
        };

        // 保存到 IndexedDB
        await saveVideoToDB(video);
        
        // 添加到内存数组
        videos.push(video);
        
        // 重新显示视频列表
        displayVideos();
        
        // 重置上传表单
        resetUploadForm();
        
        // 恢复按钮状态
        uploadBtn.textContent = originalText;
        uploadBtn.disabled = false;
        
        alert('视频上传成功！');
    } catch (error) {
        console.error('上传失败:', error);
        alert('视频上传失败，请重试');
        
        // 恢复按钮状态
        const uploadBtn = document.querySelector('#uploadForm button');
        uploadBtn.textContent = '上传视频';
        uploadBtn.disabled = false;
    }
}

// 取消上传
function cancelUpload() {
    resetUploadForm();
}

// 重置上传表单
function resetUploadForm() {
    document.getElementById('uploadArea').style.display = 'block';
    document.getElementById('uploadForm').style.display = 'none';
    document.getElementById('videoFile').value = '';
    document.getElementById('videoTitle').value = '';
    document.getElementById('videoDescription').value = '';
}

// 保存视频到 IndexedDB
function saveVideoToDB(video) {
    return new Promise((resolve, reject) => {
        const storeName = isAdminMode && adminAuthenticated ? 'adminVideos' : 'videos';
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(video);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 从 IndexedDB 加载所有视频
function loadVideos() {
    return new Promise((resolve, reject) => {
        const storeName = isAdminMode && adminAuthenticated ? 'adminVideos' : 'videos';
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        
        request.onsuccess = () => {
            videos = request.result;
            resolve(videos);
        };
        request.onerror = () => reject(request.error);
    });
}

// 为管理界面加载所有视频（包括普通用户和管理员上传的视频）
function loadAllVideosForManage() {
    return new Promise(async (resolve, reject) => {
        try {
            const allVideos = [];
            
            // 加载普通用户视频
            try {
                const transaction1 = db.transaction(['videos'], 'readonly');
                const store1 = transaction1.objectStore('videos');
                const request1 = store1.getAll();
                
                const userVideos = await new Promise((res, rej) => {
                    request1.onsuccess = () => res(request1.result);
                    request1.onerror = () => rej(request1.error);
                });
                
                allVideos.push(...userVideos);
            } catch (error) {
                console.log('普通用户视频存储区为空或不存在');
            }
            
            // 加载管理员视频
            try {
                const transaction2 = db.transaction(['adminVideos'], 'readonly');
                const store2 = transaction2.objectStore('adminVideos');
                const request2 = store2.getAll();
                
                const adminVideos = await new Promise((res, rej) => {
                    request2.onsuccess = () => res(request2.result);
                    request2.onerror = () => rej(request2.error);
                });
                
                allVideos.push(...adminVideos);
            } catch (error) {
                console.log('管理员视频存储区为空或不存在');
            }
            
            // 去重（基于ID）
            const uniqueVideos = [];
            const seenIds = new Set();
            
            for (const video of allVideos) {
                if (!seenIds.has(video.id)) {
                    seenIds.add(video.id);
                    uniqueVideos.push(video);
                }
            }
            
            videos = uniqueVideos;
            resolve(videos);
        } catch (error) {
            reject(error);
        }
    });
}

// 从 IndexedDB 获取单个视频
function getVideoFromDB(videoId) {
    return new Promise((resolve, reject) => {
        const storeName = isAdminMode && adminAuthenticated ? 'adminVideos' : 'videos';
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(videoId);
        
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// 从所有存储区获取单个视频（用于管理界面）
function getVideoFromAllStores(videoId) {
    return new Promise((resolve, reject) => {
        // 确保数据库已初始化
        if (!db) {
            reject(new Error('数据库未初始化'));
            return;
        }

        let foundVideo = null;
        let completedStores = 0;
        const totalStores = 2;

        // 检查是否所有存储区都已检查完毕
        function checkComplete() {
            completedStores++;
            if (completedStores === totalStores) {
                resolve(foundVideo);
            }
        }

        // 从普通用户存储区获取
        try {
            const transaction1 = db.transaction(['videos'], 'readonly');
            const store1 = transaction1.objectStore('videos');
            const request1 = store1.get(videoId);
            
            request1.onsuccess = () => {
                if (request1.result && !foundVideo) {
                    foundVideo = request1.result;
                    resolve(foundVideo);
                } else {
                    checkComplete();
                }
            };
            
            request1.onerror = () => {
                console.log('从普通用户存储区获取视频失败:', request1.error);
                checkComplete();
            };
        } catch (error) {
            console.log('访问普通用户存储区失败:', error);
            checkComplete();
        }

        // 从管理员存储区获取
        try {
            const transaction2 = db.transaction(['adminVideos'], 'readonly');
            const store2 = transaction2.objectStore('adminVideos');
            const request2 = store2.get(videoId);
            
            request2.onsuccess = () => {
                if (request2.result && !foundVideo) {
                    foundVideo = request2.result;
                    resolve(foundVideo);
                } else {
                    checkComplete();
                }
            };
            
            request2.onerror = () => {
                console.log('从管理员存储区获取视频失败:', request2.error);
                checkComplete();
            };
        } catch (error) {
            console.log('访问管理员存储区失败:', error);
            checkComplete();
        }
    });
}

// 从 IndexedDB 删除视频
function deleteVideoFromDB(videoId) {
    return new Promise((resolve, reject) => {
        const storeName = isAdminMode && adminAuthenticated ? 'adminVideos' : 'videos';
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(videoId);
        
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// 从所有存储区删除视频（用于管理界面）
function deleteVideoFromAllStores(videoId) {
    return new Promise(async (resolve, reject) => {
        try {
            let deleted = false;
            
            // 尝试从普通用户存储区删除
            try {
                const transaction1 = db.transaction(['videos'], 'readwrite');
                const store1 = transaction1.objectStore('videos');
                const request1 = store1.delete(videoId);
                
                await new Promise((res, rej) => {
                    request1.onsuccess = () => {
                        deleted = true;
                        res();
                    };
                    request1.onerror = () => rej(request1.error);
                });
            } catch (error) {
                console.log('从普通用户存储区删除失败或不存在:', error);
            }
            
            // 尝试从管理员存储区删除
            try {
                const transaction2 = db.transaction(['adminVideos'], 'readwrite');
                const store2 = transaction2.objectStore('adminVideos');
                const request2 = store2.delete(videoId);
                
                await new Promise((res, rej) => {
                    request2.onsuccess = () => {
                        deleted = true;
                        res();
                    };
                    request2.onerror = () => rej(request2.error);
                });
            } catch (error) {
                console.log('从管理员存储区删除失败或不存在:', error);
            }
            
            if (deleted) {
                resolve();
            } else {
                reject(new Error('视频未找到或删除失败'));
            }
        } catch (error) {
            reject(error);
        }
    });
}

// 显示视频列表
function displayVideos(filteredVideos = null) {
    const videoGrid = document.getElementById('videoGrid');
    const videosToShow = filteredVideos || videos;

    if (videosToShow.length === 0) {
        videoGrid.innerHTML = '<div class="no-videos">暂无视频</div>';
        return;
    }

    videoGrid.innerHTML = videosToShow.map(video => `
        <div class="video-card" onclick="openVideoModal(${video.id})">
            <div class="video-thumbnail">
                🎬
            </div>
            <div class="video-card-content">
                <h3>${video.title}</h3>
                <p>${video.description || '暂无描述'}</p>
                <p style="font-size: 0.8em; color: #999; margin-top: 10px;">
                    文件大小: ${formatFileSize(video.fileSize)}<br>
                    上传时间: ${video.uploadTime}
                </p>
            </div>
        </div>
    `).join('');
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 搜索视频
function searchVideos() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;
    
    const searchTerm = searchInput.value.toLowerCase().trim();
    
    if (!searchTerm) {
        displayVideos();
        return;
    }

    const filteredVideos = videos.filter(video => 
        video.title.toLowerCase().includes(searchTerm) ||
        (video.description && video.description.toLowerCase().includes(searchTerm)) ||
        video.fileName.toLowerCase().includes(searchTerm)
    );

    displayVideos(filteredVideos);
    
    // 显示搜索结果提示
    const videoGrid = document.getElementById('videoGrid');
    if (filteredVideos.length === 0) {
        videoGrid.innerHTML = `<div class="no-videos">未找到包含"${searchTerm}"的视频</div>`;
    }
}

// 初始化搜索功能
function initializeSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        // 搜索框回车事件
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                searchVideos();
            }
        });
        
        // 实时搜索（可选）
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            if (searchTerm === '') {
                displayVideos(); // 清空搜索时显示所有视频
            }
        });
    }
}

// 打开视频模态框
async function openVideoModal(videoId) {
    try {
        // 从数据库获取完整的视频数据
        const video = await getVideoFromDB(videoId);
        if (!video) return;

        const modal = document.getElementById('videoModal');
        const modalVideo = document.getElementById('modalVideo');
        const modalTitle = document.getElementById('modalTitle');
        const modalDescription = document.getElementById('modalDescription');

        modalTitle.textContent = video.title;
        modalDescription.textContent = video.description || '暂无描述';

        // 从 ArrayBuffer 创建 Blob 和 URL
        const blob = new Blob([video.fileData], { type: video.fileType });
        const videoUrl = URL.createObjectURL(blob);
        
        modalVideo.src = videoUrl;
        currentVideoUrl = videoUrl;
        
        // 保存当前视频信息用于下载
        window.currentVideo = video;
        
        document.getElementById('downloadBtn').style.display = 'inline-block';
        modal.style.display = 'block';
        
    } catch (error) {
        console.error('打开视频失败:', error);
        alert('视频加载失败，请重试');
    }
}

// 为管理界面打开视频模态框
async function openVideoModalForManage(videoId) {
    try {
        console.log('开始加载视频，ID:', videoId);
        
        // 从所有存储区获取完整的视频数据
        const video = await getVideoFromAllStores(videoId);
        console.log('获取到的视频数据:', video);
        
        if (!video) {
            console.error('视频不存在，ID:', videoId);
            alert('视频不存在或已被删除');
            return;
        }

        // 检查视频数据完整性
        if (!video.fileData || !video.fileType) {
            console.error('视频数据不完整:', video);
            alert('视频数据损坏，无法播放');
            return;
        }

        const modal = document.getElementById('videoModal');
        const modalVideo = document.getElementById('modalVideo');
        const modalTitle = document.getElementById('modalTitle');
        const modalDescription = document.getElementById('modalDescription');

        if (!modal || !modalVideo || !modalTitle || !modalDescription) {
            console.error('视频模态框元素未找到');
            alert('页面元素加载异常，请刷新页面重试');
            return;
        }

        modalTitle.textContent = video.title;
        modalDescription.textContent = video.description || '暂无描述';

        // 清理之前的视频URL
        if (currentVideoUrl) {
            URL.revokeObjectURL(currentVideoUrl);
        }

        // 从 ArrayBuffer 创建 Blob 和 URL
        console.log('创建视频Blob，类型:', video.fileType, '大小:', video.fileData.byteLength);
        const blob = new Blob([video.fileData], { type: video.fileType });
        const videoUrl = URL.createObjectURL(blob);
        
        console.log('创建的视频URL:', videoUrl);
        
        modalVideo.src = videoUrl;
        currentVideoUrl = videoUrl;
        
        // 添加视频加载事件监听
        modalVideo.onloadeddata = () => {
            console.log('视频数据加载完成');
        };
        
        modalVideo.onerror = (e) => {
            // 只在视频源不为空时显示错误，避免在关闭模态框时误报
            if (modalVideo.src && modalVideo.src !== '' && modalVideo.src !== 'about:blank') {
                console.error('视频播放错误:', e);
                alert('视频播放失败，可能是格式不支持');
            }
        };
        
        // 保存当前视频信息用于下载
        window.currentVideo = video;
        
        const downloadBtn = document.getElementById('downloadBtn');
        if (downloadBtn) {
            downloadBtn.style.display = 'inline-block';
        }
        
        modal.style.display = 'block';
        console.log('视频模态框已显示');
        
    } catch (error) {
        console.error('打开视频失败:', error);
        alert(`视频加载失败：${error.message || '未知错误'}`);
    }
}

// 关闭模态框
function closeModal() {
    const modal = document.getElementById('videoModal');
    const modalVideo = document.getElementById('modalVideo');
    
    modal.style.display = 'none';
    modalVideo.pause();
    
    // 清理事件监听器，避免在设置空src时触发error事件
    modalVideo.onerror = null;
    modalVideo.onloadeddata = null;
    
    modalVideo.src = '';
    
    // 释放URL对象
    if (currentVideoUrl) {
        URL.revokeObjectURL(currentVideoUrl);
        currentVideoUrl = '';
    }
    
    // 清理当前视频引用
    window.currentVideo = null;
}

// 下载视频
function downloadVideo() {
    if (!currentVideoUrl || !window.currentVideo) {
        alert('视频文件不可用');
        return;
    }

    try {
        // 创建下载链接
        const link = document.createElement('a');
        link.href = currentVideoUrl;
        link.download = window.currentVideo.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('下载失败:', error);
        alert('视频下载失败，请重试');
    }
}

// 删除视频
async function deleteVideo(videoId) {
    if (!confirm('确定要删除这个视频吗？此操作不可恢复。')) {
        return;
    }

    try {
        // 从数据库删除
        await deleteVideoFromDB(videoId);
        
        // 从内存数组中移除
        videos = videos.filter(v => v.id !== videoId);
        
        // 重新显示列表
        displayVideos();
        
        alert('视频删除成功');
    } catch (error) {
        console.error('删除失败:', error);
        alert('视频删除失败，请重试');
    }
}

// 点击模态框外部关闭
window.addEventListener('click', function(event) {
    const modal = document.getElementById('videoModal');
    if (event.target === modal) {
        closeModal();
    }
});

// 键盘事件
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// 清理无效的视频记录（可选功能）
function cleanupVideos() {
    const validVideos = videos.filter(video => video.url && video.file);
    if (validVideos.length !== videos.length) {
        videos = validVideos;
        saveVideos();
        displayVideos();
    }
}