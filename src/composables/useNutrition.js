import { computed } from 'vue'

/**
 * 营养目标计算引擎
 *
 * 依据用户个人信息（年龄/身高/体重/性别）与当前训练状态，
 * 计算 BMI、基础代谢(BMR)、每日总消耗(TDEE) 及三大营养素建议摄入量。
 *
 * 采用公式：
 *  - BMI      = 体重(kg) / 身高(m)²，按中国成人标准分级
 *  - BMR      = Mifflin-St Jeor 方程
 *  - TDEE     = BMR × 活动系数（训练日 1.725 / 休息日 1.375）
 *  - 蛋白质    = 1.8 g/kg 体重（运动员区间 1.6~2.2 取中值）
 *  - 脂肪      = 占总热量 25%
 *  - 碳水      = 剩余热量换算
 */
export function useNutrition(userProfile, isTrainingDay) {

  /** BMI 中国成人标准分级 */
  function classifyBMI(bmi) {
    if (bmi < 18.5) return { level: '偏瘦', color: 'var(--accent-blue)' }
    if (bmi < 24) return { level: '正常', color: 'var(--accent-green)' }
    if (bmi < 28) return { level: '超重', color: 'var(--accent-amber)' }
    return { level: '肥胖', color: 'var(--accent-red)' }
  }

  const metrics = computed(() => {
    const p = userProfile.value || {}
    const age = Number(p.age)
    const height = Number(p.height)
    const weight = Number(p.weight)
    const gender = p.gender === 'female' ? 'female' : 'male'

    // 信息不完整时返回无效标记，界面隐藏结果区
    if (!(age > 0 && height > 0 && weight > 0)) {
      return { valid: false }
    }

    // ── BMI ──
    const hMeter = height / 100
    const bmi = weight / (hMeter * hMeter)
    const { level: bmiLevel, color: bmiColor } = classifyBMI(bmi)

    // ── BMR (Mifflin-St Jeor) ──
    const bmr = gender === 'female'
      ? 10 * weight + 6.25 * height - 5 * age - 161
      : 10 * weight + 6.25 * height - 5 * age + 5

    // ── TDEE ──
    const activityFactor = isTrainingDay.value ? 1.725 : 1.375
    const tdee = bmr * activityFactor

    // ── 三大营养素 ──
    const proteinG = weight * 1.8
    const fatG = (tdee * 0.25) / 9
    const carbG = Math.max(0, (tdee - proteinG * 4 - fatG * 9) / 4)

    return {
      valid: true,
      bmi: bmi.toFixed(1),
      bmiLevel,
      bmiColor,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      protein: Math.round(proteinG),
      fat: Math.round(fatG),
      carbs: Math.round(carbG),
      isTrainingDay: isTrainingDay.value
    }
  })

  return { metrics }
}
