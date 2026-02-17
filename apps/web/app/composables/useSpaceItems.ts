import { createSharedComposable } from "@vueuse/core";
import { useElectricSync } from "./useElectricSync";
import { usePgWorker } from "./usePgWorker";
import type { SyncedSpaceItem } from "./useSpaces";

// Local pending operations tracking
interface PendingOperation {
  id: string;
  type: "create" | "update" | "delete" | "reorder";
  timestamp: number;
  data?: any;
}

const _useSpaceItems = () => {
  const electric = useElectricSync();
  const pg = usePgWorker();

  // ========== STATE ==========
  // Space items by spaceId - local state (optimistic)
  const itemsBySpace = useState<Record<string, SyncedSpaceItem[]>>(
    "space-items-by-space",
    () => ({}),
  );

  // Loading states per space
  const loadingSpaces = useState<Set<string>>("space-items-loading", () => new Set());

  // Pending operations for optimistic updates
  const pendingOps = useState<PendingOperation[]>("space-items-pending-ops", () => []);

  // Sync errors per space
  const syncErrors = useState<Record<string, Error>>("space-items-errors", () => ({}));

  // Track Electric subscription
  let unsubscribeSpaceItems: (() => void) | null = null;
  let isSubscribed = false;

  // ========== GETTERS ==========
  /**
   * Get items for a specific space (sorted by order_index)
   */
  function getSpaceItems(spaceId: string): SyncedSpaceItem[] {
    return itemsBySpace.value[spaceId] || [];
  }

  /**
   * Get root items (no parent)
   */
  function getRootItems(spaceId: string): SyncedSpaceItem[] {
    return getSpaceItems(spaceId)
      .filter((item) => !item.parent_id)
      .sort((a, b) => a.order_index - b.order_index);
  }

  /**
   * Get children of a specific item
   */
  function getItemChildren(spaceId: string, parentId: string): SyncedSpaceItem[] {
    return getSpaceItems(spaceId)
      .filter((item) => item.parent_id === parentId)
      .sort((a, b) => a.order_index - b.order_index);
  }

  /**
   * Build tree structure from flat items
   */
  function buildItemTree(
    spaceId: string,
    parentId: string | null = null,
    level = 0,
  ): Array<SyncedSpaceItem & { children: ReturnType<typeof buildItemTree>; level: number }> {
    const children = getItemChildren(spaceId, parentId || "");

    return children.map((item) => ({
      ...item,
      children: buildItemTree(spaceId, item.id, level + 1),
      level,
    }));
  }

  /**
   * Check if space is loading
   */
  function isSpaceLoading(spaceId: string): boolean {
    return loadingSpaces.value.has(spaceId);
  }

  // ========== LOCAL STATE MANAGEMENT ==========
  /**
   * Set items for a space (from DB or Electric)
   */
  function setSpaceItems(spaceId: string, items: SyncedSpaceItem[]) {
    itemsBySpace.value[spaceId] = items;
  }

  /**
   * Add a single item to local state (optimistic)
   */
  function addItemLocal(spaceId: string, item: SyncedSpaceItem) {
    if (!itemsBySpace.value[spaceId]) {
      itemsBySpace.value[spaceId] = [];
    }
    itemsBySpace.value[spaceId].push(item);
  }

  /**
   * Update item in local state (optimistic)
   */
  function updateItemLocal(spaceId: string, itemId: string, updates: Partial<SyncedSpaceItem>) {
    const items = itemsBySpace.value[spaceId];
    if (!items) return;

    const index = items.findIndex((i) => i.id === itemId);
    if (index !== -1) {
      itemsBySpace.value[spaceId][index] = {
        ...items[index],
        ...updates,
        updated_at: new Date().toISOString(),
      };
    }
  }

  /**
   * Delete item from local state (optimistic)
   */
  function deleteItemLocal(spaceId: string, itemId: string) {
    const items = itemsBySpace.value[spaceId];
    if (!items) return;

    // Remove the item
    itemsBySpace.value[spaceId] = items.filter((i) => i.id !== itemId);

    // Move children to root (parent_id = null)
    itemsBySpace.value[spaceId] = itemsBySpace.value[spaceId].map((item) => {
      if (item.parent_id === itemId) {
        return { ...item, parent_id: null };
      }
      return item;
    });
  }

  /**
   * Reorder items in local state (optimistic)
   */
  function reorderItemsLocal(
    spaceId: string,
    updates: { id: string; order_index: number; parent_id: string | null }[],
  ) {
    const items = itemsBySpace.value[spaceId];
    if (!items) return;

    const now = new Date().toISOString();

    updates.forEach((update) => {
      const index = items.findIndex((i) => i.id === update.id);
      if (index !== -1) {
        itemsBySpace.value[spaceId][index] = {
          ...items[index],
          order_index: update.order_index,
          parent_id: update.parent_id,
          updated_at: now, // Set to current time for timestamp comparison
        };
      }
    });
  }

  // ========== OPTIMISTIC API OPERATIONS ==========
  /**
   * Create item - optimistic update
   */
  async function createItem(
    spaceId: string,
    data: {
      type: SyncedSpaceItem["type"];
      name: string;
      description?: string;
      icon?: string;
      color?: string;
      config?: Record<string, any>;
      parent_id?: string | null;
    },
  ): Promise<SyncedSpaceItem> {
    // Generate temp ID
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Create optimistic item
    const optimisticItem: SyncedSpaceItem = {
      id: tempId,
      space_id: spaceId,
      parent_id: data.parent_id || null,
      type: data.type,
      name: data.name,
      description: data.description || null,
      icon: data.icon || null,
      color: data.color || "#3b82f6",
      order_index: Date.now(), // Temporary high order
      config: data.config || {},
      created_by: "", // Will be set by server
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    };

    // Add pending operation
    const pendingOp: PendingOperation = {
      id: tempId,
      type: "create",
      timestamp: Date.now(),
      data,
    };
    pendingOps.value.push(pendingOp);

    // Optimistic update - add to local state immediately
    addItemLocal(spaceId, optimisticItem);

    try {
      // Call API
      const response = await $fetch<SyncedSpaceItem>(`/api/spaces/${spaceId}/items`, {
        method: "POST",
        body: data,
      });

      // Replace temp item with real item
      const items = itemsBySpace.value[spaceId];
      const index = items.findIndex((i) => i.id === tempId);
      if (index !== -1) {
        itemsBySpace.value[spaceId][index] = response;
      }

      return response;
    } catch (error) {
      // Rollback - remove temp item
      deleteItemLocal(spaceId, tempId);
      throw error;
    } finally {
      // Remove pending op
      pendingOps.value = pendingOps.value.filter((op) => op.id !== tempId);
    }
  }

  /**
   * Update item - optimistic update
   */
  async function updateItem(
    spaceId: string,
    itemId: string,
    updates: Partial<SyncedSpaceItem>,
  ): Promise<void> {
    // Store old values for rollback
    const items = itemsBySpace.value[spaceId];
    const item = items?.find((i) => i.id === itemId);
    const oldValues = item ? { ...item } : null;

    // Add pending operation
    const pendingOp: PendingOperation = {
      id: itemId,
      type: "update",
      timestamp: Date.now(),
      data: updates,
    };
    pendingOps.value.push(pendingOp);

    // Optimistic update
    updateItemLocal(spaceId, itemId, updates);

    try {
      // Call API
      await $fetch(`/api/space-items/${itemId}`, {
        method: "PATCH",
        body: updates,
      });
    } catch (error) {
      // Rollback
      if (oldValues) {
        updateItemLocal(spaceId, itemId, oldValues);
      }
      throw error;
    } finally {
      pendingOps.value = pendingOps.value.filter((op) => !(op.id === itemId && op.type === "update"));
    }
  }

  /**
   * Delete item - optimistic update
   */
  async function deleteItem(spaceId: string, itemId: string): Promise<void> {
    // Store item for rollback
    const items = itemsBySpace.value[spaceId];
    const item = items?.find((i) => i.id === itemId);

    // Add pending operation
    const pendingOp: PendingOperation = {
      id: itemId,
      type: "delete",
      timestamp: Date.now(),
    };
    pendingOps.value.push(pendingOp);

    // Optimistic update
    deleteItemLocal(spaceId, itemId);

    try {
      // Call API
      await $fetch(`/api/space-items/${itemId}`, {
        method: "DELETE",
      });
    } catch (error) {
      // Rollback - restore item
      if (item) {
        addItemLocal(spaceId, item);
      }
      throw error;
    } finally {
      pendingOps.value = pendingOps.value.filter((op) => !(op.id === itemId && op.type === "delete"));
    }
  }

  /**
   * Reorder items - optimistic update
   */
  async function reorderItems(
    spaceId: string,
    updates: { id: string; order_index: number; parent_id: string | null }[],
  ): Promise<void> {
    // Store old values for rollback
    const items = itemsBySpace.value[spaceId];
    const oldValues = updates.map((u) => {
      const item = items?.find((i) => i.id === u.id);
      return item
        ? { id: item.id, order_index: item.order_index, parent_id: item.parent_id }
        : null;
    }).filter(Boolean) as { id: string; order_index: number; parent_id: string | null }[];

    // Add pending operation
    const pendingOp: PendingOperation = {
      id: `reorder-${Date.now()}`,
      type: "reorder",
      timestamp: Date.now(),
      data: updates,
    };
    pendingOps.value.push(pendingOp);

    // Optimistic update
    reorderItemsLocal(spaceId, updates);

    try {
      // Call API
      await $fetch(`/api/spaces/${spaceId}/items/reorder`, {
        method: "POST",
        body: { items: updates },
      });
    } catch (error) {
      // Rollback
      reorderItemsLocal(spaceId, oldValues);
      throw error;
    } finally {
      pendingOps.value = pendingOps.value.filter((op) => op.id !== pendingOp.id);
    }
  }

  // ========== SYNC FROM DATABASE ==========
  /**
   * Load items from local PGlite (initial load)
   */
  async function loadItems(spaceId: string): Promise<void> {
    loadingSpaces.value.add(spaceId);

    try {
      const worker = await pg.init();
      const result = await worker.query<SyncedSpaceItem>(
        `SELECT * FROM space_items
         WHERE space_id = $1
         AND deleted_at IS NULL
         ORDER BY parent_id NULLS FIRST, order_index, name`,
        [spaceId],
      );

      setSpaceItems(spaceId, result.rows);
    } catch (error) {
      console.error(`[useSpaceItems] Failed to load items for space ${spaceId}:`, error);
      syncErrors.value[spaceId] = error as Error;
    } finally {
      loadingSpaces.value.delete(spaceId);
    }
  }

  /**
   * Subscribe to Electric SQL changes
   */
  async function subscribeToItems(spaceId: string): Promise<void> {
    if (isSubscribed) return;

    try {
      unsubscribeSpaceItems = await electric.subscribe<SyncedSpaceItem>({
        table: "space_items",
        callbacks: {
          onInsert: (item) => {
            // Skip if this is our own optimistic insert (check pending ops)
            const isPending = pendingOps.value.some(
              (op) => op.type === "create" && op.data?.name === item.name && op.timestamp > Date.now() - 5000,
            );
            if (isPending) return;

            // Only handle items for this space
            if (item.space_id !== spaceId) return;

            // Log Electric sync event
            console.log('[ELECTRIC] onInsert:', { id: item.id, name: item.name, type: item.type });

            // Add to local state if not exists
            const items = itemsBySpace.value[spaceId] || [];
            if (!items.find((i) => i.id === item.id)) {
              addItemLocal(spaceId, item);
            }
          },
          onUpdate: (item) => {
            // Skip if this is our own optimistic update
            const isPending = pendingOps.value.some(
              (op) =>
                (op.type === "update" || op.type === "reorder") &&
                (op.id === item.id || (op.data && op.data.some?.((u: any) => u.id === item.id))) &&
                op.timestamp > Date.now() - 15000,
            );
            if (isPending) return;

            // Only handle items for this space
            if (item.space_id !== spaceId) return;

            // Update local state
            const items = itemsBySpace.value[spaceId];
            if (items) {
              const index = items.findIndex((i) => i.id === item.id);
              if (index !== -1) {
                const localItem = items[index];
                
                // Check if local item is newer (optimistic update)
                const localUpdatedAt = new Date(localItem.updated_at).getTime();
                const remoteUpdatedAt = new Date(item.updated_at).getTime();
                
                if (localUpdatedAt > remoteUpdatedAt) return;
                
                // Compare with local - only update if different
                const hasChanges =
                  localItem.name !== item.name ||
                  localItem.parent_id !== item.parent_id ||
                  localItem.order_index !== item.order_index ||
                  localItem.description !== item.description ||
                  JSON.stringify(localItem.config) !== JSON.stringify(item.config);

                if (hasChanges) {
                  console.log('[ELECTRIC] onUpdate:', { 
                    id: item.id, 
                    name: item.name,
                    parent_id: item.parent_id, 
                    order_index: item.order_index 
                  });
                  itemsBySpace.value[spaceId][index] = item;
                }
              }
            }
          },
          onDelete: (id) => {
            // Skip if this is our own optimistic delete
            const isPending = pendingOps.value.some(
              (op) => op.type === "delete" && op.id === id && op.timestamp > Date.now() - 5000,
            );
            if (isPending) return;

            console.log('[ELECTRIC] onDelete:', { id });

            // Remove from all spaces (we don't know which space it belonged to)
            Object.keys(itemsBySpace.value).forEach((sid) => {
              deleteItemLocal(sid, id as string);
            });
          },
          onError: (error) => {
            console.error("[ELECTRIC] Sync error:", error);
          },
        },
      });

      isSubscribed = true;
    } catch (error) {
      console.error("[useSpaceItems] Failed to subscribe:", error);
    }
  }

  /**
   * Unsubscribe from Electric SQL
   */
  function unsubscribe() {
    if (unsubscribeSpaceItems) {
      unsubscribeSpaceItems();
      unsubscribeSpaceItems = null;
      isSubscribed = false;
    }
  }

  // ========== DRAG AND DROP HELPERS ==========
  /**
   * Handle drag end - move item to new position/parent
   */
  async function handleDragEnd(
    spaceId: string,
    draggedId: string,
    newParentId: string | null,
    newIndex: number,
  ): Promise<void> {
    const items = getSpaceItems(spaceId);
    const draggedItem = items.find((i) => i.id === draggedId);
    if (!draggedItem) return;

    const oldParentId = draggedItem.parent_id;

    // Get siblings in new position
    const siblings = items.filter(
      (i) => i.parent_id === newParentId && i.id !== draggedId,
    );

    // Calculate new order_index
    let newOrderIndex: number;
    if (siblings.length === 0) {
      newOrderIndex = 0;
    } else if (newIndex === 0) {
      newOrderIndex = siblings[0].order_index - 1;
    } else if (newIndex >= siblings.length) {
      newOrderIndex = siblings[siblings.length - 1].order_index + 1;
    } else {
      const prev = siblings[newIndex - 1];
      const next = siblings[newIndex];
      newOrderIndex = (prev.order_index + next.order_index) / 2;
    }

    // Update all items in the target parent to ensure proper ordering
    const updates: { id: string; order_index: number; parent_id: string | null }[] = [];

    // Add the dragged item update
    updates.push({
      id: draggedId,
      order_index: newOrderIndex,
      parent_id: newParentId,
    });

    // Reorder siblings if needed
    siblings.forEach((sibling, idx) => {
      updates.push({
        id: sibling.id,
        order_index: idx,
        parent_id: newParentId,
      });
    });

    // If moved from another parent, reorder old siblings too
    if (oldParentId !== newParentId) {
      const oldSiblings = items.filter(
        (i) => i.parent_id === oldParentId && i.id !== draggedId,
      );
      oldSiblings.forEach((sibling, idx) => {
        updates.push({
          id: sibling.id,
          order_index: idx,
          parent_id: oldParentId,
        });
      });
    }

    // Perform optimistic reorder
    await reorderItems(spaceId, updates);
  }

  return {
    // State
    itemsBySpace,
    pendingOps,
    syncErrors,

    // Getters
    getSpaceItems,
    getRootItems,
    getItemChildren,
    buildItemTree,
    isSpaceLoading,

    // Local state management
    setSpaceItems,
    addItemLocal,
    updateItemLocal,
    deleteItemLocal,
    reorderItemsLocal,

    // Optimistic API operations
    createItem,
    updateItem,
    deleteItem,
    reorderItems,

    // Sync
    loadItems,
    subscribeToItems,
    unsubscribe,

    // Drag and drop
    handleDragEnd,
  };
};

export const useSpaceItems = createSharedComposable(_useSpaceItems);
