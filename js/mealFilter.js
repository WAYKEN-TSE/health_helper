/**
 * MealFilter — 核心转盘过滤逻辑
 *
 * 职责：
 * 1. 根据 trainingStart / trainingEnd 判定当前每餐的标签 (pre_workout / post_workout / rest_day)
 * 2. 用已选食材 ∩ 菜谱所需食材 过滤奖池
 * 3. 暴露 getPool(mealSlot) 给转盘组件使用
 */

class MealFilter {
  /**
   * @param {Object}   recipesData        - recipes.json 解析后的对象
   * @param {string[]} selectedIngredientIds - 用户勾选的食材 id 列表
   * @param {boolean}  isTrainingDay
   * @param {string}   trainingStart       - "HH:mm" 如 "09:00"
   * @param {string}   trainingEnd         - "HH:mm" 如 "11:00"
   */
  constructor(recipesData, selectedIngredientIds, isTrainingDay, trainingStart, trainingEnd) {
    this.recipes = recipesData.recipes;
    this.selectedIds = new Set(selectedIngredientIds);
    this.isTrainingDay = isTrainingDay;
    this.tStart = this._parseTime(trainingStart);
    this.tEnd = this._parseTime(trainingEnd);
    this.snackTrigger = recipesData.snackTrigger;
  }

  // ───── 时间工具 ─────

  /** "HH:mm" → 当天分钟数 */
  _parseTime(timeStr) {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  /** 预定义的固定用餐时间窗口 (分钟) */
  static MEAL_WINDOWS = {
    breakfast: { start: 6 * 60, end: 9 * 60 },   // 06:00 - 09:00
    lunch:    { start: 11 * 60, end: 13 * 60 },  // 11:00 - 13:00
    dinner:   { start: 17 * 60, end: 20 * 60 },  // 17:00 - 20:00
  };

  // ───── 核心标签判定 ─────

  /**
   * 根据训练时间窗口，判定某个 mealSlot 的营养标签
   *
   * 规则：
   *  - 练前餐：该餐的用餐时间落在 [tStart - 3h, tStart - 1h]
   *  - 练后餐：该餐的用餐时间落在 [tEnd, tEnd + 1h]
   *  - 否则 / 休息日：rest_day
   *
   * @param {"breakfast"|"lunch"|"dinner"} mealSlot
   * @returns {"pre_workout"|"post_workout"|"rest_day"}
   */
  getMealTag(mealSlot) {
    if (!this.isTrainingDay || this.tStart === null || this.tEnd === null) {
      return 'rest_day';
    }

    const window = MealFilter.MEAL_WINDOWS[mealSlot];
    // 用餐中点作为判断基准
    const mealMid = (window.start + window.end) / 2;

    const preWindowStart = this.tStart - 180; // 3h before
    const preWindowEnd   = this.tStart - 60;  // 1h before

    const postWindowStart = this.tEnd;
    const postWindowEnd   = this.tEnd + 60;   // 1h after

    if (mealMid >= preWindowStart && mealMid <= preWindowEnd) {
      return 'pre_workout';
    }
    if (mealMid >= postWindowStart && mealMid <= postWindowEnd) {
      return 'post_workout';
    }
    return 'rest_day';
  }

  // ───── 奖池过滤 ─────

  /**
   * 获取某个餐次的可用菜谱奖池
   *
   * 过滤链：
   *  1. tag 匹配 → pre_workout / post_workout / rest_day 菜谱池
   *  2. suitableMeals 包含当前 mealSlot
   *  3. 菜谱所需食材 ⊆ 用户已选食材 (全部命中才保留)
   *
   * @param {"breakfast"|"lunch"|"dinner"} mealSlot
   * @returns {Object[]} 符合条件的菜谱数组
   */
  getPool(mealSlot) {
    const tag = this.getMealTag(mealSlot);
    const tagRecipes = this.recipes[tag] || [];

    return tagRecipes.filter(recipe => {
      // 1) 餐次适配
      if (!recipe.suitableMeals.includes(mealSlot)) return false;

      // 2) 食材子集校验 — 菜谱所有 ingredientId 必须在已选集合中
      const allAvailable = recipe.ingredientIds.every(id => this.selectedIds.has(id));
      return allAvailable;
    });
  }

  /**
   * 从奖池中随机抽取一道菜
   * @param {"breakfast"|"lunch"|"dinner"} mealSlot
   * @returns {Object|null} 菜谱对象 or null(奖池为空)
   */
  spin(mealSlot) {
    const pool = this.getPool(mealSlot);
    if (pool.length === 0) return null;
    const idx = Math.floor(Math.random() * pool.length);
    return pool[idx];
  }

  /**
   * 黑巧加餐触发判定
   * 独立于转盘逻辑，每次 spin 后可调用
   * @returns {{ triggered: boolean, data: Object }}
   */
  rollSnack() {
    const { triggerProbability, conditions } = this.snackTrigger;
    const currentTag = this.isTrainingDay ? 'post_workout' : 'rest_day';
    const eligible = conditions.includes(currentTag);

    if (!eligible) return { triggered: false, data: null };

    const triggered = Math.random() < triggerProbability;
    return {
      triggered,
      data: triggered ? this.snackTrigger : null,
    };
  }

  // ───── 调试 / 展示 ─────

  /** 打印当天三餐标签分配结果 */
  debugTags() {
    return {
      breakfast: this.getMealTag('breakfast'),
      lunch: this.getMealTag('lunch'),
      dinner: this.getMealTag('dinner'),
    };
  }
}

// 导出 (浏览器直接 <script> 引入时挂在 window 上)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MealFilter;
}
