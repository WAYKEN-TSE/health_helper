<template>
  <div class="section">
    <!-- 折叠触发器 -->
    <button class="collapse-trigger" @click="isOpen = !isOpen">
      <span>🥗 食材管理 <span style="color: var(--text-muted); font-weight: 400;">(已选 {{ selectedCount }})</span></span>
      <span class="collapse-trigger__arrow" :class="{ 'collapse-trigger__arrow--open': isOpen }">▼</span>
    </button>

    <!-- 折叠内容 -->
    <div class="collapse-body" :class="isOpen ? 'collapse-body--open' : 'collapse-body--closed'">
      <div class="ingredient-content card" style="margin-top: var(--space-sm); border-top-left-radius: var(--radius-sm); border-top-right-radius: var(--radius-sm);">
        <!-- 全选/全不选 -->
        <div class="bulk-actions">
          <button class="btn btn--ghost btn--sm" @click="selectAll">✅ 全选</button>
          <button class="btn btn--ghost btn--sm" @click="selectNone">❌ 全不选</button>
        </div>

        <!-- 分类食材 -->
        <div v-for="(items, category) in categorizedIngredients" :key="category" class="category-group">
          <!-- 分类标题栏重构为操作区 -->
          <div class="category-header">
            <div class="header-left-group">
              <div class="category-group__title">{{ categoryEmoji[category] }} {{ category }}</div>
              
              <template v-if="activeDeleteCategory === category">
                <div class="delete-actions">
                  <button class="btn btn--danger btn--sm delete-btn" @click="confirmDelete(category)">确认</button>
                  <button class="btn btn--ghost btn--sm delete-btn" @click="cancelDelete">取消</button>
                </div>
              </template>
              <template v-else>
                <div v-if="activeCategory === category" class="inline-input-wrapper">
                  <input
                    ref="inputRef"
                    v-model="customInput"
                    class="inline-input"
                    placeholder="输入名称并回车..."
                    @keyup.enter="addCustom(category)"
                    @keyup.esc="cancelInput"
                    @blur="handleBlur(category)"
                  />
                </div>
                <div v-else class="trigger-group">
                  <button class="add-trigger" @click="openInput(category)" title="添加自定义食材">+</button>
                  <button class="add-trigger delete-trigger" @click="openDelete(category)" title="批量删除食材">-</button>
                </div>
              </template>
            </div>
            
            <!-- 分类级批量操作 -->
            <div class="category-bulk-actions">
              <button class="link-btn" @click="selectCategoryAll(category, items)">全选</button>
              <span class="divider"></span>
              <button class="link-btn" @click="selectCategoryNone(category, items)">全不选</button>
            </div>
          </div>

          <div class="ingredient-grid">
            <label
              v-for="item in items"
              :key="item.id"
              class="checkbox"
              :class="{ 
                'checkbox--custom': item.isCustom, 
                'checkbox--delete-mode': activeDeleteCategory === category 
              }"
            >
              <input
                type="checkbox"
                :checked="activeDeleteCategory === category ? itemsToDelete.includes(item.id) : selected.includes(item.id)"
                @change="handleCheckboxChange(category, item.id)"
              />
              <span class="checkbox__label">{{ item.name }}</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- 轻量级触发器提示 -->
  <div v-if="toastMsg" class="toast-notification">
    {{ toastMsg }}
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { getIngredientsByCategory, getAllIngredients } from '../data/recipes.js'

const props = defineProps({
  recipesData: Object,
  selected: Array,
  customIngredients: Array,
  deletedIngredients: { type: Array, default: () => [] }
})

const emit = defineEmits(['update:selected', 'update:customIngredients', 'update:deletedIngredients'])

const isOpen = ref(false)
const activeCategory = ref(null)
const customInput = ref('')
const inputRef = ref(null)
const toastMsg = ref('')

const activeDeleteCategory = ref(null)
const itemsToDelete = ref([])

const categoryEmoji = {
  碳水: '🍚',
  蛋白质: '🥩',
  微量元素: '🥬',
  加餐: '🍫'
}

const selectedCount = computed(() => props.selected.length)

const categorizedIngredients = computed(() => {
  const base = getIngredientsByCategory(props.recipesData)
  const result = {}
  const deletedSet = new Set(props.deletedIngredients || [])

  // 过滤掉已删除的静态食材
  for (const key in base) {
    result[key] = base[key].filter(i => !deletedSet.has(i.id))
  }
  
  // 合并自定义食材到对应分类
  if (props.customIngredients.length > 0) {
    props.customIngredients.forEach(c => {
      if (deletedSet.has(c.id)) return
      
      const cat = c.category
      if (result[cat]) {
        result[cat].push({ ...c, isCustom: true })
      } else {
        if (!result['加餐']) result['加餐'] = []
        result['加餐'].push({ ...c, isCustom: true })
      }
    })
  }
  return result
})

function toggleItem(id) {
  const idx = props.selected.indexOf(id)
  const next = [...props.selected]
  if (idx >= 0) {
    next.splice(idx, 1)
  } else {
    next.push(id)
  }
  emit('update:selected', next)
}

function selectAll() {
  const allIds = Object.values(categorizedIngredients.value)
    .flat()
    .map(i => i.id)
  emit('update:selected', allIds)
}

function selectNone() {
  emit('update:selected', [])
}

function selectCategoryAll(category, items) {
  if (activeDeleteCategory.value === category) {
    // 删除模式：全选加入待删池
    const ids = items.map(i => i.id)
    itemsToDelete.value = [...new Set([...itemsToDelete.value, ...ids])]
  } else {
    // 正常模式：分类下全选入库存
    const ids = items.map(i => i.id)
    const newSelected = [...new Set([...props.selected, ...ids])]
    emit('update:selected', newSelected)
  }
}

function selectCategoryNone(category, items) {
  if (activeDeleteCategory.value === category) {
    // 删除模式：清空待删池
    itemsToDelete.value = []
  } else {
    // 正常模式：分类下全不选出库存
    const itemIds = new Set(items.map(i => i.id))
    const newSelected = props.selected.filter(id => !itemIds.has(id))
    emit('update:selected', newSelected)
  }
}

async function openInput(category) {
  activeCategory.value = category
  customInput.value = ''
  await nextTick()
  // 确保渲染后聚焦输入框，由于在 v-for 中 ref 为数组
  if (inputRef.value) {
    const inputEl = Array.isArray(inputRef.value) ? inputRef.value[0] : inputRef.value
    if (inputEl && inputEl.focus) {
      inputEl.focus()
    }
  }
}

function cancelInput() {
  activeCategory.value = null
  customInput.value = ''
}

function handleBlur(category) {
  // 如果输入框失去焦点且有值，也进行保存（稍微延长判断防止由于点击等导致重复提交）
  setTimeout(() => {
    if (activeCategory.value === category) {
      if (customInput.value.trim()) {
        addCustom(category)
      } else {
        cancelInput()
      }
    }
  }, 100)
}

function addCustom(category) {
  const name = customInput.value.trim()
  if (!name) {
    cancelInput()
    return
  }
  
  // 1. 判断是否是系统预设（官方）食材
  const allStatic = getAllIngredients(props.recipesData)
  const matchedStatic = allStatic.find(i => i.name === name)

  if (matchedStatic) {
    const deletedArr = props.deletedIngredients || []
    if (deletedArr.includes(matchedStatic.id)) {
      // 激活（软删除恢复）
      const newDeleted = deletedArr.filter(id => id !== matchedStatic.id)
      emit('update:deletedIngredients', newDeleted)
      
      // 抛出轻量级提示
      toastMsg.value = `已为您恢复系统预设食材：${name}`
      setTimeout(() => toastMsg.value = '', 3000)
    }
    
    // 自动勾选
    if (!props.selected.includes(matchedStatic.id)) {
      emit('update:selected', [...props.selected, matchedStatic.id])
    }
    cancelInput()
    return
  }

  // 2. 检查是否是历史自定义食材
  const matchedCustom = props.customIngredients.find(c => c.name === name)
  if (matchedCustom) {
    if (!props.selected.includes(matchedCustom.id)) {
      emit('update:selected', [...props.selected, matchedCustom.id])
    }
    cancelInput()
    return
  }
  
  // 3. 全新自定义食材分配 ID
  const id = 'custom_' + Date.now()
  const newItem = { id, name, category, tags: ['custom'] }
  emit('update:customIngredients', [...props.customIngredients, newItem])
  // 自动选中
  emit('update:selected', [...props.selected, id])
  
  cancelInput()
}

function openDelete(category) {
  cancelInput()
  activeDeleteCategory.value = category
  itemsToDelete.value = []
}

function cancelDelete() {
  activeDeleteCategory.value = null
  itemsToDelete.value = []
}

function confirmDelete(category) {
  const toDelete = itemsToDelete.value
  if (toDelete.length === 0) {
    cancelDelete()
    return
  }
  
  // 处理自定义食材删除（直接从 customIngredients 移除）
  const newCustom = props.customIngredients.filter(c => !toDelete.includes(c.id))
  if (newCustom.length !== props.customIngredients.length) {
    emit('update:customIngredients', newCustom)
  }

  // 处理内置食材删除（记录到 deletedIngredients）
  const staticToDelete = toDelete.filter(id => !id.startsWith('custom_'))
  if (staticToDelete.length > 0) {
    const currentDeleted = props.deletedIngredients || []
    emit('update:deletedIngredients', [...currentDeleted, ...staticToDelete])
  }

  // 同步从已选库存中移除
  const newSelected = props.selected.filter(id => !toDelete.includes(id))
  if (newSelected.length !== props.selected.length) {
    emit('update:selected', newSelected)
  }

  cancelDelete()
}

function handleCheckboxChange(category, id) {
  if (activeDeleteCategory.value === category) {
    // 删除模式下的勾选标记
    const idx = itemsToDelete.value.indexOf(id)
    if (idx >= 0) {
      itemsToDelete.value.splice(idx, 1)
    } else {
      itemsToDelete.value.push(id)
    }
  } else {
    // 正常模式下的库存勾选
    toggleItem(id)
  }
}
</script>

<style scoped>
.bulk-actions {
  display: flex;
  gap: var(--space-sm);
  margin-bottom: var(--space-md);
  padding-bottom: var(--space-md);
  border-bottom: 1px solid var(--border);
}

.category-group {
  margin-bottom: var(--space-md);
}

.category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-sm);
  padding-left: var(--space-xs);
}

.header-left-group {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.category-bulk-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.link-btn {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 0 4px;
}

.link-btn:hover {
  color: var(--accent-green);
}

.divider {
  width: 1px;
  height: 10px;
  background: var(--border);
}

.category-group__title {
  font-size: var(--font-sm);
  font-weight: 700;
  color: var(--text-secondary);
  /* 移除 margin-bottom 以适应 flex 布局 */
  margin-bottom: 0;
}

/* 虚线边框触发器 */
.add-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-trigger:hover, .add-trigger:active {
  border-color: var(--accent-green);
  color: var(--accent-green);
  background: hsla(161, 65%, 50%, 0.1);
}

/* 行内输入框容器 */
.inline-input-wrapper {
  flex: 1;
  max-width: 150px;
}

.inline-input {
  width: 100%;
  padding: 2px 6px;
  font-size: var(--font-xs);
  color: var(--text);
  background: rgba(255, 255, 255, 0.05);
  border: 1px dashed var(--accent-green);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.2s;
}

.inline-input:focus {
  border-color: var(--accent-green);
  background: rgba(255, 255, 255, 0.1);
}

.inline-input::placeholder {
  color: var(--text-muted);
  font-style: italic;
}

.checkbox--custom .checkbox__label {
  color: var(--accent-amber);
  font-style: italic;
}

.ingredient-content {
  padding: var(--space-md) var(--space-lg);
}

.trigger-group {
  display: flex;
  gap: var(--space-xs);
}

.delete-trigger:hover, .delete-trigger:active {
  border-color: var(--accent-red, #ef4444);
  color: var(--accent-red, #ef4444);
  background: hsla(0, 84%, 71%, 0.1);
}

.delete-actions {
  display: flex;
  gap: var(--space-xs);
}

.delete-btn {
  padding: 2px 8px;
  font-size: var(--font-xs);
}

.btn--danger {
  background: var(--accent-red, #ef4444);
  color: white;
  border-color: var(--accent-red, #ef4444);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: opacity 0.2s;
}
.btn--danger:hover {
  opacity: 0.9;
}

.checkbox--delete-mode input[type="checkbox"] {
  accent-color: var(--accent-red, #ef4444);
}

.checkbox--delete-mode input:checked + .checkbox__label {
  color: var(--accent-red, #ef4444);
  text-decoration: line-through;
}

/* Toast 提示 */
.toast-notification {
  position: fixed;
  bottom: var(--space-xl);
  left: 50%;
  transform: translateX(-50%);
  background: var(--accent-green);
  color: #0a0f1a;
  font-weight: bold;
  padding: 8px 16px;
  border-radius: 20px;
  font-size: var(--font-sm);
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(45, 212, 160, 0.3);
  animation: fadeUp 0.3s ease-out;
  pointer-events: none;
}

@keyframes fadeUp {
  from { opacity: 0; transform: translate(-50%, 10px); }
  to { opacity: 1; transform: translate(-50%, 0); }
}
</style>
