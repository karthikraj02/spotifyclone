import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface ToastMessage {
  id: number;
  text: string;
  type: 'error' | 'info';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastsSubject = new BehaviorSubject<ToastMessage[]>([]);
  toasts$ = this.toastsSubject.asObservable();

  private nextId = 1;

  show(text: string, type: 'error' | 'info' = 'error', durationMs = 5000): void {
    const id = this.nextId++;
    const toast: ToastMessage = { id, text, type };
    this.toastsSubject.next([...this.toastsSubject.value, toast]);

    setTimeout(() => this.dismiss(id), durationMs);
  }

  dismiss(id: number): void {
    this.toastsSubject.next(this.toastsSubject.value.filter(t => t.id !== id));
  }
}
