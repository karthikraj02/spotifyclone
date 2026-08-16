import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-stack">
      @for (toast of toastService.toasts$ | async; track toast.id) {
        <div class="toast" [class.error]="toast.type === 'error'" (click)="toastService.dismiss(toast.id)">
          {{ toast.text }}
        </div>
      }
    </div>
  `,
  styles: [`
    .toast-stack {
      position: fixed;
      bottom: 110px;
      right: 1.5rem;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 360px;
    }

    .toast {
      background: #282828;
      color: #fff;
      padding: 0.75rem 1rem;
      border-radius: 6px;
      font-size: 0.875rem;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      cursor: pointer;
      border-left: 3px solid #B3B3B3;

      &.error { border-left-color: #E91429; }
    }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}
}
