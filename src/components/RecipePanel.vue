<template>
  <div class="section">
    <!-- 折叠触发器 -->
    <button class="collapse-trigger" @click="isOpen = !isOpen">
      <span>📖 菜谱管理 </span>
      <span class="collapse-trigger__arrow" :class="{ 'collapse-trigger__arrow--open': isOpen }">▼</span>
    </button>

    <!-- 折叠内容 -->
    <div class="collapse-body" :class="isOpen ? 'collapse-body--open' : 'collapse-body--closed'">
      <div class="ingredient-content card" style="margin-top: var(--space-sm); border-top-left-radius: var(--radius-sm); border-top-right-radius: var(--radius-sm);">

        <!-- 搜索栏 -->
        <div class="search-bar-wrapper">
          <span class="search-icon">🔍</span>
          <input
            v-model="searchQuery"
            class="search-input"
            placeholder="搜索你想吃的菜..."
            type="text"
          />
          <button v-if="searchQuery" class="search-clear" @click="searchQuery = ''">✕</button>
        </div>

        <!-- 搜索结果平铺模式 -->
        <div v-if="debouncedQuery" class="search-results">
          <div v-if="flatSearchResults.length === 0" class="search-empty">未找到匹配「{{ debouncedQuery }}」的菜谱</div>
          <div v-else class="recipe-grid">
            <div
              v-for="item in flatSearchResults"
              :key="item.id"
              class="recipe-card"
              :class="{
                'recipe-card--disabled': !isAvailable(item),
                'recipe-card--natural': isAvailable(item),
                'recipe-card--selected': isSelected(item)
              }"
              @click="handleRecipeClick(item._category, item)"
            >
              <div class="recipe-card__header">
                <span class="recipe-card__name">{{ item.name }}</span>
                <span class="selection-indicator">
                  <span class="checkbox-box">{{ isSelected(item) ? '★' : '☆' }}</span>
                </span>
              </div>
              <span class="search-cat-badge">{{ item._category }}</span>
            </div>
          </div>
        </div>

        <!-- 分类菜谱（非搜索模式） -->
        <div v-for="(recipes, category) in filteredCategorizedRecipes" v-show="!debouncedQuery" :key="category" class="category-group">
          <!-- 分类标题栏操作区 -->
          <div class="category-header">
            <div class="header-left-group">
              <div class="category-group__title">
                {{ categoryEmoji[category] || '🍽️' }} {{ category }}
                <div 
                  class="category-tooltip-wrapper" 
                  tabindex="0"
                  @mouseenter="showTooltip($event, category)"
                  @mouseleave="hideTooltip"
                >
                  <span class="tooltip-icon">?</span>
                </div>
              </div>

              <template v-if="activeDeleteCategory === category">
                <div class="delete-actions">
                  <button class="btn btn--danger btn--sm delete-btn" @click="confirmDelete(category)">确认</button>
                  <button class="btn btn--ghost btn--sm delete-btn" @click="cancelDelete">取消</button>
                </div>
              </template>
              <template v-else>
                <div class="trigger-group">
                  <button class="add-trigger" @click="$emit('open-create')" title="新建自定义菜谱">+</button>
                  <button class="add-trigger delete-trigger" @click="openDelete(category)" title="进入删除模式">-</button>
                </div>
              </template>
            </div>

            <!-- 分类级批量操作 -->
            <div class="category-bulk-actions">
              <button class="link-btn" @click="selectCategoryAll(category, recipes)" :title="activeDeleteCategory === category ? '全选批量删除' : '一键加入心愿单（强制备选）'">全选</button>
              <span class="divider"></span>
              <button class="link-btn" @click="selectCategoryNone(category, recipes)" :title="activeDeleteCategory === category ? '取消全选删除' : '一键移出心愿单'">全不选</button>
            </div>
          </div>

          <div class="recipe-grid">
            <div 
              v-for="recipe in recipes" 
              :key="recipe.id"
              class="recipe-card"
              :class="{
                'recipe-card--disabled': !isAvailable(recipe),
                'recipe-card--natural': isAvailable(recipe),
                'recipe-card--selected': isSelected(recipe),
                'recipe-card--delete-mode': activeDeleteCategory === category,
                'recipe-card--to-delete': itemsToDelete.includes(recipe.id)
              }"
              @click="handleRecipeClick(category, recipe)"
            >
              <div class="recipe-card__header">
                <span class="recipe-card__name">{{ recipe.name }}</span>
                <span v-if="activeDeleteCategory === category" class="delete-checkbox">
                  {{ itemsToDelete.includes(recipe.id) ? '☑' : '☐' }}
                </span>
                <span v-else class="selection-indicator">
                  <span class="checkbox-box">{{ isSelected(recipe) ? '★' : '☆' }}</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 缺品补充弹窗 Bottom Sheet -->
    <div v-if="activeMissingRecipe" class="modal-overlay" @click="closeMissingSheet">
      <div class="bottom-sheet" @click.stop>
        <div class="sheet-header">
          <h3>缺少关键食材</h3>
          <button class="btn-batch-replenish" @click="batchReplenish">⚡ 一键补齐缺料</button>
        </div>
        <p class="sheet-desc">点击下方食材逐个加入库存，或直接点击右上角一键补齐：</p>
        <div class="missing-ingredients">
          <button 
            v-for="ing in missingIngredientsData" 
            :key="ing.id"
            class="missing-ing-btn"
            @click="replenishIngredient(ing)"
          >
            + {{ ing.name || ing.id }}
          </button>
        </div>
        <button class="btn btn--block btn--ghost" style="margin-top: 16px;" @click="closeMissingSheet">关闭</button>
      </div>
    </div>

    <!-- 顶层自适应悬浮气泡 -->
    <teleport to="body">
      <div 
        v-if="tooltipState.visible" 
        class="global-tooltip-content" 
        :class="tooltipState.isTop ? 'tooltip-pop-up' : 'tooltip-pop-down'"
        :style="tooltipState.style"
      >
        {{ tooltipState.text }}
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { getIngredientById } from '../data/recipes.js'

const props = defineProps({
  recipesData: Object,
  selectedIngredients: Array,
  selectedRecipes: Array,
  customRecipes: Array,
  deletedRecipes: Array
})

const emit = defineEmits(['update:selectedIngredients', 'update:selectedRecipes', 'update:deletedRecipes', 'open-create', 'show-detail'])

const isOpen = ref(false)
const activeDeleteCategory = ref(null)
const itemsToDelete = ref([])

// 搜索防抖
const searchQuery = ref('')
const debouncedQuery = ref('')
let _debounceTimer = null
watch(searchQuery, (val) => {
  clearTimeout(_debounceTimer)
  _debounceTimer = setTimeout(() => { debouncedQuery.value = val.trim() }, 300)
})

const flatSearchResults = computed(() => {
  const q = debouncedQuery.value.toLowerCase()
  if (!q) return []
  const results = []
  for (const [category, recipes] of Object.entries(categorizedRecipes.value)) {
    for (const r of recipes) {
      if (r.name.toLowerCase().includes(q)) {
        results.push({ ...r, _category: category })
      }
    }
  }
  return results
})

const activeMissingRecipe = ref(null)
const missingIngredientsData = ref([])

const categoryEmoji = {
  '极速快手': '⚡', '丰盛正餐': '🍲', '轻盈减负': '🥗', '汤饮小吃': '🥣', '战后回血': '🔋'
}

const categoryTips = {
  '极速快手': '省时省力。适合下班/训练后疲惫场景（如：拌面、快手炒饭）。',
  '丰盛正餐': '犒劳与能量。适合休息日或体力充沛时精心烹饪。',
  '轻盈减负': '肠胃友好。追求清淡无负担，适合练前 2 小时或肠胃调理。',
  '汤饮小吃': '功能性补充。涵盖运动补给、蛋白奶昔、营养热汤。',
  '战后回血': '专为高强度训练后的黄金窗口期设计。主打高蛋白与快碳组合，加速肌肉修复与能量回充。'
}

const categorizedRecipes = computed(() => {
  const result = { '极速快手': [], '丰盛正餐': [], '轻盈减负': [], '汤饮小吃': [], '战后回血': [], '未分类': [] }
  const deletedSet = new Set(props.deletedRecipes || [])
  const allList = []
  
  if (props.recipesData && Array.isArray(props.recipesData.recipes)) {
    allList.push(...props.recipesData.recipes)
  }
  if (props.customRecipes) {
    allList.push(...props.customRecipes)
  }

  allList.forEach(r => {
    if (deletedSet.has(r.id)) return
    const c = r.recipeCategory || '未分类'
    if (!result[c]) result[c] = []
    result[c].push(r)
  })
  return result
})

const filteredCategorizedRecipes = computed(() => {
  const finalObj = {}
  Object.keys(categorizedRecipes.value).forEach(k => {
    if (categorizedRecipes.value[k] && categorizedRecipes.value[k].length > 0) {
      finalObj[k] = categorizedRecipes.value[k]
    }
  })
  return finalObj
})

const tooltipState = ref({
  visible: false,
  text: '',
  style: {},
  isTop: true
})

function showTooltip(event, category) {
  const text = categoryTips[category] || '未分类系列菜谱'
  const rect = event.currentTarget.getBoundingClientRect()
  
  // 碰撞检测：预留约 100px 高度给气泡，顶层空间不够则翻转到下方
  const isTop = rect.top >= 100
  
  tooltipState.value = {
    visible: true,
    text,
    isTop,
    style: {
      position: 'fixed',
      left: rect.left + rect.width / 2 + 'px',
      top: isTop ? (rect.top - 12) + 'px' : (rect.bottom + 12) + 'px',
    }
  }
}

function hideTooltip() {
  tooltipState.value.visible = false
}

function isAvailable(recipe) {
  if (!recipe || !recipe.ingredientIds) return false
  const selectedSet = new Set(props.selectedIngredients)
  return recipe.ingredientIds.every(id => selectedSet.has(id))
}

function isSelected(recipe) {
  if (!recipe) return false
  return (props.selectedRecipes || []).includes(recipe.id)
}

function selectRecipe(recipe) {
  const next = [...new Set([...(props.selectedRecipes || []), recipe.id])]
  emit('update:selectedRecipes', next)
}

function toggleSelection(recipe) {
  const current = props.selectedRecipes || []
  if (current.includes(recipe.id)) {
    emit('update:selectedRecipes', current.filter(id => id !== recipe.id))
  } else {
    emit('update:selectedRecipes', [...current, recipe.id])
  }
}

function forceSelectCategory(category, recipes) {
  const ids = recipes.map(r => r.id)
  const next = [...new Set([...(props.selectedRecipes || []), ...ids])]
  emit('update:selectedRecipes', next)
}

function forceUnselectCategory(category, recipes) {
  const idsToRemove = new Set(recipes.map(r => r.id))
  const next = (props.selectedRecipes || []).filter(id => !idsToRemove.has(id))
  emit('update:selectedRecipes', next)
}

function selectCategoryAll(category, recipes) {
  if (activeDeleteCategory.value === category) {
    const ids = recipes.map(i => i.id)
    itemsToDelete.value = [...new Set([...itemsToDelete.value, ...ids])]
  } else {
    forceSelectCategory(category, recipes)
  }
}

function selectCategoryNone(category, recipes) {
  if (activeDeleteCategory.value === category) {
    itemsToDelete.value = []
  } else {
    forceUnselectCategory(category, recipes)
  }
}

function openDelete(category) {
  activeDeleteCategory.value = category
  itemsToDelete.value = []
}

function cancelDelete() {
  activeDeleteCategory.value = null
  itemsToDelete.value = []
}

function confirmDelete(category) {
  const toDelete = itemsToDelete.value
  if (toDelete.length > 0) {
    const currentDeleted = props.deletedRecipes || []
    emit('update:deletedRecipes', [...currentDeleted, ...toDelete])
  }
  cancelDelete()
}

function handleRecipeClick(category, recipe) {
  if (activeDeleteCategory.value === category) {
    const idx = itemsToDelete.value.indexOf(recipe.id)
    if (idx >= 0) {
      itemsToDelete.value.splice(idx, 1)
    } else {
      itemsToDelete.value.push(recipe.id)
    }
    return
  }

  // 正常模式解耦
  if (isAvailable(recipe)) {
    toggleSelection(recipe)
  } else {
    // 呼叫缺品弹窗
    const missingIds = recipe.ingredientIds.filter(id => !props.selectedIngredients.includes(id))
    missingIngredientsData.value = missingIds.map(id => getIngredientById(props.recipesData, id) || { id, name: id })
    activeMissingRecipe.value = recipe
  }
}

function replenishIngredient(ing) {
  emit('update:selectedIngredients', [...props.selectedIngredients, ing.id])
  missingIngredientsData.value = missingIngredientsData.value.filter(i => i.id !== ing.id)
  
  if (missingIngredientsData.value.length === 0) {
    const recipe = activeMissingRecipe.value
    activeMissingRecipe.value = null // all fulfilled
    if (recipe) {
      selectRecipe(recipe)
    }
  }
}

function closeMissingSheet() {
  activeMissingRecipe.value = null
  missingIngredientsData.value = []
}

function batchReplenish() {
  // 1. 一次性吸纳所有缺少的食材入库
  const missingIds = missingIngredientsData.value.map(i => i.id)
  emit('update:selectedIngredients', [...new Set([...props.selectedIngredients, ...missingIds])])

  // 2. 补齐后直接将菜谱标记为主观选定
  const targetRecipe = activeMissingRecipe.value
  if (targetRecipe) {
    const current = props.selectedRecipes || []
    emit('update:selectedRecipes', [...new Set([...current, targetRecipe.id])])
  }

  // 3. 销毁实例
  closeMissingSheet()
}
</script>

<style scoped>
/* 搜索栏 */
.search-bar-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  margin-bottom: var(--space-md);
  position: sticky;
  top: 0;
  z-index: 10;
}
.search-icon { font-size: 14px; flex-shrink: 0; }
.search-input {
  flex: 1; background: transparent; border: none; outline: none;
  color: var(--text); font-size: var(--font-sm);
}
.search-input::placeholder { color: var(--text-muted); }
.search-clear {
  background: none; border: none; color: var(--text-muted);
  cursor: pointer; font-size: 14px; padding: 0 2px; transition: color 0.2s;
}
.search-clear:hover { color: var(--text); }
.search-results { margin-bottom: var(--space-md); }
.search-empty {
  text-align: center; color: var(--text-muted);
  font-size: var(--font-sm); padding: var(--space-lg) 0;
}
.search-cat-badge {
  font-size: 10px; color: var(--text-muted);
  background: rgba(255,255,255,0.06);
  padding: 1px 6px; border-radius: 8px;
  align-self: flex-start; margin-top: 2px;
}

/* Bottom Sheet Header */
.sheet-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 4px;
}
.btn-batch-replenish {
  background: var(--accent-green);
  color: #0a0f1a;
  border: none;
  padding: 6px 14px;
  border-radius: var(--radius-full);
  font-size: var(--font-sm);
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-batch-replenish:hover {
  filter: brightness(1.15);
  box-shadow: 0 2px 8px rgba(45, 212, 160, 0.4);
}

.category-group { margin-bottom: var(--space-md); }

.category-header {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: var(--space-sm); padding-left: var(--space-xs);
}

.header-left-group { display: flex; align-items: center; gap: var(--space-sm); }
.category-bulk-actions { display: flex; align-items: center; gap: 4px; }

.link-btn { background: none; border: none; color: var(--text-muted); font-size: 12px; cursor: pointer; padding: 0 4px; }
.link-btn:hover { color: var(--accent-green); }
.divider { width: 1px; height: 10px; background: var(--border); }

.category-group__title {
  font-size: var(--font-sm); font-weight: 700; color: var(--text-secondary); margin-bottom: 0;
  display: flex; align-items: center; gap: 4px;
}

.category-tooltip-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: help;
  outline: none;
}

.tooltip-icon {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 1px solid var(--text-muted);
  color: var(--text-muted);
  font-size: 10px;
  text-align: center;
  line-height: 14px;
  font-weight: normal;
}

/* 剥离在原组件中的提示框样式，移交给 global-tooltip-content */
</style>

<style>
/* 悬浮气泡全局样式 (因挂载在 body 层，勿使用 scoped) */
.global-tooltip-content {
  background-color: #ffffff; /* 强制白底深黑高反差 */
  color: #1e1e1e;
  text-align: left;
  border-radius: 8px;
  padding: 10px 14px;
  z-index: 99999; /* 极限置顶，穿透所有 overflow 层 */
  width: max-content;
  max-width: 220px;
  min-width: 160px;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.5;
  border: none;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.4), 0 4px 8px rgba(0, 0, 0, 0.2);
  pointer-events: none;
  animation: tooltipFadeIn 0.2s ease-out;
}

.tooltip-pop-up {
  transform: translate(-50%, -100%);
}
.tooltip-pop-down {
  transform: translate(-50%, 0);
}

/* 顶部弹出时：小尾巴在底下 */
.tooltip-pop-up::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 7px;
  border-style: solid;
  border-color: #ffffff transparent transparent transparent;
}

/* 底部弹出时：小尾巴在顶部 */
.tooltip-pop-down::after {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  border-width: 7px;
  border-style: solid;
  border-color: transparent transparent #ffffff transparent;
}

@keyframes tooltipFadeIn {
  0% { opacity: 0; margin-top: 4px; }
  100% { opacity: 1; margin-top: 0; }
}
</style>

<style scoped>
/* Triggers */
.add-trigger {
  display: inline-flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; border: 1px dashed var(--border); border-radius: var(--radius-sm);
  background: transparent; color: var(--text-muted); font-size: 14px; cursor: pointer; transition: all 0.2s ease;
}
.add-trigger:hover {
  border-color: var(--accent-green); color: var(--accent-green); background: hsla(161, 65%, 50%, 0.1);
}
.delete-trigger:hover {
  border-color: var(--accent-red, #ef4444); color: var(--accent-red, #ef4444); background: hsla(0, 84%, 71%, 0.1);
}
.delete-actions { display: flex; gap: var(--space-xs); }
.delete-btn { padding: 2px 8px; font-size: var(--font-xs); cursor: pointer; }
.btn--danger { background: var(--accent-red, #ef4444); color: white; border: none; border-radius: 4px; }

/* Grid */
.recipe-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: var(--space-xs);
}

.recipe-card {
  padding: var(--space-sm);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
  cursor: pointer;
  user-select: none;
}

.recipe-card--natural { border-color: hsla(161, 65%, 50%, 0.3); }
.recipe-card--selected { 
  border-color: hsla(38, 90%, 55%, 0.6); 
  background: hsla(38, 90%, 55%, 0.1);
}

.recipe-card--disabled {
  opacity: 0.5;
  filter: grayscale(0.8);
}

.recipe-card:hover {
  background: rgba(255, 255, 255, 0.1);
}

.recipe-card--delete-mode {
  border-color: var(--border);
}

.recipe-card--to-delete {
  border-color: var(--accent-red, #ef4444);
  background: hsla(0, 84%, 71%, 0.1);
}

.recipe-card__header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recipe-card__name {
  font-size: var(--font-xs);
  font-weight: 500;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.badge--small {
  padding: 2px 4px;
  font-size: 10px;
  align-self: flex-start;
}

.selection-indicator {
  align-self: flex-end;
  font-size: 16px;
  color: hsla(38, 90%, 55%, 0.9);
  line-height: 1;
}

.delete-checkbox {
  align-self: flex-end;
  color: var(--accent-red, #ef4444);
  font-size: 14px;
}

/* Modal Bottom Sheet */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(2px);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  animation: fadeIn 0.2s ease-out;
}

.bottom-sheet {
  background: var(--surface-light);
  width: 100%;
  max-width: 600px;
  padding: var(--space-lg);
  border-top-left-radius: var(--radius-lg);
  border-top-right-radius: var(--radius-lg);
  box-shadow: 0 -4px 20px rgba(0,0,0,0.2);
  animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.sheet-desc {
  font-size: var(--font-sm);
  color: var(--text-muted);
  margin-top: 4px; margin-bottom: 16px;
}

.missing-ingredients {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.missing-ing-btn {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  color: var(--text);
  padding: 6px 12px;
  border-radius: var(--radius-full);
  cursor: pointer;
  transition: all 0.2s;
}

.missing-ing-btn:hover {
  background: var(--accent-green);
  color: #000;
  border-color: var(--accent-green);
}

@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
</style>
