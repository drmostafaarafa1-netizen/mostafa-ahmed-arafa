import { Component, ChangeDetectionStrategy, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GeminiService } from '../../services/gemini.service';

@Component({
  selector: 'app-symptom-analyzer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './symptom-analyzer.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SymptomAnalyzerComponent {
  private geminiService = inject(GeminiService);

  symptoms = signal<string>('');
  result = signal<any | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  async analyzeSymptoms() {
    if (!this.symptoms().trim()) {
      this.error.set('الرجاء إدخال الأعراض التي تشعر بها.');
      return;
    }

    this.isLoading.set(true);
    this.error.set(null);
    this.result.set(null);

    try {
      const analysisResult = await this.geminiService.analyzeSymptoms(this.symptoms());
      this.result.set(analysisResult);
    } catch (err) {
      this.error.set('حدث خطأ أثناء تحليل الأعراض. يرجى المحاولة مرة أخرى.');
      console.error(err);
    } finally {
      this.isLoading.set(false);
    }
  }
}
