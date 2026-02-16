<script setup lang="ts">
import { useElectricSync, type SyncEventCallbacks } from "../../composables/useElectricSync";

interface Props {
  /** 組件標識名稱 */
  name: string;
  /** 訂閱的表名 */
  table: string;
  /** 組件顏色 */
  color?: string;
}

const props = withDefaults(defineProps<Props>(), {
  color: "blue",
});

const electric = useElectricSync();

// 本地狀態
const eventCount = ref(0);
const lastEvent = ref<string>("-");
const isSubscribed = ref(false);
const logs = ref<string[]>([]);

let unsubscribeFn: (() => void) | null = null;

// 添加日誌
function addLog(message: string) {
  const time = new Date().toLocaleTimeString("zh-HK", { 
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  logs.value.unshift(`[${time}] ${message}`);
  if (logs.value.length > 10) logs.value.pop();
}

// 開始訂閱
async function subscribe() {
  if (isSubscribed.value) return;

  addLog("開始訂閱...");

  const callbacks: SyncEventCallbacks = {
    onInsert: (data) => {
      eventCount.value++;
      lastEvent.value = `insert: ${data.id || 'unknown'}`;
      addLog(`📥 Insert: ${JSON.stringify(data).slice(0, 50)}...`);
    },
    onUpdate: (data, oldData) => {
      eventCount.value++;
      lastEvent.value = `update: ${data.id || 'unknown'}`;
      addLog(`📝 Update: ${data.id || 'unknown'}`);
    },
    onDelete: (id) => {
      eventCount.value++;
      lastEvent.value = `delete: ${id}`;
      addLog(`🗑️ Delete: ${id}`);
    },
    onUpToDate: () => {
      addLog("✅ Up to date!");
    },
    onError: (err) => {
      addLog(`❌ Error: ${err.message}`);
    },
  };

  try {
    unsubscribeFn = await electric.subscribe({
      table: props.table,
      callbacks,
    });
    isSubscribed.value = true;
    addLog("訂閱成功");
  } catch (err) {
    addLog(`❌ 訂閱失敗: ${(err as Error).message}`);
  }
}

// 取消訂閱
function unsubscribe() {
  if (unsubscribeFn) {
    unsubscribeFn();
    unsubscribeFn = null;
    isSubscribed.value = false;
    addLog("已取消訂閱");
  }
}

// 組件卸載時自動取消
onUnmounted(() => {
  unsubscribe();
});

// 自動訂閱（可選）
onMounted(() => {
  subscribe();
});

// 計算屬性
const borderColorClass = computed(() => {
  const colors: Record<string, string> = {
    blue: "border-blue-500",
    green: "border-green-500",
    purple: "border-purple-500",
    orange: "border-orange-500",
    red: "border-red-500",
  };
  return colors[props.color] || "border-gray-500";
});

const bgColorClass = computed(() => {
  const colors: Record<string, string> = {
    blue: "bg-blue-50",
    green: "bg-green-50",
    purple: "bg-purple-50",
    orange: "bg-orange-50",
    red: "bg-red-50",
  };
  return colors[props.color] || "bg-gray-50";
});
</script>

<template>
  <div 
    class="rounded-lg border-2 p-4 shadow-sm"
    :class="[borderColorClass, bgColorClass]"
  >
    <!-- 頭部 -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="font-bold text-gray-800">{{ name }}</h3>
      <span 
        class="px-2 py-1 rounded text-xs font-medium"
        :class="isSubscribed ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'"
      >
        {{ isSubscribed ? "🟢 訂閱中" : "⚪ 未訂閱" }}
      </span>
    </div>

    <!-- Table 信息 -->
    <div class="text-sm text-gray-600 mb-3">
      Table: <code class="bg-white px-1 rounded">{{ table }}</code>
    </div>

    <!-- 統計 -->
    <div class="grid grid-cols-2 gap-2 mb-3">
      <div class="bg-white rounded p-2 text-center">
        <div class="text-2xl font-bold text-gray-800">{{ eventCount }}</div>
        <div class="text-xs text-gray-500">事件數</div>
      </div>
      <div class="bg-white rounded p-2 text-center">
        <div class="text-xs text-gray-500 truncate">{{ lastEvent }}</div>
        <div class="text-xs text-gray-500">最近事件</div>
      </div>
    </div>

    <!-- 日誌 -->
    <div class="bg-black rounded p-2 mb-3 h-32 overflow-y-auto font-mono text-xs">
      <div v-if="logs.length === 0" class="text-gray-500 italic">
        等待事件...
      </div>
      <div 
        v-for="(log, i) in logs" 
        :key="i"
        class="text-green-400 mb-1"
      >
        {{ log }}
      </div>
    </div>

    <!-- 控制按鈕 -->
    <div class="flex gap-2">
      <button
        v-if="!isSubscribed"
        @click="subscribe"
        class="flex-1 bg-blue-500 text-white px-3 py-2 rounded text-sm hover:bg-blue-600 transition"
      >
        訂閱
      </button>
      <button
        v-else
        @click="unsubscribe"
        class="flex-1 bg-red-500 text-white px-3 py-2 rounded text-sm hover:bg-red-600 transition"
      >
        取消訂閱
      </button>
    </div>
  </div>
</template>
