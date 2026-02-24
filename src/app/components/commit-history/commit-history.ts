import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CommitInfo } from '../../core/services/version';

@Component({
  selector: 'app-commit-history',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './commit-history.html',
  styleUrl: './commit-history.css',
})
export class CommitHistory {
  commits = input.required<CommitInfo[]>();
  closed = output<void>();

  close(event: Event) {
    event.stopPropagation();
    this.closed.emit();
  }

  stopProp(event: Event) {
    event.stopPropagation();
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
