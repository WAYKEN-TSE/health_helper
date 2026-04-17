<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal card" @click.stop>
      <div class="modal-header">
        <h3>📝 新建自定义菜谱</h3>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <div class="modal-body">
        <label class="form-group">
          <span>菜谱名称 <span class="required">*</span></span>
          <input v-model="form.name" class="form-input" placeholder="输入菜谱名称..." />
        </label>

        <label class="form-group">
          <span>关联食材 <span class="required">*</span> <span class="hint">(搜索并添加)</span></span>
          <div class="ingredient-search-wrapper">
            <div class="selected-tags">
              <span v-for="ing in selectedIngredientsMeta" :key="ing.id" class="tag">
                {{ ing.name }}
                <button class="tag-close" @click="removeIngredient(ing.id)">✕</button>
              </span>
            </div>
            
            <div style="display: flex; gap: 8px;">
              <input 
                v-model="searchInput"
                class="form-input" 
                placeholder="输入关键字搜索或新增..." 
                @keyup.enter="handleAddSearch"
              />
              <button class="btn btn--ghost" @click="handleAddSearch" :disabled="!searchInput.trim()">添加</button>
            </div>
            
            <div v-if="searchResults.length > 0 && searchInput" class="search-dropdown">
              <div 
                v-for="res in searchResults" 
                :key="res.id" 
                class="search-item"
                @click="addIngredient(res)"
              >
                {{ res.name }}
                <span class="badge">{{ categoryEmoji[res.category] || '🥑' }}</span>
              </div>
            </div>
          </div>
        </label>

        <label class="form-group">
          <span>战术标签 <span class="required">*</span> <span class="hint">(影响其落入哪个大池)</span></span>
          <div class="radio-group">
            <label><input type="radio" v-model="form.mealTag" value="pre_workout"> 练前餐</label>
            <label><input type="radio" v-model="form.mealTag" value="post_workout"> 练后餐</label>
            <label><input type="radio" v-model="form.mealTag" value="rest_day"> 日常餐</label>
          </div>
        </label>

        <label class="form-group">
          <span>物理分类 <span class="required">*</span></span>
          <select v-model="form.recipeCategory" class="form-input form-select">
            <option disabled value="">请选择类型...</option>
            <option value="极速快手">⚡ 极速快手</option>
            <option value="丰盛正餐">🍲 丰盛正餐</option>
            <option value="轻盈减负">🥗 轻盈减负</option>
            <option value="汤饮小吃">🥣 汤饮小吃</option>
            <option value="战后回血">🔋 战后回血</option>
          </select>
        </label>

        <label class="form-group">
          <span>自定义做法 <span class="hint">(选填)</span></span>
          <textarea v-model="form.custom_steps" class="form-input" rows="4" placeholder="例如：1. 鸡胸肉切丁..."></textarea>
        </label>
      </div>

      <div class="modal-footer">
        <span class="error-msg" v-if="errorMsg">{{ errorMsg }}</span>
        <button class="btn btn--primary" @click="saveForm">保存菜谱</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: Boolean,
  recipesData: Object,
  customIngredients: Array
})

const emit = defineEmits(['close', 'save-recipe', 'create-ingredient'])

const categoryEmoji = {
  'carbs': '🍚', 'protein': '🥩', 'micronutrients': '🥬', 'snack': '🍫'
}

const form = ref({
  name: '',
  ingredientIds: [],
  mealTag: '',
  recipeCategory: '',
  custom_steps: ''
})

const searchInput = ref('')
const errorMsg = ref('')

const allAvailableIngredients = computed(() => {
  const result = []
  if (props.recipesData && props.recipesData.ingredients) {
    Object.values(props.recipesData.ingredients).forEach(arr => result.push(...arr))
  }
  if (props.customIngredients) {
    result.push(...props.customIngredients)
  }
  return result
})

const searchResults = computed(() => {
  if (!searchInput.value.trim()) return []
  const kw = searchInput.value.trim().toLowerCase()
  // Exact match logic is handled on enter. This just shows partials.
  return allAvailableIngredients.value.filter(i => 
    i.name.toLowerCase().includes(kw) && !form.value.ingredientIds.includes(i.id)
  )
})

const selectedIngredientsMeta = computed(() => {
  return form.value.ingredientIds.map(id => {
    const meta = allAvailableIngredients.value.find(i => i.id === id)
    return meta || { id, name: id }
  })
})

function handleAddSearch() {
  const kw = searchInput.value.trim()
  if (!kw) return
  
  // Exact match
  const exact = allAvailableIngredients.value.find(i => i.name === kw)
  if (exact) {
    if (!form.value.ingredientIds.includes(exact.id)) {
      form.value.ingredientIds.push(exact.id)
    }
  } else {
    // Generate new custom ingredient implicitly
    const newId = 'custom_' + Date.now()
    emit('create-ingredient', { id: newId, name: kw, category: 'micronutrients', tags: ['custom'] })
    form.value.ingredientIds.push(newId)
  }
  searchInput.value = ''
}

function addIngredient(ing) {
  if (!form.value.ingredientIds.includes(ing.id)) {
    form.value.ingredientIds.push(ing.id)
  }
  searchInput.value = ''
}

function removeIngredient(id) {
  form.value.ingredientIds = form.value.ingredientIds.filter(i => i !== id)
}

function saveForm() {
  if (!form.value.name.trim()) {
    errorMsg.value = '必须填写菜谱名称'
    return
  }
  if (form.value.ingredientIds.length === 0) {
    errorMsg.value = '必须关联至少一种食材'
    return
  }
  if (!form.value.mealTag) {
    errorMsg.value = '必须选择战术标签'
    return
  }
  if (!form.value.recipeCategory) {
    errorMsg.value = '必须选择物理分类'
    return
  }
  
  const recipe = {
    id: 'recipe_custom_' + Date.now(),
    name: form.value.name.trim(),
    mealTag: form.value.mealTag,
    recipeCategory: form.value.recipeCategory,
    // By default map it to whatever suits the tag logically (for slot generation)
    // Actually the mealFilter usually checks `suitableMeals.includes(slot)`
    // So we must assign suitableMeals based on mealTag
    suitableMeals: form.value.mealTag === 'post_workout' ? ['lunch', 'dinner'] : 
                   form.value.mealTag === 'pre_workout' ? ['breakfast', 'lunch'] : 
                   ['breakfast', 'lunch', 'dinner'],
    ingredientIds: [...form.value.ingredientIds],
    custom_steps: form.value.custom_steps.trim(),
    portions: {},
    nutrition: null
  }
  
  emit('save-recipe', recipe)
  emit('close')
}

// Reset form when opened
watch(() => props.show, (val) => {
  if (val) {
    form.value = { name: '', ingredientIds: [], mealTag: '', recipeCategory: '', custom_steps: '' }
    searchInput.value = ''
    errorMsg.value = ''
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(2px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  width: 90%;
  max-width: 500px;
  background: var(--surface);
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  max-height: 90vh;
}

.modal-header {
  padding: var(--space-md) var(--space-lg);
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 { margin: 0; font-size: var(--font-md); }

.close-btn {
  background: none; border: none; color: var(--text-muted); font-size: 18px; cursor: pointer;
}
.close-btn:hover { color: var(--text); }

.modal-body {
  padding: var(--space-lg);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
}

.form-group {
  display: flex; flex-direction: column; gap: 8px;
}

.form-group > span {
  font-size: var(--font-sm);
  font-weight: 500;
}

.required { color: var(--accent-red, #ef4444); }
.hint { font-size: 12px; color: var(--text-muted); font-weight: normal; }

.form-input {
  background: rgba(255,255,255,0.05);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 12px;
  color: var(--text);
  font-family: inherit;
  outline: none;
  width: 100%;
}
.form-input:focus { border-color: var(--accent-green); }

.form-select {
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23888'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
}

.radio-group {
  display: flex; gap: 16px;
}
.radio-group label {
  display: flex; align-items: center; gap: 4px; font-size: var(--font-sm); cursor: pointer;
}
.radio-group input[type="radio"] { accent-color: var(--accent-green); }

.ingredient-search-wrapper {
  position: relative;
  display: flex; flex-direction: column; gap: 8px;
}

.selected-tags {
  display: flex; flex-wrap: wrap; gap: 6px;
}

.tag {
  background: rgba(38, 222, 129, 0.15);
  border: 1px solid var(--accent-green);
  color: var(--accent-green);
  padding: 4px 8px;
  border-radius: var(--radius-full);
  font-size: 12px;
  display: inline-flex; align-items: center; gap: 6px;
}

.tag-close {
  background: none; border: none; color: inherit; cursor: pointer; padding: 0; font-size: 10px;
}

.search-dropdown {
  position: absolute;
  top: 100%; left: 0; right: 0;
  margin-top: 4px;
  background: var(--surface-light);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  max-height: 150px; overflow-y: auto;
  z-index: 10;
  box-shadow: 0 4px 12px rgba(0,0,0,0.2);
}

.search-item {
  padding: 8px 12px;
  font-size: var(--font-sm);
  cursor: pointer;
  display: flex; justify-content: space-between; align-items: center;
}
.search-item:hover { background: rgba(255,255,255,0.05); }

.modal-footer {
  padding: var(--space-md) var(--space-lg);
  border-top: 1px solid var(--border);
  display: flex; justify-content: flex-end; align-items: center; gap: 16px;
}

.error-msg {
  color: var(--accent-red, #ef4444);
  font-size: var(--font-sm);
}
</style>
