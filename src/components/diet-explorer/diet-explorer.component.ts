import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService, GeminiResponse } from '../../services/gemini.service';

interface DietInfo {
  name: string;
  query: string;
  summary: string;
  icon: string;
}

@Component({
  selector: 'app-diet-explorer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './diet-explorer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DietExplorerComponent {
  private geminiService = inject(GeminiService);
  
  searchQuery = signal<string>('');
  searchResult = signal<GeminiResponse | null>(null);
  relatedTopics = signal<string[]>([]);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  popularDiets: DietInfo[] = [
    {
      name: 'كيتو دايت',
      query: 'ما هو الكيتو دايت؟',
      summary: 'نظام عالي الدهون ومنخفض الكربوهيدرات، يُدخل الجسم في حالة الكيتوزية لحرق الدهون. مناسب لمن يسعى لفقدان الوزن السريع.',
      icon: 'fas fa-bacon'
    },
    {
      name: 'الصيام المتقطع',
      query: 'ما هو الصيام المتقطع؟',
      summary: 'نمط يعتمد على تنظيم أوقات الأكل والصيام، مثل صيام 16 ساعة. يركز على "متى" تأكل وليس "ماذا" تأكل.',
      icon: 'fas fa-clock-rotate-left'
    },
    {
      name: 'حمية البحر الأبيض المتوسط',
      query: 'ما هي حمية البحر الأبيض المتوسط؟',
      summary: 'تركز على الأطعمة الكاملة مثل الفواكه والخضروات والأسماك والدهون الصحية. ممتازة لصحة القلب والوقاية من الأمراض المزمنة.',
      icon: 'fas fa-fish-fins'
    },
    {
      name: 'نظام عجز السعرات',
      query: 'ما هو نظام عجز السعرات؟',
      summary: 'المبدأ الأساسي لفقدان الوزن، حيث تستهلك سعرات حرارية أقل مما يحرقه جسمك. يمكن تطبيقه مع أي نمط غذائي.',
      icon: 'fas fa-calculator'
    },
    {
      name: 'حمية داش (DASH)',
      query: 'ما هي حمية داش (DASH)؟',
      summary: 'مصممة خصيصاً لمكافحة ارتفاع ضغط الدم. تركز على الأطعمة الغنية بالبوتاسيوم والكالسيوم والمغنيسيوم وقليلة الصوديوم.',
      icon: 'fas fa-heart-pulse'
    },
    {
      name: 'النظام النباتي',
      query: 'فوائد ومخاطر النظام النباتي',
      summary: 'يعتمد على الامتناع عن تناول اللحوم والدواجن، مع السماح بالمنتجات الحيوانية الأخرى كالبيض والحليب. غني بالألياف والفيتامينات.',
      icon: 'fas fa-carrot'
    },
     {
      name: 'نظام باليو (الحمية البدائية)',
      query: 'شرح نظام باليو (الحمية البدائية)',
      summary: 'يحاكي النظام الغذائي لأسلافنا في العصر الحجري. يركز على اللحوم والأسماك والخضروات، ويتجنب الأطعمة المصنعة والحبوب.',
      icon: 'fas fa-drumstick-bite'
    },
    {
      name: 'حمية قليلة الفودماب (Low-FODMAP)',
      query: 'ما هي حمية قليلة الفودماب؟',
      summary: 'نظام غذائي علاجي قصير الأمد لتحديد وإدارة الأطعمة التي تسبب مشاكل هضمية، خاصة لمرضى القولون العصبي (IBS).',
      icon: 'fas fa-person-dots-from-line'
    }
  ];

  async search() {
    if (!this.searchQuery().trim()) {
      return;
    }
    
    this.isLoading.set(true);
    this.error.set(null);
    this.searchResult.set(null);
    this.relatedTopics.set([]); // Reset on new search

    try {
      const currentQuery = this.searchQuery();
      // Fetch main result and related topics in parallel for better performance
      const [result, topics] = await Promise.all([
        this.geminiService.getDietInfo(currentQuery),
        this.geminiService.getRelatedDietTopics(currentQuery)
      ]);

      this.searchResult.set(result);
      this.relatedTopics.set(topics);

    // FIX: Added curly braces to the catch block to correctly handle errors and fix syntax issues.
    } catch (err) {
      this.error.set('حدث خطأ أثناء البحث. يرجى المحاولة مرة أخرى.');
      console.error(err);
    } finally {
      this.isLoading.set(false);
    }
  }

  searchPopular(query: string) {
    this.searchQuery.set(query);
    this.search();
    // Scroll to the search results area after initiating the search
    setTimeout(() => {
        const resultsElement = document.getElementById('search-results');
        resultsElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  }
}
