import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        loadComponent: () => import('./components/assistant/assistant').then(m => m.AssistantComponent)
      },
      {
        path: '**',
        redirectTo: ''
      }
];
