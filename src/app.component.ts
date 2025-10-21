import { Component, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DietExplorerComponent } from './components/diet-explorer/diet-explorer.component';
import { FooterComponent } from './components/footer/footer.component';
import { SymptomAnalyzerComponent } from './components/symptom-analyzer/symptom-analyzer.component';
import { GeminiService } from './services/gemini.service';

interface UserData {
  gender: 'male' | 'female';
  age: number;
  weight: number;
  height: number;
  activityLevel: number;
  goal: 'lose' | 'gain' | 'maintain';
  healthConditions: string[];
  dietaryPreference: 'standard' | 'vegetarian' | 'vegan';
  allergies: string[];
  targetWeight: number;
}

interface CalculationResults {
  bmi: number;
  bmr: number;
  tdee: number;
  recommendedDiet: string;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, DietExplorerComponent, FooterComponent, SymptomAnalyzerComponent],
})
export class AppComponent {
  currentView = signal<'assessment' | 'results' | 'explorer' | 'symptom-analyzer'>('assessment');

  userData = signal<UserData>({
    gender: 'male',
    age: 30,
    weight: 80,
    height: 175,
    activityLevel: 1.375,
    goal: 'lose',
    healthConditions: [],
    dietaryPreference: 'standard',
    allergies: [],
    targetWeight: 70,
  });

  results = signal<CalculationResults | null>(null);

  // Meal Plan Generation State
  targetCalories = signal(2000);
  selectedDiet = signal('نظام متوازن');
  mealPlan = signal<any | null>(null);
  mealPlanError = signal<string | null>(null);
  isGeneratingPlan = signal(false);
  dietOptions = [
    'نظام متوازن', 
    'نظام عجز السعرات', 
    'كيتو دايت', 
    'حمية البحر الأبيض المتوسط', 
    'نظام نباتي', 
    'نظام نباتي صرف (Vegan)',
    'نظام باليو (الحمية البدائية)', 
    'صيام متقطع (16/8)', 
    'حمية داش (DASH)', 
    'حمية قليلة الفودماب (Low-FODMAP)'
  ];


  weightDifference = computed(() => {
    if (!this.results()) return 0;
    return this.userData().weight - this.userData().targetWeight;
  });

  healthConditionsOptions = ['السكري', 'ضغط الدم المرتفع', 'مشاكل الغدة الدرقية', 'أمراض القلب', 'مشاكل الكلى', 'متلازمة القولون العصبي (IBS)', 'ارتفاع الكوليسترول'];
  allergiesOptions = ['الغلوتين', 'اللاكتوز', 'المكسرات', 'المأكولات البحرية', 'البيض', 'الصويا', 'الفول السوداني'];
  
  constructor(private geminiService: GeminiService) {}

  onHealthConditionChange(event: Event, condition: string) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.userData.update(currentData => {
      if (isChecked) {
        return { ...currentData, healthConditions: [...currentData.healthConditions, condition] };
      } else {
        return { ...currentData, healthConditions: currentData.healthConditions.filter(c => c !== condition) };
      }
    });
  }

  onAllergyChange(event: Event, allergy: string) {
    const isChecked = (event.target as HTMLInputElement).checked;
    this.userData.update(currentData => {
      if (isChecked) {
        return { ...currentData, allergies: [...currentData.allergies, allergy] };
      } else {
        return { ...currentData, allergies: currentData.allergies.filter(a => a !== allergy) };
      }
    });
  }

  calculateMetrics() {
    const data = this.userData();
    if (!data.age || !data.weight || !data.height || !data.targetWeight) {
        alert('الرجاء إدخال جميع القيم المطلوبة.');
        return;
    }
    
    // BMR using Mifflin-St Jeor Equation
    let bmr: number;
    if (data.gender === 'male') {
      bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age + 5;
    } else {
      bmr = 10 * data.weight + 6.25 * data.height - 5 * data.age - 161;
    }

    // TDEE
    const tdee = bmr * data.activityLevel;

    // BMI
    const heightInMeters = data.height / 100;
    const bmi = data.weight / (heightInMeters * heightInMeters);

    // Diet Recommendation Logic
    let recommendedDiet = 'نظام غذائي متوازن';
    const notes: string[] = [];

    let calculatedTdee = tdee;
    if (data.goal === 'lose') {
      recommendedDiet = 'نظام عجز السعرات';
      calculatedTdee -= 500; // Suggest 500 calorie deficit
    } else if (data.goal === 'gain') {
      recommendedDiet = 'نظام فائض السعرات لبناء العضلات';
      calculatedTdee += 500; // Suggest 500 calorie surplus
    }
    this.targetCalories.set(Math.round(calculatedTdee));


    if (data.dietaryPreference === 'vegetarian') {
      recommendedDiet += ' (نظام نباتي)';
    } else if (data.dietaryPreference === 'vegan') {
      recommendedDiet += ' (نظام نباتي صرف)';
    }

    if (data.healthConditions.includes('السكري')) {
      recommendedDiet = 'حمية البحر الأبيض المتوسط أو نظام منخفض الكربوهيدرات';
      notes.push('يجب استشارة طبيبك لاختيار الأنسب لحالتك');
    }
    if (data.healthConditions.includes('ضغط الدم المرتفع')) {
        notes.push('يوصى بحمية داش (DASH) وتقليل الصوديوم (الملح)');
    }
     if (data.healthConditions.includes('مشاكل الغدة الدرقية')) {
        notes.push('بعض الأطعمة قد تتداخل مع وظيفة الغدة، استشر مختصًا');
    }

    if (data.allergies.length > 0) {
      notes.push(`يجب تجنب الأطعمة التي تحتوي على: ${data.allergies.join('، ')}`);
    }

    let finalRecommendation = recommendedDiet;
    if (notes.length > 0) {
      finalRecommendation += `. ملاحظات هامة: ${notes.join('، ')}`;
    }

    this.results.set({
      bmi: parseFloat(bmi.toFixed(1)),
      bmr: parseFloat(bmr.toFixed(0)),
      tdee: parseFloat(tdee.toFixed(0)),
      recommendedDiet: finalRecommendation,
    });
    this.mealPlan.set(null); // Reset meal plan on new calculation
    this.currentView.set('results');
  }

  async generateMealPlan() {
    this.isGeneratingPlan.set(true);
    this.mealPlan.set(null);
    this.mealPlanError.set(null);
    try {
      const plan = await this.geminiService.generateMealPlan(
        this.targetCalories(),
        this.selectedDiet(),
        this.userData().goal,
        this.userData().allergies
      );
      this.mealPlan.set(plan);
    } catch (error) {
      this.mealPlanError.set('عذرًا، حدث خطأ أثناء إنشاء الخطة. يرجى المحاولة مرة أخرى.');
      console.error(error);
    } finally {
      this.isGeneratingPlan.set(false);
    }
  }

  getBmiCategory(bmi: number): string {
    if (bmi < 18.5) return 'نقص في الوزن';
    if (bmi >= 18.5 && bmi <= 24.9) return 'وزن طبيعي';
    if (bmi >= 25 && bmi <= 29.9) return 'زيادة في الوزن';
    return 'سمنة';
  }

  getMealIcon(mealName: string): string {
    if (mealName.includes('فطور')) return 'fa-sun';
    if (mealName.includes('غداء')) return 'fa-utensils';
    if (mealName.includes('عشاء')) return 'fa-moon';
    if (mealName.includes('خفيفة')) return 'fa-apple-alt';
    return 'fa-plate-wheat';
  }

  resetForm() {
    this.userData.set({
      gender: 'male',
      age: 30,
      weight: 80,
      height: 175,
      activityLevel: 1.375,
      goal: 'lose',
      healthConditions: [],
      dietaryPreference: 'standard',
      allergies: [],
      targetWeight: 70,
    });
    this.results.set(null);
    this.mealPlan.set(null);
    this.currentView.set('assessment');
  }
}
