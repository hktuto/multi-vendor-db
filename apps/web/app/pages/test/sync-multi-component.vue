<script setup lang="ts">import { useElectricSync } from "../../composables/useElectricSync";

/**
 * 多組件同 Table 訂閱測試頁面
 * 
 * 測試場景：
 * 1. 同一頁面內多個組件同時訂閱同一個 table
 * 2. 驗證共享 ShapeStream（只創建一個底層連接）
 * 3. 驗證獨立取消（A 取消後 B 還能收到事件）
 * 4. 觀察全局訂閱者數量變化
 */

definePageMeta({
  layout: "default",
});

const electric = useElectricSync();

// 刷新全局狀態
const refreshKey = ref(0);
function refreshStatus() {
  refreshKey.value++;
}

// 每秒刷新一次狀態
let intervalId: NodeJS.Timeout;
onMounted(() => {
  intervalId = setInterval(refreshStatus, 1000);
});
onUnmounted(() => {
  clearInterval(intervalId);
});

// 全局狀態顯示
const globalStatus = computed(() => {
  // trigger recompute
  refreshKey.value;
  return {
    syncing: electric.isSyncing.value,
    error: electric.error.value?.message || null,
    subscribedShapes: electric.getSubscribedShapes(),
    subscribedTables: electric.getSubscribedTables(),
  };
});

// 特定 table 的訂閱者數量
function getSubscriberCount(table: string): number {
  refreshKey.value; // trigger recompute
  return electric.getSubscriberCount(table);
}
</script>

<template>
  <div class="p-6 max-w-6xl mx-auto">
    <!-- 頁面標題 -->
    <div class="mb-6">
      <h1 class="text-2xl font-bold text-gray-900">🧪 Sync Lab - 多組件同 Table 測試</h1>
      <p class="text-gray-600 mt-2">
        測試多個組件同時訂閱同一個 table 時的共享訂閱行為
      </p>
    </div>

    <!-- 全局狀態面板 -->
    <div class="bg-gray-100 rounded-lg p-4 mb-6">
      <div class="flex items-center justify-between mb-3">
        <h2 class="font-bold text-gray-800">📊 全局狀態</h2>
        <button 
          @click="refreshStatus"
          class="text-sm bg-white px-3 py-1 rounded border hover:bg-gray-50"
        >
          🔄 刷新
        </button>
      </div>
      
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white rounded p-3">
          <div class="text-xs text-gray-500">Syncing</div>
          <div 
            class="font-bold"
            :class="globalStatus.syncing ? 'text-blue-600' : 'text-gray-600'"
          >
            {{ globalStatus.syncing ? "🔄 同步中" : "⏸️ 靜止" }}
          </div>
        </div>

        <div class="bg-white rounded p-3">
          <div class="text-xs text-gray-500">活躍 Shapes</div>
          <div class="font-bold text-gray-800">
            {{ globalStatus.subscribedShapes.length }}
          </div>
        </div>

        <div class="bg-white rounded p-3">
          <div class="text-xs text-gray-500">Tables</div>
          <div class="font-bold text-gray-800">
            {{ globalStatus.subscribedTables.join(", ") || "-" }}
          </div>
        </div>

        <div class="bg-white rounded p-3">
          <div class="text-xs text-gray-500">錯誤</div>
          <div 
            class="font-bold truncate"
            :class="globalStatus.error ? 'text-red-600' : 'text-green-600'"
          >
            {{ globalStatus.error || "✅ 無錯誤" }}
          </div>
        </div>
      </div>

      <!-- Shape 訂閱者詳情 -->
      <div v-if="globalStatus.subscribedShapes.length > 0" class="mt-4">
        <div class="text-sm font-medium text-gray-700 mb-2">Shape 訂閱者數量：</div>
        <div class="space-y-2">
          <div 
            v-for="shape in globalStatus.subscribedShapes" 
            :key="shape"
            class="flex items-center gap-2 bg-white rounded p-2"
          >
            <code class="text-sm bg-gray-100 px-2 py-1 rounded">{{ shape }}</code>
            <span class="text-sm">→</span>
            <span class="text-sm font-bold text-blue-600">
              {{ getSubscriberCount(shape) }} 個訂閱者
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 測試場景 1：同一 Table 多組件 -->
    <div class="mb-8">
      <div class="flex items-center gap-2 mb-4">
        <h2 class="text-lg font-bold text-gray-800">測試 1：同一 Table 多組件</h2>
        <span class="text-sm text-gray-500">（驗證共享訂閱）</span>
      </div>

      <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <p class="text-sm text-blue-800">
          💡 <strong>預期行為：</strong> 三個組件同時訂閱 <code>users</code> table，
          底層應該只有 <strong>1 個 ShapeStream</strong>。
          取消其中一個，另外兩個應該繼續收到事件。
        </p>
      </div>

      <div class="grid md:grid-cols-3 gap-4">
        <TestSyncSubscriberCard
          name="組件 A"
          table="users"
          color="blue"
        />
        <TestSyncSubscriberCard
          name="組件 B"
          table="users"
          color="green"
        />
        <TestSyncSubscriberCard
          name="組件 C"
          table="users"
          color="purple"
        />
      </div>
    </div>

    <!-- 測試場景 2：不同 Table -->
    <div class="mb-8">
      <div class="flex items-center gap-2 mb-4">
        <h2 class="text-lg font-bold text-gray-800">測試 2：不同 Table 對比</h2>
        <span class="text-sm text-gray-500">（驗證獨立連接）</span>
      </div>

      <div class="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-4">
        <p class="text-sm text-orange-800">
          💡 <strong>預期行為：</strong> 這兩個組件訂閱不同 tables，
          應該創建 <strong>獨立的 ShapeStream</strong>。
          全局狀態應該顯示 2 個活躍 shapes。
        </p>
      </div>

      <div class="grid md:grid-cols-2 gap-4">
        <TestSyncSubscriberCard
          name="組件 D (users)"
          table="users"
          color="orange"
        />
        <TestSyncSubscriberCard
          name="組件 E (companies)"
          table="companies"
          color="red"
        />
      </div>
    </div>

    <!-- 測試指南 -->
    <div class="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <h3 class="font-bold text-gray-800 mb-3">📋 測試步驟</h3>
      <ol class="list-decimal list-inside space-y-2 text-sm text-gray-700">
        <li>
          觀察「測試 1」的三個組件是否都顯示 🟢 訂閱中
        </li>
        <li>
          檢查全局狀態：<code>users</code> table 應該顯示 <strong>3 個訂閱者</strong>
        </li>
        <li>
          點擊「組件 A」的「取消訂閱」按鈕
        </li>
        <li>
          檢查全局狀態：<code>users</code> table 應該變成 <strong>2 個訂閱者</strong>
        </li>
        <li>
          繼續取消 B 和 C，當最後一個取消時 shape 應該完全清理
        </li>
        <li>
          測試「測試 2」的不同 table，驗證它們獨立計數
        </li>
      </ol>
    </div>
  </div>
</template>
