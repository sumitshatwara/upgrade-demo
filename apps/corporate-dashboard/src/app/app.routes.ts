import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'corporate-dashboard',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'corporate-dashboard'
  }
];
