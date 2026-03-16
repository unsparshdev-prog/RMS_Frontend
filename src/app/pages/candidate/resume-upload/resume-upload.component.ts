import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-resume-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './resume-upload.component.html',
  styleUrls: ['./resume-upload.component.css']
})
export class ResumeUploadComponent {
  files: { name: string; size: string; date: string; type: string }[] = [
    { name: 'John_Doe_Resume_2026.pdf', size: '245 KB', date: 'Mar 10, 2026', type: 'PDF' },
    { name: 'Cover_Letter_TechCorp.docx', size: '89 KB', date: 'Mar 08, 2026', type: 'DOCX' }
  ];

  isDragging = false;

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(): void {
    this.isDragging = false;
  }

  onDrop(event: DragEvent): void {
    event.preventDefault();
    this.isDragging = false;
    // TODO: Handle file drop with backend
    console.log('Files dropped:', event.dataTransfer?.files);
  }

  onFileSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      console.log('Files selected:', input.files);
      // TODO: Upload files with backend
    }
  }

  removeFile(index: number): void {
    this.files.splice(index, 1);
  }
}
